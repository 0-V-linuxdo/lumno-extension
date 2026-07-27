(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const THEME_STORAGE_KEY = '_x_extension_theme_mode_2024_unique_';
  const NEWTAB_THEME_MODE_STORAGE_KEY = '_x_extension_newtab_theme_mode_2026_unique_';
  const NEWTAB_THEME_SCOPE_STORAGE_KEY = '_x_extension_newtab_theme_scope_2026_unique_';
  const NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY = '_x_extension_newtab_shortcuts_visible_2026_unique_';
  const BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY = '_x_extension_bookmark_folder_icons_visible_2026_unique_';
  const UPDATE_NOTICE_ENABLED_STORAGE_KEY = '_x_extension_update_notice_enabled_2026_unique_';
  const FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY = '_x_extension_favicon_enhanced_fetch_enabled_2026_unique_';
  const OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY = '_x_extension_overlay_open_tabs_default_visible_2026_unique_';

  function normalizeLocale(locale) {
    const raw = String(locale || '').trim();
    if (!raw) {
      return 'en';
    }
    const lower = raw.toLowerCase();
    if (lower.startsWith('zh')) {
      if (lower.includes('tw') || lower.includes('hk') || lower.includes('mo') || lower.includes('hant')) {
        return 'zh_TW';
      }
      return 'zh_CN';
    }
    if (lower === 'ja' || lower.startsWith('ja-') || lower.startsWith('ja_')) {
      return 'ja';
    }
    return 'en';
  }

  function localeToHtmlLang(locale) {
    const normalized = normalizeLocale(locale);
    if (normalized === 'zh_CN') {
      return 'zh-CN';
    }
    if (normalized === 'zh_TW') {
      return 'zh-TW';
    }
    if (normalized === 'ja') {
      return 'ja';
    }
    return 'en';
  }

  function normalizeNewtabWidthMode(value) {
    return value === 'standard' ? 'standard' : 'wide';
  }

  function normalizeNewtabSearchWidth(value, options) {
    const config = options || {};
    const allowNull = Boolean(config.allowNull);
    const min = Number.isFinite(Number(config.min)) ? Number(config.min) : 720;
    const max = Number.isFinite(Number(config.max)) ? Number(config.max) : 1040;
    const fallback = Number.isFinite(Number(config.fallback)) ? Number(config.fallback) : 920;
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return allowNull ? null : fallback;
    }
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function normalizeNewtabWordmarkVisible(value) {
    return value !== false;
  }

  function normalizeNewtabShortcutsVisible(value) {
    return value !== false;
  }

  function normalizeBookmarkFolderIconsVisible(value) {
    return value !== false;
  }

  function normalizeUpdateNoticeEnabled(value) {
    return value !== false;
  }

  function normalizeFaviconEnhancedFetchEnabled(value) {
    return value !== false;
  }

  function normalizeOverlayOpenTabsDefaultVisible(value) {
    return value !== false;
  }

  function normalizeOverlaySizeMode(value) {
    if (value === 'compact' || value === 'large') {
      return value;
    }
    return 'standard';
  }

  function normalizeOverlayTabPriorityMode(value) {
    if (value === 'switchTabFirst') {
      return true;
    }
    if (value === 'newtabFirst') {
      return false;
    }
    if (value === false) {
      return false;
    }
    return true;
  }

  function normalizeSearchResultPriority(value) {
    return value === 'search' ? 'search' : 'autocomplete';
  }

  const SEARCH_RESULT_SOURCE_TYPES = Object.freeze(['topSite', 'bookmark', 'history']);

  function normalizeSearchResultSourceType(value) {
    const raw = String(value || '').trim();
    if (raw === 'topSite' || raw === 'topSites' || raw === 'frequent' || raw === 'common') {
      return 'topSite';
    }
    if (raw === 'bookmark' || raw === 'bookmarks') {
      return 'bookmark';
    }
    if (raw === 'history') {
      return 'history';
    }
    return '';
  }

  function normalizeSearchResultSourceTypes(value) {
    const rawItems = Array.isArray(value)
      ? value
      : (typeof value === 'string' ? value.split(/[\s,]+/) : []);
    const selected = [];
    rawItems.forEach((item) => {
      const type = normalizeSearchResultSourceType(item);
      if (!type || selected.includes(type)) {
        return;
      }
      selected.push(type);
    });
    return selected.length > 0 ? selected : SEARCH_RESULT_SOURCE_TYPES.slice();
  }

  function normalizeTabRankScoreDebugMode(value) {
    return value === true;
  }

  function normalizeTabSwitcherEnabled(value) {
    return value !== false;
  }

  function normalizeThemePreference(value) {
    if (value === 'dark') {
      return 'dark';
    }
    if (value === 'light') {
      return 'light';
    }
    return '';
  }

  function normalizeThemeMode(value) {
    if (value === 'dark' || value === 'light') {
      return value;
    }
    return 'system';
  }

  function createGlobalThemeModeStorageUpdate(mode) {
    return {
      [THEME_STORAGE_KEY]: normalizeThemeMode(mode)
    };
  }

  return Object.freeze({
    THEME_STORAGE_KEY,
    NEWTAB_THEME_MODE_STORAGE_KEY,
    NEWTAB_THEME_SCOPE_STORAGE_KEY,
    NEWTAB_SHORTCUTS_VISIBLE_STORAGE_KEY,
    BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY,
    UPDATE_NOTICE_ENABLED_STORAGE_KEY,
    FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY,
    OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY,
    normalizeLocale,
    localeToHtmlLang,
    normalizeNewtabWidthMode,
    normalizeNewtabSearchWidth,
    normalizeNewtabWordmarkVisible,
    normalizeNewtabShortcutsVisible,
    normalizeBookmarkFolderIconsVisible,
    normalizeUpdateNoticeEnabled,
    normalizeFaviconEnhancedFetchEnabled,
    normalizeOverlayOpenTabsDefaultVisible,
    normalizeOverlaySizeMode,
    normalizeOverlayTabPriorityMode,
    normalizeSearchResultPriority,
    normalizeSearchResultSourceTypes,
    normalizeTabRankScoreDebugMode,
    normalizeTabSwitcherEnabled,
    normalizeThemePreference,
    normalizeThemeMode,
    createGlobalThemeModeStorageUpdate
  });
});
