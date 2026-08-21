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
  const PRODUCT_TAG = '0.9.51-firefox-v1.0.0';

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
    isGeckoRuntime,
    getDefaultShortcut,
    resolveShortcut
  });
});
