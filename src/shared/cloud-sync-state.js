(function(root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('./cloud-sync-schema.js')
    : root.LumnoCloudSyncSchema;
  const api = factory(schema);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoCloudSyncState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(schema) {
  'use strict';

  const MAX_OUTBOX_OPERATIONS = 500;
  const MAX_PUSH_BATCH_SIZE = 100;

  function cloneJson(value) {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function normalizeNonNegativeInteger(value, fallback) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
  }

  function normalizeUuid(value) {
    const normalized = String(value || '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
      ? normalized
      : '';
  }

  function createOperation(input) {
    const source = input && typeof input === 'object' ? input : {};
    const key = String(source.key || '').trim();
    const operationId = normalizeUuid(source.operation_id || source.operationId);
    if (!schema || !schema.isSyncKey(key) || !operationId) {
      return null;
    }
    const deleted = source.deleted === true;
    if (!deleted && !Object.prototype.hasOwnProperty.call(source, 'value')) {
      return null;
    }
    return Object.freeze({
      operation_id: operationId,
      key,
      value: deleted ? null : cloneJson(source.value),
      deleted,
      base_version: normalizeNonNegativeInteger(source.base_version ?? source.baseVersion, 0),
      enqueued_at: normalizeNonNegativeInteger(source.enqueued_at ?? source.enqueuedAt, Date.now())
    });
  }

  function normalizeOutbox(value) {
    const items = Array.isArray(value) ? value : [];
    const byKey = new Map();
    items.forEach((item) => {
      const operation = createOperation(item);
      if (!operation) {
        return;
      }
      const current = byKey.get(operation.key);
      if (!current || current.enqueued_at <= operation.enqueued_at) {
        byKey.set(operation.key, operation);
      }
    });
    return Array.from(byKey.values())
      .sort((left, right) => left.enqueued_at - right.enqueued_at)
      .slice(-MAX_OUTBOX_OPERATIONS);
  }

  function enqueueOperation(outbox, input) {
    const operation = createOperation(input);
    if (!operation) {
      return normalizeOutbox(outbox);
    }
    const current = normalizeOutbox(outbox);
    const existing = current.find((item) => item.key === operation.key);
    const nextOperation = existing
      ? createOperation({
          ...operation,
          base_version: existing.base_version
        })
      : operation;
    return normalizeOutbox([
      ...current.filter((item) => item.key !== operation.key),
      nextOperation
    ]);
  }

  function acknowledgeOperations(outbox, operationIds) {
    const acknowledged = new Set((Array.isArray(operationIds) ? operationIds : [])
      .map(normalizeUuid)
      .filter(Boolean));
    return normalizeOutbox(outbox).filter((operation) => !acknowledged.has(operation.operation_id));
  }

  function buildPushBatch(outbox, maxItems) {
    const limit = Math.min(
      MAX_PUSH_BATCH_SIZE,
      Math.max(1, normalizeNonNegativeInteger(maxItems, MAX_PUSH_BATCH_SIZE))
    );
    return normalizeOutbox(outbox).slice(0, limit).map(cloneJson);
  }

  function normalizeRemoteRow(value) {
    const source = value && typeof value === 'object' ? value : {};
    const key = String(source.key || '').trim();
    if (!schema || !schema.isSyncKey(key)) {
      return null;
    }
    return {
      key,
      value: source.deleted_at || source.deleted === true ? null : cloneJson(source.value),
      deleted: Boolean(source.deleted_at || source.deleted === true),
      version: normalizeNonNegativeInteger(source.version, 0),
      change_id: normalizeNonNegativeInteger(source.change_id ?? source.changeId, 0),
      updated_by_device: String(source.updated_by_device || '')
    };
  }

  function applyRemoteRows(localSnapshot, remoteRows, outbox) {
    const local = localSnapshot && typeof localSnapshot === 'object'
      ? cloneJson(localSnapshot)
      : {};
    const pendingKeys = new Set(normalizeOutbox(outbox).map((operation) => operation.key));
    const updates = {};
    const removals = [];
    const conflicts = [];
    const versions = {};
    let cursor = 0;

    (Array.isArray(remoteRows) ? remoteRows : [])
      .map(normalizeRemoteRow)
      .filter(Boolean)
      .sort((left, right) => left.change_id - right.change_id)
      .forEach((row) => {
        cursor = Math.max(cursor, row.change_id);
        versions[row.key] = row.version;
        if (pendingKeys.has(row.key)) {
          conflicts.push({
            key: row.key,
            local_value: Object.prototype.hasOwnProperty.call(local, row.key) ? cloneJson(local[row.key]) : null,
            remote_value: cloneJson(row.value),
            remote_deleted: row.deleted,
            remote_version: row.version,
            change_id: row.change_id
          });
          return;
        }
        if (row.deleted) {
          delete local[row.key];
          removals.push(row.key);
          return;
        }
        local[row.key] = cloneJson(row.value);
        updates[row.key] = cloneJson(row.value);
      });

    return {
      snapshot: local,
      updates,
      removals,
      conflicts,
      versions,
      cursor
    };
  }

  function resolveInitialSnapshot(localSnapshot, remoteSnapshot, strategy) {
    const local = schema.copySyncSettings(localSnapshot);
    const remote = schema.copySyncSettings(remoteSnapshot);
    if (strategy === 'cloud') {
      return remote;
    }
    if (strategy === 'device') {
      return local;
    }
    if (strategy === 'merge-cloud-first') {
      return { ...local, ...remote };
    }
    if (strategy === 'merge-device-first') {
      return { ...remote, ...local };
    }
    return null;
  }

  return Object.freeze({
    MAX_OUTBOX_OPERATIONS,
    MAX_PUSH_BATCH_SIZE,
    createOperation,
    normalizeOutbox,
    enqueueOperation,
    acknowledgeOperations,
    buildPushBatch,
    applyRemoteRows,
    resolveInitialSnapshot
  });
});
