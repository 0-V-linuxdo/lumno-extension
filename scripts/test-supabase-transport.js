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

  const localArea = createArea({});
  const requests = [];
  let now = 1_800_000_000_000;
  const fetchImpl = async (url, options) => {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    requests.push({ url, options, body });
    if (url.endsWith('/auth/v1/otp')) {
      return jsonResponse(200, {});
    }
    if (url.endsWith('/auth/v1/verify')) {
      return jsonResponse(200, {
        access_token: 'access-one',
        refresh_token: 'refresh-one',
        expires_in: 3600,
        user: { id: 'user-one', email: 'alice@example.com' }
      });
    }
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
    return jsonResponse(200, {});
  };
  const transport = transportApi.createTransport({
    localArea,
    fetchImpl,
    now: () => now,
    config: {
      projectUrl: 'https://project.supabase.co/',
      publishableKey: 'public-key'
    }
  });

  assert.strictEqual(transport.config.configured, true);
  await transport.requestOtp('Alice@Example.com');
  assert.deepStrictEqual(requests[0].body, { email: 'alice@example.com', create_user: true });
  assert.strictEqual(requests[0].options.headers.apikey, 'public-key');

  const session = await transport.verifyOtp('alice@example.com', '123456');
  assert.strictEqual(session.user.id, 'user-one');
  assert.strictEqual(localArea.values[schema.CLOUD_LOCAL_KEYS.session], undefined,
    'refresh tokens must never be persisted in content-script-readable local storage');
  assert.strictEqual((await transport.getSession({ refresh: false })).access_token, 'access-one',
    'the volatile fallback should preserve the active service-worker session');

  const pull = await transport.pullSettings({ device_id: 'device-one', cursor: 0 });
  assert.strictEqual(pull.rows.length, 1);
  assert.match(requests.at(-1).options.headers.Authorization, /^Bearer access-one$/);

  now += 3_599_500;
  const refreshed = await transport.getSession();
  assert.strictEqual(refreshed.access_token, 'access-two');
  assert.strictEqual(requests.filter((request) => request.url.includes('grant_type=refresh_token')).length, 1);

  const disabled = transportApi.createTransport({
    localArea,
    fetchImpl,
    config: { projectUrl: 'http://insecure.invalid', publishableKey: 'invalid' }
  });
  await assert.rejects(() => disabled.requestOtp('alice@example.com'), /cloud_not_configured/);

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
      return jsonResponse(200, { id: 'oauth-user', email: 'oauth@example.com' });
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
  assert.strictEqual(oauthSession.oauth_client_id, 'public-client');
  assert.strictEqual(oauthRequests[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.strictEqual(oauthRequests[0].options.body.get('code_verifier'), 'verifier-value');
  assert.strictEqual(secureSession.access_token, 'oauth-access-one');

  now += 3_599_500;
  const refreshedOauth = await oauthTransport.getSession();
  assert.strictEqual(refreshedOauth.access_token, 'oauth-access-two');
  assert.strictEqual(refreshedOauth.user.email, 'oauth@example.com');
  assert.strictEqual(oauthRequests.at(-1).options.body.get('grant_type'), 'refresh_token');

  console.log('supabase transport tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
