const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');
const runtimeApi = require('../src/background/cloud-sync-runtime.js');

function createArea(initialValues) {
  const values = { ...(initialValues || {}) };
  return {
    values,
    get(keys, callback) {
      const requested = Array.isArray(keys) ? keys : Object.keys(values);
      callback(Object.fromEntries(requested.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(values, key) ? [[key, values[key]]] : []
      ))));
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
  const syncArea = createArea({ [themeKey]: 'light' });
  const localArea = createArea({});
  const pushes = [];
  let pullRows = [];
  let pushMode = 'accept';
  const runtime = runtimeApi.createRuntime({
    localArea,
    syncArea,
    now: (() => {
      let value = 1000;
      return () => value++;
    })(),
    uuid: (() => {
      let value = 1;
      return () => `00000000-0000-4000-8000-${String(value++).padStart(12, '0')}`;
    })(),
    transport: {
      async pushSettings(payload) {
        pushes.push(payload);
        if (pushMode === 'conflict') {
          return {
            accepted: [],
            conflicts: payload.changes.map((change) => ({
              operation_id: change.operation_id,
              key: change.key,
              value: 'light',
              version: 2,
              change_id: 21
            }))
          };
        }
        return {
          accepted: payload.changes.map((change, index) => ({
            operation_id: change.operation_id,
            key: change.key,
            version: change.base_version + 1,
            change_id: 10 + index
          })),
          conflicts: []
        };
      },
      async pullSettings() {
        return { rows: pullRows };
      }
    }
  });

  const enabled = await runtime.enableCloudMode();
  assert.strictEqual(enabled.snapshot[themeKey], 'light');
  assert.strictEqual(localArea.values[themeKey], 'light');
  assert(enabled.device.id);

  await runtime.queueSettingChange(themeKey, 'dark');
  const firstState = await runtime.getState();
  assert.strictEqual(firstState.outbox.length, 1);
  await runtime.flush();
  assert.strictEqual(pushes.length, 1);
  assert.strictEqual((await runtime.getState()).outbox.length, 0);

  pullRows = [{ key: languageKey, value: 'ja', version: 1, change_id: 20 }];
  const pullResult = await runtime.pull();
  assert.strictEqual(pullResult.applied, 1);
  assert.strictEqual(localArea.values[languageKey], 'ja');
  assert.strictEqual((await runtime.getState()).cursor, 20);

  pushMode = 'conflict';
  await runtime.queueSettingChange(themeKey, 'dark');
  const conflictPush = await runtime.flush();
  assert.strictEqual(conflictPush.conflicts.length, 1);
  assert.strictEqual((await runtime.getState()).outbox.length, 0,
    'rejected operations must leave the outbox to avoid a retry livelock');
  assert.strictEqual(localArea.values[themeKey], 'light', 'the active value should follow the server');
  await runtime.resolveConflict(themeKey, 'device');
  assert.strictEqual((await runtime.getState()).outbox[0].base_version, 2,
    'keeping the device value should create a fresh edit against the remote version');
  pushMode = 'accept';
  await runtime.flush();

  await runtime.disableCloudMode({ copyToBrowserSync: true });
  assert.strictEqual(syncArea.values[languageKey], 'ja');
  await runtime.queueSettingChange(themeKey, 'light');
  const skipped = await runtime.flush();
  assert.strictEqual(skipped.skipped, true);

  console.log('cloud sync runtime tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
