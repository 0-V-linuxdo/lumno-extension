const assert = require('assert');

const shortcutsStore = require('../src/newtab/shortcuts-store.js');

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

function testCreatesShortcutFromLooseUrl() {
  const shortcut = shortcutsStore.createShortcutRecord({
    title: ' Lumno ',
    url: 'lumno.kubai.design'
  }, {
    now: 42,
    sanitizeDisplayText: (value) => String(value || '').trim()
  });

  assert.deepStrictEqual(
    {
      id: shortcut.id,
      title: shortcut.title,
      url: shortcut.url,
      host: shortcut.host,
      createdAt: shortcut.createdAt,
      updatedAt: shortcut.updatedAt
    },
    {
      id: 'shortcut-42-3q8b1x',
      title: 'Lumno',
      url: 'https://lumno.kubai.design/',
      host: 'lumno.kubai.design',
      createdAt: 42,
      updatedAt: 42
    }
  );
}

function testFallsBackToHostForEmptyTitle() {
  const shortcut = shortcutsStore.createShortcutRecord({
    title: '',
    url: 'https://www.example.com/tools?q=1'
  }, {
    now: 7,
    normalizeHost: (host) => String(host || '').replace(/^www\./, '')
  });

  assert.strictEqual(shortcut.title, 'example.com');
  assert.strictEqual(shortcut.host, 'example.com');
}

function testRejectsUnsafeOrMissingUrls() {
  assert.strictEqual(
    shortcutsStore.createShortcutRecord({ title: 'Bad', url: 'javascript:alert(1)' }),
    null
  );
  assert.strictEqual(
    shortcutsStore.createShortcutRecord({ title: 'Missing', url: '' }),
    null
  );
}

function testNormalizesAndDeduplicatesShortcuts() {
  const shortcuts = shortcutsStore.normalizeShortcuts([
    { id: 'one', title: 'One', url: 'https://one.example/' },
    { id: 'dupe', title: 'Duplicate', url: 'one.example' },
    { id: 'bad', title: 'Bad', url: 'javascript:alert(1)' },
    { id: 'two', title: 'Two', url: 'https://two.example/' }
  ], {
    maxShortcuts: 8
  });

  assert.deepStrictEqual(
    shortcuts.map((shortcut) => shortcut.title),
    ['One', 'Two']
  );
}

function createShortcutInputs(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `shortcut-${index + 1}`,
    title: `Shortcut ${index + 1}`,
    url: `https://shortcut-${index + 1}.example/`
  }));
}

function testDefaultCapacityAllowsSixtyShortcuts() {
  const shortcuts = shortcutsStore.normalizeShortcuts(
    createShortcutInputs(61)
  );

  assert.strictEqual(shortcutsStore.DEFAULT_MAX_SHORTCUTS, 60);
  assert.strictEqual(
    shortcuts.length,
    60,
    'the default capacity should retain sixty shortcuts and discard overflow'
  );
  assert.strictEqual(shortcuts[0].id, 'shortcut-1');
  assert.strictEqual(shortcuts[59].id, 'shortcut-60');
}

function testDefaultShortcutsContainLumno() {
  const shortcuts = shortcutsStore.getDefaultShortcuts({
    now: 123
  });

  assert.deepStrictEqual(
    shortcuts.map((shortcut) => ({
      title: shortcut.title,
      url: shortcut.url,
      host: shortcut.host,
      createdAt: shortcut.createdAt,
      updatedAt: shortcut.updatedAt
    })),
    [
      {
        title: 'Lumno',
        url: 'https://lumno.kubai.design/',
        host: 'lumno.kubai.design',
        createdAt: 123,
        updatedAt: 123
      }
    ],
    'missing shortcut storage should default to the Lumno shortcut'
  );
}

async function testLoadsDefaultShortcutsOnlyWhenStorageKeyIsMissing() {
  const key = '_test_shortcuts_default';
  const storage = createMemoryStorage();
  const missingKeyShortcuts = await shortcutsStore.loadShortcuts(storage, {
    key,
    now: 456
  });

  assert.deepStrictEqual(
    missingKeyShortcuts.map((shortcut) => shortcut.title),
    ['Lumno'],
    'first run should seed the visible shortcuts with Lumno'
  );

  storage.data[key] = [];
  const explicitEmptyShortcuts = await shortcutsStore.loadShortcuts(storage, {
    key,
    now: 789
  });

  assert.deepStrictEqual(
    explicitEmptyShortcuts,
    [],
    'an explicitly saved empty shortcut list should stay empty'
  );
}

async function testSaveShortcutDoesNotEvictOldestAtMaximumLimit() {
  const key = '_test_shortcuts';
  const storage = createMemoryStorage({
    [key]: [
      { id: 'one', title: 'One', url: 'https://one.example/' },
      { id: 'two', title: 'Two', url: 'https://two.example/' }
    ]
  });

  const saved = await shortcutsStore.saveShortcut(storage, {
    title: 'Three',
    url: 'three.example'
  }, {
    key,
    maxShortcuts: 2,
    now: 99
  });

  assert.deepStrictEqual(
    saved.map((shortcut) => shortcut.title),
    ['One', 'Two'],
    'a full shortcut store should preserve existing shortcuts instead of silently evicting the oldest'
  );
  assert.deepStrictEqual(storage.data[key], saved);
}

async function testSaveShortcutsPreservesExplicitOrder() {
  const key = '_test_shortcuts_order';
  const storage = createMemoryStorage();
  const saved = await shortcutsStore.saveShortcuts(storage, [
    { id: 'three', title: 'Three', url: 'https://three.example/' },
    { id: 'one', title: 'One', url: 'https://one.example/' },
    { id: 'two', title: 'Two', url: 'https://two.example/' }
  ], {
    key,
    maxShortcuts: 8
  });

  assert.deepStrictEqual(
    saved.map((shortcut) => shortcut.id),
    ['three', 'one', 'two'],
    'bulk saving shortcuts should preserve the caller-provided order'
  );
  assert.deepStrictEqual(storage.data[key], saved);
}

async function testDefaultStorageSplitsSixtyShortcutsIntoQuotaSafeChunks() {
  const key = '_test_shortcuts_chunked';
  const storage = createMemoryStorage();
  const options = {
    key,
    maxShortcuts: 60,
    now: 123
  };
  const inputs = createShortcutInputs(60);
  const saved = await shortcutsStore.saveShortcuts(storage, inputs, options);
  const keys = shortcutsStore.getShortcutStorageKeys(options);

  assert.deepStrictEqual(
    keys,
    [key, `${key}_chunk_2`, `${key}_chunk_3`],
    'sixty shortcuts should use three storage items'
  );
  keys.forEach((chunkKey) => {
    assert.strictEqual(storage.data[chunkKey].length, 20);
    assert(
      Buffer.byteLength(JSON.stringify(storage.data[chunkKey])) < 8192,
      'each representative shortcut chunk should stay below the Chrome Sync per-item quota'
    );
  });

  const loaded = await shortcutsStore.loadShortcuts(storage, options);
  assert.deepStrictEqual(
    loaded.map((shortcut) => shortcut.id),
    saved.map((shortcut) => shortcut.id),
    'chunked shortcut storage should preserve all sixty shortcuts in order'
  );

  await shortcutsStore.saveShortcuts(storage, inputs.slice(0, 5), options);
  assert.deepStrictEqual(storage.data[keys[1]], []);
  assert.deepStrictEqual(storage.data[keys[2]], []);
  const reduced = await shortcutsStore.loadShortcuts(storage, options);
  assert.strictEqual(reduced.length, 5, 'saving fewer shortcuts should clear stale chunks');
}

async function run() {
  testCreatesShortcutFromLooseUrl();
  testFallsBackToHostForEmptyTitle();
  testRejectsUnsafeOrMissingUrls();
  testNormalizesAndDeduplicatesShortcuts();
  testDefaultCapacityAllowsSixtyShortcuts();
  testDefaultShortcutsContainLumno();
  await testLoadsDefaultShortcutsOnlyWhenStorageKeyIsMissing();
  await testSaveShortcutDoesNotEvictOldestAtMaximumLimit();
  await testSaveShortcutsPreservesExplicitOrder();
  await testDefaultStorageSplitsSixtyShortcutsIntoQuotaSafeChunks();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
