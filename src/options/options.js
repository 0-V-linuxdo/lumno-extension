(function() {
  const NAVIGATION_DISPOSITION = globalThis.LumnoNavigationDisposition || {};
  const panel = document.getElementById('_x_extension_settings_panel_2024_unique_');
  const optionsRoot = document.getElementById('_x_extension_options_root_2024_unique_');
  const tabsRow = document.querySelector('._x_extension_settings_tabs_row_2024_unique_');
  const appearanceContent = document.querySelector('._x_extension_settings_content_2024_unique_[data-content="appearance"]');
  const themePicker = appearanceContent
    ? appearanceContent.querySelector('._x_extension_theme_picker_2024_unique_')
    : null;
  const themeButtons = themePicker ? Array.from(themePicker.querySelectorAll('._x_extension_theme_option_2024_unique_')) : [];
  const themeIndicator = themePicker ? themePicker.querySelector('._x_extension_theme_indicator_2024_unique_') : null;
  const tabButtons = Array.from(document.querySelectorAll('._x_extension_settings_tab_button_2024_unique_'));
  const tabContents = Array.from(document.querySelectorAll('._x_extension_settings_content_2024_unique_'));
  const tabsContainer = document.getElementById('_x_extension_settings_tabs_2024_unique_');
  const tabsIndicator = tabsContainer ? tabsContainer.querySelector('._x_extension_tabs_indicator_2024_unique_') : null;
  const settingsVersion = document.getElementById('_x_extension_settings_version_2024_unique_');
  const languageSelect = document.getElementById('_x_extension_language_select_2024_unique_');
  const recentModeSelect = document.getElementById('_x_extension_recent_mode_select_2024_unique_');
  const recentModeTabButtons = Array.from(document.querySelectorAll('button[data-recent-mode]'));
  const recentModeTabsWrap = document.getElementById('_x_extension_recent_mode_tabs_wrap_2024_unique_');
  const recentModeTabsIndicator = recentModeTabsWrap
    ? recentModeTabsWrap.querySelector('._x_extension_theme_indicator_2024_unique_')
    : null;
  const recentCountSelect = document.getElementById('_x_extension_recent_count_select_2024_unique_');
  const newtabWidthSelect = document.getElementById('_x_extension_newtab_width_select_2026_unique_');
  const newtabWidthTabsWrap = document.getElementById('_x_extension_newtab_width_tabs_wrap_2026_unique_');
  const newtabWidthTabButtons = Array.from(document.querySelectorAll('button[data-newtab-width]'));
  const newtabWidthTabsIndicator = newtabWidthTabsWrap
    ? newtabWidthTabsWrap.querySelector('._x_extension_theme_indicator_2024_unique_')
    : null;
  const overlaySizeTabButtons = Array.from(document.querySelectorAll('button[data-overlay-size]'));
  const overlaySizeTabsWrap = document.getElementById('_x_extension_overlay_size_tabs_wrap_2026_unique_');
  const overlaySizeTabsIndicator = overlaySizeTabsWrap
    ? overlaySizeTabsWrap.querySelector('._x_extension_theme_indicator_2024_unique_')
    : null;
  const bookmarkCountSelect = document.getElementById('_x_extension_bookmark_count_select_2024_unique_');
  const bookmarkColumnsSelect = document.getElementById('_x_extension_bookmark_columns_select_2024_unique_');
  const bookmarkColumnsSelectWrap = bookmarkColumnsSelect
    ? bookmarkColumnsSelect.closest('._x_extension_select_wrap_2024_unique_')
    : null;
  const bookmarkFolderIconsVisibleToggle = document.getElementById('_x_extension_bookmark_folder_icons_visible_toggle_2026_unique_');
  const autoPipToggle = document.getElementById('_x_extension_auto_pip_toggle_2024_unique_');
  const tabSwitcherToggle = document.getElementById('_x_extension_tab_switcher_toggle_2026_unique_');
  const documentPipToggle = document.getElementById('_x_extension_document_pip_toggle_2026_unique_');
  const pinnedTabRecoveryToggle = document.getElementById('_x_extension_pinned_tab_recovery_toggle_2026_unique_');
  const overlayTabQuickSwitchToggle = document.getElementById('_x_extension_overlay_tab_quick_switch_2024_unique_');
  const newtabWordmarkToggle = document.getElementById('_x_extension_newtab_wordmark_toggle_2026_unique_');
  const newtabShortcutsToggle = document.getElementById('_x_extension_newtab_shortcuts_toggle_2026_unique_');
  const restrictedActionSelect = document.getElementById('_x_extension_restricted_action_select_2024_unique_');
  const searchResultPrioritySelect = document.getElementById('_x_extension_search_result_priority_select_2026_unique_');
  const searchResultSourceTypeInputs = Array.from(document.querySelectorAll('input[data-search-result-source-type]'));
  const overlayOpenTabsDefaultVisibleToggle = document.getElementById('_x_extension_overlay_open_tabs_default_visible_toggle_2026_unique_');
  const faviconEnhancedFetchToggle = document.getElementById('_x_extension_favicon_enhanced_fetch_toggle_2026_unique_');
  const faviconBlacklistEditor = document.getElementById('_x_extension_favicon_blacklist_editor_2026_unique_');
  const faviconBlacklistList = document.getElementById('_x_extension_favicon_blacklist_list_2026_unique_');
  const faviconBlacklistForm = document.getElementById('_x_extension_favicon_blacklist_form_2026_unique_');
  const faviconBlacklistFormTrigger = document.getElementById('_x_extension_favicon_blacklist_expand_2026_unique_');
  const faviconBlacklistClearButton = document.getElementById('_x_extension_favicon_blacklist_clear_2026_unique_');
  const faviconBlacklistUrlLabel = document.getElementById('_x_extension_favicon_blacklist_url_label_2026_unique_');
  const faviconBlacklistUrlPrefix = document.getElementById('_x_extension_favicon_blacklist_url_prefix_2026_unique_');
  const faviconBlacklistUrlInput = document.getElementById('_x_extension_favicon_blacklist_url_2026_unique_');
  const faviconBlacklistMatchExactInput = document.getElementById('_x_extension_favicon_blacklist_match_exact_2026_unique_');
  const faviconBlacklistMatchPrefixInput = document.getElementById('_x_extension_favicon_blacklist_match_prefix_2026_unique_');
  const faviconBlacklistMatchSuffixInput = document.getElementById('_x_extension_favicon_blacklist_match_suffix_2026_unique_');
  const faviconBlacklistMatchExactWrap = document.getElementById('_x_extension_favicon_blacklist_match_exact_wrap_2026_unique_');
  const faviconBlacklistMatchPrefixWrap = document.getElementById('_x_extension_favicon_blacklist_match_prefix_wrap_2026_unique_');
  const faviconBlacklistMatchSuffixWrap = document.getElementById('_x_extension_favicon_blacklist_match_suffix_wrap_2026_unique_');
  const faviconBlacklistAddButton = document.getElementById('_x_extension_favicon_blacklist_add_2026_unique_');
  const faviconBlacklistCancelButton = document.getElementById('_x_extension_favicon_blacklist_cancel_2026_unique_');
  const faviconBlacklistError = document.getElementById('_x_extension_favicon_blacklist_error_2026_unique_');
  const syncStatus = document.getElementById('_x_extension_sync_status_2024_unique_');
  const syncStatusText = document.getElementById('_x_extension_sync_status_text_2024_unique_');
  const syncNowButton = document.getElementById('_x_extension_sync_now_2024_unique_');
  const syncExportButton = document.getElementById('_x_extension_sync_export_2024_unique_');
  const syncImportButton = document.getElementById('_x_extension_sync_import_2024_unique_');
  const syncImportInput = document.getElementById('_x_extension_sync_import_input_2024_unique_');
  const updateNoticeToggle = document.getElementById('_x_extension_update_notice_toggle_2026_unique_');
  const fallbackShortcutInput = document.getElementById('_x_extension_shortcuts_input_2024_unique_');
  const fallbackShortcutTokens = document.getElementById('_x_extension_shortcuts_tokens_2024_unique_');
  const fallbackShortcutWrap = document.querySelector('._x_extension_shortcuts_hotkey_wrap_2024_unique_');
  const restrictedActionSelectWrap = document.getElementById('_x_extension_restricted_action_tabs_wrap_2024_unique_');
  const restrictedActionTabButtons = Array.from(document.querySelectorAll('button[data-restricted-action]'));
  const restrictedActionTabsIndicator = restrictedActionSelectWrap
    ? restrictedActionSelectWrap.querySelector('._x_extension_theme_indicator_2024_unique_')
    : null;
  const searchResultPriorityTabsWrap = document.getElementById('_x_extension_search_result_priority_tabs_wrap_2026_unique_');
  const searchResultPriorityTabButtons = Array.from(document.querySelectorAll('button[data-search-result-priority]'));
  const searchResultPriorityTabsIndicator = searchResultPriorityTabsWrap
    ? searchResultPriorityTabsWrap.querySelector('._x_extension_theme_indicator_2024_unique_')
    : null;
  const clearShortcutButton = document.getElementById('_x_extension_clear_shortcut_2024_unique_');
  const resetShortcutButton = document.getElementById('_x_extension_reset_shortcut_2024_unique_');
  const shortcutsStatus = document.getElementById('_x_extension_shortcuts_status_2024_unique_');
  const shortcutReferenceList = document.getElementById('_x_extension_shortcut_reference_list_2026_unique_');
  const openOnboardingPageButton = document.getElementById('_x_extension_open_onboarding_page_2026_unique_');
  const openShortcutsPageButton = document.getElementById('_x_extension_open_shortcuts_page_2026_unique_');
  const customSelectWraps = Array.from(document.querySelectorAll('._x_extension_custom_select_2024_unique_'));
  const siteSearchCustomList = document.getElementById('_x_extension_site_search_custom_list_2024_unique_');
  const siteSearchBuiltinList = document.getElementById('_x_extension_site_search_builtin_list_2024_unique_');
  const siteSearchAiGroup = document.getElementById('_x_extension_site_search_ai_group_2026_unique_');
  const siteSearchAiBuiltinList = document.getElementById('_x_extension_site_search_ai_builtin_list_2026_unique_');
  const siteSearchKeyInput = document.getElementById('_x_extension_site_search_key_2024_unique_');
  const siteSearchNameInput = document.getElementById('_x_extension_site_search_name_2024_unique_');
  const siteSearchTemplateInput = document.getElementById('_x_extension_site_search_template_2024_unique_');
  const siteSearchInsertQueryButton = document.getElementById('_x_extension_site_search_insert_query_2026_unique_');
  const siteSearchAliasInput = document.getElementById('_x_extension_site_search_alias_2024_unique_');
  const siteSearchForm = document.querySelector('._x_extension_settings_content_2024_unique_[data-content="shortcuts"] ._x_extension_shortcut_form_2024_unique_');
  const siteSearchFormTrigger = document.getElementById('_x_extension_site_search_expand_2024_unique_');
  const siteSearchAddButton = document.getElementById('_x_extension_site_search_add_2024_unique_');
  const siteSearchCancelButton = document.getElementById('_x_extension_site_search_cancel_2024_unique_');
  const siteSearchError = document.getElementById('_x_extension_site_search_error_2024_unique_');
  const builtinResetButton = document.getElementById('_x_extension_builtin_reset_2024_unique_');
  const customClearButton = document.getElementById('_x_extension_custom_clear_2024_unique_');
  const blacklistList = document.getElementById('_x_extension_blacklist_list_2026_unique_');
  const blacklistForm = document.getElementById('_x_extension_blacklist_form_2026_unique_');
  const blacklistFormTrigger = document.getElementById('_x_extension_blacklist_expand_2026_unique_');
  const blacklistClearButton = document.getElementById('_x_extension_blacklist_clear_2026_unique_');
  const blacklistUrlLabel = document.getElementById('_x_extension_blacklist_url_label_2026_unique_');
  const blacklistUrlPrefix = document.getElementById('_x_extension_blacklist_url_prefix_2026_unique_');
  const blacklistUrlInput = document.getElementById('_x_extension_blacklist_url_2026_unique_');
  const blacklistMatchExactInput = document.getElementById('_x_extension_blacklist_match_exact_2026_unique_');
  const blacklistMatchPrefixInput = document.getElementById('_x_extension_blacklist_match_prefix_2026_unique_');
  const blacklistMatchSuffixInput = document.getElementById('_x_extension_blacklist_match_suffix_2026_unique_');
  const blacklistMatchExactWrap = document.getElementById('_x_extension_blacklist_match_exact_wrap_2026_unique_');
  const blacklistMatchPrefixWrap = document.getElementById('_x_extension_blacklist_match_prefix_wrap_2026_unique_');
  const blacklistMatchSuffixWrap = document.getElementById('_x_extension_blacklist_match_suffix_wrap_2026_unique_');
  const blacklistAddButton = document.getElementById('_x_extension_blacklist_add_2026_unique_');
  const blacklistCancelButton = document.getElementById('_x_extension_blacklist_cancel_2026_unique_');
  const blacklistError = document.getElementById('_x_extension_blacklist_error_2026_unique_');
  const toastElement = document.getElementById('_x_extension_toast_2024_unique_');
  const confirmMask = document.getElementById('_x_extension_confirm_mask_2024_unique_');
  const confirmMessage = document.getElementById('_x_extension_confirm_message_2024_unique_');
  const confirmOk = document.getElementById('_x_extension_confirm_ok_2024_unique_');
  const confirmCancel = document.getElementById('_x_extension_confirm_cancel_2024_unique_');
  const confirmDialog = document.querySelector('._x_extension_confirm_dialog_2024_unique_');

  // 使用系统字体，避免外链字体依赖。
  if (!panel || themeButtons.length === 0 || tabButtons.length === 0) {
    return;
  }

  const SEARCH_UTILS = globalThis.LumnoSearchUtils || {};
  const storageArea = (chrome && chrome.storage && chrome.storage.sync)
    ? chrome.storage.sync
    : (chrome && chrome.storage ? chrome.storage.local : null);
  const storageAreaName = storageArea
    ? (storageArea === (chrome && chrome.storage ? chrome.storage.sync : null) ? 'sync' : 'local')
    : null;
  function addStorageChangeListener(listener) {
    if (!chrome || !chrome.storage || !chrome.storage.onChanged ||
        typeof chrome.storage.onChanged.addListener !== 'function') {
      return false;
    }
    chrome.storage.onChanged.addListener(listener);
    return true;
  }
  function getRiSvg(id, sizeClass) {
    const size = sizeClass || 'ri-size-12';
    return `<i class="ri-icon ${size} ${id}" aria-hidden="true"></i>`;
  }

  const THEME_STORAGE_KEY = '_x_extension_theme_mode_2024_unique_';
  const LANGUAGE_STORAGE_KEY = '_x_extension_language_2024_unique_';
  const LANGUAGE_MESSAGES_STORAGE_KEY = '_x_extension_language_messages_2024_unique_';
  const RECENT_MODE_STORAGE_KEY = '_x_extension_recent_mode_2024_unique_';
  const RECENT_COUNT_STORAGE_KEY = '_x_extension_recent_count_2024_unique_';
  const NEWTAB_WIDTH_MODE_STORAGE_KEY = '_x_extension_newtab_width_mode_2026_unique_';
  const NEWTAB_SEARCH_WIDTH_STORAGE_KEY = '_x_extension_newtab_search_width_2026_unique_';
  const NEWTAB_THEME_MODE_STORAGE_KEY = '_x_extension_newtab_theme_mode_2026_unique_';
  const NEWTAB_THEME_SCOPE_STORAGE_KEY = '_x_extension_newtab_theme_scope_2026_unique_';
  const NEWTAB_WALLPAPER_STORAGE_KEY = '_x_extension_newtab_wallpaper_2026_unique_';
  const NEWTAB_WALLPAPER_OVERLAY_STORAGE_KEY = '_x_extension_newtab_wallpaper_overlay_2026_unique_';
  const NEWTAB_WALLPAPER_EFFECT_STORAGE_KEY = '_x_extension_newtab_wallpaper_effect_2026_unique_';
  const OVERLAY_SIZE_MODE_STORAGE_KEY = '_x_extension_overlay_size_mode_2026_unique_';
  const BOOKMARK_COUNT_STORAGE_KEY = '_x_extension_bookmark_count_2024_unique_';
  const BOOKMARK_COLUMNS_STORAGE_KEY = '_x_extension_bookmark_columns_2024_unique_';
  const BOOKMARK_VIEW_MODE_STORAGE_KEY = '_x_extension_bookmark_view_mode_2026_unique_';
  const BOOKMARK_TOPBAR_SURFACE_COLOR_STORAGE_KEY =
    '_x_extension_bookmark_topbar_surface_color_2026_unique_';
  const BOOKMARK_TOPBAR_SURFACE_COLOR_LIGHT_STORAGE_KEY =
    '_x_extension_bookmark_topbar_surface_color_light_2026_unique_';
  const BOOKMARK_TOPBAR_SURFACE_COLOR_DARK_STORAGE_KEY =
    '_x_extension_bookmark_topbar_surface_color_dark_2026_unique_';
  const BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY = '_x_extension_bookmark_folder_icons_visible_2026_unique_';
  const PINNED_RECENT_SITES_STORAGE_KEY = '_x_extension_newtab_pinned_recent_sites_2026_unique_';
  const HIDDEN_RECENT_SITES_STORAGE_KEY = '_x_extension_newtab_hidden_recent_sites_2026_unique_';
  const NEWTAB_SHORTCUTS_STORAGE_KEY = '_x_extension_newtab_shortcuts_2026_unique_';
  const NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY = '_x_extension_newtab_shortcuts_visible_2026_unique_';
  const UPDATE_NOTICE_ENABLED_STORAGE_KEY = '_x_extension_update_notice_enabled_2026_unique_';
  const AUTO_PIP_ENABLED_STORAGE_KEY = '_x_extension_auto_pip_enabled_2026_unique_';
  const TAB_SWITCHER_ENABLED_STORAGE_KEY = '_x_extension_tab_switcher_enabled_2026_unique_';
  const DOCUMENT_PIP_ENABLED_STORAGE_KEY = '_x_extension_document_pip_enabled_2026_unique_';
  const PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY = '_x_extension_pinned_tab_recovery_enabled_2026_unique_';
  const OVERLAY_TAB_PRIORITY_STORAGE_KEY = '_x_extension_overlay_tab_priority_2024_unique_';
  const NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY = '_x_extension_newtab_wordmark_visible_2026_unique_';
  const RESTRICTED_ACTION_STORAGE_KEY = '_x_extension_restricted_action_2024_unique_';
  const RESTRICTED_ACTION_AUTO_BROWSER_SETTING_DONE_STORAGE_KEY = '_x_extension_restricted_action_auto_browser_setting_done_2026_unique_';
  const SEARCH_RESULT_PRIORITY_STORAGE_KEY = '_x_extension_search_result_priority_2026_unique_';
  const SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY = '_x_extension_search_result_source_types_2026_unique_';
  const OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY = '_x_extension_overlay_open_tabs_default_visible_2026_unique_';
  const FALLBACK_SHORTCUT_STORAGE_KEY = '_x_extension_fallback_hotkey_2024_unique_';
  const SITE_SEARCH_STORAGE_KEY = '_x_extension_site_search_custom_2024_unique_';
  const SITE_SEARCH_DISABLED_STORAGE_KEY = '_x_extension_site_search_disabled_2024_unique_';
  const SEARCH_BLACKLIST_STORAGE_KEY = '_x_extension_search_blacklist_2026_unique_';
  const FAVICON_REQUEST_BLACKLIST_STORAGE_KEY = '_x_extension_favicon_request_blacklist_2026_unique_';
  const FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY = '_x_extension_favicon_enhanced_fetch_enabled_2026_unique_';
  const BLACKLIST_UTILS = globalThis.LumnoBlacklistUtils || {};
  const SETTINGS = globalThis.LumnoSettings || {};
  const CHECKBOX = globalThis.LumnoCheckbox || {};
  const CHECKBOX_CLASS_NAME = CHECKBOX.className || '_x_extension_checkbox_2026_unique_';
  const CHECKBOX_GROUP_CLASS_NAME = CHECKBOX.groupClassName || '_x_extension_checkbox_group_2026_unique_';
  const SECONDARY_BUTTON_CLASS_NAME = '_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_secondary_2024_unique_';
  const DEFAULT_SEARCH_ENGINE_STORAGE_KEY = '_x_extension_default_search_engine_2024_unique_';
  const SYNC_META_KEY = '_x_extension_sync_meta_2024_unique_';
  const SYNC_KEYS = [
    THEME_STORAGE_KEY,
    LANGUAGE_STORAGE_KEY,
    LANGUAGE_MESSAGES_STORAGE_KEY,
    RECENT_MODE_STORAGE_KEY,
    RECENT_COUNT_STORAGE_KEY,
    NEWTAB_WIDTH_MODE_STORAGE_KEY,
    NEWTAB_SEARCH_WIDTH_STORAGE_KEY,
    NEWTAB_THEME_MODE_STORAGE_KEY,
    NEWTAB_THEME_SCOPE_STORAGE_KEY,
    NEWTAB_WALLPAPER_STORAGE_KEY,
    NEWTAB_WALLPAPER_OVERLAY_STORAGE_KEY,
    NEWTAB_WALLPAPER_EFFECT_STORAGE_KEY,
    OVERLAY_SIZE_MODE_STORAGE_KEY,
    BOOKMARK_COUNT_STORAGE_KEY,
    BOOKMARK_COLUMNS_STORAGE_KEY,
    BOOKMARK_VIEW_MODE_STORAGE_KEY,
    BOOKMARK_TOPBAR_SURFACE_COLOR_STORAGE_KEY,
    BOOKMARK_TOPBAR_SURFACE_COLOR_LIGHT_STORAGE_KEY,
    BOOKMARK_TOPBAR_SURFACE_COLOR_DARK_STORAGE_KEY,
    BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY,
    PINNED_RECENT_SITES_STORAGE_KEY,
    HIDDEN_RECENT_SITES_STORAGE_KEY,
    NEWTAB_SHORTCUTS_STORAGE_KEY,
    NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY,
    UPDATE_NOTICE_ENABLED_STORAGE_KEY,
    AUTO_PIP_ENABLED_STORAGE_KEY,
    TAB_SWITCHER_ENABLED_STORAGE_KEY,
    DOCUMENT_PIP_ENABLED_STORAGE_KEY,
    PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY,
    OVERLAY_TAB_PRIORITY_STORAGE_KEY,
    NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY,
    RESTRICTED_ACTION_STORAGE_KEY,
    SEARCH_RESULT_PRIORITY_STORAGE_KEY,
    SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY,
    OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY,
    FALLBACK_SHORTCUT_STORAGE_KEY,
    SITE_SEARCH_STORAGE_KEY,
    SITE_SEARCH_DISABLED_STORAGE_KEY,
    SEARCH_BLACKLIST_STORAGE_KEY,
    FAVICON_REQUEST_BLACKLIST_STORAGE_KEY,
    FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY,
    DEFAULT_SEARCH_ENGINE_STORAGE_KEY
  ];
  const DEBUG_DUPLICATE_CUSTOM_KEY = 'dup';
  const isMacPlatform = String((navigator && navigator.platform) || '').toLowerCase().includes('mac');
  const FORCE_TEXT_KEYCAPS_ON_MAC = false;
  const FORCE_OVERLAY_TAB_QUICK_SWITCH_ENABLED = true;
  const OPTIONS_TARGET_SITE_SEARCH_AI = 'site-search-ai';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let mediaListenerAttached = false;
  let defaultSiteSearchProviders = [];
  let customSiteSearchProviders = [];
  let disabledSiteSearchKeys = new Set();
  let toastTimer = null;
  let confirmResolver = null;
  let confirmOffset = { x: 0, y: 0 };
  let confirmClosingTimer = null;
  let bodyFixedSnapshot = null;
  let languageApplyRequestId = 0;
  let editingSiteSearchKey = null;
  let activePopconfirm = null;
  let siteSearchFormExpanded = false;
  let siteSearchRefreshSuppressUntil = 0;
  let siteSearchRefreshTimer = null;
  let pendingOptionsScrollTarget = '';
  let currentShortcutLabel = null;
  let isCapturingFallbackShortcut = false;
  let cancelCaptureOnMouseLeave = false;
  let fallbackCaptureStopTimer = null;
  let fallbackShortcutBaseWidth = 0;
  let isFallbackWidthReady = false;
  let searchBlacklistItems = [];
  let blacklistFormExpanded = false;
  let faviconRequestBlacklistItems = [];
  let faviconBlacklistFormExpanded = false;
  let searchResultSourceTypeGroup = null;
  const customSelectController = globalThis.LumnoCustomSelect &&
      typeof globalThis.LumnoCustomSelect.createController === 'function'
    ? globalThis.LumnoCustomSelect.createController({
      documentObj: document,
      windowObj: window,
      afterRefresh: syncFallbackShortcutWrapWidth
    })
    : null;
  const tooltipController = globalThis.LumnoTooltip &&
      typeof globalThis.LumnoTooltip.createController === 'function'
    ? globalThis.LumnoTooltip.createController({
      documentObj: document,
      windowObj: window,
      id: '_x_extension_options_tooltip_2026_unique_',
      appendTo: document.body,
      maxWidth: 'min(360px, calc(100vw - 24px))'
    })
    : null;
  const fallbackSiteSearchProviders = typeof SEARCH_UTILS.getDefaultSiteSearchProviders === 'function'
    ? SEARCH_UTILS.getDefaultSiteSearchProviders()
    : [];

  let currentMessages = null;
  let currentLanguageMode = 'system';

  function normalizeBlacklistMatchModes(value, fallbackMode) {
    if (BLACKLIST_UTILS.normalizeMatchModes) {
      return BLACKLIST_UTILS.normalizeMatchModes(
        value,
        fallbackMode === undefined ? 'prefix' : fallbackMode
      );
    }
    return fallbackMode ? [fallbackMode] : [];
  }

  function normalizeBlacklistPattern(value, matchModes, fallbackMode) {
    if (BLACKLIST_UTILS.normalizePattern) {
      return BLACKLIST_UTILS.normalizePattern(
        value,
        matchModes,
        fallbackMode === undefined ? 'prefix' : fallbackMode
      );
    }
    return '';
  }

  function normalizeSearchBlacklistItems(items) {
    if (BLACKLIST_UTILS.normalizeItems) {
      return BLACKLIST_UTILS.normalizeItems(items, 'prefix');
    }
    return [];
  }

  function normalizeFaviconRequestBlacklistItems(items) {
    if (BLACKLIST_UTILS.normalizeItems) {
      return BLACKLIST_UTILS.normalizeItems(items, 'prefix');
    }
    return [];
  }

  function buildBlacklistItemKey(item) {
    if (BLACKLIST_UTILS.buildRuleKey) {
      return BLACKLIST_UTILS.buildRuleKey(item, 'prefix');
    }
    return '';
  }

  function migrateStorageIfNeeded(keys) {
    if (!storageArea || !chrome || !chrome.storage || !chrome.storage.local) {
      return;
    }
    if (storageArea === chrome.storage.local) {
      return;
    }
    chrome.storage.local.get(keys, (localResult) => {
      const hasLocal = keys.some((key) => typeof localResult[key] !== 'undefined');
      if (!hasLocal) {
        return;
      }
      storageArea.get(keys, (syncResult) => {
        const missingSyncValues = {};
        keys.forEach((key) => {
          if (typeof localResult[key] !== 'undefined' && typeof syncResult[key] === 'undefined') {
            missingSyncValues[key] = localResult[key];
          }
        });
        const missingKeys = Object.keys(missingSyncValues);
        if (missingKeys.length === 0) {
          return;
        }
        storageArea.get(missingKeys, (latestSyncResult) => {
          const stillMissingSyncValues = {};
          missingKeys.forEach((key) => {
            if (typeof latestSyncResult[key] === 'undefined') {
              stillMissingSyncValues[key] = missingSyncValues[key];
            }
          });
          if (Object.keys(stillMissingSyncValues).length > 0) {
            storageArea.set(stillMissingSyncValues);
          }
        });
      });
    });
  }

  function getMessage(key, fallback) {
    if (currentMessages && Object.prototype.hasOwnProperty.call(currentMessages, key)) {
      const entry = currentMessages[key];
      if (entry && typeof entry.message === 'string') {
        return entry.message;
      }
    }
    if (currentLanguageMode !== 'system') {
      return fallback || '';
    }
    if (chrome && chrome.i18n && chrome.i18n.getMessage) {
      const message = chrome.i18n.getMessage(key);
      if (message) {
        return message;
      }
    }
    return fallback || '';
  }

  function formatTemplate(text, params) {
    return String(text || '').replace(/\{(\w+)\}/g, (match, key) => {
      if (params && Object.prototype.hasOwnProperty.call(params, key)) {
        return String(params[key]);
      }
      return match;
    });
  }

  function normalizeBookmarkCount(value) {
    const parsed = Number.parseInt(value, 10);
    if (parsed === 0 || parsed === 4 || parsed === 8 || parsed === 16 || parsed === 32) {
      return parsed;
    }
    return 8;
  }

  function normalizeRecentCount(value) {
    const parsed = Number.parseInt(value, 10);
    if (parsed === 0 || parsed === 4 || parsed === 8) {
      return parsed;
    }
    return 4;
  }

  function setBlacklistError(message) {
    if (!blacklistError) {
      return;
    }
    const text = String(message || '').trim();
    blacklistError.textContent = text;
    blacklistError.style.display = text ? 'block' : 'none';
  }

  function getBlacklistPatternInputValue(item) {
    if (BLACKLIST_UTILS.getPatternInputValue) {
      return BLACKLIST_UTILS.getPatternInputValue(item);
    }
    return '';
  }

  function setBlacklistFormExpanded(expanded) {
    blacklistFormExpanded = Boolean(expanded);
    if (blacklistForm) {
      blacklistForm.setAttribute('data-expanded', blacklistFormExpanded ? 'true' : 'false');
    }
    if (blacklistFormTrigger) {
      blacklistFormTrigger.setAttribute('aria-expanded', blacklistFormExpanded ? 'true' : 'false');
    }
    if (blacklistCancelButton) {
      blacklistCancelButton.style.display = blacklistFormExpanded ? 'inline-flex' : 'none';
      if (blacklistCancelButton.textContent) {
        blacklistCancelButton.textContent = getMessage('shortcuts_cancel', blacklistCancelButton.textContent);
      }
    }
    if (blacklistFormExpanded && blacklistUrlInput) {
      updateBlacklistInputPresentation();
      blacklistUrlInput.focus();
    }
  }

  function resetBlacklistForm() {
    if (blacklistUrlInput) {
      blacklistUrlInput.value = '';
    }
    if (blacklistAddButton) {
      blacklistAddButton.textContent = getMessage('blacklist_add', '添加');
      blacklistAddButton.classList.add('_x_extension_shortcut_save_2024_unique_');
    }
    setBlacklistError('');
    if (blacklistMatchExactInput) {
      blacklistMatchExactInput.checked = false;
    }
    if (blacklistMatchPrefixInput) {
      blacklistMatchPrefixInput.checked = false;
    }
    if (blacklistMatchSuffixInput) {
      blacklistMatchSuffixInput.checked = true;
    }
    syncBlacklistMatchModeAvailability();
    updateBlacklistInputPresentation();
    setBlacklistFormExpanded(false);
  }

  function setFaviconBlacklistError(message) {
    setInlineError(faviconBlacklistError, message);
  }

  function getFaviconBlacklistMatchModesFromForm() {
    return normalizeBlacklistMatchModes([
      faviconBlacklistMatchExactInput && faviconBlacklistMatchExactInput.checked ? 'exact' : '',
      faviconBlacklistMatchPrefixInput && faviconBlacklistMatchPrefixInput.checked ? 'prefix' : '',
      faviconBlacklistMatchSuffixInput && faviconBlacklistMatchSuffixInput.checked ? 'suffix' : ''
    ], null);
  }

  function updateFaviconBlacklistInputPresentation() {
    applyBlacklistInputPresentationToElements(
      faviconBlacklistUrlLabel,
      faviconBlacklistUrlPrefix,
      faviconBlacklistUrlInput,
      getFaviconBlacklistMatchModesFromForm()
    );
  }

  function syncFaviconBlacklistMatchModeAvailability(changedMode) {
    syncBlacklistModeSelection(
      {
        exact: faviconBlacklistMatchExactInput,
        prefix: faviconBlacklistMatchPrefixInput,
        suffix: faviconBlacklistMatchSuffixInput
      },
      changedMode,
      {
        exact: faviconBlacklistMatchExactWrap,
        prefix: faviconBlacklistMatchPrefixWrap,
        suffix: faviconBlacklistMatchSuffixWrap
      },
      updateFaviconBlacklistInputPresentation
    );
  }

  function setFaviconBlacklistFormExpanded(expanded) {
    faviconBlacklistFormExpanded = Boolean(expanded);
    if (faviconBlacklistForm) {
      faviconBlacklistForm.setAttribute('data-expanded', faviconBlacklistFormExpanded ? 'true' : 'false');
    }
    if (faviconBlacklistFormTrigger) {
      faviconBlacklistFormTrigger.setAttribute('aria-expanded', faviconBlacklistFormExpanded ? 'true' : 'false');
    }
    if (faviconBlacklistCancelButton) {
      faviconBlacklistCancelButton.style.display = faviconBlacklistFormExpanded ? 'inline-flex' : 'none';
    }
    if (faviconBlacklistFormExpanded && faviconBlacklistUrlInput) {
      updateFaviconBlacklistInputPresentation();
      faviconBlacklistUrlInput.focus();
    }
  }

  function resetFaviconBlacklistForm() {
    if (faviconBlacklistUrlInput) {
      faviconBlacklistUrlInput.value = '';
    }
    if (faviconBlacklistMatchExactInput) faviconBlacklistMatchExactInput.checked = false;
    if (faviconBlacklistMatchPrefixInput) faviconBlacklistMatchPrefixInput.checked = false;
    if (faviconBlacklistMatchSuffixInput) faviconBlacklistMatchSuffixInput.checked = true;
    setFaviconBlacklistError('');
    syncFaviconBlacklistMatchModeAvailability();
    updateFaviconBlacklistInputPresentation();
    setFaviconBlacklistFormExpanded(false);
  }

  function setFaviconBlacklistEditorEnabled(enabled) {
    const editable = enabled === true;
    if (!faviconBlacklistEditor) {
      return;
    }
    faviconBlacklistEditor.setAttribute('aria-disabled', editable ? 'false' : 'true');
    faviconBlacklistEditor.inert = !editable;
    if (editable) {
      faviconBlacklistEditor.removeAttribute('inert');
    } else {
      faviconBlacklistEditor.setAttribute('inert', '');
      setFaviconBlacklistFormExpanded(false);
    }
  }

  function getBlacklistMatchModesFromForm() {
    return normalizeBlacklistMatchModes([
      blacklistMatchExactInput && blacklistMatchExactInput.checked ? 'exact' : '',
      blacklistMatchPrefixInput && blacklistMatchPrefixInput.checked ? 'prefix' : '',
      blacklistMatchSuffixInput && blacklistMatchSuffixInput.checked ? 'suffix' : ''
    ], null);
  }

  function syncBlacklistMatchModeAvailability(changedMode) {
    syncBlacklistModeSelection(
      {
        exact: blacklistMatchExactInput,
        prefix: blacklistMatchPrefixInput,
        suffix: blacklistMatchSuffixInput
      },
      changedMode,
      {
        exact: blacklistMatchExactWrap,
        prefix: blacklistMatchPrefixWrap,
        suffix: blacklistMatchSuffixWrap
      },
      (modes) => applyBlacklistInputPresentationToElements(
        blacklistUrlLabel,
        blacklistUrlPrefix,
        blacklistUrlInput,
        modes
      )
    );
  }

  function getBlacklistMatchModesSummary(modes) {
    const normalized = normalizeBlacklistMatchModes(modes);
    if (normalized.length === 0) {
      return getMessage('blacklist_match_unset', '未设置匹配方式');
    }
    return normalized.map((mode) => {
      if (mode === 'exact') {
        return getMessage('blacklist_match_exact', '当前页面');
      }
      if (mode === 'suffix') {
        return getMessage('blacklist_match_suffix', '整个网站');
      }
      return getMessage('blacklist_match_prefix', '当前站点路径');
    }).join(' / ');
  }

  function getBlacklistMatchBadgeConfig(modes) {
    const normalized = normalizeBlacklistMatchModes(modes);
    if (normalized.includes('exact')) {
      return {
        tone: 'exact',
        text: getMessage('blacklist_match_exact', '当前页面')
      };
    }
    if (normalized.includes('suffix')) {
      return {
        tone: 'suffix',
        text: getMessage('blacklist_match_suffix', '整个网站')
      };
    }
    return {
      tone: 'prefix',
      text: getMessage('blacklist_match_prefix', '当前站点路径')
    };
  }

  function formatBlacklistPatternForDisplay(item) {
    if (!item || !item.pattern) {
      return '';
    }
    const modes = normalizeBlacklistMatchModes(item.matchModes);
    if (modes.includes('suffix')) {
      return item.pattern;
    }
    return `http(s)://${item.pattern}`;
  }

  function getBlacklistInputConfig(modes) {
    const normalized = normalizeBlacklistMatchModes(modes);
    if (normalized.includes('exact')) {
      return {
        labelKey: 'blacklist_label_url',
        labelFallback: 'URL rule',
        placeholderKey: 'blacklist_placeholder_exact',
        placeholderFallback: 'example.com/path',
        prefixText: 'http(s)://'
      };
    }
    if (normalized.includes('suffix')) {
      return {
        labelKey: 'blacklist_label_url',
        labelFallback: 'URL rule',
        placeholderKey: 'blacklist_placeholder_domain',
        placeholderFallback: 'baidu.com',
        prefixText: ''
      };
    }
    return {
      labelKey: 'blacklist_label_url',
      labelFallback: 'URL rule',
      placeholderKey: 'blacklist_placeholder_prefix',
      placeholderFallback: 'baidu.com or baidu.com/search',
      prefixText: 'http(s)://'
    };
  }

  function updateBlacklistInputPresentation() {
    const modes = getBlacklistMatchModesFromForm();
    applyBlacklistInputPresentationToElements(
      blacklistUrlLabel,
      blacklistUrlPrefix,
      blacklistUrlInput,
      modes
    );
    const config = getBlacklistInputConfig(modes);
    if (blacklistUrlLabel) {
      blacklistUrlLabel.setAttribute('data-i18n', config.labelKey);
    }
    if (blacklistUrlInput) {
      blacklistUrlInput.setAttribute('data-i18n-placeholder', config.placeholderKey);
    }
  }

  function applyBlacklistInputPresentationToElements(labelNode, prefixNode, inputNode, modes) {
    const config = getBlacklistInputConfig(modes);
    if (labelNode) {
      labelNode.textContent = getMessage(config.labelKey, config.labelFallback);
    }
    if (prefixNode) {
      prefixNode.textContent = config.prefixText;
      prefixNode.style.display = config.prefixText ? 'block' : 'none';
    }
    const affixNode = inputNode && inputNode.closest
      ? inputNode.closest('._x_extension_shortcut_input_affix_2026_unique_')
      : null;
    if (affixNode) {
      affixNode.setAttribute('data-has-prefix', config.prefixText ? 'true' : 'false');
    }
    if (inputNode) {
      inputNode.placeholder = getMessage(config.placeholderKey, config.placeholderFallback);
    }
  }

  function setInlineError(node, message) {
    if (!node) {
      return;
    }
    const text = String(message || '').trim();
    node.textContent = text;
    node.style.display = text ? 'block' : 'none';
  }

  function syncBlacklistModeSelection(modeInputs, changedMode, wrapMap, onAfterSync) {
    const changedInput = changedMode ? modeInputs[changedMode] : null;
    if (changedInput && changedInput.checked) {
      if (changedMode === 'exact') {
        if (modeInputs.prefix) modeInputs.prefix.checked = false;
        if (modeInputs.suffix) modeInputs.suffix.checked = false;
      }
      if (changedMode === 'prefix') {
        if (modeInputs.exact) modeInputs.exact.checked = false;
        if (modeInputs.suffix) modeInputs.suffix.checked = false;
      }
      if (changedMode === 'suffix') {
        if (modeInputs.exact) modeInputs.exact.checked = false;
        if (modeInputs.prefix) modeInputs.prefix.checked = false;
      }
    }
    const modes = normalizeBlacklistMatchModes([
      modeInputs.exact && modeInputs.exact.checked ? 'exact' : '',
      modeInputs.prefix && modeInputs.prefix.checked ? 'prefix' : '',
      modeInputs.suffix && modeInputs.suffix.checked ? 'suffix' : ''
    ], null);
    if (modeInputs.exact) {
      modeInputs.exact.checked = modes.includes('exact');
      modeInputs.exact.disabled = false;
    }
    if (modeInputs.prefix) {
      modeInputs.prefix.checked = modes.includes('prefix');
      modeInputs.prefix.disabled = false;
    }
    if (modeInputs.suffix) {
      modeInputs.suffix.checked = modes.includes('suffix');
      modeInputs.suffix.disabled = false;
    }
    Object.keys(wrapMap || {}).forEach((key) => {
      const wrap = wrapMap[key];
      if (wrap) {
        wrap.setAttribute('data-disabled', 'false');
      }
    });
    if (typeof onAfterSync === 'function') {
      onAfterSync(modes);
    }
    return modes;
  }

  function createBlacklistModeOption(textKey, fallback, tooltipKey, tooltipFallback) {
    const wrap = document.createElement('label');
    wrap.className = CHECKBOX_CLASS_NAME;
    const input = document.createElement('input');
    input.type = 'checkbox';
    const text = document.createElement('span');
    text.textContent = getMessage(textKey, fallback);
    const hint = document.createElement('span');
    hint.className = '_x_extension_shortcut_hint_2024_unique_ _x_extension_tooltip_host_2024_unique_';
    hint.setAttribute('data-tooltip', getMessage(tooltipKey, tooltipFallback));
    hint.innerHTML = getRiSvg('ri-question-line', 'ri-size-14');
    wrap.appendChild(input);
    wrap.appendChild(text);
    wrap.appendChild(hint);
    return { wrap, input };
  }

  function buildBlacklistRuleDraft(inputValue, matchModes) {
    if (!Array.isArray(matchModes) || matchModes.length === 0) {
      return {
        error: getMessage('blacklist_error_match_mode', '请选择至少一种匹配方式')
      };
    }
    const pattern = normalizeBlacklistPattern(inputValue, matchModes, null);
    if (!pattern) {
      return {
        error: matchModes.includes('suffix')
          ? getMessage('blacklist_error_domain', '请输入网站域名')
          : getMessage('blacklist_error_url', '请输入站点域名或完整 URL')
      };
    }
    return {
      item: {
        pattern: pattern,
        matchModes: matchModes
      }
    };
  }

  function upsertBlacklistItems(nextItem, replacedRuleKey) {
    const nextKey = buildBlacklistItemKey(nextItem);
    return [{ pattern: nextItem.pattern, matchModes: nextItem.matchModes }].concat(
      searchBlacklistItems.filter((entry) => {
        const entryKey = buildBlacklistItemKey(entry);
        return entryKey !== replacedRuleKey && entryKey !== nextKey;
      })
    );
  }

  function persistBlacklistItems(nextItems, successMessage) {
    return saveSearchBlacklistItems(nextItems).then((savedItems) => {
      searchBlacklistItems = savedItems;
      renderSearchBlacklistList();
      notifyNewtabSectionsRefresh('recent');
      if (successMessage) {
        showToast(successMessage, false);
      }
      return savedItems;
    });
  }

  function normalizeBookmarkColumns(value) {
    const parsed = Number.parseInt(value, 10);
    if (parsed === 4 || parsed === 6 || parsed === 8) {
      return parsed;
    }
    return 4;
  }

  function normalizeNewtabWidthMode(value) {
    return typeof SETTINGS.normalizeNewtabWidthMode === 'function'
      ? SETTINGS.normalizeNewtabWidthMode(value)
      : (value === 'standard' ? 'standard' : 'wide');
  }

  function normalizeOverlaySizeMode(value) {
    return typeof SETTINGS.normalizeOverlaySizeMode === 'function'
      ? SETTINGS.normalizeOverlaySizeMode(value)
      : ((value === 'compact' || value === 'large') ? value : 'standard');
  }

  function updateBookmarkColumnsSelectVisibility(countValue) {
    if (!bookmarkColumnsSelectWrap) {
      return;
    }
    const parsed = Number.parseInt(countValue, 10);
    const shouldHide = Number.isFinite(parsed) ? parsed <= 0 : false;
    bookmarkColumnsSelectWrap.style.setProperty('display', shouldHide ? 'none' : 'inline-flex');
    bookmarkColumnsSelectWrap.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
  }

  function normalizeOverlayTabQuickSwitch(value) {
    if (FORCE_OVERLAY_TAB_QUICK_SWITCH_ENABLED) {
      return true;
    }
    return typeof SETTINGS.normalizeOverlayTabPriorityMode === 'function'
      ? SETTINGS.normalizeOverlayTabPriorityMode(value)
      : value !== 'newtabFirst' && value !== false;
  }

  function normalizeNewtabWordmarkVisible(value) {
    return typeof SETTINGS.normalizeNewtabWordmarkVisible === 'function'
      ? SETTINGS.normalizeNewtabWordmarkVisible(value)
      : value !== false;
  }

  function normalizeNewtabShortcutsVisible(value) {
    return typeof SETTINGS.normalizeNewtabShortcutsVisible === 'function'
      ? SETTINGS.normalizeNewtabShortcutsVisible(value)
      : value !== false;
  }

  function normalizeBookmarkFolderIconsVisible(value) {
    return typeof SETTINGS.normalizeBookmarkFolderIconsVisible === 'function'
      ? SETTINGS.normalizeBookmarkFolderIconsVisible(value)
      : value !== false;
  }

  function normalizeUpdateNoticeEnabled(value) {
    return typeof SETTINGS.normalizeUpdateNoticeEnabled === 'function'
      ? SETTINGS.normalizeUpdateNoticeEnabled(value)
      : value !== false;
  }

  function normalizeFaviconEnhancedFetchEnabled(value) {
    return typeof SETTINGS.normalizeFaviconEnhancedFetchEnabled === 'function'
      ? SETTINGS.normalizeFaviconEnhancedFetchEnabled(value)
      : value !== false;
  }

  function normalizeAutoPipEnabled(value) {
    return value !== false;
  }

  function normalizeTabSwitcherEnabled(value) {
    return typeof SETTINGS.normalizeTabSwitcherEnabled === 'function'
      ? SETTINGS.normalizeTabSwitcherEnabled(value)
      : value !== false;
  }

  function normalizeDocumentPipEnabled(value) {
    return value === true;
  }

  function normalizePinnedTabRecoveryEnabled(value) {
    return value === true;
  }

  function normalizeSearchResultPriority(value) {
    return typeof SETTINGS.normalizeSearchResultPriority === 'function'
      ? SETTINGS.normalizeSearchResultPriority(value)
      : (value === 'search' ? 'search' : 'autocomplete');
  }

  function normalizeSearchResultSourceTypes(value) {
    if (typeof SETTINGS.normalizeSearchResultSourceTypes === 'function') {
      return SETTINGS.normalizeSearchResultSourceTypes(value);
    }
    const rawItems = Array.isArray(value) ? value : [];
    const selected = [];
    rawItems.forEach((item) => {
      const raw = String(item || '').trim();
      const type = raw === 'topSite' || raw === 'bookmark' || raw === 'history' ? raw : '';
      if (type && !selected.includes(type)) {
        selected.push(type);
      }
    });
    return selected.length > 0 ? selected : ['topSite', 'bookmark', 'history'];
  }

  function normalizeOverlayOpenTabsDefaultVisible(value) {
    return typeof SETTINGS.normalizeOverlayOpenTabsDefaultVisible === 'function'
      ? SETTINGS.normalizeOverlayOpenTabsDefaultVisible(value)
      : value !== false;
  }

  function collectCheckedSearchResultSourceTypes() {
    if (searchResultSourceTypeGroup && typeof searchResultSourceTypeGroup.getValue === 'function') {
      return searchResultSourceTypeGroup.getValue();
    }
    const checked = [];
    searchResultSourceTypeInputs.forEach((input) => {
      if (!input || !input.checked) {
        return;
      }
      checked.push(input.getAttribute('data-search-result-source-type'));
    });
    return checked.filter(Boolean);
  }

  function setSearchResultSourceTypeState(value) {
    const normalized = normalizeSearchResultSourceTypes(value);
    if (searchResultSourceTypeGroup && typeof searchResultSourceTypeGroup.setValue === 'function') {
      searchResultSourceTypeGroup.setValue(normalized);
      return;
    }
    const selected = new Set(normalized);
    searchResultSourceTypeInputs.forEach((input) => {
      const type = input.getAttribute('data-search-result-source-type');
      input.checked = selected.has(type);
    });
  }

  function persistSearchResultSourceTypes(value) {
    const normalized = normalizeSearchResultSourceTypes(value);
    setSearchResultSourceTypeState(normalized);
    if (!storageArea) {
      return;
    }
    storageArea.set({ [SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY]: normalized });
  }

  if (searchResultSourceTypeInputs.length > 0 && typeof CHECKBOX.createRequiredGroup === 'function') {
    searchResultSourceTypeGroup = CHECKBOX.createRequiredGroup(searchResultSourceTypeInputs, {
      getValue: (input) => input && input.getAttribute('data-search-result-source-type'),
      normalizeValue: normalizeSearchResultSourceTypes,
      onChange: persistSearchResultSourceTypes
    });
  }

  function measureTabsIndicator(container, indicator, activeButton, inset, containerInset) {
    if (!container || !indicator) {
      return null;
    }
    if (!activeButton) {
      return {
        indicator,
        width: '0px',
        transform: null
      };
    }
    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const offset = Math.round(
      buttonRect.left - containerRect.left + (Number(container.scrollLeft) || 0) -
      (Number(containerInset) || 0) - inset
    );
    return {
      indicator,
      width: `${Math.round(buttonRect.width)}px`,
      transform: `translateX(${offset}px)`
    };
  }

  function applyTabsIndicatorMeasurement(measurement) {
    if (!measurement) {
      return;
    }
    measurement.indicator.style.width = measurement.width;
    if (measurement.transform !== null) {
      measurement.indicator.style.transform = measurement.transform;
    }
  }

  function measureInlineTabsIndicator(wrapper, indicator, activeSelector) {
    if (!wrapper || !indicator) {
      return null;
    }
    const activeButton = wrapper.querySelector(activeSelector);
    return measureTabsIndicator(wrapper, indicator, activeButton, 3, 0);
  }

  function updateInlineTabsIndicator(wrapper, indicator, activeSelector) {
    applyTabsIndicatorMeasurement(
      measureInlineTabsIndicator(wrapper, indicator, activeSelector)
    );
  }

  function updateRecentModeTabsIndicator() {
    updateInlineTabsIndicator(
      recentModeTabsWrap,
      recentModeTabsIndicator,
      'button[data-recent-mode][data-active="true"]'
    );
  }

  function updateRestrictedActionTabsIndicator() {
    updateInlineTabsIndicator(
      restrictedActionSelectWrap,
      restrictedActionTabsIndicator,
      'button[data-restricted-action][data-active="true"]'
    );
  }

  function updateSearchResultPriorityTabsIndicator() {
    updateInlineTabsIndicator(
      searchResultPriorityTabsWrap,
      searchResultPriorityTabsIndicator,
      'button[data-search-result-priority][data-active="true"]'
    );
  }

  function updateOverlaySizeTabsIndicator() {
    updateInlineTabsIndicator(
      overlaySizeTabsWrap,
      overlaySizeTabsIndicator,
      'button[data-overlay-size][data-active="true"]'
    );
  }

  function updateNewtabWidthTabsIndicator() {
    updateInlineTabsIndicator(
      newtabWidthTabsWrap,
      newtabWidthTabsIndicator,
      'button[data-newtab-width][data-active="true"]'
    );
  }

  function refreshAllTabsIndicators() {
    const measurements = [
      measureTabIndicator(),
      measureThemeIndicator(),
      measureInlineTabsIndicator(
        newtabWidthTabsWrap,
        newtabWidthTabsIndicator,
        'button[data-newtab-width][data-active="true"]'
      ),
      measureInlineTabsIndicator(
        recentModeTabsWrap,
        recentModeTabsIndicator,
        'button[data-recent-mode][data-active="true"]'
      ),
      measureInlineTabsIndicator(
        overlaySizeTabsWrap,
        overlaySizeTabsIndicator,
        'button[data-overlay-size][data-active="true"]'
      ),
      measureInlineTabsIndicator(
        restrictedActionSelectWrap,
        restrictedActionTabsIndicator,
        'button[data-restricted-action][data-active="true"]'
      ),
      measureInlineTabsIndicator(
        searchResultPriorityTabsWrap,
        searchResultPriorityTabsIndicator,
        'button[data-search-result-priority][data-active="true"]'
      )
    ];
    measurements.forEach(applyTabsIndicatorMeasurement);
  }

  let tabsIndicatorsRefreshFrame = 0;
  let tabsIndicatorsRefreshPasses = 0;
  function scheduleTabsIndicatorsRefresh(framePasses) {
    const passes = Number.isFinite(framePasses) && framePasses > 0 ? Math.floor(framePasses) : 2;
    tabsIndicatorsRefreshPasses = Math.max(tabsIndicatorsRefreshPasses, passes);
    if (tabsIndicatorsRefreshFrame) {
      return;
    }
    const run = () => {
      if (tabsIndicatorsRefreshPasses <= 0) {
        tabsIndicatorsRefreshFrame = 0;
        refreshAllTabsIndicators();
        return;
      }
      tabsIndicatorsRefreshPasses -= 1;
      tabsIndicatorsRefreshFrame = requestAnimationFrame(run);
    };
    tabsIndicatorsRefreshFrame = requestAnimationFrame(run);
  }

  function setRecentModeTabState(mode) {
    const nextMode = mode === 'most' ? 'most' : 'latest';
    recentModeTabButtons.forEach((button) => {
      const buttonMode = button.getAttribute('data-recent-mode') === 'most' ? 'most' : 'latest';
      const active = buttonMode === nextMode;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    requestAnimationFrame(updateRecentModeTabsIndicator);
  }

  function setOverlaySizeTabState(mode) {
    const nextMode = normalizeOverlaySizeMode(mode);
    overlaySizeTabButtons.forEach((button) => {
      const buttonMode = normalizeOverlaySizeMode(button.getAttribute('data-overlay-size'));
      const active = buttonMode === nextMode;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    requestAnimationFrame(updateOverlaySizeTabsIndicator);
  }

  function setNewtabWidthTabState(mode) {
    const nextMode = normalizeNewtabWidthMode(mode);
    newtabWidthTabButtons.forEach((button) => {
      const buttonMode = normalizeNewtabWidthMode(button.getAttribute('data-newtab-width'));
      const active = buttonMode === nextMode;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    requestAnimationFrame(updateNewtabWidthTabsIndicator);
  }

  function updateRecentModeTabsVisibility(countValue) {
    if (!recentModeTabsWrap) {
      return;
    }
    const parsed = Number.parseInt(countValue, 10);
    const shouldHide = Number.isFinite(parsed) ? parsed <= 0 : false;
    recentModeTabsWrap.style.setProperty('display', shouldHide ? 'none' : 'flex');
    recentModeTabsWrap.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    if (!shouldHide) {
      requestAnimationFrame(() => {
        requestAnimationFrame(updateRecentModeTabsIndicator);
      });
    }
  }

  function setRestrictedActionTabState(action) {
    const nextAction = action === 'none' ? 'none' : 'default';
    restrictedActionTabButtons.forEach((button) => {
      const buttonAction = button.getAttribute('data-restricted-action') === 'none' ? 'none' : 'default';
      const active = buttonAction === nextAction;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    requestAnimationFrame(updateRestrictedActionTabsIndicator);
  }

  function createRestrictedActionStorageUpdate(action) {
    return {
      [RESTRICTED_ACTION_STORAGE_KEY]: action === 'none' ? 'none' : 'default',
      [RESTRICTED_ACTION_AUTO_BROWSER_SETTING_DONE_STORAGE_KEY]: true
    };
  }

  function setSearchResultPriorityTabState(priority) {
    const nextPriority = normalizeSearchResultPriority(priority);
    searchResultPriorityTabButtons.forEach((button) => {
      const buttonPriority = normalizeSearchResultPriority(button.getAttribute('data-search-result-priority'));
      const active = buttonPriority === nextPriority;
      button.setAttribute('data-active', active ? 'true' : 'false');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    requestAnimationFrame(updateSearchResultPriorityTabsIndicator);
  }

  function storageGet(area, keys) {
    return new Promise((resolve) => {
      if (!area) {
        resolve({});
        return;
      }
      area.get(keys, (result) => resolve(result || {}));
    });
  }

  function storageSet(area, payload) {
    return new Promise((resolve, reject) => {
      if (!area) {
        resolve();
        return;
      }
      area.set(payload, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'storage set failed'));
          return;
        }
        resolve();
      });
    });
  }

  function storageRemove(area, key) {
    return new Promise((resolve, reject) => {
      if (!area) {
        resolve();
        return;
      }
      area.remove([key], () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'storage remove failed'));
          return;
        }
        resolve();
      });
    });
  }

  function notifyNewtabSectionsRefresh(section) {
    if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      return;
    }
    try {
      chrome.runtime.sendMessage(
        { action: 'lumno:newtab-refresh-sections', section: section || 'all' },
        () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            return;
          }
        }
      );
    } catch (error) {
      // Ignore runtime messaging errors.
    }
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) {
        return;
      }
      const fallback = node.textContent || '';
      const rawMessage = getMessage(key, fallback);
      const message = formatTemplate(rawMessage, { name: 'Lumno' });
      node.textContent = message;
      if (node.tagName === 'OPTION') {
        node.label = message;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (!key) {
        return;
      }
      const fallback = node.getAttribute('placeholder') || '';
      const message = getMessage(key, fallback);
      node.setAttribute('placeholder', message);
    });
    document.querySelectorAll('[data-i18n-tooltip]').forEach((node) => {
      const key = node.getAttribute('data-i18n-tooltip');
      if (!key) {
        return;
      }
      const fallback = node.getAttribute('data-tooltip') || '';
      const message = getMessage(key, fallback);
      node.setAttribute('data-tooltip', message);
      if (node.getAttribute('title')) {
        node.removeAttribute('title');
      }
      if (node.getAttribute('aria-label')) {
        node.setAttribute('aria-label', message);
      }
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const key = node.getAttribute('data-i18n-aria-label');
      if (!key) {
        return;
      }
      const fallback = node.getAttribute('aria-label') || '';
      const message = getMessage(key, fallback);
      node.setAttribute('aria-label', message);
    });
    if (fallbackShortcutInput && fallbackShortcutTokens) {
      fallbackShortcutTokens.setAttribute('data-placeholder', fallbackShortcutInput.getAttribute('placeholder') || '');
      renderFallbackShortcutTokens(currentShortcutLabel || '');
    }
  }

  function showTooltipFor(target) {
    if (!tooltipController || !target) {
      return;
    }
    const text = target.getAttribute('data-tooltip');
    if (!text) {
      return;
    }
    tooltipController.show(target, text, {
      maxWidth: 'min(360px, calc(100vw - 24px))',
      spacing: 8
    });
  }

  function hideTooltip() {
    if (!tooltipController) {
      return;
    }
    tooltipController.hide();
  }

  function initTooltips() {
    if (!tooltipController) {
      return;
    }
    const nodes = Array.from(document.querySelectorAll('[data-tooltip]'));
    nodes.forEach((node) => {
      tooltipController.bind(node, () => node.getAttribute('data-tooltip'), {
        maxWidth: 'min(360px, calc(100vw - 24px))',
        spacing: 8
      });
    });
  }

  function refreshCustomSelects() {
    if (customSelectController) {
      customSelectController.refresh(customSelectWraps);
      return;
    }
    syncFallbackShortcutWrapWidth();
  }

  function syncFallbackShortcutWrapWidth() {
    if (!fallbackShortcutWrap || !restrictedActionSelectWrap) {
      return;
    }
    const width = Math.round(restrictedActionSelectWrap.getBoundingClientRect().width);
    if (!Number.isFinite(width) || width <= 0) {
      return;
    }
    fallbackShortcutBaseWidth = width;
    updateFallbackShortcutWrapWidthForContent();
  }

  function updateFallbackShortcutWrapWidthForContent() {
    if (!fallbackShortcutWrap) {
      return;
    }
    const fallbackBase = Math.max(120, Number.isFinite(fallbackShortcutBaseWidth) ? fallbackShortcutBaseWidth : 0);
    let nextWidth = fallbackBase || Math.round(fallbackShortcutWrap.getBoundingClientRect().width) || 180;
    if (fallbackShortcutTokens) {
      const tokenEls = Array.from(fallbackShortcutTokens.children || []);
      if (tokenEls.length > 0) {
        const style = window.getComputedStyle(fallbackShortcutTokens);
        const gap = Number.parseFloat(style.columnGap || style.gap) || 0;
        const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(style.paddingRight) || 0;
        const contentWidth = tokenEls.reduce((sum, el) => sum + Math.ceil(el.getBoundingClientRect().width), 0)
          + Math.max(0, tokenEls.length - 1) * gap;
        const requiredWidth = Math.ceil(contentWidth + paddingLeft + paddingRight + 2);
        nextWidth = Math.max(nextWidth, requiredWidth);
      }
    }
    fallbackShortcutWrap.style.width = `${nextWidth}px`;
    if (!isFallbackWidthReady) {
      requestAnimationFrame(() => {
        isFallbackWidthReady = true;
        if (fallbackShortcutWrap) {
          fallbackShortcutWrap.setAttribute('data-width-ready', 'true');
        }
      });
    }
  }

  function updateBuiltinResetTooltip() {
    if (!builtinResetButton) {
      return;
    }
    const text = getMessage('shortcuts_reset_builtin', '重置为初始列表');
    builtinResetButton.removeAttribute('title');
    builtinResetButton.setAttribute('aria-label', text);
    builtinResetButton.setAttribute('data-tooltip', text);
  }

  function updateCustomClearTooltip() {
    if (!customClearButton) {
      return;
    }
    const text = getMessage('shortcuts_clear_custom', '清空自定义');
    customClearButton.removeAttribute('title');
    customClearButton.setAttribute('aria-label', text);
    customClearButton.setAttribute('data-tooltip', text);
  }

  function updateBlacklistClearTooltip() {
    if (!blacklistClearButton) {
      return;
    }
    const text = getMessage('blacklist_clear', '清空黑名单');
    blacklistClearButton.removeAttribute('title');
    blacklistClearButton.setAttribute('aria-label', text);
    blacklistClearButton.setAttribute('data-tooltip', text);
  }

  function showToast(message, isError) {
    if (!toastElement) {
      return;
    }
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    toastElement.textContent = message;
    if (isError) {
      toastElement.style.setProperty('background', 'rgba(153, 27, 27, 0.92)');
    } else {
      toastElement.style.removeProperty('background');
    }
    toastElement.setAttribute('data-show', 'true');
    toastTimer = setTimeout(() => {
      toastElement.setAttribute('data-show', 'false');
    }, 2200);
  }

  function setSyncButtonEnabled(button, enabled) {
    if (!button) {
      return;
    }
    button.setAttribute('data-disabled', enabled ? 'false' : 'true');
  }


  function formatSyncTime(timestamp) {
    if (!timestamp) {
      return '';
    }
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return '';
    }
  }

  function updateSyncStatusText(statusKey, fallback, params) {
    if (!syncStatus) {
      return;
    }
    let statusStyle = '';
    let tooltipKey = 'sync_status_hint';
    if (statusKey === 'sync_status_ready' || statusKey === 'sync_status_done') {
      statusStyle = 'success';
      tooltipKey = 'sync_status_hint';
    } else if (statusKey === 'sync_status_failed' || statusKey === 'sync_status_failed_reason' || statusKey === 'sync_status_unavailable') {
      statusStyle = 'danger';
      tooltipKey = 'sync_status_unavailable_hint';
    }
    if (statusStyle) {
      syncStatus.setAttribute('data-status', statusStyle);
    } else {
      syncStatus.removeAttribute('data-status');
    }
    if (syncStatus.hasAttribute('data-i18n-tooltip')) {
      syncStatus.setAttribute('data-i18n-tooltip', tooltipKey);
    }
    syncStatus.setAttribute('data-tooltip', getMessage(tooltipKey, syncStatus.getAttribute('data-tooltip') || ''));
    const template = getMessage(statusKey, fallback);
    const target = syncStatusText || syncStatus;
    target.textContent = params ? formatTemplate(template, params) : template;
  }

  function updateSyncNowTooltip(timeText) {
    if (!syncNowButton) {
      return;
    }
    if (!timeText) {
      syncNowButton.setAttribute('data-tooltip', getMessage('sync_tooltip_default', '手动同步'));
      return;
    }
    const template = getMessage('sync_tooltip_last_manual', '最近导入/手动同步 {time}');
    syncNowButton.setAttribute('data-tooltip', formatTemplate(template, { time: timeText }));
    if (syncNowButton.matches(':hover') || syncNowButton.matches(':focus')) {
      showTooltipFor(syncNowButton);
    }
  }

  function refreshSyncStatus() {
    if (!syncStatus) {
      return;
    }
    if (!storageArea) {
      updateSyncStatusText('sync_status_unavailable', '同步不可用');
      setSyncButtonEnabled(syncNowButton, false);
      setSyncButtonEnabled(syncExportButton, false);
      setSyncButtonEnabled(syncImportButton, false);
      return;
    }
    if (storageAreaName !== 'sync') {
      updateSyncStatusText('sync_status_unavailable', '同步不可用');
      setSyncButtonEnabled(syncNowButton, false);
      setSyncButtonEnabled(syncExportButton, true);
      setSyncButtonEnabled(syncImportButton, true);
      return;
    }
    setSyncButtonEnabled(syncNowButton, true);
    setSyncButtonEnabled(syncExportButton, true);
    setSyncButtonEnabled(syncImportButton, true);
    updateSyncStatusText('sync_status_ready', '同步已开启');
    storageArea.get([SYNC_META_KEY], (result) => {
      const meta = result ? result[SYNC_META_KEY] : null;
      const lastSyncAt = meta && meta.lastSyncAt ? meta.lastSyncAt : '';
      updateSyncNowTooltip(lastSyncAt ? formatSyncTime(lastSyncAt) : '');
    });
  }

  function buildSyncPayload(result) {
    const data = {};
    SYNC_KEYS.forEach((key) => {
      if (typeof result[key] !== 'undefined') {
        data[key] = result[key];
      }
    });
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /*
  function showConfirm(message, trigger) {
    if (!confirmMask || !confirmMessage || !confirmOk || !confirmCancel || !confirmDialog) {
      return Promise.resolve(false);
    }
    if (confirmClosingTimer) {
      clearTimeout(confirmClosingTimer);
      confirmClosingTimer = null;
    }
    confirmMessage.textContent = message;
    confirmMask.setAttribute('data-show', 'true');
    if (confirmDialog) {
      confirmDialog.style.removeProperty('transform');
      confirmDialog.style.removeProperty('opacity');
    }
    if (!bodyFixedSnapshot) {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      bodyFixedSnapshot = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width
      };
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.dataset._xScrollY = String(scrollY);
    }
    const rect = trigger && trigger.getBoundingClientRect ? trigger.getBoundingClientRect() : null;
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const offsetX = centerX - window.innerWidth / 2;
    const offsetY = centerY - window.innerHeight / 2;
    confirmOffset = { x: offsetX, y: offsetY };
    confirmDialog.style.setProperty('transform', `translate(${offsetX}px, ${offsetY}px) scale(0.6)`);
    confirmDialog.style.setProperty('opacity', '0');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        confirmDialog.style.setProperty('transform', 'translate(0, 0) scale(1)');
        confirmDialog.style.setProperty('opacity', '1');
      });
    });
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function closeConfirm(result) {
    if (!confirmMask) {
      return;
    }
    if (confirmDialog) {
      confirmDialog.style.setProperty('transform', `translate(${confirmOffset.x}px, ${confirmOffset.y}px) scale(0.6)`);
      confirmDialog.style.setProperty('opacity', '0');
    }
    confirmClosingTimer = setTimeout(() => {
      confirmMask.setAttribute('data-show', 'false');
      if (confirmDialog) {
        confirmDialog.style.removeProperty('transform');
        confirmDialog.style.removeProperty('opacity');
      }
      if (bodyFixedSnapshot) {
        const restoreY = Number.parseFloat(document.body.dataset._xScrollY || '0') || 0;
        document.body.style.position = bodyFixedSnapshot.position;
        document.body.style.top = bodyFixedSnapshot.top;
        document.body.style.left = bodyFixedSnapshot.left;
        document.body.style.right = bodyFixedSnapshot.right;
        document.body.style.width = bodyFixedSnapshot.width;
        bodyFixedSnapshot = null;
        delete document.body.dataset._xScrollY;
        window.scrollTo(0, restoreY);
      }
      confirmClosingTimer = null;
    }, 340);
    if (confirmResolver) {
      confirmResolver(result);
      confirmResolver = null;
    }
  }
  */

  function closeActivePopconfirm() {
    if (activePopconfirm) {
      activePopconfirm.setAttribute('data-open', 'false');
      activePopconfirm = null;
    }
  }

  function attachPopconfirm(trigger, messageKey, fallbackMessage, onConfirm) {
    if (!trigger || !trigger.parentNode) {
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = '_x_extension_popconfirm_wrap_2024_unique_';
    const popconfirm = document.createElement('div');
    popconfirm.className = '_x_extension_popconfirm_2024_unique_';
    popconfirm.setAttribute('data-open', 'false');
    const popText = document.createElement('div');
    popText.className = '_x_extension_popconfirm_text_2024_unique_';
    popText.setAttribute('data-i18n', messageKey);
    popText.textContent = getMessage(messageKey, fallbackMessage);
    const popActions = document.createElement('div');
    popActions.className = '_x_extension_popconfirm_actions_2024_unique_';
    const popCancel = document.createElement('button');
    popCancel.className = SECONDARY_BUTTON_CLASS_NAME;
    popCancel.setAttribute('data-i18n', 'confirm_cancel');
    popCancel.textContent = getMessage('confirm_cancel', '取消');
    const popOk = document.createElement('button');
    popOk.className = '_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_';
    popOk.setAttribute('data-i18n', 'confirm_ok');
    popOk.textContent = getMessage('confirm_ok', '确认');
    popActions.appendChild(popCancel);
    popActions.appendChild(popOk);
    popconfirm.appendChild(popText);
    popconfirm.appendChild(popActions);
    const parent = trigger.parentNode;
    parent.insertBefore(wrap, trigger);
    wrap.appendChild(trigger);
    wrap.appendChild(popconfirm);

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (activePopconfirm && activePopconfirm !== popconfirm) {
        closeActivePopconfirm();
      }
      const isOpen = popconfirm.getAttribute('data-open') === 'true';
      if (isOpen) {
        popconfirm.setAttribute('data-open', 'false');
        activePopconfirm = null;
      } else {
        popconfirm.setAttribute('data-open', 'true');
        activePopconfirm = popconfirm;
      }
    });

    popCancel.addEventListener('click', (event) => {
      event.stopPropagation();
      popconfirm.setAttribute('data-open', 'false');
      if (activePopconfirm === popconfirm) {
        activePopconfirm = null;
      }
    });

    popOk.addEventListener('click', (event) => {
      event.stopPropagation();
      popconfirm.setAttribute('data-open', 'false');
      if (activePopconfirm === popconfirm) {
        activePopconfirm = null;
      }
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });
  }

  function removeSiteSearchItem(key, isBuiltin) {
    if (isBuiltin) {
      disabledSiteSearchKeys.add(key.toLowerCase());
      saveDisabledSiteSearchKeys(disabledSiteSearchKeys).then(() => {
        refreshSiteSearchProviders();
        if (editingSiteSearchKey === key) {
          resetSiteSearchForm();
        }
        showToast(getMessage('toast_removed', '已移除'), false);
      }).catch(() => {
        showToast(getMessage('toast_error', '操作失败，请重试'), true);
      });
      return;
    }
    customSiteSearchProviders = customSiteSearchProviders.filter((item) => String(item.key || '') !== key);
    saveCustomSiteSearchProviders(customSiteSearchProviders).then(() => {
      refreshSiteSearchProviders();
      if (editingSiteSearchKey === key) {
        resetSiteSearchForm();
      }
      showToast(getMessage('toast_removed', '已移除'), false);
    }).catch(() => {
      showToast(getMessage('toast_error', '操作失败，请重试'), true);
    });
  }

  function normalizeLocale(locale) {
    return typeof SETTINGS.normalizeLocale === 'function'
      ? SETTINGS.normalizeLocale(locale)
      : 'en';
  }

  function localeToHtmlLang(locale) {
    return typeof SETTINGS.localeToHtmlLang === 'function'
      ? SETTINGS.localeToHtmlLang(locale)
      : normalizeLocale(locale).replace('_', '-');
  }

  function applyDocumentLanguage(locale) {
    if (!document.documentElement) {
      return;
    }
    document.documentElement.lang = localeToHtmlLang(locale);
  }

  function getSystemLocale() {
    if (chrome && chrome.i18n && chrome.i18n.getUILanguage) {
      return normalizeLocale(chrome.i18n.getUILanguage());
    }
    return normalizeLocale(navigator.language || 'en');
  }

  function normalizeLanguageMode(mode) {
    const raw = String(mode || '').trim();
    if (!raw) {
      return 'system';
    }
    const lower = raw.toLowerCase();
    if (lower === 'system') {
      return 'system';
    }
    if (lower === 'en' || lower.startsWith('en-') || lower.startsWith('en_')) {
      return 'en';
    }
    if (lower === 'ja' || lower.startsWith('ja-') || lower.startsWith('ja_')) {
      return 'ja';
    }
    if (lower === 'zh-hk' || lower === 'zh_hk') {
      return 'zh-TW';
    }
    if (lower === 'zh-tw' || lower === 'zh_tw' || lower === 'zh-mo' || lower === 'zh_mo' || lower.includes('hant')) {
      return 'zh-TW';
    }
    if (lower === 'zh-cn' || lower === 'zh_cn' || lower === 'zh-hans' || lower === 'zh_hans' || lower.startsWith('zh')) {
      return 'zh-CN';
    }
    return 'system';
  }

  function loadLocaleMessages(locale) {
    const normalized = normalizeLocale(locale);
    const localePath = chrome && chrome.runtime && typeof chrome.runtime.getURL === 'function'
      ? chrome.runtime.getURL(`_locales/${normalized}/messages.json`)
      : `../../_locales/${normalized}/messages.json`;
    const fetchFromBackground = () => new Promise((resolve) => {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        resolve({});
        return;
      }
      chrome.runtime.sendMessage({ action: 'getLocaleMessages', locale: normalized }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          resolve({});
          return;
        }
        resolve(response && response.messages ? response.messages : {});
      });
    });
    return fetch(localePath)
      .then((response) => {
        if (!response || !response.ok) {
          throw new Error('locale fetch failed');
        }
        return response.json();
      })
      .catch(() => fetchFromBackground());
  }

  function applyLanguageMode(mode, options) {
    const requestId = ++languageApplyRequestId;
    const normalizedMode = normalizeLanguageMode(mode);
    currentLanguageMode = normalizedMode;
    const targetLocale = normalizedMode === 'system' ? getSystemLocale() : normalizeLocale(normalizedMode);
    applyDocumentLanguage(targetLocale);
    const shouldPersist = Boolean(options && options.persist);
    if (shouldPersist) {
      const payload = {
        [LANGUAGE_STORAGE_KEY]: normalizedMode
      };
      const localArea = chrome && chrome.storage ? chrome.storage.local : null;
      if (localArea) {
        localArea.set(payload);
      }
      if (storageArea) {
        storageArea.set(payload);
      }
    }
    loadLocaleMessages(targetLocale).then((messages) => {
      if (requestId !== languageApplyRequestId) {
        return;
      }
      currentMessages = messages || {};
      if (languageSelect) {
        languageSelect.value = normalizedMode;
        if (languageSelect.value !== normalizedMode) {
          languageSelect.value = 'system';
        }
      }
      applyI18n();
      refreshCustomSelects();
      scheduleTabsIndicatorsRefresh(2);
      setEditingState(editingSiteSearchKey);
      updateBuiltinResetTooltip();
      updateCustomClearTooltip();
      updateBlacklistClearTooltip();
      refreshSyncStatus();
      refreshShortcutsStatus();
      renderShortcutReferenceList();
      if (confirmCancel) confirmCancel.textContent = getMessage('confirm_cancel', '取消');
      if (confirmOk) confirmOk.textContent = getMessage('confirm_ok', '确认');
      renderSiteSearchList();
      renderSearchBlacklistList();
      updateBlacklistInputPresentation();
      setBlacklistFormExpanded(blacklistFormExpanded);
      if (shouldPersist) {
        if (!storageArea) {
          return;
        }
        const syncArea = chrome && chrome.storage ? chrome.storage.sync : null;
        if (storageArea !== syncArea) {
          storageArea.set({
            [LANGUAGE_MESSAGES_STORAGE_KEY]: {
              locale: targetLocale,
              messages: currentMessages
            }
          });
        }
      }
    });
  }

  function refreshShortcutsStatus() {
    if (!shortcutsStatus) return;
    shortcutsStatus.textContent = currentShortcutLabel || getMessage('settings_shortcuts_unset', '未设置');
  }

  function getDefaultFallbackShortcut() {
    return isMacPlatform ? 'Command+Shift+K' : 'Ctrl+Shift+K';
  }

  function isReservedBrowserShortcut(shortcut) {
    return false;
  }

  function normalizeShortcutKeyToken(rawKey) {
    const value = String(rawKey || '').trim();
    if (!value) {
      return '';
    }
    const lower = value.toLowerCase();
    const aliasMap = {
      tab: 'Tab',
      enter: 'Enter',
      return: 'Enter',
      esc: 'Escape',
      escape: 'Escape',
      space: 'Space',
      spacebar: 'Space',
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      comma: 'Comma',
      period: 'Period',
      slash: 'Slash',
      semicolon: 'Semicolon',
      quote: 'Quote',
      minus: 'Minus',
      plus: 'Plus',
      backslash: 'Backslash',
      backquote: 'Backquote',
      bracketleft: 'BracketLeft',
      bracketright: 'BracketRight'
    };
    if (aliasMap[lower]) {
      return aliasMap[lower];
    }
    if (/^f\d{1,2}$/.test(lower)) {
      return lower.toUpperCase();
    }
    if (value.length === 1) {
      const charMap = {
        ' ': 'Space',
        ',': 'Comma',
        '<': 'Comma',
        '.': 'Period',
        '>': 'Period',
        '/': 'Slash',
        '?': 'Slash',
        ';': 'Semicolon',
        ':': 'Semicolon',
        '\'': 'Quote',
        '"': 'Quote',
        '-': 'Minus',
        '_': 'Minus',
        '+': 'Plus',
        '\\': 'Backslash',
        '|': 'Backslash',
        '`': 'Backquote',
        '[': 'BracketLeft',
        '{': 'BracketLeft',
        ']': 'BracketRight',
        '}': 'BracketRight'
      };
      if (charMap[value]) {
        return charMap[value];
      }
      if (/^[a-z0-9]$/i.test(value)) {
        return value.toUpperCase();
      }
    }
    return '';
  }

  function getShortcutKeyTokenFromCode(rawCode) {
    const code = String(rawCode || '').trim();
    if (!code) {
      return '';
    }
    if (/^Key[A-Z]$/.test(code)) {
      return code.slice(3);
    }
    if (/^Digit[0-9]$/.test(code)) {
      return code.slice(5);
    }
    const codeMap = {
      Backquote: 'Backquote',
      Minus: 'Minus',
      Equal: 'Plus',
      BracketLeft: 'BracketLeft',
      BracketRight: 'BracketRight',
      Backslash: 'Backslash',
      Semicolon: 'Semicolon',
      Quote: 'Quote',
      Comma: 'Comma',
      Period: 'Period',
      Slash: 'Slash',
      Space: 'Space',
      Tab: 'Tab',
      Enter: 'Enter',
      Escape: 'Escape',
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight'
    };
    if (codeMap[code]) {
      return codeMap[code];
    }
    if (/^F\d{1,2}$/.test(code)) {
      return code;
    }
    return '';
  }

  function getShortcutKeyTokenFromEvent(event) {
    if (!event) {
      return '';
    }
    return getShortcutKeyTokenFromCode(event.code) || normalizeShortcutKeyToken(event.key);
  }

  function normalizeFallbackShortcut(value) {
    const text = String(value || '').trim();
    if (!text) {
      return '';
    }
    const parts = text
      .split('+')
      .map((token) => String(token || '').trim())
      .filter(Boolean);
    if (parts.length < 2) {
      return '';
    }
    const keyToken = normalizeShortcutKeyToken(parts.pop());
    if (!keyToken) {
      return '';
    }
    const modifierState = {
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    };
    for (const token of parts) {
      const lower = token.toLowerCase();
      if (lower === 'ctrl' || lower === 'control' || lower === 'macctrl') {
        modifierState.ctrl = true;
      } else if (lower === 'alt' || lower === 'option') {
        modifierState.alt = true;
      } else if (lower === 'shift') {
        modifierState.shift = true;
      } else if (lower === 'command' || lower === 'cmd' || lower === 'meta' || lower === 'super') {
        modifierState.meta = true;
      } else {
        return '';
      }
    }
    const hasModifier = modifierState.ctrl || modifierState.alt || modifierState.shift || modifierState.meta;
    if (!hasModifier) {
      return '';
    }
    const normalized = [];
    if (modifierState.ctrl) normalized.push('Ctrl');
    if (modifierState.alt) normalized.push('Alt');
    if (modifierState.shift) normalized.push('Shift');
    if (modifierState.meta) normalized.push('Command');
    normalized.push(keyToken);
    return normalized.join('+');
  }

  function buildShortcutFromEvent(event) {
    if (!event) {
      return '';
    }
    const key = String(event.key || '');
    if (!key || key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta' || key === 'AltGraph') {
      return '';
    }
    const keyToken = getShortcutKeyTokenFromEvent(event);
    if (!keyToken) {
      return '';
    }
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Command');
    if (modifiers.length === 0) {
      return '';
    }
    modifiers.push(keyToken);
    return modifiers.join('+');
  }

  function formatShortcutForDisplay(shortcut) {
    const normalized = normalizeFallbackShortcut(shortcut);
    if (!normalized) {
      return '';
    }
    if (!isMacPlatform) {
      return normalized;
    }
    const parts = normalized.split('+').filter(Boolean);
    if (parts.length === 0) {
      return normalized;
    }
    const keyToken = parts.pop();
    const modifierSymbols = [];
    parts.forEach((token) => {
      if (token === 'Ctrl') modifierSymbols.push('⌃');
      else if (token === 'Alt') modifierSymbols.push('⌥');
      else if (token === 'Shift') modifierSymbols.push('⇧');
      else if (token === 'Command') modifierSymbols.push('⌘');
    });
    const keyMap = {
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Enter: '↩',
      Escape: '⎋',
      Tab: '⇥',
      Space: 'Space',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Semicolon: ';',
      Quote: '\'',
      Minus: '-',
      Plus: '+',
      Backslash: '\\',
      Backquote: '`',
      BracketLeft: '[',
      BracketRight: ']'
    };
    const keyLabel = keyMap[keyToken] || keyToken;
    return `${modifierSymbols.join('')}${keyLabel}`;
  }

  function getShortcutDisplayTokens(shortcut) {
    const normalized = normalizeFallbackShortcut(shortcut);
    if (!normalized) {
      return [];
    }
    const shouldUseMacSymbols = isMacPlatform && !FORCE_TEXT_KEYCAPS_ON_MAC;
    const parts = normalized.split('+').filter(Boolean);
    if (parts.length === 0) {
      return [];
    }
    const keyToken = parts.pop();
    const tokens = [];
    parts.forEach((token) => {
      if (!shouldUseMacSymbols) {
        tokens.push(token === 'Command' ? 'Cmd' : token);
        return;
      }
      if (token === 'Ctrl') tokens.push('⌃');
      else if (token === 'Alt') tokens.push('⌥');
      else if (token === 'Shift') tokens.push('⇧');
      else if (token === 'Command') tokens.push('⌘');
    });
    const keyMapMac = {
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Enter: '↩',
      Escape: '⎋',
      Tab: '⇥',
      Space: 'Space',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Semicolon: ';',
      Quote: '\'',
      Minus: '-',
      Plus: '+',
      Backslash: '\\',
      Backquote: '`',
      BracketLeft: '[',
      BracketRight: ']'
    };
    const keyMapDefault = {
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Escape: 'Esc',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Semicolon: ';',
      Quote: '\'',
      Minus: '-',
      Plus: '+',
      Backslash: '\\',
      Backquote: '`',
      BracketLeft: '[',
      BracketRight: ']'
    };
    const keyLabel = shouldUseMacSymbols
      ? (keyMapMac[keyToken] || keyToken)
      : (keyMapDefault[keyToken] || keyToken);
    tokens.push(keyLabel);
    return tokens.map((token) => {
      const text = String(token || '');
      return text.length > 1 ? text.toUpperCase() : text;
    });
  }

  function renderFallbackShortcutTokens(shortcut, animate) {
    if (!fallbackShortcutTokens) {
      return;
    }
    const shouldAnimate = Boolean(animate);
    const tokens = getShortcutDisplayTokens(shortcut);
    fallbackShortcutTokens.innerHTML = '';
    const emptyPlaceholder = isCapturingFallbackShortcut
      ? (fallbackShortcutInput ? (fallbackShortcutInput.getAttribute('placeholder') || '') : '')
      : getMessage('settings_shortcuts_empty_state', '无');
    fallbackShortcutTokens.setAttribute('data-placeholder', emptyPlaceholder);
    if (tokens.length === 0) {
      fallbackShortcutTokens.setAttribute('data-empty', 'true');
      updateFallbackShortcutWrapWidthForContent();
      return;
    }
    fallbackShortcutTokens.setAttribute('data-empty', 'false');
    const pendingAnimatedTokens = [];
    tokens.forEach((label, index) => {
      const tokenEl = document.createElement('span');
      tokenEl.className = '_x_extension_shortcuts_hotkey_token_2024_unique_';
      const textLabel = String(label || '');
      if (textLabel.length > 1) {
        const minWidth = Math.max(17, Math.round(textLabel.length * 7.5 + 12));
        tokenEl.style.minWidth = `${minWidth}px`;
      }
      if (shouldAnimate) {
        tokenEl.style.animationDelay = `${index * 36}ms`;
        pendingAnimatedTokens.push(tokenEl);
      }
      tokenEl.textContent = label;
      fallbackShortcutTokens.appendChild(tokenEl);
    });
    if (shouldAnimate && pendingAnimatedTokens.length > 0) {
      requestAnimationFrame(() => {
        pendingAnimatedTokens.forEach((tokenEl) => {
          tokenEl.classList.add('_x_extension_shortcuts_hotkey_token_pop_2024_unique_');
        });
      });
    }
    updateFallbackShortcutWrapWidthForContent();
  }

  function setFallbackShortcutLabel(value, animate) {
    currentShortcutLabel = value || '';
    if (fallbackShortcutInput) {
      fallbackShortcutInput.value = '';
    }
    renderFallbackShortcutTokens(currentShortcutLabel, animate);
    updateFallbackShortcutResetVisibility();
    refreshShortcutsStatus();
  }

  function updateFallbackShortcutResetVisibility() {
    if (!resetShortcutButton) {
      return;
    }
    const normalizedCurrent = normalizeFallbackShortcut(currentShortcutLabel || '');
    const normalizedDefault = normalizeFallbackShortcut(getDefaultFallbackShortcut());
    const canReset = normalizedCurrent !== normalizedDefault;
    resetShortcutButton.setAttribute('data-can-reset', canReset ? 'true' : 'false');
    if (canReset) {
      resetShortcutButton.removeAttribute('disabled');
    } else {
      resetShortcutButton.setAttribute('disabled', 'disabled');
    }
  }

  function stopFallbackShortcutCapture() {
    if (fallbackCaptureStopTimer) {
      clearTimeout(fallbackCaptureStopTimer);
      fallbackCaptureStopTimer = null;
    }
    isCapturingFallbackShortcut = false;
    cancelCaptureOnMouseLeave = false;
    if (fallbackShortcutWrap) {
      fallbackShortcutWrap.removeAttribute('data-capturing');
    }
    if (fallbackShortcutInput && document.activeElement === fallbackShortcutInput) {
      fallbackShortcutInput.blur();
    }
    if (!currentShortcutLabel) {
      renderFallbackShortcutTokens('');
    }
  }

  function stopFallbackShortcutCaptureDeferred(delayMs) {
    if (fallbackCaptureStopTimer) {
      clearTimeout(fallbackCaptureStopTimer);
      fallbackCaptureStopTimer = null;
    }
    fallbackCaptureStopTimer = setTimeout(() => {
      fallbackCaptureStopTimer = null;
      stopFallbackShortcutCapture();
    }, Math.max(0, Number(delayMs) || 0));
  }

  function persistFallbackShortcut(value, onDone) {
    if (!storageArea) {
      if (typeof onDone === 'function') {
        onDone(true);
      }
      return;
    }
    storageArea.set({ [FALLBACK_SHORTCUT_STORAGE_KEY]: value }, () => {
      const ok = !(chrome.runtime && chrome.runtime.lastError);
      if (typeof onDone === 'function') {
        onDone(ok);
      }
    });
  }


  function loadCurrentShortcut() {
    const defaultShortcut = getDefaultFallbackShortcut();
    if (!chrome || !chrome.commands || typeof chrome.commands.getAll !== 'function') {
      setFallbackShortcutLabel(formatShortcutForDisplay(defaultShortcut) || defaultShortcut);
      return;
    }
    chrome.commands.getAll((commands) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        setFallbackShortcutLabel(formatShortcutForDisplay(defaultShortcut) || defaultShortcut);
        return;
      }
      const items = Array.isArray(commands) ? commands : [];
      const command = items.find((item) => item && item.name === 'show-search');
      const shortcut = command && typeof command.shortcut === 'string'
        ? String(command.shortcut).trim()
        : '';
      const effectiveShortcut = shortcut || defaultShortcut;
      setFallbackShortcutLabel(formatShortcutForDisplay(effectiveShortcut) || effectiveShortcut);
    });
  }

  function getShortcutReferencePartLabel(part) {
    const text = String(part || '').trim();
    if (!text) {
      return '';
    }
    const display = formatShortcutForDisplay(text);
    if (display) {
      return display;
    }
    const keyMap = {
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Escape: 'Esc',
      'Arrow keys': '↑↓←→',
      'release Alt': 'Alt↑'
    };
    return keyMap[text] || text;
  }

  function getShortcutReferenceParts(shortcut) {
    const value = String(shortcut || '').trim();
    if (!value) {
      return [];
    }
    return value
      .split(/\s*\/\s*/)
      .map(getShortcutReferencePartLabel)
      .filter(Boolean);
  }

  function createShortcutReferenceKeyField(shortcut) {
    const keyField = document.createElement('div');
    keyField.className = '_x_extension_shortcut_reference_key_field_2026_unique_';
    const parts = getShortcutReferenceParts(shortcut);
    keyField.textContent = parts.length > 0
      ? parts.join(' / ')
      : getMessage('shortcut_reference_unset', '未设置');
    if (parts.length === 0) {
      keyField.setAttribute('data-empty', 'true');
    }
    return keyField;
  }

  function createShortcutReferenceItem(item) {
    const row = document.createElement('div');
    row.className = '_x_extension_setting_row_2024_unique_ _x_extension_setting_row_compact_2024_unique_ _x_extension_shortcut_reference_item_2026_unique_';
    row.setAttribute('data-shortcut-id', item && item.id ? String(item.id) : '');
    row.setAttribute('data-shortcut-command', item && item.commandName ? String(item.commandName) : '');
    row.setAttribute('data-shortcut-editable', item && item.editable ? 'true' : 'false');

    const text = document.createElement('div');
    const title = document.createElement('p');
    title.className = '_x_extension_setting_title_2024_unique_';
    title.textContent = getMessage(item.titleKey, item.titleFallback || '');
    text.appendChild(title);

    const actions = document.createElement('div');
    actions.className = '_x_extension_shortcut_reference_actions_2026_unique_';
    actions.appendChild(createShortcutReferenceKeyField(item.shortcut || ''));

    row.appendChild(text);
    row.appendChild(actions);
    return row;
  }

  function createShortcutReferenceGroupTitle(group) {
    const title = document.createElement('div');
    title.className = '_x_extension_shortcut_reference_group_title_2026_unique_';
    title.setAttribute('data-shortcut-group', group && group.id ? String(group.id) : '');
    title.textContent = getMessage(group.titleKey, group.titleFallback || '');
    return title;
  }

  function renderShortcutReferenceGroups(groups) {
    if (!shortcutReferenceList) {
      return;
    }
    shortcutReferenceList.innerHTML = '';
    groups.forEach((group) => {
      const items = (group.items || []).filter((item) => !(item && item.commandName === 'show-search'));
      if (items.length === 0) {
        return;
      }
      shortcutReferenceList.appendChild(createShortcutReferenceGroupTitle(group));
      items.forEach((item) => {
        shortcutReferenceList.appendChild(createShortcutReferenceItem(item));
      });
    });
  }

  function renderShortcutReferenceList() {
    if (!shortcutReferenceList || !globalThis.LumnoShortcutReference) {
      return;
    }
    const shortcutReference = globalThis.LumnoShortcutReference;
    const platform = isMacPlatform ? 'mac' : 'default';
    const renderWithCommands = (commands) => {
      const groups = shortcutReference.getShortcutReferenceGroups({
        commands,
        platform
      });
      renderShortcutReferenceGroups(groups);
    };
    if (!chrome || !chrome.commands || typeof chrome.commands.getAll !== 'function') {
      renderWithCommands(null);
      return;
    }
    chrome.commands.getAll((commands) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        renderWithCommands(null);
        return;
      }
      renderWithCommands(Array.isArray(commands) ? commands : null);
    });
  }


  function setActiveTab(tabKey) {
    tabButtons.forEach((button) => {
      const isActive = button.getAttribute('data-tab') === tabKey;
      button.setAttribute('data-active', isActive ? 'true' : 'false');
    });
    tabContents.forEach((content) => {
      const isActive = content.getAttribute('data-content') === tabKey;
      content.setAttribute('data-active', isActive ? 'true' : 'false');
    });
    requestAnimationFrame(updateTabIndicator);
    if (tabKey === 'appearance') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateThemeIndicator();
          updateRecentModeTabsIndicator();
          updateNewtabWidthTabsIndicator();
          updateOverlaySizeTabsIndicator();
        });
      });
    }
    if (tabKey === 'general') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateRestrictedActionTabsIndicator();
          updateSearchResultPriorityTabsIndicator();
          syncFallbackShortcutWrapWidth();
          updateFallbackShortcutWrapWidthForContent();
        });
      });
    }
    if (tabKey) {
      const nextHash = `#${tabKey}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    }
  }

  function measureTabIndicator() {
    if (!tabsContainer || !tabsIndicator) return null;
    const activeButton = tabButtons.find((button) => button.getAttribute('data-active') === 'true');
    return measureTabsIndicator(tabsContainer, tabsIndicator, activeButton, 4, tabsContainer.clientLeft);
  }

  function updateTabIndicator() {
    applyTabsIndicatorMeasurement(measureTabIndicator());
  }

  function updateTabsStickyVisualState() {
    if (!tabsRow) return;
    const stickyTop = parseFloat(window.getComputedStyle(tabsRow).top || '0') || 0;
    const isStuck = tabsRow.getBoundingClientRect().top <= stickyTop + 0.5;
    tabsRow.setAttribute('data-stuck', isStuck ? 'true' : 'false');
  }

  let optionsScrollFrame = 0;
  let optionsResizeFrame = 0;
  function scheduleOptionsScrollRefresh() {
    if (optionsScrollFrame) {
      return;
    }
    optionsScrollFrame = window.requestAnimationFrame(() => {
      optionsScrollFrame = 0;
      updateTabsStickyVisualState();
    });
  }

  function scheduleOptionsViewportLayoutRefresh() {
    if (optionsResizeFrame) {
      return;
    }
    optionsResizeFrame = window.requestAnimationFrame(() => {
      optionsResizeFrame = 0;
      updateTabsStickyVisualState();
      refreshAllTabsIndicators();
      syncFallbackShortcutWrapWidth();
    });
  }

  function resetPageScrollToDefault() {
    window.scrollTo({ top: 0, behavior: 'auto' });
    updateTabsStickyVisualState();
  }

  function getOptionsRouteState() {
    const rawHash = window.location.hash.replace('#', '').trim();
    if (!rawHash) {
      return {
        tabKey: '',
        targetKey: ''
      };
    }
    const parts = rawHash.split(':').map((part) => String(part || '').trim()).filter(Boolean);
    return {
      tabKey: parts[0] || '',
      targetKey: parts.slice(1).join(':')
    };
  }

  function getOptionsTargetElement(targetKey) {
    if (targetKey !== OPTIONS_TARGET_SITE_SEARCH_AI) {
      return null;
    }
    return siteSearchAiGroup || (siteSearchAiBuiltinList
      ? siteSearchAiBuiltinList.closest('._x_extension_shortcut_group_2024_unique_')
      : null);
  }

  function scrollToOptionsTarget(targetKey, options) {
    const target = getOptionsTargetElement(targetKey);
    if (!target || typeof target.scrollIntoView !== 'function') {
      return false;
    }
    const behavior = options && options.behavior ? options.behavior : 'smooth';
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior, block: 'start' });
      updateTabsStickyVisualState();
    });
    return true;
  }

  if (settingsVersion && chrome?.runtime?.getManifest) {
    const manifest = chrome.runtime.getManifest();
    if (manifest?.version) {
      settingsVersion.textContent = `v${manifest.version}`;
    }
    function getOpenDisposition(event, fallback) {
      if (typeof NAVIGATION_DISPOSITION.getDisposition === 'function') {
        return NAVIGATION_DISPOSITION.getDisposition(event, fallback);
      }
      return event && (event.metaKey || event.ctrlKey || Number(event.button) === 1)
        ? 'backgroundTab'
        : (fallback || 'newTab');
    }
    function openSettingsVersionRelease(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!chrome?.runtime?.sendMessage) {
        return;
      }
      chrome.runtime.sendMessage({
        action: 'openReleasePage',
        reason: 'options-version',
        disposition: getOpenDisposition(event, 'newTab')
      }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          return;
        }
      });
    }
    settingsVersion.addEventListener('click', openSettingsVersionRelease);
    settingsVersion.addEventListener('auxclick', (event) => {
      if (!event || Number(event.button) !== 1) {
        return;
      }
      openSettingsVersionRelease(event);
    });
  }

  function applyResolvedTheme(resolvedTheme) {
    document.body.setAttribute('data-theme', resolvedTheme);
    panel.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', resolvedTheme === 'dark' ? '#111111' : '#f1f5f9');
    }
  }

  function resolveTheme(mode) {
    if (mode === 'dark') {
      return 'dark';
    }
    if (mode === 'light') {
      return 'light';
    }
    return mediaQuery.matches ? 'dark' : 'light';
  }

  function getThemeStorageUpdate(mode) {
    if (SETTINGS && typeof SETTINGS.createGlobalThemeModeStorageUpdate === 'function') {
      return SETTINGS.createGlobalThemeModeStorageUpdate(mode);
    }
    const nextMode = mode === 'dark' || mode === 'light' ? mode : 'system';
    return {
      [THEME_STORAGE_KEY]: nextMode
    };
  }

  function updateThemeButtons(mode) {
    themeButtons.forEach((button) => {
      const isActive = button.getAttribute('data-mode') === mode;
      button.setAttribute('data-active', isActive ? 'true' : 'false');
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    requestAnimationFrame(updateThemeIndicator);
  }

  function measureThemeIndicator() {
    if (!themePicker || !themeIndicator) return null;
    const activeButton = themeButtons.find((button) => button.getAttribute('data-active') === 'true');
    return measureTabsIndicator(themePicker, themeIndicator, activeButton, 3, 0);
  }

  function updateThemeIndicator() {
    applyTabsIndicatorMeasurement(measureThemeIndicator());
  }

  function onMediaChange() {
    if (!storageArea) {
      return;
    }
    storageArea.get([THEME_STORAGE_KEY], (result) => {
      const mode = result[THEME_STORAGE_KEY] || 'system';
      if (mode === 'system') {
        applyResolvedTheme(resolveTheme(mode));
      }
    });
  }

  function setThemeMode(mode) {
    if (!storageArea) {
      return;
    }
    const updates = getThemeStorageUpdate(mode);
    const nextMode = updates[THEME_STORAGE_KEY];
    storageArea.set(updates, () => {
      updateThemeButtons(nextMode);
      applyResolvedTheme(resolveTheme(nextMode));
      if (nextMode === 'system' && !mediaListenerAttached) {
        mediaQuery.addEventListener('change', onMediaChange);
        mediaListenerAttached = true;
        return;
      }
      if (nextMode !== 'system' && mediaListenerAttached) {
        mediaQuery.removeEventListener('change', onMediaChange);
        mediaListenerAttached = false;
      }
    });
  }

  function getStoredThemeMode() {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve('system');
        return;
      }
      storageArea.get([THEME_STORAGE_KEY], (result) => {
        resolve((result && result[THEME_STORAGE_KEY]) || 'system');
      });
    });
  }

  async function initTheme() {
    let ready = false;
    const fallbackTimer = setTimeout(() => {
      if (ready) {
        return;
      }
      applyResolvedTheme(resolveTheme('system'));
      document.documentElement.setAttribute('data-theme-ready', 'true');
    }, 800);
    try {
      const storedMode = await getStoredThemeMode();
      updateThemeButtons(storedMode);
      applyResolvedTheme(resolveTheme(storedMode));
      if (storedMode === 'system' && !mediaListenerAttached) {
        mediaQuery.addEventListener('change', onMediaChange);
        mediaListenerAttached = true;
      }
      ready = true;
      clearTimeout(fallbackTimer);
      document.documentElement.setAttribute('data-theme-ready', 'true');
    } catch (e) {
      ready = true;
      clearTimeout(fallbackTimer);
      applyResolvedTheme(resolveTheme('system'));
      document.documentElement.setAttribute('data-theme-ready', 'true');
    }
  }

  initTheme();

  function playThemeOptionClickEffect(button) {
    if (!button) {
      return;
    }
    button.classList.remove('x-theme-clicking');
    void button.offsetWidth;
    button.classList.add('x-theme-clicking');
    window.setTimeout(() => {
      button.classList.remove('x-theme-clicking');
    }, 260);
  }

  themeButtons.forEach((button) => {
    button.addEventListener('click', function() {
      playThemeOptionClickEffect(button);
      setThemeMode(button.getAttribute('data-mode'));
    });
  });

  if (!storageArea) {
    applyLanguageMode('system');
  }
  initTooltips();

  function getInitialTabKey() {
    const routeState = getOptionsRouteState();
    const tabKey = routeState.tabKey;
    if (!tabKey) {
      return 'general';
    }
    const match = tabButtons.find((button) => button.getAttribute('data-tab') === tabKey);
    return match ? tabKey : 'general';
  }

  function getInitialOptionsTargetKey() {
    const routeState = getOptionsRouteState();
    return routeState.targetKey || '';
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', function() {
      const tabKey = button.getAttribute('data-tab');
      const activeButton = tabButtons.find((item) => item.getAttribute('data-active') === 'true');
      const currentTabKey = activeButton ? activeButton.getAttribute('data-tab') : '';
      setActiveTab(tabKey);
      if (tabKey && tabKey !== currentTabKey) {
        resetPageScrollToDefault();
      }
      if (tabKey === 'shortcuts') {
        refreshSiteSearchProviders();
      }
    });
  });

  const initialTab = getInitialTabKey();
  pendingOptionsScrollTarget = initialTab === 'shortcuts' ? getInitialOptionsTargetKey() : '';
  setActiveTab(initialTab);
  if (initialTab === 'shortcuts') {
    refreshSiteSearchProviders();
  }
  scheduleTabsIndicatorsRefresh(2);
  if (document.fonts && typeof document.fonts.ready === 'object' && typeof document.fonts.ready.then === 'function') {
    document.fonts.ready.then(() => {
      scheduleTabsIndicatorsRefresh(2);
    });
  }
  window.addEventListener('scroll', scheduleOptionsScrollRefresh, { passive: true });
  updateTabsStickyVisualState();
  window.addEventListener('resize', scheduleOptionsViewportLayoutRefresh, { passive: true });
  migrateStorageIfNeeded([
    THEME_STORAGE_KEY,
    LANGUAGE_STORAGE_KEY,
    LANGUAGE_MESSAGES_STORAGE_KEY,
    RECENT_MODE_STORAGE_KEY,
    RECENT_COUNT_STORAGE_KEY,
    BOOKMARK_COUNT_STORAGE_KEY,
    BOOKMARK_COLUMNS_STORAGE_KEY,
    BOOKMARK_VIEW_MODE_STORAGE_KEY,
    BOOKMARK_TOPBAR_SURFACE_COLOR_STORAGE_KEY,
    BOOKMARK_TOPBAR_SURFACE_COLOR_LIGHT_STORAGE_KEY,
    BOOKMARK_TOPBAR_SURFACE_COLOR_DARK_STORAGE_KEY,
    BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY,
    NEWTAB_WIDTH_MODE_STORAGE_KEY,
    NEWTAB_SEARCH_WIDTH_STORAGE_KEY,
    NEWTAB_THEME_MODE_STORAGE_KEY,
    NEWTAB_THEME_SCOPE_STORAGE_KEY,
    NEWTAB_WALLPAPER_STORAGE_KEY,
    NEWTAB_WALLPAPER_OVERLAY_STORAGE_KEY,
    NEWTAB_WALLPAPER_EFFECT_STORAGE_KEY,
    NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY,
    NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY,
    PINNED_RECENT_SITES_STORAGE_KEY,
    HIDDEN_RECENT_SITES_STORAGE_KEY,
    NEWTAB_SHORTCUTS_STORAGE_KEY,
    OVERLAY_SIZE_MODE_STORAGE_KEY,
    SEARCH_RESULT_PRIORITY_STORAGE_KEY,
    AUTO_PIP_ENABLED_STORAGE_KEY,
    TAB_SWITCHER_ENABLED_STORAGE_KEY,
    DOCUMENT_PIP_ENABLED_STORAGE_KEY,
    PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY,
    OVERLAY_TAB_PRIORITY_STORAGE_KEY,
    FALLBACK_SHORTCUT_STORAGE_KEY,
    SITE_SEARCH_STORAGE_KEY,
    SITE_SEARCH_DISABLED_STORAGE_KEY,
    SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY,
    OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY,
    SEARCH_BLACKLIST_STORAGE_KEY,
    FAVICON_REQUEST_BLACKLIST_STORAGE_KEY,
    FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY,
    DEFAULT_SEARCH_ENGINE_STORAGE_KEY
  ]);
  refreshSyncStatus();

  function normalizeSiteSearchTemplate(template) {
    if (typeof SEARCH_UTILS.normalizeSiteSearchTemplate === 'function') {
      return SEARCH_UTILS.normalizeSiteSearchTemplate(template);
    }
    return String(template || '')
      .trim()
      .replace(/\{\{\{s\}\}\}/g, '{query}')
      .replace(/\{s\}/g, '{query}')
      .replace(/\{searchTerms\}/g, '{query}');
  }

  function hasOpenAndSubmitSiteSearchAction(item) {
    if (typeof SEARCH_UTILS.hasOpenAndSubmitSiteSearchAction === 'function') {
      return SEARCH_UTILS.hasOpenAndSubmitSiteSearchAction(item);
    }
    return Boolean(
      item &&
      String(item.action || '').trim() === 'openAndSubmit'
    );
  }

  function isAiSiteSearchProvider(item) {
    if (typeof SEARCH_UTILS.isAiSiteSearchProvider === 'function') {
      return SEARCH_UTILS.isAiSiteSearchProvider(item);
    }
    if (!item) {
      return false;
    }
    if (hasOpenAndSubmitSiteSearchAction(item)) {
      return true;
    }
    const template = normalizeSiteSearchTemplate(String(item.template || '').trim());
    return Boolean(template) && !template.includes('{query}');
  }

  function normalizeSiteSearchProvider(item, baseItem) {
    if (typeof SEARCH_UTILS.normalizeSiteSearchProvider === 'function') {
      return SEARCH_UTILS.normalizeSiteSearchProvider(item, baseItem);
    }
    if (!item && !baseItem) {
      return null;
    }
    const key = String((item && item.key) || (baseItem && baseItem.key) || '').trim();
    const template = normalizeSiteSearchTemplate(
      String((item && item.template) || (baseItem && baseItem.template) || '').trim()
    );
    if (!key || !template) {
      return null;
    }
    if (!template.includes('{query}') && !isAiSiteSearchProvider({
      ...(baseItem || {}),
      ...(item || {}),
      key,
      template
    })) {
      return null;
    }
    const aliasSource = Array.isArray(item && item.aliases)
      ? item.aliases
      : (Array.isArray(baseItem && baseItem.aliases) ? baseItem.aliases : []);
    return {
      key,
      aliases: aliasSource.filter(Boolean),
      name: String((item && item.name) || (baseItem && baseItem.name) || key).trim() || key,
      template,
      action: String((item && item.action) || (baseItem && baseItem.action) || '').trim(),
      submitStrategy: String(
        (item && item.submitStrategy) || (baseItem && baseItem.submitStrategy) || ''
      ).trim(),
      disabled: Boolean(item && item.disabled),
      disabledReason: String((item && item.disabledReason) || '').trim(),
      icon: String((item && item.icon) || (baseItem && baseItem.icon) || '').trim(),
      iconUrl: String((item && item.iconUrl) || (baseItem && baseItem.iconUrl) || '').trim()
    };
  }

  function isDuplicateTemplate(template, defaults) {
    const normalized = normalizeSiteSearchTemplate(String(template || '').trim());
    if (!normalized) {
      return false;
    }
    return (defaults || []).some((item) => normalizeSiteSearchTemplate(String(item.template || '').trim()) === normalized);
  }

  function normalizeAliases(input) {
    if (!input) {
      return [];
    }
    return Array.from(new Set(
      input
        .split(/[,，]/)
        .map((alias) => alias.trim())
        .filter(Boolean)
    ));
  }

  function setSiteSearchError(message) {
    if (!siteSearchError) {
      return;
    }
    if (!message) {
      siteSearchError.textContent = '';
      siteSearchError.style.display = 'none';
      return;
    }
    siteSearchError.textContent = message;
    siteSearchError.style.display = 'block';
  }

  function setSiteSearchFormExpanded(expanded) {
    siteSearchFormExpanded = Boolean(expanded);
    if (siteSearchForm) {
      siteSearchForm.setAttribute('data-expanded', siteSearchFormExpanded ? 'true' : 'false');
    }
    if (siteSearchFormTrigger) {
      siteSearchFormTrigger.setAttribute('aria-expanded', siteSearchFormExpanded ? 'true' : 'false');
    }
    if (siteSearchCancelButton) {
      siteSearchCancelButton.style.display = siteSearchFormExpanded ? 'inline-flex' : 'none';
      if (siteSearchCancelButton.textContent) {
        siteSearchCancelButton.textContent = getMessage('shortcuts_cancel', siteSearchCancelButton.textContent);
      }
    }
    if (siteSearchFormExpanded && siteSearchKeyInput) {
      siteSearchKeyInput.focus();
    }
  }

  function setEditingState(key) {
    editingSiteSearchKey = key;
    if (siteSearchAddButton) {
      siteSearchAddButton.textContent = key
        ? getMessage('shortcuts_save', '保存修改')
        : getMessage('shortcuts_add', '添加站内搜索');
      siteSearchAddButton.classList.add('_x_extension_shortcut_save_2024_unique_');
    }
  }

  function insertSiteSearchQueryToken() {
    if (!siteSearchTemplateInput) {
      return;
    }
    const token = '{query}';
    const currentValue = String(siteSearchTemplateInput.value || '');
    const existingIndex = currentValue.indexOf(token);
    if (existingIndex >= 0) {
      const nextCursor = existingIndex + token.length;
      siteSearchTemplateInput.focus();
      if (typeof siteSearchTemplateInput.setSelectionRange === 'function') {
        siteSearchTemplateInput.setSelectionRange(nextCursor, nextCursor);
      }
      return;
    }
    const selectionStart = Number.isInteger(siteSearchTemplateInput.selectionStart)
      ? siteSearchTemplateInput.selectionStart
      : currentValue.length;
    const selectionEnd = Number.isInteger(siteSearchTemplateInput.selectionEnd)
      ? siteSearchTemplateInput.selectionEnd
      : selectionStart;
    const safeStart = Math.max(0, Math.min(selectionStart, currentValue.length));
    const safeEnd = Math.max(safeStart, Math.min(selectionEnd, currentValue.length));
    const nextValue = `${currentValue.slice(0, safeStart)}${token}${currentValue.slice(safeEnd)}`;
    const nextCursor = safeStart + token.length;
    siteSearchTemplateInput.value = nextValue;
    siteSearchTemplateInput.focus();
    if (typeof siteSearchTemplateInput.setSelectionRange === 'function') {
      siteSearchTemplateInput.setSelectionRange(nextCursor, nextCursor);
    }
    siteSearchTemplateInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function attachSaveButtonAnimation(button) {
    if (!button) {
      return;
    }
    button.addEventListener('click', () => {
      if (!button.classList.contains('_x_extension_shortcut_save_2024_unique_')) {
        return;
      }
      button.classList.remove('_x_extension_shortcut_save_pulse_2024_unique_');
      void button.offsetWidth;
      button.classList.add('_x_extension_shortcut_save_pulse_2024_unique_');
    });
    button.addEventListener('animationend', () => {
      button.classList.remove('_x_extension_shortcut_save_pulse_2024_unique_');
    });
  }

  function suspendSiteSearchRefresh(durationMs) {
    const now = Date.now();
    siteSearchRefreshSuppressUntil = Math.max(siteSearchRefreshSuppressUntil, now + durationMs);
  }

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      const next = languageSelect.value || 'system';
      applyLanguageMode(next, { persist: true });
    });
  }

  if (recentCountSelect) {
    recentCountSelect.addEventListener('change', () => {
      const nextCount = normalizeRecentCount(recentCountSelect.value);
      updateRecentModeTabsVisibility(nextCount);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [RECENT_COUNT_STORAGE_KEY]: nextCount });
      notifyNewtabSectionsRefresh('recent');
    });
  }
  if (newtabWidthSelect) {
    newtabWidthSelect.addEventListener('change', () => {
      const nextMode = normalizeNewtabWidthMode(newtabWidthSelect.value);
      setNewtabWidthTabState(nextMode);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [NEWTAB_WIDTH_MODE_STORAGE_KEY]: nextMode });
      notifyNewtabSectionsRefresh('all');
    });
  }
  if (newtabWidthTabButtons.length > 0) {
    newtabWidthTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = normalizeNewtabWidthMode(button.getAttribute('data-newtab-width'));
        setNewtabWidthTabState(nextMode);
        if (newtabWidthSelect) {
          newtabWidthSelect.value = nextMode;
        }
        if (!storageArea) {
          return;
        }
        storageArea.set({ [NEWTAB_WIDTH_MODE_STORAGE_KEY]: nextMode });
        notifyNewtabSectionsRefresh('all');
      });
    });
  }
  if (overlaySizeTabButtons.length > 0) {
    overlaySizeTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = normalizeOverlaySizeMode(button.getAttribute('data-overlay-size'));
        setOverlaySizeTabState(nextMode);
        if (!storageArea) {
          return;
        }
        storageArea.set({ [OVERLAY_SIZE_MODE_STORAGE_KEY]: nextMode });
      });
    });
  }
  if (searchResultPrioritySelect) {
    searchResultPrioritySelect.addEventListener('change', () => {
      const nextPriority = normalizeSearchResultPriority(searchResultPrioritySelect.value);
      setSearchResultPriorityTabState(nextPriority);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [SEARCH_RESULT_PRIORITY_STORAGE_KEY]: nextPriority });
    });
  }
  if (searchResultPriorityTabButtons.length > 0) {
    searchResultPriorityTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextPriority = normalizeSearchResultPriority(button.getAttribute('data-search-result-priority'));
        setSearchResultPriorityTabState(nextPriority);
        if (searchResultPrioritySelect) {
          searchResultPrioritySelect.value = nextPriority;
        }
        if (!storageArea) {
          return;
        }
        storageArea.set({ [SEARCH_RESULT_PRIORITY_STORAGE_KEY]: nextPriority });
      });
    });
  }
  if (!searchResultSourceTypeGroup && searchResultSourceTypeInputs.length > 0) {
    searchResultSourceTypeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        persistSearchResultSourceTypes(collectCheckedSearchResultSourceTypes());
      });
    });
  }
  if (overlayOpenTabsDefaultVisibleToggle) {
    overlayOpenTabsDefaultVisibleToggle.addEventListener('change', () => {
      const next = normalizeOverlayOpenTabsDefaultVisible(overlayOpenTabsDefaultVisibleToggle.checked);
      overlayOpenTabsDefaultVisibleToggle.checked = next;
      if (!storageArea) {
        return;
      }
      storageArea.set({ [OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY]: next });
    });
  }
  if (faviconEnhancedFetchToggle) {
    faviconEnhancedFetchToggle.addEventListener('change', () => {
      const next = normalizeFaviconEnhancedFetchEnabled(faviconEnhancedFetchToggle.checked);
      faviconEnhancedFetchToggle.checked = next;
      setFaviconBlacklistEditorEnabled(next);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY]: next });
    });
  }
  if (recentModeSelect) {
    recentModeSelect.addEventListener('change', () => {
      const rawMode = recentModeSelect.value;
      const nextMode = rawMode === 'most' ? 'most' : 'latest';
      setRecentModeTabState(nextMode);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [RECENT_MODE_STORAGE_KEY]: nextMode });
      notifyNewtabSectionsRefresh('recent');
    });
  }
  if (recentModeTabButtons.length > 0) {
    recentModeTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextMode = button.getAttribute('data-recent-mode') === 'most' ? 'most' : 'latest';
        setRecentModeTabState(nextMode);
        if (recentModeSelect) {
          recentModeSelect.value = nextMode;
        }
        if (!storageArea) {
          return;
        }
        storageArea.set({ [RECENT_MODE_STORAGE_KEY]: nextMode });
        notifyNewtabSectionsRefresh('recent');
      });
    });
  }
  if (blacklistAddButton) {
    blacklistAddButton.addEventListener('click', () => {
      if (!blacklistFormExpanded) {
        setBlacklistFormExpanded(true);
        return;
      }
      const matchModes = getBlacklistMatchModesFromForm();
      const draft = buildBlacklistRuleDraft(blacklistUrlInput && blacklistUrlInput.value, matchModes);
      if (!draft.item) {
        setBlacklistError(draft.error || '');
        return;
      }
      setBlacklistError('');
      persistBlacklistItems(
        upsertBlacklistItems(draft.item, ''),
        getMessage('toast_saved', '已保存')
      ).then(() => {
        resetBlacklistForm();
      }).catch(() => {
        showToast(getMessage('toast_error', '操作失败，请重试'), true);
      });
    });
  }
  if (blacklistFormTrigger) {
    blacklistFormTrigger.addEventListener('click', () => {
      setBlacklistFormExpanded(true);
    });
  }
  [
    [blacklistMatchExactInput, 'exact'],
    [blacklistMatchPrefixInput, 'prefix'],
    [blacklistMatchSuffixInput, 'suffix']
  ].forEach(([input, mode]) => {
    if (!input) {
      return;
    }
    input.addEventListener('change', () => {
      syncBlacklistMatchModeAvailability(mode);
    });
  });
  if (blacklistCancelButton) {
    blacklistCancelButton.addEventListener('click', () => {
      resetBlacklistForm();
    });
  }
  if (blacklistUrlInput) {
    blacklistUrlInput.addEventListener('input', () => {
      setBlacklistError('');
      updateBlacklistInputPresentation();
    });
    blacklistUrlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (blacklistAddButton) {
          blacklistAddButton.click();
        }
      }
    });
  }
  if (faviconBlacklistAddButton) {
    faviconBlacklistAddButton.addEventListener('click', () => {
      if (!faviconBlacklistFormExpanded) {
        setFaviconBlacklistFormExpanded(true);
        return;
      }
      const matchModes = getFaviconBlacklistMatchModesFromForm();
      const draft = buildBlacklistRuleDraft(faviconBlacklistUrlInput && faviconBlacklistUrlInput.value, matchModes);
      if (!draft.item) {
        setFaviconBlacklistError(draft.error || '');
        return;
      }
      const nextKey = buildBlacklistItemKey(draft.item);
      const nextItems = [draft.item].concat(
        faviconRequestBlacklistItems.filter((item) => buildBlacklistItemKey(item) !== nextKey)
      );
      saveFaviconRequestBlacklistItems(nextItems).then((savedItems) => {
        faviconRequestBlacklistItems = savedItems;
        renderFaviconRequestBlacklistList();
        resetFaviconBlacklistForm();
        showToast(getMessage('toast_saved', '已保存'), false);
      }).catch(() => showToast(getMessage('toast_error', '操作失败，请重试'), true));
    });
  }
  if (faviconBlacklistFormTrigger) {
    faviconBlacklistFormTrigger.addEventListener('click', () => setFaviconBlacklistFormExpanded(true));
  }
  [
    [faviconBlacklistMatchExactInput, 'exact'],
    [faviconBlacklistMatchPrefixInput, 'prefix'],
    [faviconBlacklistMatchSuffixInput, 'suffix']
  ].forEach(([input, mode]) => {
    if (input) {
      input.addEventListener('change', () => syncFaviconBlacklistMatchModeAvailability(mode));
    }
  });
  if (faviconBlacklistCancelButton) {
    faviconBlacklistCancelButton.addEventListener('click', resetFaviconBlacklistForm);
  }
  if (faviconBlacklistUrlInput) {
    faviconBlacklistUrlInput.addEventListener('input', () => setFaviconBlacklistError(''));
    faviconBlacklistUrlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        faviconBlacklistAddButton.click();
      }
    });
  }
  if (bookmarkCountSelect) {
    bookmarkCountSelect.addEventListener('change', () => {
      const nextCount = normalizeBookmarkCount(bookmarkCountSelect.value);
      updateBookmarkColumnsSelectVisibility(nextCount);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [BOOKMARK_COUNT_STORAGE_KEY]: nextCount });
      notifyNewtabSectionsRefresh('bookmarks');
    });
  }
  if (bookmarkColumnsSelect) {
    bookmarkColumnsSelect.addEventListener('change', () => {
      const nextColumns = normalizeBookmarkColumns(bookmarkColumnsSelect.value);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [BOOKMARK_COLUMNS_STORAGE_KEY]: nextColumns });
      notifyNewtabSectionsRefresh('bookmarks');
    });
  }
  if (bookmarkFolderIconsVisibleToggle) {
    bookmarkFolderIconsVisibleToggle.addEventListener('change', () => {
      const next = normalizeBookmarkFolderIconsVisible(bookmarkFolderIconsVisibleToggle.checked);
      bookmarkFolderIconsVisibleToggle.checked = next;
      if (!storageArea) {
        return;
      }
      storageArea.set({ [BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY]: next });
    });
  }
  if (overlayTabQuickSwitchToggle) {
    overlayTabQuickSwitchToggle.addEventListener('change', () => {
      const next = Boolean(overlayTabQuickSwitchToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [OVERLAY_TAB_PRIORITY_STORAGE_KEY]: next });
    });
  }
  if (newtabWordmarkToggle) {
    newtabWordmarkToggle.addEventListener('change', () => {
      const next = normalizeNewtabWordmarkVisible(newtabWordmarkToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY]: next });
    });
  }
  if (newtabShortcutsToggle) {
    newtabShortcutsToggle.addEventListener('change', () => {
      const next = normalizeNewtabShortcutsVisible(newtabShortcutsToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY]: next });
    });
  }
  if (updateNoticeToggle) {
    updateNoticeToggle.addEventListener('change', () => {
      const next = normalizeUpdateNoticeEnabled(updateNoticeToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [UPDATE_NOTICE_ENABLED_STORAGE_KEY]: next });
    });
  }
  if (autoPipToggle) {
    autoPipToggle.addEventListener('change', () => {
      const next = Boolean(autoPipToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [AUTO_PIP_ENABLED_STORAGE_KEY]: next });
    });
  }
  if (tabSwitcherToggle) {
    tabSwitcherToggle.addEventListener('change', () => {
      const next = normalizeTabSwitcherEnabled(tabSwitcherToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [TAB_SWITCHER_ENABLED_STORAGE_KEY]: next });
    });
  }
  if (documentPipToggle) {
    documentPipToggle.addEventListener('change', () => {
      const next = Boolean(documentPipToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [DOCUMENT_PIP_ENABLED_STORAGE_KEY]: next });
    });
  }
  if (pinnedTabRecoveryToggle) {
    pinnedTabRecoveryToggle.addEventListener('change', () => {
      const next = Boolean(pinnedTabRecoveryToggle.checked);
      if (!storageArea) {
        return;
      }
      storageArea.set({ [PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY]: next });
    });
  }

  if (restrictedActionSelect) {
    restrictedActionSelect.addEventListener('change', () => {
      const next = restrictedActionSelect.value || 'default';
      setRestrictedActionTabState(next);
      if (!storageArea) {
        return;
      }
      storageArea.set(createRestrictedActionStorageUpdate(next));
    });
  }
  if (restrictedActionTabButtons.length > 0) {
    restrictedActionTabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextAction = button.getAttribute('data-restricted-action') === 'none' ? 'none' : 'default';
        setRestrictedActionTabState(nextAction);
        if (restrictedActionSelect) {
          restrictedActionSelect.value = nextAction;
        }
        if (!storageArea) {
          return;
        }
        storageArea.set(createRestrictedActionStorageUpdate(nextAction));
      });
    });
  }

  function openExtensionShortcutsPage() {
    chrome.runtime.sendMessage({ action: 'openExtensionShortcutsPage' }, (response) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        showToast(getMessage('toast_error', '操作失败，请重试'), true);
        return;
      }
      if (!response || response.ok === false) {
        showToast(getMessage('toast_error', '操作失败，请重试'), true);
      }
    });
  }
  if (openShortcutsPageButton) {
    openShortcutsPageButton.addEventListener('click', openExtensionShortcutsPage);
  }
  if (openOnboardingPageButton) {
    openOnboardingPageButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOnboardingPage' }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
          return;
        }
        if (!response || response.ok === false) {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        }
      });
    });
  }

  if (fallbackShortcutInput) {
    const handleFallbackShortcutKeydown = (event) => {
      if (!event) {
        return;
      }
      if (event.key === 'Tab') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        fallbackShortcutInput.value = '';
        renderFallbackShortcutTokens(currentShortcutLabel || getDefaultFallbackShortcut());
        stopFallbackShortcutCapture();
        return;
      }
      const nextShortcut = buildShortcutFromEvent(event);
      if (nextShortcut) {
        fallbackShortcutInput.value = '';
        const normalized = normalizeFallbackShortcut(nextShortcut);
        if (!normalized) {
          return;
        }
        if (isReservedBrowserShortcut(normalized)) {
          showToast(getMessage('settings_shortcuts_invalid', '快捷键无效，请按组合键（如 Ctrl+K）'), true);
          renderFallbackShortcutTokens(currentShortcutLabel || '');
          return;
        }
        if (normalized === currentShortcutLabel) {
          renderFallbackShortcutTokens(normalized, true);
          stopFallbackShortcutCaptureDeferred(260);
          return;
        }
        setFallbackShortcutLabel(normalized, true);
        persistFallbackShortcut(normalized, (ok) => {
          if (!ok) {
            showToast(getMessage('toast_error', '操作失败，请重试'), true);
          }
        });
        stopFallbackShortcutCaptureDeferred(260);
      }
    };
    const captureWindowKeydown = (event) => {
      if (!isCapturingFallbackShortcut) {
        return;
      }
      handleFallbackShortcutKeydown(event);
    };
    window.addEventListener('keydown', captureWindowKeydown, true);
    if (fallbackShortcutWrap) {
      fallbackShortcutWrap.addEventListener('pointerdown', (event) => {
        const target = event && event.target;
        if (target && target.closest && target.closest('button')) {
          return;
        }
        event.preventDefault();
        fallbackShortcutInput.focus();
      });
      fallbackShortcutWrap.addEventListener('mouseleave', () => {
        if (!cancelCaptureOnMouseLeave) {
          return;
        }
        cancelCaptureOnMouseLeave = false;
        stopFallbackShortcutCapture();
      });
    }
    fallbackShortcutInput.addEventListener('focus', () => {
      isCapturingFallbackShortcut = true;
      if (fallbackShortcutWrap) {
        fallbackShortcutWrap.setAttribute('data-capturing', 'true');
      }
      fallbackShortcutInput.value = '';
      if (!currentShortcutLabel) {
        renderFallbackShortcutTokens('');
      }
    });
    fallbackShortcutInput.addEventListener('blur', () => {
      stopFallbackShortcutCapture();
    });
    fallbackShortcutInput.addEventListener('input', () => {
      fallbackShortcutInput.value = '';
    });
    fallbackShortcutInput.addEventListener('keydown', handleFallbackShortcutKeydown);
  }

  if (clearShortcutButton) {
    clearShortcutButton.addEventListener('click', () => {
      setFallbackShortcutLabel('');
      persistFallbackShortcut('', (ok) => {
        if (!ok) {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        }
      });
      cancelCaptureOnMouseLeave = true;
      if (fallbackShortcutInput) {
        fallbackShortcutInput.focus();
      }
    });
  }

  if (resetShortcutButton) {
    resetShortcutButton.addEventListener('click', () => {
      const defaultShortcut = getDefaultFallbackShortcut();
      setFallbackShortcutLabel(defaultShortcut, true);
      persistFallbackShortcut(defaultShortcut, (ok) => {
        if (!ok) {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        }
      });
      cancelCaptureOnMouseLeave = true;
      if (fallbackShortcutInput) {
        fallbackShortcutInput.focus();
      }
    });
  }

  loadCurrentShortcut();
  renderShortcutReferenceList();
  requestAnimationFrame(syncFallbackShortcutWrapWidth);
  window.addEventListener('focus', () => {
    loadCurrentShortcut();
    renderShortcutReferenceList();
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadCurrentShortcut();
      renderShortcutReferenceList();
    }
  }, true);

  if (syncNowButton) {
    syncNowButton.addEventListener('click', () => {
      if (!storageArea || storageAreaName !== 'sync') {
        updateSyncStatusText('sync_status_unavailable', '同步不可用');
        return;
      }
      const isRotated = syncNowButton.getAttribute('data-rotated') === 'true';
      syncNowButton.setAttribute('data-rotated', isRotated ? 'false' : 'true');
      storageArea.get(SYNC_KEYS, (result) => {
        const payload = {};
        SYNC_KEYS.forEach((key) => {
          if (typeof result[key] !== 'undefined') {
            payload[key] = result[key];
          }
        });
        payload[SYNC_META_KEY] = {
          lastSyncAt: Date.now(),
          source: 'manual'
        };
        storageArea.set(payload, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            const reason = chrome.runtime && chrome.runtime.lastError
              ? chrome.runtime.lastError.message
              : '';
            setTimeout(() => {
              showToast(formatTemplate(getMessage('sync_status_failed_reason', '同步失败：{reason}'), {
                reason: reason || getMessage('sync_status_failed', '同步失败')
              }), true);
            }, 360);
            return;
          }
          const toastDelay = 360;
          setTimeout(() => {
            showToast(getMessage('sync_status_done', '同步完成'), false);
          }, toastDelay);
          setTimeout(() => {
            updateSyncNowTooltip(formatSyncTime(Date.now()));
          }, toastDelay + 60);
        });
      });
    });
  }

  if (syncExportButton) {
    syncExportButton.addEventListener('click', () => {
      if (!storageArea) {
        return;
      }
      storageArea.get(SYNC_KEYS, (result) => {
        const payload = buildSyncPayload(result || {});
        downloadJson(`lumno-settings-${Date.now()}.json`, payload);
        showToast(getMessage('sync_export_done', '已导出配置'), false);
      });
    });
  }

  if (syncImportButton && syncImportInput) {
    syncImportButton.addEventListener('click', () => {
      syncImportInput.click();
    });
    syncImportInput.addEventListener('change', (event) => {
      const file = event.target && event.target.files ? event.target.files[0] : null;
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let parsed = null;
        try {
          parsed = JSON.parse(String(reader.result || ''));
        } catch (e) {
          parsed = null;
        }
        const data = parsed && parsed.data ? parsed.data : parsed;
        if (!data || typeof data !== 'object') {
          showToast(getMessage('sync_import_invalid', '配置文件无效'), true);
          syncImportInput.value = '';
          return;
        }
        const payload = {};
        SYNC_KEYS.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            payload[key] = data[key];
          }
        });
        if (Object.keys(payload).length === 0) {
          showToast(getMessage('sync_import_invalid', '配置文件无效'), true);
          syncImportInput.value = '';
          return;
        }
        if (storageArea) {
          payload[SYNC_META_KEY] = {
            lastSyncAt: Date.now(),
            source: 'import'
          };
          storageArea.set(payload, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              const reason = chrome.runtime && chrome.runtime.lastError
                ? chrome.runtime.lastError.message
                : '';
              showToast(formatTemplate(getMessage('sync_status_failed_reason', '同步失败：{reason}'), {
                reason: reason || getMessage('sync_status_failed', '同步失败')
              }), true);
              syncImportInput.value = '';
              return;
            }
            showToast(getMessage('sync_import_done', '导入完成'), false);
            refreshSyncStatus();
          });
        }
        syncImportInput.value = '';
      };
      reader.readAsText(file);
    });
  }


  function retryApplyLanguageFromStorage(delayMs) {
    if (!storageArea) {
      return;
    }
    const wait = Number.isFinite(delayMs) ? delayMs : 180;
    setTimeout(() => {
      storageArea.get([LANGUAGE_STORAGE_KEY], (retryResult) => {
        if (!retryResult || !Object.prototype.hasOwnProperty.call(retryResult, LANGUAGE_STORAGE_KEY)) {
          return;
        }
        const retryMode = normalizeLanguageMode(retryResult[LANGUAGE_STORAGE_KEY]);
        applyLanguageMode(retryMode);
      });
    }, wait);
  }

  if (storageArea) {
    storageArea.get([LANGUAGE_STORAGE_KEY], (result) => {
      const hasStored = Object.prototype.hasOwnProperty.call(result, LANGUAGE_STORAGE_KEY);
      const syncArea = chrome && chrome.storage ? chrome.storage.sync : null;
      const localArea = chrome && chrome.storage ? chrome.storage.local : null;
      if (hasStored) {
        const storedRaw = result[LANGUAGE_STORAGE_KEY];
        const stored = normalizeLanguageMode(storedRaw);
        if (storedRaw !== stored) {
          storageArea.set({ [LANGUAGE_STORAGE_KEY]: stored });
        }
        if (localArea) {
          localArea.set({ [LANGUAGE_STORAGE_KEY]: stored });
        }
        applyLanguageMode(stored);
        return;
      }
      if (storageArea === syncArea && localArea) {
        localArea.get([LANGUAGE_STORAGE_KEY], (localResult) => {
          const localHasStored = Object.prototype.hasOwnProperty.call(localResult, LANGUAGE_STORAGE_KEY);
          if (localHasStored) {
            const localRaw = localResult[LANGUAGE_STORAGE_KEY];
            const localMode = normalizeLanguageMode(localRaw);
            localArea.set({ [LANGUAGE_STORAGE_KEY]: localMode });
            storageArea.set({ [LANGUAGE_STORAGE_KEY]: localMode });
            applyLanguageMode(localMode);
            return;
          }
          // 避免刷新瞬间把尚未完成写入的语言偏好覆盖为 system。
          applyLanguageMode('system');
          retryApplyLanguageFromStorage(180);
        });
        return;
      }
      // 读不到时只做 UI 回退，不落盘，防止竞态覆盖用户刚设置的值。
      applyLanguageMode('system');
      retryApplyLanguageFromStorage(180);
    });

    storageArea.get([RECENT_COUNT_STORAGE_KEY], (result) => {
      const stored = result[RECENT_COUNT_STORAGE_KEY];
      const count = normalizeRecentCount(stored);
      if (recentCountSelect) {
        recentCountSelect.value = String(count);
      }
      updateRecentModeTabsVisibility(count);
      if (stored !== count) {
        storageArea.set({ [RECENT_COUNT_STORAGE_KEY]: count });
      }
      refreshCustomSelects();
    });
    storageArea.get([NEWTAB_WIDTH_MODE_STORAGE_KEY], (result) => {
      const stored = result[NEWTAB_WIDTH_MODE_STORAGE_KEY];
      const mode = normalizeNewtabWidthMode(stored);
      if (newtabWidthSelect) {
        newtabWidthSelect.value = mode;
      }
      setNewtabWidthTabState(mode);
      if (stored !== mode) {
        storageArea.set({ [NEWTAB_WIDTH_MODE_STORAGE_KEY]: mode });
      }
      refreshCustomSelects();
    });
    storageArea.get([OVERLAY_SIZE_MODE_STORAGE_KEY], (result) => {
      const stored = result[OVERLAY_SIZE_MODE_STORAGE_KEY];
      const mode = normalizeOverlaySizeMode(stored);
      setOverlaySizeTabState(mode);
      if (stored !== mode) {
        storageArea.set({ [OVERLAY_SIZE_MODE_STORAGE_KEY]: mode });
      }
      refreshCustomSelects();
    });
    storageArea.get([SEARCH_RESULT_PRIORITY_STORAGE_KEY], (result) => {
      const stored = result[SEARCH_RESULT_PRIORITY_STORAGE_KEY];
      const priority = normalizeSearchResultPriority(stored);
      if (searchResultPrioritySelect) {
        searchResultPrioritySelect.value = priority;
      }
      setSearchResultPriorityTabState(priority);
      if (stored !== priority) {
        storageArea.set({ [SEARCH_RESULT_PRIORITY_STORAGE_KEY]: priority });
      }
      refreshCustomSelects();
    });
    storageArea.get([SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY], (result) => {
      const stored = result[SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY];
      const sourceTypes = normalizeSearchResultSourceTypes(stored);
      setSearchResultSourceTypeState(sourceTypes);
      if (!Array.isArray(stored) || JSON.stringify(stored) !== JSON.stringify(sourceTypes)) {
        storageArea.set({ [SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY]: sourceTypes });
      }
    });
    storageArea.get([OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY], (result) => {
      const rawValue = result[OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY];
      const stored = normalizeOverlayOpenTabsDefaultVisible(rawValue);
      if (overlayOpenTabsDefaultVisibleToggle) {
        overlayOpenTabsDefaultVisibleToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY]: stored });
      }
    });
    storageArea.get([FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY], (result) => {
      const rawValue = result[FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY];
      const stored = normalizeFaviconEnhancedFetchEnabled(rawValue);
      if (faviconEnhancedFetchToggle) {
        faviconEnhancedFetchToggle.checked = stored;
      }
      setFaviconBlacklistEditorEnabled(stored);
      if (rawValue !== stored) {
        storageArea.set({ [FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY]: stored });
      }
    });
    storageArea.get([RECENT_MODE_STORAGE_KEY], (result) => {
      const stored = result[RECENT_MODE_STORAGE_KEY];
      const hasStored = stored === 'latest' || stored === 'most';
      const mode = hasStored ? stored : 'most';
      if (recentModeSelect) {
        recentModeSelect.value = mode;
      }
      setRecentModeTabState(mode);
      if (!hasStored) {
        storageArea.set({ [RECENT_MODE_STORAGE_KEY]: mode });
      }
      refreshCustomSelects();
    });
    storageArea.get([BOOKMARK_COUNT_STORAGE_KEY], (result) => {
      const stored = result[BOOKMARK_COUNT_STORAGE_KEY];
      const count = normalizeBookmarkCount(stored);
      if (bookmarkCountSelect) {
        bookmarkCountSelect.value = String(count);
      }
      updateBookmarkColumnsSelectVisibility(count);
      if (stored !== count) {
        storageArea.set({ [BOOKMARK_COUNT_STORAGE_KEY]: count });
      }
      refreshCustomSelects();
    });
    storageArea.get([BOOKMARK_COLUMNS_STORAGE_KEY], (result) => {
      const stored = result[BOOKMARK_COLUMNS_STORAGE_KEY];
      const columns = normalizeBookmarkColumns(stored);
      if (bookmarkColumnsSelect) {
        bookmarkColumnsSelect.value = String(columns);
      }
      if (stored !== columns) {
        storageArea.set({ [BOOKMARK_COLUMNS_STORAGE_KEY]: columns });
      }
      refreshCustomSelects();
    });
    storageArea.get([BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY], (result) => {
      const raw = result[BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY];
      const next = normalizeBookmarkFolderIconsVisible(raw);
      if (bookmarkFolderIconsVisibleToggle) {
        bookmarkFolderIconsVisibleToggle.checked = next;
      }
      if (raw !== next) {
        storageArea.set({ [BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY]: next });
      }
    });
    storageArea.get([OVERLAY_TAB_PRIORITY_STORAGE_KEY], (result) => {
      const rawValue = result[OVERLAY_TAB_PRIORITY_STORAGE_KEY];
      const stored = normalizeOverlayTabQuickSwitch(rawValue);
      if (overlayTabQuickSwitchToggle) {
        overlayTabQuickSwitchToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [OVERLAY_TAB_PRIORITY_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY], (result) => {
      const rawValue = result[NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY];
      const stored = normalizeNewtabWordmarkVisible(rawValue);
      if (newtabWordmarkToggle) {
        newtabWordmarkToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY], (result) => {
      const rawValue = result[NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY];
      const stored = normalizeNewtabShortcutsVisible(rawValue);
      if (newtabShortcutsToggle) {
        newtabShortcutsToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([UPDATE_NOTICE_ENABLED_STORAGE_KEY], (result) => {
      const rawValue = result[UPDATE_NOTICE_ENABLED_STORAGE_KEY];
      const stored = normalizeUpdateNoticeEnabled(rawValue);
      if (updateNoticeToggle) {
        updateNoticeToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [UPDATE_NOTICE_ENABLED_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([AUTO_PIP_ENABLED_STORAGE_KEY], (result) => {
      const rawValue = result[AUTO_PIP_ENABLED_STORAGE_KEY];
      const stored = normalizeAutoPipEnabled(rawValue);
      if (autoPipToggle) {
        autoPipToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [AUTO_PIP_ENABLED_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([TAB_SWITCHER_ENABLED_STORAGE_KEY], (result) => {
      const rawValue = result[TAB_SWITCHER_ENABLED_STORAGE_KEY];
      const stored = normalizeTabSwitcherEnabled(rawValue);
      if (tabSwitcherToggle) {
        tabSwitcherToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [TAB_SWITCHER_ENABLED_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([DOCUMENT_PIP_ENABLED_STORAGE_KEY], (result) => {
      const rawValue = result[DOCUMENT_PIP_ENABLED_STORAGE_KEY];
      const stored = normalizeDocumentPipEnabled(rawValue);
      if (documentPipToggle) {
        documentPipToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [DOCUMENT_PIP_ENABLED_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });
    storageArea.get([PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY], (result) => {
      const rawValue = result[PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY];
      const stored = normalizePinnedTabRecoveryEnabled(rawValue);
      if (pinnedTabRecoveryToggle) {
        pinnedTabRecoveryToggle.checked = stored;
      }
      if (rawValue !== stored) {
        storageArea.set({ [PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY]: stored });
      }
      refreshCustomSelects();
    });

    storageArea.get([RESTRICTED_ACTION_STORAGE_KEY], (result) => {
      const stored = result[RESTRICTED_ACTION_STORAGE_KEY];
      const normalizedStored = stored === 'lumno' ? 'default' : stored;
      const hasStored = normalizedStored === 'default' || normalizedStored === 'none';
      const nextAction = hasStored ? normalizedStored : 'default';
      if (restrictedActionSelect) {
        restrictedActionSelect.value = nextAction;
      }
      setRestrictedActionTabState(nextAction);
      if (!hasStored || normalizedStored !== stored) {
        storageArea.set({ [RESTRICTED_ACTION_STORAGE_KEY]: nextAction });
      }
      refreshCustomSelects();
    });
  }

  refreshCustomSelects();

  document.addEventListener('click', (event) => {
    if (!activePopconfirm) {
      return;
    }
    const wrap = activePopconfirm.closest('._x_extension_popconfirm_wrap_2024_unique_');
    if (wrap && wrap.contains(event.target)) {
      return;
    }
    closeActivePopconfirm();
  });

  function resetSiteSearchForm() {
    if (siteSearchKeyInput) siteSearchKeyInput.value = '';
    if (siteSearchNameInput) siteSearchNameInput.value = '';
    if (siteSearchTemplateInput) siteSearchTemplateInput.value = '';
    if (siteSearchAliasInput) siteSearchAliasInput.value = '';
    setSiteSearchError('');
    setEditingState(null);
    setSiteSearchFormExpanded(false);
  }

  setSiteSearchFormExpanded(false);
  setBlacklistFormExpanded(false);

  function renderSiteSearchList() {
    if (!siteSearchCustomList || !siteSearchBuiltinList) {
      return;
    }
    siteSearchCustomList.innerHTML = '';
    siteSearchBuiltinList.innerHTML = '';
    if (siteSearchAiBuiltinList) {
      siteSearchAiBuiltinList.innerHTML = '';
    }
    const builtinRowByTemplate = new Map();
    const customKeys = new Set(customSiteSearchProviders.map((item) => String(item.key || '').toLowerCase()));
    const displayDefaults = defaultSiteSearchProviders.filter((item) => {
      const key = String(item.key || '').toLowerCase();
      return key && !customKeys.has(key) && !disabledSiteSearchKeys.has(key);
    });
    const displayAiDefaults = displayDefaults.filter((item) => isAiSiteSearchProvider(item));
    const displaySearchDefaults = displayDefaults.filter((item) => !isAiSiteSearchProvider(item));
    const builtinTemplateSet = new Set(defaultSiteSearchProviders.map((item) => normalizeSiteSearchTemplate(String(item.template || '').trim())).filter(Boolean));
    function getLocalizedBuiltinProviderName(item) {
      if (!item || item._xIsCustom) {
        return item && (item.name || item.key) ? (item.name || item.key) : '';
      }
      const mapping = typeof SEARCH_UTILS.getSiteSearchProviderDisplayNameMessage === 'function'
        ? SEARCH_UTILS.getSiteSearchProviderDisplayNameMessage(item)
        : null;
      if (!mapping) {
        return item.name || item.key;
      }
      return getMessage(mapping.messageKey, mapping.fallback);
    }
    function getSiteSearchItemIconUrl(item) {
      if (!item) {
        return '';
      }
      if (item.icon) {
        return String(item.icon || '').trim();
      }
      if (item.iconUrl) {
        return String(item.iconUrl || '').trim();
      }
      try {
        const template = normalizeSiteSearchTemplate(String(item.template || '').trim());
        const url = template.replace(/\{query\}/g, 'test');
        const hostname = new URL(url).hostname;
        return hostname
          ? `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(`https://${hostname}/`)}&size=64`
          : '';
      } catch (error) {
        return '';
      }
    }
    const renderItem = (item, list) => {
      const row = document.createElement('div');
      row.className = '_x_extension_shortcut_item_2024_unique_';
      row.setAttribute('data-expanded', 'false');
      row.dataset.key = item.key || '';
      row.dataset.type = item._xIsCustom ? 'custom' : 'builtin';
      const normalizedTemplate = normalizeSiteSearchTemplate(String(item.template || '').trim());
      if (!item._xIsCustom && normalizedTemplate) {
        row.dataset.template = normalizedTemplate;
        builtinRowByTemplate.set(normalizedTemplate, row);
      }
      const header = document.createElement('div');
      header.className = '_x_extension_shortcut_item_header_2024_unique_';
      const info = document.createElement('div');
      info.className = '_x_extension_shortcut_item_info_2024_unique_';
      const title = document.createElement('div');
      title.className = '_x_extension_shortcut_item_title_2024_unique_';
      const badge = document.createElement('div');
      badge.className = '_x_extension_shortcut_badge_2024_unique_';
      badge.textContent = item._xIsCustom
        ? getMessage('shortcuts_badge_custom', '自定义')
        : isAiSiteSearchProvider(item)
          ? getMessage('shortcuts_badge_ai', 'AI')
          : getMessage('shortcuts_badge_builtin', '内置');
      const titleText = document.createElement('span');
      titleText.textContent = getLocalizedBuiltinProviderName(item);
      title.appendChild(badge);
      const iconUrl = getSiteSearchItemIconUrl(item);
      if (iconUrl) {
        const icon = document.createElement('img');
        icon.className = '_x_extension_shortcut_item_icon_2024_unique_';
        icon.decoding = 'async';
        icon.loading = 'lazy';
        icon.referrerPolicy = 'no-referrer';
        icon.alt = '';
        icon.src = iconUrl;
        icon.addEventListener('error', () => {
          icon.remove();
        }, { once: true });
        title.appendChild(icon);
      }
      if (item._xIsCustom && normalizedTemplate && builtinTemplateSet.has(normalizedTemplate)) {
        const duplicateTag = document.createElement('button');
        duplicateTag.type = 'button';
        duplicateTag.className = '_x_extension_shortcut_badge_2024_unique_ _x_extension_shortcut_badge_warn_2024_unique_';
        duplicateTag.setAttribute('data-template', normalizedTemplate);
        duplicateTag.setAttribute('data-tooltip', getMessage('shortcuts_duplicate_action', '定位内置项'));
        duplicateTag.setAttribute('aria-label', getMessage('shortcuts_duplicate_action', '定位内置项'));
        duplicateTag.innerHTML = `${getRiSvg('ri-question-line', 'ri-size-12')}${getMessage('shortcuts_duplicate_tag', '与内置重复')}`;
        duplicateTag.addEventListener('click', (event) => {
          event.stopPropagation();
          const targetRow = builtinRowByTemplate.get(normalizedTemplate);
          if (!targetRow) {
            return;
          }
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRow.removeAttribute('data-flash');
          void targetRow.offsetWidth;
          targetRow.setAttribute('data-flash', 'true');
          const onFlashEnd = () => {
            targetRow.removeAttribute('data-flash');
            targetRow.removeEventListener('animationend', onFlashEnd);
          };
          targetRow.addEventListener('animationend', onFlashEnd);
        });
        title.appendChild(duplicateTag);
      }
      title.appendChild(titleText);
      const meta = document.createElement('div');
      meta.className = '_x_extension_shortcut_item_meta_2024_unique_';
      meta.textContent = `${item.key} · ${item.template || ''}`;
      info.appendChild(title);
      info.appendChild(meta);
      const actions = document.createElement('div');
      actions.className = '_x_extension_shortcut_item_actions_2024_unique_';
      const editButton = document.createElement('button');
      editButton.className = '_x_extension_shortcut_edit_2024_unique_';
      editButton.innerHTML = getRiSvg('ri-edit-line', 'ri-size-14');
      editButton.dataset.editKey = item.key || '';
      editButton.dataset.editType = item._xIsCustom ? 'custom' : 'builtin';
      actions.appendChild(editButton);
      const removeButton = document.createElement('button');
      removeButton.className = '_x_extension_shortcut_remove_2024_unique_';
      removeButton.innerHTML = getRiSvg('ri-delete-bin-4-line', 'ri-size-14');
      removeButton.setAttribute('aria-label', getMessage('shortcuts_remove', '移除'));
      actions.appendChild(removeButton);
      const popconfirm = document.createElement('div');
      popconfirm.className = '_x_extension_popconfirm_2024_unique_';
      popconfirm.setAttribute('data-open', 'false');
      const popText = document.createElement('div');
      popText.className = '_x_extension_popconfirm_text_2024_unique_';
      popText.textContent = getMessage('confirm_remove_item', '确认移除该项？');
      const popActions = document.createElement('div');
      popActions.className = '_x_extension_popconfirm_actions_2024_unique_';
      const popCancel = document.createElement('button');
      popCancel.className = SECONDARY_BUTTON_CLASS_NAME;
      popCancel.textContent = getMessage('confirm_cancel', '取消');
      const popOk = document.createElement('button');
      popOk.className = '_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_';
      popOk.textContent = getMessage('confirm_ok', '确认');
      popActions.appendChild(popCancel);
      popActions.appendChild(popOk);
      popconfirm.appendChild(popText);
      popconfirm.appendChild(popActions);
      const popWrap = document.createElement('div');
      popWrap.className = '_x_extension_popconfirm_wrap_2024_unique_';
      popWrap.appendChild(removeButton);
      popWrap.appendChild(popconfirm);
      actions.appendChild(popWrap);
      header.appendChild(info);
      header.appendChild(actions);
      row.appendChild(header);
      const editor = document.createElement('div');
      editor.className = '_x_extension_shortcut_editor_2024_unique_';
      const templateField = document.createElement('div');
      templateField.className = '_x_extension_shortcut_field_2024_unique_';
      const templateLabelRow = document.createElement('div');
      templateLabelRow.className = '_x_extension_shortcut_label_row_2024_unique_';
      const templateLabel = document.createElement('label');
      templateLabel.className = '_x_extension_shortcut_label_2024_unique_';
      const templateLabelText = document.createElement('span');
      templateLabelText.setAttribute('data-i18n', 'shortcuts_label_template');
      templateLabelText.textContent = getMessage('shortcuts_label_template', '搜索模板');
      const templateRequired = document.createElement('span');
      templateRequired.className = '_x_extension_shortcut_required_2024_unique_';
      templateRequired.textContent = '*';
      const templateHint = document.createElement('span');
      templateHint.className = '_x_extension_shortcut_hint_2024_unique_ _x_extension_shortcut_group_action_2024_unique_';
      templateHint.setAttribute('data-tooltip', getMessage(
        'shortcuts_template_help',
        '1.打开你想添加的网站\n2.输入任一搜索词，触发搜索\n3.将搜索结果页面 url 粘贴在此处\n4.将关键词替换为{query}'
      ));
      templateHint.setAttribute('aria-label', getMessage(
        'shortcuts_template_help',
        '1.打开你想添加的网站\n2.输入任一搜索词，触发搜索\n3.将搜索结果页面 url 粘贴在此处\n4.将关键词替换为{query}'
      ));
      templateHint.innerHTML = getRiSvg('ri-question-line', 'ri-size-14');
      templateLabel.appendChild(templateLabelText);
      templateLabel.appendChild(templateRequired);
      templateLabelRow.appendChild(templateLabel);
      templateLabelRow.appendChild(templateRequired);
      templateLabelRow.appendChild(templateHint);
      const templateInput = document.createElement('input');
      templateInput.className = '_x_extension_shortcut_input_2024_unique_';
      templateInput.value = item.template || '';
      templateInput.disabled = !item._xIsCustom;
      templateField.appendChild(templateLabelRow);
      templateField.appendChild(templateInput);

      const keyField = document.createElement('div');
      keyField.className = '_x_extension_shortcut_field_2024_unique_';
      const keyLabel = document.createElement('label');
      keyLabel.className = '_x_extension_shortcut_label_2024_unique_';
      const keyLabelText = document.createElement('span');
      keyLabelText.setAttribute('data-i18n', 'shortcuts_label_key');
      keyLabelText.textContent = getMessage('shortcuts_label_key', '触发词');
      const keyRequired = document.createElement('span');
      keyRequired.className = '_x_extension_shortcut_required_2024_unique_';
      keyRequired.textContent = '*';
      keyLabel.appendChild(keyLabelText);
      keyLabel.appendChild(keyRequired);
      const keyInput = document.createElement('input');
      keyInput.className = '_x_extension_shortcut_input_2024_unique_';
      keyInput.value = item.key || '';
      keyInput.placeholder = getMessage('shortcuts_placeholder_required', '必填，如有多个用英文逗号分隔，如 jd,bili');
      keyField.appendChild(keyLabel);
      keyField.appendChild(keyInput);

      const nameField = document.createElement('div');
      nameField.className = '_x_extension_shortcut_field_2024_unique_';
      const nameLabel = document.createElement('label');
      nameLabel.className = '_x_extension_shortcut_label_2024_unique_';
      nameLabel.textContent = getMessage('shortcuts_label_name', '显示名称');
      const nameInput = document.createElement('input');
      nameInput.className = '_x_extension_shortcut_input_2024_unique_';
      nameInput.value = item.name || item.key || '';
      nameInput.placeholder = getMessage('shortcuts_placeholder_optional_default', '选填，默认使用触发词');
      nameField.appendChild(nameLabel);
      nameField.appendChild(nameInput);

      const aliasField = document.createElement('div');
      aliasField.className = '_x_extension_shortcut_field_2024_unique_';
      const aliasLabel = document.createElement('label');
      aliasLabel.className = '_x_extension_shortcut_label_2024_unique_';
      const aliasLabelText = document.createElement('span');
      aliasLabelText.setAttribute('data-i18n', 'shortcuts_label_alias');
      aliasLabelText.textContent = getMessage('shortcuts_label_alias', '别名');
      const aliasRequired = document.createElement('span');
      aliasRequired.className = '_x_extension_shortcut_required_2024_unique_';
      aliasRequired.textContent = '*';
      aliasLabel.appendChild(aliasLabelText);
      aliasLabel.appendChild(aliasRequired);
      const aliasInput = document.createElement('input');
      aliasInput.className = '_x_extension_shortcut_input_2024_unique_';
      aliasInput.value = Array.isArray(item.aliases) ? item.aliases.join(',') : '';
      aliasInput.placeholder = getMessage('shortcuts_placeholder_alias', '选填，例如 小破站、油管等');
      aliasField.appendChild(aliasLabel);
      aliasField.appendChild(aliasInput);

      const editorActions = document.createElement('div');
      editorActions.className = '_x_extension_shortcut_editor_actions_2024_unique_';
      const saveButton = document.createElement('button');
      saveButton.className = '_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_';
      saveButton.textContent = getMessage('shortcuts_save', '保存修改');
      const cancelButton = document.createElement('button');
      cancelButton.className = SECONDARY_BUTTON_CLASS_NAME;
      cancelButton.textContent = getMessage('shortcuts_cancel', '取消');
      editorActions.appendChild(cancelButton);
      editorActions.appendChild(saveButton);
      attachSaveButtonAnimation(saveButton);

      cancelButton.addEventListener('click', () => {
        row.setAttribute('data-expanded', 'false');
      });
      saveButton.addEventListener('click', () => {
        suspendSiteSearchRefresh(260);
        const nextKeyRaw = String(keyInput.value || '').trim();
        const isBuiltinAiProvider = !item._xIsCustom && isAiSiteSearchProvider(item);
        if (!nextKeyRaw) {
          showToast(getMessage('shortcuts_error_key', '请填写触发词'), true);
          return;
        }
        if (/\s/.test(nextKeyRaw)) {
          showToast(getMessage('shortcuts_error_key_space', '触发词不能包含空格'), true);
          return;
        }
        const templateRaw = String(templateInput.value || '').trim();
        const template = normalizeSiteSearchTemplate(templateRaw);
        if (!template || (!isBuiltinAiProvider && !template.includes('{query}'))) {
          showToast(getMessage('toast_error_template', '搜索模板必须包含 {query}'), true);
          return;
        }
        const aliases = normalizeAliases(aliasInput.value || '');
        const normalizedKey = nextKeyRaw.toLowerCase();
        let next = customSiteSearchProviders.filter((entry) => String(entry.key || '').toLowerCase() !== normalizedKey);
        const previousKey = String(item.key || '').toLowerCase();
        if (previousKey && previousKey !== normalizedKey) {
          next = next.filter((entry) => String(entry.key || '').toLowerCase() !== previousKey);
        }
        const shouldDisable = item._xIsCustom && isDuplicateTemplate(template, defaultSiteSearchProviders);
        const nextItem = normalizeSiteSearchProvider({
          ...item,
          key: nextKeyRaw,
          name: String(nameInput.value || '').trim() || nextKeyRaw,
          template: template,
          aliases: aliases,
          disabled: shouldDisable,
          disabledReason: shouldDisable ? 'duplicate' : ''
        });
        if (!nextItem) {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
          return;
        }
        next.unshift(nextItem);
        disabledSiteSearchKeys.delete(normalizedKey);
        Promise.all([
          saveCustomSiteSearchProviders(next),
          saveDisabledSiteSearchKeys(disabledSiteSearchKeys)
        ]).then(() => {
          customSiteSearchProviders = next;
          row.setAttribute('data-expanded', 'false');
          const finalize = () => {
            showToast(getMessage('toast_saved', '已保存'), false);
          };
          if (saveButton.classList.contains('_x_extension_shortcut_save_2024_unique_')) {
            setTimeout(finalize, 220);
          } else {
            finalize();
          }
        }).catch(() => {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        });
      });

      editor.appendChild(templateField);
      editor.appendChild(keyField);
      editor.appendChild(nameField);
      editor.appendChild(aliasField);
      editor.appendChild(editorActions);
      row.appendChild(editor);
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (activePopconfirm && activePopconfirm !== popconfirm) {
          closeActivePopconfirm();
        }
        const isOpen = popconfirm.getAttribute('data-open') === 'true';
        if (isOpen) {
          popconfirm.setAttribute('data-open', 'false');
          activePopconfirm = null;
        } else {
          popconfirm.setAttribute('data-open', 'true');
          activePopconfirm = popconfirm;
        }
      });
      popCancel.addEventListener('click', (event) => {
        event.stopPropagation();
        popconfirm.setAttribute('data-open', 'false');
        if (activePopconfirm === popconfirm) {
          activePopconfirm = null;
        }
      });
      popOk.addEventListener('click', (event) => {
        event.stopPropagation();
        popconfirm.setAttribute('data-open', 'false');
        if (activePopconfirm === popconfirm) {
          activePopconfirm = null;
        }
        removeSiteSearchItem(item.key || '', !item._xIsCustom);
      });
      list.appendChild(row);
    };
    if (customSiteSearchProviders.length === 0) {
      // 保留虚线添加框即可
    } else {
      customSiteSearchProviders.forEach((item) => {
        renderItem({ ...item, _xIsCustom: true }, siteSearchCustomList);
      });
    }
    if (displaySearchDefaults.length === 0) {
      const empty = document.createElement('div');
      empty.className = '_x_extension_settings_placeholder_2024_unique_';
      empty.textContent = getMessage('shortcuts_empty_builtin', '暂无内置站内搜索');
      siteSearchBuiltinList.appendChild(empty);
    } else {
      displaySearchDefaults.forEach((item) => {
        renderItem({ ...item, _xIsCustom: false }, siteSearchBuiltinList);
      });
    }
    if (siteSearchAiBuiltinList) {
      if (displayAiDefaults.length === 0) {
        const empty = document.createElement('div');
        empty.className = '_x_extension_settings_placeholder_2024_unique_';
        empty.textContent = getMessage('shortcuts_empty_ai', '暂无内置 AI');
        siteSearchAiBuiltinList.appendChild(empty);
      } else {
        displayAiDefaults.forEach((item) => {
          renderItem({ ...item, _xIsCustom: false }, siteSearchAiBuiltinList);
        });
      }
    }
    initTooltips();
    if (pendingOptionsScrollTarget && scrollToOptionsTarget(pendingOptionsScrollTarget, { behavior: 'auto' })) {
      pendingOptionsScrollTarget = '';
    }
  }

  function loadDefaultSiteSearchProviders() {
    const localUrl = chrome && chrome.runtime && typeof chrome.runtime.getURL === 'function'
      ? chrome.runtime.getURL('assets/data/site-search.json')
      : '../../assets/data/site-search.json';
    return fetch(localUrl)
      .then((resp) => resp.json())
      .then((data) => {
        const items = data && Array.isArray(data.items) ? data.items : [];
        const source = items.length > 0 ? items : fallbackSiteSearchProviders;
        return source.map((item) => normalizeSiteSearchProvider(item)).filter(Boolean);
      })
      .catch(() => new Promise((resolve) => {
        if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
          resolve(fallbackSiteSearchProviders.slice());
          return;
        }
        chrome.runtime.sendMessage({ action: 'getSiteSearchProviders' }, (response) => {
          const items = response && Array.isArray(response.items) ? response.items : [];
          const source = items.length > 0 ? items : fallbackSiteSearchProviders;
          resolve(source.map((item) => normalizeSiteSearchProvider(item)).filter(Boolean));
        });
      }));
  }

  function normalizeAliasList(list) {
    const items = Array.isArray(list) ? list : [];
    const cleaned = items
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(cleaned)).sort();
  }

  function isSameProviderContent(a, b) {
    if (!a || !b) {
      return false;
    }
    const nameA = String(a.name || a.key || '').trim();
    const nameB = String(b.name || b.key || '').trim();
    const templateA = normalizeSiteSearchTemplate(String(a.template || '').trim());
    const templateB = normalizeSiteSearchTemplate(String(b.template || '').trim());
    if (nameA !== nameB || templateA !== templateB) {
      return false;
    }
    const aliasA = normalizeAliasList(a.aliases);
    const aliasB = normalizeAliasList(b.aliases);
    return JSON.stringify(aliasA) === JSON.stringify(aliasB);
  }

  function filterRedundantCustomProviders(defaults, custom) {
    const map = new Map((defaults || []).map((item) => [String(item.key || '').toLowerCase(), item]));
    return (custom || []).filter((item) => {
      const key = String(item.key || '').toLowerCase();
      const base = map.get(key);
      if (!base) {
        return true;
      }
      return !isSameProviderContent(item, base);
    });
  }

  function loadCustomSiteSearchProviders(baseItems) {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve([]);
        return;
      }
      storageArea.get([SITE_SEARCH_STORAGE_KEY], (result) => {
        const items = Array.isArray(result[SITE_SEARCH_STORAGE_KEY]) ? result[SITE_SEARCH_STORAGE_KEY] : [];
        const baseMap = new Map((baseItems || []).map((item) => [
          String(item && item.key ? item.key : '').toLowerCase(),
          item
        ]));
        resolve(items.map((item) => {
          const key = String(item && item.key ? item.key : '').toLowerCase();
          return normalizeSiteSearchProvider(item, baseMap.get(key));
        }).filter(Boolean));
      });
    });
  }

  function loadDisabledSiteSearchKeys() {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve([]);
        return;
      }
      storageArea.get([SITE_SEARCH_DISABLED_STORAGE_KEY], (result) => {
        const items = Array.isArray(result[SITE_SEARCH_DISABLED_STORAGE_KEY])
          ? result[SITE_SEARCH_DISABLED_STORAGE_KEY]
          : [];
        resolve(items.map((item) => String(item).toLowerCase()).filter(Boolean));
      });
    });
  }

  function saveDisabledSiteSearchKeys(keys) {
    const payload = Array.from(keys || [])
      .map((item) => String(item).toLowerCase())
      .filter(Boolean);
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve();
        return;
      }
      storageArea.set({ [SITE_SEARCH_DISABLED_STORAGE_KEY]: payload }, () => resolve());
    });
  }

  function saveCustomSiteSearchProviders(items) {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve();
        return;
      }
      const payload = (items || []).map((item) => normalizeSiteSearchProvider(item)).filter(Boolean);
      storageArea.set({ [SITE_SEARCH_STORAGE_KEY]: payload }, () => resolve());
    });
  }

  function loadSearchBlacklistItems() {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve([]);
        return;
      }
      storageArea.get([SEARCH_BLACKLIST_STORAGE_KEY], (result) => {
        resolve(normalizeSearchBlacklistItems(result && result[SEARCH_BLACKLIST_STORAGE_KEY]));
      });
    });
  }

  function saveSearchBlacklistItems(items) {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve([]);
        return;
      }
      const normalized = normalizeSearchBlacklistItems(items);
      storageArea.set({ [SEARCH_BLACKLIST_STORAGE_KEY]: normalized }, () => resolve(normalized));
    });
  }

  function loadFaviconRequestBlacklistItems() {
    return new Promise((resolve) => {
      if (!storageArea) {
        resolve([]);
        return;
      }
      storageArea.get([FAVICON_REQUEST_BLACKLIST_STORAGE_KEY], (result) => {
        resolve(normalizeFaviconRequestBlacklistItems(result && result[FAVICON_REQUEST_BLACKLIST_STORAGE_KEY]));
      });
    });
  }

  function saveFaviconRequestBlacklistItems(items) {
    return new Promise((resolve) => {
      const normalized = normalizeFaviconRequestBlacklistItems(items);
      if (!storageArea) {
        resolve(normalized);
        return;
      }
      storageArea.set({ [FAVICON_REQUEST_BLACKLIST_STORAGE_KEY]: normalized }, () => resolve(normalized));
    });
  }

  function renderFaviconRequestBlacklistList() {
    if (!faviconBlacklistList) {
      return;
    }
    faviconBlacklistList.innerHTML = '';
    (Array.isArray(faviconRequestBlacklistItems) ? faviconRequestBlacklistItems : []).forEach((item) => {
      const itemKey = buildBlacklistItemKey(item);
      const row = document.createElement('div');
      row.className = '_x_extension_shortcut_item_2024_unique_';
      const header = document.createElement('div');
      header.className = '_x_extension_shortcut_item_header_2024_unique_';
      const info = document.createElement('div');
      info.className = '_x_extension_shortcut_item_info_2024_unique_';
      const title = document.createElement('div');
      title.className = '_x_extension_shortcut_item_title_2024_unique_';
      const badge = document.createElement('div');
      const badgeConfig = getBlacklistMatchBadgeConfig(item.matchModes);
      badge.className = '_x_extension_shortcut_badge_2024_unique_';
      badge.setAttribute('data-tone', badgeConfig.tone);
      badge.textContent = badgeConfig.text;
      const titleText = document.createElement('span');
      titleText.textContent = formatBlacklistPatternForDisplay(item);
      title.appendChild(badge);
      title.appendChild(titleText);
      info.appendChild(title);
      const removeButton = document.createElement('button');
      removeButton.className = '_x_extension_shortcut_remove_2024_unique_';
      removeButton.type = 'button';
      removeButton.innerHTML = getRiSvg('ri-delete-bin-4-line', 'ri-size-14');
      removeButton.setAttribute('aria-label', getMessage('shortcuts_remove', '移除'));
      removeButton.addEventListener('click', () => {
        const nextItems = faviconRequestBlacklistItems.filter((entry) => buildBlacklistItemKey(entry) !== itemKey);
        saveFaviconRequestBlacklistItems(nextItems).then((savedItems) => {
          faviconRequestBlacklistItems = savedItems;
          renderFaviconRequestBlacklistList();
          showToast(getMessage('favicon_blacklist_removed_toast', '已移除排除规则'), false);
        }).catch(() => showToast(getMessage('toast_error', '操作失败，请重试'), true));
      });
      header.appendChild(info);
      header.appendChild(removeButton);
      row.appendChild(header);
      faviconBlacklistList.appendChild(row);
    });
  }

  function renderSearchBlacklistList() {
    if (!blacklistList) {
      return;
    }
    blacklistList.innerHTML = '';
    if (!Array.isArray(searchBlacklistItems) || searchBlacklistItems.length === 0) {
      // 保留输入区域即可，和站内搜索空状态保持一致
      return;
    }
    searchBlacklistItems.forEach((item) => {
      const itemKey = buildBlacklistItemKey(item);
      const row = document.createElement('div');
      row.className = '_x_extension_shortcut_item_2024_unique_';
      row.setAttribute('data-expanded', 'false');
      const header = document.createElement('div');
      header.className = '_x_extension_shortcut_item_header_2024_unique_';
      const info = document.createElement('div');
      info.className = '_x_extension_shortcut_item_info_2024_unique_';
      const title = document.createElement('div');
      title.className = '_x_extension_shortcut_item_title_2024_unique_';
      const badge = document.createElement('div');
      badge.className = '_x_extension_shortcut_badge_2024_unique_';
      const badgeConfig = getBlacklistMatchBadgeConfig(item.matchModes);
      badge.setAttribute('data-tone', badgeConfig.tone);
      badge.textContent = badgeConfig.text;
      const titleText = document.createElement('span');
      titleText.textContent = formatBlacklistPatternForDisplay(item);
      title.appendChild(badge);
      title.appendChild(titleText);
      info.appendChild(title);
      const actions = document.createElement('div');
      actions.className = '_x_extension_shortcut_item_actions_2024_unique_';
      const editButton = document.createElement('button');
      editButton.className = '_x_extension_shortcut_edit_2024_unique_';
      editButton.innerHTML = getRiSvg('ri-edit-line', 'ri-size-14');
      editButton.setAttribute('aria-label', getMessage('shortcuts_edit', '编辑'));
      const removeButton = document.createElement('button');
      removeButton.className = '_x_extension_shortcut_remove_2024_unique_';
      removeButton.innerHTML = getRiSvg('ri-delete-bin-4-line', 'ri-size-14');
      removeButton.setAttribute('aria-label', getMessage('shortcuts_remove', '移除'));
      const popconfirm = document.createElement('div');
      popconfirm.className = '_x_extension_popconfirm_2024_unique_';
      popconfirm.setAttribute('data-open', 'false');
      const popText = document.createElement('div');
      popText.className = '_x_extension_popconfirm_text_2024_unique_';
      popText.textContent = getMessage('confirm_remove_item', '确认移除该项？');
      const popActions = document.createElement('div');
      popActions.className = '_x_extension_popconfirm_actions_2024_unique_';
      const popCancel = document.createElement('button');
      popCancel.className = SECONDARY_BUTTON_CLASS_NAME;
      popCancel.textContent = getMessage('confirm_cancel', '取消');
      const popOk = document.createElement('button');
      popOk.className = '_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_';
      popOk.textContent = getMessage('confirm_ok', '确认');
      popActions.appendChild(popCancel);
      popActions.appendChild(popOk);
      popconfirm.appendChild(popText);
      popconfirm.appendChild(popActions);
      const popWrap = document.createElement('div');
      popWrap.className = '_x_extension_popconfirm_wrap_2024_unique_';
      popWrap.appendChild(removeButton);
      popWrap.appendChild(popconfirm);
      actions.appendChild(editButton);
      actions.appendChild(popWrap);
      header.appendChild(info);
      header.appendChild(actions);
      row.appendChild(header);

      const editor = document.createElement('div');
      editor.className = '_x_extension_shortcut_editor_2024_unique_';

      const urlField = document.createElement('div');
      urlField.className = '_x_extension_shortcut_field_2024_unique_';
      const urlLabel = document.createElement('div');
      urlLabel.className = '_x_extension_shortcut_label_2024_unique_';
      const urlLabelText = document.createElement('span');
      const urlRequired = document.createElement('span');
      urlRequired.className = '_x_extension_shortcut_required_2024_unique_';
      urlRequired.textContent = '*';
      urlLabel.appendChild(urlLabelText);
      urlLabel.appendChild(urlRequired);
      const urlAffix = document.createElement('div');
      urlAffix.className = '_x_extension_shortcut_input_affix_2026_unique_';
      const urlPrefix = document.createElement('span');
      urlPrefix.className = '_x_extension_shortcut_input_prefix_2026_unique_';
      const urlInput = document.createElement('input');
      urlInput.className = '_x_extension_shortcut_input_2024_unique_';
      urlInput.value = getBlacklistPatternInputValue(item);
      urlAffix.appendChild(urlPrefix);
      urlAffix.appendChild(urlInput);
      urlField.appendChild(urlLabel);
      urlField.appendChild(urlAffix);

      const matchField = document.createElement('div');
      matchField.className = '_x_extension_shortcut_field_2024_unique_';
      const matchLabel = document.createElement('div');
      matchLabel.className = '_x_extension_shortcut_label_2024_unique_';
      matchLabel.textContent = getMessage('blacklist_match_label', '匹配方式');
      const matchModes = document.createElement('div');
      matchModes.className = CHECKBOX_GROUP_CLASS_NAME;
      matchModes.setAttribute('data-align', 'start');
      matchModes.setAttribute('data-gap', 'wide');

      function createModeOption(mode, textKey, fallback, tooltipKey, tooltipFallback) {
        const wrap = document.createElement('label');
        wrap.className = CHECKBOX_CLASS_NAME;
        const input = document.createElement('input');
        input.type = 'checkbox';
        const text = document.createElement('span');
        text.textContent = getMessage(textKey, fallback);
        const hint = document.createElement('span');
        hint.className = '_x_extension_shortcut_hint_2024_unique_ _x_extension_tooltip_host_2024_unique_';
        hint.setAttribute('data-tooltip', getMessage(tooltipKey, tooltipFallback));
        hint.innerHTML = getRiSvg('ri-question-line', 'ri-size-14');
        wrap.appendChild(input);
        wrap.appendChild(text);
        wrap.appendChild(hint);
        return { wrap, input };
      }

      const exactOption = createModeOption(
        'exact',
        'blacklist_match_exact',
        '当前页面',
        'blacklist_match_exact_tooltip',
        '只屏蔽这一页\n────────\n例如，填 x.com/home 后，只有这一页不会出现，其他页面不受影响'
      );
      const prefixOption = createModeOption(
        'prefix',
        'blacklist_match_prefix',
        '当前站点路径',
        'blacklist_match_prefix_tooltip',
        '只屏蔽这个站点下这一路径的页面\n────────\n例如，填 baidu.com/search 后，baidu.com/search 和 baidu.com/search/1 不会出现，但 baidu.com/news 不受影响'
      );
      const suffixOption = createModeOption(
        'suffix',
        'blacklist_match_suffix',
        '整个网站',
        'blacklist_match_suffix_tooltip',
        '屏蔽这个网站的所有页面，也包括它的子网站\n────────\n例如，填 baidu.com 后，baidu.com/search 和 tieba.baidu.com 都不会出现'
      );
      matchModes.appendChild(suffixOption.wrap);
      matchModes.appendChild(exactOption.wrap);
      matchModes.appendChild(prefixOption.wrap);
      matchField.appendChild(matchLabel);
      matchField.appendChild(matchModes);

      const editorError = document.createElement('div');
      editorError.className = '_x_extension_shortcut_error_2024_unique_';
      editorError.style.display = 'none';
      function setEditorError(message) {
        const text = String(message || '').trim();
        editorError.textContent = text;
        editorError.style.display = text ? 'block' : 'none';
      }

      function getEditorMatchModes() {
        return normalizeBlacklistMatchModes([
          exactOption.input.checked ? 'exact' : '',
          prefixOption.input.checked ? 'prefix' : '',
          suffixOption.input.checked ? 'suffix' : ''
        ], null);
      }

      function syncEditorMatchModeAvailability(changedMode) {
        syncBlacklistModeSelection(
          {
            exact: exactOption.input,
            prefix: prefixOption.input,
            suffix: suffixOption.input
          },
          changedMode,
          {
            exact: exactOption.wrap,
            prefix: prefixOption.wrap,
            suffix: suffixOption.wrap
          },
          (modes) => applyBlacklistInputPresentationToElements(
            urlLabelText,
            urlPrefix,
            urlInput,
            modes
          )
        );
      }

      exactOption.input.addEventListener('change', () => syncEditorMatchModeAvailability('exact'));
      prefixOption.input.addEventListener('change', () => syncEditorMatchModeAvailability('prefix'));
      suffixOption.input.addEventListener('change', () => syncEditorMatchModeAvailability('suffix'));
      urlInput.addEventListener('input', () => {
        setEditorError('');
      });

      const initialModes = normalizeBlacklistMatchModes(item.matchModes);
      exactOption.input.checked = initialModes.includes('exact');
      prefixOption.input.checked = initialModes.includes('prefix');
      suffixOption.input.checked = initialModes.includes('suffix');
      syncEditorMatchModeAvailability();

      const editorActions = document.createElement('div');
      editorActions.className = '_x_extension_shortcut_editor_actions_2024_unique_';
      const cancelButton = document.createElement('button');
      cancelButton.className = SECONDARY_BUTTON_CLASS_NAME;
      cancelButton.textContent = getMessage('shortcuts_cancel', '取消');
      const saveButton = document.createElement('button');
      saveButton.className = '_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_';
      saveButton.textContent = getMessage('shortcuts_save', '保存修改');
      attachSaveButtonAnimation(saveButton);
      cancelButton.addEventListener('click', () => {
        row.setAttribute('data-expanded', 'false');
      });
      saveButton.addEventListener('click', () => {
        const nextModes = getEditorMatchModes();
        if (nextModes.length === 0) {
          setEditorError(getMessage('blacklist_error_match_mode', '请选择至少一种匹配方式'));
          return;
        }
        const nextPattern = normalizeBlacklistPattern(urlInput.value, nextModes);
        if (!nextPattern) {
          const message = nextModes.includes('suffix')
            ? getMessage('blacklist_error_domain', '请输入网站域名')
            : getMessage('blacklist_error_url', '请输入站点域名或完整 URL');
          setEditorError(message);
          return;
        }
        setEditorError('');
        const nextItems = [{ pattern: nextPattern, matchModes: nextModes }].concat(
          searchBlacklistItems.filter((entry) => buildBlacklistItemKey(entry) !== itemKey && entry.pattern !== nextPattern)
        );
        saveSearchBlacklistItems(nextItems).then((savedItems) => {
          searchBlacklistItems = savedItems;
          renderSearchBlacklistList();
          notifyNewtabSectionsRefresh('recent');
          const finalize = () => {
            showToast(getMessage('toast_saved', '已保存'), false);
          };
          if (saveButton.classList.contains('_x_extension_shortcut_save_2024_unique_')) {
            setTimeout(finalize, 220);
          } else {
            finalize();
          }
        }).catch(() => {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        });
      });
      editorActions.appendChild(cancelButton);
      editorActions.appendChild(saveButton);

      editor.appendChild(urlField);
      editor.appendChild(matchField);
      editor.appendChild(editorActions);
      editor.appendChild(editorError);
      row.appendChild(editor);

      editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        row.setAttribute('data-expanded', row.getAttribute('data-expanded') === 'true' ? 'false' : 'true');
      });
      removeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (activePopconfirm && activePopconfirm !== popconfirm) {
          closeActivePopconfirm();
        }
        const isOpen = popconfirm.getAttribute('data-open') === 'true';
        if (isOpen) {
          popconfirm.setAttribute('data-open', 'false');
          activePopconfirm = null;
        } else {
          popconfirm.setAttribute('data-open', 'true');
          activePopconfirm = popconfirm;
        }
      });
      popCancel.addEventListener('click', (event) => {
        event.stopPropagation();
        popconfirm.setAttribute('data-open', 'false');
        if (activePopconfirm === popconfirm) {
          activePopconfirm = null;
        }
      });
      popOk.addEventListener('click', (event) => {
        event.stopPropagation();
        popconfirm.setAttribute('data-open', 'false');
        if (activePopconfirm === popconfirm) {
          activePopconfirm = null;
        }
        const nextItems = searchBlacklistItems.filter((entry) => buildBlacklistItemKey(entry) !== itemKey);
        saveSearchBlacklistItems(nextItems).then((savedItems) => {
          searchBlacklistItems = savedItems;
          renderSearchBlacklistList();
          notifyNewtabSectionsRefresh('recent');
          showToast(getMessage('blacklist_removed_toast', '已从黑名单移除'), false);
          if (blacklistUrlInput) {
            blacklistUrlInput.focus();
          }
        }).catch(() => {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        });
      });
      blacklistList.appendChild(row);
    });
    initTooltips();
  }

  function refreshSiteSearchProviders() {
    if (!siteSearchCustomList || !siteSearchBuiltinList) {
      return;
    }
    if (defaultSiteSearchProviders.length === 0) {
      defaultSiteSearchProviders = fallbackSiteSearchProviders.slice();
      renderSiteSearchList();
    }
    loadDefaultSiteSearchProviders().then((defaults) => Promise.all([
      Promise.resolve(defaults),
      loadCustomSiteSearchProviders(defaults),
      loadDisabledSiteSearchKeys()
    ])).then(([defaults, custom, disabled]) => {
      defaultSiteSearchProviders = defaults;
      const filteredCustom = filterRedundantCustomProviders(defaults, custom);
      const withoutDebug = filteredCustom.filter((item) => String(item.key || '').toLowerCase() !== DEBUG_DUPLICATE_CUSTOM_KEY);
      const didFilter = filteredCustom.length !== (custom || []).length;
      const didRemoveDebug = withoutDebug.length !== filteredCustom.length;
      let nextCustom = withoutDebug.map((item) => {
        const shouldDisable = isDuplicateTemplate(item.template, defaults);
        return {
          ...item,
          disabled: shouldDisable,
          disabledReason: shouldDisable ? 'duplicate' : ''
        };
      });
      const didUpdateDisabled = nextCustom.some((item, index) => {
        const before = filteredCustom[index] || {};
        return Boolean(before.disabled) !== Boolean(item.disabled) ||
          String(before.disabledReason || '') !== String(item.disabledReason || '');
      });
      customSiteSearchProviders = nextCustom;
      disabledSiteSearchKeys = new Set(disabled || []);
      if (didFilter || didUpdateDisabled || didRemoveDebug) {
        saveCustomSiteSearchProviders(nextCustom);
      }
      const filteredBase = defaultSiteSearchProviders.filter((item) => {
        const key = String(item && item.key ? item.key : '').toLowerCase();
        return key && !disabledSiteSearchKeys.has(key);
      });
      if (filteredBase.length === 0 && customSiteSearchProviders.length === 0 && defaultSiteSearchProviders.length > 0) {
        disabledSiteSearchKeys = new Set();
        saveDisabledSiteSearchKeys(disabledSiteSearchKeys);
      }
      renderSiteSearchList();
    });
  }

  if (siteSearchCustomList && siteSearchBuiltinList) {
    refreshSiteSearchProviders();
  }
  if (blacklistList) {
    loadSearchBlacklistItems().then((items) => {
      searchBlacklistItems = items;
      syncBlacklistMatchModeAvailability();
      renderSearchBlacklistList();
    });
  }
  if (faviconBlacklistList) {
    loadFaviconRequestBlacklistItems().then((items) => {
      faviconRequestBlacklistItems = items;
      syncFaviconBlacklistMatchModeAvailability();
      renderFaviconRequestBlacklistList();
    });
  }

  function handleSiteSearchListClick(event) {
      const target = event.target;
      if (!target) {
        return;
      }
      const editTarget = target.closest ? target.closest('button[data-edit-key]') : null;
      if (editTarget) {
        const key = String(editTarget.dataset.editKey || '');
        const isBuiltin = editTarget.dataset.editType === 'builtin';
        const match = isBuiltin
          ? defaultSiteSearchProviders.find((item) => String(item.key || '') === key)
          : customSiteSearchProviders.find((item) => String(item.key || '') === key);
        if (match) {
          const row = editTarget.closest('._x_extension_shortcut_item_2024_unique_');
          if (row) {
            row.setAttribute('data-expanded', row.getAttribute('data-expanded') === 'true' ? 'false' : 'true');
          }
          return;
        }
        return;
      }
      if (target.closest && target.closest('._x_extension_popconfirm_2024_unique_')) {
        return;
      }
    }

  if (siteSearchCustomList) {
    siteSearchCustomList.addEventListener('click', handleSiteSearchListClick);
  }
  if (siteSearchBuiltinList) {
    siteSearchBuiltinList.addEventListener('click', handleSiteSearchListClick);
  }
  if (siteSearchAiBuiltinList) {
    siteSearchAiBuiltinList.addEventListener('click', handleSiteSearchListClick);
  }
  document.addEventListener('click', (event) => {
    if (!activePopconfirm) {
      return;
    }
    if (event.target && event.target.closest && event.target.closest('._x_extension_popconfirm_2024_unique_')) {
      return;
    }
    if (event.target && event.target.closest && event.target.closest('._x_extension_shortcut_remove_2024_unique_')) {
      return;
    }
    closeActivePopconfirm();
  });

  if (siteSearchCancelButton) {
    siteSearchCancelButton.addEventListener('click', function() {
      resetSiteSearchForm();
    });
  }

  if (siteSearchFormTrigger) {
    siteSearchFormTrigger.addEventListener('click', () => {
      setSiteSearchFormExpanded(true);
    });
  }

  if (siteSearchInsertQueryButton) {
    siteSearchInsertQueryButton.addEventListener('click', () => {
      setSiteSearchFormExpanded(true);
      insertSiteSearchQueryToken();
    });
  }

  if (siteSearchAddButton) {
    attachSaveButtonAnimation(siteSearchAddButton);
    siteSearchAddButton.addEventListener('click', function() {
      if (!siteSearchFormExpanded) {
        setSiteSearchFormExpanded(true);
        return;
      }
      suspendSiteSearchRefresh(260);
      setSiteSearchError('');
      const key = String(siteSearchKeyInput ? siteSearchKeyInput.value : '').trim();
      const name = String(siteSearchNameInput ? siteSearchNameInput.value : '').trim();
      const templateRaw = String(siteSearchTemplateInput ? siteSearchTemplateInput.value : '').trim();
      const aliases = normalizeAliases(siteSearchAliasInput ? siteSearchAliasInput.value : '');
      if (!key) {
        setSiteSearchError(getMessage('shortcuts_error_key', '请填写触发词'));
        return;
      }
      if (/\s/.test(key)) {
        setSiteSearchError(getMessage('shortcuts_error_key_space', '触发词不能包含空格'));
        return;
      }
      const template = normalizeSiteSearchTemplate(templateRaw);
      if (!template || !template.includes('{query}')) {
        setSiteSearchError(getMessage('toast_error_template', '搜索模板必须包含 {query}'));
        return;
      }
      const normalizedKey = key.toLowerCase();
      let next = customSiteSearchProviders.filter((item) => String(item.key || '').toLowerCase() !== normalizedKey);
      if (editingSiteSearchKey && editingSiteSearchKey.toLowerCase() !== normalizedKey) {
        next = next.filter((item) => String(item.key || '').toLowerCase() !== editingSiteSearchKey.toLowerCase());
      }
      const nextItem = normalizeSiteSearchProvider({
        key: key,
        name: name || key,
        template: template,
        aliases: aliases
      });
      if (!nextItem) {
        setSiteSearchError(getMessage('toast_error', '操作失败，请重试'));
        return;
      }
      next.unshift(nextItem);
      const lowerKey = normalizedKey;
      disabledSiteSearchKeys.delete(lowerKey);
      Promise.all([
        saveCustomSiteSearchProviders(next),
        saveDisabledSiteSearchKeys(disabledSiteSearchKeys)
      ]).then(() => {
        customSiteSearchProviders = next;
        renderSiteSearchList();
        refreshSiteSearchProviders();
        resetSiteSearchForm();
        setTimeout(() => {
          showToast(getMessage('toast_saved', '已保存'), false);
        }, 220);
      });
    });
  }

  if (builtinResetButton) {
    attachPopconfirm(
      builtinResetButton,
      'confirm_reset_builtin',
      '确认重置内置列表？',
      () => {
        loadDefaultSiteSearchProviders().then((defaults) => Promise.all([
          Promise.resolve(defaults),
          loadCustomSiteSearchProviders(defaults)
        ])).then(([defaults, custom]) => {
          const defaultKeys = new Set((defaults || []).map((item) => String(item.key || '').toLowerCase()));
          const filteredCustom = (custom || []).filter((item) => {
            const key = String(item && item.key ? item.key : '').toLowerCase();
            return key && !defaultKeys.has(key);
          });
          Promise.all([
            saveCustomSiteSearchProviders(filteredCustom),
            saveDisabledSiteSearchKeys(new Set())
          ]).then(() => {
            customSiteSearchProviders = filteredCustom;
            disabledSiteSearchKeys = new Set();
            renderSiteSearchList();
          }).catch(() => {
            showToast(getMessage('toast_error', '操作失败，请重试'), true);
          });
        }).catch(() => {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        });
      }
    );
  }

  if (customClearButton) {
    attachPopconfirm(
      customClearButton,
      'confirm_clear_custom',
      '确认清空自定义搜索？',
      () => {
        saveCustomSiteSearchProviders([]).then(() => {
          customSiteSearchProviders = [];
          renderSiteSearchList();
          showToast(getMessage('toast_cleared', '已清空'), false);
        }).catch(() => {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        });
      }
    );
  }

  if (blacklistClearButton) {
    attachPopconfirm(
      blacklistClearButton,
      'confirm_clear_blacklist',
      '确认清空黑名单？',
      () => {
        saveSearchBlacklistItems([]).then((savedItems) => {
          searchBlacklistItems = savedItems;
          renderSearchBlacklistList();
          resetBlacklistForm();
          notifyNewtabSectionsRefresh('recent');
          showToast(getMessage('toast_cleared', '已清空'), false);
        }).catch(() => {
          showToast(getMessage('toast_error', '操作失败，请重试'), true);
        });
      }
    );
  }
  if (faviconBlacklistClearButton) {
    attachPopconfirm(
      faviconBlacklistClearButton,
      'confirm_clear_favicon_blacklist',
      '确认清空排除规则？',
      () => {
        saveFaviconRequestBlacklistItems([]).then((savedItems) => {
          faviconRequestBlacklistItems = savedItems;
          renderFaviconRequestBlacklistList();
          resetFaviconBlacklistForm();
          showToast(getMessage('toast_cleared', '已清空'), false);
        }).catch(() => showToast(getMessage('toast_error', '操作失败，请重试'), true));
      }
    );
  }
  /*
  if (confirmOk) {
    confirmOk.addEventListener('click', () => closeConfirm(true));
  }
  if (confirmCancel) {
    confirmCancel.addEventListener('click', () => closeConfirm(false));
  }
  if (confirmMask) {
    confirmMask.addEventListener('click', (event) => {
      if (event.target === confirmMask) {
        closeConfirm(false));
      }
    });
  }
  */

  addStorageChangeListener((changes, areaName) => {
    const isPrimaryArea = Boolean(storageAreaName) && areaName === storageAreaName;
    if (!isPrimaryArea) {
      return;
    }
    if (changes[SYNC_META_KEY] ||
        changes[THEME_STORAGE_KEY] ||
        changes[LANGUAGE_STORAGE_KEY] ||
        changes[RECENT_MODE_STORAGE_KEY] ||
        changes[RECENT_COUNT_STORAGE_KEY] ||
        changes[NEWTAB_WIDTH_MODE_STORAGE_KEY] ||
        changes[OVERLAY_SIZE_MODE_STORAGE_KEY] ||
        changes[BOOKMARK_COUNT_STORAGE_KEY] ||
        changes[BOOKMARK_COLUMNS_STORAGE_KEY] ||
        changes[BOOKMARK_VIEW_MODE_STORAGE_KEY] ||
        changes[BOOKMARK_TOPBAR_SURFACE_COLOR_STORAGE_KEY] ||
        changes[BOOKMARK_TOPBAR_SURFACE_COLOR_LIGHT_STORAGE_KEY] ||
        changes[BOOKMARK_TOPBAR_SURFACE_COLOR_DARK_STORAGE_KEY] ||
        changes[BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY] ||
        changes[NEWTAB_SHORTCUTS_STORAGE_KEY] ||
        changes[AUTO_PIP_ENABLED_STORAGE_KEY] ||
        changes[PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY] ||
        changes[OVERLAY_TAB_PRIORITY_STORAGE_KEY] ||
        changes[NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY] ||
        changes[NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY] ||
        changes[RESTRICTED_ACTION_STORAGE_KEY] ||
        changes[SEARCH_RESULT_PRIORITY_STORAGE_KEY] ||
        changes[SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY] ||
        changes[OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY] ||
        changes[FALLBACK_SHORTCUT_STORAGE_KEY] ||
        changes[SITE_SEARCH_STORAGE_KEY] ||
        changes[SITE_SEARCH_DISABLED_STORAGE_KEY] ||
        changes[SEARCH_BLACKLIST_STORAGE_KEY] ||
        changes[FAVICON_REQUEST_BLACKLIST_STORAGE_KEY] ||
        changes[FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY] ||
        changes[DEFAULT_SEARCH_ENGINE_STORAGE_KEY]) {
      refreshSyncStatus();
    }
    if (changes[THEME_STORAGE_KEY]) {
      const nextMode = changes[THEME_STORAGE_KEY].newValue || 'system';
      updateThemeButtons(nextMode);
      applyResolvedTheme(resolveTheme(nextMode));
    }
    if (changes[LANGUAGE_STORAGE_KEY]) {
      applyLanguageMode(changes[LANGUAGE_STORAGE_KEY].newValue || 'system');
    }
    if (changes[RECENT_COUNT_STORAGE_KEY] && recentCountSelect) {
      const count = normalizeRecentCount(changes[RECENT_COUNT_STORAGE_KEY].newValue);
      recentCountSelect.value = String(count);
      updateRecentModeTabsVisibility(count);
      refreshCustomSelects();
    }
    if (changes[NEWTAB_WIDTH_MODE_STORAGE_KEY] && newtabWidthSelect) {
      const mode = normalizeNewtabWidthMode(changes[NEWTAB_WIDTH_MODE_STORAGE_KEY].newValue);
      newtabWidthSelect.value = mode;
      setNewtabWidthTabState(mode);
      refreshCustomSelects();
    }
    if (changes[OVERLAY_SIZE_MODE_STORAGE_KEY]) {
      const mode = normalizeOverlaySizeMode(changes[OVERLAY_SIZE_MODE_STORAGE_KEY].newValue);
      setOverlaySizeTabState(mode);
      refreshCustomSelects();
    }
    if (changes[SEARCH_RESULT_PRIORITY_STORAGE_KEY]) {
      const nextValue = normalizeSearchResultPriority(changes[SEARCH_RESULT_PRIORITY_STORAGE_KEY].newValue);
      if (searchResultPrioritySelect) {
        searchResultPrioritySelect.value = nextValue;
      }
      setSearchResultPriorityTabState(nextValue);
      refreshCustomSelects();
    }
    if (changes[SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY]) {
      setSearchResultSourceTypeState(changes[SEARCH_RESULT_SOURCE_TYPES_STORAGE_KEY].newValue);
    }
    if (changes[OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY] && overlayOpenTabsDefaultVisibleToggle) {
      const raw = changes[OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY].newValue;
      const next = normalizeOverlayOpenTabsDefaultVisible(raw);
      overlayOpenTabsDefaultVisibleToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY]: next });
      }
    }
    if (changes[FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY] && faviconEnhancedFetchToggle) {
      const raw = changes[FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY].newValue;
      const next = normalizeFaviconEnhancedFetchEnabled(raw);
      faviconEnhancedFetchToggle.checked = next;
      setFaviconBlacklistEditorEnabled(next);
      if (raw !== next && storageArea) {
        storageArea.set({ [FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY]: next });
      }
    }
    if (changes[RECENT_MODE_STORAGE_KEY] && recentModeSelect) {
      const nextValue = changes[RECENT_MODE_STORAGE_KEY].newValue;
      const mode = nextValue === 'most' ? 'most' : 'latest';
      recentModeSelect.value = mode;
      setRecentModeTabState(mode);
      refreshCustomSelects();
    }
    if (changes[BOOKMARK_COUNT_STORAGE_KEY] && bookmarkCountSelect) {
      const stored = normalizeBookmarkCount(changes[BOOKMARK_COUNT_STORAGE_KEY].newValue);
      bookmarkCountSelect.value = String(stored);
      updateBookmarkColumnsSelectVisibility(stored);
      refreshCustomSelects();
    }
    if (changes[BOOKMARK_COLUMNS_STORAGE_KEY] && bookmarkColumnsSelect) {
      const stored = normalizeBookmarkColumns(changes[BOOKMARK_COLUMNS_STORAGE_KEY].newValue);
      bookmarkColumnsSelect.value = String(stored);
      refreshCustomSelects();
    }
    if (changes[BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY] && bookmarkFolderIconsVisibleToggle) {
      const raw = changes[BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY].newValue;
      const next = normalizeBookmarkFolderIconsVisible(raw);
      bookmarkFolderIconsVisibleToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY]: next });
      }
    }
    if (changes[OVERLAY_TAB_PRIORITY_STORAGE_KEY] && overlayTabQuickSwitchToggle) {
      const next = normalizeOverlayTabQuickSwitch(changes[OVERLAY_TAB_PRIORITY_STORAGE_KEY].newValue);
      overlayTabQuickSwitchToggle.checked = next;
      if (changes[OVERLAY_TAB_PRIORITY_STORAGE_KEY].newValue !== next && storageArea) {
        storageArea.set({ [OVERLAY_TAB_PRIORITY_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY] && newtabWordmarkToggle) {
      const raw = changes[NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY].newValue;
      const next = normalizeNewtabWordmarkVisible(raw);
      newtabWordmarkToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [NEWTAB_WORDMARK_VISIBLE_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY] && newtabShortcutsToggle) {
      const raw = changes[NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY].newValue;
      const next = normalizeNewtabShortcutsVisible(raw);
      newtabShortcutsToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[UPDATE_NOTICE_ENABLED_STORAGE_KEY] && updateNoticeToggle) {
      const raw = changes[UPDATE_NOTICE_ENABLED_STORAGE_KEY].newValue;
      const next = normalizeUpdateNoticeEnabled(raw);
      updateNoticeToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [UPDATE_NOTICE_ENABLED_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[AUTO_PIP_ENABLED_STORAGE_KEY] && autoPipToggle) {
      const raw = changes[AUTO_PIP_ENABLED_STORAGE_KEY].newValue;
      const next = normalizeAutoPipEnabled(raw);
      autoPipToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [AUTO_PIP_ENABLED_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[TAB_SWITCHER_ENABLED_STORAGE_KEY] && tabSwitcherToggle) {
      const raw = changes[TAB_SWITCHER_ENABLED_STORAGE_KEY].newValue;
      const next = normalizeTabSwitcherEnabled(raw);
      tabSwitcherToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [TAB_SWITCHER_ENABLED_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[DOCUMENT_PIP_ENABLED_STORAGE_KEY] && documentPipToggle) {
      const raw = changes[DOCUMENT_PIP_ENABLED_STORAGE_KEY].newValue;
      const next = normalizeDocumentPipEnabled(raw);
      documentPipToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [DOCUMENT_PIP_ENABLED_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY] && pinnedTabRecoveryToggle) {
      const raw = changes[PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY].newValue;
      const next = normalizePinnedTabRecoveryEnabled(raw);
      pinnedTabRecoveryToggle.checked = next;
      if (raw !== next && storageArea) {
        storageArea.set({ [PINNED_TAB_RECOVERY_ENABLED_STORAGE_KEY]: next });
      }
      refreshCustomSelects();
    }
    if (changes[RESTRICTED_ACTION_STORAGE_KEY] && restrictedActionSelect) {
      const raw = changes[RESTRICTED_ACTION_STORAGE_KEY].newValue;
      const nextValue = raw === 'none' ? 'none' : 'default';
      restrictedActionSelect.value = nextValue;
      setRestrictedActionTabState(nextValue);
      if (raw !== nextValue && storageArea) {
        storageArea.set({ [RESTRICTED_ACTION_STORAGE_KEY]: nextValue });
      }
      refreshCustomSelects();
    }
    if (changes[FALLBACK_SHORTCUT_STORAGE_KEY]) {
      loadCurrentShortcut();
    }
    if (changes[SEARCH_BLACKLIST_STORAGE_KEY]) {
      searchBlacklistItems = normalizeSearchBlacklistItems(changes[SEARCH_BLACKLIST_STORAGE_KEY].newValue);
      renderSearchBlacklistList();
    }
    if (changes[FAVICON_REQUEST_BLACKLIST_STORAGE_KEY]) {
      faviconRequestBlacklistItems = normalizeFaviconRequestBlacklistItems(
        changes[FAVICON_REQUEST_BLACKLIST_STORAGE_KEY].newValue
      );
      renderFaviconRequestBlacklistList();
    }
    if (!changes[SITE_SEARCH_STORAGE_KEY] && !changes[SITE_SEARCH_DISABLED_STORAGE_KEY]) {
      return;
    }
    const now = Date.now();
    if (siteSearchRefreshSuppressUntil && now < siteSearchRefreshSuppressUntil) {
      if (siteSearchRefreshTimer) {
        clearTimeout(siteSearchRefreshTimer);
      }
      const delay = Math.max(siteSearchRefreshSuppressUntil - now, 0) + 40;
      siteSearchRefreshTimer = setTimeout(() => {
        siteSearchRefreshTimer = null;
        refreshSiteSearchProviders();
      }, delay);
      return;
    }
    refreshSiteSearchProviders();
  });
})();
