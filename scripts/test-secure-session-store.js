const assert = require('assert');

const secureStoreApi = require('../src/background/secure-session-store.js');

function createArea(initialValues, options) {
  const values = { ...(initialValues || {}) };
  const events = [];
  const settings = options && typeof options === 'object' ? options : {};
  return {
    values,
    events,
    get(keys, callback) {
      events.push('get');
      const requested = Array.isArray(keys) ? keys : Object.keys(values);
      callback(Object.fromEntries(requested.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(values, key) ? [[key, values[key]]] : []
      ))));
    },
    set(payload, callback) {
      events.push('set');
      Object.assign(values, payload);
      if (callback) callback();
    },
    remove(keys, callback) {
      events.push('remove');
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]);
      if (callback) callback();
    },
    ...(settings.supportsAccessLevel ? {
      setAccessLevel(details, callback) {
        events.push(`access:${details && details.accessLevel}`);
        if (callback) callback();
      }
    } : {})
  };
}

function createIndexedDB(initialValue) {
  let stored = initialValue || null;
  const database = {
    objectStoreNames: { contains: () => true },
    transaction() {
      const transaction = {};
      const finish = (request, result, update) => {
        setImmediate(() => {
          if (update) update();
          request.result = result;
          if (request.onsuccess) request.onsuccess();
          setImmediate(() => {
            if (transaction.oncomplete) transaction.oncomplete();
          });
        });
        return request;
      };
      transaction.objectStore = () => ({
        get() {
          return finish({}, stored);
        },
        put(value) {
          return finish({}, undefined, () => { stored = value; });
        },
        delete() {
          return finish({}, undefined, () => { stored = null; });
        }
      });
      return transaction;
    }
  };
  return {
    open() {
      const request = {};
      setImmediate(() => {
        request.result = database;
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    },
    getStored() {
      return stored;
    }
  };
}

async function run() {
  const fallbackKey = '_lumno_cloud_session_v1_';
  const legacySession = {
    access_token: 'legacy-access',
    refresh_token: 'legacy-refresh',
    expires_at: 1_900_000_000,
    user: { id: 'legacy-user' }
  };
  const localArea = createArea({ [fallbackKey]: legacySession });
  const store = secureStoreApi.createStore({
    indexedDBApi: null,
    fallbackArea: localArea,
    fallbackKey
  });

  assert.strictEqual(await store.get(), null,
    'an unavailable trusted store must fail closed instead of reading a legacy refresh token');
  assert.strictEqual(localArea.values[fallbackKey], undefined,
    'unprotected legacy session material should be deleted');

  const activeSession = {
    access_token: 'volatile-access',
    refresh_token: 'volatile-refresh',
    expires_at: 1_900_000_000,
    user: { id: 'active-user' }
  };
  await store.set(activeSession);
  assert.deepStrictEqual(await store.get(), activeSession);
  assert.strictEqual(localArea.values[fallbackKey], undefined,
    'the volatile fallback must not write the session to chrome.storage.local');
  assert.strictEqual(localArea.events.includes('set'), false,
    'no fallback storage write may contain session material');
  await store.remove();
  assert.strictEqual(await store.get(), null);

  const protectedArea = createArea({ [fallbackKey]: legacySession }, { supportsAccessLevel: true });
  const protectedStore = secureStoreApi.createStore({
    indexedDBApi: null,
    fallbackArea: protectedArea,
    fallbackKey
  });
  await protectedStore.get();
  assert.strictEqual(protectedArea.values[fallbackKey], undefined);
  assert.strictEqual(protectedArea.events.includes('get'), false,
    'without IndexedDB there is no safe migration destination, so even protected legacy data is discarded');

  const migrationArea = createArea({ [fallbackKey]: legacySession }, { supportsAccessLevel: true });
  const indexedDBApi = createIndexedDB(null);
  const migrationStore = secureStoreApi.createStore({
    indexedDBApi,
    fallbackArea: migrationArea,
    fallbackKey
  });
  assert.deepStrictEqual(await migrationStore.get(), legacySession);
  assert.deepStrictEqual(indexedDBApi.getStored(), legacySession,
    'protected legacy data should migrate into extension-origin IndexedDB');
  assert.strictEqual(migrationArea.values[fallbackKey], undefined);
  assert(migrationArea.events.indexOf('access:TRUSTED_CONTEXTS') >= 0);
  assert(
    migrationArea.events.indexOf('access:TRUSTED_CONTEXTS') < migrationArea.events.indexOf('get'),
    'the fallback area must be restricted before a legacy refresh token is read'
  );

  console.log('secure session store tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
