(function(root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('../shared/cloud-sync-schema.js')
    : root.LumnoCloudSyncSchema;
  const state = typeof module === 'object' && module.exports
    ? require('../shared/cloud-sync-state.js')
    : root.LumnoCloudSyncState;
  const repositoryApi = typeof module === 'object' && module.exports
    ? require('../shared/settings-repository.js')
    : root.LumnoSettingsRepository;
  const api = factory(schema, state, repositoryApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoCloudSyncRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(schema, state, repositoryApi) {
  'use strict';

  function createUuid(cryptoApi) {
    const api = cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    if (api && typeof api.randomUUID === 'function') {
      return api.randomUUID();
    }
    const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    return `${random()}${random()}-${random()}-4${random().slice(1)}-8${random().slice(1)}-${random()}${random()}${random()}`;
  }

  function normalizeVersions(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return Object.fromEntries(Object.entries(source).flatMap(([key, version]) => {
      const number = Number(version);
      return schema.isSyncKey(key) && Number.isSafeInteger(number) && number >= 0
        ? [[key, number]]
        : [];
    }));
  }

  function createRuntime(options) {
    const config = options && typeof options === 'object' ? options : {};
    const chromeApi = config.chromeApi || (typeof chrome !== 'undefined' ? chrome : null);
    const storage = chromeApi && chromeApi.storage ? chromeApi.storage : {};
    const localArea = config.localArea || storage.local || null;
    const syncArea = config.syncArea || storage.sync || localArea;
    const repository = config.repository || repositoryApi.createRepository({ localArea, syncArea });
    const transport = config.transport || null;
    const now = typeof config.now === 'function' ? config.now : () => Date.now();
    const uuid = typeof config.uuid === 'function' ? config.uuid : () => createUuid(config.cryptoApi);
    let activeSync = null;

    async function readLocal(keys) {
      return repositoryApi.getAreaValues(localArea, keys);
    }

    async function writeLocal(values) {
      return repositoryApi.mutateArea(localArea, 'set', values);
    }

    async function ensureDevice() {
      const result = await readLocal([schema.CLOUD_LOCAL_KEYS.device]);
      const current = result[schema.CLOUD_LOCAL_KEYS.device];
      if (current && typeof current === 'object' && current.id) {
        return current;
      }
      const device = {
        id: uuid(),
        display_name: 'Lumno browser',
        created_at: now()
      };
      await writeLocal({ [schema.CLOUD_LOCAL_KEYS.device]: device });
      return device;
    }

    async function getState() {
      const keys = schema.CLOUD_LOCAL_KEYS;
      const result = await readLocal([
        keys.outbox,
        keys.pullCursor,
        keys.versions,
        keys.conflicts,
        keys.status
      ]);
      return {
        outbox: state.normalizeOutbox(result[keys.outbox]),
        cursor: Number.isSafeInteger(Number(result[keys.pullCursor]))
          ? Math.max(0, Number(result[keys.pullCursor]))
          : 0,
        versions: normalizeVersions(result[keys.versions]),
        conflicts: Array.isArray(result[keys.conflicts]) ? result[keys.conflicts] : [],
        status: result[keys.status] && typeof result[keys.status] === 'object'
          ? result[keys.status]
          : {}
      };
    }

    async function queueSettingChange(key, value, options) {
      const changeOptions = options && typeof options === 'object' ? options : {};
      if (!schema.isSyncKey(key)) {
        return false;
      }
      const current = await getState();
      const outbox = state.enqueueOperation(current.outbox, {
        operation_id: uuid(),
        key,
        value,
        deleted: changeOptions.deleted === true,
        base_version: current.versions[key] || 0,
        enqueued_at: now()
      });
      await writeLocal({ [schema.CLOUD_LOCAL_KEYS.outbox]: outbox });
      return true;
    }

    async function flush() {
      if (await repository.getMode() !== repositoryApi.MODE_CLOUD ||
          !transport || typeof transport.pushSettings !== 'function') {
        return { skipped: true, reason: 'cloud-disabled' };
      }
      const current = await getState();
      const changes = state.buildPushBatch(current.outbox);
      if (changes.length === 0) {
        return { ok: true, pushed: 0, conflicts: current.conflicts };
      }
      const device = await ensureDevice();
      const response = await transport.pushSettings({
        device_id: device.id,
        changes
      });
      const accepted = Array.isArray(response && response.accepted) ? response.accepted : [];
      const conflicts = Array.isArray(response && response.conflicts) ? response.conflicts : [];
      const acceptedIds = accepted.map((item) => item && item.operation_id).filter(Boolean);
      const nextVersions = { ...current.versions };
      let cursor = current.cursor;
      accepted.forEach((item) => {
        if (item && schema.isSyncKey(item.key)) {
          nextVersions[item.key] = Number(item.version) || nextVersions[item.key] || 0;
          cursor = Math.max(cursor, Number(item.change_id) || 0);
        }
      });
      await writeLocal({
        [schema.CLOUD_LOCAL_KEYS.outbox]: state.acknowledgeOperations(current.outbox, acceptedIds),
        [schema.CLOUD_LOCAL_KEYS.versions]: nextVersions,
        [schema.CLOUD_LOCAL_KEYS.pullCursor]: cursor,
        [schema.CLOUD_LOCAL_KEYS.conflicts]: conflicts,
        [schema.CLOUD_LOCAL_KEYS.status]: {
          state: conflicts.length > 0 ? 'conflict' : 'ready',
          last_push_at: now(),
          last_error: ''
        }
      });
      return {
        ok: true,
        pushed: accepted.length,
        conflicts
      };
    }

    async function pull() {
      if (await repository.getMode() !== repositoryApi.MODE_CLOUD ||
          !transport || typeof transport.pullSettings !== 'function') {
        return { skipped: true, reason: 'cloud-disabled' };
      }
      const current = await getState();
      const device = await ensureDevice();
      const response = await transport.pullSettings({
        device_id: device.id,
        cursor: current.cursor
      });
      const rows = Array.isArray(response && response.rows) ? response.rows : [];
      const localSnapshot = await repository.get(schema.SYNC_KEYS);
      const applied = state.applyRemoteRows(localSnapshot, rows, current.outbox);
      if (Object.keys(applied.updates).length > 0) {
        await repository.set(applied.updates);
      }
      if (applied.removals.length > 0) {
        await repository.remove(applied.removals);
      }
      const conflicts = [...current.conflicts, ...applied.conflicts];
      await writeLocal({
        [schema.CLOUD_LOCAL_KEYS.pullCursor]: Math.max(current.cursor, applied.cursor),
        [schema.CLOUD_LOCAL_KEYS.versions]: { ...current.versions, ...applied.versions },
        [schema.CLOUD_LOCAL_KEYS.conflicts]: conflicts,
        [schema.CLOUD_LOCAL_KEYS.status]: {
          state: conflicts.length > 0 ? 'conflict' : 'ready',
          last_pull_at: now(),
          last_error: ''
        }
      });
      return {
        ok: true,
        pulled: rows.length,
        applied: Object.keys(applied.updates).length + applied.removals.length,
        conflicts
      };
    }

    function syncNow() {
      if (activeSync) {
        return activeSync;
      }
      activeSync = (async () => {
        try {
          const pushed = await flush();
          const pulled = await pull();
          return { ok: true, pushed, pulled };
        } catch (error) {
          await writeLocal({
            [schema.CLOUD_LOCAL_KEYS.status]: {
              state: 'error',
              last_error_at: now(),
              last_error: String(error && error.message ? error.message : error || 'Unknown sync error').slice(0, 240)
            }
          });
          throw error;
        } finally {
          activeSync = null;
        }
      })();
      return activeSync;
    }

    async function enableCloudMode() {
      const migration = await repository.enterCloudMode();
      const device = await ensureDevice();
      return { ...migration, device };
    }

    async function disableCloudMode(options) {
      return repository.leaveCloudMode(options);
    }

    return Object.freeze({
      repository,
      ensureDevice,
      getState,
      queueSettingChange,
      flush,
      pull,
      syncNow,
      enableCloudMode,
      disableCloudMode
    });
  }

  return Object.freeze({
    createUuid,
    normalizeVersions,
    createRuntime
  });
});
