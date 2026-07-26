const assert = require('assert');
const fs = require('fs');
const path = require('path');
const recentStore = require('../src/newtab/recent-sites-store.js');
const bookmarkStore = require('../src/newtab/bookmarks-store.js');

const repoRoot = path.resolve(__dirname, '..');

function createMemoryStorage(initialData) {
  const data = { ...(initialData || {}) };
  return {
    get(keys, callback) {
      const result = {};
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
        result[key] = data[key];
      });
      callback(result);
    },
    set(value, callback) {
      Object.assign(data, value || {});
      if (callback) {
        callback();
      }
    },
    data
  };
}

async function testRecentStore() {
  assert.strictEqual(recentStore.normalizeRecentCount(8), 8);
  assert.strictEqual(recentStore.normalizeRecentCount('0'), 0);
  assert.strictEqual(recentStore.normalizeRecentCount(12), 4);

  const options = {
    normalizeHost: (host) => String(host || '').toLowerCase().replace(/^www\./, ''),
    sanitizeDisplayText: (text) => String(text || '').trim(),
    getSiteDisplayName: (host) => host.split('.')[0],
    shouldExcludeUrl: (url) => String(url || '').startsWith('chrome-extension://')
  };

  const merged = recentStore.mergeRecentSiteSources({
    ...options,
    mode: 'latest',
    limit: 4,
    pinned: [{ title: 'Pinned', url: 'https://pinned.example/a', lastVisitTime: 2 }],
    hidden: [{ url: 'https://hidden.example/a', lastVisitTime: 10 }],
    historyItems: [
      { title: 'Hidden', url: 'https://hidden.example/a', lastVisitTime: 5 },
      { title: 'Recent', url: 'https://recent.example/a', lastVisitTime: 8 }
    ],
    topSites: [
      { title: 'Top', url: 'https://top.example/' }
    ],
    tabs: [
      { title: 'Tab', url: 'https://tab.example/', lastAccessed: 9 },
      { title: 'Duplicate recent tab', url: 'https://recent.example/other', lastAccessed: 10 }
    ]
  });

  assert.deepStrictEqual(
    merged.map((item) => item.host),
    ['pinned.example', 'recent.example', 'top.example', 'tab.example']
  );
  assert.strictEqual(merged[0]._xPinned, true);

  const browserPageMerged = recentStore.mergeRecentSiteSources({
    ...options,
    mode: 'latest',
    limit: 4,
    candidateLimit: 4,
    pinned: [],
    hidden: [],
    shouldExcludeUrl: (url) => String(url || '') === 'chrome://newtab/',
    shouldPrioritizeTabUrl: (url) => String(url || '').startsWith('chrome://') &&
      String(url || '') !== 'chrome://newtab/',
    historyItems: [
      { title: 'One', url: 'https://one.example/', lastVisitTime: 20 },
      { title: 'Two', url: 'https://two.example/', lastVisitTime: 19 },
      { title: 'Three', url: 'https://three.example/', lastVisitTime: 18 },
      { title: 'Four', url: 'https://four.example/', lastVisitTime: 17 }
    ],
    tabs: [
      { title: '新标签页', url: 'chrome://newtab/', lastAccessed: 30 },
      { title: '扩展程序', url: 'chrome://extensions/', lastAccessed: 31 }
    ]
  });
  assert.ok(
    browserPageMerged.some((item) => item.url === 'chrome://extensions/'),
    'browser internal tabs should survive a full history candidate set'
  );
  assert.strictEqual(
    browserPageMerged.some((item) => item.url === 'chrome://newtab/'),
    false,
    'browser newtab pages should still be filtered from recent sites'
  );

  const storage = createMemoryStorage({
    [recentStore.DEFAULT_PINNED_KEY]: [
      { title: 'A', url: 'https://a.example/' },
      { title: 'A duplicate', url: 'https://a.example/' },
      { title: 'B', url: 'https://b.example/' },
      { title: 'C', url: 'https://c.example/' },
      { title: 'D', url: 'https://d.example/' }
    ]
  });
  const loadedPinned = await recentStore.loadPinnedRecentSites(storage, options);
  assert.strictEqual(loadedPinned.length, 3);
  assert.deepStrictEqual(loadedPinned.map((item) => item.host), ['a.example', 'b.example', 'c.example']);

  const savedHidden = await recentStore.saveHiddenRecentSites(storage, [
    'https://hidden.example/a',
    { url: 'https://hidden.example/a', lastVisitTime: 12 }
  ], options);
  assert.strictEqual(savedHidden.length, 1);
  assert.strictEqual(savedHidden[0].lastVisitTime, 12);
}

function testBookmarkStore() {
  const tree = [{
    id: '0',
    title: '',
    children: [{
      id: '10',
      title: '書籤欄',
      children: [
        { id: '11', title: 'OpenAI', url: 'https://openai.com/' },
        { id: '12', title: 'Duplicate OpenAI', url: 'https://openai.com/' },
        {
          id: '13',
          title: 'Design',
          children: [
            { id: '14', title: 'Figma', url: 'https://figma.com/files' },
            { id: '15', title: 'Lumno', url: 'https://lumno.kubai.design/' }
          ]
        }
      ]
    }]
  }];

  const bar = bookmarkStore.findBookmarksBarNode(tree);
  assert.strictEqual(bar.id, '10');

  const cache = bookmarkStore.buildBookmarkFolderCache(tree, {
    normalizeHost: (host) => String(host || '').toLowerCase().replace(/^www\./, '')
  });
  assert.strictEqual(cache.rootFolderId, '10');
  assert.ok(cache.nodeMap instanceof Map);
  assert.ok(cache.folderItemsCache instanceof Map);
  assert.strictEqual(cache.folderItemsCache.get('10').length, 2);

  const folderItem = cache.folderItemsCache.get('10').find((item) => item.type === 'folder');
  const firstBookmarkItem = cache.folderItemsCache.get('10').find((item) => item.type === 'bookmark');
  assert.strictEqual(firstBookmarkItem.parentId, '10');
  assert.strictEqual(firstBookmarkItem.index, 0);
  assert.strictEqual(folderItem.parentId, '10');
  assert.strictEqual(folderItem.index, 2);
  assert.strictEqual(folderItem.themeUrl, 'https://figma.com/files');
  assert.deepStrictEqual(folderItem.previewUrls, [
    'https://figma.com/files',
    'https://lumno.kubai.design/'
  ]);

  const path = bookmarkStore.buildBookmarkFolderPath('13', {
    nodeMap: cache.nodeMap,
    rootId: cache.rootFolderId,
    rootTitle: '书签'
  });
  assert.deepStrictEqual(path.map((item) => item.title), ['书签', 'Design']);

  assert.deepStrictEqual(
    bookmarkStore.getBookmarkPageItems([1, 2, 3, 4, 5], 1, 2),
    [3, 4]
  );
}

function testBookmarkCacheHydrationGuard() {
  assert.strictEqual(
    bookmarkStore.shouldApplyBookmarkCacheHydration(
      { loadToken: 2 },
      { loadToken: 2, loadedOnce: false, dataDirty: true }
    ),
    true
  );
  assert.strictEqual(
    bookmarkStore.shouldApplyBookmarkCacheHydration(
      { loadToken: 2 },
      { loadToken: 3, loadedOnce: false, dataDirty: true }
    ),
    false
  );
  assert.strictEqual(
    bookmarkStore.shouldApplyBookmarkCacheHydration(
      { loadToken: 2 },
      { loadToken: 2, loadedOnce: true, dataDirty: false }
    ),
    false
  );
}

function testNewtabUsesBookmarkCacheHydrationGuard() {
  const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
  assert.ok(
    newtabJs.includes('shouldApplyBookmarkCacheHydration'),
    'newtab should guard bookmark cache hydration against live loads'
  );
  assert.ok(
    newtabJs.includes('bookmarkCacheHydrationLoadToken'),
    'newtab should compare bookmark cache hydration against the load token captured at scheduling time'
  );
}

testRecentStore()
  .then(() => {
    testBookmarkStore();
    testBookmarkCacheHydrationGuard();
    testNewtabUsesBookmarkCacheHydrationGuard();
    console.log('newtab store tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
