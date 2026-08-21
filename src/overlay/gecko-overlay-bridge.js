(function() {
  const RUNTIME_KEY = '_x_extension_gecko_overlay_bridge_2026_unique_';
  if (window[RUNTIME_KEY]) {
    return;
  }

  const gecko = globalThis.LumnoGeckoShortcuts;
  if (!gecko || typeof gecko.isGeckoRuntime !== 'function' || !gecko.isGeckoRuntime()) {
    return;
  }

  const KEEPALIVE_PORT_NAME = 'lumno-gecko-keepalive';
  const OPEN_COMMAND_BAR_ACTION = 'openSearchOverlayFromBackground';
  let keepalivePort = null;
  let keepaliveTimer = null;

  function isTopFrame() {
    try {
      return window.top === window;
    } catch (error) {
      return true;
    }
  }

  function keepEventPageAlive() {
    if (!isTopFrame()) {
      return;
    }
    if (!chrome || !chrome.runtime || typeof chrome.runtime.connect !== 'function') {
      return;
    }
    if (keepaliveTimer) {
      clearTimeout(keepaliveTimer);
      keepaliveTimer = null;
    }
    try {
      keepalivePort = chrome.runtime.connect({ name: KEEPALIVE_PORT_NAME });
      if (keepalivePort && keepalivePort.onDisconnect &&
          typeof keepalivePort.onDisconnect.addListener === 'function') {
        keepalivePort.onDisconnect.addListener(() => {
          keepalivePort = null;
          keepaliveTimer = setTimeout(keepEventPageAlive, 400);
        });
      }
    } catch (error) {
      keepalivePort = null;
      keepaliveTimer = setTimeout(keepEventPageAlive, 800);
    }
  }

  function buildCommandBarContext(context) {
    const next = context && typeof context === 'object' ? Object.assign({}, context) : {};
    if (next.ensureOpen !== false) {
      next.ensureOpen = true;
    }
    if (!Number.isFinite(Number(next.openedAt))) {
      next.openedAt = Date.now();
    }
    if (!next.currentTabUrl && location && typeof location.href === 'string') {
      next.currentTabUrl = location.href;
    }
    return next;
  }

  function openCommandBar(tabs, context) {
    const toggle = window._x_extension_toggleSearchOverlay_2026_unique_;
    if (typeof toggle !== 'function') {
      return { ok: false, reason: 'search_panel_missing' };
    }
    try {
      toggle(Array.isArray(tabs) ? tabs : [], buildCommandBarContext(context));
      return {
        ok: true,
        overlayOpen: window._x_extension_search_overlay_open_2026_unique_ === true
      };
    } catch (error) {
      return {
        ok: false,
        reason: error && error.message ? error.message : 'toggle-threw'
      };
    }
  }

  function openTabSwitcher(context) {
    const toggle = window._x_extension_toggleTabSwitcher_2026_unique_;
    if (typeof toggle !== 'function') {
      return { ok: false, reason: 'tab_switcher_missing' };
    }
    try {
      const result = toggle(context && typeof context === 'object' ? context : {});
      return result && typeof result === 'object' ? result : { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: error && error.message ? error.message : 'toggle-threw'
      };
    }
  }

  window._x_extension_openLumnoCommandBar_2026_unique_ = function(context) {
    return openCommandBar([], context);
  };
  window._x_extension_openLumnoTabSwitcher_2026_unique_ = openTabSwitcher;

  if (chrome && chrome.runtime && chrome.runtime.onMessage &&
      typeof chrome.runtime.onMessage.addListener === 'function') {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (!request || typeof request !== 'object') {
        return;
      }
      if (request.action === OPEN_COMMAND_BAR_ACTION) {
        sendResponse(openCommandBar(request.tabs, request.context));
        return true;
      }
      return undefined;
    });
  }

  keepEventPageAlive();
  window[RUNTIME_KEY] = Object.freeze({
    openCommandBar,
    openTabSwitcher,
    keepEventPageAlive
  });
})();
