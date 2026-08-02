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
  const localArea = createArea({});
  const syncArea = createArea({ [themeKey]: 'light' });
  const trackedArea = controllerApi.createTrackedArea(syncArea, () => 1);
  const repository = repositoryApi.createRepository({
    localArea,
    syncArea,
    cloudArea: trackedArea
  });
  const queued = [];
  const calls = [];
  let session = null;
  let failConsentDisable = false;
  const runtime = {
    async ensureDevice() {
      return { id: '00000000-0000-4000-8000-000000000001', display_name: 'Lumno browser' };
    },
    async enableCloudMode() {
      calls.push('enable');
      return repository.enterCloudMode();
    },
    async disableCloudMode(options) {
      calls.push('disable');
      return repository.leaveCloudMode(options);
    },
    async pull() {
      calls.push('pull');
      return { ok: true, pulled: 0 };
    },
    async queueSettingChange(key, value, options) {
      queued.push({ key, value, deleted: Boolean(options && options.deleted) });
      return true;
    },
    async syncNow() {
      calls.push('sync');
      return { ok: true };
    }
  };
  const transport = {
    config: { configured: true },
    async getSession() { return session; },
    async requestOtp(email) { calls.push(`otp:${email}`); return { ok: true }; },
    async verifyOtp(email) {
      calls.push(`verify:${email}`);
      session = { user: { id: 'user-one', email } };
      return session;
    },
    async registerDevice() { calls.push('register'); },
    async signOut() { session = null; calls.push('signout'); },
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
        session = { user: { id: 'user-one', email: 'web@example.com' } };
        return session;
      }
    },
    setTimeout: () => 1,
    clearTimeout: () => {}
  });

  const signedIn = await controller.verifyOtp('alice@example.com', '123456');
  assert.strictEqual(signedIn.signedIn, true);
  assert.deepStrictEqual(calls.slice(0, 6), [
    'verify:alice@example.com', 'enable', 'register', 'pull', 'register', 'sync'
  ]);
  assert(queued.some((item) => item.key === themeKey && item.value === 'light'));

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

  const webSignedIn = await controller.signInWithWeb();
  assert.strictEqual(webSignedIn.signedIn, true);
  assert.strictEqual(webSignedIn.email, 'web@example.com');
  assert(calls.includes('web-auth'));

  const accountADevice = { id: 'account-a-device', display_name: 'Old browser' };
  const transitionLocalArea = createArea({
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
  const accountBSession = { user: { id: 'account-b', email: 'b@example.com' } };
  const transitionRuntime = {
    async ensureDevice() {
      const existing = transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.device];
      if (existing) return existing;
      const device = { id: 'account-b-device', display_name: 'New browser' };
      transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.device] = device;
      return device;
    },
    async enableCloudMode() { return transitionRepository.enterCloudMode(); },
    async pull() { return { ok: true, pulled: 0 }; },
    async queueSettingChange(key, value) {
      replacementQueuedSettings.push({ key, value });
      return true;
    },
    async syncNow() { return { ok: true }; },
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
      async setSyncConsent() {},
      async setAnalyticsConsent() {},
      async ingestUsage() {}
    },
    webAuth: { async signIn() { return accountBSession; } },
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
  const accountBStatus = await transitionController.signInWithWeb();
  assert.strictEqual(accountBStatus.signedIn, true);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.account].id, 'account-b');
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.pullCursor], undefined);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.outbox], undefined);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.versions], undefined);
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.conflicts], undefined);
  assert(registeredDeviceIds.length > 0);
  assert(registeredDeviceIds.every((id) => id === 'account-b-device'),
    'the replacement account must never register or push with Account A device state');
  assert.deepStrictEqual(replacementQueuedSettings, [],
    'the replacement account must not upload the previous account browser snapshot');

  transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.pullCursor] = 99;
  transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.outbox] = [{ operation_id: 'account-b-operation' }];
  await transitionController.signInWithWeb();
  assert.strictEqual(transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.pullCursor], 99,
    'reauthenticating the same account must preserve its cursor');
  assert.deepStrictEqual(
    transitionLocalArea.values[schema.CLOUD_LOCAL_KEYS.outbox],
    [{ operation_id: 'account-b-operation' }],
    'reauthenticating the same account must preserve its outbox'
  );
  assert(replacementQueuedSettings.length > 0,
    'same-account reauthentication should preserve the normal snapshot queue behavior');

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

  console.log('cloud account controller tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
