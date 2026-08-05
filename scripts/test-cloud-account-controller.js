const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');
const repositoryApi = require('../src/shared/settings-repository.js');
const controllerApi = require('../src/background/cloud-account-controller.js');

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
      if (callback) callback();
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]);
      if (callback) callback();
    }
  };
}

async function run() {
  assert.strictEqual(controllerApi.WALLPAPER_SETTLE_MS, 30000,
    'wallpaper checkpoints should wait for a 30-second stable selection');

  const wallpaperTimerCalls = [];
  const clearedWallpaperTimers = [];
  const wallpaperAlarmCreates = [];
  const wallpaperSyncOptions = [];
  const wallpaperSchedulerLocalArea = createArea({
    [schema.CLOUD_LOCAL_KEYS.account]: { id: 'wallpaper-user' }
  });
  const wallpaperScheduler = controllerApi.createController({
    chromeApi: {
      runtime: { id: 'extension-id', getManifest: () => ({ version: '1.2.3' }) },
      alarms: {
        create(name, options) { wallpaperAlarmCreates.push({ name, options }); },
        clear() {}
      }
    },
    localArea: wallpaperSchedulerLocalArea,
    syncArea: createArea({}),
    repository: {
      async getMode() { return repositoryApi.MODE_CLOUD; }
    },
    runtime: {
      async ensureDevice() { return { id: 'wallpaper-device' }; },
      async syncNow() { return { ok: true }; }
    },
    transport: {
      config: { configured: true },
      async getSession() { return { user: { id: 'wallpaper-user' } }; },
      async registerDevice() {}
    },
    wallpaperRuntime: {
      async syncAll(options) {
        wallpaperSyncOptions.push(options);
        return { ok: true, wallpaper: { uploaded: 0, downloaded: 0, deleted: 0 } };
      }
    },
    setTimeout(callback, delay) {
      wallpaperTimerCalls.push({ callback, delay });
      return wallpaperTimerCalls.length;
    },
    clearTimeout(id) { clearedWallpaperTimers.push(id); }
  });
  await wallpaperScheduler.scheduleWallpaperSync();
  await wallpaperScheduler.scheduleWallpaperSync();
  assert.deepStrictEqual(wallpaperTimerCalls.map((item) => item.delay), [30000, 30000]);
  assert(clearedWallpaperTimers.includes(1),
    'a later wallpaper selection should cancel the previous stable-selection timer');
  assert.strictEqual(wallpaperAlarmCreates.at(-1).name, controllerApi.WALLPAPER_SETTLE_ALARM_NAME);
  await wallpaperScheduler.commitActiveWallpapers();
  assert.deepStrictEqual(wallpaperSyncOptions.at(-1), { uploadActive: true },
    'closing the panel should immediately checkpoint the final active wallpaper slots');

  const detected = controllerApi.detectClientInfo({
    runtime: { getManifest: () => ({ version: '1.2.3' }) }
  }, {
    userAgent: 'Mozilla/5.0 Chrome/140.0.0.0',
    platform: 'MacIntel'
  });
  assert.strictEqual(detected.browser_family, 'chrome');
  assert.strictEqual(detected.platform_family, 'macos');
  assert.strictEqual(detected.extension_version, '1.2.3');

  const themeKey = schema.STORAGE_KEYS.themeMode;
  const shortcutsKey = schema.STORAGE_KEYS.newtabShortcuts;
  const localArea = createArea({});
  const syncArea = createArea({
    [themeKey]: 'light',
    [shortcutsKey]: [{ id: 'device-shortcut', title: 'Device', url: 'https://device.example/' }]
  });
  const trackedArea = controllerApi.createTrackedArea(syncArea, () => 1);
  const repository = repositoryApi.createRepository({
    localArea,
    syncArea,
    cloudArea: trackedArea
  });
  const queued = [];
  const calls = [];
  const enableOptions = [];
  const pullOptions = [];
  const syncOptions = [];
  let session = null;
  let failConsentDisable = false;
  const consentVersion = controllerApi.CLOUD_COMBINED_CONSENT_VERSION;
  const runtime = {
    async ensureDevice() {
      return { id: '00000000-0000-4000-8000-000000000001', display_name: 'Lumno browser' };
    },
    async enableCloudMode(options) {
      calls.push('enable');
      enableOptions.push(options);
      return repository.enterCloudMode(options);
    },
    async disableCloudMode(options) {
      calls.push('disable');
      return repository.leaveCloudMode(options);
    },
    async pull(options) {
      calls.push('pull');
      pullOptions.push(options);
      return { ok: true, pulled: 1, keys: [shortcutsKey] };
    },
    async queueSettingChange(key, value, options) {
      queued.push({ key, value, deleted: Boolean(options && options.deleted) });
      return true;
    },
    async syncNow(options) {
      calls.push('sync');
      syncOptions.push(options);
      return { ok: true };
    }
  };
  const transport = {
    config: { configured: true },
    async getSession() { return session; },
    async registerDevice() { calls.push('register'); },
    async signOut() { session = null; calls.push('signout'); },
    async setCloudConsent(version) {
      calls.push(`cloud-consent:${version}`);
    },
    async setAnalyticsConsent(value) {
      calls.push(`consent:${value}`);
      if (!value && failConsentDisable) {
        const error = new Error('consent-service-offline');
        error.code = 'consent-service-offline';
        throw error;
      }
    },
    async deleteAccount() { session = null; calls.push('delete'); }
  };
  const controller = controllerApi.createController({
    chromeApi: { runtime: { id: 'extension-id', getManifest: () => ({ version: '1.2.3' }) } },
    localArea,
    syncArea,
    trackedCloudArea: trackedArea,
    repository,
    runtime,
    transport,
    webAuth: {
      async signIn() {
        calls.push('web-auth');
        session = { user: { id: 'user-one', email: 'web@example.com', provider: 'google' } };
        return session;
      }
    },
    setTimeout: () => 1,
    clearTimeout: () => {}
  });

  await assert.rejects(
    () => controller.signInWithWeb(),
    (error) => error && error.code === 'cloud_consent_required',
    'web authentication must not start without the current combined consent version'
  );
  assert(!calls.includes('web-auth'));

  const signedIn = await controller.signInWithWeb(consentVersion);
  assert.strictEqual(signedIn.signedIn, true);
  assert.deepStrictEqual(calls.slice(0, 6), [
    'web-auth', `cloud-consent:${consentVersion}`, 'enable', 'register', 'pull', 'sync'
  ]);
  assert.strictEqual(calls.filter((call) => call === 'register').length, 1,
    'a bootstrap pull followed by sync should not rewrite the device row twice');
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.consent].analytics, true,
    'the combined sync confirmation must enable usage analytics after OAuth succeeds');
  assert.strictEqual(
    localArea.values[schema.CLOUD_LOCAL_KEYS.consent].privacy_notice_version,
    consentVersion
  );
  assert.deepStrictEqual(pullOptions[0], { full: true, resetMissing: false });
  assert.strictEqual(syncOptions[0].fullPull, true);
  assert.strictEqual(enableOptions[0].browserSnapshot[themeKey], 'light',
    'first Lumno login must pass the Chrome Sync snapshot as the migration baseline');
  assert(queued.some((item) => item.key === themeKey && item.value === 'light'));
  assert(!queued.some((item) => item.key === shortcutsKey),
    'a Chrome migration must not overwrite a shortcut record that already exists in Lumno');

  const queuedBeforeInternalWrite = queued.length;
  trackedArea.set({ [themeKey]: 'dark' }, () => {});
  await controller.queueExternalChanges(trackedArea.consume({
    [themeKey]: { oldValue: 'light', newValue: 'dark' }
  }));
  assert.strictEqual(queued.length, queuedBeforeInternalWrite,
    'cloud-applied cache writes must not echo back into the outbox');

  await controller.queueExternalChanges({
    [themeKey]: { oldValue: 'dark', newValue: 'system' }
  });
  assert.strictEqual(queued.at(-1).value, 'system', 'user changes should enter the outbox');

  await controller.setAnalyticsConsent(true);
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.consent].analytics, true);
  await controller.recordUsage('command_bar_opened');
  assert(localArea.values[schema.CLOUD_LOCAL_KEYS.usage], 'enabled analytics should create a local batch');
  failConsentDisable = true;
  const withdrawn = await controller.setAnalyticsConsent(false);
  assert.strictEqual(withdrawn.ok, true, 'local withdrawal must succeed while the service is offline');
  assert.strictEqual(withdrawn.analyticsConsented, false);
  assert.strictEqual(withdrawn.remoteWarning, 'consent-service-offline');
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.consent].analytics, false);
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.usage], undefined,
    'withdrawal must clear queued metrics before remote acknowledgement');
  assert.deepStrictEqual(await controller.recordUsage('command_bar_opened'), { recorded: false },
    'new metrics must be rejected after an offline withdrawal');
  failConsentDisable = false;
  await controller.signOut();
  assert.strictEqual(await repository.getMode(), repositoryApi.MODE_GUEST);
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.session], undefined);
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.cacheOwner], 'user-one',
    'sign-out should retain the cache owner marker so another account cannot inherit media');
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.lastSignInProvider], 'google',
    'sign-out should retain only the provider name needed to guide the next sign-in');
  const signedOutStatus = await controller.getStatus();
  assert.strictEqual(signedOutStatus.lastSignInProvider, 'google');

  const webSignedIn = await controller.signInWithWeb(consentVersion);
  assert.strictEqual(webSignedIn.signedIn, true);
  assert.strictEqual(webSignedIn.email, 'web@example.com');
  assert.strictEqual(webSignedIn.lastSignInProvider, 'google');
  assert(calls.includes('web-auth'));

  const manualSyncOptionsBefore = syncOptions.length;
  const manualSyncResponse = await new Promise((resolve) => {
    controller.handleMessage(
      { action: 'cloudSyncNow' },
      { id: 'extension-id', url: 'chrome-extension://extension-id/src/options/options.html' },
      resolve
    );
  });
  assert.strictEqual(manualSyncResponse.ok, true);
  assert.strictEqual(syncOptions.length, manualSyncOptionsBefore + 1);
  assert.strictEqual(syncOptions.at(-1).fullPull, true,
    'the visible Sync now action must rebuild the local cache from a full cloud snapshot');

  const accountADevice = { id: 'account-a-device', display_name: 'Old browser' };
  const transitionLocalArea = createArea({
    [themeKey]: 'stale-local-cache',
    [schema.STORAGE_KEYS.language]: 'stale-account-language',
    [schema.CLOUD_LOCAL_KEYS.account]: { id: 'account-a', email: 'a@example.com' },
    [schema.CLOUD_LOCAL_KEYS.device]: accountADevice,
    [schema.CLOUD_LOCAL_KEYS.pullCursor]: 42,
    [schema.CLOUD_LOCAL_KEYS.outbox]: [{ operation_id: 'account-a-operation' }],
    [schema.CLOUD_LOCAL_KEYS.versions]: { [themeKey]: 7 },
    [schema.CLOUD_LOCAL_KEYS.conflicts]: [{ key: themeKey }],
    [schema.CLOUD_LOCAL_KEYS.mode]: repositoryApi.MODE_CLOUD
  });
  const transitionSyncArea = createArea({ [themeKey]: 'dark' });
  const transitionRepository = repositoryApi.createRepository({
    localArea: transitionLocalArea,
    syncArea: transitionSyncArea
  });
  const registeredDeviceIds = [];
  const replacementQueuedSettings = [];
  const transitionEnableOptions = [];
  let clearedMediaCount = 0;
  const accountBSession = { user: { id: 'account-b', email: 'b@example.com' } };
  const transitionRuntime = {
    async ensureDevice() {
      const existing = transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.device];
      if (existing) return existing;
      const device = { id: 'account-b-device', display_name: 'New browser' };
      transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.device] = device;
      return device;
    },
    async enableCloudMode(options) {
      transitionEnableOptions.push(options);
      return transitionRepository.enterCloudMode(options);
    },
    async pull(options) {
      assert.deepStrictEqual(options, { full: true, resetMissing: false });
      transitionLocalArea.values[themeKey] = 'dark';
      return { ok: true, pulled: 1, keys: [themeKey] };
    },
    async queueSettingChange(key, value) {
      replacementQueuedSettings.push({ key, value });
      return true;
    },
    async autoResolveConflicts() {
      transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.conflicts] = [];
      return { resolved: 1, discarded: 1, keptLocal: 0 };
    },
    async syncNow() { return { ok: true }; },
    async getState() {
      return {
        conflicts: transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.conflicts] || []
      };
    },
    async disableCloudMode(options) { return transitionRepository.leaveCloudMode(options); }
  };
  const transitionController = controllerApi.createController({
    chromeApi: { runtime: { id: 'extension-id', getManifest: () => ({ version: '1.2.3' }) } },
    localArea: transitionLocalArea,
    syncArea: transitionSyncArea,
    repository: transitionRepository,
    runtime: transitionRuntime,
    transport: {
      config: { configured: true },
      async getSession() { return accountBSession; },
      async registerDevice(device) { registeredDeviceIds.push(device.id); },
      async setCloudConsent() {},
      async setSyncConsent() {},
      async setAnalyticsConsent() {},
      async ingestUsage() {}
    },
    webAuth: { async signIn() { return accountBSession; } },
    wallpaperRuntime: {
      async clearLocal() { clearedMediaCount += 1; },
      async syncAll() { return { ok: true, downloaded: 0, uploaded: 0 }; }
    },
    setTimeout: () => 1,
    clearTimeout: () => {}
  });
  const blockedTransitionSync = await transitionController.syncNow();
  assert.deepStrictEqual(blockedTransitionSync, {
    skipped: true,
    reason: 'account-transition-required'
  });
  assert.deepStrictEqual(registeredDeviceIds, [],
    'a session/account mismatch must be blocked before device registration or sync');
  const accountBStatus = await transitionController.signInWithWeb(consentVersion);
  assert.strictEqual(accountBStatus.signedIn, true);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.account].id, 'account-b');
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.pullCursor], undefined);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.outbox], undefined);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.versions], undefined);
  assert.strictEqual(transitionLocalArea.values[themeKey], 'dark',
    'switching accounts must rebuild the cache from the new account device baseline');
  assert.strictEqual(transitionLocalArea.values[schema.STORAGE_KEYS.language], undefined,
    'settings absent from the replacement account must not survive from the old cache');
  assert.deepStrictEqual(transitionEnableOptions[0], { resetCloudCache: true });
  assert.strictEqual(clearedMediaCount, 1,
    'wallpaper and shortcut-icon caches must be cleared when the cache owner changes');
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.cacheOwner], 'account-b');
  assert.deepStrictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.conflicts], [],
    'account transitions should leave no legacy conflict records behind');
  assert(registeredDeviceIds.length > 0);
  assert(registeredDeviceIds.every((id) => id === 'account-b-device'),
    'the replacement account must never register or push with Account A device state');
  assert.deepStrictEqual(replacementQueuedSettings, [],
    'the replacement account must not upload the previous account browser snapshot');

  transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.pullCursor] = 99;
  transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.outbox] = [{ operation_id: 'account-b-operation' }];
  await transitionController.signInWithWeb(consentVersion);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.pullCursor], 99,
    'reauthenticating the same account must preserve its cursor');
  assert.deepStrictEqual(
    transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.outbox],
    [{ operation_id: 'account-b-operation' }],
    'reauthenticating the same account must preserve its outbox'
  );
  assert.deepStrictEqual(replacementQueuedSettings, [],
    'same-account reauthentication must not rewrite every cloud setting or advance versions');

  transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.conflicts] = [{ key: themeKey }];
  await transitionController.setSyncProvider('chrome');
  assert.strictEqual(await transitionRepository.getMode(), repositoryApi.MODE_GUEST,
    'switching back to Chrome Sync should not be blocked by an automatically resolved conflict');
  assert.deepStrictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.conflicts], [],
    'switching providers should clear any legacy conflict records automatically');

  assert.strictEqual(controllerApi.isTrustedExtensionSender({
    id: 'extension-id',
    url: 'chrome-extension://extension-id/src/options/options.html'
  }, { runtime: { id: 'extension-id' } }), true);
  assert.strictEqual(controllerApi.isTrustedExtensionSender({
    id: 'extension-id',
    url: 'https://example.com/'
  }, { runtime: { id: 'extension-id' } }), false);
  assert.strictEqual(controllerApi.isTrustedExtensionSender({
    id: 'other-extension',
    url: 'chrome-extension://other-extension/page.html'
  }, { runtime: { id: 'extension-id' } }), false);

  const concurrentRegistrationArea = createArea({
    [schema.CLOUD_LOCAL_KEYS.mode]: repositoryApi.MODE_CLOUD,
    [schema.CLOUD_LOCAL_KEYS.account]: { id: 'concurrent-user' },
    [schema.CLOUD_LOCAL_KEYS.cacheOwner]: 'concurrent-user'
  });
  let releaseRegistration;
  let markRegistrationStarted;
  let registrationCalls = 0;
  const registrationStarted = new Promise((resolve) => { markRegistrationStarted = resolve; });
  const concurrentRegistrationController = controllerApi.createController({
    chromeApi: { runtime: { id: 'extension-id', getManifest: () => ({ version: '1.2.3' }) } },
    localArea: concurrentRegistrationArea,
    syncArea: createArea({}),
    repository: {
      async getMode() { return repositoryApi.MODE_CLOUD; }
    },
    runtime: {
      async ensureDevice() { return { id: 'concurrent-device' }; },
      async syncNow() { return { ok: true }; }
    },
    transport: {
      async getSession() { return { user: { id: 'concurrent-user' } }; },
      async registerDevice() {
        registrationCalls += 1;
        markRegistrationStarted();
        await new Promise((resolve) => { releaseRegistration = resolve; });
      }
    },
    wallpaperRuntime: {
      async syncAll() { return { ok: true, uploaded: 0, downloaded: 0, deleted: 0 }; }
    },
    usageRuntime: { async flush() { return { ok: true }; } }
  });
  const concurrentSyncs = [
    concurrentRegistrationController.syncNow(),
    concurrentRegistrationController.syncNow()
  ];
  await registrationStarted;
  assert.strictEqual(registrationCalls, 1,
    'concurrent sync entry points must share one in-flight device registration');
  releaseRegistration();
  await Promise.all(concurrentSyncs);
  assert.strictEqual(registrationCalls, 1);

  const rejoinDeviceId = '40000000-0000-4000-8000-000000000001';
  const rejoinLocalArea = createArea({
    [themeKey]: 'dark',
    [schema.CLOUD_LOCAL_KEYS.mode]: repositoryApi.MODE_CLOUD,
    [schema.CLOUD_LOCAL_KEYS.account]: { id: 'rejoin-user', email: 'rejoin@example.com' },
    [schema.CLOUD_LOCAL_KEYS.cacheOwner]: 'rejoin-user',
    [schema.CLOUD_LOCAL_KEYS.device]: { id: rejoinDeviceId, display_name: 'Same Mac' },
    [schema.CLOUD_LOCAL_KEYS.versions]: { [themeKey]: 5 },
    [schema.CLOUD_LOCAL_KEYS.pullCursor]: 50,
    [schema.CLOUD_LOCAL_KEYS.outbox]: [],
    [schema.CLOUD_LOCAL_KEYS.conflicts]: []
  });
  const rejoinSyncArea = createArea({ [themeKey]: 'dark' });
  let rejoinSession = { user: { id: 'rejoin-user', email: 'rejoin@example.com', provider: 'google' } };
  let remoteTheme = 'dark';
  let remoteVersion = 5;
  let remoteChangeId = 50;
  const rejoinPushes = [];
  const rejoinRegistrations = [];
  const rejoinTransport = {
    config: { configured: true },
    async getSession() { return rejoinSession; },
    async registerDevice(device) { rejoinRegistrations.push(device.id); },
    async signOut() { rejoinSession = null; },
    async setCloudConsent() {},
    async setAnalyticsConsent() {},
    async pushSettings(payload) {
      rejoinPushes.push(payload);
      const change = payload.changes[0];
      remoteTheme = change.value;
      remoteVersion += 1;
      remoteChangeId += 1;
      return {
        accepted: [{
          operation_id: change.operation_id,
          key: change.key,
          version: remoteVersion,
          change_id: remoteChangeId
        }],
        conflicts: []
      };
    },
    async pullSettings() {
      return {
        rows: [{
          key: themeKey,
          value: remoteTheme,
          version: remoteVersion,
          change_id: remoteChangeId,
          updated_by_device: 'other-device'
        }]
      };
    }
  };
  const rejoinController = controllerApi.createController({
    chromeApi: { runtime: { id: 'extension-id', getManifest: () => ({ version: '1.2.3' }) } },
    localArea: rejoinLocalArea,
    syncArea: rejoinSyncArea,
    transport: rejoinTransport,
    webAuth: {
      async signIn() {
        rejoinSession = { user: { id: 'rejoin-user', email: 'rejoin@example.com', provider: 'google' } };
        return rejoinSession;
      }
    },
    wallpaperRuntime: {
      async syncAll() { return { ok: true, uploaded: 0, downloaded: 0, deleted: 0 }; }
    },
    usageRuntime: {
      async flush() { return { ok: true }; },
      async withdrawConsent() {},
      async clear() {},
      async record() { return { recorded: false }; }
    },
    setTimeout: () => 1,
    clearTimeout: () => {}
  });
  await rejoinController.signOut();
  assert.strictEqual(rejoinLocalArea.values[schema.CLOUD_LOCAL_KEYS.rejoin].device.id, rejoinDeviceId,
    'local sign-out must retain the account-scoped physical device id for a safe rejoin');
  rejoinSyncArea.values[themeKey] = 'system';
  const rejoined = await rejoinController.signInWithWeb(consentVersion);
  assert.strictEqual(rejoined.signedIn, true);
  assert.strictEqual(remoteTheme, 'system',
    'a setting changed while signed out must be pushed when the server base is unchanged');
  assert.strictEqual(rejoinPushes.at(-1).changes[0].base_version, 5,
    'the signed-out edit must retain its last acknowledged cloud base version');
  assert(rejoinRegistrations.every((id) => id === rejoinDeviceId),
    'same-account re-entry must reuse the device id instead of consuming another device slot');
  assert.strictEqual(rejoinLocalArea.values[schema.CLOUD_LOCAL_KEYS.rejoin], undefined,
    'the checkpoint must be removed after it is restored into active sync state');
  assert.strictEqual(rejoined.sync.conflictCount, 0);

  console.log('cloud account controller tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
