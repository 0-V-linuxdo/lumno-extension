-- Keep private media sync bounded without sending user images to a content
-- moderation provider. Wallpapers are cloud checkpoints for the active light
-- and dark slots; shortcut icons remain fully backed up.

drop function if exists public.lumno_reserve_media_moderation(uuid, smallint);
drop table if exists public.lumno_media_moderation_events;

create or replace function public.lumno_enforce_asset_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active_count integer;
  v_active_kind_count integer;
  v_active_bytes bigint;
  v_global_active_bytes bigint;
  v_new_bytes bigint := coalesce(new.byte_size, 0) + coalesce(new.thumbnail_byte_size, 0);
begin
  if new.deleted_at is not null then
    return new;
  end if;

  -- Global before account lock everywhere keeps lock ordering deterministic.
  perform pg_advisory_xact_lock(hashtextextended('lumno:media-global', 0));
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':media', 0));

  select count(*), coalesce(sum(byte_size + thumbnail_byte_size), 0)
  into v_active_count, v_active_bytes
  from public.lumno_assets
  where user_id = new.user_id
    and deleted_at is null
    and id <> new.id;

  select count(*)
  into v_active_kind_count
  from public.lumno_assets
  where user_id = new.user_id
    and asset_kind = new.asset_kind
    and deleted_at is null
    and id <> new.id;

  select coalesce(sum(byte_size + thumbnail_byte_size), 0)
  into v_global_active_bytes
  from public.lumno_assets
  where deleted_at is null
    and id <> new.id;

  if v_active_count >= 22 then
    raise exception 'A user may store at most 22 active media assets' using errcode = '23514';
  end if;
  if new.asset_kind = 'wallpaper' and v_active_kind_count >= 2 then
    raise exception 'A user may store at most two active wallpapers' using errcode = '23514';
  end if;
  if new.asset_kind = 'shortcut_icon' and v_active_kind_count >= 20 then
    raise exception 'A user may store at most 20 active shortcut icons' using errcode = '23514';
  end if;
  if v_active_bytes + v_new_bytes > 10485760 then
    raise exception 'A user may store at most 10 MiB of active media' using errcode = '23514';
  end if;
  if v_global_active_bytes + v_new_bytes > 943718400 then
    raise exception 'Media storage reserve reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_assets_enforce_limit on public.lumno_assets;
create trigger lumno_assets_enforce_limit
before insert or update of user_id, asset_kind, byte_size, thumbnail_byte_size, deleted_at
on public.lumno_assets
for each row execute function public.lumno_enforce_asset_limit();

create or replace function public.lumno_authorize_media_upload(
  p_user_id uuid,
  p_asset_kind text,
  p_client_asset_id text,
  p_byte_size bigint,
  p_thumbnail_byte_size bigint default 0
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
  v_recent_uploads integer;
  v_day_upload_bytes bigint;
  v_month_upload_bytes bigint;
  v_active_count integer;
  v_active_kind_count integer;
  v_active_bytes bigint;
  v_global_active_bytes bigint;
  v_requested_bytes bigint := coalesce(p_byte_size, 0) + coalesce(p_thumbnail_byte_size, 0);
begin
  if p_user_id is null
      or p_asset_kind not in ('wallpaper', 'shortcut_icon')
      or coalesce(trim(p_client_asset_id), '') = ''
      or v_requested_bytes not between 1 and 2252800 then
    raise exception 'Invalid media upload request' using errcode = '22023';
  end if;

  v_day_start := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_month_start := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';

  perform pg_advisory_xact_lock(hashtextextended('lumno:media-global', 0));
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':media', 0));

  delete from public.lumno_media_upload_events
  where user_id = p_user_id and created_at < v_month_start - interval '2 days';

  select count(*)
  into v_recent_uploads
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= v_now - interval '1 hour';

  select coalesce(sum(byte_size), 0)
  into v_day_upload_bytes
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= v_day_start;

  select coalesce(sum(byte_size), 0)
  into v_month_upload_bytes
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= v_month_start;

  if v_recent_uploads >= 40
      or v_day_upload_bytes + v_requested_bytes > 33554432
      or v_month_upload_bytes + v_requested_bytes > 268435456 then
    raise exception 'Media upload rate limit exceeded' using errcode = '42901';
  end if;

  select count(*), coalesce(sum(byte_size + thumbnail_byte_size), 0)
  into v_active_count, v_active_bytes
  from public.lumno_assets
  where user_id = p_user_id
    and deleted_at is null
    and client_asset_id <> p_client_asset_id;

  select count(*)
  into v_active_kind_count
  from public.lumno_assets
  where user_id = p_user_id
    and asset_kind = p_asset_kind
    and deleted_at is null
    and client_asset_id <> p_client_asset_id;

  select coalesce(sum(byte_size + thumbnail_byte_size), 0)
  into v_global_active_bytes
  from public.lumno_assets
  where deleted_at is null
    and not (user_id = p_user_id and client_asset_id = p_client_asset_id);

  if v_active_count >= 22
      or (p_asset_kind = 'wallpaper' and v_active_kind_count >= 2)
      or (p_asset_kind = 'shortcut_icon' and v_active_kind_count >= 20)
      or v_active_bytes + v_requested_bytes > 10485760
      or v_global_active_bytes + v_requested_bytes > 943718400 then
    raise exception 'Media quota exceeded' using errcode = '23514';
  end if;

  insert into public.lumno_media_upload_events (user_id, byte_size, created_at)
  values (p_user_id, v_requested_bytes, v_now);
  return true;
end;
$$;

create or replace function public.lumno_record_media_egress(
  p_user_id uuid,
  p_byte_size bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', current_date)::date;
  v_total bigint;
begin
  if p_user_id is null or p_byte_size not between 1 and 2097152 then
    raise exception 'Invalid media egress request' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':egress:' || v_month::text, 0));

  select coalesce(byte_size, 0)
  into v_total
  from public.lumno_media_egress_monthly
  where user_id = p_user_id and usage_month = v_month;
  v_total := coalesce(v_total, 0) + p_byte_size;
  if v_total > 134217728 then
    raise exception 'Monthly media egress quota exceeded' using errcode = '23514';
  end if;

  insert into public.lumno_media_egress_monthly (user_id, usage_month, byte_size)
  values (p_user_id, v_month, v_total)
  on conflict (user_id, usage_month) do update set
    byte_size = excluded.byte_size,
    updated_at = now();
  return v_total;
end;
$$;

revoke all on function public.lumno_enforce_asset_limit() from public, anon, authenticated;
revoke all on function public.lumno_authorize_media_upload(uuid, text, text, bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.lumno_record_media_egress(uuid, bigint)
  from public, anon, authenticated;

grant execute on function public.lumno_enforce_asset_limit() to service_role;
grant execute on function public.lumno_authorize_media_upload(uuid, text, text, bigint, bigint)
  to service_role;
grant execute on function public.lumno_record_media_egress(uuid, bigint)
  to service_role;
