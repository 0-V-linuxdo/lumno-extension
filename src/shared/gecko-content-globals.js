(function() {
  const MIRROR_KEY = '_x_extension_mirrorGeckoContentGlobals_2026_unique_';

  function shouldMirrorKey(key) {
    return key.indexOf('Lumno') === 0 || key.indexOf('_x_extension_') === 0;
  }

  function mirrorGeckoContentGlobals() {
    if (typeof globalThis === 'undefined' || typeof window === 'undefined' || window === globalThis) {
      return 0;
    }
    let copied = 0;
    try {
      const names = Object.getOwnPropertyNames(globalThis);
      for (let i = 0; i < names.length; i++) {
        const key = names[i];
        if (!shouldMirrorKey(key)) {
          continue;
        }
        if (window[key] == null && globalThis[key] != null) {
          window[key] = globalThis[key];
          copied += 1;
        }
      }
    } catch (error) {
      // Restricted pages cannot copy content-script globals onto window.
    }
    return copied;
  }

  globalThis[MIRROR_KEY] = mirrorGeckoContentGlobals;
  if (typeof window !== 'undefined') {
    window[MIRROR_KEY] = mirrorGeckoContentGlobals;
  }
  mirrorGeckoContentGlobals();
})();
