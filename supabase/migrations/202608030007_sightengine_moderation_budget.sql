-- Keep production media moderation inside Sightengine's free hard limits.
-- This table stores only request accounting; it never stores image bytes,
-- hashes, provider responses, or user-entered text.

create table if not exists public.lumno_media_moderation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_count smallint not null check (operation_count = 4),
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists lumno_media_moderation_events_created_idx
  on public.lumno_media_moderation_events (created_at desc);

alter table public.lumno_media_moderation_events enable row level security;
alter table public.lumno_media_moderation_events force row level security;

revoke all on public.lumno_media_moderation_events from public, anon, authenticated;
grant all on public.lumno_media_moderation_events to service_role;
grant usage, select on sequence public.lumno_media_moderation_events_id_seq to service_role;

create or replace function public.lumno_reserve_media_moderation(
  p_user_id uuid,
  p_operation_count smallint default 4
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day_start timestamptz;
  v_month_start timestamptz;
  v_last_reserved_at timestamptz;
  v_day_requests integer;
  v_day_operations integer;
  v_month_requests integer;
  v_month_operations integer;
begin
  if p_user_id is null or p_operation_count <> 4 then
    raise exception 'Invalid media moderation reservation' using errcode = '22023';
  end if;

  v_day_start := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_month_start := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';

  -- The free plan permits one request per second. Serialize reservations so
  -- concurrent Edge Function instances cannot race the provider limit.
  perform pg_advisory_xact_lock(hashtextextended('lumno:media-moderation-budget', 0));

  delete from public.lumno_media_moderation_events
  where created_at < v_month_start - interval '7 days';

  select max(created_at) into v_last_reserved_at
  from public.lumno_media_moderation_events;
  if v_last_reserved_at is not null and v_last_reserved_at > v_now - interval '1100 milliseconds' then
    raise exception 'Media moderation global rate limit exceeded' using errcode = '42902';
  end if;

  select count(*), coalesce(sum(operation_count), 0)
  into v_day_requests, v_day_operations
  from public.lumno_media_moderation_events
  where created_at >= v_day_start;

  select count(*), coalesce(sum(operation_count), 0)
  into v_month_requests, v_month_operations
  from public.lumno_media_moderation_events
  where created_at >= v_month_start;

  -- Sightengine Free currently has hard limits of 500 operations/day and
  -- 2,000/month. Keep 20% daily and 10% monthly headroom for clock skew,
  -- provider accounting changes, and manual verification requests.
  if v_day_requests >= 100 or v_day_operations + p_operation_count > 400
      or v_month_requests >= 450 or v_month_operations + p_operation_count > 1800 then
    raise exception 'Media moderation free capacity exhausted' using errcode = '42902';
  end if;

  insert into public.lumno_media_moderation_events (user_id, operation_count, created_at)
  values (p_user_id, p_operation_count, v_now);
  return true;
end;
$$;

revoke all on function public.lumno_reserve_media_moderation(uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.lumno_reserve_media_moderation(uuid, smallint)
  to service_role;
