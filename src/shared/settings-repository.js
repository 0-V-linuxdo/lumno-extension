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

    async function enterCloudMode() {
      const sharedKeys = schema.SYNC_KEYS.filter((key) => !localOnlyKeySet.has(key));
      const localKeys = schema.SYNC_KEYS.filter((key) => localOnlyKeySet.has(key));
      const syncValues = await getAreaValues(syncArea, sharedKeys);
      const cloudValues = await getAreaValues(cloudArea, sharedKeys);
      const localValues = await getAreaValues(localSettingArea, localKeys);
      const migration = {};
      sharedKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(cloudValues, key) &&
            Object.prototype.hasOwnProperty.call(syncValues, key)) {
          migration[key] = syncValues[key];
        }
      });
      await mutateArea(cloudArea, 'set', migration);
      await mutateArea(localArea, 'set', { [modeKey]: MODE_CLOUD });
      return {
        mode: MODE_CLOUD,
        migrated_keys: Object.keys(migration),
        snapshot: schema.copySyncSettings({ ...syncValues, ...cloudValues, ...localValues })
      };
    }

    async function leaveCloudMode(options) {
      const leaveOptions = options && typeof options === 'object' ? options : {};
      const snapshot = schema.copySyncSettings(await get(schema.SYNC_KEYS));
      if (leaveOptions.copyToBrowserSync !== false && syncArea) {
        const browserSyncSnapshot = Object.fromEntries(
          Object.entries(snapshot).filter(([key]) => !localOnlyKeySet.has(key))
        );
        await mutateArea(syncArea, 'set', browserSyncSnapshot);
      }
      await mutateArea(localArea, 'set', { [modeKey]: MODE_GUEST });
      return {
        mode: MODE_GUEST,
        copied_keys: Object.keys(snapshot)
      };
    }

    return Object.freeze({
      getMode,
      getActiveArea,
      get,
      set,
      remove,
      enterCloudMode,
      leaveCloudMode
    });
  }

  return Object.freeze({
    MODE_GUEST,
    MODE_CLOUD,
    getAreaValues,
    mutateArea,
    normalizeMode,
    createRepository
  });
});
