-- Replace full-table media quota scans with short, transaction-local counter
-- updates. The global counter is still serialized, but only for the metadata
-- commit itself; Storage/network work never runs while database locks are held.

create table if not exists public.lumno_media_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_count integer not null default 0 check (active_count >= 0),
  active_wallpaper_count integer not null default 0 check (active_wallpaper_count >= 0),
  active_shortcut_icon_count integer not null default 0 check (active_shortcut_icon_count >= 0),
  active_bytes bigint not null default 0 check (active_bytes >= 0)
);

create table if not exists public.lumno_media_global_usage (
  singleton boolean primary key default true check (singleton),
  active_bytes bigint not null default 0 check (active_bytes >= 0)
);

insert into public.lumno_media_global_usage (singleton, active_bytes)
values (true, 0)
on conflict (singleton) do nothing;

insert into public.lumno_media_usage (
  user_id,
  active_count,
  active_wallpaper_count,
  active_shortcut_icon_count,
  active_bytes
)
select
  user_id,
  count(*)::integer,
  count(*) filter (where asset_kind = 'wallpaper')::integer,
  count(*) filter (where asset_kind = 'shortcut_icon')::integer,
  coalesce(sum(byte_size + thumbnail_byte_size), 0)::bigint
from public.lumno_assets
where deleted_at is null
group by user_id
on conflict (user_id) do update set
  active_count = excluded.active_count,
  active_wallpaper_count = excluded.active_wallpaper_count,
  active_shortcut_icon_count = excluded.active_shortcut_icon_count,
  active_bytes = excluded.active_bytes;

update public.lumno_media_usage
set active_count = 0,
    active_wallpaper_count = 0,
    active_shortcut_icon_count = 0,
    active_bytes = 0
where not exists (
  select 1
  from public.lumno_assets
  where lumno_assets.user_id = lumno_media_usage.user_id
    and deleted_at is null
);

update public.lumno_media_global_usage
set active_bytes = coalesce((
  select sum(byte_size + thumbnail_byte_size)
  from public.lumno_assets
  where deleted_at is null
), 0)
where singleton;

create index if not exists lumno_assets_active_client_lookup_idx
  on public.lumno_assets (user_id, client_asset_id)
  where deleted_at is null;

create index if not exists lumno_assets_active_path_lookup_idx
  on public.lumno_assets (storage_path)
  where deleted_at is null;

alter table public.lumno_media_usage enable row level security;
alter table public.lumno_media_usage force row level security;
alter table public.lumno_media_global_usage enable row level security;
alter table public.lumno_media_global_usage force row level security;
revoke all on public.lumno_media_usage from public, anon, authenticated;
revoke all on public.lumno_media_global_usage from public, anon, authenticated;
grant all on public.lumno_media_usage to service_role;
grant all on public.lumno_media_global_usage to service_role;

create or replace function public.lumno_enforce_asset_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usage public.lumno_media_usage;
  v_global public.lumno_media_global_usage;
  v_old_active boolean := false;
  v_new_active boolean := new.deleted_at is null;
  v_old_kind text;
  v_new_kind text := new.asset_kind;
  v_old_bytes bigint := 0;
  v_new_bytes bigint := coalesce(new.byte_size, 0) + coalesce(new.thumbnail_byte_size, 0);
  v_next_count integer;
  v_next_wallpaper_count integer;
  v_next_icon_count integer;
  v_next_bytes bigint;
  v_next_global_bytes bigint;
begin
  if tg_op = 'UPDATE' then
    if old.user_id is distinct from new.user_id then
      raise exception 'Media assets cannot change account ownership' using errcode = '42501';
    end if;
    v_old_active := old.deleted_at is null;
    v_old_kind := old.asset_kind;
    v_old_bytes := coalesce(old.byte_size, 0) + coalesce(old.thumbnail_byte_size, 0);
  end if;

  -- Every asset mutation takes the same global-then-user lock order. The
  -- global row is tiny, so this avoids a scan without holding a lock across
  -- Storage work.
  insert into public.lumno_media_global_usage (singleton, active_bytes)
  values (true, 0)
  on conflict (singleton) do nothing;
  select * into v_global
  from public.lumno_media_global_usage
  where singleton
  for update;

  insert into public.lumno_media_usage (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  select * into v_usage
  from public.lumno_media_usage
  where user_id = new.user_id
  for update;

  v_next_count := v_usage.active_count
    - case when v_old_active then 1 else 0 end
    + case when v_new_active then 1 else 0 end;
  v_next_wallpaper_count := v_usage.active_wallpaper_count
    - case when v_old_active and v_old_kind = 'wallpaper' then 1 else 0 end
    + case when v_new_active and v_new_kind = 'wallpaper' then 1 else 0 end;
  v_next_icon_count := v_usage.active_shortcut_icon_count
    - case when v_old_active and v_old_kind = 'shortcut_icon' then 1 else 0 end
    + case when v_new_active and v_new_kind = 'shortcut_icon' then 1 else 0 end;
  v_next_bytes := v_usage.active_bytes - v_old_bytes + case when v_new_active then v_new_bytes else 0 end;
  v_next_global_bytes := v_global.active_bytes - v_old_bytes + case when v_new_active then v_new_bytes else 0 end;

  if v_next_count < 0 or v_next_wallpaper_count < 0 or v_next_icon_count < 0
      or v_next_bytes < 0 or v_next_global_bytes < 0 then
    raise exception 'Media usage counter is inconsistent' using errcode = '55000';
  end if;
  if v_next_count > 22 then
    raise exception 'A user may store at most 22 active media assets' using errcode = '23514';
  end if;
  if v_next_wallpaper_count > 2 then
    raise exception 'A user may store at most two active wallpapers' using errcode = '23514';
  end if;
  if v_next_icon_count > 20 then
    raise exception 'A user may store at most 20 active shortcut icons' using errcode = '23514';
  end if;
  if v_next_bytes > 10485760 then
    raise exception 'A user may store at most 10 MiB of active media' using errcode = '23514';
  end if;
  if v_next_global_bytes > 943718400 then
    raise exception 'Media storage reserve reached' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.lumno_update_media_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_active boolean := false;
  v_new_active boolean := false;
  v_old_kind text;
  v_new_kind text;
  v_old_bytes bigint := 0;
  v_new_bytes bigint := 0;
  v_user_id uuid;
begin
  if tg_op = 'DELETE' then
    v_old_active := old.deleted_at is null;
    v_old_kind := old.asset_kind;
    v_old_bytes := coalesce(old.byte_size, 0) + coalesce(old.thumbnail_byte_size, 0);
    v_user_id := old.user_id;
  else
    if tg_op = 'UPDATE' then
      v_old_active := old.deleted_at is null;
      v_old_kind := old.asset_kind;
      v_old_bytes := case when v_old_active
        then coalesce(old.byte_size, 0) + coalesce(old.thumbnail_byte_size, 0)
        else 0 end;
    end if;
    v_new_active := new.deleted_at is null;
    v_new_kind := new.asset_kind;
    v_new_bytes := case when v_new_active
      then coalesce(new.byte_size, 0) + coalesce(new.thumbnail_byte_size, 0)
      else 0 end;
    v_user_id := new.user_id;
  end if;

  update public.lumno_media_global_usage
  set active_bytes = active_bytes - v_old_bytes + v_new_bytes
  where singleton;

  update public.lumno_media_usage
  set active_count = active_count
        - case when v_old_active then 1 else 0 end
        + case when v_new_active then 1 else 0 end,
      active_wallpaper_count = active_wallpaper_count
        - case when v_old_active and v_old_kind = 'wallpaper' then 1 else 0 end
        + case when v_new_active and v_new_kind = 'wallpaper' then 1 else 0 end,
      active_shortcut_icon_count = active_shortcut_icon_count
        - case when v_old_active and v_old_kind = 'shortcut_icon' then 1 else 0 end
        + case when v_new_active and v_new_kind = 'shortcut_icon' then 1 else 0 end,
      active_bytes = active_bytes - v_old_bytes + v_new_bytes
  where user_id = v_user_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_assets_enforce_limit on public.lumno_assets;
create trigger lumno_assets_enforce_limit
before insert or update of user_id, asset_kind, byte_size, thumbnail_byte_size, deleted_at
on public.lumno_assets
for each row execute function public.lumno_enforce_asset_limit();

drop trigger if exists lumno_assets_update_usage on public.lumno_assets;
create trigger lumno_assets_update_usage
after insert or delete or update of user_id, asset_kind, byte_size, thumbnail_byte_size, deleted_at
on public.lumno_assets
for each row execute function public.lumno_update_media_usage();

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
  v_requested_bytes bigint := coalesce(p_byte_size, 0) + coalesce(p_thumbnail_byte_size, 0);
  v_usage public.lumno_media_usage;
  v_global public.lumno_media_global_usage;
  v_existing public.lumno_assets;
  v_active_count integer;
  v_active_wallpaper_count integer;
  v_active_icon_count integer;
  v_active_bytes bigint;
  v_global_active_bytes bigint;
begin
  if p_user_id is null
      or p_asset_kind not in ('wallpaper', 'shortcut_icon')
      or char_length(coalesce(trim(p_client_asset_id), '')) not between 1 and 120
      or v_requested_bytes not between 1 and 2252800 then
    raise exception 'Invalid media upload request' using errcode = '22023';
  end if;

  v_day_start := date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';
  v_month_start := date_trunc('month', v_now at time zone 'UTC') at time zone 'UTC';

  -- This row lock serializes only one account's rate accounting. The global
  -- storage check is an optimistic read; the commit trigger is authoritative.
  insert into public.lumno_media_usage (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select * into v_usage
  from public.lumno_media_usage
  where user_id = p_user_id
  for update;

  delete from public.lumno_media_upload_events
  where user_id = p_user_id and created_at < v_month_start - interval '2 days';

  select count(*) into v_recent_uploads
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= v_now - interval '1 hour';
  select coalesce(sum(byte_size), 0) into v_day_upload_bytes
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= v_day_start;
  select coalesce(sum(byte_size), 0) into v_month_upload_bytes
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= v_month_start;

  if v_recent_uploads >= 40
      or v_day_upload_bytes + v_requested_bytes > 33554432
      or v_month_upload_bytes + v_requested_bytes > 268435456 then
    raise exception 'Media upload rate limit exceeded' using errcode = '42901';
  end if;

  select * into v_existing
  from public.lumno_assets
  where user_id = p_user_id and client_asset_id = p_client_asset_id;
  v_active_count := v_usage.active_count - case when v_existing.id is not null and v_existing.deleted_at is null then 1 else 0 end;
  v_active_wallpaper_count := v_usage.active_wallpaper_count
    - case when v_existing.id is not null and v_existing.deleted_at is null and v_existing.asset_kind = 'wallpaper' then 1 else 0 end;
  v_active_icon_count := v_usage.active_shortcut_icon_count
    - case when v_existing.id is not null and v_existing.deleted_at is null and v_existing.asset_kind = 'shortcut_icon' then 1 else 0 end;
  v_active_bytes := v_usage.active_bytes
    - case when v_existing.id is not null and v_existing.deleted_at is null
      then coalesce(v_existing.byte_size, 0) + coalesce(v_existing.thumbnail_byte_size, 0)
      else 0 end;

  select * into v_global
  from public.lumno_media_global_usage
  where singleton;
  v_global_active_bytes := coalesce(v_global.active_bytes, 0)
    - case when v_existing.id is not null and v_existing.deleted_at is null
      then coalesce(v_existing.byte_size, 0) + coalesce(v_existing.thumbnail_byte_size, 0)
      else 0 end;

  if v_active_count + 1 > 22
      or (p_asset_kind = 'wallpaper' and v_active_wallpaper_count + 1 > 2)
      or (p_asset_kind = 'shortcut_icon' and v_active_icon_count + 1 > 20)
      or v_active_bytes + v_requested_bytes > 10485760
      or v_global_active_bytes + v_requested_bytes > 943718400 then
    raise exception 'Media quota exceeded' using errcode = '23514';
  end if;

  insert into public.lumno_media_upload_events (user_id, byte_size, created_at)
  values (p_user_id, v_requested_bytes, v_now);
  return true;
end;
$$;

create or replace function public.lumno_commit_media_asset(
  p_user_id uuid,
  p_asset_kind text,
  p_client_asset_id text,
  p_lease_token uuid,
  p_original_name text,
  p_storage_path text,
  p_thumbnail_path text,
  p_sha256 text,
  p_thumbnail_sha256 text,
  p_mime_type text,
  p_byte_size bigint,
  p_thumbnail_byte_size bigint,
  p_width integer,
  p_height integer
)
returns public.lumno_assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lease boolean;
  v_asset public.lumno_assets;
begin
  if p_user_id is null or p_lease_token is null
      or p_asset_kind not in ('wallpaper', 'shortcut_icon')
      or char_length(coalesce(p_client_asset_id, '')) not between 1 and 120 then
    raise exception 'Invalid media asset commit' using errcode = '22023';
  end if;

  -- Fence the request and the metadata write in one transaction. A delayed
  -- request with an old token can no longer replace a newer upload.
  select true into v_lease
  from public.lumno_media_upload_leases
  where user_id = p_user_id
    and client_asset_id = p_client_asset_id
    and lease_token = p_lease_token
    and expires_at > now()
  for update;
  if not found then
    return null;
  end if;

  insert into public.lumno_assets (
    user_id,
    asset_kind,
    client_asset_id,
    original_name,
    storage_path,
    thumbnail_path,
    sha256,
    thumbnail_sha256,
    mime_type,
    byte_size,
    thumbnail_byte_size,
    width,
    height,
    ingest_version,
    deleted_at
  ) values (
    p_user_id,
    p_asset_kind,
    p_client_asset_id,
    left(coalesce(trim(p_original_name), ''), 200),
    p_storage_path,
    p_thumbnail_path,
    p_sha256,
    p_thumbnail_sha256,
    p_mime_type,
    p_byte_size,
    p_thumbnail_byte_size,
    p_width,
    p_height,
    2,
    null
  )
  on conflict (user_id, client_asset_id) do update set
    asset_kind = excluded.asset_kind,
    original_name = excluded.original_name,
    storage_path = excluded.storage_path,
    thumbnail_path = excluded.thumbnail_path,
    sha256 = excluded.sha256,
    thumbnail_sha256 = excluded.thumbnail_sha256,
    mime_type = excluded.mime_type,
    byte_size = excluded.byte_size,
    thumbnail_byte_size = excluded.thumbnail_byte_size,
    width = excluded.width,
    height = excluded.height,
    ingest_version = excluded.ingest_version,
    deleted_at = null
  returning * into v_asset;

  return v_asset;
end;
$$;

revoke all on function public.lumno_enforce_asset_limit() from public, anon, authenticated;
revoke all on function public.lumno_update_media_usage() from public, anon, authenticated;
revoke all on function public.lumno_authorize_media_upload(uuid, text, text, bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.lumno_commit_media_asset(uuid, text, text, uuid, text, text, text, text, text, text, bigint, bigint, integer, integer)
  from public, anon, authenticated;
grant execute on function public.lumno_enforce_asset_limit() to service_role;
grant execute on function public.lumno_update_media_usage() to service_role;
grant execute on function public.lumno_authorize_media_upload(uuid, text, text, bigint, bigint)
  to service_role;
grant execute on function public.lumno_commit_media_asset(uuid, text, text, uuid, text, text, text, text, text, text, bigint, bigint, integer, integer)
  to service_role;
