const assert = require('assert');
const fs = require('fs');
const path = require('path');

const shortcutFavicon = require('../src/shared/shortcut-favicon.js');

function createPngHeader(width, height) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes.buffer;
}

function createMemoryStorage(initialValue) {
  const data = { ...(initialValue || {}) };
  return {
    data,
    get(keys, callback) {
      const result = {};
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
        result[key] = data[key];
      });
      callback(result);
    },
    set(value, callback) {
      Object.assign(data, value || {});
      callback();
    }
  };
}

function testCandidateDiscovery() {
  const html = `
    <html><head>
      <base href="https://cdn.example.com/assets/">
      <link rel="icon" type="image/png" sizes="32x32" href="small.png">
      <link rel="icon" type="image/svg+xml" href="brand.svg">
      <link rel="apple-touch-icon" sizes="180x180" href="touch.png">
      <link rel="manifest" href="/app.webmanifest">
    </head></html>
  `;
  const candidates = shortcutFavicon.parseHtmlIconCandidates(
    html,
    'https://example.com/docs',
    'light'
  );
  assert.strictEqual(candidates[0].url, 'https://cdn.example.com/assets/brand.svg');
  assert.strictEqual(candidates[0].vector, true);
  assert.ok(
    candidates.findIndex((item) => item.url.endsWith('/touch.png')) <
      candidates.findIndex((item) => item.url.endsWith('/small.png')),
    'large touch icons should rank ahead of 32px favicons'
  );
  assert.deepStrictEqual(
    shortcutFavicon.parseHtmlManifestUrls(html, 'https://example.com/docs'),
    ['https://cdn.example.com/app.webmanifest']
  );
}

function testManifestCandidates() {
  const candidates = shortcutFavicon.parseManifestIconCandidates({
    icons: [
      { src: 'icon-64.png', sizes: '64x64', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  }, 'https://example.com/app.webmanifest');
  assert.strictEqual(candidates[0].url, 'https://example.com/icon.svg');
  assert.strictEqual(candidates[1].url, 'https://example.com/icon-512.png');
  assert.strictEqual(candidates[1].purpose, 'any');
}

function testResourceInspection() {
  const highResolution = shortcutFavicon.inspectIconResource(
    createPngHeader(128, 128),
    'image/png',
    'https://example.com/icon.png',
    {}
  );
  const lowResolution = shortcutFavicon.inspectIconResource(
    createPngHeader(32, 32),
    'image/png',
    'https://example.com/icon.png',
    {}
  );
  const formerlyAcceptedResolution = shortcutFavicon.inspectIconResource(
    createPngHeader(64, 64),
    'image/png',
    'https://example.com/icon-64.png',
    {}
  );
  const svg = new TextEncoder().encode('<svg viewBox="0 0 128 128"></svg>');
  const vector = shortcutFavicon.inspectIconResource(
    svg.buffer,
    'image/svg+xml',
    'https://example.com/icon.svg',
    {}
  );
  const mislabeledHtml = new TextEncoder().encode('<html>not an icon</html>');
  const invalid = shortcutFavicon.inspectIconResource(
    mislabeledHtml.buffer,
    'image/png',
    'https://example.com/icon.png',
    { declaredSize: 192 }
  );
  assert.strictEqual(highResolution.usable, true);
  assert.deepStrictEqual(
    { width: highResolution.width, height: highResolution.height },
    { width: 128, height: 128 }
  );
  assert.strictEqual(lowResolution.usable, false);
  assert.strictEqual(
    formerlyAcceptedResolution.usable,
    false,
    '64px raster artwork is too small for a 36px icon on a 2x display'
  );
  assert.strictEqual(shortcutFavicon.MIN_ICON_DIMENSION, 128);
  assert.strictEqual(vector.usable, true);
  assert.strictEqual(vector.vector, true);
  assert.strictEqual(invalid.usable, false);
}

async function testLocalCache() {
  const now = 1_800_000_000_000;
  const pageUrl = 'https://example.com/docs#section';
  const dataUrl = 'data:image/png;base64,aGlnaC1yZXM=';
  const cache = shortcutFavicon.setCachedIcon(
    {},
    pageUrl,
    dataUrl,
    'https://example.com/icon-192.png',
    now
  );
  assert.strictEqual(
    shortcutFavicon.getCachedIconDataUrl(cache, 'https://example.com/docs', now),
    dataUrl
  );
  assert.deepStrictEqual(
    shortcutFavicon.retainCachedIcons(cache, ['https://other.example/'], now),
    {}
  );

  const storage = createMemoryStorage({
    [shortcutFavicon.DEFAULT_STORAGE_KEY]: cache
  });
  const store = shortcutFavicon.createShortcutFaviconStore({
    storageArea: storage,
    chromeApi: { runtime: {} }
  });
  const loaded = await store.readAll();
  assert.strictEqual(
    shortcutFavicon.getCachedIconDataUrl(loaded, 'https://example.com/docs', now),
    dataUrl
  );
  await store.writeAll(loaded);
  assert.deepStrictEqual(storage.data[shortcutFavicon.DEFAULT_STORAGE_KEY], loaded);
}

async function testDedicatedSiteSearchCachePolicy() {
  const now = 1_800_000_000_000;
  const dataUrl = 'data:image/png;base64,aGlnaC1yZXM=';
  let cache = {};
  for (let index = 0; index < 30; index += 1) {
    cache = shortcutFavicon.setCachedIcon(
      cache,
      `https://provider-${index}.example/`,
      dataUrl,
      `https://provider-${index}.example/icon-192.png`,
      now - index,
      shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
    );
  }
  assert.strictEqual(
    Object.keys(cache).length,
    30,
    'the dedicated provider cache should not inherit the 24-shortcut entry cap'
  );

  const fiveMonthsAgo = now - (1000 * 60 * 60 * 24 * 150);
  const longLivedCache = shortcutFavicon.setCachedIcon(
    {},
    'https://long-lived.example/',
    dataUrl,
    'https://long-lived.example/icon.svg',
    fiveMonthsAgo,
    shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
  );
  assert.strictEqual(
    shortcutFavicon.getCachedIconDataUrl(
      longLivedCache,
      'https://long-lived.example/',
      now,
      shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
    ),
    dataUrl,
    'provider icons should remain local across the longer low-churn cache window'
  );

  const storage = createMemoryStorage({
    [shortcutFavicon.SITE_SEARCH_STORAGE_KEY]: cache
  });
  const store = shortcutFavicon.createShortcutFaviconStore({
    storageArea: storage,
    storageKey: shortcutFavicon.SITE_SEARCH_STORAGE_KEY,
    chromeApi: { runtime: {} },
    ...shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
  });
  assert.strictEqual(Object.keys(await store.readAll()).length, 30);
}

function testCanonicalProviderResolution() {
  const now = 1_800_000_000_000;
  const googleProvider = {
    key: 'gg',
    template: 'https://www.google.com/search?q={query}',
    iconUrl: shortcutFavicon.GOOGLE_BRAND_ICON_URL
  };
  const youtubeProvider = {
    key: 'yt',
    template: 'https://www.youtube.com/results?search_query={query}'
  };
  const googlePageUrl = shortcutFavicon.getSiteSearchProviderPageUrl(googleProvider);
  const youtubePageUrl = shortcutFavicon.getSiteSearchProviderPageUrl(youtubeProvider);
  const googleDataUrl = 'data:image/png;base64,Z29vZ2xl';
  const youtubeDataUrl = 'data:image/png;base64,eW91dHViZQ==';
  const wrongGoogleCache = shortcutFavicon.setCachedIcon(
    {},
    googlePageUrl,
    googleDataUrl,
    'https://www.google.com/favicon.ico',
    now,
    shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
  );
  assert.strictEqual(
    shortcutFavicon.getSiteSearchProviderIcon(
      wrongGoogleCache,
      googleProvider,
      now,
      shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
    ),
    shortcutFavicon.GOOGLE_BRAND_ICON_URL,
    'a mismatched Google cache source must never replace the pinned brand icon'
  );

  const matchingGoogleCache = shortcutFavicon.setCachedIcon(
    {},
    googlePageUrl,
    googleDataUrl,
    shortcutFavicon.GOOGLE_BRAND_ICON_URL,
    now,
    shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
  );
  assert.strictEqual(
    shortcutFavicon.getSiteSearchProviderIcon(
      matchingGoogleCache,
      googleProvider,
      now,
      shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
    ),
    googleDataUrl,
    'a validated Google data URL should be reusable by every surface'
  );

  const youtubeCache = shortcutFavicon.setCachedIcon(
    {},
    youtubePageUrl,
    youtubeDataUrl,
    'https://www.youtube.com/img/favicon_144x144.png',
    now,
    shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
  );
  assert.strictEqual(
    shortcutFavicon.getSiteSearchProviderIcon(
      youtubeCache,
      youtubeProvider,
      now,
      shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS
    ),
    youtubeDataUrl,
    'YouTube should resolve to the same persisted data URL in overlay and newtab'
  );

  [
    ['yt', youtubeProvider, 'youtube.svg'],
    ['so', { key: 'so', template: 'https://www.baidu.com/s?wd={query}' }, 'baidu.svg'],
    ['bi', { key: 'bi', template: 'https://www.bing.com/search?q={query}' }, 'bing.svg'],
    ['gg', googleProvider, 'google.svg'],
    ['db', { key: 'db', template: 'https://www.douban.com/search?q={query}' }, 'douban.svg'],
    ['wx', { key: 'wx', template: 'https://weixin.sogou.com/weixin?query={query}' }, 'sogou.svg'],
    ['tb', { key: 'tb', template: 'https://s.taobao.com/search?q={query}' }, 'taobao.svg'],
    ['rd', { key: 'rd', template: 'https://www.reddit.com/search/?q={query}' }, 'reddit.svg']
  ].forEach(([, provider, assetName]) => {
    const assetPath = path.join(__dirname, '..', 'assets/images/site-search', assetName);
    assert.ok(fs.existsSync(assetPath), `${assetName} should exist as a bundled provider icon`);
    assert.strictEqual(
      shortcutFavicon.getSiteSearchProviderIcon(
        {},
        provider,
        now,
        {
          ...shortcutFavicon.SITE_SEARCH_CACHE_OPTIONS,
          resolveAssetUrl: (path) => `chrome-extension://test/${path}`
        }
      ),
      `chrome-extension://test/assets/images/site-search/${assetName}`,
      'bundled vector providers should resolve instantly without a network or cache lookup'
    );
  });
  assert.match(
    fs.readFileSync(
      path.join(__dirname, '..', 'assets/images/site-search/taobao.svg'),
      'utf8'
    ),
    /viewBox="0 0 25 24"/,
    'Taobao artwork should use a canvas wide enough to avoid clipping its right edge'
  );
  assert.match(shortcutFavicon.SITE_SEARCH_STORAGE_KEY, /canonical/);
}

async function run() {
  testCandidateDiscovery();
  testManifestCandidates();
  testResourceInspection();
  await testLocalCache();
  await testDedicatedSiteSearchCachePolicy();
  testCanonicalProviderResolution();
  console.log('shortcut high-resolution favicon tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
