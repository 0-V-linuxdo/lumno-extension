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

  function mirrorContentGlobals() {
    if (typeof globalThis !== 'undefined' &&
        typeof globalThis._x_extension_mirrorGeckoContentGlobals_2026_unique_ === 'function') {
      globalThis._x_extension_mirrorGeckoContentGlobals_2026_unique_();
    }
  }

  function readContentGlobal(name) {
    try {
      if (typeof globalThis !== 'undefined' && globalThis[name]) {
        return globalThis[name];
      }
    } catch (error) {
      // Ignore.
    }
    try {
      if (typeof window !== 'undefined' && window[name]) {
        return window[name];
      }
    } catch (error) {
      // Ignore.
    }
    return undefined;
  }

  function openCommandBar(context) {
    mirrorContentGlobals();
    const toggle = readContentGlobal('_x_extension_toggleSearchOverlay_2026_unique_');
    if (typeof toggle !== 'function') {
      return { ok: false, reason: 'search_panel_missing' };
    }
    const overlayContext = Object.assign({
      ensureOpen: true,
      openedAt: Date.now(),
      currentTabUrl: location && location.href ? location.href : ''
    }, context && typeof context === 'object' ? context : {});
    try {
      const result = toggle(Array.isArray(overlayContext.tabs) ? overlayContext.tabs : [], overlayContext);
      if (result && typeof result === 'object') {
        return result;
      }
      if (window._x_extension_search_overlay_open_2026_unique_ === true) {
        return { ok: true };
      }
      return { ok: false, reason: 'search_panel_failed' };
    } catch (error) {
      return {
        ok: false,
        reason: 'search_panel_threw',
        error: error && error.message ? error.message : String(error || 'unknown')
      };
    }
  }

  function openTabSwitcher(context) {
    mirrorContentGlobals();
    const toggle = readContentGlobal('_x_extension_toggleTabSwitcher_2026_unique_');
    if (typeof toggle !== 'function') {
      return { ok: false, reason: 'tab_switcher_missing' };
    }
    try {
      const result = toggle(context && typeof context === 'object' ? context : {});
      return result && typeof result === 'object' ? result : { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: 'tab_switcher_threw',
        error: error && error.message ? error.message : String(error || 'unknown')
      };
    }
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
    if (request.action === 'showGeckoHotkeyToast') {
      try {
        const id = '_x_extension_gecko_hotkey_toast_2026_unique_';
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('div');
          el.id = id;
          el.setAttribute('role', 'status');
          el.style.cssText = [
            'all:initial',
            'position:fixed',
            'z-index:2147483647',
            'left:50%',
            'bottom:24px',
            'transform:translateX(-50%)',
            'max-width:min(420px,calc(100vw - 32px))',
            'padding:10px 16px',
            'border-radius:10px',
            'background:#111827',
            'color:#f8fafc',
            'font:13px/1.45 system-ui,sans-serif',
            'box-shadow:0 10px 30px rgba(0,0,0,.35)',
            'pointer-events:none'
          ].join(';');
          (document.body || document.documentElement).appendChild(el);
        }
        el.textContent = String(request.message || '');
        setTimeout(() => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }, 3200);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false });
      }
      return true;
    }
  });
})();
