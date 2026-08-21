(function() {
  const RUNTIME_KEY = '_x_extension_gecko_overlay_bridge_2026_unique_';
  if (window[RUNTIME_KEY]) {
    return;
  }

  const gecko = globalThis.LumnoGeckoRuntime;
  if (!gecko || typeof gecko.isGeckoRuntime !== 'function' || !gecko.isGeckoRuntime()) {
    return;
  }

  window[RUNTIME_KEY] = true;

  function keepEventPageAlive() {
    if (window.top !== window) {
      return;
    }
    if (!chrome || !chrome.runtime || typeof chrome.runtime.connect !== 'function') {
      return;
    }
    try {
      const port = chrome.runtime.connect({ name: 'lumno-gecko-keepalive' });
      if (!port || !port.onDisconnect) {
        return;
      }
      port.onDisconnect.addListener(() => {
        setTimeout(keepEventPageAlive, 500);
      });
    } catch (error) {
      setTimeout(keepEventPageAlive, 1000);
    }
  }

  function openCommandBar(context) {
    const toggle = window._x_extension_toggleSearchOverlay_2026_unique_;
    if (typeof toggle !== 'function') {
      return { ok: false, reason: 'search_panel_missing' };
    }
    const overlayContext = Object.assign({
      ensureOpen: true,
      openedAt: Date.now(),
      currentTabUrl: location && location.href ? location.href : ''
    }, context && typeof context === 'object' ? context : {});
    toggle(Array.isArray(overlayContext.tabs) ? overlayContext.tabs : [], overlayContext);
    return { ok: true };
  }

  function openTabSwitcher(context) {
    const toggle = window._x_extension_toggleTabSwitcher_2026_unique_;
    if (typeof toggle !== 'function') {
      return { ok: false, reason: 'tab_switcher_missing' };
    }
    const result = toggle(context && typeof context === 'object' ? context : {});
    return result && typeof result === 'object' ? result : { ok: true };
  }

  window._x_extension_openLumnoCommandBar_2026_unique_ = openCommandBar;
  window._x_extension_openLumnoTabSwitcher_2026_unique_ = openTabSwitcher;

  keepEventPageAlive();

  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) {
    return;
  }
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || window.top !== window) {
      return;
    }
    if (request.action === 'openSearchOverlayFromBackground') {
      sendResponse(openCommandBar(request.context));
      return true;
    }
    if (request.action === 'openTabSwitcherFromCommand') {
      sendResponse(openTabSwitcher(request.context));
      return true;
    }
  });
})();
