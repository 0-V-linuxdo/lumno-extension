const assert = require('assert');
const fs = require('fs');
const shortcutFavicon = require('../src/shared/shortcut-favicon.js');

const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');
const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');
const overlayRuntimeSource = fs.readFileSync('src/overlay/runtime.js', 'utf8');
const shortcutFaviconSource = fs.readFileSync('src/shared/shortcut-favicon.js', 'utf8');
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

assert.match(
  searchUtilsSource,
  /const iconSize =[^\n]*: 128;/,
  'provider fallback favicons should request a Retina-sized source by default'
);
assert.doesNotMatch(
  siteSearchSource,
  /google\.com\/s2\/favicons\?[^"\n]*&sz=64/,
  'built-in AI provider fallbacks should not request 64px raster artwork'
);

const webAccessibleResources = (manifest.web_accessible_resources || [])
  .flatMap((entry) => entry && Array.isArray(entry.resources) ? entry.resources : []);
[
  'assets/images/site-search/youtube.svg',
  'assets/images/site-search/baidu.svg',
  'assets/images/site-search/bing.svg',
  'assets/images/site-search/google.svg',
  'assets/images/site-search/douban.svg',
  'assets/images/site-search/sogou.svg',
  'assets/images/site-search/taobao.svg',
  'assets/images/site-search/reddit.svg'
].forEach((resourcePath) => {
  assert.ok(fs.existsSync(resourcePath), `${resourcePath} should be bundled`);
  assert.ok(webAccessibleResources.includes(resourcePath), `${resourcePath} should be web-accessible`);
  const vectorSource = fs.readFileSync(resourcePath, 'utf8');
  assert.match(vectorSource, /<svg[\s\S]*<path/);
  assert.match(
    vectorSource,
    /<svg[^>]*viewBox="0 0 [^"]+"/,
    `${resourcePath} should expose its complete vector canvas without clipping`
  );
});

assert.match(
  shortcutFaviconSource,
  /yt: 'assets\/images\/site-search\/youtube\.svg',[\s\S]*?so: 'assets\/images\/site-search\/baidu\.svg',[\s\S]*?bi: 'assets\/images\/site-search\/bing\.svg',[\s\S]*?gg: 'assets\/images\/site-search\/google\.svg',[\s\S]*?db: 'assets\/images\/site-search\/douban\.svg',[\s\S]*?wx: 'assets\/images\/site-search\/sogou\.svg',[\s\S]*?tb: 'assets\/images\/site-search\/taobao\.svg',[\s\S]*?rd: 'assets\/images\/site-search\/reddit\.svg'/,
  'known undersized providers should use bundled vector artwork'
);
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
  /siteSearchPrefixCurrent\.style\.cssText = cssText\(\[[\s\S]*?\['display', 'inline-flex'\][\s\S]*?\['line-height', '18px'\][\s\S]*?\['overflow', 'visible'\]/,
  'the current-mode label should keep a full-height inline flex line box'
);

console.log('overlay site-search icon cache tests passed');
