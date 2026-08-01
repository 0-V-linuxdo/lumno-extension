(function(root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('../shared/cloud-sync-schema.js')
    : root.LumnoCloudSyncSchema;
  const repositoryApi = typeof module === 'object' && module.exports
    ? require('../shared/settings-repository.js')
    : root.LumnoSettingsRepository;
  const api = factory(schema, repositoryApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoUsageAnalyticsRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(schema, repositoryApi) {
  'use strict';

  const MAX_RETAINED_DAYS = 8;

  function createUuid(cryptoApi) {
    const api = cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    if (api && typeof api.randomUUID === 'function') return api.randomUUID();
    const part = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    return `${part()}${part()}-${part()}-4${part().slice(1)}-8${part().slice(1)}-${part()}${part()}${part()}`;
  }

  function getUtcDay(timestamp) {
    return new Date(Number(timestamp) || Date.now()).toISOString().slice(0, 10);
  }

  function normalizeUsageState(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const days = source.days && typeof source.days === 'object' && !Array.isArray(source.days)
      ? source.days
      : {};
    const normalizedDays = {};
    Object.entries(days).forEach(([day, entry]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !entry || typeof entry !== 'object') return;
      const batchId = String(entry.batch_id || '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(batchId)) return;
      const metrics = {};
      Object.entries(entry.metrics || {}).forEach(([metric, count]) => {
        const value = Number(count);
        if (schema.USAGE_METRICS.includes(metric) && Number.isSafeInteger(value) && value > 0) {
          metrics[metric] = Math.min(100000, value);
        }
      });
      if (Object.keys(metrics).length > 0) {
        normalizedDays[day] = { batch_id: batchId, metrics };
      }
    });
    return { days: normalizedDays };
  }

  function createRuntime(options) {
    const config = options && typeof options === 'object' ? options : {};
    const localArea = config.localArea || null;
    const repository = config.repository || null;
    const transport = config.transport || null;
    const now = typeof config.now === 'function' ? config.now : () => Date.now();
    const uuid = typeof config.uuid === 'function' ? config.uuid : () => createUuid(config.cryptoApi);
    const dimensions = config.dimensions && typeof config.dimensions === 'object'
      ? { ...config.dimensions }
      : {};
    let serial = Promise.resolve();

    function runExclusive(task) {
      const result = serial.then(task, task);
      serial = result.catch(() => {});
      return result;
    }

    async function readLocal(keys) {
      return repositoryApi.getAreaValues(localArea, keys);
    }

    async function writeLocal(values) {
      return repositoryApi.mutateArea(localArea, 'set', values);
    }

    async function isConsented() {
      const local = await readLocal([schema.CLOUD_LOCAL_KEYS.consent]);
      const consent = local[schema.CLOUD_LOCAL_KEYS.consent];
      return Boolean(consent && consent.analytics === true);
    }

    async function clear() {
      return runExclusive(() => repositoryApi.mutateArea(
        localArea,
        'remove',
        [schema.CLOUD_LOCAL_KEYS.usage]
      ));
    }

    async function record(metricValue, countValue) {
      return runExclusive(async () => {
        const metric = String(metricValue || '').trim();
        if (!schema.USAGE_METRICS.includes(metric) || !(await isConsented())) {
          return { recorded: false };
        }
        const count = Math.min(1000, Math.max(1, Math.round(Number(countValue) || 1)));
        const local = await readLocal([schema.CLOUD_LOCAL_KEYS.usage]);
        const usage = normalizeUsageState(local[schema.CLOUD_LOCAL_KEYS.usage]);
        const day = getUtcDay(now());
        const entry = usage.days[day] || { batch_id: uuid(), metrics: {} };
        entry.metrics[metric] = Math.min(100000, (Number(entry.metrics[metric]) || 0) + count);
        usage.days[day] = entry;
        const retainedDays = Object.keys(usage.days).sort().slice(-MAX_RETAINED_DAYS);
        usage.days = Object.fromEntries(retainedDays.map((key) => [key, usage.days[key]]));
        await writeLocal({ [schema.CLOUD_LOCAL_KEYS.usage]: usage });
        return { recorded: true, day, count: entry.metrics[metric] };
      });
    }

    async function flush() {
      return runExclusive(async () => {
        if (!(await isConsented()) || !transport || typeof transport.ingestUsage !== 'function') {
          return { skipped: true, reason: 'analytics-disabled' };
        }
        const local = await readLocal([schema.CLOUD_LOCAL_KEYS.usage]);
        const usage = normalizeUsageState(local[schema.CLOUD_LOCAL_KEYS.usage]);
        const days = Object.keys(usage.days).sort();
        if (days.length === 0) return { ok: true, uploaded: 0 };
        const settingsSnapshot = repository
          ? await repository.get(schema.SYNC_KEYS)
          : {};
        let uploaded = 0;
        for (const day of days) {
          const entry = usage.days[day];
          const batch = schema.sanitizeUsageBatch({
            batch_id: entry.batch_id,
            day,
            metrics: entry.metrics,
            dimensions,
            settings_snapshot: settingsSnapshot
          });
          if (!batch) {
            delete usage.days[day];
            continue;
          }
          await transport.ingestUsage(batch);
          delete usage.days[day];
          uploaded += 1;
        }
        await writeLocal({ [schema.CLOUD_LOCAL_KEYS.usage]: usage });
        return { ok: true, uploaded };
      });
    }

    return Object.freeze({
      isConsented,
      record,
      flush,
      clear
    });
  }

  return Object.freeze({
    MAX_RETAINED_DAYS,
    getUtcDay,
    normalizeUsageState,
    createRuntime
  });
});
