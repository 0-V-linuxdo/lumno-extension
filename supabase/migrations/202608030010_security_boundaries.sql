-- Close high-confidence authentication, retention, and resource-abuse gaps.

create extension if not exists pg_cron;

-- A stable name makes replay idempotent: pg_cron updates the existing named
-- job instead of adding another schedule.
select cron.schedule(
  'lumno-data-retention-daily',
  '17 3 * * *',
  $cron$select public.lumno_apply_data_retention(current_date);$cron$
);

create index if not exists lumno_devices_active_user_idx
  on public.lumno_devices (user_id)
  where revoked_at is null;

create index if not exists lumno_usage_ingest_batches_user_created_idx
  on public.lumno_usage_ingest_batches (user_id, created_at desc);

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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':devices', 0)
  );
  delete from public.lumno_devices
  where user_id = v_user_id
    and id <> p_device_id
    and (
      revoked_at < now() - interval '30 days'
      or last_seen_at < now() - interval '365 days'
    );

  if exists (
    select 1
    from public.lumno_devices
    where id = p_device_id
      and user_id = v_user_id
      and revoked_at is not null
  ) then
    raise exception 'Device has been revoked' using errcode = '42501';
  end if;

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
    last_seen_at = now()
  where lumno_devices.user_id = v_user_id
    and lumno_devices.revoked_at is null
    and (
      lumno_devices.display_name is distinct from excluded.display_name
      or lumno_devices.browser_family is distinct from excluded.browser_family
      or lumno_devices.platform_family is distinct from excluded.platform_family
      or lumno_devices.extension_version is distinct from excluded.extension_version
      or lumno_devices.last_seen_at <= now() - interval '1 hour'
    )
  returning * into v_device;

  if v_device.id is null then
    select * into v_device
    from public.lumno_devices
    where id = p_device_id;
    if v_device.id is null
        or v_device.user_id is distinct from v_user_id
        or v_device.revoked_at is not null then
      raise exception 'Device id belongs to another account or is revoked' using errcode = '42501';
    end if;
  end if;
  return v_device;
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
  v_existing_count bigint;
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

  -- The production client reuses one batch id until a day's upload succeeds.
  -- Serialize per account so parallel unique ids cannot bypass the rolling cap.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':usage-ingest', 0)
  );
  if exists (
    select 1 from public.lumno_usage_ingest_batches
    where user_id = p_user_id and batch_id = p_batch_id
  ) then
    return false;
  end if;
  if (select count(*) from public.lumno_usage_ingest_batches
      where user_id = p_user_id
        and created_at >= now() - interval '24 hours') >= 24 then
    raise exception 'Usage ingest rate exceeded' using errcode = '42901';
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
    select count into v_existing_count
    from public.lumno_usage_daily
    where user_id = p_user_id
      and usage_day = p_usage_day
      and metric = v_metric.key;
    if coalesce(v_existing_count, 0) + v_count > 1000000 then
      raise exception 'Daily usage metric limit exceeded' using errcode = '42901';
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

revoke all on function public.lumno_register_device(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.lumno_register_device(uuid, text, text, text, text)
  to authenticated;

revoke all on function public.lumno_ingest_usage_batch(uuid, uuid, date, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.lumno_ingest_usage_batch(uuid, uuid, date, jsonb, jsonb, jsonb)
  to service_role;
