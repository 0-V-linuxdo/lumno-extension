const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');
const repositoryApi = require('../src/shared/settings-repository.js');
const usageApi = require('../src/background/usage-analytics-runtime.js');

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
      if (callback) callback();
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]);
      if (callback) callback();
    }
  };
}

async function run() {
  const localArea = createArea({});
  const syncArea = createArea({
    [schema.STORAGE_KEYS.themeMode]: 'dark',
    [schema.STORAGE_KEYS.newtabShortcuts]: [
      { title: 'Private dashboard', url: 'https://private.example/account' }
    ],
    [schema.STORAGE_KEYS.searchBlacklist]: [
      { pattern: 'https://bank.example' }
    ]
  });
  const repository = repositoryApi.createRepository({ localArea, syncArea });
  const uploaded = [];
  const usage = usageApi.createRuntime({
    localArea,
    repository,
    transport: { async ingestUsage(batch) { uploaded.push(batch); } },
    now: () => Date.parse('2026-08-01T12:00:00Z'),
    uuid: () => '4b18420f-3f71-4f5f-9c2b-5b79a01bd746',
    dimensions: {
      extension_version: '0.9.30',
      locale: 'zh-CN',
      browser_family: 'chrome',
      platform_family: 'macos'
    }
  });

  assert.deepStrictEqual(await usage.record('command_bar_opened'), { recorded: false },
    'analytics disabled means no local counter is created');
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.usage], undefined);

  localArea.values[schema.CLOUD_LOCAL_KEYS.consent] = { analytics: true };
  await usage.record('command_bar_opened');
  await usage.record('command_bar_opened', 2);
  await usage.record('unknown_event');
  await usage.flush();
  assert.strictEqual(uploaded.length, 1);
  assert.deepStrictEqual(uploaded[0].metrics, { command_bar_opened: 3 });
  assert.strictEqual(uploaded[0].configuration.shortcut_count, 1);
  assert.strictEqual(JSON.stringify(uploaded[0]).includes('private.example'), false);
  assert.strictEqual(JSON.stringify(uploaded[0]).includes('bank.example'), false);
  assert.deepStrictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.usage], { days: {} });

  await usage.record('sync_failed');
  await usage.clear();
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.usage], undefined);

  console.log('usage analytics runtime tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
