(function(root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('../shared/cloud-sync-schema.js')
    : root.LumnoCloudSyncSchema;
  const repositoryApi = typeof module === 'object' && module.exports
    ? require('../shared/settings-repository.js')
    : root.LumnoSettingsRepository;
  const runtimeApi = typeof module === 'object' && module.exports
    ? require('./cloud-sync-runtime.js')
    : root.LumnoCloudSyncRuntime;
  const transportApi = typeof module === 'object' && module.exports
    ? require('./supabase-transport.js')
    : root.LumnoSupabaseTransport;
  const usageApi = typeof module === 'object' && module.exports
    ? require('./usage-analytics-runtime.js')
    : root.LumnoUsageAnalyticsRuntime;
  const wallpaperApi = typeof module === 'object' && module.exports
    ? require('./cloud-wallpaper-runtime.js')
    : root.LumnoCloudWallpaperRuntime;
  const webAuthApi = typeof module === 'object' && module.exports
    ? require('./web-auth-flow.js')
    : root.LumnoWebAuthFlow;
  const api = factory(schema, repositoryApi, runtimeApi, transportApi, usageApi, wallpaperApi, webAuthApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoCloudAccountController = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(schema, repositoryApi, runtimeApi, transportApi, usageApi, wallpaperApi, webAuthApi) {
  'use strict';

  const SYNC_ALARM_NAME = 'lumno-cloud-sync-v1';
  const PERIODIC_SYNC_ALARM_NAME = 'lumno-cloud-sync-periodic-v1';
  const SYNC_DEBOUNCE_MS = 1000;
  const PERIODIC_SYNC_MINUTES = 15;
  const PRIVATE_LOCAL_KEYS = Object.freeze(Object.values(schema.CLOUD_LOCAL_KEYS));

  function safeJson(value) {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return '';
    }
  }

  function detectClientInfo(chromeApi, navigatorLike) {
    const userAgent = String((navigatorLike && navigatorLike.userAgent) || '').toLowerCase();
    const platformValue = String(
      (navigatorLike && navigatorLike.userAgentData && navigatorLike.userAgentData.platform) ||
      (navigatorLike && navigatorLike.platform) || ''
    ).toLowerCase();
    let browserFamily = 'other';
    if (userAgent.includes('edg/')) browserFamily = 'edge';
    else if (userAgent.includes('brave')) browserFamily = 'brave';
    else if (userAgent.includes('vivaldi')) browserFamily = 'vivaldi';
    else if (userAgent.includes('opr/')) browserFamily = 'opera';
    else if (userAgent.includes('chrome/')) browserFamily = 'chrome';
    let platformFamily = 'other';
    if (platformValue.includes('win')) platformFamily = 'windows';
    else if (platformValue.includes('mac')) platformFamily = 'macos';
    else if (platformValue.includes('cros')) platformFamily = 'chromeos';
    else if (platformValue.includes('linux')) platformFamily = 'linux';
    const manifest = chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getManifest === 'function'
      ? chromeApi.runtime.getManifest()
      : {};
    return {
      display_name: `Lumno on ${platformFamily}`,
      browser_family: browserFamily,
      platform_family: platformFamily,
      extension_version: String((manifest && manifest.version) || 'unknown')
    };
  }

  function isTrustedExtensionSender(sender, chromeApi) {
    const extensionId = chromeApi && chromeApi.runtime ? String(chromeApi.runtime.id || '') : '';
    if (!extensionId || !sender || String(sender.id || '') !== extensionId) return false;
    const senderUrl = String(sender.url || sender.origin || '');
    try {
      const parsed = new URL(senderUrl);
      return parsed.protocol === 'chrome-extension:' && parsed.hostname === extensionId;
    } catch (_error) {
      return false;
    }
  }

  function createTrackedArea(area, setTimer) {
    const expected = new Map();
    const schedule = typeof setTimer === 'function' ? setTimer : setTimeout;
    let mutationId = 0;

    function mark(payload, deleted) {
      const source = payload && typeof payload === 'object' ? payload : {};
      Object.entries(source).forEach(([key, value]) => {
        mutationId += 1;
        const entry = {
          id: mutationId,
          value: deleted ? '__deleted__' : safeJson(value)
        };
        expected.set(key, entry);
        schedule(() => {
          if (expected.get(key) === entry) {
            expected.delete(key);
          }
        }, 10000);
      });
    }

    function consume(changes) {
      const external = {};
      Object.entries(changes || {}).forEach(([key, change]) => {
        if (!expected.has(key)) {
          external[key] = change;
          return;
        }
        const expectedValue = expected.get(key).value;
        const actualValue = change && Object.prototype.hasOwnProperty.call(change, 'newValue')
          ? safeJson(change.newValue)
          : '__deleted__';
        if (expectedValue === actualValue) {
          expected.delete(key);
        } else {
          expected.delete(key);
          external[key] = change;
        }
      });
      return external;
    }

    return {
      get(keys, callback) {
        return area && area.get ? area.get(keys, callback) : undefined;
      },
      set(payload, callback) {
        mark(payload, false);
        return area && area.set ? area.set(payload, callback) : undefined;
      },
      remove(keys, callback) {
        const list = Array.isArray(keys) ? keys : [keys];
        mark(Object.fromEntries(list.map((key) => [key, null])), true);
        return area && area.remove ? area.remove(keys, callback) : undefined;
      },
      consume
    };
  }

  function createController(options) {
    const config = options && typeof options === 'object' ? options : {};
    const chromeApi = config.chromeApi || (typeof chrome !== 'undefined' ? chrome : null);
    const storage = chromeApi && chromeApi.storage ? chromeApi.storage : {};
    const localArea = config.localArea || storage.local || null;
    const syncArea = config.syncArea || storage.sync || localArea;
    const setTimer = config.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = config.clearTimeout || (typeof clearTimeout === 'function' ? clearTimeout : null);
    const trackedCloudArea = config.trackedCloudArea || createTrackedArea(localArea, setTimer);
    const trackedLocalSettingArea = config.trackedLocalSettingArea || trackedCloudArea;
    const localOnlyKeys = [schema.STORAGE_KEYS.newtabLocalWallpaper];
    const repository = config.repository || repositoryApi.createRepository({
      localArea,
      syncArea,
      cloudArea: trackedCloudArea,
      localSettingArea: trackedLocalSettingArea,
      localOnlyKeys
    });
    const transport = config.transport || transportApi.createTransport({ chromeApi, localArea });
    const webAuth = config.webAuth || (webAuthApi && typeof webAuthApi.createFlow === 'function'
      ? webAuthApi.createFlow({ chromeApi, transport })
      : null);
    const runtime = config.runtime || runtimeApi.createRuntime({
      chromeApi,
      localArea,
      syncArea,
      repository,
      transport
    });
    const clientInfo = detectClientInfo(chromeApi, config.navigatorLike ||
      (typeof navigator !== 'undefined' ? navigator : null));
    const navigatorLike = config.navigatorLike || (typeof navigator !== 'undefined' ? navigator : null);
    const rawLocale = String((navigatorLike && navigatorLike.language) || '').replace('_', '-');
    const locale = ['zh-CN', 'zh-TW', 'ja', 'en'].includes(rawLocale)
      ? rawLocale
      : (rawLocale.startsWith('zh') ? 'zh-CN' : (rawLocale.startsWith('ja') ? 'ja' : (rawLocale.startsWith('en') ? 'en' : 'other')));
    const usage = config.usageRuntime || (usageApi && typeof usageApi.createRuntime === 'function'
      ? usageApi.createRuntime({
          localArea,
          repository,
          transport,
          dimensions: {
            extension_version: clientInfo.extension_version,
            locale,
            browser_family: clientInfo.browser_family,
            platform_family: clientInfo.platform_family
          }
        })
      : null);
    const wallpaper = config.wallpaperRuntime || (wallpaperApi && typeof wallpaperApi.createRuntime === 'function'
      ? wallpaperApi.createRuntime({
          transport,
          repository,
          indexedDBApi: config.indexedDBApi || (typeof indexedDB !== 'undefined' ? indexedDB : null)
        })
      : null);
    let debounceTimer = null;
    let started = false;

    async function readLocal(keys) {
      return repositoryApi.getAreaValues(localArea, keys);
    }

    async function writeLocal(values) {
      return repositoryApi.mutateArea(localArea, 'set', values);
    }

    async function removeLocal(keys) {
      return repositoryApi.mutateArea(localArea, 'remove', keys);
    }

    async function clearIdentityState() {
      await removeLocal(PRIVATE_LOCAL_KEYS);
      await writeLocal({ [schema.CLOUD_LOCAL_KEYS.mode]: repositoryApi.MODE_GUEST });
    }

    function getSessionUserId(session) {
      return String(session && session.user && session.user.id || '').trim();
    }

    async function getStoredAccountId() {
      const local = await readLocal([schema.CLOUD_LOCAL_KEYS.account]);
      return String(
        local[schema.CLOUD_LOCAL_KEYS.account] &&
        local[schema.CLOUD_LOCAL_KEYS.account].id || ''
      ).trim();
    }

    async function prepareAccountIdentity(session) {
      const nextAccountId = getSessionUserId(session);
      if (!nextAccountId) {
        const error = new Error('invalid_session_identity');
        error.code = 'invalid_session_identity';
        throw error;
      }
      const previousAccountId = await getStoredAccountId();
      if (previousAccountId !== nextAccountId) {
        await clearIdentityState();
      }
      return {
        nextAccountId,
        replacedAccount: Boolean(previousAccountId && previousAccountId !== nextAccountId)
      };
    }

    async function sessionMatchesStoredAccount(session) {
      const sessionAccountId = getSessionUserId(session);
      return Boolean(sessionAccountId && sessionAccountId === await getStoredAccountId());
    }

    async function registerCurrentDevice() {
      const device = await runtime.ensureDevice();
      await transport.registerDevice({ ...device, ...clientInfo });
      return device;
    }

    async function getStatus() {
      const [mode, session, local] = await Promise.all([
        repository.getMode(),
        transport.getSession({ refresh: false }),
        readLocal([
          schema.CLOUD_LOCAL_KEYS.status,
          schema.CLOUD_LOCAL_KEYS.consent,
          schema.CLOUD_LOCAL_KEYS.conflicts,
          schema.CLOUD_LOCAL_KEYS.outbox,
          schema.CLOUD_LOCAL_KEYS.account
        ])
      ]);
      const status = local[schema.CLOUD_LOCAL_KEYS.status] || {};
      const conflicts = Array.isArray(local[schema.CLOUD_LOCAL_KEYS.conflicts])
        ? local[schema.CLOUD_LOCAL_KEYS.conflicts]
        : [];
      const outbox = Array.isArray(local[schema.CLOUD_LOCAL_KEYS.outbox])
        ? local[schema.CLOUD_LOCAL_KEYS.outbox]
        : [];
      const storedAccountId = String(
        local[schema.CLOUD_LOCAL_KEYS.account] &&
        local[schema.CLOUD_LOCAL_KEYS.account].id || ''
      ).trim();
      const sessionAccountId = getSessionUserId(session);
      const signedIn = Boolean(sessionAccountId && sessionAccountId === storedAccountId);
      return {
        ok: true,
        configured: Boolean(transport.config && transport.config.configured),
        signedIn,
        email: signedIn && session.user ? session.user.email : '',
        mode,
        syncProvider: mode === repositoryApi.MODE_CLOUD ? 'lumno' : 'chrome',
        analyticsConsented: Boolean(
          local[schema.CLOUD_LOCAL_KEYS.consent] &&
          local[schema.CLOUD_LOCAL_KEYS.consent].analytics === true
        ),
        sync: {
          state: String(status.state || (mode === repositoryApi.MODE_CLOUD ? 'idle' : 'disabled')),
          lastError: String(status.last_error || ''),
          lastPushAt: Number(status.last_push_at) || 0,
          lastPullAt: Number(status.last_pull_at) || 0,
          nextRetryAt: Number(status.next_retry_at) || 0,
          failureCount: Number(status.failure_count) || 0,
          pendingCount: outbox.length,
          conflictCount: conflicts.length
        }
      };
    }

    async function syncNow(optionsArg) {
      const syncOptions = optionsArg && typeof optionsArg === 'object' ? optionsArg : {};
      if (await repository.getMode() !== repositoryApi.MODE_CLOUD) {
        return { skipped: true, reason: 'cloud-disabled' };
      }
      const session = await transport.getSession();
      if (!session) {
        return { skipped: true, reason: 'authentication-required' };
      }
      if (!(await sessionMatchesStoredAccount(session))) {
        return { skipped: true, reason: 'account-transition-required' };
      }
      await registerCurrentDevice();
      const result = await runtime.syncNow(syncOptions);
      let wallpaperResult = { skipped: true };
      if (wallpaper && typeof wallpaper.syncAll === 'function') {
        try {
          wallpaperResult = await wallpaper.syncAll();
          if (wallpaperResult && (wallpaperResult.downloaded > 0 || wallpaperResult.uploaded > 0)) {
            notifyWallpaperRefresh();
          }
        } catch (error) {
          wallpaperResult = {
            ok: false,
            error: String((error && error.message) || 'wallpaper_sync_failed').slice(0, 100)
          };
        }
      }
      if (usage && typeof usage.flush === 'function') {
        await usage.flush().catch(() => ({ ok: false }));
      }
      return { ...result, wallpaper: wallpaperResult };
    }

    function scheduleSync() {
      if (chromeApi && chromeApi.alarms && typeof chromeApi.alarms.create === 'function') {
        chromeApi.alarms.create(SYNC_ALARM_NAME, { delayInMinutes: 1 });
      }
      if (!setTimer) {
        return;
      }
      if (debounceTimer && clearTimer) {
        clearTimer(debounceTimer);
      }
      debounceTimer = setTimer(() => {
        debounceTimer = null;
        syncNow().catch(() => {});
      }, SYNC_DEBOUNCE_MS);
    }

    async function queueExternalChanges(changes, areaName) {
      const sourceAreaName = areaName || 'local';
      if (sourceAreaName !== 'local' || await repository.getMode() !== repositoryApi.MODE_CLOUD) {
        return 0;
      }
      let count = 0;
      for (const [key, change] of Object.entries(changes || {})) {
        if (!schema.isSyncKey(key)) {
          continue;
        }
        const deleted = !change || !Object.prototype.hasOwnProperty.call(change, 'newValue');
        await runtime.queueSettingChange(key, deleted ? null : change.newValue, { deleted });
        count += 1;
      }
      if (count > 0) {
        scheduleSync();
      }
      return count;
    }

    function handleStorageChanged(changes, areaName) {
      if (areaName !== 'sync' && areaName !== 'local') {
        return;
      }
      const trackedArea = trackedLocalSettingArea;
      const externalChanges = typeof trackedArea.consume === 'function'
        ? trackedArea.consume(changes)
        : changes;
      queueExternalChanges(externalChanges, areaName).catch(() => {});
    }

    function handleAlarm(alarm) {
      if (alarm && (alarm.name === SYNC_ALARM_NAME || alarm.name === PERIODIC_SYNC_ALARM_NAME)) {
        syncNow().catch(() => {});
      }
    }

    async function initializeSignedInAccount(session) {
      const identityTransition = await prepareAccountIdentity(session);
      if (typeof transport.setSyncConsent === 'function') {
        await transport.setSyncConsent('2026-08-02');
      }
      await writeLocal({
        [schema.CLOUD_LOCAL_KEYS.account]: {
          id: session.user.id,
          email: session.user.email || ''
        }
      });
      await runtime.enableCloudMode();
      await registerCurrentDevice();
      await runtime.pull();
      if (!identityTransition.replacedAccount) {
        const snapshot = await repository.get(schema.SYNC_KEYS);
        for (const [key, value] of Object.entries(schema.copySyncSettings(snapshot))) {
          await runtime.queueSettingChange(key, value);
        }
      }
      await syncNow({ force: true });
      return getStatus();
    }

    function notifyWallpaperRefresh() {
      if (!chromeApi || !chromeApi.runtime || typeof chromeApi.runtime.sendMessage !== 'function') return;
      try {
        chromeApi.runtime.sendMessage({ action: 'lumno:wallpapers-updated' }, () => {
          if (chromeApi.runtime.lastError) return;
        });
      } catch (_error) {
        // There may be no open extension page to receive the refresh.
      }
    }

    async function uploadWallpaper(record) {
      if (!wallpaper || typeof wallpaper.uploadRecord !== 'function') {
        return { skipped: true, reason: 'wallpaper_runtime_unavailable' };
      }
      try {
        const result = await wallpaper.uploadRecord(record);
        if (result && result.ok) {
          if (usage && typeof usage.record === 'function') await usage.record('wallpaper_upload_succeeded');
          notifyWallpaperRefresh();
        }
        return result;
      } catch (error) {
        if (usage && typeof usage.record === 'function') await usage.record('wallpaper_upload_failed');
        throw error;
      }
    }

    async function deleteWallpaper(clientAssetId) {
      if (!wallpaper || typeof wallpaper.deleteRecord !== 'function') {
        return { skipped: true, reason: 'wallpaper_runtime_unavailable' };
      }
      return wallpaper.deleteRecord(clientAssetId);
    }

    async function requestOtp(email) {
      return transport.requestOtp(email);
    }

    async function verifyOtp(email, token) {
      const session = await transport.verifyOtp(email, token);
      return initializeSignedInAccount(session);
    }

    async function signInWithWeb() {
      if (!webAuth || typeof webAuth.signIn !== 'function') {
        const error = new Error('web_auth_not_configured');
        error.code = 'web_auth_not_configured';
        throw error;
      }
      const session = await webAuth.signIn();
      return initializeSignedInAccount(session);
    }

    async function signOut() {
      await runtime.disableCloudMode({ copyToBrowserSync: true });
      let remoteWarning = '';
      try {
        await transport.signOut();
      } catch (error) {
        remoteWarning = String((error && error.code) || 'remote_signout_failed');
      }
      await clearIdentityState();
      return { ok: true, remoteWarning };
    }

    async function setSyncProvider(provider) {
      const target = String(provider || '').trim().toLowerCase();
      if (target !== 'chrome' && target !== 'lumno') {
        const error = new Error('invalid_sync_provider');
        error.code = 'invalid_sync_provider';
        throw error;
      }
      const currentMode = await repository.getMode();
      if (target === 'lumno') {
        const session = await transport.getSession();
        if (!session || !(await sessionMatchesStoredAccount(session))) {
          const error = new Error('authentication_required');
          error.code = 'authentication_required';
          throw error;
        }
        if (currentMode !== repositoryApi.MODE_CLOUD) {
          if (typeof transport.setSyncConsent === 'function') {
            await transport.setSyncConsent('2026-08-02');
          }
          await runtime.enableCloudMode();
          const snapshot = await repository.get(schema.SYNC_KEYS);
          for (const [key, value] of Object.entries(schema.copySyncSettings(snapshot))) {
            await runtime.queueSettingChange(key, value);
          }
        }
        await syncNow({ force: true });
        return getStatus();
      }
      if (currentMode === repositoryApi.MODE_CLOUD) {
        await syncNow({ force: true });
        const syncState = await runtime.getState();
        if (Array.isArray(syncState && syncState.conflicts) && syncState.conflicts.length > 0) {
          const error = new Error('sync_conflicts_must_be_resolved');
          error.code = 'sync_conflicts_must_be_resolved';
          error.conflictCount = syncState.conflicts.length;
          throw error;
        }
        await runtime.disableCloudMode({ copyToBrowserSync: true });
      }
      return getStatus();
    }

    async function resolveConflict(key, resolution) {
      const result = await runtime.resolveConflict(key, resolution);
      if (!result || result.ok === false) return result;
      if (String(resolution || '').toLowerCase() === 'device') await syncNow({ force: true });
      return { ...result, status: await getStatus() };
    }

    async function setAnalyticsConsent(consented) {
      const enabled = consented === true;
      const consentRecord = {
        analytics: enabled,
        privacy_notice_version: '2026-08-02',
        updated_at: Date.now()
      };
      if (enabled) {
        await transport.setAnalyticsConsent(true, '2026-08-02');
        await writeLocal({ [schema.CLOUD_LOCAL_KEYS.consent]: consentRecord });
        return { ok: true, analyticsConsented: true };
      }
      if (usage && typeof usage.withdrawConsent === 'function') {
        await usage.withdrawConsent(consentRecord);
      } else {
        await writeLocal({ [schema.CLOUD_LOCAL_KEYS.consent]: consentRecord });
        if (usage && typeof usage.clear === 'function') {
          await usage.clear();
        }
      }
      let remoteWarning = '';
      try {
        await transport.setAnalyticsConsent(false, '2026-08-02');
      } catch (error) {
        remoteWarning = String(
          error && (error.code || error.message) || 'remote_consent_withdrawal_failed'
        ).slice(0, 100);
      }
      return { ok: true, analyticsConsented: false, remoteWarning };
    }

    async function handleAction(request) {
      const action = String((request && request.action) || '');
      if (action === 'cloudGetStatus') return getStatus();
      if (action === 'cloudSignInWithWeb') return signInWithWeb();
      if (action === 'cloudSignOut') return signOut();
      if (action === 'cloudSyncNow') return syncNow({ force: true });
      if (action === 'cloudSetSyncProvider') return setSyncProvider(request.provider);
      if (action === 'cloudResolveConflict') return resolveConflict(request.key, request.resolution);
      if (action === 'cloudSetAnalyticsConsent') return setAnalyticsConsent(request.consented === true);
      if (action === 'cloudRecordUsage') {
        return usage && typeof usage.record === 'function'
          ? usage.record(request.metric, request.count)
          : { recorded: false };
      }
      if (action === 'cloudUploadWallpaper') return uploadWallpaper(request.record);
      if (action === 'cloudDeleteWallpaper') return deleteWallpaper(request.id);
      return { ok: false, error: 'unknown_cloud_action' };
    }

    function handleMessage(request, sender, sendResponse) {
      if (!isTrustedExtensionSender(sender, chromeApi)) {
        sendResponse({ ok: false, error: 'forbidden_sender' });
        return undefined;
      }
      handleAction(request).then(sendResponse).catch((error) => {
        sendResponse({
          ok: false,
          error: String((error && error.code) || (error && error.message) || 'cloud_action_failed').slice(0, 100)
        });
      });
      return true;
    }

    function start() {
      if (started) return;
      started = true;
      if (chromeApi && chromeApi.storage && chromeApi.storage.onChanged) {
        chromeApi.storage.onChanged.addListener(handleStorageChanged);
      }
      if (chromeApi && chromeApi.alarms && chromeApi.alarms.onAlarm) {
        chromeApi.alarms.onAlarm.addListener(handleAlarm);
        chromeApi.alarms.create(PERIODIC_SYNC_ALARM_NAME, { periodInMinutes: PERIODIC_SYNC_MINUTES });
      }
      syncNow().catch(() => {});
    }

    return Object.freeze({
      repository,
      runtime,
      transport,
      getStatus,
      syncNow,
      scheduleSync,
      queueExternalChanges,
      handleStorageChanged,
      handleAlarm,
      requestOtp,
      verifyOtp,
      signInWithWeb,
      signOut,
      setSyncProvider,
      resolveConflict,
      setAnalyticsConsent,
      recordUsage: usage && typeof usage.record === 'function' ? usage.record : async () => ({ recorded: false }),
      uploadWallpaper,
      deleteWallpaper,
      handleMessage,
      start
    });
  }

  return Object.freeze({
    SYNC_ALARM_NAME,
    PERIODIC_SYNC_ALARM_NAME,
    PERIODIC_SYNC_MINUTES,
    detectClientInfo,
    isTrustedExtensionSender,
    createTrackedArea,
    createController
  });
});
