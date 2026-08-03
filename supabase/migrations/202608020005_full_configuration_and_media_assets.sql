-- Complete the user-configuration allowlist and support private shortcut-icon
-- assets alongside wallpapers. Existing wallpaper rows retain their kind.

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
    '_x_extension_selection_quick_actions_provider_2026_unique_',
    '_x_extension_selection_quick_actions_icon_set_2026_unique_',
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

alter table public.lumno_assets
  add column if not exists asset_kind text not null default 'wallpaper';

alter table public.lumno_assets
  drop constraint if exists lumno_assets_client_asset_id_check;
alter table public.lumno_assets
  drop constraint if exists lumno_assets_asset_kind_check;
alter table public.lumno_assets
  drop constraint if exists lumno_assets_shortcut_icon_shape_check;

alter table public.lumno_assets
  add constraint lumno_assets_asset_kind_check
    check (asset_kind in ('wallpaper', 'shortcut_icon')),
  add constraint lumno_assets_client_asset_id_check
    check (
      (asset_kind = 'wallpaper' and client_asset_id ~ '^custom-wallpaper-[a-zA-Z0-9-]{1,100}$')
      or
      (asset_kind = 'shortcut_icon' and client_asset_id ~ '^shortcut-icon-[0-9a-f]{64}$')
    ),
  add constraint lumno_assets_shortcut_icon_shape_check
    check (
      asset_kind <> 'shortcut_icon'
      or (
        mime_type = 'image/png'
        and byte_size <= 163840
        and width = 128
        and height = 128
        and thumbnail_path is null
      )
    );

create index if not exists lumno_assets_active_user_kind_idx
  on public.lumno_assets (user_id, asset_kind, created_at desc)
  where deleted_at is null;

create or replace function public.lumno_enforce_asset_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.asset_kind, 0));
  if exists (
    select 1 from public.lumno_assets
    where user_id = new.user_id and client_asset_id = new.client_asset_id
  ) then
    return new;
  end if;
  if (select count(*) from public.lumno_assets
      where user_id = new.user_id
        and asset_kind = new.asset_kind
        and deleted_at is null) >= 20 then
    raise exception 'A user may store at most 20 active media assets of each kind' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.lumno_enforce_asset_limit() from public, anon, authenticated;
grant execute on function public.lumno_enforce_asset_limit() to service_role;
