-- Expand Lumno sync with an explicit, discoverable protocol contract. Keep the
-- legacy RPCs untouched so deployed clients continue to work while protocol 2
-- rolls out.

create or replace function public.lumno_sync_keys_v1()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    '_x_extension_theme_mode_2024_unique_',
    '_x_extension_language_2024_unique_',
    '_x_extension_language_messages_2024_unique_',
    '_x_extension_recent_mode_2024_unique_',
    '_x_extension_recent_count_2024_unique_',
    '_x_extension_newtab_width_mode_2026_unique_',
    '_x_extension_newtab_search_width_2026_unique_',
    '_x_extension_newtab_theme_mode_2026_unique_',
    '_x_extension_newtab_theme_scope_2026_unique_',
    '_x_extension_newtab_zen_mode_2026_unique_',
    '_x_extension_newtab_wallpaper_2026_unique_',
    '_x_extension_newtab_local_wallpaper_2026_unique_',
    '_x_extension_newtab_wallpaper_overlay_2026_unique_',
    '_x_extension_newtab_wallpaper_effect_2026_unique_',
    '_x_extension_newtab_favicon_2026_unique_',
    '_x_extension_overlay_size_mode_2026_unique_',
    '_x_extension_overlay_enter_animation_2026_unique_',
    '_x_extension_bookmark_count_2024_unique_',
    '_x_extension_bookmark_columns_2024_unique_',
    '_x_extension_bookmark_view_mode_2026_unique_',
    '_x_extension_bookmark_folder_icons_visible_2026_unique_',
    '_x_extension_bookmark_topbar_surface_mode_2026_unique_',
    '_x_extension_bookmark_topbar_surface_color_light_2026_unique_',
    '_x_extension_bookmark_topbar_surface_color_dark_2026_unique_',
    '_x_extension_newtab_pinned_recent_sites_2026_unique_',
    '_x_extension_newtab_hidden_recent_sites_2026_unique_',
    '_x_extension_newtab_shortcuts_2026_unique_',
    '_x_extension_newtab_shortcuts_visible_2026_unique_',
    '_x_extension_newtab_shortcut_add_visible_2026_unique_',
    '_x_extension_newtab_shortcut_dock_magnification_enabled_2026_unique_',
    '_x_extension_update_notice_enabled_2026_unique_',
    '_x_extension_auto_pip_enabled_2026_unique_',
    '_x_extension_tab_switcher_enabled_2026_unique_',
    '_x_extension_selection_quick_actions_enabled_2026_unique_',
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
  ]::text[];
$$;

create or replace function public.lumno_sync_keys_v2()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select public.lumno_sync_keys_v1() || array[
    '_x_extension_selection_quick_actions_provider_2026_unique_',
    '_x_extension_selection_quick_actions_icon_set_2026_unique_',
    '_x_extension_selection_quick_actions_trigger_style_2026_unique_'
  ]::text[];
$$;

create or replace function public.lumno_get_sync_capabilities()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'current_protocol', 2,
    'supported_protocols', to_jsonb(array[1, 2]::integer[]),
    'max_push_batch', 100,
    'schema_hash', '3158a7fff8b1c85ab9b82fbd97d38cccf091d750332cd9a72477a368d98493c9',
    'sync_keys', to_jsonb(public.lumno_sync_keys_v2()),
    'protocol_keys', jsonb_build_object(
      '1', to_jsonb(public.lumno_sync_keys_v1()),
      '2', to_jsonb(public.lumno_sync_keys_v2())
    )
  );
$$;

create or replace function public.lumno_push_setting_changes_v2(
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
  v_entry record;
  v_change jsonb;
  v_operation_id text;
  v_key text;
  v_rejection_code text;
  v_rejection_message text;
  v_valid_changes jsonb := '[]'::jsonb;
  v_rejected jsonb := '[]'::jsonb;
  v_result jsonb := jsonb_build_object('accepted', '[]'::jsonb, 'conflicts', '[]'::jsonb);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  perform public.lumno_consume_sync_request(v_user_id, 'push');
  if coalesce(jsonb_typeof(p_changes), '') <> 'array' then
    raise exception 'Changes must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_changes) not between 1 and 100 then
    raise exception 'Changes must contain between 1 and 100 items' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.lumno_devices
    where id = p_device_id and user_id = v_user_id and revoked_at is null
  ) then
    raise exception 'Unknown or revoked device' using errcode = '42501';
  end if;

  for v_entry in
    select item, ordinal
    from jsonb_array_elements(p_changes) with ordinality as changes(item, ordinal)
    order by item->>'key', ordinal
  loop
    v_change := v_entry.item;
    v_operation_id := case when jsonb_typeof(v_change) = 'object'
      then trim(coalesce(v_change->>'operation_id', '')) else '' end;
    v_key := case when jsonb_typeof(v_change) = 'object'
      then trim(coalesce(v_change->>'key', '')) else '' end;
    v_rejection_code := null;
    v_rejection_message := null;

    if coalesce(jsonb_typeof(v_change), '') <> 'object' then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Change must be an object';
    elsif v_operation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Operation id must be a UUID';
    elsif v_key = '' then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Setting key is required';
    elsif not (v_key = any(public.lumno_sync_keys_v2())) then
      v_rejection_code := 'unsupported_key';
      v_rejection_message := 'Setting key is not supported by protocol 2';
    elsif coalesce(v_change->>'base_version', '0') !~ '^[0-9]{1,18}$' then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Base version must be a non-negative integer';
    elsif v_change ? 'schema_version' and (
      coalesce(v_change->>'schema_version', '') !~ '^[1-9][0-9]{0,4}$'
      or (v_change->>'schema_version')::numeric > 32767
    ) then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Schema version must be a positive small integer';
    elsif v_change ? 'deleted' and jsonb_typeof(v_change->'deleted') <> 'boolean' then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Deleted must be a boolean';
    elsif coalesce((v_change->>'deleted')::boolean, false) = false and not (v_change ? 'value') then
      v_rejection_code := 'invalid_change';
      v_rejection_message := 'Non-deleted changes require a value';
    end if;

    if v_rejection_code is null then
      v_valid_changes := v_valid_changes || jsonb_build_array(v_change);
    else
      v_rejected := v_rejected || jsonb_build_array(jsonb_build_object(
        'index', v_entry.ordinal - 1,
        'operation_id', nullif(v_operation_id, ''),
        'key', nullif(v_key, ''),
        'code', v_rejection_code,
        'message', v_rejection_message,
        'retryable', false
      ));
    end if;
  end loop;

  if jsonb_array_length(v_valid_changes) > 0 then
    v_result := public.lumno_push_setting_changes_internal(p_device_id, v_valid_changes);
  end if;
  return v_result || jsonb_build_object('rejected', v_rejected, 'protocol', 2);
end;
$$;

create or replace function public.lumno_pull_setting_changes_v2(
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
  select pulled.*
  from public.lumno_pull_setting_changes_internal(p_device_id, p_cursor, p_limit) as pulled
  where pulled.key = any(public.lumno_sync_keys_v2());
end;
$$;

revoke all on function public.lumno_sync_keys_v1() from public, anon, authenticated;
revoke all on function public.lumno_sync_keys_v2() from public, anon, authenticated;
revoke all on function public.lumno_get_sync_capabilities() from public;
revoke all on function public.lumno_push_setting_changes_v2(uuid, jsonb)
  from public, anon;
revoke all on function public.lumno_pull_setting_changes_v2(uuid, bigint, integer)
  from public, anon;

grant execute on function public.lumno_get_sync_capabilities() to anon, authenticated;
grant execute on function public.lumno_push_setting_changes_v2(uuid, jsonb) to authenticated;
grant execute on function public.lumno_pull_setting_changes_v2(uuid, bigint, integer) to authenticated;

notify pgrst, 'reload schema';
