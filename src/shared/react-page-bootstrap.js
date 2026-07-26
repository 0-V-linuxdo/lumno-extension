(function() {
  const currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) {
    return;
  }

  const reactEntryPath = currentScript.dataset.reactEntry;
  const pageEntryPath = currentScript.dataset.pageEntry;
  const stateKey = currentScript.dataset.reactState;
  if (!reactEntryPath || !pageEntryPath || !stateKey) {
    return;
  }

  const runtime = globalThis;
  const root = document.documentElement;
  const reactEntryUrl = new URL(reactEntryPath, currentScript.src).href;
  const pageEntryUrl = new URL(pageEntryPath, currentScript.src).href;
  const bootstrapState = {
    allowReactUpgrade: true,
    reactReady: false
  };
  let pageStarted = false;

  runtime[stateKey] = bootstrapState;
  root.dataset.lumnoReactRuntime = 'loading';

  function startPage(mode) {
    if (pageStarted) {
      return;
    }
    pageStarted = true;
    bootstrapState.allowReactUpgrade = mode === 'react';
    root.dataset.lumnoReactRuntime = mode;

    const pageScript = document.createElement('script');
    pageScript.src = pageEntryUrl;
    pageScript.dataset.lumnoPageRuntime = currentScript.dataset.pageRuntime || 'page';
    document.body.appendChild(pageScript);
  }

  const fallbackTimer = window.setTimeout(() => {
    startPage('legacy');
  }, 1500);

  import(reactEntryUrl).then(() => {
    window.clearTimeout(fallbackTimer);
    startPage(bootstrapState.reactReady ? 'react' : 'legacy');
  }).catch((error) => {
    window.clearTimeout(fallbackTimer);
    console.warn('[Lumno] React islands failed to load; using legacy views.', error);
    startPage('legacy');
  });
})();
