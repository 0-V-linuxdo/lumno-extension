(function() {
  const THEME_STORAGE_KEY = '_x_extension_theme_mode_2024_unique_';
  const THEME_CACHE_KEY = '_x_extension_options_theme_preload_2026_unique_';
  const PRELOAD_THEME_ATTRIBUTE = 'data-options-preload-theme';
  const BACKGROUND_PRELOAD_ID = '_x_extension_options_background_preload_2026_unique_';
  const PANEL_ID = '_x_extension_settings_panel_2024_unique_';
  const root = document.documentElement;
  if (!root) {
    return;
  }

  let resolvedTheme = 'light';
  let bodyObserver = null;

  function normalizeThemeMode(value) {
    if (value === 'dark' || value === 'light') {
      return value;
    }
    return 'system';
  }

  function getSystemTheme() {
    try {
      return globalThis.matchMedia && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function resolveTheme(mode) {
    const normalized = normalizeThemeMode(mode);
    return normalized === 'system' ? getSystemTheme() : normalized;
  }

  function readCachedThemeMode() {
    try {
      return normalizeThemeMode(globalThis.localStorage
        ? globalThis.localStorage.getItem(THEME_CACHE_KEY)
        : 'system');
    } catch (e) {
      return 'system';
    }
  }

  function cacheThemeMode(mode) {
    try {
      if (globalThis.localStorage) {
        globalThis.localStorage.setItem(THEME_CACHE_KEY, normalizeThemeMode(mode));
      }
    } catch (e) {
      // Best effort only; chrome.storage remains the source of truth.
    }
  }

  function getRuntimeUrl(path) {
    if (globalThis.chrome && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(path);
    }
    return `../../${path}`;
  }

  function updateBackgroundPreload(theme) {
    if (!document.head) {
      return;
    }
    let link = document.getElementById(BACKGROUND_PRELOAD_ID);
    if (!link) {
      link = document.createElement('link');
      link.id = BACKGROUND_PRELOAD_ID;
      link.rel = 'preload';
      link.as = 'image';
      link.fetchPriority = 'high';
      document.head.appendChild(link);
    }
    link.href = getRuntimeUrl(
      theme === 'dark'
        ? 'assets/images/settings-bg-dark.webp'
        : 'assets/images/settings-bg-light.webp'
    );
  }

  function applyTheme(theme) {
    resolvedTheme = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute(PRELOAD_THEME_ATTRIBUTE, resolvedTheme);
    root.setAttribute('data-theme-ready', 'true');
    root.style.colorScheme = resolvedTheme;
    updateBackgroundPreload(resolvedTheme);

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', resolvedTheme === 'dark' ? '#111111' : '#f1f5f9');
    }
    if (document.body) {
      document.body.setAttribute('data-theme', resolvedTheme);
    }
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.setAttribute('data-theme', resolvedTheme);
    }
    if (document.body && panel && bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }
  }

  applyTheme(resolveTheme(readCachedThemeMode()));

  if ((!document.body || !document.getElementById(PANEL_ID)) &&
      typeof globalThis.MutationObserver === 'function') {
    bodyObserver = new MutationObserver(() => applyTheme(resolvedTheme));
    bodyObserver.observe(root, { childList: true, subtree: true });
  }

  try {
    const storage = globalThis.chrome && chrome.storage
      ? (chrome.storage.sync || chrome.storage.local)
      : null;
    if (storage && typeof storage.get === 'function') {
      storage.get([THEME_STORAGE_KEY], (result) => {
        const storedMode = normalizeThemeMode(result && result[THEME_STORAGE_KEY]);
        cacheThemeMode(storedMode);
        applyTheme(resolveTheme(storedMode));
      });
    }
  } catch (e) {
    // The cached/system theme already made the page paintable.
  }
})();
