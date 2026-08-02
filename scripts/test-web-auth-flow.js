const assert = require('assert');
const fs = require('fs');
const nodeCrypto = require('crypto').webcrypto;

const webAuthApi = require('../src/background/web-auth-flow.js');

function createPendingStore() {
  let value = null;
  let releaseWrite = null;
  return {
    async get() { return value; },
    set(next) {
      value = next;
      return new Promise((resolve) => { releaseWrite = resolve; });
    },
    async remove() { value = null; },
    releaseWrite() {
      if (releaseWrite) releaseWrite();
    }
  };
}

async function run() {
  let authorizationUrl = '';
  let exchangePayload = null;
  const launchEvents = [];
  const warmupRequests = [];
  const pendingStore = createPendingStore();
  const chromeApi = {
    runtime: { id: 'extension-dev' },
    identity: {
      getRedirectURL: (path) => `https://extension-dev.chromiumapp.org/${path}`,
      launchWebAuthFlow(options, callback) {
        launchEvents.push('launch');
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
    pendingStore: {
      get: () => pendingStore.get(),
      set(value) {
        launchEvents.push('store');
        return pendingStore.set(value);
      },
      remove: () => pendingStore.remove()
    },
    fetchImpl: async (url, options) => {
      warmupRequests.push({ url, options });
      return { async arrayBuffer() { return new ArrayBuffer(0); } };
    },
    authorizationPageUrl: 'https://lumno.example/oauth/authorize/',
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

  await flow.prepare();
  await flow.prepare();
  assert.deepStrictEqual(
    warmupRequests.map((request) => request.url),
    [
      'https://project.supabase.co/auth/v1/health',
      'https://lumno.example/oauth/authorize/'
    ],
    'preparing twice should warm each login origin only once'
  );
  assert(warmupRequests.every((request) => request.options.credentials === 'omit'),
    'connection warmup must not send account credentials');

  const signInPromise = flow.signIn();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual(launchEvents, ['store', 'launch'],
    'the browser auth window should launch without waiting for session storage persistence');
  pendingStore.releaseWrite();
  const session = await signInPromise;
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

  const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
  const controllerSource = fs.readFileSync('src/background/cloud-account-controller.js', 'utf8');
  const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
  assert.match(optionsSource, /openCloudConsentDialog\(\)[\s\S]*action: 'cloudPrepareWebSignIn'/,
    'opening the disclosure should prepare PKCE and warm the login origins before confirmation');
  assert.match(controllerSource, /action === 'cloudPrepareWebSignIn'[\s\S]*prepareWebSignIn\(\)/,
    'the account controller should expose the login preparation action');
  assert.match(backgroundSource, /cloudAccount:[\s\S]*'cloudPrepareWebSignIn'/,
    'the background router should allow the login preparation message');

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
