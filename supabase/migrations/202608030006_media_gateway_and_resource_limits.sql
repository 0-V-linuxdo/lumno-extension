-- Route media mutations through a trusted Edge Function, enforce real byte
-- budgets, and bound other account-controlled rows/JSON values.

alter table public.lumno_assets
  add column if not exists thumbnail_byte_size bigint not null default 0,
  add column if not exists thumbnail_sha256 text,
  add column if not exists ingest_version smallint not null default 1;

alter table public.lumno_assets
  drop constraint if exists lumno_assets_thumbnail_byte_size_check,
  drop constraint if exists lumno_assets_thumbnail_sha256_check,
  drop constraint if exists lumno_assets_ingest_version_check,
  drop constraint if exists lumno_assets_gateway_shape_check;

alter table public.lumno_assets
  add constraint lumno_assets_thumbnail_byte_size_check
    check (thumbnail_byte_size between 0 and 2097152),
  add constraint lumno_assets_thumbnail_sha256_check
    check (thumbnail_sha256 is null or thumbnail_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint lumno_assets_ingest_version_check
    check (ingest_version between 1 and 2),
  add constraint lumno_assets_gateway_shape_check
    check (
      ingest_version = 1
      or (
        asset_kind = 'wallpaper'
        and mime_type = 'image/webp'
        and byte_size between 1 and 2097152
        and width between 1 and 2560
        and height between 1 and 2560
        and thumbnail_path is not null
        and thumbnail_byte_size between 1 and 163840
        and thumbnail_sha256 is not null
      )
      or (
        asset_kind = 'shortcut_icon'
        and mime_type = 'image/png'
        and byte_size between 1 and 98304
        and width = 128
        and height = 128
        and thumbnail_path is null
        and thumbnail_byte_size = 0
        and thumbnail_sha256 is null
      )
    );

create or replace function public.lumno_enforce_asset_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active_count integer;
  v_active_bytes bigint;
  v_new_bytes bigint := coalesce(new.byte_size, 0) + coalesce(new.thumbnail_byte_size, 0);
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':media', 0));

  if new.deleted_at is not null then
    return new;
  end if;

  select count(*), coalesce(sum(byte_size + thumbnail_byte_size), 0)
  into v_active_count, v_active_bytes
  from public.lumno_assets
  where user_id = new.user_id
    and deleted_at is null
    and id <> new.id;

  if v_active_count >= 40 then
    raise exception 'A user may store at most 40 active media assets' using errcode = '23514';
  end if;
  if (select count(*) from public.lumno_assets
      where user_id = new.user_id
        and asset_kind = new.asset_kind
        and deleted_at is null
        and id <> new.id) >= 20 then
    raise exception 'A user may store at most 20 active media assets of each kind' using errcode = '23514';
  end if;
  if v_active_bytes + v_new_bytes > 50331648 then
    raise exception 'A user may store at most 48 MiB of active media' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_assets_enforce_limit on public.lumno_assets;
create trigger lumno_assets_enforce_limit
before insert or update of user_id, asset_kind, byte_size, thumbnail_byte_size, deleted_at
on public.lumno_assets
for each row execute function public.lumno_enforce_asset_limit();

create table if not exists public.lumno_media_upload_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  byte_size bigint not null check (byte_size between 1 and 2252800),
  created_at timestamptz not null default now()
);

create index if not exists lumno_media_upload_events_user_created_idx
  on public.lumno_media_upload_events (user_id, created_at desc);

create table if not exists public.lumno_media_egress_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_month date not null,
  byte_size bigint not null default 0 check (byte_size between 0 and 536870912),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_month),
  check (usage_month = date_trunc('month', usage_month)::date)
);

alter table public.lumno_media_upload_events enable row level security;
alter table public.lumno_media_upload_events force row level security;
alter table public.lumno_media_egress_monthly enable row level security;
alter table public.lumno_media_egress_monthly force row level security;

revoke all on public.lumno_media_upload_events from public, anon, authenticated;
revoke all on public.lumno_media_egress_monthly from public, anon, authenticated;
grant all on public.lumno_media_upload_events to service_role;
grant all on public.lumno_media_egress_monthly to service_role;
grant usage, select on sequence public.lumno_media_upload_events_id_seq to service_role;

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
  v_recent_uploads integer;
  v_active_count integer;
  v_active_kind_count integer;
  v_active_bytes bigint;
  v_requested_bytes bigint := coalesce(p_byte_size, 0) + coalesce(p_thumbnail_byte_size, 0);
begin
  if p_user_id is null
      or p_asset_kind not in ('wallpaper', 'shortcut_icon')
      or coalesce(trim(p_client_asset_id), '') = ''
      or v_requested_bytes not between 1 and 2252800 then
    raise exception 'Invalid media upload request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':media', 0));
  delete from public.lumno_media_upload_events
  where user_id = p_user_id and created_at < now() - interval '2 days';

  select count(*) into v_recent_uploads
  from public.lumno_media_upload_events
  where user_id = p_user_id and created_at >= now() - interval '1 hour';
  if v_recent_uploads >= 30 then
    raise exception 'Media upload rate limit exceeded' using errcode = '42901';
  end if;

  select count(*), coalesce(sum(byte_size + thumbnail_byte_size), 0)
  into v_active_count, v_active_bytes
  from public.lumno_assets
  where user_id = p_user_id
    and deleted_at is null
    and client_asset_id <> p_client_asset_id;

  select count(*) into v_active_kind_count
  from public.lumno_assets
  where user_id = p_user_id
    and asset_kind = p_asset_kind
    and deleted_at is null
    and client_asset_id <> p_client_asset_id;

  if v_active_count >= 40 or v_active_kind_count >= 20
      or v_active_bytes + v_requested_bytes > 50331648 then
    raise exception 'Media quota exceeded' using errcode = '23514';
  end if;

  insert into public.lumno_media_upload_events (user_id, byte_size)
  values (p_user_id, v_requested_bytes);
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

  select coalesce(byte_size, 0) into v_total
  from public.lumno_media_egress_monthly
  where user_id = p_user_id and usage_month = v_month;
  v_total := coalesce(v_total, 0) + p_byte_size;
  if v_total > 536870912 then
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

create or replace function public.lumno_jsonb_within_depth(payload jsonb, remaining_depth integer)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_child jsonb;
begin
  if payload is null or jsonb_typeof(payload) not in ('array', 'object') then
    return true;
  end if;
  if remaining_depth <= 1 then
    return case
      when jsonb_typeof(payload) = 'array' then jsonb_array_length(payload) = 0
      else not exists (select 1 from jsonb_object_keys(payload))
    end;
  end if;
  if jsonb_typeof(payload) = 'array' then
    for v_child in select value from jsonb_array_elements(payload) loop
      if not public.lumno_jsonb_within_depth(v_child, remaining_depth - 1) then
        return false;
      end if;
    end loop;
  else
    for v_child in select value from jsonb_each(payload) loop
      if not public.lumno_jsonb_within_depth(v_child, remaining_depth - 1) then
        return false;
      end if;
    end loop;
  end if;
  return true;
end;
$$;

create or replace function public.lumno_enforce_setting_value_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.value is not null and (
      octet_length(new.value::text) > 32768
      or not public.lumno_jsonb_within_depth(new.value, 8)
  ) then
    raise exception 'Setting value exceeds the 32 KiB or depth-8 limit' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_settings_enforce_value_limit on public.lumno_settings;
create trigger lumno_settings_enforce_value_limit
before insert or update of value on public.lumno_settings
for each row execute function public.lumno_enforce_setting_value_limit();

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
  v_device public.lumno_devices;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_device_id is null then
    raise exception 'Device id is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':devices', 0));
  delete from public.lumno_devices
  where user_id = v_user_id
    and id <> p_device_id
    and (
      revoked_at < now() - interval '30 days'
      or last_seen_at < now() - interval '365 days'
    );

  if not exists (
    select 1 from public.lumno_devices where id = p_device_id and user_id = v_user_id
  ) and (select count(*) from public.lumno_devices
         where user_id = v_user_id and revoked_at is null) >= 10 then
    raise exception 'A user may register at most 10 active devices' using errcode = '23514';
  end if;

  insert into public.lumno_devices (
    id, user_id, display_name, browser_family, platform_family, extension_version
  ) values (
    p_device_id,
    v_user_id,
    left(coalesce(nullif(trim(p_display_name), ''), 'Lumno browser'), 80),
    case when p_browser_family in ('chrome', 'edge', 'brave', 'vivaldi', 'opera', 'other')
      then p_browser_family else 'other' end,
    case when p_platform_family in ('windows', 'macos', 'linux', 'chromeos', 'other')
      then p_platform_family else 'other' end,
    left(coalesce(nullif(trim(p_extension_version), ''), 'unknown'), 40)
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    browser_family = excluded.browser_family,
    platform_family = excluded.platform_family,
    extension_version = excluded.extension_version,
    last_seen_at = now(),
    revoked_at = null
  where lumno_devices.user_id = v_user_id
  returning * into v_device;

  if v_device.id is null then
    raise exception 'Device id belongs to another account' using errcode = '42501';
  end if;
  return v_device;
end;
$$;

drop policy if exists lumno_devices_insert_own on public.lumno_devices;
drop policy if exists lumno_devices_update_own on public.lumno_devices;
drop policy if exists lumno_devices_delete_own on public.lumno_devices;
drop policy if exists lumno_assets_insert_own on public.lumno_assets;
drop policy if exists lumno_assets_update_own on public.lumno_assets;
drop policy if exists lumno_assets_delete_own on public.lumno_assets;

revoke insert, update, delete on public.lumno_devices from authenticated;
revoke insert, update, delete on public.lumno_assets from authenticated;

drop policy if exists lumno_media_select_own on storage.objects;
drop policy if exists lumno_media_insert_own on storage.objects;
drop policy if exists lumno_media_update_own on storage.objects;
drop policy if exists lumno_media_delete_own on storage.objects;

update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/webp']
where id = 'lumno-user-media';

revoke all on function public.lumno_authorize_media_upload(uuid, text, text, bigint, bigint)
  from public, anon, authenticated;
revoke all on function public.lumno_record_media_egress(uuid, bigint)
  from public, anon, authenticated;
revoke all on function public.lumno_jsonb_within_depth(jsonb, integer)
  from public, anon, authenticated;
revoke all on function public.lumno_enforce_setting_value_limit()
  from public, anon, authenticated;
revoke all on function public.lumno_enforce_asset_limit()
  from public, anon, authenticated;
grant execute on function public.lumno_authorize_media_upload(uuid, text, text, bigint, bigint)
  to service_role;
grant execute on function public.lumno_record_media_egress(uuid, bigint)
  to service_role;
grant execute on function public.lumno_register_device(uuid, text, text, text, text)
  to authenticated;
