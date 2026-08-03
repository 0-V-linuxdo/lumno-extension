(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSecureSessionStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const DATABASE_NAME = 'lumno-private-auth-v1';
  const DATABASE_VERSION = 2;
  const STORE_NAME = 'sessions';
  const KEY_STORE_NAME = 'crypto-keys';
  const SESSION_KEY = 'current';
  const ENCRYPTION_KEY = 'session-aes-gcm-v1';
  const ENVELOPE_FORMAT = 'lumno-aes-gcm-v1';
  const ENCRYPTION_CONTEXT = 'lumno:secure-session:current:v1';

  function createStore(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const indexedDBApi = settings.indexedDBApi || null;
    const cryptoApi = settings.cryptoApi !== undefined
      ? settings.cryptoApi
      : (typeof globalThis !== 'undefined' ? globalThis.crypto : null);
    const fallbackArea = settings.fallbackArea || null;
    const fallbackKey = String(settings.fallbackKey || 'lumno-session');
    const hasTrustedDatabase = Boolean(indexedDBApi && typeof indexedDBApi.open === 'function');
    const hasEncryption = Boolean(
      cryptoApi &&
      cryptoApi.subtle &&
      typeof cryptoApi.subtle.generateKey === 'function' &&
      typeof cryptoApi.subtle.encrypt === 'function' &&
      typeof cryptoApi.subtle.decrypt === 'function' &&
      typeof cryptoApi.getRandomValues === 'function' &&
      typeof TextEncoder === 'function' &&
      typeof TextDecoder === 'function'
    );
    const hasProtectedDatabase = hasTrustedDatabase && hasEncryption;
    let databasePromise = null;
    let encryptionKeyPromise = null;
    let volatileSession = null;
    let fallbackAccessPromise = null;

    function openDatabase() {
      if (!hasTrustedDatabase) return Promise.resolve(null);
      if (databasePromise) return databasePromise;
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDBApi.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
          if (!database.objectStoreNames.contains(KEY_STORE_NAME)) {
            database.createObjectStore(KEY_STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('secure_session_store_unavailable'));
        request.onblocked = () => reject(new Error('secure_session_store_blocked'));
      });
      return databasePromise;
    }

    function callFallback(method) {
      if (!fallbackArea || typeof fallbackArea[method] !== 'function') {
        return method === 'get' ? Promise.resolve(null) : Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const callback = (result) => {
          const runtimeError = typeof chrome !== 'undefined' && chrome.runtime
            ? chrome.runtime.lastError
            : null;
          if (runtimeError) {
            reject(new Error(runtimeError.message || 'secure_session_store_failed'));
            return;
          }
          resolve(method === 'get' ? ((result && result[fallbackKey]) || null) : undefined);
        };
        if (method === 'get') fallbackArea.get([fallbackKey], callback);
        else fallbackArea.remove([fallbackKey], callback);
      });
    }

    function restrictFallbackAccess() {
      if (!fallbackArea || typeof fallbackArea.setAccessLevel !== 'function') {
        return Promise.resolve(false);
      }
      if (fallbackAccessPromise) return fallbackAccessPromise;
      fallbackAccessPromise = new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          if (error) reject(error);
          else resolve(true);
        };
        const callback = () => {
          const runtimeError = typeof chrome !== 'undefined' && chrome.runtime
            ? chrome.runtime.lastError
            : null;
          finish(runtimeError
            ? new Error(runtimeError.message || 'secure_session_access_level_failed')
            : null);
        };
        try {
          const result = fallbackArea.setAccessLevel(
            { accessLevel: 'TRUSTED_CONTEXTS' },
            callback
          );
          if (result && typeof result.then === 'function') {
            result.then(() => finish(null), finish);
          }
        } catch (error) {
          finish(error);
        }
      });
      return fallbackAccessPromise;
    }

    restrictFallbackAccess()
      .then((protectedAccess) => protectedAccess ? undefined : removeLegacyFallback())
      .catch(() => removeLegacyFallback().catch(() => {}));

    async function removeLegacyFallback() {
      await callFallback('remove');
    }

    async function readProtectedLegacyFallback() {
      let protectedAccess = false;
      try {
        protectedAccess = await restrictFallbackAccess();
      } catch (_error) {
        protectedAccess = false;
      }
      if (!protectedAccess) {
        await removeLegacyFallback();
        return null;
      }
      return callFallback('get');
    }

    async function transact(storeName, mode, operation) {
      const database = await openDatabase();
      if (!database) return operation(null);
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let request;
        let result = null;
        try {
          request = operation(store);
        } catch (error) {
          reject(error);
          return;
        }
        request.onsuccess = () => {
          result = request.result === undefined ? null : request.result;
        };
        request.onerror = () => reject(request.error || new Error('secure_session_store_failed'));
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error || new Error('secure_session_store_failed'));
        transaction.onabort = () => reject(transaction.error || new Error('secure_session_store_failed'));
      });
    }

    function isEncryptionKey(value) {
      return Boolean(
        value &&
        value.type === 'secret' &&
        value.extractable === false &&
        value.algorithm &&
        value.algorithm.name === 'AES-GCM'
      );
    }

    function getEncryptionKey() {
      if (!hasProtectedDatabase) {
        return Promise.reject(new Error('secure_session_encryption_unavailable'));
      }
      if (encryptionKeyPromise) return encryptionKeyPromise;
      encryptionKeyPromise = (async () => {
        const storedKey = await transact(KEY_STORE_NAME, 'readonly', (store) => (
          store.get(ENCRYPTION_KEY)
        ));
        if (isEncryptionKey(storedKey)) return storedKey;
        const generatedKey = await cryptoApi.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        await transact(KEY_STORE_NAME, 'readwrite', (store) => (
          store.put(generatedKey, ENCRYPTION_KEY)
        ));
        return generatedKey;
      })().catch((error) => {
        encryptionKeyPromise = null;
        throw error;
      });
      return encryptionKeyPromise;
    }

    function getAdditionalData() {
      return new TextEncoder().encode(ENCRYPTION_CONTEXT);
    }

    async function encrypt(value) {
      const key = await getEncryptionKey();
      const iv = cryptoApi.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify(value));
      const ciphertext = await cryptoApi.subtle.encrypt({
        name: 'AES-GCM',
        iv,
        additionalData: getAdditionalData()
      }, key, plaintext);
      return {
        format: ENVELOPE_FORMAT,
        iv: Array.from(iv),
        ciphertext
      };
    }

    async function decrypt(envelope) {
      if (!envelope || envelope.format !== ENVELOPE_FORMAT ||
          !Array.isArray(envelope.iv) || envelope.iv.length !== 12 ||
          !(envelope.ciphertext instanceof ArrayBuffer)) {
        throw new Error('secure_session_envelope_invalid');
      }
      const key = await getEncryptionKey();
      const plaintext = await cryptoApi.subtle.decrypt({
        name: 'AES-GCM',
        iv: new Uint8Array(envelope.iv),
        additionalData: getAdditionalData()
      }, key, envelope.ciphertext);
      return JSON.parse(new TextDecoder().decode(plaintext));
    }

    async function deletePersistentSecrets() {
      if (!hasTrustedDatabase) return;
      encryptionKeyPromise = null;
      await transact(KEY_STORE_NAME, 'readwrite', (store) => store.delete(ENCRYPTION_KEY));
      await transact(STORE_NAME, 'readwrite', (store) => store.delete(SESSION_KEY));
    }

    async function get() {
      if (!hasProtectedDatabase) {
        await deletePersistentSecrets();
        await removeLegacyFallback();
        return volatileSession;
      }
      const stored = await transact(STORE_NAME, 'readonly', (store) => store.get(SESSION_KEY));
      if (stored) {
        if (stored.format === ENVELOPE_FORMAT) {
          try {
            return await decrypt(stored);
          } catch (_error) {
            await deletePersistentSecrets();
            return null;
          }
        }
        try {
          await set(stored);
          return stored;
        } catch (_error) {
          await deletePersistentSecrets();
          return null;
        }
      }
      const legacy = await readProtectedLegacyFallback();
      if (legacy) {
        await set(legacy);
        await removeLegacyFallback();
      }
      return legacy || null;
    }

    async function set(value) {
      if (!hasProtectedDatabase) {
        volatileSession = value;
        await deletePersistentSecrets();
        await removeLegacyFallback();
        return;
      }
      const envelope = await encrypt(value);
      await transact(STORE_NAME, 'readwrite', (store) => store.put(envelope, SESSION_KEY));
      await removeLegacyFallback();
    }

    async function remove() {
      volatileSession = null;
      await deletePersistentSecrets();
      await removeLegacyFallback();
    }

    return Object.freeze({ get, set, remove });
  }

  return Object.freeze({
    DATABASE_NAME,
    STORE_NAME,
    KEY_STORE_NAME,
    createStore
  });
});
