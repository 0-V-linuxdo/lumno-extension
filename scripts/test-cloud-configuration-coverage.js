const assert = require('assert');
const fs = require('fs');

const schema = require('../src/shared/cloud-sync-schema.js');
const media = require('../src/background/cloud-wallpaper-runtime.js');

function extractOptionsSyncKeys(source) {
  const listMatch = /const SYNC_KEYS = \[([\s\S]*?)\n\s*\];/.exec(source);
  assert(listMatch, 'options should declare its browser/export sync key list');
  const names = Array.from(listMatch[1].matchAll(/\b([A-Z][A-Z0-9_]+_STORAGE_KEY)\b/g), (match) => match[1]);
  const keys = [];
  names.forEach((name) => {
    const declarationAt = source.indexOf(`const ${name} =`);
    assert(declarationAt >= 0, `options should declare ${name}`);
    const declaration = source.slice(declarationAt, source.indexOf(';', declarationAt) + 1);
    const keyMatch = /['"](_x_extension_[^'"]+_unique_)['"]/.exec(declaration);
    assert(keyMatch, `${name} should resolve to a concrete storage key`);
    keys.push(keyMatch[1]);
  });
  return keys;
}

function run() {
  const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
  const optionsKeys = extractOptionsSyncKeys(optionsSource);
  const localOnly = new Set(schema.LOCAL_ONLY_SYNC_KEYS);
  const expectedBrowserKeys = schema.SYNC_KEYS.filter((key) => !localOnly.has(key));
  assert.deepStrictEqual(
    [...optionsKeys].sort(),
    [...expectedBrowserKeys].sort(),
    'browser sync/export and Lumno settings must cover the same primary user configuration'
  );

  [
    schema.STORAGE_KEYS.newtabZenMode,
    schema.STORAGE_KEYS.newtabFavicon,
    schema.STORAGE_KEYS.bookmarkTopbarSurfaceMode,
    schema.STORAGE_KEYS.bookmarkTopbarSurfaceColorLight,
    schema.STORAGE_KEYS.bookmarkTopbarSurfaceColorDark
  ].forEach((key) => {
    assert(schema.isSyncKey(key), `Lumno configuration coverage should include ${key}`);
  });

  assert.strictEqual(schema.isSyncKey(media.SHORTCUT_ICON_STORAGE_KEY), false,
    'large shortcut icon bytes must use private media storage instead of settings JSON');
  assert.strictEqual(media.SHORTCUT_ICON_KIND, 'shortcut_icon');

  [
    '_x_extension_newtab_shortcut_favicon_cache_2026_unique_',
    '_x_extension_site_search_icon_cache_canonical_2026_unique_',
    '_x_extension_newtab_wallpaper_preload_2026_unique_',
    '_x_extension_newtab_favicon_preload_2026_unique_',
    '_x_extension_newtab_recent_cache_2024_unique_',
    '_x_extension_newtab_bookmark_cache_2024_unique_',
    '_x_extension_tab_switcher_state_2026_unique_',
    '_x_extension_pinned_tab_snapshot_2026_unique_'
  ].forEach((key) => {
    assert.strictEqual(schema.isSyncKey(key), false, `regenerable/device cache must stay local: ${key}`);
  });

  console.log('cloud configuration coverage tests passed');
}

run();
