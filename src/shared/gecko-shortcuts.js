(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoGeckoShortcuts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const COMMAND_DEFAULTS = Object.freeze({
    'show-search': 'Alt+K',
    'show-search-prefill': 'Alt+L',
    'show-search-prefill-v': 'Alt+Shift+C',
    'show-tab-switcher': 'Alt+Q'
  });

  const RESERVED_SHORTCUT_PATTERN = /^(Ctrl|Control|Command|Cmd|MacCtrl)\+Shift\+[KCIJ]$/i;
  const MESSAGE_RETRY_MAX_ATTEMPTS = 6;
  const MESSAGE_RETRY_DELAY_MS = 80;
  const DISCONNECTED_PATTERN = /receiving end does not exist|disconnected port|could not establish connection/i;

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

  function isConflictingShortcut(value) {
    const text = String(value || '').trim();
    if (!text) {
      return true;
    }
    return RESERVED_SHORTCUT_PATTERN.test(text);
  }

  function getDefaultShortcut(commandName) {
    return COMMAND_DEFAULTS[commandName] || '';
  }

  function resolveShortcut(commandName, currentShortcut, runtime) {
    if (!isGeckoRuntime(runtime)) {
      return String(currentShortcut || '').trim();
    }
    const current = String(currentShortcut || '').trim();
    if (current && !isConflictingShortcut(current)) {
      return current;
    }
    return getDefaultShortcut(commandName) || current;
  }

  function sendRuntimeMessageWithRetry(chromeApi, payload, callback, options) {
    const done = typeof callback === 'function' ? callback : () => {};
    const maxAttempts = options && Number.isFinite(Number(options.maxAttempts))
      ? Math.max(1, Number(options.maxAttempts))
      : MESSAGE_RETRY_MAX_ATTEMPTS;
    const delayMs = options && Number.isFinite(Number(options.delayMs))
      ? Math.max(0, Number(options.delayMs))
      : MESSAGE_RETRY_DELAY_MS;
    const runtime = chromeApi && chromeApi.runtime ? chromeApi.runtime : null;
    if (!runtime || typeof runtime.sendMessage !== 'function') {
      done(null, 'runtime-unavailable');
      return;
    }
    const attempt = (n) => {
      try {
        runtime.sendMessage(payload, (response) => {
          const error = runtime.lastError ? (runtime.lastError.message || 'unknown') : '';
          if (error && DISCONNECTED_PATTERN.test(error) && n < maxAttempts) {
            setTimeout(() => attempt(n + 1), delayMs * n);
            return;
          }
          done(response || null, error);
        });
      } catch (error) {
        if (n < maxAttempts) {
          setTimeout(() => attempt(n + 1), delayMs * n);
          return;
        }
        done(null, error && error.message ? error.message : 'threw');
      }
    };
    attempt(1);
  }

  return Object.freeze({
    COMMAND_DEFAULTS,
    isGeckoRuntime,
    isConflictingShortcut,
    getDefaultShortcut,
    resolveShortcut,
    sendRuntimeMessageWithRetry
  });
});
