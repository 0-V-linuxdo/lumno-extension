(function(root, factory) {
  const schema = typeof module === 'object' && module.exports
    ? require('../shared/cloud-sync-schema.js')
    : root.LumnoCloudSyncSchema;
  const configApi = typeof module === 'object' && module.exports
    ? require('../shared/cloud-config.js')
    : root.LumnoCloudConfig;
  const secureStoreApi = typeof module === 'object' && module.exports
    ? require('./secure-session-store.js')
    : root.LumnoSecureSessionStore;
  const api = factory(schema, configApi, secureStoreApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSupabaseTransport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(schema, configApi, secureStoreApi) {
  'use strict';

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

  class CloudTransportError extends Error {
    constructor(code, status) {
      super(String(code || 'cloud_request_failed'));
      this.name = 'CloudTransportError';
      this.code = String(code || 'cloud_request_failed');
      this.status = Number(status) || 0;
    }
  }

  function normalizeEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    return EMAIL_PATTERN.test(email) && email.length <= 254 ? email : '';
  }

  function normalizeAuthProvider(value) {
    const provider = String(value || '').trim().toLowerCase();
    return provider === 'google' || provider === 'github' ? provider : '';
  }

  function getAuthProvider(userValue) {
    const user = userValue && typeof userValue === 'object' ? userValue : {};
    const appMetadata = user.app_metadata && typeof user.app_metadata === 'object'
      ? user.app_metadata
      : {};
    const directProvider = normalizeAuthProvider(user.provider);
    if (directProvider) return directProvider;
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const candidates = identities.map((identity) => ({
      provider: normalizeAuthProvider(identity && identity.provider),
      lastSignInAt: Date.parse(String(identity && identity.last_sign_in_at || '')) || 0
    })).filter((identity) => identity.provider);
    if (candidates.length === 1) return candidates[0].provider;
    candidates.sort((left, right) => right.lastSignInAt - left.lastSignInAt);
    if (candidates.length > 0 && candidates[0].lastSignInAt > 0) {
      return candidates[0].provider;
    }
    return normalizeAuthProvider(appMetadata.provider);
  }

  function normalizeSession(value) {
    const source = value && typeof value === 'object' ? value : {};
    const user = source.user && typeof source.user === 'object' ? source.user : {};
    const accessToken = String(source.access_token || '').trim();
    const refreshToken = String(source.refresh_token || '').trim();
    const expiresAt = Number(source.expires_at) || 0;
    const userId = String(user.id || '').trim();
    if (!accessToken || !refreshToken || !userId || !Number.isFinite(expiresAt)) {
      return null;
    }
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.round(expiresAt),
      oauth_client_id: String(source.oauth_client_id || '').trim(),
      user: {
        id: userId,
        email: normalizeEmail(user.email) || '',
        provider: getAuthProvider(user)
      }
    };
  }

  function createTransport(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const cloudConfig = configApi.getConfig(settings.config);
    const fetchImpl = settings.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    const chromeApi = settings.chromeApi || (typeof chrome !== 'undefined' ? chrome : null);
    const localArea = settings.localArea || (chromeApi && chromeApi.storage ? chromeApi.storage.local : null);
    const sessionStore = settings.sessionStore || secureStoreApi.createStore({
      indexedDBApi: settings.indexedDBApi !== undefined
        ? settings.indexedDBApi
        : (typeof indexedDB !== 'undefined' ? indexedDB : null),
      fallbackArea: localArea,
      fallbackKey: schema.CLOUD_LOCAL_KEYS.session
    });
    const now = typeof settings.now === 'function' ? settings.now : () => Date.now();
    const requestTimeoutMs = Math.max(1000, Number(settings.requestTimeoutMs) || DEFAULT_REQUEST_TIMEOUT_MS);
    const setTimer = settings.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    const clearTimer = settings.clearTimeout || (typeof clearTimeout === 'function' ? clearTimeout : null);
    let refreshInFlight = null;

    function requireConfigured() {
      if (!cloudConfig.configured || !fetchImpl) {
        throw new CloudTransportError('cloud_not_configured', 0);
      }
    }

    function endpoint(path) {
      return `${cloudConfig.projectUrl}${path}`;
    }

    async function parseResponse(response) {
      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch (_error) {
          body = null;
        }
      }
      if (!response.ok) {
        const code = body && (body.error_code || body.code || body.error)
          ? String(body.error_code || body.code || body.error)
          : `http_${response.status}`;
        throw new CloudTransportError(code.slice(0, 100), response.status);
      }
      return body;
    }

    async function fetchWithTimeout(url, optionsArg) {
      const options = optionsArg && typeof optionsArg === 'object' ? { ...optionsArg } : {};
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const externalSignal = options.signal;
      const forwardAbort = () => controller && controller.abort();
      if (controller) {
        options.signal = controller.signal;
        if (externalSignal && typeof externalSignal.addEventListener === 'function') {
          if (externalSignal.aborted) controller.abort();
          else externalSignal.addEventListener('abort', forwardAbort, { once: true });
        }
      }
      const timer = controller && setTimer
        ? setTimer(() => controller.abort(), requestTimeoutMs)
        : null;
      try {
        return await fetchImpl(url, options);
      } catch (error) {
        if (controller && controller.signal.aborted && !(externalSignal && externalSignal.aborted)) {
          throw new CloudTransportError('cloud_timeout', 0);
        }
        if (error instanceof CloudTransportError) throw error;
        throw new CloudTransportError('cloud_unavailable', 0);
      } finally {
        if (timer && clearTimer) clearTimer(timer);
        if (externalSignal && typeof externalSignal.removeEventListener === 'function') {
          externalSignal.removeEventListener('abort', forwardAbort);
        }
      }
    }

    async function request(path, optionsArg) {
      requireConfigured();
      const requestOptions = optionsArg && typeof optionsArg === 'object' ? optionsArg : {};
      const headers = {
        apikey: cloudConfig.publishableKey,
        ...(requestOptions.headers || {})
      };
      let body = requestOptions.body;
      if (requestOptions.form === true) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = body instanceof URLSearchParams ? body : new URLSearchParams(body || {});
      } else if (body !== undefined && body !== null &&
          !(body instanceof ArrayBuffer) &&
          !(typeof Blob !== 'undefined' && body instanceof Blob)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      const response = await fetchWithTimeout(endpoint(path), {
        method: requestOptions.method || 'GET',
        headers,
        body,
        signal: requestOptions.signal
      });
      return parseResponse(response);
    }

    async function saveSession(rawSession) {
      const normalized = normalizeSession(rawSession);
      if (!normalized) {
        throw new CloudTransportError('invalid_auth_session', 500);
      }
      await sessionStore.set(normalized);
      return normalized;
    }

    async function readSession() {
      return normalizeSession(await sessionStore.get());
    }

    async function refreshSession(session) {
      if (refreshInFlight) {
        return refreshInFlight;
      }
      const refreshRequest = session.oauth_client_id
        ? request('/auth/v1/oauth/token', {
            method: 'POST',
            form: true,
            body: {
              grant_type: 'refresh_token',
              refresh_token: session.refresh_token,
              client_id: session.oauth_client_id
            }
          }).then((body) => saveSession({
            ...body,
            refresh_token: (body && body.refresh_token) || session.refresh_token,
            expires_at: Math.floor(now() / 1000) + Math.max(60, Number(body && body.expires_in) || 3600),
            oauth_client_id: session.oauth_client_id,
            user: session.user
          }))
        : request('/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            body: { refresh_token: session.refresh_token }
          }).then(saveSession);
      refreshInFlight = refreshRequest.catch(async (error) => {
        if (error && (error.status === 400 || error.status === 401)) {
          await sessionStore.remove();
          error.sessionInvalidated = true;
        }
        throw error;
      }).finally(() => {
        refreshInFlight = null;
      });
      return refreshInFlight;
    }

    async function getSession(optionsArg) {
      const getOptions = optionsArg && typeof optionsArg === 'object' ? optionsArg : {};
      const session = await readSession();
      if (!session) {
        return null;
      }
      const expiresSoon = session.expires_at * 1000 <= now() + 60000;
      if (getOptions.refresh === false || !expiresSoon) {
        return session;
      }
      return refreshSession(session);
    }

    async function withAccessToken(callback) {
      const session = await getSession();
      if (!session) {
        throw new CloudTransportError('authentication_required', 401);
      }
      return callback(session.access_token, session);
    }

    async function exchangeOAuthCode(payload) {
      const source = payload && typeof payload === 'object' ? payload : {};
      const code = String(source.code || '').trim();
      const codeVerifier = String(source.codeVerifier || '').trim();
      const clientId = String(source.clientId || '').trim();
      const redirectUri = String(source.redirectUri || '').trim();
      if (!code || !codeVerifier || !clientId || !redirectUri) {
        throw new CloudTransportError('invalid_oauth_exchange', 400);
      }
      const body = await request('/auth/v1/oauth/token', {
        method: 'POST',
        form: true,
        body: {
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        }
      });
      const accessToken = String((body && body.access_token) || '').trim();
      if (!accessToken) throw new CloudTransportError('invalid_auth_session', 500);
      const user = await request('/auth/v1/user', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const expiresAt = Math.floor(now() / 1000) +
        Math.max(60, Number(body && body.expires_in) || 3600);
      return saveSession({
        ...body,
        expires_at: expiresAt,
        oauth_client_id: clientId,
        user
      });
    }

    async function signOut() {
      const session = await readSession();
      try {
        if (session) {
          await request('/auth/v1/logout?scope=local', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
        }
      } finally {
        await sessionStore.remove();
      }
      return { ok: true };
    }

    async function rpc(name, body) {
      return withAccessToken((accessToken) => request(`/rest/v1/rpc/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body
      }));
    }

    async function registerDevice(device) {
      const source = device && typeof device === 'object' ? device : {};
      return rpc('lumno_register_device', {
        p_device_id: source.id,
        p_display_name: String(source.display_name || 'Lumno browser').slice(0, 80),
        p_browser_family: String(source.browser_family || 'other'),
        p_platform_family: String(source.platform_family || 'other'),
        p_extension_version: String(source.extension_version || 'unknown').slice(0, 40)
      });
    }

    async function pushSettings(payload) {
      return rpc('lumno_push_setting_changes', {
        p_device_id: payload.device_id,
        p_changes: payload.changes
      });
    }

    async function pullSettings(payload) {
      const rows = await rpc('lumno_pull_setting_changes', {
        p_device_id: payload.device_id,
        p_cursor: Math.max(0, Number(payload.cursor) || 0),
        p_limit: 500
      });
      return { rows: Array.isArray(rows) ? rows : [] };
    }

    async function setAnalyticsConsent(consented, noticeVersion) {
      return withAccessToken(async (accessToken, session) => {
        const timestamp = new Date(now()).toISOString();
        const body = {
          user_id: session.user.id,
          privacy_notice_version: String(noticeVersion || '2026-08-02').slice(0, 40),
          analytics_terms_version: consented === true
            ? String(noticeVersion || '2026-08-02').slice(0, 40)
            : null,
          analytics_consented_at: consented === true ? timestamp : null,
          analytics_withdrawn_at: consented === true ? null : timestamp
        };
        const result = await request('/rest/v1/lumno_consents?on_conflict=user_id', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: [body]
        });
        return Array.isArray(result) && result.length > 0 ? result[0] : body;
      });
    }

    async function setCloudConsent(noticeVersion) {
      return withAccessToken(async (accessToken, session) => {
        const timestamp = new Date(now()).toISOString();
        const version = String(noticeVersion || '2026-08-02-combined-v1').slice(0, 40);
        const body = {
          user_id: session.user.id,
          privacy_notice_version: version,
          sync_terms_version: version,
          sync_consented_at: timestamp,
          analytics_terms_version: version,
          analytics_consented_at: timestamp,
          analytics_withdrawn_at: null
        };
        const result = await request('/rest/v1/lumno_consents?on_conflict=user_id', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: [body]
        });
        return Array.isArray(result) && result.length > 0 ? result[0] : body;
      });
    }

    async function setSyncConsent(noticeVersion) {
      return withAccessToken(async (accessToken, session) => {
        const timestamp = new Date(now()).toISOString();
        const version = String(noticeVersion || '2026-08-02').slice(0, 40);
        const body = {
          user_id: session.user.id,
          privacy_notice_version: version,
          sync_terms_version: version,
          sync_consented_at: timestamp
        };
        const result = await request('/rest/v1/lumno_consents?on_conflict=user_id', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'resolution=merge-duplicates,return=representation'
          },
          body: [body]
        });
        return Array.isArray(result) && result.length > 0 ? result[0] : body;
      });
    }

    async function uploadAsset(asset) {
      const source = asset && typeof asset === 'object' ? asset : {};
      if (typeof FormData !== 'function' || !source.imageBlob) {
        throw new CloudTransportError('invalid_upload', 400);
      }
      return withAccessToken(async (accessToken) => {
        const form = new FormData();
        const kind = source.asset_kind === 'shortcut_icon' ? 'shortcut_icon' : 'wallpaper';
        form.set('asset_kind', kind);
        form.set('client_asset_id', String(source.client_asset_id || ''));
        form.set('original_name', String(source.original_name || '').slice(0, 200));
        form.set('image', source.imageBlob, kind === 'shortcut_icon' ? 'icon.png' : 'wallpaper.webp');
        if (kind === 'wallpaper' && source.thumbnailBlob) {
          form.set('thumbnail', source.thumbnailBlob, 'thumbnail.webp');
        }
        requireConfigured();
        const response = await fetchWithTimeout(endpoint('/functions/v1/media-asset'), {
          method: 'POST',
          headers: {
            apikey: cloudConfig.publishableKey,
            Authorization: `Bearer ${accessToken}`
          },
          body: form
        });
        const result = await parseResponse(response);
        if (!result || !result.asset) throw new CloudTransportError('invalid_media_response', 502);
        return result.asset;
      });
    }

    async function listAssets() {
      return withAccessToken(async (accessToken) => {
        const pageSize = 500;
        const assets = [];
        let offset = 0;
        while (true) {
          const query = `?select=id,asset_kind,client_asset_id,original_name,storage_path,thumbnail_path,sha256,thumbnail_sha256,mime_type,byte_size,thumbnail_byte_size,width,height,updated_at,deleted_at&order=updated_at.asc,id.asc&limit=${pageSize}&offset=${offset}`;
          const result = await request(`/rest/v1/lumno_assets${query}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const page = Array.isArray(result) ? result : [];
          assets.push(...page);
          if (page.length < pageSize) break;
          offset += pageSize;
        }
        return assets;
      });
    }

    async function deleteAsset(clientAssetId) {
      const normalizedId = String(clientAssetId || '').trim();
      if (!normalizedId) throw new CloudTransportError('invalid_asset_id', 400);
      return withAccessToken((accessToken) => request('/functions/v1/media-asset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { action: 'delete', client_asset_id: normalizedId }
      }));
    }

    async function downloadObject(path) {
      const objectPath = String(path || '').trim();
      if (!objectPath) throw new CloudTransportError('invalid_asset_path', 400);
      return withAccessToken(async (accessToken) => {
        requireConfigured();
        const response = await fetchWithTimeout(endpoint('/functions/v1/media-asset'), {
          method: 'POST',
          headers: {
            apikey: cloudConfig.publishableKey,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'download', path: objectPath })
        });
        if (!response.ok) {
          await parseResponse(response);
        }
        return response.blob();
      });
    }

    async function ingestUsage(batch) {
      return withAccessToken((accessToken) => request('/functions/v1/telemetry-ingest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: batch
      }));
    }

    return Object.freeze({
      config: cloudConfig,
      getSession,
      exchangeOAuthCode,
      signOut,
      registerDevice,
      pushSettings,
      pullSettings,
      setAnalyticsConsent,
      setCloudConsent,
      setSyncConsent,
      ingestUsage,
      uploadAsset,
      listAssets,
      deleteAsset,
      downloadObject
    });
  }

  return Object.freeze({
    CloudTransportError,
    DEFAULT_REQUEST_TIMEOUT_MS,
    normalizeEmail,
    normalizeAuthProvider,
    getAuthProvider,
    normalizeSession,
    createTransport
  });
});
