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
        email: normalizeEmail(user.email) || ''
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
      const response = await fetchImpl(endpoint(path), {
        method: requestOptions.method || 'GET',
        headers,
        body
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

    async function requestOtp(emailValue) {
      const email = normalizeEmail(emailValue);
      if (!email) {
        throw new CloudTransportError('invalid_email', 400);
      }
      await request('/auth/v1/otp', {
        method: 'POST',
        body: { email, create_user: true }
      });
      return { ok: true, email };
    }

    async function verifyOtp(emailValue, tokenValue) {
      const email = normalizeEmail(emailValue);
      const token = String(tokenValue || '').replace(/\s+/g, '');
      if (!email || !/^\d{6,8}$/.test(token)) {
        throw new CloudTransportError('invalid_verification_code', 400);
      }
      const body = await request('/auth/v1/verify', {
        method: 'POST',
        body: { email, token, type: 'email' }
      });
      const expiresAt = Number(body && body.expires_at) ||
        Math.floor(now() / 1000) + Math.max(60, Number(body && body.expires_in) || 3600);
      return saveSession({ ...body, expires_at: expiresAt });
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
          await request('/auth/v1/logout', {
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

    async function upsertAsset(asset) {
      const source = asset && typeof asset === 'object' ? asset : {};
      return withAccessToken(async (accessToken, session) => {
        const body = {
          id: source.id,
          user_id: session.user.id,
          client_asset_id: source.client_asset_id,
          original_name: String(source.original_name || '').slice(0, 200),
          storage_path: source.storage_path,
          thumbnail_path: source.thumbnail_path || null,
          sha256: source.sha256,
          mime_type: source.mime_type,
          byte_size: source.byte_size,
          width: source.width,
          height: source.height,
          deleted_at: null
        };
        const result = await request('/rest/v1/lumno_assets?on_conflict=user_id,client_asset_id', {
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

    async function listAssets() {
      return withAccessToken(async (accessToken) => {
        const query = '?select=id,client_asset_id,original_name,storage_path,thumbnail_path,sha256,mime_type,byte_size,width,height,updated_at&deleted_at=is.null&order=updated_at.asc';
        const result = await request(`/rest/v1/lumno_assets${query}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return Array.isArray(result) ? result : [];
      });
    }

    async function removeObjects(paths) {
      const prefixes = (Array.isArray(paths) ? paths : [])
        .map((path) => String(path || '').trim())
        .filter(Boolean);
      if (prefixes.length === 0) return { ok: true };
      return withAccessToken((accessToken) => request(
        `/storage/v1/object/${encodeURIComponent(cloudConfig.mediaBucket)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { prefixes }
        }
      ));
    }

    async function deleteAsset(clientAssetId) {
      const encodedId = encodeURIComponent(String(clientAssetId || '').trim());
      if (!encodedId) throw new CloudTransportError('invalid_asset_id', 400);
      return withAccessToken(async (accessToken) => {
        const rows = await request(`/rest/v1/lumno_assets?select=id,storage_path,thumbnail_path&client_asset_id=eq.${encodedId}&deleted_at=is.null`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!row) return { ok: true, deleted: false };
        await removeObjects([row.storage_path, row.thumbnail_path]);
        await request(`/rest/v1/lumno_assets?id=eq.${encodeURIComponent(row.id)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=minimal'
          }
        });
        return { ok: true, deleted: true };
      });
    }

    async function downloadObject(path) {
      const objectPath = String(path || '').split('/').map(encodeURIComponent).join('/');
      if (!objectPath) throw new CloudTransportError('invalid_asset_path', 400);
      return withAccessToken(async (accessToken) => {
        requireConfigured();
        const response = await fetchImpl(endpoint(
          `/storage/v1/object/authenticated/${encodeURIComponent(cloudConfig.mediaBucket)}/${objectPath}`
        ), {
          headers: {
            apikey: cloudConfig.publishableKey,
            Authorization: `Bearer ${accessToken}`
          }
        });
        if (!response.ok) {
          throw new CloudTransportError(`http_${response.status}`, response.status);
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

    async function deleteAccount() {
      const result = await withAccessToken((accessToken) => request('/functions/v1/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { confirmation: 'DELETE' }
      }));
      await sessionStore.remove();
      return result;
    }

    async function uploadObject(path, blob, contentType) {
      const objectPath = String(path || '').split('/').map(encodeURIComponent).join('/');
      if (!objectPath || !blob) {
        throw new CloudTransportError('invalid_upload', 400);
      }
      return withAccessToken((accessToken) => request(
        `/storage/v1/object/${encodeURIComponent(cloudConfig.mediaBucket)}/${objectPath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': String(contentType || 'application/octet-stream'),
            'x-upsert': 'true'
          },
          body: blob
        }
      ));
    }

    return Object.freeze({
      config: cloudConfig,
      getSession,
      exchangeOAuthCode,
      requestOtp,
      verifyOtp,
      signOut,
      registerDevice,
      pushSettings,
      pullSettings,
      setAnalyticsConsent,
      setSyncConsent,
      ingestUsage,
      deleteAccount,
      uploadObject,
      upsertAsset,
      listAssets,
      deleteAsset,
      downloadObject,
      removeObjects
    });
  }

  return Object.freeze({
    CloudTransportError,
    normalizeEmail,
    normalizeSession,
    createTransport
  });
});
