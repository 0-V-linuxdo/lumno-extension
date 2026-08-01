const assert = require('assert');
const nodeCrypto = require('crypto').webcrypto;

const webAuthApi = require('../src/background/web-auth-flow.js');

function createPendingStore() {
  let value = null;
  return {
    async get() { return value; },
    async set(next) { value = next; },
    async remove() { value = null; }
  };
}

async function run() {
  let authorizationUrl = '';
  let exchangePayload = null;
  const chromeApi = {
    runtime: { id: 'extension-dev' },
    identity: {
      getRedirectURL: (path) => `https://extension-dev.chromiumapp.org/${path}`,
      launchWebAuthFlow(options, callback) {
        authorizationUrl = options.url;
        const state = new URL(options.url).searchParams.get('state');
        callback(`https://extension-dev.chromiumapp.org/lumno-auth?code=one-time-code&state=${state}`);
      }
    }
  };
  const flow = webAuthApi.createFlow({
    chromeApi,
    cryptoApi: nodeCrypto,
    clientId: 'client-public-dev',
    pendingStore: createPendingStore(),
    transport: {
      async exchangeOAuthCode(payload) {
        exchangePayload = payload;
        return { access_token: 'access', user: { id: 'user-one', email: 'alice@example.com' } };
      }
    },
    config: {
      projectUrl: 'https://project.supabase.co',
      publishableKey: 'public-key'
    }
  });

  const session = await flow.signIn();
  const parsedAuthorization = new URL(authorizationUrl);
  assert.strictEqual(parsedAuthorization.pathname, '/auth/v1/oauth/authorize');
  assert.strictEqual(parsedAuthorization.searchParams.get('response_type'), 'code');
  assert.strictEqual(parsedAuthorization.searchParams.get('code_challenge_method'), 'S256');
  assert.strictEqual(parsedAuthorization.searchParams.get('scope'), 'email profile');
  assert.strictEqual(parsedAuthorization.searchParams.get('redirect_uri'),
    'https://extension-dev.chromiumapp.org/lumno-auth');
  assert.strictEqual(exchangePayload.code, 'one-time-code');
  assert.strictEqual(exchangePayload.clientId, 'client-public-dev');
  assert(exchangePayload.codeVerifier.length >= 43, 'PKCE verifier should have sufficient entropy');
  assert.strictEqual(session.user.id, 'user-one');

  assert.throws(() => webAuthApi.validateCallback(
    'https://extension-dev.chromiumapp.org/lumno-auth?code=one&state=wrong',
    'https://extension-dev.chromiumapp.org/lumno-auth',
    'expected'
  ), /oauth_state_mismatch/);
  assert.throws(() => webAuthApi.validateCallback(
    'https://evil.example/lumno-auth?code=one&state=expected',
    'https://extension-dev.chromiumapp.org/lumno-auth',
    'expected'
  ), /invalid_web_auth_callback/);

  console.log('web auth flow tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
