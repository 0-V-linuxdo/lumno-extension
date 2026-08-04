-- Bind a short-lived, server-verified reCAPTCHA v3 pass to the origin and
-- provider of each new OAuth account. Raw IP addresses and CAPTCHA tokens are
-- never persisted.

alter table public.lumno_signup_security_secrets
  add column if not exists captcha_enforced boolean not null default false;

create table if not exists public.lumno_signup_captcha_passes (
  id uuid primary key default extensions.gen_random_uuid(),
  ip_fingerprint bytea not null check (octet_length(ip_fingerprint) = 32),
  provider text not null check (provider in ('google', 'github')),
  score numeric(4, 3) not null check (score >= 0 and score <= 1),
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > verified_at),
  check (consumed_at is null or consumed_at >= verified_at)
);

create index if not exists lumno_signup_captcha_passes_available_idx
  on public.lumno_signup_captcha_passes (ip_fingerprint, provider, expires_at)
  where consumed_at is null;
create index if not exists lumno_signup_captcha_passes_verified_idx
  on public.lumno_signup_captcha_passes (verified_at desc);

alter table public.lumno_signup_captcha_passes enable row level security;
alter table public.lumno_signup_captcha_passes force row level security;
revoke all on public.lumno_signup_captcha_passes from public, anon, authenticated;

create or replace function public.lumno_record_signup_captcha_pass(
  p_origin_ip inet,
  p_provider text,
  p_score numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_ip_fingerprint bytea;
  v_pass_id uuid;
  v_origin_hour_count integer;
  v_global_hour_count integer;
begin
  if p_origin_ip is null or p_provider not in ('google', 'github')
      or p_score is null or p_score < 0 or p_score > 1 then
    raise exception 'Invalid CAPTCHA pass' using errcode = '22023';
  end if;

  select extensions.hmac(
    pg_catalog.convert_to(pg_catalog.host(p_origin_ip), 'UTF8'),
    ip_hmac_key,
    'sha256'
  ) into v_ip_fingerprint
  from public.lumno_signup_security_secrets
  where singleton;
  if v_ip_fingerprint is null then
    raise exception 'Sign-up security secret is unavailable' using errcode = '55000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('lumno:captcha-pass', 0)
  );
  select count(*) into v_origin_hour_count
  from public.lumno_signup_captcha_passes
  where ip_fingerprint = v_ip_fingerprint
    and verified_at >= v_now - interval '1 hour';
  select count(*) into v_global_hour_count
  from public.lumno_signup_captcha_passes
  where verified_at >= v_now - interval '1 hour';
  if v_origin_hour_count >= 20 or v_global_hour_count >= 500 then
    raise exception 'CAPTCHA pass rate exceeded' using errcode = '42901';
  end if;

  insert into public.lumno_signup_captcha_passes (
    ip_fingerprint,
    provider,
    score,
    verified_at,
    expires_at
  ) values (
    v_ip_fingerprint,
    p_provider,
    p_score,
    v_now,
    v_now + interval '10 minutes'
  ) returning id into v_pass_id;
  return v_pass_id;
end;
$$;

revoke all on function public.lumno_record_signup_captcha_pass(inet, text, numeric)
  from public, anon, authenticated;
grant execute on function public.lumno_record_signup_captcha_pass(inet, text, numeric)
  to service_role;

create or replace function public.lumno_cleanup_signup_rate_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.lumno_signup_rate_events
  where created_at < now() - interval '26 hours';
  delete from public.lumno_signup_captcha_passes
  where expires_at < now() - interval '1 hour';
end;
$$;

create or replace function public.lumno_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_provider text := lower(coalesce(event->'user'->'app_metadata'->>'provider', ''));
  v_is_system_fixture boolean :=
    lower(coalesce(event->'user'->'app_metadata'->>'lumno_system_fixture', '')) = 'true';
  v_ip inet;
  v_ip_fingerprint bytea;
  v_captcha_enforced boolean := false;
  v_captcha_pass_id uuid;
  v_ip_hour_count integer;
  v_ip_day_count integer;
  v_global_hour_count integer;
  v_global_day_count integer;
begin
  if v_provider not in ('google', 'github') and not v_is_system_fixture then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'This sign-up method is not available.'
    ));
  end if;
  if v_is_system_fixture then
    return '{}'::jsonb;
  end if;

  begin
    v_ip := (event->'metadata'->>'ip_address')::inet;
  exception when invalid_text_representation then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Unable to verify the sign-up origin.'
    ));
  end;
  if v_ip is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Unable to verify the sign-up origin.'
    ));
  end if;

  select extensions.hmac(
    pg_catalog.convert_to(pg_catalog.host(v_ip), 'UTF8'),
    ip_hmac_key,
    'sha256'
  ), captcha_enforced
  into v_ip_fingerprint, v_captcha_enforced
  from public.lumno_signup_security_secrets
  where singleton;
  if v_ip_fingerprint is null then
    raise exception 'Sign-up security secret is unavailable' using errcode = '55000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('lumno:signup-rate', 0)
  );
  perform public.lumno_cleanup_signup_rate_events();

  if v_captcha_enforced then
    select id into v_captcha_pass_id
    from public.lumno_signup_captcha_passes
    where ip_fingerprint = v_ip_fingerprint
      and provider = v_provider
      and consumed_at is null
      and expires_at >= v_now
    order by expires_at, id
    for update skip locked
    limit 1;
    if v_captcha_pass_id is null then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'Complete the Lumno sign-in verification and try again.'
      ));
    end if;
    update public.lumno_signup_captcha_passes
    set consumed_at = v_now
    where id = v_captcha_pass_id and consumed_at is null;
    if not found then
      return jsonb_build_object('error', jsonb_build_object(
        'http_code', 403,
        'message', 'Complete the Lumno sign-in verification and try again.'
      ));
    end if;
  end if;

  select count(*) into v_ip_hour_count
  from public.lumno_signup_rate_events
  where ip_fingerprint = v_ip_fingerprint
    and created_at >= v_now - interval '1 hour';
  select count(*) into v_ip_day_count
  from public.lumno_signup_rate_events
  where ip_fingerprint = v_ip_fingerprint
    and created_at >= v_now - interval '24 hours';
  select count(*) into v_global_hour_count
  from public.lumno_signup_rate_events
  where created_at >= v_now - interval '1 hour';
  select count(*) into v_global_day_count
  from public.lumno_signup_rate_events
  where created_at >= v_now - interval '24 hours';

  if v_ip_hour_count >= 5 or v_ip_day_count >= 12
      or v_global_hour_count >= 60 or v_global_day_count >= 200 then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 429,
      'message', 'Too many new accounts were created recently. Please try again later.'
    ));
  end if;

  insert into public.lumno_signup_rate_events (ip_fingerprint, provider, created_at)
  values (v_ip_fingerprint, v_provider, v_now);
  return '{}'::jsonb;
end;
$$;

revoke all on function public.lumno_cleanup_signup_rate_events()
  from public, anon, authenticated;
revoke all on function public.lumno_before_user_created(jsonb)
  from public, anon, authenticated;
grant execute on function public.lumno_before_user_created(jsonb)
  to supabase_auth_admin;
