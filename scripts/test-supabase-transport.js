const assert = require('assert');

const schema = require('../src/shared/cloud-sync-schema.js');
const transportApi = require('../src/background/supabase-transport.js');

function createArea(initialValues) {
  const values = { ...(initialValues || {}) };
  return {
    values,
    get(keys, callback) {
      const requested = Array.isArray(keys) ? keys : Object.keys(values);
      callback(Object.fromEntries(requested.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(values, key) ? [[key, values[key]]] : []
      ))));
    },
    set(payload, callback) {
      Object.assign(values, payload);
      if (callback) callback();
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]);
      if (callback) callback();
    }
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body === null || body === undefined ? '' : JSON.stringify(body)
  };
}

async function run() {
  assert.strictEqual(transportApi.normalizeEmail(' Alice@Example.COM '), 'alice@example.com');
  assert.strictEqual(transportApi.normalizeEmail('not-an-email'), '');
  assert.strictEqual(transportApi.normalizeAuthProvider(' Google '), 'google');
  assert.strictEqual(transportApi.normalizeAuthProvider('email'), '');
  assert.strictEqual(transportApi.getAuthProvider({
    app_metadata: { provider: 'google' },
    identities: [
      { provider: 'google', last_sign_in_at: '2026-08-01T00:00:00Z' },
      { provider: 'github', last_sign_in_at: '2026-08-02T00:00:00Z' }
    ]
  }), 'github', 'the most recently used identity should win over the account metadata fallback');

  const localArea = createArea({});
  const requests = [];
  let now = 1_800_000_000_000;
  const fetchImpl = async (url, options) => {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    requests.push({ url, options, body });
    if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
      return jsonResponse(200, {
        access_token: 'access-two',
        refresh_token: 'refresh-two',
        expires_in: 3600,
        user: { id: 'user-one', email: 'alice@example.com' }
      });
    }
    if (url.endsWith('/rest/v1/rpc/lumno_pull_setting_changes')) {
      return jsonResponse(200, [{ key: schema.STORAGE_KEYS.themeMode, value: 'dark', change_id: 1 }]);
    }
    if (url.endsWith('/functions/v1/media-asset') && body instanceof FormData) {
      return jsonResponse(200, {
        ok: true,
        asset: {
          id: '22222222-2222-4222-8222-222222222222',
          client_asset_id: body.get('client_asset_id'),
          storage_path: 'user-one/wallpapers/server-generated.webp'
        }
      });
    }
    if (url.endsWith('/functions/v1/media-asset') && body && body.action === 'download') {
      const blob = new Blob(['downloaded'], { type: 'image/webp' });
      return {
        ok: true,
        status: 200,
        text: async () => '',
        blob: async () => blob
      };
    }
    if (url.includes('/rest/v1/lumno_assets?')) {
      return jsonResponse(200, []);
    }
    return jsonResponse(200, {});
  };
  let storedSession = {
    access_token: 'access-one',
    refresh_token: 'refresh-one',
    expires_at: Math.floor(now / 1000) + 3600,
    user: { id: 'user-one', email: 'alice@example.com' }
  };
  const transport = transportApi.createTransport({
    localArea,
    sessionStore: {
      async get() { return storedSession; },
      async set(value) { storedSession = value; },
      async remove() { storedSession = null; }
    },
    fetchImpl,
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });

  assert.strictEqual(transport.config.configured, true);
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.session], undefined,
    'refresh tokens must never be persisted in content-script-readable local storage');
  assert.strictEqual((await transport.getSession({ refresh: false })).access_token, 'access-one',
    'the volatile fallback should preserve the active service-worker session');

  const pull = await transport.pullSettings({ device_id: 'device-one', cursor: 0 });
  assert.strictEqual(pull.rows.length, 1);
  assert.match(requests.at(-1).options.headers.Authorization, /^Bearer access-one$/);

  await transport.setCloudConsent('2026-08-02-combined-v1');
  const combinedConsentRequest = requests.at(-1);
  assert.match(combinedConsentRequest.url, /\/rest\/v1\/lumno_consents\?on_conflict=user_id$/);
  assert.strictEqual(combinedConsentRequest.body[0].sync_terms_version, '2026-08-02-combined-v1');
  assert.strictEqual(combinedConsentRequest.body[0].analytics_terms_version, '2026-08-02-combined-v1');
  assert.strictEqual(combinedConsentRequest.body[0].analytics_withdrawn_at, null);

  now += 3_599_500;
  const refreshed = await transport.getSession();
  assert.strictEqual(refreshed.access_token, 'access-two');
  assert.strictEqual(requests.filter((request) => request.url.includes('grant_type=refresh_token')).length, 1);

  const disabled = transportApi.createTransport({
    localArea,
    fetchImpl,
    config: { projectUrl: 'http://insecure.invalid', publishableKey: 'invalid' }
  });
  await assert.rejects(() => disabled.exchangeOAuthCode({
    code: 'code',
    codeVerifier: 'verifier',
    clientId: 'client',
    redirectUri: 'https://extension.chromiumapp.org/lumno-auth'
  }), /cloud_not_configured/);

  let secureSession = null;
  const oauthRequests = [];
  const oauthFetch = async (url, options) => {
    oauthRequests.push({ url, options });
    if (url.endsWith('/auth/v1/oauth/token')) {
      const grantType = options.body.get('grant_type');
      return jsonResponse(200, {
        access_token: grantType === 'authorization_code' ? 'oauth-access-one' : 'oauth-access-two',
        refresh_token: grantType === 'authorization_code' ? 'oauth-refresh-one' : 'oauth-refresh-two',
        expires_in: 3600,
        scope: 'email profile'
      });
    }
    if (url.endsWith('/auth/v1/user')) {
      return jsonResponse(200, {
        id: 'oauth-user',
        email: 'oauth@example.com',
        app_metadata: { provider: 'google' }
      });
    }
    return jsonResponse(200, {});
  };
  const oauthTransport = transportApi.createTransport({
    localArea: createArea({}),
    sessionStore: {
      async get() { return secureSession; },
      async set(value) { secureSession = value; },
      async remove() { secureSession = null; }
    },
    fetchImpl: oauthFetch,
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });
  const oauthSession = await oauthTransport.exchangeOAuthCode({
    code: 'one-time-code',
    codeVerifier: 'verifier-value',
    clientId: 'public-client',
    redirectUri: 'https://extension.chromiumapp.org/lumno-auth'
  });
  assert.strictEqual(oauthSession.user.id, 'oauth-user');
  assert.strictEqual(oauthSession.user.provider, 'google');
  assert.strictEqual(oauthSession.oauth_client_id, 'public-client');
  assert.strictEqual(oauthRequests[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.strictEqual(oauthRequests[0].options.body.get('code_verifier'), 'verifier-value');
  assert.strictEqual(secureSession.access_token, 'oauth-access-one');

  now += 3_599_500;
  const refreshedOauth = await oauthTransport.getSession();
  assert.strictEqual(refreshedOauth.access_token, 'oauth-access-two');
  assert.strictEqual(refreshedOauth.user.email, 'oauth@example.com');
  assert.strictEqual(oauthRequests.at(-1).options.body.get('grant_type'), 'refresh_token');

  const uploadedAsset = await transport.uploadAsset({
    asset_kind: 'wallpaper',
    client_asset_id: 'custom-wallpaper-1700000000000-abcdef',
    original_name: 'Compressed wallpaper',
    imageBlob: new Blob(['webp'], { type: 'image/webp' }),
    thumbnailBlob: new Blob(['thumb'], { type: 'image/webp' })
  });
  assert.strictEqual(uploadedAsset.storage_path, 'user-one/wallpapers/server-generated.webp');
  const uploadRequest = requests.at(-1);
  assert.match(uploadRequest.url, /\/functions\/v1\/media-asset$/);
  assert(uploadRequest.body instanceof FormData);
  assert.strictEqual(uploadRequest.options.headers['Content-Type'], undefined,
    'the browser should set the multipart boundary itself');

  const downloadedBlob = await transport.downloadObject(uploadedAsset.storage_path);
  assert.strictEqual(await downloadedBlob.text(), 'downloaded');
  await transport.deleteAsset('custom-wallpaper-1700000000000-abcdef');
  assert.deepStrictEqual(requests.at(-1).body, {
    action: 'delete',
    client_asset_id: 'custom-wallpaper-1700000000000-abcdef'
  });
  assert.strictEqual(
    requests.some((entry) => entry.url.includes('/storage/v1/object/')),
    false,
    'authenticated clients should never call Storage directly'
  );

  await transport.signOut();
  assert.strictEqual(storedSession, null, 'local sign-out must always remove the encrypted device session');
  assert.match(requests.at(-1).url, /\/auth\/v1\/logout\?scope=local$/,
    'the extension sign-out button must revoke only this device session');

  const protocolRequests = [];
  const protocolSession = {
    access_token: 'protocol-access',
    refresh_token: 'protocol-refresh',
    expires_at: Math.floor(now / 1000) + 3600,
    user: { id: 'protocol-user', email: 'protocol@example.com' }
  };
  const protocolFetch = async (url, options) => {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    protocolRequests.push({ url, options, body });
    if (url.endsWith('/rest/v1/rpc/lumno_get_sync_capabilities')) {
      return jsonResponse(200, {
        current_protocol: 2,
        supported_protocols: [1, 2],
        max_push_batch: 100,
        schema_hash: schema.SYNC_SCHEMA_HASH,
        sync_keys: schema.SYNC_KEYS,
        protocol_keys: {
          1: schema.LEGACY_SYNC_KEYS,
          2: schema.SYNC_KEYS
        }
      });
    }
    if (url.endsWith('/rest/v1/rpc/lumno_push_setting_changes_v2')) {
      return jsonResponse(200, {
        accepted: body.p_changes.map((change, index) => ({
          operation_id: change.operation_id,
          key: change.key,
          version: 1,
          change_id: index + 1
        })),
        conflicts: [],
        rejected: []
      });
    }
    if (url.endsWith('/rest/v1/rpc/lumno_pull_setting_changes_v2')) {
      return jsonResponse(200, []);
    }
    return jsonResponse(404, { code: 'PGRST202', message: 'RPC not found' });
  };
  const protocolTransport = transportApi.createTransport({
    localArea: createArea({}),
    sessionStore: {
      async get() { return protocolSession; },
      async set() {},
      async remove() {}
    },
    fetchImpl: protocolFetch,
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });
  const capabilities = await protocolTransport.getSyncCapabilities();
  assert.strictEqual(capabilities.protocol, 2);
  assert.strictEqual(capabilities.supported_keys.length, 52);
  assert.strictEqual(protocolRequests[0].options.headers.Authorization, undefined,
    'capability discovery must work with only the public project key');
  const protocolChanges = [
    {
      operation_id: '40000000-0000-4000-8000-000000000001',
      key: schema.STORAGE_KEYS.themeMode,
      value: 'dark',
      base_version: 0
    },
    {
      operation_id: '40000000-0000-4000-8000-000000000002',
      key: schema.STORAGE_KEYS.selectionQuickActionsTriggerStyle,
      value: 'butterfly',
      base_version: 0
    }
  ];
  const protocolPush = await protocolTransport.pushSettings({
    device_id: '40000000-0000-4000-8000-000000000003',
    changes: protocolChanges
  });
  assert.strictEqual(protocolPush.accepted.length, 2);
  assert.strictEqual(protocolPush.deferred.length, 0);
  assert.match(protocolRequests.at(-1).url, /lumno_push_setting_changes_v2$/);
  await protocolTransport.pullSettings({
    device_id: '40000000-0000-4000-8000-000000000003',
    cursor: 0
  });
  assert.match(protocolRequests.at(-1).url, /lumno_pull_setting_changes_v2$/);
  assert.strictEqual(protocolRequests.filter((request) => (
    request.url.endsWith('/rest/v1/rpc/lumno_get_sync_capabilities')
  )).length, 1, 'capabilities should be cached for the transport session');

  const legacyRequests = [];
  const legacyTransport = transportApi.createTransport({
    localArea: createArea({}),
    sessionStore: {
      async get() { return protocolSession; },
      async set() {},
      async remove() {}
    },
    fetchImpl: async (url, options) => {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      legacyRequests.push({ url, options, body });
      if (url.endsWith('/rest/v1/rpc/lumno_get_sync_capabilities')) {
        return jsonResponse(404, { code: 'PGRST202', message: 'RPC not found' });
      }
      return jsonResponse(200, { accepted: [], conflicts: [] });
    },
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });
  const legacyPush = await legacyTransport.pushSettings({
    device_id: '40000000-0000-4000-8000-000000000003',
    changes: protocolChanges
  });
  assert.strictEqual(legacyPush.protocol, 1);
  assert.strictEqual(legacyPush.deferred.length, 1,
    'a new setting must remain deferred when the server only supports protocol 1');
  assert.strictEqual(legacyRequests.at(-1).body.p_changes.length, 1,
    'protocol 1 must receive only its frozen key set');
  assert.match(legacyRequests.at(-1).url, /lumno_push_setting_changes$/);
  now += transportApi.DEGRADED_CAPABILITY_CACHE_TTL_MS + 1;
  await legacyTransport.getSyncCapabilities();
  assert.strictEqual(legacyRequests.filter((request) => (
    request.url.endsWith('/rest/v1/rpc/lumno_get_sync_capabilities')
  )).length, 2,
  'a degraded protocol fallback must be re-probed so a later server upgrade can release deferred settings');

  const errorTransport = transportApi.createTransport({
    localArea: createArea({}),
    sessionStore: {
      async get() { return protocolSession; },
      async set() {},
      async remove() {}
    },
    fetchImpl: async (url) => {
      if (url.endsWith('/rest/v1/rpc/lumno_get_sync_capabilities')) {
        return protocolFetch(url, { body: '{}', headers: {} });
      }
      return jsonResponse(400, {
        code: '22023',
        message: 'Invalid sync change',
        details: 'operation 2 was malformed',
        hint: 'refresh capabilities'
      });
    },
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });
  await assert.rejects(
    () => errorTransport.pushSettings({
      device_id: '40000000-0000-4000-8000-000000000003',
      changes: [protocolChanges[0]]
    }),
    (error) => error && error.code === '22023' &&
      error.message === 'Invalid sync change' &&
      error.details === 'operation 2 was malformed' &&
      error.hint === 'refresh capabilities' &&
      error.rpc === 'lumno_push_setting_changes_v2' &&
      error.protocol === 2,
    'transport errors must preserve the server message, details, hint, RPC, and protocol'
  );

  let invalidatedSession = {
    access_token: 'expired-access',
    refresh_token: 'revoked-refresh',
    expires_at: Math.floor(now / 1000),
    user: { id: 'user-one', email: 'alice@example.com' }
  };
  const invalidatedTransport = transportApi.createTransport({
    localArea: createArea({}),
    sessionStore: {
      async get() { return invalidatedSession; },
      async set(value) { invalidatedSession = value; },
      async remove() { invalidatedSession = null; }
    },
    fetchImpl: async () => jsonResponse(401, { error: 'refresh_token_not_found' }),
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });
  await assert.rejects(
    () => invalidatedTransport.getSession(),
    (error) => error && error.sessionInvalidated === true,
    'a revoked refresh session must be distinguishable from an ordinary API error'
  );
  assert.strictEqual(invalidatedSession, null);

  console.log('supabase transport tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
