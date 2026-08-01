const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');
const state = require('../src/shared/cloud-sync-state.js');

function run() {
  const themeKey = schema.STORAGE_KEYS.themeMode;
  const languageKey = schema.STORAGE_KEYS.language;
  let outbox = state.enqueueOperation([], {
    operation_id: '11111111-1111-4111-8111-111111111111',
    key: themeKey,
    value: 'light',
    base_version: 7,
    enqueued_at: 100
  });
  outbox = state.enqueueOperation(outbox, {
    operation_id: '22222222-2222-4222-8222-222222222222',
    key: themeKey,
    value: 'dark',
    base_version: 99,
    enqueued_at: 200
  });
  assert.strictEqual(outbox.length, 1, 'later edits to the same setting should coalesce');
  assert.strictEqual(outbox[0].value, 'dark');
  assert.strictEqual(outbox[0].base_version, 7, 'coalescing must preserve the server version first edited');

  outbox = state.enqueueOperation(outbox, {
    operation_id: '33333333-3333-4333-8333-333333333333',
    key: languageKey,
    value: 'ja',
    base_version: 2,
    enqueued_at: 300
  });
  assert.strictEqual(state.buildPushBatch(outbox, 1).length, 1);

  const lateAck = state.acknowledgeOperations(outbox, ['11111111-1111-4111-8111-111111111111']);
  assert.strictEqual(lateAck.length, 2, 'an old acknowledgement must not remove a newer edit');
  outbox = state.acknowledgeOperations(outbox, ['22222222-2222-4222-8222-222222222222']);
  assert.deepStrictEqual(outbox.map((item) => item.key), [languageKey]);

  const pull = state.applyRemoteRows(
    { [themeKey]: 'light', [languageKey]: 'en' },
    [
      { key: themeKey, value: 'dark', version: 8, change_id: 12 },
      { key: languageKey, value: 'zh-CN', version: 3, change_id: 13 }
    ],
    outbox
  );
  assert.strictEqual(pull.updates[themeKey], 'dark');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(pull.updates, languageKey), false);
  assert.strictEqual(pull.conflicts.length, 1);
  assert.strictEqual(pull.conflicts[0].key, languageKey);
  assert.strictEqual(pull.cursor, 13);

  assert.deepStrictEqual(
    state.resolveInitialSnapshot(
      { [themeKey]: 'dark' },
      { [themeKey]: 'light', [languageKey]: 'ja' },
      'merge-device-first'
    ),
    { [themeKey]: 'dark', [languageKey]: 'ja' }
  );
  assert.strictEqual(state.resolveInitialSnapshot({}, {}, 'silent-overwrite'), null);

  console.log('cloud sync state tests passed');
}

run();
