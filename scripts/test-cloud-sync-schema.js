const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');

function run() {
  assert(schema.SYNC_KEYS.length >= 40, 'the cloud schema should cover the existing settings surface');
  assert.strictEqual(new Set(schema.SYNC_KEYS).size, schema.SYNC_KEYS.length, 'sync keys must stay unique');
  assert.strictEqual(schema.CURRENT_SYNC_PROTOCOL, 2);
  assert.strictEqual(schema.SYNC_KEYS.length, 52, 'protocol 2 should publish the complete 52-key contract');
  assert.strictEqual(schema.LEGACY_SYNC_KEYS.length, 49, 'protocol 1 must remain frozen at 49 keys');
  assert.strictEqual(schema.SYNC_KEY_DEFINITIONS.length, schema.SYNC_KEYS.length);
  assert.match(schema.SYNC_SCHEMA_HASH, /^[0-9a-f]{64}$/);
  assert.strictEqual(schema.isSyncKey(schema.STORAGE_KEYS.themeMode), true);
  assert.strictEqual(schema.isSyncKey(schema.STORAGE_KEYS.newtabZenMode), true);
  assert.strictEqual(schema.isSyncKey(schema.STORAGE_KEYS.newtabFavicon), true);
  assert.strictEqual(schema.isSyncKeySupported(schema.STORAGE_KEYS.themeMode, 1), true);
  assert.strictEqual(schema.isSyncKeySupported(schema.STORAGE_KEYS.selectionQuickActionsProvider, 1), false);
  assert.strictEqual(schema.isSyncKeySupported(schema.STORAGE_KEYS.selectionQuickActionsProvider, 2), true);
  assert.strictEqual(schema.isSyncKeySupported(schema.STORAGE_KEYS.selectionQuickActionsIconSet, 1), false);
  assert.strictEqual(schema.isSyncKeySupported(schema.STORAGE_KEYS.selectionQuickActionsTriggerStyle, 1), false);
  assert.deepStrictEqual(schema.getSyncKeysForProtocol(1), schema.LEGACY_SYNC_KEYS);
  assert.deepStrictEqual(schema.getSyncKeysForProtocol(2), schema.SYNC_KEYS);
  assert(schema.LOCAL_STORAGE_SYNC_KEYS.includes(schema.STORAGE_KEYS.newtabLocalWallpaper));
  assert(schema.LOCAL_STORAGE_SYNC_KEYS.includes(schema.STORAGE_KEYS.bookmarkTopbarSurfaceMode));
  assert(schema.LOCAL_STORAGE_SYNC_KEYS.includes(schema.STORAGE_KEYS.bookmarkTopbarSurfaceColorLight));
  assert(schema.LOCAL_STORAGE_SYNC_KEYS.includes(schema.STORAGE_KEYS.bookmarkTopbarSurfaceColorDark));
  assert.strictEqual(schema.isSyncKey(schema.CLOUD_LOCAL_KEYS.session), false, 'sessions must never be sync settings');

  const settingsSnapshot = {
    [schema.STORAGE_KEYS.themeMode]: 'dark',
    [schema.STORAGE_KEYS.language]: 'zh-CN',
    [schema.STORAGE_KEYS.newtabWallpaper]: 'custom-wallpaper-secret-name',
    [schema.STORAGE_KEYS.newtabLocalWallpaper]: {
      light: 'custom-wallpaper-private-id',
      dark: '__lumno_local_wallpaper_disabled__'
    },
    [schema.STORAGE_KEYS.newtabShortcuts]: [
      { title: 'Private', url: 'https://private.example/path' },
      { title: 'Work', url: 'https://work.example/' }
    ],
    [schema.STORAGE_KEYS.pinnedRecentSites]: ['https://sensitive.example'],
    [schema.STORAGE_KEYS.searchBlacklist]: [{ pattern: 'https://bank.example' }],
    [schema.STORAGE_KEYS.autoPipEnabled]: true
  };

  const copiedSettings = schema.copySyncSettings(settingsSnapshot);
  assert.deepStrictEqual(copiedSettings[schema.STORAGE_KEYS.newtabShortcuts], settingsSnapshot[schema.STORAGE_KEYS.newtabShortcuts]);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(copiedSettings, schema.CLOUD_LOCAL_KEYS.session), false);

  const analytics = schema.buildAnalyticsConfiguration(settingsSnapshot);
  assert.strictEqual(analytics.theme_mode, 'dark');
  assert.strictEqual(analytics.language_mode, 'zh-CN');
  assert.strictEqual(analytics.wallpaper_source, 'custom');
  assert.strictEqual(analytics.shortcut_count, 2);
  assert.strictEqual(analytics.pinned_recent_site_count, 1);
  assert.strictEqual(analytics.search_blacklist_rule_count, 1);
  assert.strictEqual(JSON.stringify(analytics).includes('private.example'), false);
  assert.strictEqual(JSON.stringify(analytics).includes('bank.example'), false);
  assert.strictEqual(JSON.stringify(analytics).includes('secret-name'), false);

  const batch = schema.sanitizeUsageBatch({
    batch_id: '4b18420f-3f71-4f5f-9c2b-5b79a01bd746',
    day: '2026-08-01',
    metrics: {
      command_bar_opened: 21,
      unknown_event: 999,
      sync_failed: -10
    },
    dimensions: {
      extension_version: '0.9.30',
      locale: 'zh-CN',
      browser_family: 'chrome',
      platform_family: 'macos'
    },
    settings_snapshot: settingsSnapshot
  });
  assert(batch);
  assert.deepStrictEqual(batch.metrics, { command_bar_opened: 21 });
  assert.strictEqual(batch.configuration.shortcut_count, 2);

  assert.strictEqual(schema.sanitizeUsageBatch({
    batch_id: '4b18420f-3f71-4f5f-9c2b-5b79a01bd746',
    day: '2026-08-01',
    metrics: { command_bar_opened: 1 },
    current_url: 'https://should-never-leave-device.example'
  }), null, 'forbidden properties should reject the whole batch');

  assert.strictEqual(schema.containsForbiddenAnalyticsKey({
    nested: { query: 'private search' }
  }), true);

  console.log('cloud sync schema tests passed');
}

run();
