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
    async setAnalyticsConsent(value) { calls.push(`consent:${value}`); },
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
  await controller.signOut();
  assert.strictEqual(await repository.getMode(), repositoryApi.MODE_GUEST);
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.session], undefined);

  const webSignedIn = await controller.signInWithWeb();
  assert.strictEqual(webSignedIn.signedIn, true);
  assert.strictEqual(webSignedIn.email, 'web@example.com');
  assert(calls.includes('web-auth'));

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
