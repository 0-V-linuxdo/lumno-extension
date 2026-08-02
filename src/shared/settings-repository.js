(function(root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('./cloud-sync-schema.js')
    : root.LumnoCloudSyncSchema;
  const api = factory(schema);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSettingsRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(schema) {
  'use strict';

  const MODE_GUEST = 'guest';
  const MODE_CLOUD = 'cloud';
  const BROWSER_SYNC_QUOTAS = Object.freeze({
    totalBytes: 102400,
    bytesPerItem: 8192,
    maxItems: 512
  });

  function jsonByteLength(value) {
    const json = JSON.stringify(value);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(json).byteLength;
    return unescape(encodeURIComponent(json)).length;
  }

  function inspectBrowserSyncSnapshot(snapshot) {
    const clean = schema.copySyncSettings(snapshot);
    const entries = Object.entries(clean);
    const items = entries.map(([key, value]) => ({
      key,
      bytes: jsonByteLength({ [key]: value })
    }));
    const oversizedItems = items.filter((item) => item.bytes > BROWSER_SYNC_QUOTAS.bytesPerItem);
    const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
    return Object.freeze({
      ok: entries.length <= BROWSER_SYNC_QUOTAS.maxItems &&
        totalBytes <= BROWSER_SYNC_QUOTAS.totalBytes &&
        oversizedItems.length === 0,
      itemCount: entries.length,
      totalBytes,
      oversizedItems,
      quotas: BROWSER_SYNC_QUOTAS
    });
  }

  function getAreaValues(area, keys) {
    return new Promise((resolve, reject) => {
      if (!area || typeof area.get !== 'function') {
        resolve({});
        return;
      }
      let settled = false;
      const finish = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(value || {});
      };
      try {
        const maybePromise = area.get(keys, finish);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(finish).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function mutateArea(area, method, value) {
    return new Promise((resolve, reject) => {
      if (!area || typeof area[method] !== 'function') {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };
      try {
        const maybePromise = area[method](value, finish);
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(finish).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  function normalizeMode(value) {
    return value === MODE_CLOUD ? MODE_CLOUD : MODE_GUEST;
  }

  function createRepository(options) {
    const config = options && typeof options === 'object' ? options : {};
    const syncArea = config.syncArea || null;
    const localArea = config.localArea || null;
    const cloudArea = config.cloudArea || localArea;
    const localSettingArea = config.localSettingArea || localArea;
    const localOnlyKeySet = new Set(Array.isArray(config.localOnlyKeys) ? config.localOnlyKeys : []);
    const modeKey = config.modeKey || schema.CLOUD_LOCAL_KEYS.mode;

    async function getMode() {
      const result = await getAreaValues(localArea, [modeKey]);
      return normalizeMode(result[modeKey]);
    }

    async function getActiveArea() {
      const mode = await getMode();
      if (mode === MODE_CLOUD) {
        return cloudArea;
      }
      return syncArea || localArea;
    }

    async function get(keys) {
      const requested = Array.isArray(keys) ? keys : schema.SYNC_KEYS;
      const localKeys = requested.filter((key) => localOnlyKeySet.has(key));
      const sharedKeys = requested.filter((key) => !localOnlyKeySet.has(key));
      const area = await getActiveArea();
      const [sharedValues, localValues] = await Promise.all([
        getAreaValues(area, sharedKeys),
        getAreaValues(localSettingArea, localKeys)
      ]);
      return { ...sharedValues, ...localValues };
    }

    async function set(values) {
      const source = values && typeof values === 'object' ? values : {};
      const localValues = {};
      const sharedValues = {};
      Object.entries(source).forEach(([key, value]) => {
        (localOnlyKeySet.has(key) ? localValues : sharedValues)[key] = value;
      });
      const area = await getActiveArea();
      await Promise.all([
        mutateArea(area, 'set', sharedValues),
        mutateArea(localSettingArea, 'set', localValues)
      ]);
    }

    async function remove(keys) {
      const requested = Array.isArray(keys) ? keys : [keys];
      const localKeys = requested.filter((key) => localOnlyKeySet.has(key));
      const sharedKeys = requested.filter((key) => !localOnlyKeySet.has(key));
      const area = await getActiveArea();
      await Promise.all([
        mutateArea(area, 'remove', sharedKeys),
        mutateArea(localSettingArea, 'remove', localKeys)
      ]);
    }

    async function enterCloudMode(options) {
      const enterOptions = options && typeof options === 'object' ? options : {};
      const resetCloudCache = enterOptions.resetCloudCache === true;
      const hasBrowserSnapshot = Object.prototype.hasOwnProperty.call(enterOptions, 'browserSnapshot') &&
        enterOptions.browserSnapshot && typeof enterOptions.browserSnapshot === 'object' &&
        !Array.isArray(enterOptions.browserSnapshot);
      const sharedKeys = schema.SYNC_KEYS.filter((key) => !localOnlyKeySet.has(key));
      const localKeys = schema.SYNC_KEYS.filter((key) => localOnlyKeySet.has(key));
      const syncValues = await getAreaValues(syncArea, sharedKeys);
      const cloudValues = await getAreaValues(cloudArea, sharedKeys);
      const localValues = await getAreaValues(localSettingArea, localKeys);
      const migration = {};
      let sourceSnapshot;
      let snapshot;
      if (resetCloudCache) {
        // Account transitions must not inherit settings or local-only visual
        // state from the previous account. A subsequent full pull rebuilds the
        // cache; keys absent from that account stay absent and use defaults.
        await mutateArea(cloudArea, 'remove', sharedKeys);
        await mutateArea(localSettingArea, 'remove', localKeys);
        sourceSnapshot = {};
        snapshot = {};
      } else if (hasBrowserSnapshot) {
        sourceSnapshot = schema.copySyncSettings(enterOptions.browserSnapshot);
        const browserValues = {};
        sharedKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(sourceSnapshot, key)) {
            browserValues[key] = sourceSnapshot[key];
            migration[key] = sourceSnapshot[key];
          }
        });
        // A guest-to-cloud transition must rebuild the shared cache from the
        // active browser source. Otherwise stale local values can masquerade as
        // the current device settings and hide Chrome Sync values.
        await mutateArea(cloudArea, 'remove', sharedKeys);
        await mutateArea(cloudArea, 'set', browserValues);
        snapshot = schema.copySyncSettings({ ...sourceSnapshot, ...localValues });
      } else {
        sharedKeys.forEach((key) => {
          if (!Object.prototype.hasOwnProperty.call(cloudValues, key) &&
              Object.prototype.hasOwnProperty.call(syncValues, key)) {
            migration[key] = syncValues[key];
          }
        });
        await mutateArea(cloudArea, 'set', migration);
        sourceSnapshot = schema.copySyncSettings({ ...syncValues, ...localValues });
        snapshot = schema.copySyncSettings({ ...syncValues, ...cloudValues, ...localValues });
      }
      await mutateArea(localArea, 'set', { [modeKey]: MODE_CLOUD });
      return {
        mode: MODE_CLOUD,
        migrated_keys: Object.keys(migration),
        source: 'chrome',
        target: 'lumno',
        inspected_at: Date.now(),
        source_snapshot: sourceSnapshot,
        snapshot
      };
    }

    async function leaveCloudMode(options) {
      const leaveOptions = options && typeof options === 'object' ? options : {};
      const snapshot = schema.copySyncSettings(await get(schema.SYNC_KEYS));
      if (leaveOptions.copyToBrowserSync !== false && syncArea) {
        const browserSyncSnapshot = Object.fromEntries(
          Object.entries(snapshot).filter(([key]) => !localOnlyKeySet.has(key))
        );
        const inspection = inspectBrowserSyncSnapshot(browserSyncSnapshot);
        if (!inspection.ok) {
          const error = new Error('browser_sync_quota_exceeded');
          error.code = 'browser_sync_quota_exceeded';
          error.report = inspection;
          throw error;
        }
        await mutateArea(syncArea, 'set', browserSyncSnapshot);
      }
      await mutateArea(localArea, 'set', { [modeKey]: MODE_GUEST });
      return {
        mode: MODE_GUEST,
        copied_keys: Object.keys(snapshot),
        source: 'lumno',
        target: 'chrome',
        inspected_at: Date.now(),
        browser_sync: inspectBrowserSyncSnapshot(
          Object.fromEntries(Object.entries(snapshot).filter(([key]) => !localOnlyKeySet.has(key)))
        )
      };
    }

    async function clearCloudSnapshot() {
      const sharedKeys = schema.SYNC_KEYS.filter((key) => !localOnlyKeySet.has(key));
      await mutateArea(cloudArea, 'remove', sharedKeys);
      return { cleared_keys: sharedKeys };
    }

    return Object.freeze({
      getMode,
      getActiveArea,
      get,
      set,
      remove,
      enterCloudMode,
      leaveCloudMode,
      clearCloudSnapshot
    });
  }

  return Object.freeze({
    MODE_GUEST,
    MODE_CLOUD,
    BROWSER_SYNC_QUOTAS,
    jsonByteLength,
    inspectBrowserSyncSnapshot,
    getAreaValues,
    mutateArea,
    normalizeMode,
    createRepository
  });
});
