(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoCloudConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Both values are public client configuration, not secrets. The service-role
  // key belongs only in Supabase Edge Function secrets and must never be added here.
  const PROJECT_URL = 'https://krpyocaoeqfwpepnsthc.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_mDUxTyAulyytM1LAnDYx-g_uoBOXBnp';
  const MEDIA_BUCKET = 'lumno-user-media';
  const WEB_ACCOUNT_URL = 'https://lumno.kubai.design/account/';
  const OAUTH_CLIENT_IDS = Object.freeze({
    // Unpacked development build. Production uses a separate public client so
    // redirect URIs and grants remain isolated between environments.
    kkcjcneagmlhpeaafngjdlpcfjakejgb: '768d478e-811f-4085-a3be-62609b9184fc',
    nggfkkbmogmadfoikakkfegkoilfcfao: '1279a56a-4c1d-495d-8a57-13e77d1b2d53'
  });

  function normalizeProjectUrl(value) {
    const raw = String(value || '').trim().replace(/\/+$/, '');
    try {
      const parsed = new URL(raw);
      return parsed.protocol === 'https:' ? parsed.origin : '';
    } catch (_error) {
      return '';
    }
  }

  function getConfig(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    const projectUrl = normalizeProjectUrl(source.projectUrl || PROJECT_URL);
    const publishableKey = String(source.publishableKey || PUBLISHABLE_KEY).trim();
    return Object.freeze({
      projectUrl,
      publishableKey,
      mediaBucket: String(source.mediaBucket || MEDIA_BUCKET).trim() || MEDIA_BUCKET,
      configured: Boolean(projectUrl && publishableKey)
    });
  }

  function getOAuthClientId(extensionId) {
    return String(OAUTH_CLIENT_IDS[String(extensionId || '').trim()] || '').trim();
  }

  return Object.freeze({
    PROJECT_URL,
    PUBLISHABLE_KEY,
    MEDIA_BUCKET,
    WEB_ACCOUNT_URL,
    OAUTH_CLIENT_IDS,
    normalizeProjectUrl,
    getOAuthClientId,
    getConfig
  });
});
