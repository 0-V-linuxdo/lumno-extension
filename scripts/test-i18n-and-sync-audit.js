const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');

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
const sharedSettingsSource = fs.readFileSync('src/shared/settings.js', 'utf8');
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const localeMessages = Object.fromEntries(localeNames.map((locale) => [
  locale,
  JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'))
]));

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
  /migrateStorageIfNeeded\(\[[\s\S]*BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY[\s\S]*\]\);/.test(backgroundSource),
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
  /migrateStorageIfNeeded\(\[[\s\S]*BOOKMARK_VIEW_MODE_STORAGE_KEY[\s\S]*\]\);/.test(optionsSource),
  'bookmark view mode should be included in local-to-sync migration'
);
assert(
  /BOOKMARK_VIEW_MODE_STORAGE_KEY\s*=\s*['_"]_x_extension_bookmark_view_mode_2026_unique_['_"]/.test(backgroundSource),
  'background sync migration should define the bookmark view mode storage key'
);
assert(
  /migrateStorageIfNeeded\(\[[\s\S]*BOOKMARK_VIEW_MODE_STORAGE_KEY[\s\S]*\]\);/.test(backgroundSource),
  'background local-to-sync migration should include the bookmark view mode'
);
[
  [
    'BOOKMARK_TOPBAR_SURFACE_COLOR_LIGHT_STORAGE_KEY',
    '_x_extension_bookmark_topbar_surface_color_light_2026_unique_',
    'light'
  ],
  [
    'BOOKMARK_TOPBAR_SURFACE_COLOR_DARK_STORAGE_KEY',
    '_x_extension_bookmark_topbar_surface_color_dark_2026_unique_',
    'dark'
  ]
].forEach(([constantName, storageKey, theme]) => {
  assert(
    new RegExp(`${constantName}\\s*=\\s*[\\s\\S]*?['"]${storageKey}['"]`).test(newtabSource),
    `new tab should define the local-only ${theme} bookmark topbar surface color storage key`
  );
  [
    ['options', optionsSource],
    ['background', backgroundSource],
    ['shared sync settings', sharedSettingsSource]
  ].forEach(([surface, source]) => {
    assert(
      !source.includes(storageKey),
      `${surface} should not include the local-only ${theme} bookmark topbar surface color key`
    );
  });
});
assert(
  !optionsSource.includes('_x_extension_bookmark_topbar_surface_color_2026_unique_') &&
    !backgroundSource.includes('_x_extension_bookmark_topbar_surface_color_2026_unique_') &&
    !sharedSettingsSource.includes('_x_extension_bookmark_topbar_surface_color_2026_unique_'),
  'the legacy bookmark topbar color key should not remain part of sync settings'
);
{
  const persistSource = getFunctionSource(newtabSource, 'persistBookmarkTopbarSurfaceColor');
  const loadSource = getFunctionSource(newtabSource, 'loadInitialBookmarkTopbarSurfaceColors');
  const changeSource = getFunctionSource(
    newtabSource,
    'handleBookmarkTopbarSurfaceColorStorageChanges'
  );
  assert(
    /bookmarkTopbarSurfaceColorStorageArea\.set/.test(persistSource) &&
      !/storage\.sync|syncArea/.test(persistSource),
    'bookmark topbar color changes should persist only through the local storage adapter'
  );
  assert(
    /syncArea\.get\(keys, readLocalAndMigrate\)/.test(loadSource) &&
      /localArea\.set\(localUpdates, finishMigration\)/.test(loadSource) &&
      /hasSyncedColor[\s\S]*syncArea\.remove\(keys\)/.test(loadSource),
    'existing synced bookmark topbar colors should migrate locally before their sync keys are removed'
  );
  assert(
    /areaName !== ['"]local['"]/.test(changeSource),
    'live bookmark topbar color updates should only accept local storage changes'
  );
}
{
  const legacyKey = '_x_extension_bookmark_topbar_surface_color_2026_unique_';
  const lightKey = '_x_extension_bookmark_topbar_surface_color_light_2026_unique_';
  const darkKey = '_x_extension_bookmark_topbar_surface_color_dark_2026_unique_';
  const localData = { [lightKey]: '#f1f2f3' };
  const syncData = {
    [legacyKey]: '#445566',
    [lightKey]: '#aabbcc',
    [darkKey]: '#112233'
  };
  const localWrites = [];
  const localRemovals = [];
  const syncRemovals = [];
  const appliedResults = [];
  const localArea = {
    get(keys, callback) {
      callback(Object.fromEntries(keys.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(localData, key) ? [[key, localData[key]]] : []
      ))));
    },
    set(payload, callback) {
      localWrites.push(payload);
      Object.assign(localData, payload);
      callback();
    },
    remove(keys) {
      const removedKeys = Array.isArray(keys) ? keys : [keys];
      localRemovals.push(...removedKeys);
      removedKeys.forEach((key) => delete localData[key]);
    }
  };
  const syncArea = {
    get(keys, callback) {
      callback(Object.fromEntries(keys.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(syncData, key) ? [[key, syncData[key]]] : []
      ))));
    },
    remove(keys) {
      syncRemovals.push(...keys);
    }
  };
  const createInitialColorLoader = new Function(
    'bookmarkTopbarSurfaceColorStorageArea',
    'chrome',
    'initialThemeReadyPromise',
    'BOOKMARK_TOPBAR_SURFACE_COLOR_STORAGE_KEY',
    'BOOKMARK_TOPBAR_SURFACE_COLOR_LIGHT_STORAGE_KEY',
    'BOOKMARK_TOPBAR_SURFACE_COLOR_DARK_STORAGE_KEY',
    'getCurrentBookmarkTopbarResolvedTheme',
    'getBookmarkTopbarSurfaceColorStorageKey',
    'bookmarkTopbarSurfaceColorRevisions',
    'applyInitialBookmarkTopbarSurfaceColors',
    `${getFunctionSource(newtabSource, 'getBookmarkTopbarSurfaceColorStorageKeys')}
    ${getFunctionSource(newtabSource, 'loadInitialBookmarkTopbarSurfaceColors')}
    return loadInitialBookmarkTopbarSurfaceColors;`
  );
  const loadInitialBookmarkTopbarSurfaceColors = createInitialColorLoader(
    localArea,
    { storage: { local: localArea, sync: syncArea } },
    { then(callback) { callback(); } },
    legacyKey,
    lightKey,
    darkKey,
    () => 'dark',
    (theme) => theme === 'dark' ? darkKey : lightKey,
    { light: 0, dark: 0 },
    (result) => appliedResults.push(result)
  );
  loadInitialBookmarkTopbarSurfaceColors();
  assert.deepStrictEqual(
    localWrites,
    [{ [darkKey]: '#112233' }],
    'the current machine should copy its effective synced dark color into local storage'
  );
  assert.strictEqual(localData[lightKey], '#f1f2f3');
  assert.strictEqual(localData[darkKey], '#112233');
  assert.deepStrictEqual(
    localRemovals,
    [],
    'migration should not issue a redundant local removal when no local legacy color exists'
  );
  assert.deepStrictEqual(
    syncRemovals,
    [lightKey, darkKey, legacyKey],
    'all bookmark topbar color keys should be removed from sync after the local write completes'
  );
  assert.deepStrictEqual(
    appliedResults,
    [{ [lightKey]: '#f1f2f3', [darkKey]: '#112233' }],
    'initial rendering should use the migrated local light and dark colors'
  );
}
localeNames.forEach((locale) => {
  [
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
    [{ [key]: 'top' }],
    'changing bookmark mode should update the local fallback with the sync value'
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
  /migrateStorageIfNeeded\(\[[\s\S]*BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY[\s\S]*\]\);/.test(optionsSource),
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
  /migrateStorageIfNeeded\(\[[\s\S]*NEWTAB_SHORTCUTS_STORAGE_KEY[\s\S]*\]\);/.test(optionsSource),
  'New Tab shortcuts should be included in options local-to-sync migration'
);
assert(
  /changes\[NEWTAB_SHORTCUTS_STORAGE_KEY\]/.test(optionsSource),
  'New Tab shortcuts changes should refresh options sync status'
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
  /migrateStorageIfNeeded\(\[[\s\S]*NEWTAB_SHORTCUT_ADD_VISIBLE_STORAGE_KEY[\s\S]*\]\);/.test(optionsSource),
  'the New Tab add shortcut preference should be included in local-to-sync migration'
);
assert(
  /data-i18n="settings_newtab_shortcut_add_title"/.test(optionsHtml),
  'the New Tab add shortcut preference label should be wired through i18n'
);
localeNames.forEach((locale) => {
  ['settings_newtab_shortcut_add_title', 'newtab_shortcuts_add_hidden'].forEach((key) => {
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
  /migrateStorageIfNeeded\(\[[\s\S]*NEWTAB_SHORTCUT_DOCK_MAGNIFICATION_ENABLED_STORAGE_KEY[\s\S]*\]\);/.test(optionsSource),
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
  /migrateStorageIfNeeded\(\[[\s\S]*NEWTAB_SHORTCUTS_STORAGE_KEY[\s\S]*\]\);/.test(backgroundSource),
  'background local-to-sync migration should include New Tab shortcuts'
);
