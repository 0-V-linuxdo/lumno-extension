(function(root, factory) {
  const configApi = typeof module === 'object' && module.exports
    ? require('../shared/cloud-config.js')
    : root.LumnoCloudConfig;
  const api = factory(configApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoWebAuthFlow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(configApi) {
  'use strict';

  const PENDING_KEY = '_lumno_pending_web_auth_v1_';
  const MAX_PENDING_AGE_MS = 10 * 60 * 1000;

  class WebAuthError extends Error {
    constructor(code) {
      super(String(code || 'web_auth_failed'));
      this.name = 'WebAuthError';
      this.code = String(code || 'web_auth_failed');
    }
  }

  function encodeBase64Url(bytes) {
    let binary = '';
    bytes.forEach((value) => { binary += String.fromCharCode(value); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomToken(cryptoApi, byteLength) {
    const bytes = new Uint8Array(byteLength || 32);
    cryptoApi.getRandomValues(bytes);
    return encodeBase64Url(bytes);
  }

  async function createCodeChallenge(cryptoApi, verifier) {
    const bytes = new TextEncoder().encode(verifier);
    const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
    return encodeBase64Url(new Uint8Array(digest));
  }

  function createSessionAreaAdapter(area) {
    return {
      get() {
        if (!area || typeof area.get !== 'function') return Promise.resolve(null);
        return new Promise((resolve) => {
          area.get([PENDING_KEY], (result) => resolve((result && result[PENDING_KEY]) || null));
        });
      },
      set(value) {
        if (!area || typeof area.set !== 'function') return Promise.resolve();
        return new Promise((resolve) => area.set({ [PENDING_KEY]: value }, resolve));
      },
      remove() {
        if (!area || typeof area.remove !== 'function') return Promise.resolve();
        return new Promise((resolve) => area.remove([PENDING_KEY], resolve));
      }
    };
  }

  function launch(chromeApi, url) {
    return new Promise((resolve, reject) => {
      chromeApi.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
        const runtimeError = chromeApi.runtime && chromeApi.runtime.lastError;
        if (runtimeError) {
          reject(new WebAuthError(/cancel|closed|interaction/i.test(runtimeError.message || '')
            ? 'web_auth_cancelled'
            : 'web_auth_failed'));
          return;
        }
        if (!redirectUrl) {
          reject(new WebAuthError('web_auth_cancelled'));
          return;
        }
        resolve(redirectUrl);
      });
    });
  }

  function validateCallback(redirectUrl, expectedRedirectUri, expectedState) {
    let parsed;
    let expected;
    try {
      parsed = new URL(redirectUrl);
      expected = new URL(expectedRedirectUri);
    } catch (_error) {
      throw new WebAuthError('invalid_web_auth_callback');
    }
    if (parsed.origin !== expected.origin || parsed.pathname !== expected.pathname) {
      throw new WebAuthError('invalid_web_auth_callback');
    }
    if (!expectedState || parsed.searchParams.get('state') !== expectedState) {
      throw new WebAuthError('oauth_state_mismatch');
    }
    const callbackError = parsed.searchParams.get('error');
    if (callbackError) {
      throw new WebAuthError(callbackError === 'access_denied' ? 'web_auth_cancelled' : 'web_auth_failed');
    }
    const code = String(parsed.searchParams.get('code') || '').trim();
    if (!code) throw new WebAuthError('missing_authorization_code');
    return code;
  }

  function createFlow(options) {
    const settings = options && typeof options === 'object' ? options : {};
    const chromeApi = settings.chromeApi || (typeof chrome !== 'undefined' ? chrome : null);
    const cryptoApi = settings.cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    const transport = settings.transport;
    const now = typeof settings.now === 'function' ? settings.now : () => Date.now();
    const cloudConfig = configApi.getConfig(settings.config);
    const extensionId = chromeApi && chromeApi.runtime ? String(chromeApi.runtime.id || '') : '';
    const clientId = String(settings.clientId || configApi.getOAuthClientId(extensionId) || '').trim();
    const pendingStore = settings.pendingStore || createSessionAreaAdapter(
      chromeApi && chromeApi.storage ? chromeApi.storage.session : null
    );
    let inFlight = null;

    async function signIn() {
      if (inFlight) return inFlight;
      if (!chromeApi || !chromeApi.identity || !cryptoApi || !cryptoApi.subtle ||
          !transport || typeof transport.exchangeOAuthCode !== 'function' || !clientId) {
        throw new WebAuthError('web_auth_not_configured');
      }
      inFlight = (async () => {
        const redirectUri = chromeApi.identity.getRedirectURL('lumno-auth');
        const verifier = randomToken(cryptoApi, 32);
        const state = randomToken(cryptoApi, 32);
        const challenge = await createCodeChallenge(cryptoApi, verifier);
        const pending = {
          verifier,
          state,
          clientId,
          redirectUri,
          createdAt: now()
        };
        await pendingStore.set(pending);
        try {
          const authorizationUrl = new URL(`${cloudConfig.projectUrl}/auth/v1/oauth/authorize`);
          authorizationUrl.searchParams.set('response_type', 'code');
          authorizationUrl.searchParams.set('client_id', clientId);
          authorizationUrl.searchParams.set('redirect_uri', redirectUri);
          authorizationUrl.searchParams.set('state', state);
          authorizationUrl.searchParams.set('code_challenge', challenge);
          authorizationUrl.searchParams.set('code_challenge_method', 'S256');
          authorizationUrl.searchParams.set('scope', 'email profile');
          const callbackUrl = await launch(chromeApi, authorizationUrl.href);
          const restored = await pendingStore.get();
          if (!restored || now() - Number(restored.createdAt || 0) > MAX_PENDING_AGE_MS) {
            throw new WebAuthError('web_auth_request_expired');
          }
          const code = validateCallback(callbackUrl, restored.redirectUri, restored.state);
          return transport.exchangeOAuthCode({
            code,
            codeVerifier: restored.verifier,
            clientId: restored.clientId,
            redirectUri: restored.redirectUri
          });
        } finally {
          await pendingStore.remove();
        }
      })().finally(() => { inFlight = null; });
      return inFlight;
    }

    return Object.freeze({ signIn, clientId });
  }

  return Object.freeze({
    PENDING_KEY,
    MAX_PENDING_AGE_MS,
    WebAuthError,
    encodeBase64Url,
    createCodeChallenge,
    validateCallback,
    createFlow
  });
});
