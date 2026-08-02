(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSecureSessionStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const DATABASE_NAME = 'lumno-private-auth-v1';
  const DATABASE_VERSION = 1;
  const STORE_NAME = 'sessions';
  const SESSION_KEY = 'current';

  function createStore(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const indexedDBApi = settings.indexedDBApi || null;
    const fallbackArea = settings.fallbackArea || null;
    const fallbackKey = String(settings.fallbackKey || 'lumno-session');
    const hasTrustedDatabase = Boolean(indexedDBApi && typeof indexedDBApi.open === 'function');
    let databasePromise = null;
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

    async function transact(mode, operation) {
      const database = await openDatabase();
      if (!database) return operation(null);
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
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

    async function get() {
      if (!hasTrustedDatabase) {
        await removeLegacyFallback();
        return volatileSession;
      }
      const stored = await transact('readonly', (store) => store.get(SESSION_KEY));
      if (stored) return stored;
      const legacy = await readProtectedLegacyFallback();
      if (legacy) {
        await set(legacy);
        await removeLegacyFallback();
      }
      return legacy || null;
    }

    async function set(value) {
      if (!hasTrustedDatabase) {
        volatileSession = value;
        await removeLegacyFallback();
        return;
      }
      await transact('readwrite', (store) => store.put(value, SESSION_KEY));
      await removeLegacyFallback();
    }

    async function remove() {
      volatileSession = null;
      if (hasTrustedDatabase) await transact('readwrite', (store) => store.delete(SESSION_KEY));
      await removeLegacyFallback();
    }

    return Object.freeze({ get, set, remove });
  }

  return Object.freeze({
    DATABASE_NAME,
    STORE_NAME,
    createStore
  });
});
