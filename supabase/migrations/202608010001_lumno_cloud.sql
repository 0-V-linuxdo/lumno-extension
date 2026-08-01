-- Lumno Cloud schema v1.
-- Apply with the Supabase CLI after linking a project. All client-visible tables
-- use RLS; mutation-heavy sync paths go through narrow, atomic RPC functions.

create sequence if not exists public.lumno_sync_change_id_seq as bigint;

create or replace function public.lumno_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.lumno_is_sync_key(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate = any(array[
    '_x_extension_theme_mode_2024_unique_',
    '_x_extension_language_2024_unique_',
    '_x_extension_language_messages_2024_unique_',
    '_x_extension_recent_mode_2024_unique_',
    '_x_extension_recent_count_2024_unique_',
    '_x_extension_newtab_width_mode_2026_unique_',
    '_x_extension_newtab_search_width_2026_unique_',
    '_x_extension_newtab_theme_mode_2026_unique_',
    '_x_extension_newtab_theme_scope_2026_unique_',
    '_x_extension_newtab_wallpaper_2026_unique_',
    '_x_extension_newtab_local_wallpaper_2026_unique_',
    '_x_extension_newtab_wallpaper_overlay_2026_unique_',
    '_x_extension_newtab_wallpaper_effect_2026_unique_',
    '_x_extension_overlay_size_mode_2026_unique_',
    '_x_extension_overlay_enter_animation_2026_unique_',
    '_x_extension_bookmark_count_2024_unique_',
    '_x_extension_bookmark_columns_2024_unique_',
    '_x_extension_bookmark_view_mode_2026_unique_',
    '_x_extension_bookmark_folder_icons_visible_2026_unique_',
    '_x_extension_newtab_pinned_recent_sites_2026_unique_',
    '_x_extension_newtab_hidden_recent_sites_2026_unique_',
    '_x_extension_newtab_shortcuts_2026_unique_',
    '_x_extension_newtab_shortcuts_visible_2026_unique_',
    '_x_extension_newtab_shortcut_add_visible_2026_unique_',
    '_x_extension_newtab_shortcut_dock_magnification_enabled_2026_unique_',
    '_x_extension_update_notice_enabled_2026_unique_',
    '_x_extension_auto_pip_enabled_2026_unique_',
    '_x_extension_tab_switcher_enabled_2026_unique_',
    '_x_extension_document_pip_enabled_2026_unique_',
    '_x_extension_pinned_tab_recovery_enabled_2026_unique_',
    '_x_extension_overlay_tab_priority_2024_unique_',
    '_x_extension_newtab_wordmark_visible_2026_unique_',
    '_x_extension_restricted_action_2024_unique_',
    '_x_extension_search_result_priority_2026_unique_',
    '_x_extension_search_result_source_types_2026_unique_',
    '_x_extension_overlay_open_tabs_default_visible_2026_unique_',
    '_x_extension_fallback_hotkey_2024_unique_',
    '_x_extension_site_search_custom_2024_unique_',
    '_x_extension_site_search_disabled_2024_unique_',
    '_x_extension_search_blacklist_2026_unique_',
    '_x_extension_favicon_request_blacklist_2026_unique_',
    '_x_extension_favicon_enhanced_fetch_enabled_2026_unique_',
    '_x_extension_default_search_engine_2024_unique_'
  ]::text[]);
$$;

create or replace function public.lumno_is_usage_metric(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate = any(array[
    'command_bar_opened',
    'tab_switch_completed',
    'web_search_submitted',
    'site_search_submitted',
    'ai_search_submitted',
    'newtab_opened',
    'document_pip_started',
    'video_pip_started',
    'sync_succeeded',
    'sync_failed',
    'wallpaper_upload_succeeded',
    'wallpaper_upload_failed'
  ]::text[]);
$$;

create or replace function public.lumno_jsonb_has_only_keys(payload jsonb, allowed_keys text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(coalesce(payload, '{}'::jsonb)) = 'object'
    and not exists (
      select 1
      from jsonb_object_keys(coalesce(payload, '{}'::jsonb)) as supplied(key)
      where not (supplied.key = any(allowed_keys))
    );
$$;

create table if not exists public.lumno_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  analytics_subject_id uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumno_devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Lumno browser'
    check (char_length(display_name) between 1 and 80),
  browser_family text not null default 'other'
    check (browser_family in ('chrome', 'edge', 'brave', 'vivaldi', 'opera', 'other')),
  platform_family text not null default 'other'
    check (platform_family in ('windows', 'macos', 'linux', 'chromeos', 'other')),
  extension_version text not null default 'unknown'
    check (char_length(extension_version) between 1 and 40),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists lumno_devices_user_last_seen_idx
  on public.lumno_devices (user_id, last_seen_at desc);

create table if not exists public.lumno_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (public.lumno_is_sync_key(key)),
  value jsonb,
  version bigint not null default 1 check (version > 0),
  change_id bigint not null default nextval('public.lumno_sync_change_id_seq'),
  schema_version smallint not null default 1 check (schema_version > 0),
  updated_by_device uuid references public.lumno_devices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, key),
  check (deleted_at is null or value is null)
);

create index if not exists lumno_settings_user_change_idx
  on public.lumno_settings (user_id, change_id);
create index if not exists lumno_settings_updated_by_device_idx
  on public.lumno_settings (updated_by_device)
  where updated_by_device is not null;

create table if not exists public.lumno_sync_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  setting_key text not null check (public.lumno_is_sync_key(setting_key)),
  setting_version bigint not null check (setting_version > 0),
  change_id bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

create index if not exists lumno_sync_operations_created_idx
  on public.lumno_sync_operations (created_at);

create table if not exists public.lumno_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_asset_id text not null check (client_asset_id ~ '^custom-wallpaper-[a-zA-Z0-9-]{1,100}$'),
  original_name text not null default '' check (length(original_name) <= 200),
  storage_path text not null,
  thumbnail_path text,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size between 1 and 5242880),
  width integer not null check (width between 1 and 2560),
  height integer not null check (height between 1 and 2560),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, client_asset_id),
  unique (storage_path),
  check (storage_path like (user_id::text || '/%')),
  check (thumbnail_path is null or thumbnail_path like (user_id::text || '/%'))
);

create index if not exists lumno_assets_active_user_idx
  on public.lumno_assets (user_id, created_at desc)
  where deleted_at is null;

create index if not exists lumno_assets_user_sha_idx
  on public.lumno_assets (user_id, sha256);

create or replace function public.lumno_enforce_asset_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if exists (
    select 1 from public.lumno_assets
    where user_id = new.user_id and client_asset_id = new.client_asset_id
  ) then
    return new;
  end if;
  if (select count(*) from public.lumno_assets
      where user_id = new.user_id and deleted_at is null) >= 20 then
    raise exception 'A user may store at most 20 active media assets' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists lumno_assets_enforce_limit on public.lumno_assets;
create trigger lumno_assets_enforce_limit
before insert on public.lumno_assets
for each row execute function public.lumno_enforce_asset_limit();

create table if not exists public.lumno_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  privacy_notice_version text,
  sync_terms_version text,
  sync_consented_at timestamptz,
  analytics_terms_version text,
  analytics_consented_at timestamptz,
  analytics_withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((sync_terms_version is null) = (sync_consented_at is null)),
  check ((analytics_terms_version is null) = (analytics_consented_at is null))
);

create table if not exists public.lumno_usage_ingest_batches (
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null,
  usage_day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, batch_id)
);

create index if not exists lumno_usage_ingest_batches_created_idx
  on public.lumno_usage_ingest_batches (created_at);

create table if not exists public.lumno_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  metric text not null check (public.lumno_is_usage_metric(metric)),
  count bigint not null check (count > 0),
  dimensions jsonb not null default '{}'::jsonb,
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_day, metric)
);

create index if not exists lumno_usage_daily_metric_day_idx
  on public.lumno_usage_daily (metric, usage_day desc);

drop trigger if exists lumno_profiles_set_updated_at on public.lumno_profiles;
create trigger lumno_profiles_set_updated_at
before update on public.lumno_profiles
for each row execute function public.lumno_set_updated_at();

drop trigger if exists lumno_assets_set_updated_at on public.lumno_assets;
create trigger lumno_assets_set_updated_at
before update on public.lumno_assets
for each row execute function public.lumno_set_updated_at();

drop trigger if exists lumno_consents_set_updated_at on public.lumno_consents;
create trigger lumno_consents_set_updated_at
before update on public.lumno_consents
for each row execute function public.lumno_set_updated_at();

create or replace function public.lumno_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lumno_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists lumno_auth_user_created on auth.users;
create trigger lumno_auth_user_created
after insert on auth.users
for each row execute function public.lumno_handle_new_user();

insert into public.lumno_profiles (id)
select id from auth.users
on conflict (id) do nothing;

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

  insert into public.lumno_devices (
    id,
    user_id,
    display_name,
    browser_family,
    platform_family,
    extension_version
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
  v_change jsonb;
  v_operation_id uuid;
  v_key text;
  v_base_version bigint;
  v_deleted boolean;
  v_schema_version smallint;
  v_setting public.lumno_settings;
  v_previous_operation public.lumno_sync_operations;
  v_accepted jsonb := '[]'::jsonb;
  v_conflicts jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if coalesce(jsonb_typeof(p_changes), '') <> 'array' then
    raise exception 'Changes must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_changes) not between 1 and 100 then
    raise exception 'Changes must contain between 1 and 100 items' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.lumno_devices
    where id = p_device_id and user_id = v_user_id and revoked_at is null
  ) then
    raise exception 'Unknown or revoked device' using errcode = '42501';
  end if;

  for v_change in
    select item
    from jsonb_array_elements(p_changes) as changes(item)
    order by item->>'key'
  loop
    begin
      v_operation_id := (v_change->>'operation_id')::uuid;
      v_key := trim(v_change->>'key');
      v_base_version := coalesce((v_change->>'base_version')::bigint, 0);
      v_deleted := coalesce((v_change->>'deleted')::boolean, false);
      v_schema_version := coalesce((v_change->>'schema_version')::smallint, 1);
    exception when others then
      raise exception 'Malformed sync change' using errcode = '22023';
    end;

    if v_operation_id is null or v_key is null or
        not coalesce(public.lumno_is_sync_key(v_key), false) or
        v_base_version < 0 or v_schema_version <= 0 then
      raise exception 'Invalid sync change' using errcode = '22023';
    end if;
    if not v_deleted and not (v_change ? 'value') then
      raise exception 'Non-deleted changes require a value' using errcode = '22023';
    end if;

    select * into v_previous_operation
    from public.lumno_sync_operations
    where user_id = v_user_id and operation_id = v_operation_id;

    if v_previous_operation.operation_id is not null then
      if v_previous_operation.setting_key <> v_key then
        raise exception 'Operation id was already used for a different setting' using errcode = '22023';
      end if;
      v_accepted := v_accepted || jsonb_build_array(jsonb_build_object(
        'operation_id', v_previous_operation.operation_id,
        'key', v_previous_operation.setting_key,
        'version', v_previous_operation.setting_version,
        'change_id', v_previous_operation.change_id
      ));
      continue;
    end if;

    v_setting := null;
    if v_base_version = 0 then
      insert into public.lumno_settings (
        user_id,
        key,
        value,
        version,
        change_id,
        schema_version,
        updated_by_device,
        deleted_at
      ) values (
        v_user_id,
        v_key,
        case when v_deleted then null else v_change->'value' end,
        1,
        nextval('public.lumno_sync_change_id_seq'),
        v_schema_version,
        p_device_id,
        case when v_deleted then now() else null end
      )
      on conflict (user_id, key) do nothing
      returning * into v_setting;
    else
      update public.lumno_settings set
        value = case when v_deleted then null else v_change->'value' end,
        version = version + 1,
        change_id = nextval('public.lumno_sync_change_id_seq'),
        schema_version = v_schema_version,
        updated_by_device = p_device_id,
        updated_at = now(),
        deleted_at = case when v_deleted then now() else null end
      where user_id = v_user_id and key = v_key and version = v_base_version
      returning * into v_setting;
    end if;

    if v_setting.user_id is not null then
      insert into public.lumno_sync_operations (
        user_id,
        operation_id,
        setting_key,
        setting_version,
        change_id
      ) values (
        v_user_id,
        v_operation_id,
        v_setting.key,
        v_setting.version,
        v_setting.change_id
      );
      v_accepted := v_accepted || jsonb_build_array(jsonb_build_object(
        'operation_id', v_operation_id,
        'key', v_setting.key,
        'version', v_setting.version,
        'change_id', v_setting.change_id
      ));
      continue;
    end if;

    -- A concurrent retry may have committed while this call waited for a row lock.
    select * into v_previous_operation
    from public.lumno_sync_operations
    where user_id = v_user_id and operation_id = v_operation_id;
    if v_previous_operation.operation_id is not null then
      v_accepted := v_accepted || jsonb_build_array(jsonb_build_object(
        'operation_id', v_previous_operation.operation_id,
        'key', v_previous_operation.setting_key,
        'version', v_previous_operation.setting_version,
        'change_id', v_previous_operation.change_id
      ));
      continue;
    end if;

    select * into v_setting
    from public.lumno_settings
    where user_id = v_user_id and key = v_key;
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'operation_id', v_operation_id,
      'key', v_key,
      'value', v_setting.value,
      'deleted_at', v_setting.deleted_at,
      'version', coalesce(v_setting.version, 0),
      'change_id', coalesce(v_setting.change_id, 0)
    ));
  end loop;

  update public.lumno_devices
  set last_seen_at = now()
  where id = p_device_id and user_id = v_user_id;

  return jsonb_build_object('accepted', v_accepted, 'conflicts', v_conflicts);
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
  if p_cursor < 0 or p_limit not between 1 and 500 then
    raise exception 'Invalid pull cursor or limit' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.lumno_devices
    where id = p_device_id and user_id = v_user_id and revoked_at is null
  ) then
    raise exception 'Unknown or revoked device' using errcode = '42501';
  end if;

  update public.lumno_devices
  set last_seen_at = now()
  where id = p_device_id and user_id = v_user_id;

  return query
  select
    settings.key,
    settings.value,
    settings.version,
    settings.change_id,
    settings.schema_version,
    settings.updated_by_device,
    settings.updated_at,
    settings.deleted_at
  from public.lumno_settings as settings
  where settings.user_id = v_user_id and settings.change_id > p_cursor
  order by settings.change_id
  limit p_limit;
end;
$$;

create or replace function public.lumno_ingest_usage_batch(
  p_user_id uuid,
  p_batch_id uuid,
  p_usage_day date,
  p_metrics jsonb,
  p_dimensions jsonb,
  p_configuration jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metric record;
  v_count bigint;
  v_inserted integer;
begin
  if p_user_id is null or p_batch_id is null then
    raise exception 'User and batch ids are required' using errcode = '22023';
  end if;
  if p_usage_day < current_date - 7 or p_usage_day > current_date + 1 then
    raise exception 'Usage day is outside the accepted window' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_metrics), '') <> 'object' then
    raise exception 'Metrics must be a non-empty object' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_metrics)) not between 1 and 12 then
    raise exception 'Metrics must contain between 1 and 12 entries' using errcode = '22023';
  end if;
  if not public.lumno_jsonb_has_only_keys(p_dimensions, array[
    'extension_version', 'locale', 'browser_family', 'platform_family'
  ]::text[]) then
    raise exception 'Unexpected usage dimension' using errcode = '22023';
  end if;
  if not public.lumno_jsonb_has_only_keys(p_configuration, array[
    'schema_version', 'theme_mode', 'language_mode', 'recent_mode',
    'recent_count_bucket', 'newtab_width_mode', 'newtab_search_width_bucket',
    'newtab_theme_mode', 'wallpaper_source', 'overlay_size_mode',
    'shortcut_count', 'pinned_recent_site_count', 'hidden_recent_site_count',
    'custom_search_provider_count', 'disabled_search_provider_count',
    'search_blacklist_rule_count', 'favicon_blacklist_rule_count',
    'auto_pip_enabled', 'tab_switcher_enabled', 'document_pip_enabled',
    'pinned_tab_recovery_enabled'
  ]::text[]) then
    raise exception 'Unexpected configuration property' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.lumno_consents
    where user_id = p_user_id
      and analytics_consented_at is not null
      and analytics_withdrawn_at is null
  ) then
    raise exception 'Analytics consent is not active' using errcode = '42501';
  end if;

  insert into public.lumno_usage_ingest_batches (user_id, batch_id, usage_day)
  values (p_user_id, p_batch_id, p_usage_day)
  on conflict (user_id, batch_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  for v_metric in select key, value from jsonb_each_text(p_metrics)
  loop
    if not public.lumno_is_usage_metric(v_metric.key) or v_metric.value !~ '^[0-9]{1,6}$' then
      raise exception 'Invalid usage metric' using errcode = '22023';
    end if;
    v_count := v_metric.value::bigint;
    if v_count not between 1 and 100000 then
      raise exception 'Invalid usage count' using errcode = '22023';
    end if;

    insert into public.lumno_usage_daily (
      user_id,
      usage_day,
      metric,
      count,
      dimensions,
      configuration
    ) values (
      p_user_id,
      p_usage_day,
      v_metric.key,
      v_count,
      p_dimensions,
      p_configuration
    )
    on conflict (user_id, usage_day, metric) do update set
      count = lumno_usage_daily.count + excluded.count,
      dimensions = excluded.dimensions,
      configuration = excluded.configuration,
      updated_at = now();
  end loop;
  return true;
end;
$$;

alter table public.lumno_profiles enable row level security;
alter table public.lumno_profiles force row level security;
alter table public.lumno_devices enable row level security;
alter table public.lumno_devices force row level security;
alter table public.lumno_settings enable row level security;
alter table public.lumno_settings force row level security;
alter table public.lumno_sync_operations enable row level security;
alter table public.lumno_sync_operations force row level security;
alter table public.lumno_assets enable row level security;
alter table public.lumno_assets force row level security;
alter table public.lumno_consents enable row level security;
alter table public.lumno_consents force row level security;
alter table public.lumno_usage_ingest_batches enable row level security;
alter table public.lumno_usage_ingest_batches force row level security;
alter table public.lumno_usage_daily enable row level security;
alter table public.lumno_usage_daily force row level security;

drop policy if exists lumno_profiles_select_own on public.lumno_profiles;
create policy lumno_profiles_select_own on public.lumno_profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists lumno_devices_select_own on public.lumno_devices;
create policy lumno_devices_select_own on public.lumno_devices
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lumno_devices_insert_own on public.lumno_devices;
create policy lumno_devices_insert_own on public.lumno_devices
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists lumno_devices_update_own on public.lumno_devices;
create policy lumno_devices_update_own on public.lumno_devices
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists lumno_devices_delete_own on public.lumno_devices;
create policy lumno_devices_delete_own on public.lumno_devices
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lumno_settings_select_own on public.lumno_settings;
create policy lumno_settings_select_own on public.lumno_settings
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lumno_assets_select_own on public.lumno_assets;
create policy lumno_assets_select_own on public.lumno_assets
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lumno_assets_insert_own on public.lumno_assets;
create policy lumno_assets_insert_own on public.lumno_assets
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists lumno_assets_update_own on public.lumno_assets;
create policy lumno_assets_update_own on public.lumno_assets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists lumno_assets_delete_own on public.lumno_assets;
create policy lumno_assets_delete_own on public.lumno_assets
for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lumno_consents_select_own on public.lumno_consents;
create policy lumno_consents_select_own on public.lumno_consents
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists lumno_consents_insert_own on public.lumno_consents;
create policy lumno_consents_insert_own on public.lumno_consents
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists lumno_consents_update_own on public.lumno_consents;
create policy lumno_consents_update_own on public.lumno_consents
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.lumno_profiles from anon, authenticated;
revoke all on public.lumno_devices from anon, authenticated;
revoke all on public.lumno_settings from anon, authenticated;
revoke all on public.lumno_sync_operations from anon, authenticated;
revoke all on public.lumno_assets from anon, authenticated;
revoke all on public.lumno_consents from anon, authenticated;
revoke all on public.lumno_usage_ingest_batches from anon, authenticated;
revoke all on public.lumno_usage_daily from anon, authenticated;

grant select on public.lumno_profiles to authenticated;
grant select, insert, update, delete on public.lumno_devices to authenticated;
grant select on public.lumno_settings to authenticated;
grant select, insert, update, delete on public.lumno_assets to authenticated;
grant select, insert, update on public.lumno_consents to authenticated;

grant all on public.lumno_profiles to service_role;
grant all on public.lumno_devices to service_role;
grant all on public.lumno_settings to service_role;
grant all on public.lumno_sync_operations to service_role;
grant all on public.lumno_assets to service_role;
grant all on public.lumno_consents to service_role;
grant all on public.lumno_usage_ingest_batches to service_role;
grant all on public.lumno_usage_daily to service_role;
grant all on sequence public.lumno_sync_change_id_seq to service_role;

revoke all on function public.lumno_register_device(uuid, text, text, text, text) from public, anon;
revoke all on function public.lumno_push_setting_changes(uuid, jsonb) from public, anon;
revoke all on function public.lumno_pull_setting_changes(uuid, bigint, integer) from public, anon;
revoke all on function public.lumno_ingest_usage_batch(uuid, uuid, date, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.lumno_enforce_asset_limit() from public, anon, authenticated;
grant execute on function public.lumno_register_device(uuid, text, text, text, text) to authenticated;
grant execute on function public.lumno_push_setting_changes(uuid, jsonb) to authenticated;
grant execute on function public.lumno_pull_setting_changes(uuid, bigint, integer) to authenticated;
grant execute on function public.lumno_ingest_usage_batch(uuid, uuid, date, jsonb, jsonb, jsonb) to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'lumno-user-media',
  'lumno-user-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lumno_media_select_own on storage.objects;
create policy lumno_media_select_own on storage.objects
for select to authenticated
using (
  bucket_id = 'lumno-user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists lumno_media_insert_own on storage.objects;
create policy lumno_media_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'lumno-user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.lumno_assets
    where user_id = (select auth.uid())
      and deleted_at is null
      and (storage_path = name or thumbnail_path = name)
  )
);

drop policy if exists lumno_media_update_own on storage.objects;
create policy lumno_media_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'lumno-user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'lumno-user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.lumno_assets
    where user_id = (select auth.uid())
      and deleted_at is null
      and (storage_path = name or thumbnail_path = name)
  )
);

drop policy if exists lumno_media_delete_own on storage.objects;
create policy lumno_media_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'lumno-user-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
