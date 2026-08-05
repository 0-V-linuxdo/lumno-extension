const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const settings = require('../src/shared/settings.js');

const auditOutput = execFileSync(process.execPath, ['scripts/audit-i18n.js'], {
  encoding: 'utf8'
});
const candidateMatch = auditOutput.match(/i18n audit candidate count=(\d+)/);
assert(candidateMatch, 'i18n audit should print a candidate count');
assert.strictEqual(
  Number(candidateMatch[1]),
  0,
  `i18n audit should have no unreviewed candidates:\n${auditOutput}`
);

const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');
const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');
const sharedSettingsSource = fs.readFileSync('src/shared/settings.js', 'utf8');
const shortcutFaviconSource = fs.readFileSync('src/shared/shortcut-favicon.js', 'utf8');
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const localeMessages = Object.fromEntries(localeNames.map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'))
]));
const optionsMigratesSyncKeys = /migrateStorageIfNeeded\(SYNC_KEYS\);/.test(optionsSource);
const chromeSyncKeys = settings.CHROME_SYNC_STORAGE_KEYS;
const backgroundMigratesChromeSyncContract = /migrateStorageIfNeeded\(CHROME_SYNC_STORAGE_KEYS\);/.test(
  backgroundSource
);

function getFunctionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${name} should have a complete body`);
}

function getStorageConstantValue(source, name) {
  const start = source.indexOf(`const ${name}`);
  assert(start >= 0, `${name} should exist`);
  const end = source.indexOf(';', start);
  const declaration = source.slice(start, end + 1);
  const values = [...declaration.matchAll(/['"](_x_extension_[a-z0-9_]+_unique_)['"]/g)];
  assert(values.length > 0, `${name} should include a storage key fallback`);
  return values[values.length - 1][1];
}

{
  const syncKeysBlock = optionsSource.match(/const SYNC_KEYS = \[([\s\S]*?)\n  \];/);
  assert(syncKeysBlock, 'options should define its Chrome Sync export/import contract');
  const optionSyncKeys = [...syncKeysBlock[1].matchAll(/\b([A-Z][A-Z0-9_]+_STORAGE_KEY)\b/g)]
    .map((match) => getStorageConstantValue(optionsSource, match[1]));
  assert.deepStrictEqual(
    optionSyncKeys,
    chromeSyncKeys,
    'options export/import keys must exactly match the shared Chrome Sync contract'
  );
  assert(backgroundMigratesChromeSyncContract, 'background startup should migrate the full Chrome Sync contract');
  assert(
    /chrome\.storage\.sync\.remove\(LANGUAGE_MESSAGES_STORAGE_KEY/.test(backgroundSource),
    'background startup should remove the obsolete oversized language cache from Chrome Sync'
  );
  [optionsSource, newtabSource, overlaySource].forEach((source) => {
    assert(
      !source.includes('_x_extension_language_messages_2024_unique_'),
      'runtime surfaces must load packaged locale messages instead of syncing the language cache'
    );
  });
}

{
  const animationKey = '_x_extension_overlay_enter_animation_2026_unique_';
  assert(
    /OVERLAY_ENTER_ANIMATION_STORAGE_KEY\s*=\s*['"]_x_extension_overlay_enter_animation_2026_unique_['"]/.test(sharedSettingsSource) &&
      /OVERLAY_ENTER_ANIMATION_STORAGE_KEY,/.test(sharedSettingsSource),
    'shared settings should define and export the overlay opening-animation key'
  );
  assert(
    /const SYNC_KEYS = \[[\s\S]*OVERLAY_ENTER_ANIMATION_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
    'overlay opening animation should be included in options sync/export/import keys'
  );
  assert(
    optionsMigratesSyncKeys,
    'options should migrate overlay opening animation from local to sync storage'
  );
  assert(
    backgroundMigratesChromeSyncContract &&
      chromeSyncKeys.includes('_x_extension_overlay_enter_animation_2026_unique_'),
    'background should migrate overlay opening animation from local to sync storage'
  );
  assert(
    overlaySource.includes(animationKey) &&
      /getStorageValues\(\s*storageArea,\s*\[OVERLAY_ENTER_ANIMATION_STORAGE_KEY\]/.test(overlaySource),
    'overlay runtime should read the synchronized opening-animation preference'
  );
  localeNames.forEach((locale) => {
    ['settings_overlay_enter_animation_title', 'overlay_enter_animation_elastic', 'overlay_enter_animation_fade']
      .forEach((key) => {
        assert(
          localeMessages[locale][key] &&
            String(localeMessages[locale][key].message || '').trim(),
          `${locale} should localize ${key}`
        );
      });
  });
}
{
  const iconCacheKey = '_x_extension_site_search_icon_cache_canonical_2026_unique_';
  assert(
    shortcutFaviconSource.includes(iconCacheKey),
    'shared favicon runtime should define the canonical provider-icon cache key'
  );
  assert(
    !optionsSource.includes(iconCacheKey) && !sharedSettingsSource.includes(iconCacheKey),
    'regenerable provider-icon cache data must stay out of sync/export/import settings'
  );
  const iconStoreSource = getFunctionSource(backgroundSource, 'getSiteSearchIconStore');
  assert(
    /storageArea:\s*\(chrome && chrome\.storage && chrome\.storage\.local\)/.test(iconStoreSource),
    'background should persist provider-icon cache data only in local storage'
  );
}
assert(
  /const SYNC_KEYS = \[[\s\S]*SITE_SEARCH_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'custom search providers, including their selected category, should remain in sync/export/import'
);

assert(
  /data-i18n="settings_overlay_open_tabs_default_visible_title"/.test(optionsHtml),
  'overlay open-tabs setting label should be wired through data-i18n'
);
assert(
  !/settings_overlay_open_tabs_default_visible_desc/.test(optionsHtml),
  'overlay open-tabs setting should not keep a secondary description in options HTML'
);
localeNames.forEach((locale) => {
  assert(
    localeMessages[locale].settings_overlay_open_tabs_default_visible_title &&
      String(localeMessages[locale].settings_overlay_open_tabs_default_visible_title.message || '').trim(),
    `${locale} should localize the overlay open-tabs setting label`
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(localeMessages[locale], 'settings_overlay_open_tabs_default_visible_desc'),
    false,
    `${locale} should not keep unused overlay open-tabs setting description copy`
  );
});
assert(
  /BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY\s*=\s*['_"]_x_extension_bookmark_folder_icons_visible_2026_unique_['_"]/.test(newtabSource),
  'new tab should define the bookmark folder icons storage key'
);
assert(
  /changes\[BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY\][\s\S]*setFolderIconsVisible/.test(newtabSource),
  'new tab should apply bookmark folder icon setting changes live'
);
assert(
  /migrateStorageIfNeeded\(\[[\s\S]*BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY[\s\S]*\]\);/.test(newtabSource),
  'new tab should migrate the bookmark folder icon setting to sync storage'
);
assert(
  /BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY\s*=\s*['_"]_x_extension_bookmark_folder_icons_visible_2026_unique_['_"]/.test(backgroundSource),
  'background should define the bookmark folder icons storage key'
);
assert(
  backgroundMigratesChromeSyncContract &&
    chromeSyncKeys.includes('_x_extension_bookmark_folder_icons_visible_2026_unique_'),
  'background should migrate the bookmark folder icon setting to sync storage'
);

assert(
  /BOOKMARK_VIEW_MODE_STORAGE_KEY\s*=\s*['_"]_x_extension_bookmark_view_mode_2026_unique_['_"]/.test(optionsSource),
  'options sync should define the bookmark view mode storage key'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*BOOKMARK_VIEW_MODE_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'bookmark view mode should be included in options sync/export/import keys'
);
assert(
  optionsMigratesSyncKeys,
  'bookmark view mode should be included in local-to-sync migration'
);
assert(
  /BOOKMARK_VIEW_MODE_STORAGE_KEY\s*=\s*['_"]_x_extension_bookmark_view_mode_2026_unique_['_"]/.test(backgroundSource),
  'background sync migration should define the bookmark view mode storage key'
);
assert(
  backgroundMigratesChromeSyncContract &&
    chromeSyncKeys.includes('_x_extension_bookmark_view_mode_2026_unique_'),
  'background local-to-sync migration should include the bookmark view mode'
);
{
  const topbarSyncKeys = [
    '_x_extension_bookmark_topbar_surface_mode_2026_unique_',
    '_x_extension_bookmark_topbar_surface_color_light_2026_unique_',
    '_x_extension_bookmark_topbar_surface_color_dark_2026_unique_'
  ];
  topbarSyncKeys.forEach((key) => {
    assert(chromeSyncKeys.includes(key), `${key} should be part of the Chrome Sync contract`);
    assert(optionsSource.includes(key), `options should export and import ${key}`);
    assert(newtabSource.includes(key), `new tab should persist and apply ${key}`);
  });
  assert(
    !chromeSyncKeys.includes('_x_extension_bookmark_topbar_surface_color_2026_unique_'),
    'the legacy single-color key should not remain in the Chrome Sync contract'
  );
  const persistModeSource = getFunctionSource(newtabSource, 'persistBookmarkTopbarSurfaceMode');
  const persistColorSource = getFunctionSource(newtabSource, 'persistBookmarkTopbarSurfaceColor');
  const migrationSource = getFunctionSource(newtabSource, 'migrateBookmarkTopbarSurfaceSettings');
  const loadColorSource = getFunctionSource(newtabSource, 'loadInitialBookmarkTopbarSurfaceColors');
  const changeSource = getFunctionSource(
    newtabSource,
    'handleBookmarkTopbarSurfaceColorStorageChanges'
  );
  assert(
    /bookmarkTopbarSurfaceStorageArea\.set/.test(persistModeSource) &&
      /bookmarkTopbarSurfaceStorageArea\.set/.test(persistColorSource),
    'bookmark topbar material preferences should write through the primary Chrome Sync adapter'
  );
  assert(
    /localArea\.get\(readKeys/.test(migrationSource) &&
      /syncArea\.get\(readKeys/.test(migrationSource) &&
      /syncArea\.set\(updates, finish\)/.test(migrationSource),
    'existing local bookmark topbar material preferences should migrate into Chrome Sync'
  );
  assert(
    /migrateBookmarkTopbarSurfaceSettings\(\)[\s\S]*syncArea\.get/.test(loadColorSource),
    'bookmark topbar colors should load from Chrome Sync after local migration'
  );
  assert(
    /isPrimaryStorageAreaName\(areaName\)/.test(changeSource),
    'live bookmark topbar material updates should only accept the primary sync area'
  );
}
localeNames.forEach((locale) => {
  [
    'bookmark_topbar_surface_adaptive',
    'bookmark_topbar_surface_clear',
    'bookmark_topbar_surface_transparent',
    'bookmark_topbar_surface_custom',
    'bookmark_topbar_color_pick',
    'bookmark_topbar_color_reset',
    'bookmark_topbar_color_picked',
    'bookmark_topbar_color_reset_done',
    'bookmark_topbar_color_unsupported',
    'bookmark_topbar_color_failed'
  ].forEach((key) => {
    assert(
      localeMessages[locale][key] &&
        String(localeMessages[locale][key].message || '').trim(),
      `${locale} should localize ${key}`
    );
  });
});
[
  ['new tab', newtabSource],
  ['options', optionsSource],
  ['background', backgroundSource]
].forEach(([surface, source]) => {
  const migrationSource = getFunctionSource(source, 'migrateStorageIfNeeded');
  assert(
    /storageArea\.get\(missingKeys,\s*\(latestSyncResult\)/.test(migrationSource),
    `${surface} migration should recheck sync storage before writing a formerly missing value`
  );
});
{
  const key = '_x_extension_bookmark_view_mode_2026_unique_';
  const writes = [];
  let syncReadCount = 0;
  const syncArea = {
    get(keys, callback) {
      syncReadCount += 1;
      callback(syncReadCount === 1 ? {} : { [key]: 'top' });
    },
    set(payload) {
      writes.push(payload);
    }
  };
  const localArea = {
    get(keys, callback) {
      callback({ [key]: 'folder' });
    }
  };
  const createMigration = new Function(
    'storageArea',
    'chrome',
    `${getFunctionSource(newtabSource, 'migrateStorageIfNeeded')}
    return migrateStorageIfNeeded;`
  );
  const migrateStorageIfNeeded = createMigration(syncArea, {
    storage: {
      local: localArea,
      sync: syncArea
    }
  });
  migrateStorageIfNeeded([key]);
  assert.deepStrictEqual(
    writes,
    [],
    'migration must not overwrite a mode that appeared in sync after its first read'
  );
}
{
  const key = '_x_extension_bookmark_view_mode_2026_unique_';
  const syncWrites = [];
  const localWrites = [];
  const syncArea = {
    set(payload) {
      syncWrites.push(payload);
    }
  };
  const localArea = {
    set(payload) {
      localWrites.push(payload);
    }
  };
  const createPersistBookmarkViewMode = new Function(
    'chrome',
    'storageArea',
    'BOOKMARK_VIEW_MODE_STORAGE_KEY',
    `${getFunctionSource(newtabSource, 'normalizeBookmarkViewMode')}
    ${getFunctionSource(newtabSource, 'persistBookmarkViewMode')}
    return persistBookmarkViewMode;`
  );
  const persistBookmarkViewMode = createPersistBookmarkViewMode(
    {
      storage: {
        sync: syncArea,
        local: localArea
      }
    },
    syncArea,
    key
  );
  assert.strictEqual(persistBookmarkViewMode('top'), true);
  assert.deepStrictEqual(syncWrites, [{ [key]: 'top' }]);
  assert.deepStrictEqual(
    localWrites,
    [],
    'changing bookmark mode should not maintain a second local source of truth'
  );
}
{
  const initialModeLoaderSource = getFunctionSource(
    newtabSource,
    'loadInitialBookmarkViewMode'
  );
  const initialModeApplySource = getFunctionSource(
    newtabSource,
    'applyInitialBookmarkViewModeValue'
  );
  assert(
    /typeof stored === ['"]undefined['"][\s\S]*readLocalFallback\(\)/.test(initialModeLoaderSource) &&
      /localStorageArea\.get\(\[BOOKMARK_VIEW_MODE_STORAGE_KEY\]/.test(initialModeLoaderSource),
    'an empty sync mode should fall back to the last local mode before choosing a default'
  );
  assert(
    /source === ['"]local-fallback['"][\s\S]*persistBookmarkViewMode\(mode\)/.test(initialModeApplySource),
    'a recovered local bookmark mode should be written back to sync storage'
  );
}
assert(
  /BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY\s*=\s*['_"]_x_extension_bookmark_folder_icons_visible_2026_unique_['_"]/.test(optionsSource),
  'options sync should define the bookmark folder icons storage key'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'bookmark folder icons should be included in options sync/export/import keys'
);
assert(
  optionsMigratesSyncKeys,
  'bookmark folder icons should be included in local-to-sync migration'
);
assert(
  /data-i18n="settings_bookmark_folder_icons_visible_title"/.test(optionsHtml),
  'bookmark folder icon setting label should be wired through data-i18n'
);
assert(
  optionsHtml.indexOf('data-i18n="settings_bookmark_folder_icons_visible_title"') <
    optionsHtml.indexOf('data-i18n="settings_recent_sites_title"'),
  'bookmark folder icon setting should appear before site cards'
);
localeNames.forEach((locale) => {
  assert(
    localeMessages[locale].settings_bookmark_folder_icons_visible_title &&
      String(localeMessages[locale].settings_bookmark_folder_icons_visible_title.message || '').trim(),
    `${locale} should localize the bookmark folder icon setting label`
  );
});
assert(
  /NEWTAB_SHORTCUTS_STORAGE_KEY\s*=\s*['_"]_x_extension_newtab_shortcuts_2026_unique_['_"]/.test(optionsSource),
  'options sync should define the New Tab shortcuts storage key'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*NEWTAB_SHORTCUTS_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'New Tab shortcuts should be included in options sync/export/import keys'
);
assert(
  optionsMigratesSyncKeys,
  'New Tab shortcuts should be included in options local-to-sync migration'
);
assert(
  /SYNC_KEYS\.some\(\(key\) => changes\[key\]\)/.test(optionsSource),
  'all Chrome Sync preference changes should refresh options sync status'
);
assert(
  /NEWTAB_SHORTCUT_ADD_VISIBLE_STORAGE_KEY\s*=\s*['_"]_x_extension_newtab_shortcut_add_visible_2026_unique_['_"]/.test(optionsSource),
  'options sync should define the New Tab add shortcut visibility key'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*NEWTAB_SHORTCUT_ADD_VISIBLE_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'the New Tab add shortcut preference should be included in sync export and import'
);
assert(
  optionsMigratesSyncKeys,
  'the New Tab add shortcut preference should be included in local-to-sync migration'
);
assert(
  /data-i18n="settings_newtab_shortcut_add_title"/.test(optionsHtml),
  'the New Tab add shortcut preference label should be wired through i18n'
);
localeNames.forEach((locale) => {
  [
    'settings_newtab_shortcut_add_title',
    'newtab_shortcuts_hide_add',
    'newtab_shortcuts_add_hidden'
  ].forEach((key) => {
    assert(
      localeMessages[locale][key] &&
        String(localeMessages[locale][key].message || '').trim(),
      `${locale} should localize ${key}`
    );
  });
});
assert(
  /NEWTAB_SHORTCUT_DOCK_MAGNIFICATION_ENABLED_STORAGE_KEY\s*=\s*['_"]_x_extension_newtab_shortcut_dock_magnification_enabled_2026_unique_['_"]/.test(optionsSource),
  'options sync should define the New Tab shortcut Dock magnification key'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*NEWTAB_SHORTCUT_DOCK_MAGNIFICATION_ENABLED_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'the New Tab shortcut Dock magnification preference should be included in sync export and import'
);
assert(
  optionsMigratesSyncKeys,
  'the New Tab shortcut Dock magnification preference should be included in local-to-sync migration'
);
assert(
  /data-i18n="settings_newtab_shortcut_dock_magnification_title"/.test(optionsHtml),
  'the New Tab shortcut Dock magnification label should be wired through i18n'
);
localeNames.forEach((locale) => {
  const key = 'settings_newtab_shortcut_dock_magnification_title';
  assert(
    localeMessages[locale][key] &&
      String(localeMessages[locale][key].message || '').trim(),
    `${locale} should localize ${key}`
  );
});
assert(
  /NEWTAB_SHORTCUTS_STORAGE_KEY\s*=\s*['_"]_x_extension_newtab_shortcuts_2026_unique_['_"]/.test(backgroundSource),
  'background sync migration should define the New Tab shortcuts storage key'
);
assert(
  backgroundMigratesChromeSyncContract &&
    chromeSyncKeys.includes('_x_extension_newtab_shortcuts_2026_unique_'),
  'background local-to-sync migration should include New Tab shortcuts'
);
