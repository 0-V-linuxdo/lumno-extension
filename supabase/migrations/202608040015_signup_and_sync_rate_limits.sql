-- Bound new-account creation and authenticated sync request bursts while keeping
-- all lock scopes transaction-local and deterministic.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.lumno_signup_security_secrets (
  singleton boolean primary key default true check (singleton),
  ip_hmac_key bytea not null check (octet_length(ip_hmac_key) = 32),
  created_at timestamptz not null default now()
);

insert into public.lumno_signup_security_secrets (singleton, ip_hmac_key)
values (true, extensions.gen_random_bytes(32))
on conflict (singleton) do nothing;

create table if not exists public.lumno_signup_rate_events (
  id bigint generated always as identity primary key,
  ip_fingerprint bytea not null check (octet_length(ip_fingerprint) = 32),
  provider text not null check (provider in ('google', 'github', 'system_fixture')),
  created_at timestamptz not null default now()
);

create index if not exists lumno_signup_rate_events_ip_created_idx
  on public.lumno_signup_rate_events (ip_fingerprint, created_at desc);
create index if not exists lumno_signup_rate_events_created_idx
  on public.lumno_signup_rate_events (created_at desc);

alter table public.lumno_signup_security_secrets enable row level security;
alter table public.lumno_signup_security_secrets force row level security;
alter table public.lumno_signup_rate_events enable row level security;
alter table public.lumno_signup_rate_events force row level security;
revoke all on public.lumno_signup_security_secrets from public, anon, authenticated;
revoke all on public.lumno_signup_rate_events from public, anon, authenticated;

create or replace function public.lumno_cleanup_signup_rate_events()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.lumno_signup_rate_events
  where created_at < now() - interval '26 hours';
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
  -- Only service-role user creation can write app_metadata. Keep production
  -- smoke fixtures out of public registration budgets.
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
  ) into v_ip_fingerprint
  from public.lumno_signup_security_secrets
  where singleton;
  if v_ip_fingerprint is null then
    raise exception 'Sign-up security secret is unavailable' using errcode = '55000';
  end if;

  -- One short global lock makes the rolling counters authoritative even when
  -- many OAuth callbacks finish at the same time.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('lumno:signup-rate', 0)
  );
  perform public.lumno_cleanup_signup_rate_events();

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
grant usage on schema public to supabase_auth_admin;
grant execute on function public.lumno_before_user_created(jsonb)
  to supabase_auth_admin;

select cron.schedule(
  'lumno-signup-rate-event-cleanup',
  '47 * * * *',
  $cron$select public.lumno_cleanup_signup_rate_events();$cron$
);

create table if not exists public.lumno_sync_request_windows (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default date_trunc('minute', now()),
  register_count integer not null default 0 check (register_count >= 0),
  push_count integer not null default 0 check (push_count >= 0),
  pull_count integer not null default 0 check (pull_count >= 0)
);

alter table public.lumno_sync_request_windows enable row level security;
alter table public.lumno_sync_request_windows force row level security;
revoke all on public.lumno_sync_request_windows from public, anon, authenticated;

create or replace function public.lumno_consume_sync_request(
  p_user_id uuid,
  p_request_kind text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window public.lumno_sync_request_windows;
begin
  if p_user_id is null or p_request_kind not in ('register', 'push', 'pull') then
    raise exception 'Invalid sync rate-limit request' using errcode = '22023';
  end if;

  insert into public.lumno_sync_request_windows (user_id, window_started_at)
  values (p_user_id, date_trunc('minute', v_now))
  on conflict (user_id) do nothing;

  select * into v_window
  from public.lumno_sync_request_windows
  where user_id = p_user_id
  for update;

  if v_window.window_started_at <= v_now - interval '1 minute' then
    update public.lumno_sync_request_windows
    set window_started_at = date_trunc('minute', v_now),
        register_count = 0,
        push_count = 0,
        pull_count = 0
    where user_id = p_user_id
    returning * into v_window;
  end if;

  if (p_request_kind = 'register' and v_window.register_count >= 20)
      or (p_request_kind = 'push' and v_window.push_count >= 30)
      or (p_request_kind = 'pull' and v_window.pull_count >= 60) then
    raise exception 'Sync request rate exceeded' using errcode = '42901';
  end if;

  update public.lumno_sync_request_windows
  set register_count = register_count + case when p_request_kind = 'register' then 1 else 0 end,
      push_count = push_count + case when p_request_kind = 'push' then 1 else 0 end,
      pull_count = pull_count + case when p_request_kind = 'pull' then 1 else 0 end
  where user_id = p_user_id;
end;
$$;

revoke all on function public.lumno_consume_sync_request(uuid, text)
  from public, anon, authenticated;

alter function public.lumno_register_device(uuid, text, text, text, text)
  rename to lumno_register_device_internal;
alter function public.lumno_push_setting_changes(uuid, jsonb)
  rename to lumno_push_setting_changes_internal;
alter function public.lumno_pull_setting_changes(uuid, bigint, integer)
  rename to lumno_pull_setting_changes_internal;

revoke all on function public.lumno_register_device_internal(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.lumno_push_setting_changes_internal(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.lumno_pull_setting_changes_internal(uuid, bigint, integer)
  from public, anon, authenticated;

create or replace function public.lumno_register_device(
  p_device_id uuid,
  p_display_name text,
  p_browser_family text,
  p_platform_family text,
  p_extension_version text
)
returns public.lumno_devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform public.lumno_consume_sync_request(v_user_id, 'register');
  return public.lumno_register_device_internal(
    p_device_id,
    p_display_name,
    p_browser_family,
    p_platform_family,
    p_extension_version
  );
end;
$$;

create or replace function public.lumno_push_setting_changes(
  p_device_id uuid,
  p_changes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform public.lumno_consume_sync_request(v_user_id, 'push');
  return public.lumno_push_setting_changes_internal(p_device_id, p_changes);
end;
$$;

create or replace function public.lumno_pull_setting_changes(
  p_device_id uuid,
  p_cursor bigint default 0,
  p_limit integer default 500
)
returns table (
  key text,
  value jsonb,
  version bigint,
  change_id bigint,
  schema_version smallint,
  updated_by_device uuid,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform public.lumno_consume_sync_request(v_user_id, 'pull');
  return query
  select *
  from public.lumno_pull_setting_changes_internal(p_device_id, p_cursor, p_limit);
end;
$$;

revoke all on function public.lumno_register_device(uuid, text, text, text, text)
  from public, anon;
revoke all on function public.lumno_push_setting_changes(uuid, jsonb)
  from public, anon;
revoke all on function public.lumno_pull_setting_changes(uuid, bigint, integer)
  from public, anon;
grant execute on function public.lumno_register_device(uuid, text, text, text, text)
  to authenticated;
grant execute on function public.lumno_push_setting_changes(uuid, jsonb)
  to authenticated;
grant execute on function public.lumno_pull_setting_changes(uuid, bigint, integer)
  to authenticated;

create or replace function public.lumno_throttle_device_last_seen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.last_seen_at > now() - interval '1 hour'
      and new.display_name is not distinct from old.display_name
      and new.browser_family is not distinct from old.browser_family
      and new.platform_family is not distinct from old.platform_family
      and new.extension_version is not distinct from old.extension_version
      and new.revoked_at is not distinct from old.revoked_at then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_devices_throttle_last_seen on public.lumno_devices;
create trigger lumno_devices_throttle_last_seen
before update of last_seen_at on public.lumno_devices
for each row execute function public.lumno_throttle_device_last_seen();

revoke all on function public.lumno_throttle_device_last_seen()
  from public, anon, authenticated;
