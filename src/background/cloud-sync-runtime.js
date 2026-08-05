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

  const RETRY_BASE_MS = 30000;
  const RETRY_MAX_MS = 15 * 60 * 1000;

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

  function mergeConflicts(existing, incoming) {
    const byKey = new Map();
    [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]
      .forEach((item) => {
        if (!item || !schema.isSyncKey(item.key)) return;
        if (state.areConflictValuesEquivalent(item)) {
          byKey.delete(item.key);
          return;
        }
        byKey.set(item.key, item);
      });
    return Array.from(byKey.values());
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
    let stateMutationQueue = Promise.resolve();

    function mutateState(run) {
      const task = stateMutationQueue.then(run, run);
      stateMutationQueue = task.catch(() => {});
      return task;
    }

    async function readLocal(keys) {
      return repositoryApi.getAreaValues(localArea, keys);
    }

    async function writeLocal(values) {
      return repositoryApi.mutateArea(localArea, 'set', values);
    }

    function ensureDevice() {
      return mutateState(async () => {
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
      });
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

    function queueSettingChange(key, value, options) {
      const changeOptions = options && typeof options === 'object' ? options : {};
      if (!schema.isSyncKey(key)) {
        return Promise.resolve(false);
      }
      return mutateState(async () => {
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
      });
    }

    // Conflicts are resolved without interrupting the user. The shared cloud
    // value wins by default; a newer local edit that is already based on the
    // remote version remains queued and is uploaded normally.
    async function autoResolveStoredConflicts() {
      if (await repository.getMode() !== repositoryApi.MODE_CLOUD) {
        return { resolved: 0, discarded: 0, keptLocal: 0 };
      }
      return mutateState(async () => {
        const current = await getState();
        const storedConflicts = Array.isArray(current.conflicts) ? current.conflicts : [];
        if (storedConflicts.length === 0) {
          if (current.status && current.status.state === 'conflict') {
            await writeLocal({
              [schema.CLOUD_LOCAL_KEYS.status]: {
                ...current.status,
                state: 'ready'
              }
            });
          }
          return { resolved: 0, discarded: 0, keptLocal: 0 };
        }
        const operationsByKey = new Map(current.outbox.map((operation) => [operation.key, operation]));
        const discardedKeys = new Set();
        const localUpdates = {};
        const localRemovals = new Set();
        const remoteUpdates = {};
        const remoteRemovals = new Set();
        let keptLocal = 0;

        storedConflicts.forEach((item) => {
          const key = String(item && item.key || '');
          if (!schema.isSyncKey(key)) return;
          const operation = operationsByKey.get(key);
          const remoteVersion = Math.max(0, Number(item && item.remote_version) || 0);
          const baseVersion = operation ? Math.max(0, Number(operation.base_version) || 0) : -1;
          if (operation && baseVersion >= remoteVersion) {
            keptLocal += 1;
            if (operation.deleted === true) {
              localRemovals.add(key);
            } else {
              localUpdates[key] = operation.value;
            }
            return;
          }
          discardedKeys.add(key);
          if (item && item.remote_deleted === true) {
            remoteRemovals.add(key);
          } else if (item && Object.prototype.hasOwnProperty.call(item, 'remote_value')) {
            remoteUpdates[key] = item.remote_value;
          }
        });

        if (Object.keys(localUpdates).length > 0) await repository.set(localUpdates);
        if (localRemovals.size > 0) await repository.remove([...localRemovals]);
        if (Object.keys(remoteUpdates).length > 0) await repository.set(remoteUpdates);
        if (remoteRemovals.size > 0) await repository.remove([...remoteRemovals]);

        await writeLocal({
          [schema.CLOUD_LOCAL_KEYS.outbox]: state.normalizeOutbox(
            current.outbox.filter((operation) => !discardedKeys.has(operation.key))
          ),
          [schema.CLOUD_LOCAL_KEYS.conflicts]: [],
          [schema.CLOUD_LOCAL_KEYS.status]: {
            ...current.status,
            state: 'ready'
          }
        });
        return {
          resolved: storedConflicts.length,
          discarded: discardedKeys.size,
          keptLocal
        };
      });
    }

    async function flush() {
      if (await repository.getMode() !== repositoryApi.MODE_CLOUD ||
          !transport || typeof transport.pushSettings !== 'function') {
        return { skipped: true, reason: 'cloud-disabled' };
      }
      const storedResolution = await autoResolveStoredConflicts();
      const current = await getState();
      const changes = state.buildPushBatch(current.outbox);
      if (changes.length === 0) {
        return { ok: true, pushed: 0, autoResolved: storedResolution.resolved, conflicts: [] };
      }
      const device = await ensureDevice();
      const response = await transport.pushSettings({
        device_id: device.id,
        changes
      });
      const accepted = Array.isArray(response && response.accepted) ? response.accepted : [];
      const conflicts = Array.isArray(response && response.conflicts) ? response.conflicts : [];
      const rejected = Array.isArray(response && response.rejected) ? response.rejected : [];
      const deferred = Array.isArray(response && response.deferred) ? response.deferred : [];
      const acceptedIds = accepted.map((item) => item && item.operation_id).filter(Boolean);
      const conflictIds = conflicts.map((item) => item && item.operation_id).filter(Boolean);
      const deferredIds = new Set([
        ...deferred,
        ...rejected.filter((item) => item && (
          item.code === 'unsupported_key' || item.code === 'protocol_unsupported'
        ))
      ].map((item) => String(item && item.operation_id || '')).filter(Boolean));
      const terminalRejectedIds = rejected
        .map((item) => String(item && item.operation_id || ''))
        .filter((operationId) => operationId && !deferredIds.has(operationId));
      const supportedKeys = new Set(Array.isArray(response && response.supported_keys)
        ? response.supported_keys.filter((key) => schema.isSyncKey(key))
        : schema.SYNC_KEYS);
      const outboxById = new Map(current.outbox.map((item) => [item.operation_id, item]));
      const acceptedByKey = new Map(accepted
        .filter((item) => item && schema.isSyncKey(item.key))
        .map((item) => [item.key, item]));
      const conflictByKey = new Map(conflicts
        .filter((item) => item && schema.isSyncKey(item.key))
        .map((item) => [item.key, item]));
      const committed = await mutateState(async () => {
        const latest = await getState();
        const latestByKey = new Map(latest.outbox.map((item) => [item.key, item]));
        const nextVersions = { ...latest.versions };
        let cursor = latest.cursor;
        const extraAcknowledgedIds = [];
        const normalizedConflicts = [];
        const autoResolvedKeys = new Set();
        const remoteUpdates = {};
        const remoteRemovals = [];

        accepted.forEach((item) => {
          if (!item || !schema.isSyncKey(item.key)) return;
          nextVersions[item.key] = Number(item.version) || nextVersions[item.key] || 0;
          cursor = Math.max(cursor, Number(item.change_id) || 0);
        });
        conflicts.forEach((item) => {
          if (!item || !schema.isSyncKey(item.key)) return;
          const sentOperation = outboxById.get(item.operation_id);
          const latestOperation = latestByKey.get(item.key);
          const operation = latestOperation || sentOperation;
          const remoteDeleted = Boolean(item.deleted_at || item.deleted === true);
          const remoteVersion = Math.max(0, Number(item.version) || 0);
          const changeId = Math.max(0, Number(item.change_id) || 0);
          if (latestOperation && latestOperation.operation_id !== item.operation_id) {
            extraAcknowledgedIds.push(latestOperation.operation_id);
          }
          autoResolvedKeys.add(item.key);
          nextVersions[item.key] = remoteVersion;
          cursor = Math.max(cursor, changeId);
          if (remoteDeleted) remoteRemovals.push(item.key);
          else remoteUpdates[item.key] = item.value;
        });

        if (Object.keys(remoteUpdates).length > 0) await repository.set(remoteUpdates);
        if (remoteRemovals.length > 0) await repository.remove(remoteRemovals);

        const acknowledgedOutbox = state.acknowledgeOperations(
          latest.outbox,
          [...acceptedIds, ...conflictIds, ...extraAcknowledgedIds, ...terminalRejectedIds]
        );
        const rebasedOutbox = acknowledgedOutbox.map((operation) => {
          const acceptedItem = acceptedByKey.get(operation.key);
          const sentOperation = acceptedItem && outboxById.get(acceptedItem.operation_id);
          if (!acceptedItem || !sentOperation || operation.operation_id === sentOperation.operation_id ||
              conflictByKey.has(operation.key)) {
            return operation;
          }
          return state.createOperation({
            ...operation,
            base_version: Math.max(0, Number(acceptedItem.version) || 0)
          });
        }).filter(Boolean).filter((operation) => !autoResolvedKeys.has(operation.key));
        const nextConflicts = mergeConflicts(
          latest.conflicts.filter((item) => !autoResolvedKeys.has(item && item.key)),
          normalizedConflicts
        );
        const deferredCount = rebasedOutbox
          .filter((operation) => !supportedKeys.has(operation.key) || deferredIds.has(operation.operation_id))
          .length;
        const rejectionCode = rejected
          .filter((item) => item && !deferredIds.has(String(item.operation_id || '')))
          .map((item) => String(item.code || 'sync_change_rejected'))[0] || '';
        await writeLocal({
          [schema.CLOUD_LOCAL_KEYS.outbox]: state.normalizeOutbox(rebasedOutbox),
          [schema.CLOUD_LOCAL_KEYS.versions]: nextVersions,
          [schema.CLOUD_LOCAL_KEYS.pullCursor]: cursor,
          [schema.CLOUD_LOCAL_KEYS.conflicts]: nextConflicts,
          [schema.CLOUD_LOCAL_KEYS.status]: {
            ...latest.status,
            state: nextConflicts.length > 0 ? 'conflict' : 'ready',
            last_push_at: now(),
            last_error: rejectionCode,
            last_rejection_code: rejectionCode,
            deferred_count: deferredCount,
            rejected_count: rejected.length,
            sync_protocol: Math.max(1, Number(response && response.protocol) || 1),
            sync_schema_hash: String(response && response.schema_hash || '')
          }
        });
        return { nextConflicts, deferredCount, autoResolved: autoResolvedKeys.size };
      });
      return {
        ok: true,
        pushed: accepted.length,
        deferred: committed.deferredCount,
        rejected,
        autoResolved: storedResolution.resolved + committed.autoResolved,
        conflicts: committed.nextConflicts
      };
    }

    async function pull(optionsArg) {
      if (await repository.getMode() !== repositoryApi.MODE_CLOUD ||
          !transport || typeof transport.pullSettings !== 'function') {
        return { skipped: true, reason: 'cloud-disabled' };
      }
      const pullOptions = optionsArg && typeof optionsArg === 'object' ? optionsArg : {};
      const full = pullOptions.full === true;
      const resetMissing = full && pullOptions.resetMissing !== false;
      const requestState = await getState();
      const device = await ensureDevice();
      const response = await transport.pullSettings({
        device_id: device.id,
        cursor: full ? 0 : requestState.cursor
      });
      const rows = Array.isArray(response && response.rows) ? response.rows : [];
      const supportedKeys = Array.isArray(response && response.supported_keys)
        ? response.supported_keys.filter((key) => schema.isSyncKey(key))
        : schema.SYNC_KEYS;
      const storedResolution = await autoResolveStoredConflicts();
      const remoteKeys = new Set(rows
        .map((row) => String(row && row.key || ''))
        .filter((key) => schema.isSyncKey(key)));
      return mutateState(async () => {
        const latest = await getState();
        const localSnapshot = await repository.get(schema.SYNC_KEYS);
        const applied = state.applyRemoteRows(localSnapshot, rows, latest.outbox);
        const autoResolvedKeys = new Set(applied.conflicts.map((item) => item && item.key).filter(Boolean));
        const autoResolvedUpdates = {};
        const autoResolvedRemovals = new Set();
        applied.conflicts.forEach((item) => {
          if (!item || !schema.isSyncKey(item.key)) return;
          if (item.remote_deleted === true) autoResolvedRemovals.add(item.key);
          else autoResolvedUpdates[item.key] = item.remote_value;
        });
        const pendingKeys = new Set(latest.outbox
          .map((operation) => String(operation && operation.key || '')));
        const missingRemovals = resetMissing
          ? supportedKeys.filter((key) => (
              Object.prototype.hasOwnProperty.call(localSnapshot, key) &&
              !remoteKeys.has(key) &&
              !pendingKeys.has(key)
            ))
          : [];
        if (Object.keys(applied.updates).length > 0) {
          await repository.set(applied.updates);
        }
        if (Object.keys(autoResolvedUpdates).length > 0) {
          await repository.set(autoResolvedUpdates);
        }
        const removals = [...new Set([...applied.removals, ...missingRemovals])];
        if (removals.length > 0) {
          await repository.remove(removals);
        }
        if (autoResolvedRemovals.size > 0) {
          await repository.remove([...autoResolvedRemovals]);
        }
        const conflicts = mergeConflicts(
          latest.conflicts.filter((item) => !autoResolvedKeys.has(item && item.key)),
          []
        );
        await writeLocal({
          [schema.CLOUD_LOCAL_KEYS.outbox]: state.normalizeOutbox(
            latest.outbox.filter((operation) => !autoResolvedKeys.has(operation.key))
          ),
          [schema.CLOUD_LOCAL_KEYS.pullCursor]: Math.max(latest.cursor, applied.cursor),
          [schema.CLOUD_LOCAL_KEYS.versions]: resetMissing
            ? applied.versions
            : { ...latest.versions, ...applied.versions },
          [schema.CLOUD_LOCAL_KEYS.conflicts]: conflicts,
          [schema.CLOUD_LOCAL_KEYS.status]: {
            ...latest.status,
            state: conflicts.length > 0 ? 'conflict' : 'ready',
            last_pull_at: now(),
            last_error: '',
            sync_protocol: Math.max(1, Number(response && response.protocol) || 1),
            sync_schema_hash: String(response && response.schema_hash || '')
          }
        });
        return {
          ok: true,
          full,
          resetMissing,
          pulled: rows.length,
          applied: Object.keys(applied.updates).length + removals.length,
          keys: [...remoteKeys],
          autoResolved: storedResolution.resolved + autoResolvedKeys.size,
          conflicts
        };
      });
    }

    function syncNow(optionsArg) {
      if (activeSync) {
        return activeSync;
      }
      const syncOptions = optionsArg && typeof optionsArg === 'object' ? optionsArg : {};
      activeSync = (async () => {
        try {
          const before = await getState();
          const nextRetryAt = Number(before.status.next_retry_at) || 0;
          if (syncOptions.force !== true && nextRetryAt > now()) {
            return { skipped: true, reason: 'backoff', retry_at: nextRetryAt };
          }
          const pushed = await flush();
          const pulled = await pull({
            full: syncOptions.fullPull === true,
            resetMissing: syncOptions.fullPull === true
          });
          await mutateState(async () => {
            const completed = await getState();
            await writeLocal({
              [schema.CLOUD_LOCAL_KEYS.status]: {
                ...completed.status,
                failure_count: 0,
                next_retry_at: 0,
                last_error: ''
              }
            });
          });
          return { ok: true, pushed, pulled };
        } catch (error) {
          await mutateState(async () => {
            const failed = await getState();
            const failureCount = Math.min(10, (Number(failed.status.failure_count) || 0) + 1);
            const retryDelay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** (failureCount - 1)));
            await writeLocal({
              [schema.CLOUD_LOCAL_KEYS.status]: {
                ...failed.status,
                state: 'error',
                last_error_at: now(),
                failure_count: failureCount,
                next_retry_at: now() + retryDelay,
                last_error: String(error && error.message ? error.message : error || 'Unknown sync error').slice(0, 240)
              }
            });
          });
          throw error;
        } finally {
          activeSync = null;
        }
      })();
      return activeSync;
    }

    async function waitForIdle() {
      const syncTask = activeSync;
      if (syncTask) await syncTask.catch(() => {});
      await stateMutationQueue;
    }

    async function enableCloudMode(options) {
      const migration = await repository.enterCloudMode(options);
      const device = await ensureDevice();
      return { ...migration, device };
    }

    async function disableCloudMode(options) {
      return repository.leaveCloudMode(options);
    }

    function restoreState(input) {
      const source = input && typeof input === 'object' ? input : {};
      return mutateState(async () => {
        const versions = {};
        Object.entries(source.versions && typeof source.versions === 'object'
          ? source.versions
          : {}).forEach(([key, value]) => {
          const version = Number(value);
          if (schema.isSyncKey(key) && Number.isSafeInteger(version) && version >= 0) {
            versions[key] = version;
          }
        });
        const conflicts = (Array.isArray(source.conflicts) ? source.conflicts : [])
          .filter((item) => item && schema.isSyncKey(String(item.key || '')))
          .map((item) => ({ ...item }));
        const cursor = Number(source.cursor);
        const values = {
          [schema.CLOUD_LOCAL_KEYS.outbox]: state.normalizeOutbox(source.outbox),
          [schema.CLOUD_LOCAL_KEYS.versions]: versions,
          [schema.CLOUD_LOCAL_KEYS.pullCursor]: Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : 0,
          [schema.CLOUD_LOCAL_KEYS.conflicts]: conflicts,
          [schema.CLOUD_LOCAL_KEYS.status]: {
            state: conflicts.length > 0 ? 'conflict' : 'idle',
            failure_count: 0,
            next_retry_at: 0,
            last_error: ''
          }
        };
        const device = source.device && typeof source.device === 'object' ? source.device : null;
        if (device && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          .test(String(device.id || ''))) {
          values[schema.CLOUD_LOCAL_KEYS.device] = { ...device };
        }
        await writeLocal(values);
        return getState();
      });
    }


    return Object.freeze({
      repository,
      ensureDevice,
      getState,
      queueSettingChange,
      flush,
      pull,
      syncNow,
      waitForIdle,
      enableCloudMode,
      disableCloudMode,
      restoreState,
      autoResolveConflicts: autoResolveStoredConflicts
    });
  }

  return Object.freeze({
    createUuid,
    normalizeVersions,
    mergeConflicts,
    RETRY_BASE_MS,
    RETRY_MAX_MS,
    createRuntime
  });
});
