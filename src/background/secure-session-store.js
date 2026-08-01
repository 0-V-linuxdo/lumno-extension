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
    let databasePromise = null;

    function openDatabase() {
      if (!indexedDBApi || typeof indexedDBApi.open !== 'function') return Promise.resolve(null);
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

    function useFallback(method, value) {
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
        else if (method === 'set') fallbackArea.set({ [fallbackKey]: value }, callback);
        else fallbackArea.remove([fallbackKey], callback);
      });
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
      if (!indexedDBApi) return useFallback('get');
      const stored = await transact('readonly', (store) => store.get(SESSION_KEY));
      if (stored) return stored;
      const legacy = await useFallback('get');
      if (legacy) {
        await set(legacy);
        await useFallback('remove');
      }
      return legacy || null;
    }

    async function set(value) {
      if (!indexedDBApi) return useFallback('set', value);
      await transact('readwrite', (store) => store.put(value, SESSION_KEY));
      await useFallback('remove');
    }

    async function remove() {
      if (indexedDBApi) await transact('readwrite', (store) => store.delete(SESSION_KEY));
      await useFallback('remove');
    }

    return Object.freeze({ get, set, remove });
  }

  return Object.freeze({
    DATABASE_NAME,
    STORE_NAME,
    createStore
  });
});
