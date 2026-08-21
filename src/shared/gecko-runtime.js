(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoGeckoRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const COMMAND_DEFAULTS = Object.freeze({
    'show-search': 'Alt+K',
    'show-search-prefill': 'Alt+L',
    'show-search-prefill-v': 'Alt+Shift+C',
    'show-tab-switcher': 'Alt+Q'
  });
  const RESERVED_SHORTCUT_PATTERN = /^(Ctrl|Control|Command|Cmd|MacCtrl)\+Shift\+[KCLI]$/i;
  const PRODUCT_TAG = '0.9.51-firefox-v1.1.0';
  const OVERLAY_CONTENT_SCRIPT_FILES = Object.freeze([
    'src/shared/gecko-runtime.js',
    'src/shared/icon-font-preload.js',
    'src/shared/settings.js',
    'src/shared/navigation-disposition.js',
    'src/shared/search-utils.js',
    'src/shared/site-search-store.js',
    'src/shared/suggestion-action-model.js',
    'src/shared/suggestion-navigation.js',
    'src/shared/suggestions-height-layout.js',
    'src/shared/ime-key-guard.js',
    'src/shared/search-input-history.js',
    'src/shared/toast.js',
    'src/shared/menu-surface.js',
    'src/shared/search-input-mode.js',
    'src/shared/shortcut-display.js',
    'src/shared/shortcut-favicon.js',
    'src/shared/community-links.js',
    'src/shared/feature-hints.js',
    'src/shared/update-notice.js',
    'src/shared/engagement-notice.js',
    'src/shared/tooltip.js',
    'src/shared/cursor-tooltip.js',
    'src/overlay/runtime.js',
    'src/shared/favicon-utils.js',
    'src/newtab/favicon-theme.js',
    'src/shared/favicon-cache.js',
    'src/shared/favicon-view-core.js',
    'src/overlay/favicon-view.js',
    'src/overlay/lifecycle.js',
    'src/overlay/site-fixes.js',
    'src/overlay/page-theme.js',
    'src/react/overlay-islands.js',
    'src/overlay/search-panel.js',
    'src/overlay/tab-switcher.js',
    'src/overlay/gecko-overlay-bridge.js'
  ]);

  function isGeckoRuntime(runtime) {
    try {
      if (typeof browser !== 'undefined' && browser.runtime &&
          typeof browser.runtime.getBrowserInfo === 'function') {
        return true;
      }
      const chromeApi = runtime || (typeof chrome !== 'undefined' ? chrome : null);
      if (chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getURL === 'function') {
        const extensionRoot = String(chromeApi.runtime.getURL('') || '');
        if (extensionRoot.indexOf('moz-extension:') === 0) {
          return true;
        }
      }
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent)
        ? String(navigator.userAgent)
        : '';
      return /firefox|zenbrowser|icedragon/i.test(ua);
    } catch (error) {
      return false;
    }
  }

  function getDefaultShortcut(commandName) {
    return COMMAND_DEFAULTS[commandName] || '';
  }

  function resolveShortcut(commandName, currentShortcut, runtime) {
    if (!isGeckoRuntime(runtime)) {
      return String(currentShortcut || '').trim();
    }
    const current = String(currentShortcut || '').trim();
    if (current && !RESERVED_SHORTCUT_PATTERN.test(current)) {
      return current;
    }
    return getDefaultShortcut(commandName) || current;
  }

  return Object.freeze({
    COMMAND_DEFAULTS,
    PRODUCT_TAG,
    OVERLAY_CONTENT_SCRIPT_FILES,
    isGeckoRuntime,
    getDefaultShortcut,
    resolveShortcut
  });
});
