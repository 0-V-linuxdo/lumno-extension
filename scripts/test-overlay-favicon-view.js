const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function extractFunctionSource(source, name) {
  const needle = `function ${name}(`;
  const start = source.indexOf(needle);
  assert.notStrictEqual(start, -1, `missing function ${name}`);
  const openBrace = source.indexOf('{', start);
  assert.notStrictEqual(openBrace, -1, `missing opening brace for ${name}`);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function createRealPolicyRerender(deps) {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  const factory = new Function('runtimeDeps', `
    const suggestionsContainer = runtimeDeps.suggestionsContainer;
    const latestOverlayQuery = runtimeDeps.latestOverlayQuery;
    const lastSuggestionResponse = runtimeDeps.lastSuggestionResponse;
    const tabs = runtimeDeps.tabs;
    const updateSearchSuggestions = runtimeDeps.updateSearchSuggestions;
    const renderTabSuggestions = runtimeDeps.renderTabSuggestions;
    ${extractFunctionSource(overlayJs, 'rerenderReplacedFaviconRows')}
    return rerenderReplacedFaviconRows;
  `);
  return factory(deps);
}

function createFakeImage() {
  const attributes = new Map();
  const listeners = new Map();
  return {
    src: '',
    complete: false,
    naturalWidth: 0,
    naturalHeight: 0,
    isConnected: true,
    style: {
      setProperty() {},
      removeProperty() {}
    },
    parentElement: null,
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      const set = listeners.get(type);
      if (set) {
        set.delete(listener);
      }
    },
    dispatchEvent(type) {
      const set = listeners.get(type);
      if (!set) {
        return;
      }
      Array.from(set).forEach((listener) => listener.call(this, { type, target: this }));
    }
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createRuntime(options) {
  const config = options || {};
  const preloadedUrls = [];
  const attachedDataUrls = [];
  const attachedDataRequestPages = [];
  const warmedIconLists = [];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URL
  };
  sandbox.globalThis = sandbox;
  sandbox.LumnoFaviconViewCore = {
    createFaviconViewCore(config) {
      return {
        setFallbackNodeVisible() {},
        setFaviconLoadState() {},
        applyFaviconOpticalShift() {},
        applyFaviconOpticalAlignment(img) {
          img.setAttribute('width', '128');
          img.setAttribute('height', '128');
        },
        requestFaviconData() {
          return typeof config.requestFaviconData === 'function'
            ? config.requestFaviconData.apply(null, arguments)
            : Promise.resolve(null);
        },
        setFaviconSrcWithAnimation(img, nextSrc, optionsArg) {
          if (config.isBlockedLocalFaviconUrl(nextSrc)) {
            return false;
          }
          img.src = nextSrc;
          img.setAttribute('data-favicon-current-src', nextSrc);
          if (String(nextSrc || '').startsWith('data:') && optionsArg && optionsArg.sourceUrl) {
            img.setAttribute('data-favicon-data-source', optionsArg.sourceUrl);
          } else {
            img.removeAttribute('data-favicon-data-source');
          }
          return true;
        },
        canReuseCurrentFavicon() {
          return false;
        },
        getLastWorkingFaviconSrc(img) {
          return img ? (img.getAttribute('data-favicon-current-src') || '') : '';
        },
        restoreWorkingFaviconOrFallback(img, previousSrc, options) {
          if (previousSrc) {
            img.src = previousSrc;
            img.setAttribute('data-favicon-current-src', previousSrc);
            return true;
          }
          if (options && typeof options.onFailed === 'function') {
            options.onFailed();
          }
          return false;
        },
        attachFaviconData(_img, url, _hostOverride, pageUrlArg) {
          attachedDataUrls.push(url);
          attachedDataRequestPages.push(pageUrlArg || '');
        },
        preloadIcon(url) {
          preloadedUrls.push(url);
        },
        warmIconCache(list) {
          warmedIconLists.push(list);
        },
        detectDefaultExtensionFavicon() {
          return Promise.resolve(false);
        }
      };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'src/shared/favicon-utils.js'), 'utf8'), sandbox, {
    filename: 'src/shared/favicon-utils.js'
  });
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'src/overlay/favicon-view.js'), 'utf8'), sandbox, {
    filename: 'src/overlay/favicon-view.js'
  });

  const localPageUrl = 'http://127.0.0.1:4321/';
  const extensionUrl = `chrome-extension://abc/_favicon/?pageUrl=${encodeURIComponent(localPageUrl)}&size=128`;
  const gstaticUrl = `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(localPageUrl)}&size=128`;
  const browserPageUrl = 'chrome://extensions/';
  const browserPageExtensionUrl = `chrome-extension://abc/_favicon/?pageUrl=${encodeURIComponent(browserPageUrl)}&size=128`;
  const browserPageFavicon2Url = `chrome://favicon2/?pageUrl=${encodeURIComponent(browserPageUrl)}&size=128`;
  const vpnPageUrl = 'https://foo.example.com/';
  const vpnDirectFaviconUrl = 'https://foo.example.com/favicon.ico';
  const vpnExtensionUrl = `chrome-extension://abc/_favicon/?pageUrl=${encodeURIComponent(vpnPageUrl)}&size=128`;
  const vpnGstaticUrl = `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(vpnPageUrl)}&size=128`;

  return {
    localPageUrl,
    extensionUrl,
    browserPageUrl,
    browserPageExtensionUrl,
    browserPageFavicon2Url,
    vpnPageUrl,
    vpnDirectFaviconUrl,
    vpnExtensionUrl,
    vpnGstaticUrl,
    preloadedUrls,
    attachedDataUrls,
    attachedDataRequestPages,
    warmedIconLists,
    runtime: sandbox.LumnoOverlayFaviconView.createOverlayFaviconViewRuntime({
      document: {
        createElement() {
          return {};
        }
      },
      windowObj: {
        setTimeout,
        clearTimeout
      },
      chromeApi: {
        runtime: {
          id: 'abc',
          getURL(path) {
            return `chrome-extension://abc${path}`;
          }
        }
      },
      requestFaviconData: config.requestFaviconData,
      getRiSvg() {
        return '';
      },
      getHostFromUrl(url) {
        try {
          return new URL(url).hostname.toLowerCase();
        } catch (e) {
          return '';
        }
      },
      getExtensionFaviconUrl(url) {
        return `chrome-extension://abc/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`;
      },
      getGstaticFaviconUrl(url) {
        return `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(url)}&size=128`;
      },
      getChromeFaviconUrl(url) {
        return `chrome://favicon2/?pageUrl=${encodeURIComponent(url)}&size=128`;
      },
      shouldBlockFaviconForHost() {
        return false;
      },
      shouldBlockOverlayFaviconForHost(hostname) {
        if (typeof config.shouldBlockOverlayFaviconForHost === 'function') {
          return config.shouldBlockOverlayFaviconForHost(hostname);
        }
        const host = String(hostname || '').toLowerCase();
        return host === '127.0.0.1' || host === 'localhost';
      },
      isEnhancedFaviconFetchEnabled(pageUrl) {
        if (config.excludedPageUrl && pageUrl === config.excludedPageUrl) {
          return false;
        }
        return Object.prototype.hasOwnProperty.call(config, 'enhancedFaviconFetchEnabled')
          ? config.enhancedFaviconFetchEnabled
          : true;
      },
      isBlockedLocalFaviconUrl() {
        return false;
      },
      isFaviconProxyUrl(url) {
        return /_favicon\/|gstatic\.cn\/faviconV2/i.test(String(url || ''));
      },
      preloadThemeFromFavicon() {},
      faviconDataCache: config.faviconDataCache,
      getOverlayPanel: config.getOverlayPanel,
      getSuggestionRowsRoot: config.getSuggestionRowsRoot,
      rerenderReplacedFaviconRows: config.rerenderReplacedFaviconRows,
      faviconCandidateLoadTimeoutMs: 1000
    })
  };
}

function testOverlayRendererLoadsFaviconPolicyBeforeInitialTabs() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /let faviconEnhancedFetchEnabled = false;/,
    'overlay favicon policy should fail closed before storage returns'
  );
  assert.match(
    overlayJs,
    /initialFaviconEnhancedFetchReady = new Promise[\s\S]*?FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY,[\s\S]*?FAVICON_REQUEST_BLACKLIST_STORAGE_KEY[\s\S]*?overlayFaviconRequestBlacklistItems[\s\S]*?resolve\(\)/,
    'overlay should load the global setting and path-specific exclusions before first render'
  );
  assert.match(
    overlayJs,
    /Promise\.all\(\[initialOverlayOpenTabsDefaultVisibleReady, initialFaviconEnhancedFetchReady\]\)[\s\S]*?requestTabsAndRender\(\)/,
    'first open-tab rendering should wait for the favicon policy setting'
  );
  assert.match(
    overlayJs,
    /overlayFaviconEnhancedFetchStorageListener[\s\S]*?faviconEnhancedFetchEnabled = normalizeFaviconEnhancedFetchEnabled[\s\S]*?refreshOverlayFaviconsForPolicyChange\(\)/,
    'favicon setting changes should recover replaced rows after updating the policy state'
  );
  const faviconViewJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/favicon-view.js'), 'utf8');
  assert.match(
    faviconViewJs,
    /data-x-ov-favicon-fallback-url', state\.rawFallbackUrl/,
    'favicon refresh metadata should retain the raw fallback so enabling the setting can restore normal behavior'
  );
}

function testOverlayRendererGuardsThemeSourcesInStrictMode() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function getOverlayFaviconUrlResolver\(\)[\s\S]*?isEnhancedFaviconFetchEnabled: isOverlayEnhancedFaviconFetchEnabled/,
    'overlay URL resolution should use the URL-specific enhanced-fetch policy state'
  );
  assert.match(
    overlayJs,
    /function getSiteFaviconUrl\(hostname\)[\s\S]*?if \(!faviconEnhancedFetchEnabled\) \{\s*return '';\s*\}[\s\S]*?favicon\.ico/,
    'strict mode should stop before constructing a target-host root favicon URL for theme extraction'
  );
  const defaultSearchFaviconStart = overlayJs.indexOf('function getDefaultSearchEngineFaviconUrlForOverlay()');
  const defaultSearchFaviconEnd = overlayJs.indexOf('function getDefaultSearchEngineThemeUrlForOverlay()', defaultSearchFaviconStart);
  assert.notStrictEqual(defaultSearchFaviconStart, -1, 'overlay should define the default search favicon helper');
  assert.notStrictEqual(defaultSearchFaviconEnd, -1, 'default search favicon helper should have a bounded source block');
  const defaultSearchFaviconSource = overlayJs.slice(defaultSearchFaviconStart, defaultSearchFaviconEnd);
  assert.match(
    defaultSearchFaviconSource,
    /if \(!isOverlayEnhancedFaviconFetchEnabled\(getDefaultSearchEngineThemeUrlForOverlay\(\)\)\) \{\s*return '';\s*\}[\s\S]*?favicon\.ico/,
    'strict mode should return before constructing a default search target /favicon.ico candidate'
  );
  assert.match(
    overlayJs,
    /function getThemeFromUrl\(url, hostOverride\)[\s\S]*?isBlockedLocalFaviconUrl\(url\)[\s\S]*?new Image\(\)[\s\S]*?image\.src = url/,
    'theme image assignment should remain behind the shared favicon source policy guard'
  );
  assert.match(
    overlayJs,
    /const safeModeSwitchFavicon = getSafeOverlayFaviconUrl\(suggestion\.favicon\)[\s\S]*?favicon\.src = safeModeSwitchFavicon/,
    'mode-switch rows should sanitize their favicon before direct image assignment'
  );
  assert.match(
    overlayJs,
    /attachFaviconData\(favicon,\s*iconUrl,\s*suggestionHost,\s*suggestion\.url \|\| ''\)/,
    'suggestion favicon data requests should include the page URL for path-specific exclusions'
  );
}

function testOverlayRendererLetsLocalFaviconsReachRuntime() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.doesNotMatch(
    overlayJs,
    /const useFallback = shouldBlockOverlayFaviconForHost\(hostForTab\);/,
    'overlay open-tab rendering should let local favicons reach the data-only runtime path'
  );
  const faviconBranch = overlayJs.search(
    /if \(suggestion\.favicon \|\|[\s\S]{0,160}?faviconContinuityOptions\.reuseFavicon[\s\S]{0,220}?createAttachedSuggestionFavicon\([\s\S]{0,120}?faviconContinuityOptions/
  );
  const localFallbackBranch = overlayJs.indexOf('} else if (suggestionHost && shouldBlockOverlayFaviconForHost(suggestionHost)) {\n              iconNode = createLinkIcon();');
  assert.notStrictEqual(faviconBranch, -1, 'overlay suggestion rendering should keep the favicon runtime branch');
  assert.notStrictEqual(localFallbackBranch, -1, 'overlay suggestion rendering should keep a no-favicon local fallback');
  assert.ok(
    faviconBranch < localFallbackBranch,
    'overlay suggestion rendering should try favicon runtime before local link fallback'
  );
}

function testOverlayRendererDefersFallbackReplacementUntilFaviconIsMounted() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function replaceFaviconWithFallbackIcon\(favicon,\s*fallbackIconFactory\)[\s\S]*?scheduleFaviconFallbackReplacement\(favicon,\s*replace\);/,
    'overlay favicon fallback replacement should retry after the favicon has been mounted'
  );
  assert.match(
    overlayJs,
    /fallbackDiv\.setAttribute\('data-x-ov-favicon-policy-fallback', 'true'\)[\s\S]*?replaceChild\(fallbackDiv, favicon\)/,
    'replaced favicon fallbacks should remain discoverable for policy-change recovery'
  );
  assert.match(
    overlayJs,
    /function rerenderReplacedFaviconRows\(\)[\s\S]*?data-x-ov-favicon-policy-fallback[\s\S]*?updateSearchSuggestions\(lastSuggestionResponse, latestOverlayQuery, \{[\s\S]*?forceFullRerender: true[\s\S]*?\}\)[\s\S]*?renderTabSuggestions\(tabs\)/,
    'policy-change recovery should rerender cached search or open-tab rows only when a replacement exists'
  );
  assert.match(
    overlayJs,
    /function scheduleFaviconFallbackReplacement\(favicon,\s*replace\)[\s\S]*?queueMicrotask[\s\S]*?replace\(\)/,
    'overlay favicon fallback replacement should use a microtask so same-turn appenders can mount the image first'
  );
  assert.match(
    overlayJs,
    /const replaceWithFallbackIcon = function\(\) \{\s*replaceFaviconWithFallbackIcon\(favicon,\s*fallbackIconFactory\);\s*\};/,
    'attached suggestion favicons should use the deferred fallback replacement helper'
  );
  assert.match(
    overlayJs,
    /\(\) => \{\s*replaceFaviconWithFallbackIcon\(favicon,\s*createLinkIcon\);\s*\}/,
    'open-tab favicons should use the deferred fallback replacement helper'
  );
}

function testOverlayPolicyRecoveryUsesRealSearchAndOpenTabRerenderPaths() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  const currentSuggestions = [{ type: 'history', title: 'VPN', url: 'https://foo.example.com/' }];
  const activeSearchCalls = [];
  let openTabRenderCount = 0;
  const activeSearchRerender = createRealPolicyRerender({
    suggestionsContainer: {
      querySelector(selector) {
        assert.strictEqual(selector, '[data-x-ov-favicon-policy-fallback="true"]');
        return {};
      }
    },
    latestOverlayQuery: 'vpn',
    lastSuggestionResponse: currentSuggestions,
    tabs: [{ id: 1, url: 'https://foo.example.com/' }],
    updateSearchSuggestions() {
      activeSearchCalls.push(Array.from(arguments));
    },
    renderTabSuggestions() {
      openTabRenderCount += 1;
    }
  });

  assert.strictEqual(activeSearchRerender(), true, 'active-search fallback recovery should report a rerender');
  assert.strictEqual(activeSearchCalls.length, 1, 'active-search recovery should call updateSearchSuggestions once');
  assert.strictEqual(activeSearchCalls[0][0], currentSuggestions, 'active-search recovery should reuse the latest response');
  assert.strictEqual(activeSearchCalls[0][1], 'vpn', 'active-search recovery should preserve the active query');
  assert.deepStrictEqual(
    activeSearchCalls[0][2],
    { forceFullRerender: true },
    'active-search recovery should opt out of prefix reuse so replaced rows are recreated'
  );
  assert.strictEqual(openTabRenderCount, 0, 'active-search recovery should not render the open-tab branch');

  const openTabCalls = [];
  const openTabs = [{ id: 2, url: 'https://bar.example.com/' }];
  const openTabRerender = createRealPolicyRerender({
    suggestionsContainer: {
      querySelector() {
        return {};
      }
    },
    latestOverlayQuery: '',
    lastSuggestionResponse: [],
    tabs: openTabs,
    updateSearchSuggestions() {
      activeSearchCalls.push(Array.from(arguments));
    },
    renderTabSuggestions(tabList) {
      openTabCalls.push(tabList);
    }
  });

  assert.strictEqual(openTabRerender(), true, 'open-tab fallback recovery should report a rerender');
  assert.deepStrictEqual(openTabCalls, [openTabs], 'open-tab recovery should rebuild the current tab rows');

  const renderPolicyFactory = new Function(`
    ${extractFunctionSource(overlayJs, 'isSameSuggestion')}
    ${extractFunctionSource(overlayJs, 'isSuggestionPrefix')}
    ${extractFunctionSource(overlayJs, 'shouldAppendSearchSuggestionRows')}
    return shouldAppendSearchSuggestionRows;
  `);
  const shouldAppendSearchSuggestionRows = renderPolicyFactory();
  const commonRenderState = {
    query: 'vpn',
    lastRenderedQuery: 'vpn',
    actionContextKey: '0|default|mixed',
    lastRenderedActionContextKey: '0|default|mixed',
    currentSuggestions,
    allSuggestions: currentSuggestions
  };
  assert.strictEqual(
    shouldAppendSearchSuggestionRows({ ...commonRenderState, forceFullRerender: false }),
    true,
    'normal incremental updates should still reuse an identical rendered prefix'
  );
  assert.strictEqual(
    shouldAppendSearchSuggestionRows({ ...commonRenderState, ...activeSearchCalls[0][2] }),
    false,
    'the real active-search recovery option should force startIndex back to zero'
  );
  assert.match(
    overlayJs,
    /function updateSearchSuggestions\(suggestions, query, options\)[\s\S]*?const forceFullRerender = renderOptions\.forceFullRerender === true;[\s\S]*?shouldAppendSearchSuggestionRows\(\{[\s\S]*?forceFullRerender,/,
    'updateSearchSuggestions should feed the recovery option into the production prefix-reuse decision'
  );
}

function testOverlayRendererReusesRuntimeFallbackIcon() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function findAttachedFaviconFallbackIcon\(favicon\)[\s\S]*?_x_extension_overlay_favicon_fallback_2026_unique_/,
    'overlay fallback replacement should look for the runtime-managed fallback icon'
  );
  assert.match(
    overlayJs,
    /function showAttachedFaviconFallbackIcon\(favicon\)[\s\S]*?fallbackNode\.setAttribute\('data-visible', 'true'\)[\s\S]*?favicon\.setAttribute\('data-fallback-icon', 'true'\)/,
    'overlay fallback replacement should show the runtime fallback and hide the failed image'
  );
  assert.match(
    overlayJs,
    /if \(showAttachedFaviconFallbackIcon\(favicon\)\) \{\s*return true;\s*\}[\s\S]*?fallbackIconFactory/,
    'overlay fallback replacement should not create a second link icon when the runtime fallback exists'
  );
}

function testOverlayRendererBuildsBrowserPageFavicon2WhenMissingExplicitIcon() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /const browserPageFavicon = suggestion\.type === 'browserPage'[\s\S]*?getPageFaviconCandidateUrl\(suggestion\.url \|\| ''\)/,
    'browser-page suggestions should synthesize a browser favicon candidate when no explicit favicon is present'
  );
  assert.match(
    overlayJs,
    /browserPageFavicon === suggestion\.favicon[\s\S]*?\{ \.\.\.suggestion, favicon: browserPageFavicon \}/,
    'browser-page suggestions should pass the synthesized favicon into the shared favicon fallback chain'
  );
}

function testOverlayRendererUsesExtensionFaviconProxyForBrowserPages() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function getOverlayFaviconUrlResolver\(\)[\s\S]*?FAVICON_UTILS\.createFaviconUrlResolver[\s\S]*?shouldBlockFaviconForHost: shouldBlockOverlayFaviconForHost/,
    'overlay renderer should use the shared favicon URL resolver with overlay blocking rules'
  );
  assert.match(
    overlayJs,
    /function isBrowserInternalPageUrl\(url\)[\s\S]*?resolver\.isBrowserInternalPageUrl\(url\)/,
    'overlay renderer should share browser-internal page URL detection'
  );
  assert.match(
    overlayJs,
    /function isBlockedOverlayFaviconUrl\(url\)[\s\S]*?resolver\.isBlockedFaviconUrl\(url\)/,
    'overlay renderer should share nested favicon URL blocking rules'
  );
  assert.match(
    overlayJs,
    /function getPageFaviconCandidateUrl\(pageUrl\)[\s\S]*?resolver\.getPageFaviconCandidateUrl\(pageUrl\)/,
    'browser-page favicon candidates should come from the shared resolver'
  );
}

function testOverlayRendererDefinesChromeMonogramHelper() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function isChromeMonogramFaviconUrl\(url\)[\s\S]*?FAVICON_UTILS\.isChromeMonogramFaviconUrl/,
    'overlay renderer should define a local chrome monogram favicon helper from shared favicon utils'
  );
  assert.match(
    overlayJs,
    /createOverlayFaviconViewRuntime\([\s\S]*?isChromeMonogramFaviconUrl,/,
    'overlay favicon runtime should receive the same chrome monogram helper'
  );
  assert.match(
    overlayJs,
    /function createAttachedSuggestionFavicon\(suggestion, index, fallbackIconFactory, options\)[\s\S]*?!isChromeMonogramFaviconUrl\(iconUrl\)/,
    'direct URL suggestion favicons should use the local chrome monogram helper instead of an undefined global'
  );
}

async function testOverlayResolvesLocalFaviconThroughDataUrl() {
  const requestedUrls = [];
  const dataUrl = 'data:image/png;base64,bG9jYWw=';
  const { runtime, localPageUrl, extensionUrl } = createRuntime({
    requestFaviconData(url, pageUrl) {
      requestedUrls.push({ url, pageUrl: pageUrl || '' });
      return Promise.resolve(url === extensionUrl ? dataUrl : null);
    }
  });
  const img = createFakeImage();
  let failed = false;

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    localPageUrl,
    '127.0.0.1',
    extensionUrl,
    () => {
      failed = true;
    }
  );

  await wait(0);

  assert.strictEqual(failed, false, 'local overlay favicon should not fall back when background returns data');
  assert.deepStrictEqual(
    requestedUrls,
    [{ url: extensionUrl, pageUrl: localPageUrl }],
    'local overlay favicon should preserve page-rule context when requesting data through background'
  );
  assert.strictEqual(img.src, dataUrl, 'local overlay favicon should only render the returned data URL');
  assert.strictEqual(
    img.getAttribute('data-favicon-data-source'),
    extensionUrl,
    'data URL should keep the unsafe source only as metadata'
  );
  assert.strictEqual(
    /127\.0\.0\.1|localhost/.test(img.src),
    false,
    'page-visible image src should never contain the local URL'
  );
}

async function testOverlayFallsBackWhenLocalFaviconDataUnavailable() {
  const { runtime, localPageUrl, extensionUrl } = createRuntime();
  const img = createFakeImage();
  let failed = false;

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    localPageUrl,
    '127.0.0.1',
    extensionUrl,
    () => {
      failed = true;
    }
  );

  await wait(0);

  assert.strictEqual(failed, true, 'local overlay favicon should fall back immediately');
  assert.strictEqual(img.src, '', 'local overlay favicon should not assign a page-visible image src');
}

async function testOverlaySkipsRootIconProbeWhenEnhancedFetchDisabled() {
  const requestedUrls = [];
  const { runtime, localPageUrl, extensionUrl } = createRuntime({
    enhancedFaviconFetchEnabled: false,
    requestFaviconData(url) {
      requestedUrls.push(url);
      return Promise.resolve(null);
    }
  });
  const img = createFakeImage();
  let failed = false;

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    localPageUrl,
    '127.0.0.1',
    extensionUrl,
    () => {
      failed = true;
    }
  );

  await wait(4);

  assert.strictEqual(failed, true, 'disabled enhanced favicon fetching should still fall back cleanly');
  assert.deepStrictEqual(
    requestedUrls,
    [extensionUrl],
    'disabled enhanced favicon fetching should not probe root icon files'
  );
}

async function testOverlayStrictModeUsesOnlyVirtualFaviconForVpnHostname() {
  const requestedUrls = [];
  const {
    runtime,
    vpnPageUrl,
    vpnDirectFaviconUrl,
    vpnExtensionUrl,
    vpnGstaticUrl,
    preloadedUrls,
    attachedDataUrls
  } = createRuntime({
    enhancedFaviconFetchEnabled: false,
    requestFaviconData(url) {
      requestedUrls.push(url);
      return Promise.resolve(null);
    }
  });
  const img = createFakeImage();

  runtime.attachFaviconData(img, vpnDirectFaviconUrl, 'foo.example.com');
  runtime.preloadIcon(vpnDirectFaviconUrl);
  runtime.preloadIcon(vpnGstaticUrl);
  runtime.preloadIcon(vpnExtensionUrl);
  runtime.attachResolvedFaviconWithFallbacks(
    img,
    vpnPageUrl,
    'foo.example.com',
    vpnDirectFaviconUrl
  );

  await wait(0);

  assert.deepStrictEqual(attachedDataUrls, [], 'strict mode should not request direct favicon data for a VPN hostname');
  assert.deepStrictEqual(preloadedUrls, [vpnExtensionUrl], 'strict mode should preload only the virtual favicon URL');
  assert.deepStrictEqual(requestedUrls, [], 'normal-looking VPN hosts should not trigger background theme/favicon data requests');
  assert.strictEqual(img.src, vpnExtensionUrl, 'strict mode should render only the extension virtual favicon candidate');
  assert.strictEqual(img.src.includes('foo.example.com/favicon.ico'), false, 'strict mode should not assign the direct favicon');
  assert.strictEqual(img.src.includes('gstatic'), false, 'strict mode should not assign a third-party proxy favicon');
}

async function testOverlayFailsClosedBeforePolicyStateLoads() {
  const {
    runtime,
    vpnPageUrl,
    vpnDirectFaviconUrl,
    vpnExtensionUrl
  } = createRuntime({ enhancedFaviconFetchEnabled: undefined });
  const img = createFakeImage();

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    vpnPageUrl,
    'foo.example.com',
    vpnDirectFaviconUrl
  );

  await wait(0);

  assert.strictEqual(img.src, vpnExtensionUrl, 'unloaded favicon policy should be treated as strict mode');
}

async function testOverlayExcludedPathUsesStrictCandidatesWhileEnhancedIsOn() {
  const requestedUrls = [];
  const {
    runtime,
    vpnPageUrl,
    vpnDirectFaviconUrl,
    vpnExtensionUrl,
    vpnGstaticUrl,
    preloadedUrls,
    attachedDataUrls,
    warmedIconLists
  } = createRuntime({
    enhancedFaviconFetchEnabled: true,
    excludedPageUrl: 'https://foo.example.com/',
    requestFaviconData(url) {
      requestedUrls.push(url);
      return Promise.resolve(null);
    }
  });
  const img = createFakeImage();

  runtime.preloadIcon(vpnDirectFaviconUrl, vpnPageUrl);
  runtime.preloadIcon(vpnGstaticUrl, vpnPageUrl);
  runtime.preloadIcon(vpnExtensionUrl, vpnPageUrl);
  runtime.attachFaviconData({}, vpnDirectFaviconUrl, 'foo.example.com', vpnPageUrl);
  runtime.warmIconCache([{ url: vpnPageUrl, favicon: vpnDirectFaviconUrl }]);
  runtime.attachResolvedFaviconWithFallbacks(
    img,
    vpnPageUrl,
    'foo.example.com',
    vpnDirectFaviconUrl
  );

  await wait(0);

  assert.deepStrictEqual(preloadedUrls, [vpnExtensionUrl], 'excluded overlay paths should preload only browser-cache favicons');
  assert.deepStrictEqual(attachedDataUrls, [], 'excluded overlay paths should not request direct favicon data');
  assert.strictEqual(warmedIconLists[0][0].favicon, '', 'excluded overlay paths should remove direct icons before warming the cache');
  assert.deepStrictEqual(requestedUrls, [], 'excluded overlay paths should not probe direct, proxy, or root candidates');
  assert.strictEqual(img.src, vpnExtensionUrl, 'enhanced-on excluded paths should use the same strict candidate plan as global off');

  const staleImg = createFakeImage();
  staleImg.src = vpnDirectFaviconUrl;
  staleImg.setAttribute('data-favicon-current-src', vpnDirectFaviconUrl);
  runtime.attachResolvedFaviconWithFallbacks(staleImg, vpnPageUrl, 'foo.example.com', vpnDirectFaviconUrl);
  staleImg._xOverlayThemeFaviconErrorHandler();
  assert.notStrictEqual(
    staleImg.src,
    vpnDirectFaviconUrl,
    'excluded overlay paths should not restore a previously working direct favicon after strict candidates fail'
  );

  const publicImg = createFakeImage();
  const publicRuntime = createRuntime({ enhancedFaviconFetchEnabled: true });
  publicRuntime.runtime.attachResolvedFaviconWithFallbacks(
    publicImg,
    publicRuntime.vpnPageUrl,
    'foo.example.com',
    publicRuntime.vpnDirectFaviconUrl
  );
  assert.strictEqual(publicImg.src, publicRuntime.vpnDirectFaviconUrl, 'nonexcluded enhanced-on paths should keep direct candidates');
}

async function testOverlayUnifiedPathRuleMatrix() {
  const privatePageUrl = 'https://foo.example.com/private';
  const publicPageUrl = 'https://foo.example.com/public';
  const directUrl = 'https://foo.example.com/favicon.ico';
  const privateExtensionUrl = `chrome-extension://abc/_favicon/?pageUrl=${encodeURIComponent(privatePageUrl)}&size=128`;
  const privateGstaticUrl = `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(privatePageUrl)}&size=128`;
  const publicGstaticUrl = `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(publicPageUrl)}&size=128`;
  const requestedUrls = [];
  const {
    runtime,
    preloadedUrls,
    attachedDataUrls,
    attachedDataRequestPages,
    warmedIconLists
  } = createRuntime({
    enhancedFaviconFetchEnabled: true,
    excludedPageUrl: privatePageUrl,
    requestFaviconData(url, pageUrl) {
      requestedUrls.push({ url, pageUrl: pageUrl || '' });
      return Promise.resolve(null);
    }
  });

  const privateImg = createFakeImage();
  runtime.attachResolvedFaviconWithFallbacks(privateImg, privatePageUrl, 'foo.example.com', directUrl);
  assert.strictEqual(privateImg.src, privateExtensionUrl, 'excluded overlay matrix path should render only Lumno browser cache');
  privateImg._xOverlayThemeFaviconErrorHandler();
  assert.notStrictEqual(privateImg.src, privateGstaticUrl, 'excluded overlay matrix path should not fall through to gstatic');
  runtime.preloadIcon(directUrl, privatePageUrl);
  runtime.preloadIcon(privateGstaticUrl, privatePageUrl);
  runtime.preloadIcon(privateExtensionUrl, privatePageUrl);
  runtime.attachFaviconData(createFakeImage(), directUrl, 'foo.example.com', privatePageUrl);
  runtime.warmIconCache([{ url: privatePageUrl, favicon: directUrl }]);
  assert.deepStrictEqual(preloadedUrls, [privateExtensionUrl], 'excluded overlay matrix path should not preload direct or gstatic sources');
  assert.deepStrictEqual(attachedDataUrls, [], 'excluded overlay matrix path should not attach direct favicon data');
  assert.deepStrictEqual(requestedUrls, [], 'excluded overlay matrix path should not request page, root, manifest, direct, or proxy data');
  assert.strictEqual(warmedIconLists[0][0].favicon, '', 'excluded overlay matrix path should strip warm-cache network sources');

  const publicImg = createFakeImage();
  runtime.attachResolvedFaviconWithFallbacks(publicImg, publicPageUrl, 'foo.example.com', directUrl);
  assert.strictEqual(publicImg.src, directUrl, 'same-host nonexcluded overlay path should retain direct candidates');
  runtime.preloadIcon(directUrl, publicPageUrl);
  runtime.preloadIcon(publicGstaticUrl, publicPageUrl);
  runtime.attachFaviconData(createFakeImage(), directUrl, 'foo.example.com', publicPageUrl);
  runtime.warmIconCache([{ url: publicPageUrl, favicon: directUrl }]);
  assert.ok(preloadedUrls.includes(directUrl), 'same-host nonexcluded overlay path should retain direct preloads');
  assert.ok(preloadedUrls.includes(publicGstaticUrl), 'same-host nonexcluded overlay path should retain gstatic preloads');
  assert.deepStrictEqual(attachedDataUrls, [directUrl], 'same-host nonexcluded overlay path should retain favicon data attachment');
  assert.deepStrictEqual(attachedDataRequestPages, [publicPageUrl], 'overlay favicon data should preserve the page-rule context');
  assert.strictEqual(warmedIconLists[1][0].favicon, directUrl, 'same-host nonexcluded overlay path should retain warm-cache sources');
}

async function testOverlayStrictModeReusesCachedFaviconData() {
  const faviconDataCache = new Map();
  const cachedDataUrl = 'data:image/png;base64,Y2FjaGVk';
  const {
    runtime,
    vpnPageUrl,
    vpnDirectFaviconUrl
  } = createRuntime({
    enhancedFaviconFetchEnabled: false,
    faviconDataCache
  });
  faviconDataCache.set(vpnDirectFaviconUrl, cachedDataUrl);
  const img = createFakeImage();

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    vpnPageUrl,
    'foo.example.com',
    vpnDirectFaviconUrl
  );

  await wait(0);

  assert.strictEqual(img.src, cachedDataUrl, 'strict mode should prefer cached data without reusing its direct URL');
}

async function testOverlayPolicyEnableRecoversReplacedStrictFallback() {
  let replacementVisible = false;
  let rerenderCount = 0;
  let currentImg = createFakeImage();
  let runtime = null;
  let created = null;
  const suggestionRowsRoot = {
    contains(img) {
      return img === currentImg;
    }
  };
  const runtimeOptions = {
    enhancedFaviconFetchEnabled: false,
    getOverlayPanel() {
      return {
        querySelectorAll() {
          return currentImg && currentImg.isConnected ? [currentImg] : [];
        }
      };
    },
    getSuggestionRowsRoot() {
      return suggestionRowsRoot;
    }
  };
  const replaceFailedImage = () => {
    replacementVisible = true;
    currentImg.isConnected = false;
  };
  runtimeOptions.rerenderReplacedFaviconRows = createRealPolicyRerender({
    suggestionsContainer: {
      querySelector() {
        return replacementVisible ? {} : null;
      }
    },
    latestOverlayQuery: 'vpn',
    lastSuggestionResponse: [{ type: 'history', title: 'VPN', url: 'https://foo.example.com/' }],
    tabs: [],
    updateSearchSuggestions(_suggestions, query, options) {
      assert.strictEqual(query, 'vpn', 'active-search recovery should preserve its query');
      assert.deepStrictEqual(options, { forceFullRerender: true });
      replacementVisible = false;
      rerenderCount += 1;
      currentImg = createFakeImage();
      runtime.attachResolvedFaviconWithFallbacks(
        currentImg,
        created.vpnPageUrl,
        'foo.example.com',
        created.vpnDirectFaviconUrl,
        replaceFailedImage
      );
    },
    renderTabSuggestions() {
      throw new Error('active-search policy recovery should not render open tabs');
    }
  });
  created = createRuntime(runtimeOptions);
  runtime = created.runtime;

  runtime.attachResolvedFaviconWithFallbacks(
    currentImg,
    created.vpnPageUrl,
    'foo.example.com',
    created.vpnDirectFaviconUrl,
    replaceFailedImage
  );
  assert.strictEqual(currentImg.src, created.vpnExtensionUrl, 'strict mode should initially try only the virtual favicon');
  assert.notStrictEqual(
    currentImg.src,
    created.vpnDirectFaviconUrl,
    'strict mode should not make the direct favicon retryable before the policy is enabled'
  );

  currentImg.dispatchEvent('error');
  assert.strictEqual(replacementVisible, true, 'virtual favicon failure should replace the strict-mode image');

  runtimeOptions.enhancedFaviconFetchEnabled = true;
  runtime.refreshOverlayFaviconsForPolicyChange();

  assert.strictEqual(rerenderCount, 1, 'enabling enhanced fetching should rerender the replaced row once');
  assert.strictEqual(replacementVisible, false, 'the replacement should be consumed by the recovery rerender');
  assert.strictEqual(
    currentImg.src,
    created.vpnDirectFaviconUrl,
    'the direct favicon candidate should become retryable only after enhanced fetching is enabled'
  );

  runtimeOptions.enhancedFaviconFetchEnabled = false;
  runtime.refreshOverlayFaviconsForPolicyChange();

  assert.strictEqual(rerenderCount, 1, 'disabling should refresh a surviving row without an unnecessary rerender');
  assert.strictEqual(currentImg.src, created.vpnExtensionUrl, 'disabling should restore the strict virtual favicon source');
  assert.strictEqual(currentImg.src.includes('favicon.ico'), false, 'disabling should not retain the direct target candidate');
  assert.strictEqual(currentImg.src.includes('gstatic'), false, 'disabling should not introduce a third-party fallback');
}

async function testOverlayOpenTabPolicyRecoveryIsSafeInBothDirections() {
  let replacementVisible = false;
  let rerenderCount = 0;
  let currentImg = createFakeImage();
  let runtime = null;
  let created = null;
  const suggestionRowsRoot = {
    contains(img) {
      return img === currentImg;
    }
  };
  const runtimeOptions = {
    enhancedFaviconFetchEnabled: false,
    getOverlayPanel() {
      return {
        querySelectorAll() {
          return currentImg && currentImg.isConnected ? [currentImg] : [];
        }
      };
    },
    getSuggestionRowsRoot() {
      return suggestionRowsRoot;
    }
  };
  const replaceFailedImage = () => {
    replacementVisible = true;
    currentImg.isConnected = false;
  };
  runtimeOptions.rerenderReplacedFaviconRows = createRealPolicyRerender({
    suggestionsContainer: {
      querySelector() {
        return replacementVisible ? {} : null;
      }
    },
    latestOverlayQuery: '',
    lastSuggestionResponse: [],
    tabs: [{ id: 7, title: 'VPN', url: 'https://foo.example.com/' }],
    updateSearchSuggestions() {
      throw new Error('open-tab policy recovery should not render active-search results');
    },
    renderTabSuggestions(tabList) {
      assert.strictEqual(tabList.length, 1, 'open-tab recovery should reuse the current tab list');
      replacementVisible = false;
      rerenderCount += 1;
      currentImg = createFakeImage();
      runtime.attachResolvedFaviconWithFallbacks(
        currentImg,
        created.vpnPageUrl,
        'foo.example.com',
        created.vpnDirectFaviconUrl,
        replaceFailedImage
      );
    }
  });
  created = createRuntime(runtimeOptions);
  runtime = created.runtime;

  runtime.attachResolvedFaviconWithFallbacks(
    currentImg,
    created.vpnPageUrl,
    'foo.example.com',
    created.vpnDirectFaviconUrl,
    replaceFailedImage
  );
  assert.strictEqual(currentImg.src, created.vpnExtensionUrl, 'strict open-tab rows should start with the virtual favicon');

  currentImg.dispatchEvent('error');
  assert.strictEqual(replacementVisible, true, 'failed strict open-tab favicons should expose a recoverable fallback');

  runtimeOptions.enhancedFaviconFetchEnabled = true;
  runtime.refreshOverlayFaviconsForPolicyChange();

  assert.strictEqual(rerenderCount, 1, 'enabling should rebuild a replaced open-tab row once');
  assert.strictEqual(currentImg.src, created.vpnDirectFaviconUrl, 'enabled open-tab rows should retry the direct candidate');

  runtimeOptions.enhancedFaviconFetchEnabled = false;
  runtime.refreshOverlayFaviconsForPolicyChange();

  assert.strictEqual(rerenderCount, 1, 'disabling should refresh the surviving open-tab image without rebuilding it');
  assert.strictEqual(currentImg.src, created.vpnExtensionUrl, 'disabling should restore the open-tab virtual favicon');
  assert.strictEqual(currentImg.src.includes('favicon.ico'), false, 'strict open-tab rows should not retain a direct candidate');
  assert.strictEqual(currentImg.src.includes('gstatic'), false, 'strict open-tab rows should not introduce a third-party proxy');
}

async function testOverlayUsesChromeFavicon2ForBrowserInternalPages() {
  const requestedUrls = [];
  const {
    runtime,
    browserPageUrl,
    browserPageFavicon2Url
  } = createRuntime({
    requestFaviconData(url) {
      requestedUrls.push(url);
      return Promise.resolve(null);
    },
    shouldBlockOverlayFaviconForHost(hostname) {
      const host = String(hostname || '').toLowerCase();
      return host === '127.0.0.1' || host === 'localhost' || host === 'extensions';
    }
  });
  const img = createFakeImage();
  let failed = false;

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    browserPageUrl,
    'extensions',
    browserPageFavicon2Url,
    () => {
      failed = true;
    }
  );

  await wait(0);

  assert.strictEqual(failed, false, 'browser internal pages should not use the local-network fallback path');
  assert.strictEqual(
    img.src,
    browserPageFavicon2Url,
    'browser internal pages should render chrome://favicon2 directly'
  );
  assert.deepStrictEqual(
    requestedUrls,
    [],
    'browser internal favicon2 should not be converted into a background data request first'
  );
}

async function testOverlayUsesExtensionFaviconProxyForBrowserInternalPagesWithoutExplicitIcon() {
  const {
    runtime,
    browserPageUrl,
    browserPageExtensionUrl
  } = createRuntime({
    shouldBlockOverlayFaviconForHost(hostname) {
      const host = String(hostname || '').toLowerCase();
      return host === '127.0.0.1' || host === 'localhost' || host === 'extensions';
    }
  });
  const img = createFakeImage();
  let failed = false;

  runtime.attachResolvedFaviconWithFallbacks(
    img,
    browserPageUrl,
    'extensions',
    '',
    () => {
      failed = true;
    }
  );

  await wait(0);

  assert.strictEqual(failed, false, 'browser internal pages should not fall back when no explicit icon was supplied');
  assert.strictEqual(
    img.src,
    browserPageExtensionUrl,
    'browser internal pages should use the extension _favicon proxy before chrome://favicon2'
  );
}

testOverlayResolvesLocalFaviconThroughDataUrl()
  .then(testOverlayFallsBackWhenLocalFaviconDataUnavailable)
  .then(testOverlaySkipsRootIconProbeWhenEnhancedFetchDisabled)
  .then(testOverlayStrictModeUsesOnlyVirtualFaviconForVpnHostname)
  .then(testOverlayFailsClosedBeforePolicyStateLoads)
  .then(testOverlayExcludedPathUsesStrictCandidatesWhileEnhancedIsOn)
  .then(testOverlayUnifiedPathRuleMatrix)
  .then(testOverlayStrictModeReusesCachedFaviconData)
  .then(testOverlayPolicyEnableRecoversReplacedStrictFallback)
  .then(testOverlayOpenTabPolicyRecoveryIsSafeInBothDirections)
  .then(testOverlayPolicyRecoveryUsesRealSearchAndOpenTabRerenderPaths)
  .then(testOverlayUsesChromeFavicon2ForBrowserInternalPages)
  .then(testOverlayUsesExtensionFaviconProxyForBrowserInternalPagesWithoutExplicitIcon)
  .then(testOverlayRendererLetsLocalFaviconsReachRuntime)
  .then(testOverlayRendererDefersFallbackReplacementUntilFaviconIsMounted)
  .then(testOverlayRendererReusesRuntimeFallbackIcon)
  .then(testOverlayRendererBuildsBrowserPageFavicon2WhenMissingExplicitIcon)
  .then(testOverlayRendererUsesExtensionFaviconProxyForBrowserPages)
  .then(testOverlayRendererDefinesChromeMonogramHelper)
  .then(testOverlayRendererLoadsFaviconPolicyBeforeInitialTabs)
  .then(testOverlayRendererGuardsThemeSourcesInStrictMode)
  .then(() => {
    console.log('overlay favicon view tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
