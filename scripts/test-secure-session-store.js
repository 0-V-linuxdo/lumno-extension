const assert = require('assert');
const { webcrypto } = require('crypto');

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
  const stores = new Map([
    [secureStoreApi.STORE_NAME, new Map(initialValue ? [['current', initialValue]] : [])]
  ]);
  const database = {
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore(name) {
      stores.set(name, new Map());
    },
    transaction(storeName) {
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
      transaction.objectStore = () => {
        const values = stores.get(storeName);
        if (!values) throw new Error(`missing object store: ${storeName}`);
        return {
        get(key) {
          return finish({}, values.has(key) ? values.get(key) : null);
        },
        put(value, key) {
          return finish({}, undefined, () => { values.set(key, value); });
        },
        delete(key) {
          return finish({}, undefined, () => { values.delete(key); });
        }
      };
      };
      return transaction;
    }
  };
  return {
    open() {
      const request = {};
      setImmediate(() => {
        request.result = database;
        if (request.onupgradeneeded) request.onupgradeneeded();
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    },
    getStored(storeName = secureStoreApi.STORE_NAME, key = 'current') {
      const values = stores.get(storeName);
      return values && values.has(key) ? values.get(key) : null;
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
    cryptoApi: webcrypto,
    fallbackArea: migrationArea,
    fallbackKey
  });
  assert.deepStrictEqual(await migrationStore.get(), legacySession);
  const migratedEnvelope = indexedDBApi.getStored();
  assert.strictEqual(migratedEnvelope.format, 'lumno-aes-gcm-v1',
    'protected legacy data should migrate into an encrypted IndexedDB envelope');
  assert.notStrictEqual(migratedEnvelope.ciphertext.byteLength, 0);
  const ciphertextText = Buffer.from(migratedEnvelope.ciphertext).toString('utf8');
  assert.strictEqual(ciphertextText.includes('legacy-access'), false,
    'stored ciphertext must not expose the access token as plaintext');
  assert.strictEqual(ciphertextText.includes('legacy-refresh'), false,
    'stored ciphertext must not expose the refresh token as plaintext');
  const encryptionKey = indexedDBApi.getStored(
    secureStoreApi.KEY_STORE_NAME,
    'session-aes-gcm-v1'
  );
  assert(encryptionKey, 'the encrypted store should persist its CryptoKey');
  assert.strictEqual(encryptionKey.extractable, false,
    'the persisted session key must not be exportable to JavaScript');
  assert.deepStrictEqual(await migrationStore.get(), legacySession,
    'the encrypted session should decrypt through the real store boundary');
  assert.strictEqual(migrationArea.values[fallbackKey], undefined);
  assert(migrationArea.events.indexOf('access:TRUSTED_CONTEXTS') >= 0);
  assert(
    migrationArea.events.indexOf('access:TRUSTED_CONTEXTS') < migrationArea.events.indexOf('get'),
    'the fallback area must be restricted before a legacy refresh token is read'
  );

  const plaintextIndexedDB = createIndexedDB(legacySession);
  const plaintextMigrationStore = secureStoreApi.createStore({
    indexedDBApi: plaintextIndexedDB,
    cryptoApi: webcrypto,
    fallbackArea: createArea({}, { supportsAccessLevel: true }),
    fallbackKey
  });
  assert.deepStrictEqual(await plaintextMigrationStore.get(), legacySession,
    'a legacy plaintext IndexedDB session should migrate without signing the user out');
  assert.strictEqual(plaintextIndexedDB.getStored().format, 'lumno-aes-gcm-v1');

  const encryptedSession = {
    access_token: 'encrypted-access',
    refresh_token: 'encrypted-refresh',
    expires_at: 1_900_000_000,
    user: { id: 'encrypted-user' }
  };
  const tamperIndexedDB = createIndexedDB(null);
  const tamperStore = secureStoreApi.createStore({
    indexedDBApi: tamperIndexedDB,
    cryptoApi: webcrypto,
    fallbackArea: createArea({}, { supportsAccessLevel: true }),
    fallbackKey
  });
  await tamperStore.set(encryptedSession);
  const tamperedEnvelope = tamperIndexedDB.getStored();
  const tamperedBytes = new Uint8Array(tamperedEnvelope.ciphertext);
  tamperedBytes[0] ^= 1;
  assert.strictEqual(await tamperStore.get(), null,
    'AES-GCM authentication failure must fail closed');
  assert.strictEqual(tamperIndexedDB.getStored(), null,
    'tampered ciphertext must be removed');
  assert.strictEqual(tamperIndexedDB.getStored(
    secureStoreApi.KEY_STORE_NAME,
    'session-aes-gcm-v1'
  ), null, 'the key should be rotated after tampering or sign-out');

  const noCryptoIndexedDB = createIndexedDB(legacySession);
  const noCryptoStore = secureStoreApi.createStore({
    indexedDBApi: noCryptoIndexedDB,
    cryptoApi: null,
    fallbackArea: createArea({}, { supportsAccessLevel: true }),
    fallbackKey
  });
  assert.strictEqual(await noCryptoStore.get(), null,
    'persistent sessions must fail closed when Web Crypto is unavailable');
  assert.strictEqual(noCryptoIndexedDB.getStored(), null,
    'legacy plaintext must be erased when it cannot be encrypted');
  await noCryptoStore.set(encryptedSession);
  assert.deepStrictEqual(await noCryptoStore.get(), encryptedSession,
    'the no-crypto fallback may keep a session in memory for the current runtime only');
  assert.strictEqual(noCryptoIndexedDB.getStored(), null,
    'the no-crypto fallback must never persist plaintext session material');

  await migrationStore.remove();
  assert.strictEqual(indexedDBApi.getStored(), null);
  assert.strictEqual(indexedDBApi.getStored(
    secureStoreApi.KEY_STORE_NAME,
    'session-aes-gcm-v1'
  ), null, 'sign-out should delete both the ciphertext and its key');

  console.log('secure session store tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
