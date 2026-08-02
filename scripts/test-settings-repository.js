const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');
const repositoryApi = require('../src/shared/settings-repository.js');

function createArea(initialValues) {
  const values = { ...(initialValues || {}) };
  return {
    values,
    get(keys, callback) {
      const requested = Array.isArray(keys) ? keys : Object.keys(values);
      const result = Object.fromEntries(requested.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(values, key) ? [[key, values[key]]] : []
      )));
      callback(result);
    },
    set(payload, callback) {
      Object.assign(values, payload);
      if (callback) {
        callback();
      }
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]);
      if (callback) {
        callback();
      }
    }
  };
}

async function run() {
  const themeKey = schema.STORAGE_KEYS.themeMode;
  const languageKey = schema.STORAGE_KEYS.language;
  const syncArea = createArea({ [themeKey]: 'dark', [languageKey]: 'ja' });
  const localArea = createArea({ [themeKey]: 'light' });
  const repository = repositoryApi.createRepository({ syncArea, localArea });

  assert.strictEqual(await repository.getMode(), repositoryApi.MODE_GUEST);
  assert.deepStrictEqual(await repository.get([themeKey]), { [themeKey]: 'dark' });

  const migration = await repository.enterCloudMode();
  assert.strictEqual(migration.mode, repositoryApi.MODE_CLOUD);
  assert.deepStrictEqual(migration.migrated_keys, [languageKey]);
  assert.strictEqual(migration.source_snapshot[themeKey], 'dark',
    'migration metadata must preserve the Chrome Sync source before cloud cache values win');
  assert.strictEqual(migration.source_snapshot[languageKey], 'ja');
  assert.strictEqual(localArea.values[themeKey], 'light', 'existing local values must not be overwritten during migration');
  assert.strictEqual(localArea.values[languageKey], 'ja');

  await repository.set({ [themeKey]: 'dark' });
  assert.strictEqual(localArea.values[themeKey], 'dark');
  assert.strictEqual(syncArea.values[themeKey], 'dark', 'the browser-sync copy stays unchanged until cloud mode is left');

  localArea.values[themeKey] = 'light';
  await repository.leaveCloudMode({ copyToBrowserSync: true });
  assert.strictEqual(syncArea.values[themeKey], 'light');
  assert.strictEqual(await repository.getMode(), repositoryApi.MODE_GUEST);

  const browserSyncBaseline = createArea({ [themeKey]: 'light', [languageKey]: 'zh-CN' });
  const staleCloudCache = createArea({ [themeKey]: 'dark', [languageKey]: 'ja' });
  const baselineRepository = repositoryApi.createRepository({
    syncArea: browserSyncBaseline,
    localArea: staleCloudCache,
    cloudArea: staleCloudCache
  });
  const baselineSnapshot = await baselineRepository.get(schema.SYNC_KEYS);
  const baselineMigration = await baselineRepository.enterCloudMode({
    browserSnapshot: baselineSnapshot
  });
  assert.deepStrictEqual(baselineMigration.migrated_keys, [themeKey, languageKey]);
  assert.strictEqual(staleCloudCache.values[themeKey], 'light',
    'an explicit browser baseline must replace a stale local cloud cache');
  assert.strictEqual(staleCloudCache.values[languageKey], 'zh-CN');

  const sharedCache = createArea({ [themeKey]: 'system' });
  const localWallpaperKey = schema.STORAGE_KEYS.newtabLocalWallpaper;
  const modeArea = createArea({ [localWallpaperKey]: { light: 'custom-wallpaper-local' } });
  const browserSync = createArea({ [themeKey]: 'light' });
  const cachedRepository = repositoryApi.createRepository({
    localArea: modeArea,
    syncArea: browserSync,
    cloudArea: sharedCache,
    localSettingArea: modeArea,
    localOnlyKeys: schema.LOCAL_ONLY_SYNC_KEYS
  });
  const cachedMigration = await cachedRepository.enterCloudMode();
  assert.strictEqual(cachedMigration.source_snapshot[themeKey], 'light');
  assert.deepStrictEqual(cachedMigration.source_snapshot[localWallpaperKey], {
    light: 'custom-wallpaper-local'
  });
  await cachedRepository.set({ [themeKey]: 'dark' });
  assert.strictEqual(sharedCache.values[themeKey], 'dark', 'cloud mode should support a tracked cache area');
  assert.strictEqual(browserSync.values[themeKey], 'light', 'cloud cache selection should not mutate guest sync storage');
  assert.deepStrictEqual((await cachedRepository.get([localWallpaperKey]))[localWallpaperKey], {
    light: 'custom-wallpaper-local'
  }, 'local-only wallpaper selection should still participate in cloud snapshots');
  await cachedRepository.set({ [localWallpaperKey]: { light: 'custom-wallpaper-remote' } });
  assert.deepStrictEqual(modeArea.values[localWallpaperKey], { light: 'custom-wallpaper-remote' });
  assert.strictEqual(sharedCache.values[localWallpaperKey], undefined,
    'local-only wallpaper selection should never be written to browser sync cache');

  const localSurfaceModeKey = schema.STORAGE_KEYS.bookmarkTopbarSurfaceMode;
  sharedCache.values[themeKey] = 'previous-account-theme';
  modeArea.values[localWallpaperKey] = { light: 'previous-account-wallpaper' };
  modeArea.values[localSurfaceModeKey] = 'custom';
  const resetMigration = await cachedRepository.enterCloudMode({ resetCloudCache: true });
  assert.deepStrictEqual(resetMigration.snapshot, {});
  assert.strictEqual(sharedCache.values[themeKey], undefined,
    'an account transition must clear shared settings absent from the replacement account');
  assert.strictEqual(modeArea.values[localWallpaperKey], undefined,
    'an account transition must clear the previous account local-only wallpaper selection');
  assert.strictEqual(modeArea.values[localSurfaceModeKey], undefined,
    'an account transition must also clear account-scoped local visual customization');

  console.log('settings repository tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
