(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoCloudSyncSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const SETTINGS_SCHEMA_VERSION = 1;
  const ANALYTICS_SCHEMA_VERSION = 1;

  const STORAGE_KEYS = Object.freeze({
    themeMode: '_x_extension_theme_mode_2024_unique_',
    language: '_x_extension_language_2024_unique_',
    languageMessages: '_x_extension_language_messages_2024_unique_',
    recentMode: '_x_extension_recent_mode_2024_unique_',
    recentCount: '_x_extension_recent_count_2024_unique_',
    newtabWidthMode: '_x_extension_newtab_width_mode_2026_unique_',
    newtabSearchWidth: '_x_extension_newtab_search_width_2026_unique_',
    newtabThemeMode: '_x_extension_newtab_theme_mode_2026_unique_',
    newtabThemeScope: '_x_extension_newtab_theme_scope_2026_unique_',
    newtabWallpaper: '_x_extension_newtab_wallpaper_2026_unique_',
    newtabLocalWallpaper: '_x_extension_newtab_local_wallpaper_2026_unique_',
    newtabWallpaperOverlay: '_x_extension_newtab_wallpaper_overlay_2026_unique_',
    newtabWallpaperEffect: '_x_extension_newtab_wallpaper_effect_2026_unique_',
    overlaySizeMode: '_x_extension_overlay_size_mode_2026_unique_',
    overlayEnterAnimation: '_x_extension_overlay_enter_animation_2026_unique_',
    bookmarkCount: '_x_extension_bookmark_count_2024_unique_',
    bookmarkColumns: '_x_extension_bookmark_columns_2024_unique_',
    bookmarkViewMode: '_x_extension_bookmark_view_mode_2026_unique_',
    bookmarkFolderIconsVisible: '_x_extension_bookmark_folder_icons_visible_2026_unique_',
    pinnedRecentSites: '_x_extension_newtab_pinned_recent_sites_2026_unique_',
    hiddenRecentSites: '_x_extension_newtab_hidden_recent_sites_2026_unique_',
    newtabShortcuts: '_x_extension_newtab_shortcuts_2026_unique_',
    newtabShortcutsVisible: '_x_extension_newtab_shortcuts_visible_2026_unique_',
    newtabShortcutAddVisible: '_x_extension_newtab_shortcut_add_visible_2026_unique_',
    newtabShortcutDockMagnificationEnabled: '_x_extension_newtab_shortcut_dock_magnification_enabled_2026_unique_',
    updateNoticeEnabled: '_x_extension_update_notice_enabled_2026_unique_',
    autoPipEnabled: '_x_extension_auto_pip_enabled_2026_unique_',
    tabSwitcherEnabled: '_x_extension_tab_switcher_enabled_2026_unique_',
    documentPipEnabled: '_x_extension_document_pip_enabled_2026_unique_',
    pinnedTabRecoveryEnabled: '_x_extension_pinned_tab_recovery_enabled_2026_unique_',
    overlayTabPriority: '_x_extension_overlay_tab_priority_2024_unique_',
    newtabTopContentMode: '_x_extension_newtab_wordmark_visible_2026_unique_',
    restrictedAction: '_x_extension_restricted_action_2024_unique_',
    searchResultPriority: '_x_extension_search_result_priority_2026_unique_',
    searchResultSourceTypes: '_x_extension_search_result_source_types_2026_unique_',
    overlayOpenTabsDefaultVisible: '_x_extension_overlay_open_tabs_default_visible_2026_unique_',
    fallbackShortcut: '_x_extension_fallback_hotkey_2024_unique_',
    siteSearchCustom: '_x_extension_site_search_custom_2024_unique_',
    siteSearchDisabled: '_x_extension_site_search_disabled_2024_unique_',
    searchBlacklist: '_x_extension_search_blacklist_2026_unique_',
    faviconRequestBlacklist: '_x_extension_favicon_request_blacklist_2026_unique_',
    faviconEnhancedFetchEnabled: '_x_extension_favicon_enhanced_fetch_enabled_2026_unique_',
    defaultSearchEngine: '_x_extension_default_search_engine_2024_unique_'
  });

  const CLOUD_LOCAL_KEYS = Object.freeze({
    account: '_lumno_cloud_account_v1_',
    conflicts: '_lumno_cloud_conflicts_v1_',
    consent: '_lumno_cloud_consent_v1_',
    device: '_lumno_cloud_device_v1_',
    mode: '_lumno_cloud_mode_v1_',
    outbox: '_lumno_cloud_outbox_v1_',
    pullCursor: '_lumno_cloud_pull_cursor_v1_',
    session: '_lumno_cloud_session_v1_',
    status: '_lumno_cloud_status_v1_',
    usage: '_lumno_cloud_usage_v1_',
    versions: '_lumno_cloud_versions_v1_'
  });

  const SYNC_KEYS = Object.freeze(Object.values(STORAGE_KEYS));
  const SYNC_KEY_SET = new Set(SYNC_KEYS);

  const USAGE_METRICS = Object.freeze([
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
  ]);
  const USAGE_METRIC_SET = new Set(USAGE_METRICS);

  const FORBIDDEN_ANALYTICS_KEY_PATTERN = /(?:^|_)(?:url|uri|href|query|keyword|title|domain|hostname|history|bookmark|email|phone|name|path|file|token|cookie|tab)(?:_|$)/i;

  function hasOwn(value, key) {
    return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function normalizeEnum(value, allowed, fallback) {
    const normalized = String(value === undefined || value === null ? '' : value).trim();
    return allowed.includes(normalized) ? normalized : fallback;
  }

  function normalizeBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function countItems(value, max) {
    return Math.min(max || 1000, Array.isArray(value) ? value.length : 0);
  }

  function bucketNumber(value, boundaries, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    for (let index = 0; index < boundaries.length; index += 1) {
      if (number <= boundaries[index]) {
        return index === 0
          ? `0-${boundaries[index]}`
          : `${boundaries[index - 1] + 1}-${boundaries[index]}`;
      }
    }
    return `${boundaries[boundaries.length - 1] + 1}+`;
  }

  function getWallpaperSource(value, localValue) {
    const localSource = localValue && typeof localValue === 'object' ? localValue : {};
    if ([localSource.light, localSource.dark].some((id) => (
      id === 'custom-upload' || String(id || '').startsWith('custom-wallpaper-')
    ))) {
      return 'custom';
    }
    const id = String(value || '').trim();
    if (!id) {
      return 'none';
    }
    return id === 'custom-upload' || id.startsWith('custom-wallpaper-')
      ? 'custom'
      : 'builtin';
  }

  function copySyncSettings(snapshot) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const result = {};
    SYNC_KEYS.forEach((key) => {
      if (hasOwn(source, key)) {
        result[key] = source[key];
      }
    });
    return result;
  }

  function isSyncKey(key) {
    return SYNC_KEY_SET.has(String(key || ''));
  }

  function buildAnalyticsConfiguration(snapshot) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    return Object.freeze({
      schema_version: ANALYTICS_SCHEMA_VERSION,
      theme_mode: normalizeEnum(source[STORAGE_KEYS.themeMode], ['system', 'light', 'dark'], 'system'),
      language_mode: normalizeEnum(source[STORAGE_KEYS.language], ['system', 'zh-CN', 'zh-TW', 'ja', 'en'], 'system'),
      recent_mode: normalizeEnum(source[STORAGE_KEYS.recentMode], ['most', 'recent'], 'most'),
      recent_count_bucket: bucketNumber(source[STORAGE_KEYS.recentCount], [0, 4, 8, 12, 20], 'unknown'),
      newtab_width_mode: normalizeEnum(source[STORAGE_KEYS.newtabWidthMode], ['wide', 'standard'], 'wide'),
      newtab_search_width_bucket: bucketNumber(source[STORAGE_KEYS.newtabSearchWidth], [720, 800, 920, 1040], 'unknown'),
      newtab_theme_mode: normalizeEnum(source[STORAGE_KEYS.newtabThemeMode], ['system', 'light', 'dark'], 'system'),
      wallpaper_source: getWallpaperSource(
        source[STORAGE_KEYS.newtabWallpaper],
        source[STORAGE_KEYS.newtabLocalWallpaper]
      ),
      overlay_size_mode: normalizeEnum(source[STORAGE_KEYS.overlaySizeMode], ['compact', 'standard', 'large'], 'standard'),
      shortcut_count: countItems(source[STORAGE_KEYS.newtabShortcuts], 100),
      pinned_recent_site_count: countItems(source[STORAGE_KEYS.pinnedRecentSites], 100),
      hidden_recent_site_count: countItems(source[STORAGE_KEYS.hiddenRecentSites], 100),
      custom_search_provider_count: countItems(source[STORAGE_KEYS.siteSearchCustom], 100),
      disabled_search_provider_count: countItems(source[STORAGE_KEYS.siteSearchDisabled], 100),
      search_blacklist_rule_count: countItems(source[STORAGE_KEYS.searchBlacklist], 500),
      favicon_blacklist_rule_count: countItems(source[STORAGE_KEYS.faviconRequestBlacklist], 500),
      auto_pip_enabled: normalizeBoolean(source[STORAGE_KEYS.autoPipEnabled], false),
      tab_switcher_enabled: normalizeBoolean(source[STORAGE_KEYS.tabSwitcherEnabled], true),
      document_pip_enabled: normalizeBoolean(source[STORAGE_KEYS.documentPipEnabled], false),
      pinned_tab_recovery_enabled: normalizeBoolean(source[STORAGE_KEYS.pinnedTabRecoveryEnabled], false)
    });
  }

  function containsForbiddenAnalyticsKey(value) {
    if (!value || typeof value !== 'object') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.some(containsForbiddenAnalyticsKey);
    }
    return Object.entries(value).some(([key, child]) => (
      FORBIDDEN_ANALYTICS_KEY_PATTERN.test(key) || containsForbiddenAnalyticsKey(child)
    ));
  }

  function sanitizeUsageMetrics(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = {};
    Object.entries(source).forEach(([metric, rawCount]) => {
      if (!USAGE_METRIC_SET.has(metric)) {
        return;
      }
      const count = clampInteger(rawCount, 0, 100000, 0);
      if (count > 0) {
        result[metric] = count;
      }
    });
    return result;
  }

  function sanitizeUsageDimensions(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const extensionVersion = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(source.extension_version || ''))
      ? String(source.extension_version)
      : 'unknown';
    return {
      extension_version: extensionVersion,
      locale: normalizeEnum(source.locale, ['zh-CN', 'zh-TW', 'ja', 'en', 'other'], 'other'),
      browser_family: normalizeEnum(source.browser_family, ['chrome', 'edge', 'brave', 'vivaldi', 'opera', 'other'], 'other'),
      platform_family: normalizeEnum(source.platform_family, ['windows', 'macos', 'linux', 'chromeos', 'other'], 'other')
    };
  }

  function sanitizeUsageBatch(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const allowedEnvelopeKeys = new Set([
      'batch_id',
      'day',
      'metrics',
      'dimensions',
      'settings_snapshot'
    ]);
    const hasUnexpectedEnvelopeKey = Object.keys(source).some((key) => !allowedEnvelopeKeys.has(key));
    const dimensionsSource = source.dimensions && typeof source.dimensions === 'object'
      ? source.dimensions
      : {};
    const allowedDimensionKeys = new Set([
      'extension_version',
      'locale',
      'browser_family',
      'platform_family'
    ]);
    const hasUnexpectedDimensionKey = Object.keys(dimensionsSource)
      .some((key) => !allowedDimensionKeys.has(key));
    if (hasUnexpectedEnvelopeKey || hasUnexpectedDimensionKey) {
      return null;
    }
    const batchId = String(source.batch_id || '').trim();
    const day = String(source.day || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batchId) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return null;
    }
    const metrics = sanitizeUsageMetrics(source.metrics);
    if (Object.keys(metrics).length === 0) {
      return null;
    }
    return {
      schema_version: ANALYTICS_SCHEMA_VERSION,
      batch_id: batchId,
      day,
      metrics,
      dimensions: sanitizeUsageDimensions(source.dimensions),
      configuration: buildAnalyticsConfiguration(source.settings_snapshot)
    };
  }

  return Object.freeze({
    SETTINGS_SCHEMA_VERSION,
    ANALYTICS_SCHEMA_VERSION,
    STORAGE_KEYS,
    CLOUD_LOCAL_KEYS,
    SYNC_KEYS,
    USAGE_METRICS,
    FORBIDDEN_ANALYTICS_KEY_PATTERN,
    isSyncKey,
    copySyncSettings,
    buildAnalyticsConfiguration,
    containsForbiddenAnalyticsKey,
    sanitizeUsageBatch
  });
});
