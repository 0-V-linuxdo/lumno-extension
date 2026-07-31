const assert = require('assert');
const fs = require('fs');
const shortcutFavicon = require('../src/shared/shortcut-favicon.js');
const searchUtils = require('../src/shared/search-utils.js');

const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');
const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');
const overlayRuntimeSource = fs.readFileSync('src/overlay/runtime.js', 'utf8');
const inputModeSource = fs.readFileSync('src/shared/search-input-mode.js', 'utf8');
const inputModeCss = fs.readFileSync('src/shared/search-input.css', 'utf8');
const searchUtilsSource = fs.readFileSync('src/shared/search-utils.js', 'utf8');
const siteSearchSource = fs.readFileSync('assets/data/site-search.json', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

assert.match(
  backgroundSource,
  /'src\/shared\/shortcut-favicon\.js',[\s\S]*?'src\/overlay\/search-panel\.js'/,
  'the injected overlay should load the shared high-resolution shortcut favicon runtime first'
);

assert.match(
  overlayRuntimeSource,
  /siteSearchIconCache:\s*'_x_extension_site_search_icon_cache_canonical_2026_unique_'/,
  'the overlay runtime should expose a fresh Retina provider icon cache key'
);

assert.doesNotMatch(
  `${siteSearchSource}\n${searchUtilsSource}`,
  /["']?iconUrl["']?\s*:\s*["']https?:/,
  'built-in provider catalogs should not retain remote icon fallbacks'
);

const webAccessibleResources = (manifest.web_accessible_resources || [])
  .flatMap((entry) => entry && Array.isArray(entry.resources) ? entry.resources : []);
const bundledProviderIconResourcePatterns = [
  'assets/images/site-search/*.svg',
  'assets/images/site-search/*.png'
];
assert.ok(
  bundledProviderIconResourcePatterns.every((pattern) => webAccessibleResources.includes(pattern)),
  'all bundled provider artwork should remain web-accessible without per-icon manifest maintenance'
);
const expectedBundledProviderIcons = Object.freeze({
  yt: 'assets/images/site-search/youtube.svg',
  bb: 'assets/images/site-search/bilibili.svg',
  gh: 'assets/images/site-search/github.svg',
  gpt: 'assets/images/site-search/openai.svg',
  gm: 'assets/images/site-search/gemini.svg',
  dbai: 'assets/images/site-search/doubao-mascot.png',
  qw: 'assets/images/site-search/qwen.svg',
  yb: 'assets/images/site-search/yuanbao.svg',
  mx: 'assets/images/site-search/minimax.svg',
  ds: 'assets/images/site-search/deepseek.svg',
  kimi: 'assets/images/site-search/kimi.svg',
  so: 'assets/images/site-search/baidu.svg',
  bi: 'assets/images/site-search/bing.svg',
  gg: 'assets/images/site-search/google.svg',
  ddg: 'assets/images/site-search/duckduckgo.svg',
  br: 'assets/images/site-search/brave.svg',
  eco: 'assets/images/site-search/ecosia.svg',
  zh: 'assets/images/site-search/zhihu.svg',
  db: 'assets/images/site-search/douban.svg',
  jj: 'assets/images/site-search/juejin.svg',
  tb: 'assets/images/site-search/taobao.png',
  tm: 'assets/images/site-search/tmall.png',
  wx: 'assets/images/site-search/sogou.svg',
  tw: 'assets/images/site-search/x.svg',
  rd: 'assets/images/site-search/reddit.svg',
  wk: 'assets/images/site-search/wikipedia.svg',
  zw: 'assets/images/site-search/wikipedia.svg'
});
assert.deepStrictEqual(
  shortcutFavicon.SITE_SEARCH_PINNED_ICON_ASSETS,
  expectedBundledProviderIcons,
  'every built-in provider should resolve to an audited local asset'
);
const siteSearchProviders = JSON.parse(siteSearchSource).items;
assert.deepStrictEqual(
  siteSearchProviders.map((provider) => provider.key),
  Object.keys(expectedBundledProviderIcons),
  'the bundled provider icon map should cover the complete built-in catalog in order'
);
siteSearchProviders.forEach((provider) => {
  assert.ok(!provider.icon && !provider.iconUrl,
    `${provider.key} should not retain a remote icon fallback`);
});
searchUtils.getDefaultSiteSearchProviders().forEach((provider) => {
  assert.ok(!provider.icon && !provider.iconUrl,
    `${provider.key} fallback should not retain a remote icon URL`);
});
new Set(Object.values(expectedBundledProviderIcons)).forEach((resourcePath) => {
  assert.ok(fs.existsSync(resourcePath), `${resourcePath} should be bundled`);
  assert.ok(
    webAccessibleResources.includes(resourcePath) ||
      bundledProviderIconResourcePatterns.some((pattern) => webAccessibleResources.includes(pattern)),
    `${resourcePath} should be web-accessible`
  );
  if (resourcePath.endsWith('.svg')) {
    const vectorSource = fs.readFileSync(resourcePath, 'utf8');
    assert.ok(
      /<svg[\s\S]*<path/.test(vectorSource) ||
        /<svg[\s\S]*<image[^>]+href="[^"]+\.png"/.test(vectorSource),
      `${resourcePath} should expose vector artwork or a bundled raster wrapper`
    );
    assert.match(
      vectorSource,
      /<svg[^>]*viewBox="-?(?:\d+\.?\d*|\.\d+) -?(?:\d+\.?\d*|\.\d+) (?:\d+\.?\d*|\.\d+) (?:\d+\.?\d*|\.\d+)"/,
      `${resourcePath} should expose a valid vector canvas`
    );
  } else {
    const pngSignature = fs.readFileSync(resourcePath).subarray(0, 8);
    assert.deepStrictEqual(
      [...pngSignature],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${resourcePath} should be a valid PNG asset`
    );
  }
});

const framedProviderIcons = Object.freeze({
  kimi: { background: '#000000', foreground: '#FFFFFF' },
  tm: { background: '#FF0036', foreground: '#FFFFFF' },
  tw: { background: '#000000', foreground: '#FFFFFF' }
});
Object.entries(framedProviderIcons).forEach(([providerKey, colors]) => {
  const resourcePath = expectedBundledProviderIcons[providerKey];
  if (resourcePath.endsWith('.png')) {
    const pngSignature = fs.readFileSync(resourcePath).subarray(0, 8);
    assert.deepStrictEqual(
      [...pngSignature],
      [137, 80, 78, 71, 13, 10, 26, 10],
      `${providerKey} should use a valid bundled raster asset`
    );
    return;
  }
  const vectorSource = fs.readFileSync(resourcePath, 'utf8');
  assert.match(
    vectorSource,
    new RegExp(`<rect[^>]+fill="${colors.background}"`),
    `${providerKey} should carry its own brand background for light-mode contrast`
  );
  assert.ok(
    new RegExp(`<(?:path|g)[^>]*[\\s\\S]*fill="${colors.foreground}"`).test(vectorSource) ||
      /<image[^>]+href="[^"]+\.png"/.test(vectorSource),
    `${providerKey} should reverse its mark for contrast on the bundled background`
  );
});

assert.match(
  backgroundSource,
  /const SITE_SEARCH_PINNED_ICON_KEYS = new Set\(Object\.keys\(\s*SHORTCUT_FAVICON\.SITE_SEARCH_PINNED_ICON_ASSETS \|\| \{\}\s*\)\);/,
  'bundled providers should skip unnecessary background discovery'
);

assert.match(
  backgroundSource,
  /scheduleSiteSearchProviderIconWarmup\(siteSearchProviders, ''\);\s*chrome\.scripting\.executeScript/,
  'provider icon warming should start without being awaited on the overlay reveal path'
);

assert.match(
  backgroundSource,
  /const SITE_SEARCH_ICON_WARM_CONCURRENCY = 2;/,
  'provider icon discovery should be rate-limited to protect overlay and browser responsiveness'
);

const googleProvider = {
  key: 'gg',
  template: 'https://www.google.com/search?q={query}',
  iconUrl: shortcutFavicon.GOOGLE_BRAND_ICON_URL
};
const googlePageUrl = shortcutFavicon.getSiteSearchProviderPageUrl(googleProvider);
const now = Date.now();
assert.strictEqual(
  shortcutFavicon.getSiteSearchProviderIcon({
    [shortcutFavicon.getCacheKey(googlePageUrl)]: {
      dataUrl: 'data:image/png;base64,AA==',
      sourceUrl: 'https://www.google.com/favicon.ico',
      updatedAt: now
    }
  }, googleProvider, now, shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS),
  shortcutFavicon.GOOGLE_BRAND_ICON_URL,
  'the pinned Google brand icon should bypass stale page-discovery cache entries'
);

assert.match(
  backgroundSource,
  /function scheduleSiteSearchProviderIconWarmup\(providers, preferredTheme\)[\s\S]*?hasUsableCachedSiteSearchProviderIcon\(provider\)/,
  'background warming should validate cached provider icons before skipping discovery'
);

assert.match(
  backgroundSource,
  /function resolveShortcutFaviconData\(pageUrl, preferredTheme, signal, explicitIconUrl\)[\s\S]*?source: 'explicit'[\s\S]*?result \|\| resolveFromPageOrProxy\(\)/,
  'background warming should validate explicit artwork before page discovery and the 128px proxy fallback'
);
assert.match(
  backgroundSource,
  /function canFetchShortcutFaviconUrl\(url\)[\s\S]*?policy\.ok[\s\S]*?!policy\.directFetchBlocked[\s\S]*?canFetchPageForFavicon\(url\)/,
  'provider icon discovery should centralize its safe fetch policy'
);
assert.match(
  backgroundSource,
  /const resolvedPageUrl =[\s\S]*?canFetchShortcutFaviconUrl\(resolvedPageUrl\)[\s\S]*?const resolvedManifestUrl =[\s\S]*?canFetchShortcutFaviconUrl\(resolvedManifestUrl\)[\s\S]*?const resolvedSourceUrl =[\s\S]*?canFetchShortcutFaviconUrl\(resolvedSourceUrl\)/,
  'provider icon discovery should revalidate every URL after redirects'
);
assert.match(
  backgroundSource,
  /readShortcutFaviconResponsePrefix\(\s*response,\s*SHORTCUT_FAVICON_MANIFEST_MAX_BYTES\s*\)[\s\S]*?JSON\.parse\(text\)/,
  'provider icon manifests should be read through the bounded response reader'
);

assert.match(
  backgroundSource,
  /function warmSiteSearchProviderIcons\(\)[\s\S]*?scheduleSiteSearchProviderIconWarmup\(providers, ''\)[\s\S]*?warmSiteSearchProviderIcons\(\);/,
  'provider icons should warm as soon as the background runtime starts'
);

assert.match(
  backgroundSource,
  /function removeLegacySiteSearchIconCaches\(\)[\s\S]*?localArea\.remove\(legacyKeys/,
  'obsolete provider cache namespaces should be removed during the canonical-cache migration'
);

[newtabSource, overlaySource].forEach((source) => {
  assert.match(
    source,
    /SHORTCUT_FAVICON\.getSiteSearchProviderIcon\(/,
    'newtab and overlay should resolve provider icons through the same shared function'
  );
  assert.match(
    source,
    /preferDirectProviderIcons:\s*true/,
    'newtab and overlay should bypass host-level favicon replacement for provider artwork'
  );
});

assert.match(
  newtabSource,
  /storageKey:\s*SITE_SEARCH_ICON_CACHE_STORAGE_KEY,[\s\S]*?function loadSiteSearchIconCache\(\)/,
  'newtab should hydrate the same dedicated provider cache as overlay'
);

assert.match(
  newtabSource,
  /function getSearchModeMenuItems\(\) \{\s*return loadSiteSearchIconCache\(\)\.then\(buildSearchModeMenuItems\);/,
  'newtab should finish the local cache read before rendering its provider menu'
);

assert.match(
  overlaySource,
  /function getSearchModeMenuItems\(\) \{[\s\S]*?return loadSiteSearchIconCache\(\)\.then\(buildSearchModeMenuItems\);/,
  'only opening the shortcut panel should wait for an unfinished local cache read'
);

assert.match(
  overlaySource,
  /siteSearchIconStorageListener[\s\S]*?setSiteSearchPrefix\(activeProvider,[\s\S]*?inputModeController\.refreshModeMenu\(\)/,
  'an open overlay tag and menu should adopt background-warmed icons immediately'
);

assert.match(
  newtabSource,
  /changes\[SITE_SEARCH_ICON_CACHE_STORAGE_KEY\][\s\S]*?setSiteSearchPrefix\(activeProvider,[\s\S]*?inputModeController\.refreshModeMenu\(\)/,
  'an open newtab tag and menu should adopt the same background-warmed icons immediately'
);

assert.match(
  inputModeSource,
  /function refreshModeMenu\([^)]*\)[\s\S]*?refreshModeMenu,/,
  'the shared input mode controller should support refreshing an already-open panel'
);

assert.match(
  inputModeCss,
  /\[data-search-input-mode-current\] \{[\s\S]*?overflow: visible !important;/,
  'the current-mode label should not clip fallback-font glyphs vertically'
);

assert.match(
  inputModeSource,
  /siteSearchPrefixCurrent\.style\.cssText = cssText\(\[[\s\S]*?\['display', currentLabelVisible \? 'inline-flex' : 'none'\][\s\S]*?\['line-height', '18px'\][\s\S]*?\['overflow', 'visible'\]/,
  'the current-mode label should keep its full-height line box only while the panel is open'
);

assert.match(
  inputModeCss,
  /\[data-search-input-mode-current\] \{[\s\S]*?display: none !important;[\s\S]*?\[data-current-visible="true"\][\s\S]*?\[data-search-input-mode-current\] \{[\s\S]*?display: inline-flex !important;/,
  'the current-mode label should use a dedicated reveal state'
);

assert.match(
  inputModeCss,
  /\[data-current-overlay="true"\][\s\S]*?\[data-search-input-mode-current\] \{[\s\S]*?position: absolute !important;[\s\S]*?left: var\(--x-lumno-search-mode-current-overlay-left, 0\) !important;[\s\S]*?z-index: 1 !important;/,
  'the current-mode label should stay out of flex layout while the chevron reveals it'
);

assert.match(
  inputModeSource,
  /onStart: nextOpen \? \(\) => \{[\s\S]*?setInputModePrefixCurrentOverlay\(true, currentOverlayLeft\);[\s\S]*?setInputModePrefixCurrentVisible\(true\);[\s\S]*?onFinish: nextOpen \? \(\) => \{[\s\S]*?setInputModePrefixCurrentOverlay\(false\);/,
  'the current-mode mask should run during the chip resize and return to normal layout afterward'
);

assert.match(
  inputModeCss,
  /\[data-current-visible="true"\][\s\S]*?\[data-search-input-mode-current-text\] \{[\s\S]*?animation: _x_lumno_search_mode_current_mask_reveal_2026_unique_[\s\S]*?140ms cubic-bezier\(0\.22, 1, 0\.36, 1\) both !important;[\s\S]*?@keyframes _x_lumno_search_mode_current_mask_reveal_2026_unique_[\s\S]*?clip-path: inset\(0 100% 0 0\);[\s\S]*?clip-path: inset\(0 0 0 0\);/,
  'the current-mode label should reveal behind the moving chevron using the chip resize rhythm'
);

console.log('overlay site-search icon cache tests passed');
