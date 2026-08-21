(function() {
  const RUNTIME_KEY = '_x_extension_shortcut_key_observer_2026_unique_';
  const previousRuntime = window[RUNTIME_KEY];
  if (previousRuntime && typeof previousRuntime.cleanup === 'function') {
    try {
      previousRuntime.cleanup();
    } catch (error) {
      // A listener from the previous extension context may already be invalid.
    }
  }
  const SHOW_SEARCH_SHORTCUT_REFRESH_MS = 15000;
  const RELEASE_REPLAY_WINDOW_MS = 5000;
  const SHORTCUT_KEY_MATCHER = globalThis.LumnoShortcutKeyMatcher || {};
  let showSearchShortcutRaw = '';
  let showSearchShortcutSpec = null;
  let showSearchShortcutRefreshedAt = 0;
  let tabSwitcherShortcutRaw = '';
  let tabSwitcherShortcutSpec = null;
  let armedReleaseKeys = [];
  const recentTrustedKeydownAtByKey = new Map();
  const recentTrustedReleaseAtByKey = new Map();

  function tryOpenCommandBarLocally() {
    if (window.top !== window) {
      return false;
    }
    const gecko = globalThis.LumnoGeckoShortcuts;
    if (!gecko || typeof gecko.isGeckoRuntime !== 'function' || !gecko.isGeckoRuntime()) {
      return false;
    }
    const open = window._x_extension_openLumnoCommandBar_2026_unique_;
    if (typeof open !== 'function') {
      return false;
    }
    try {
      const result = open({ ensureOpen: true });
      return Boolean(result && result.ok === true);
    } catch (error) {
      return false;
    }
  }

  function sendBackgroundHotkey(payload, callback) {
    const gecko = globalThis.LumnoGeckoShortcuts;
    if (gecko && typeof gecko.sendRuntimeMessageWithRetry === 'function') {
      gecko.sendRuntimeMessageWithRetry(chrome, payload, callback);
      return;
    }
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        const error = chrome.runtime && chrome.runtime.lastError
          ? chrome.runtime.lastError.message || ''
          : '';
        if (typeof callback === 'function') {
          callback(response || null, error);
        }
      });
    } catch (error) {
      if (typeof callback === 'function') {
        callback(null, error && error.message ? error.message : 'threw');
      }
    }
  }

  function notifyTopFrameDocumentStarted() {
    if (window.top !== window) {
      return;
    }
    try {
      chrome.runtime.sendMessage({
        action: 'notifyTopFrameDocumentStarted',
        documentUrl: location && location.href ? location.href : '',
        documentReadyState: document.readyState,
        observedAt: Date.now()
      }, () => {
        void (chrome.runtime && chrome.runtime.lastError);
      });
    } catch (error) {
      // Ignore an extension context invalidated while this Document commits.
    }
  }

  function applyShowSearchShortcut(shortcut) {
    const gecko = globalThis.LumnoGeckoShortcuts;
    let nextShortcut = String(shortcut || '').trim();
    if (gecko && typeof gecko.resolveShortcut === 'function') {
      nextShortcut = gecko.resolveShortcut('show-search', nextShortcut) || nextShortcut;
    }
    showSearchShortcutRaw = nextShortcut;
    showSearchShortcutSpec = typeof SHORTCUT_KEY_MATCHER.parseShortcut === 'function'
      ? SHORTCUT_KEY_MATCHER.parseShortcut(nextShortcut)
      : null;
  }

  function applyTabSwitcherShortcut(shortcut) {
    const gecko = globalThis.LumnoGeckoShortcuts;
    let nextShortcut = String(shortcut || '').trim();
    if (gecko && typeof gecko.resolveShortcut === 'function') {
      nextShortcut = gecko.resolveShortcut('show-tab-switcher', nextShortcut) || nextShortcut;
    }
    tabSwitcherShortcutRaw = nextShortcut;
    tabSwitcherShortcutSpec = typeof SHORTCUT_KEY_MATCHER.parseShortcut === 'function'
      ? SHORTCUT_KEY_MATCHER.parseShortcut(nextShortcut)
      : null;
  }

  function applyGeckoPageShortcutDefaults() {
    const gecko = globalThis.LumnoGeckoShortcuts;
    if (!gecko || typeof gecko.isGeckoRuntime !== 'function' || !gecko.isGeckoRuntime()) {
      return;
    }
    if (!showSearchShortcutSpec) {
      applyShowSearchShortcut(gecko.getDefaultShortcut('show-search'));
    }
    if (!tabSwitcherShortcutSpec) {
      applyTabSwitcherShortcut(gecko.getDefaultShortcut('show-tab-switcher'));
    }
  }

  function refreshShowSearchShortcut(force) {
    const now = Date.now();
    if (!force && (now - showSearchShortcutRefreshedAt) < SHOW_SEARCH_SHORTCUT_REFRESH_MS) {
      return;
    }
    showSearchShortcutRefreshedAt = now;
    try {
      chrome.runtime.sendMessage({ action: 'getShowSearchShortcut' }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          return;
        }
        const nextShortcut = response && typeof response.shortcut === 'string'
          ? response.shortcut
          : '';
        if (nextShortcut === showSearchShortcutRaw) {
          return;
        }
        applyShowSearchShortcut(nextShortcut);
      });
      chrome.runtime.sendMessage({ action: 'getTabSwitcherShortcut' }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          return;
        }
        const nextShortcut = response && typeof response.shortcut === 'string'
          ? response.shortcut
          : '';
        if (nextShortcut === tabSwitcherShortcutRaw) {
          return;
        }
        applyTabSwitcherShortcut(nextShortcut);
      });
    } catch (error) {
      // Ignore an extension context invalidated during reload or navigation.
    }
  }

  function relayUnresolvedShowSearchShortcut(event, descriptor) {
    if (typeof SHORTCUT_KEY_MATCHER.canBeChromeCommandShortcut !== 'function' ||
        !SHORTCUT_KEY_MATCHER.canBeChromeCommandShortcut(descriptor)) {
      return;
    }
    sendBackgroundHotkey({
      action: 'triggerShowSearchFromPageHotkey',
      documentUrl: location && location.href ? location.href : '',
      documentIsTop: window.top === window,
      observedAt: Date.now(),
      observedShortcut: descriptor,
      requiresShortcutVerification: true,
      trustedShortcutFallback: true
    }, (response, error) => {
      if (error) {
        return;
      }
      if (response && typeof response.shortcut === 'string') {
        applyShowSearchShortcut(response.shortcut);
      }
    });
  }

  function relayTabSwitcherShortcut(event) {
    if (!event || event.isTrusted !== true || event.isComposing || event.repeat) {
      return false;
    }
    if (!tabSwitcherShortcutSpec) {
      return false;
    }
    const descriptor = typeof SHORTCUT_KEY_MATCHER.describeKeyboardEvent === 'function'
      ? SHORTCUT_KEY_MATCHER.describeKeyboardEvent(event)
      : null;
    if (typeof SHORTCUT_KEY_MATCHER.descriptorMatchesShortcut !== 'function' ||
        !SHORTCUT_KEY_MATCHER.descriptorMatchesShortcut(descriptor, tabSwitcherShortcutSpec)) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    sendBackgroundHotkey({
      action: 'triggerTabSwitcherFromPageHotkey',
      documentUrl: location && location.href ? location.href : '',
      observedAt: Date.now()
    });
    return true;
  }

  function relayCommandShortcuts(event) {
    if (relayTabSwitcherShortcut(event)) {
      return;
    }
    relayShowSearchShortcut(event);
  }

  function relayShowSearchShortcut(event) {
    if (!event || event.isTrusted !== true || event.isComposing || event.repeat) {
      return;
    }
    rememberTrustedShortcutKeydown(event);
    refreshShowSearchShortcut(false);
    const descriptor = typeof SHORTCUT_KEY_MATCHER.describeKeyboardEvent === 'function'
      ? SHORTCUT_KEY_MATCHER.describeKeyboardEvent(event)
      : null;
    if (!showSearchShortcutSpec) {
      relayUnresolvedShowSearchShortcut(event, descriptor);
      return;
    }
    if (typeof SHORTCUT_KEY_MATCHER.descriptorMatchesShortcut !== 'function' ||
        !SHORTCUT_KEY_MATCHER.descriptorMatchesShortcut(descriptor, showSearchShortcutSpec)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (tryOpenCommandBarLocally()) {
      return;
    }
    sendBackgroundHotkey({
      action: 'triggerShowSearchFromPageHotkey',
      documentUrl: location && location.href ? location.href : '',
      documentIsTop: window.top === window,
      observedAt: Date.now(),
      trustedShortcutFallback: true
    });
  }

  function normalizeReleaseKey(value) {
    const key = String(value || '');
    return key.length === 1 ? key.toLowerCase() : key;
  }

  function normalizeReleaseCode(value) {
    const code = String(value || '');
    if (/^Key[A-Z]$/.test(code)) {
      return code.slice(3).toLowerCase();
    }
    if (/^Digit\d$/.test(code)) {
      return code.slice(5);
    }
    const aliases = {
      Backquote: '`',
      Backslash: '\\',
      BracketLeft: '[',
      BracketRight: ']',
      Comma: ',',
      Equal: '=',
      Minus: '-',
      Period: '.',
      Quote: "'",
      Semicolon: ';',
      Slash: '/'
    };
    return aliases[code] || '';
  }

  function getShortcutReleaseCandidates(event) {
    return Array.from(new Set([
      normalizeReleaseKey(event && event.key),
      normalizeReleaseCode(event && event.code)
    ].filter(Boolean)));
  }

  function getShortcutKeydownCandidates(event) {
    const candidates = getShortcutReleaseCandidates(event);
    if (event && event.altKey) {
      candidates.push('Alt');
    }
    if (event && event.ctrlKey) {
      candidates.push('Control');
    }
    if (event && event.metaKey) {
      candidates.push('Meta');
    }
    if (event && event.shiftKey) {
      candidates.push('Shift');
    }
    return Array.from(new Set(candidates));
  }

  function pruneTrustedShortcutEvents(now) {
    [recentTrustedKeydownAtByKey, recentTrustedReleaseAtByKey].forEach((eventsByKey) => {
      eventsByKey.forEach((observedAt, key) => {
        if ((now - observedAt) > RELEASE_REPLAY_WINDOW_MS) {
          eventsByKey.delete(key);
        }
      });
    });
  }

  function rememberTrustedShortcutKeydown(event) {
    const pressedAt = Date.now();
    pruneTrustedShortcutEvents(pressedAt);
    getShortcutKeydownCandidates(event).forEach((key) => {
      recentTrustedKeydownAtByKey.set(key, pressedAt);
    });
  }

  function getReleasedShortcutKey(event) {
    return getShortcutReleaseCandidates(event)
      .find((key) => armedReleaseKeys.includes(key)) || '';
  }

  function rememberTrustedShortcutRelease(event) {
    const releasedAt = Date.now();
    pruneTrustedShortcutEvents(releasedAt);
    getShortcutReleaseCandidates(event).forEach((key) => {
      recentTrustedReleaseAtByKey.set(key, releasedAt);
    });
  }

  function getBufferedReleasedShortcutKey(keys, commandStartedAt) {
    const startedAt = Number(commandStartedAt);
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      return '';
    }
    const now = Date.now();
    return keys.find((key) => {
      const observedAt = recentTrustedReleaseAtByKey.get(key);
      if (!Number.isFinite(observedAt) ||
          (now - observedAt) > RELEASE_REPLAY_WINDOW_MS) {
        return false;
      }
      if (observedAt >= startedAt) {
        return true;
      }
      const keydownAt = recentTrustedKeydownAtByKey.get(key);
      return Number.isFinite(keydownAt) &&
        keydownAt <= observedAt &&
        (observedAt - keydownAt) <= RELEASE_REPLAY_WINDOW_MS &&
        (startedAt - observedAt) <= RELEASE_REPLAY_WINDOW_MS;
    }) || '';
  }

  function relayTabSwitcherShortcutRelease(key) {
    if (!key) {
      return;
    }
    armedReleaseKeys = [];
    recentTrustedKeydownAtByKey.delete(key);
    recentTrustedReleaseAtByKey.delete(key);
    try {
      chrome.runtime.sendMessage({
        action: 'notifyTabSwitcherShortcutModifierReleased',
        key
      }, () => {
        void (chrome.runtime && chrome.runtime.lastError);
      });
    } catch (error) {
      // Ignore stale extension contexts while a tab or the extension reloads.
    }
  }

  const runtimeMessageListener = (request, _sender, sendResponse) => {
      if (!request || request.action !== 'armTabSwitcherShortcutRelease') {
        return;
      }
      armedReleaseKeys = (Array.isArray(request.keys) ? request.keys : [request.key])
        .map(normalizeReleaseKey)
        .filter(Boolean);
      const bufferedKey = getBufferedReleasedShortcutKey(
        armedReleaseKeys,
        request.commandStartedAt
      );
      if (bufferedKey) {
        relayTabSwitcherShortcutRelease(bufferedKey);
      }
      sendResponse({ ok: armedReleaseKeys.length > 0 || Boolean(bufferedKey) });
  };

  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(runtimeMessageListener);
  }

  function notifyTabSwitcherShortcutModifierReleased(event) {
    if (!event || event.isTrusted !== true) {
      return;
    }
    rememberTrustedShortcutRelease(event);
    const key = getReleasedShortcutKey(event);
    if (!key) {
      return;
    }
    relayTabSwitcherShortcutRelease(key);
  }

  const refreshShowSearchShortcutOnFocus = () => refreshShowSearchShortcut(true);
  const refreshShowSearchShortcutOnVisibility = () => {
    if (document.visibilityState === 'visible') {
      refreshShowSearchShortcut(false);
    }
  };

  notifyTopFrameDocumentStarted();
  applyGeckoPageShortcutDefaults();
  refreshShowSearchShortcut(true);
  window.addEventListener('keydown', relayCommandShortcuts, true);
  window.addEventListener('keyup', notifyTabSwitcherShortcutModifierReleased, true);
  window.addEventListener('focus', refreshShowSearchShortcutOnFocus, true);
  document.addEventListener('visibilitychange', refreshShowSearchShortcutOnVisibility, true);
  window[RUNTIME_KEY] = Object.freeze({
    cleanup() {
      window.removeEventListener('keydown', relayCommandShortcuts, true);
      window.removeEventListener('keyup', notifyTabSwitcherShortcutModifierReleased, true);
      window.removeEventListener('focus', refreshShowSearchShortcutOnFocus, true);
      document.removeEventListener('visibilitychange', refreshShowSearchShortcutOnVisibility, true);
      if (chrome && chrome.runtime && chrome.runtime.onMessage &&
          typeof chrome.runtime.onMessage.removeListener === 'function') {
        try {
          chrome.runtime.onMessage.removeListener(runtimeMessageListener);
        } catch (error) {
          // Ignore a listener that belongs to an invalidated extension context.
        }
      }
    }
  });
})();
