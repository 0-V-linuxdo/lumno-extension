#!/usr/bin/env node

const assert = require('assert');
const crypto = require('crypto');
const { smokeMediaGateway } = require('./helpers/media-gateway-smoke.js');
const { execFileSync } = require('child_process');

const cloudConfig = require('../src/shared/cloud-config.js');
const syncSchema = require('../src/shared/cloud-sync-schema.js');

// The hosted Auth, REST, Storage, and Edge routes share one origin but may
// terminate keep-alive connections at different gateway layers. Node's
// Undici pool can otherwise reuse a half-closed socket during this mixed-route
// smoke and report a misleading `fetch failed` after the server succeeded.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, options = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set('Connection', 'close');
  return nativeFetch(input, { ...options, headers });
};

function readRemoteKeys(projectRef) {
  const raw = execFileSync(
    'npx',
    ['--yes', 'supabase@latest', 'projects', 'api-keys', '--project-ref', projectRef, '-o', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const jsonStart = raw.indexOf('[');
  if (jsonStart < 0) {
    throw new Error('Supabase CLI did not return API key JSON');
  }
  const keys = JSON.parse(raw.slice(jsonStart));
  return {
    publishable: keys.find((key) => key.type === 'publishable')?.api_key,
    serviceRole: keys.find((key) => key.name === 'service_role')?.api_key
  };
}

async function requestJson(url, apiKey, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', apiKey);
  if (options.body !== undefined && !(options.body instanceof Uint8Array)) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body === undefined || options.body instanceof Uint8Array
      ? options.body
      : JSON.stringify(options.body)
  });
  const responseText = await response.text();
  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_error) {
      data = responseText;
    }
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${url}: ${responseText}`);
  }
  return data;
}

async function requestJsonResult(url, apiKey, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', apiKey);
  if (options.body !== undefined && !(options.body instanceof Uint8Array)) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body === undefined || options.body instanceof Uint8Array
      ? options.body
      : JSON.stringify(options.body)
  });
  const responseText = await response.text();
  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (_error) {
      data = responseText;
    }
  }
  return { status: response.status, data };
}

async function main() {
  const config = cloudConfig.getConfig();
  assert(config.configured, 'cloud client configuration should be populated');
  const capabilities = await requestJson(
    `${config.projectUrl}/rest/v1/rpc/lumno_get_sync_capabilities`,
    config.publishableKey,
    { method: 'POST', body: {} }
  );
  assert.equal(capabilities.current_protocol, 2, 'production should advertise sync protocol 2');
  assert.equal(capabilities.schema_hash, syncSchema.SYNC_SCHEMA_HASH,
    'production and client sync schema hashes should match');
  assert.deepStrictEqual(new Set(capabilities.sync_keys), new Set(syncSchema.SYNC_KEYS),
    'production should advertise every client sync key');
  const projectRef = new URL(config.projectUrl).hostname.split('.')[0];
  const keys = readRemoteKeys(projectRef);
  assert.equal(keys.publishable, config.publishableKey, 'client key should match the linked project');
  assert(keys.serviceRole, 'a server-only service-role JWT should be available for test setup');

  const email = `lumno-remote-smoke-${Date.now()}@example.com`;
  let userId = '';
  let deleted = false;

  try {
    const createdUser = await requestJson(`${config.projectUrl}/auth/v1/admin/users`, keys.serviceRole, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keys.serviceRole}` },
      body: {
        email,
        email_confirm: true,
        app_metadata: { lumno_system_fixture: true }
      }
    });
    userId = createdUser.id;
    assert(userId, 'admin test setup should create a marked system fixture');
    const fixture = await requestJson(`${config.projectUrl}/auth/v1/admin/generate_link`, keys.serviceRole, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keys.serviceRole}` },
      body: { type: 'magiclink', email }
    });
    assert(fixture.hashed_token,
      'admin test setup should issue a non-delivered token for the marked fixture');

    const session = await requestJson(
      `${config.projectUrl}/auth/v1/verify`,
      config.publishableKey,
      { method: 'POST', body: { token_hash: fixture.hashed_token, type: 'email' } }
    );
    assert(session.access_token && session.user?.id === userId, 'test user should receive a session');
    const authHeaders = { Authorization: `Bearer ${session.access_token}` };

    const deviceId = crypto.randomUUID();
    const settingKey = syncSchema.STORAGE_KEYS.themeMode;
    const settingOperations = syncSchema.SYNC_KEYS.map((key) => ({
      operation_id: crypto.randomUUID(),
      key,
      value: key === settingKey ? 'dark' : `remote-smoke:${key}`,
      base_version: 0,
      deleted: false,
      schema_version: 1
    }));
    await requestJson(`${config.projectUrl}/rest/v1/rpc/lumno_register_device`, config.publishableKey, {
      method: 'POST',
      headers: authHeaders,
      body: {
        p_device_id: deviceId,
        p_display_name: 'Remote smoke test',
        p_browser_family: 'chrome',
        p_platform_family: 'other',
        p_extension_version: '0.9.30'
      }
    });
    const push = await requestJson(
      `${config.projectUrl}/rest/v1/rpc/lumno_push_setting_changes_v2`,
      config.publishableKey,
      {
        method: 'POST',
        headers: authHeaders,
        body: {
          p_device_id: deviceId,
          p_changes: settingOperations
        }
      }
    );
    assert.equal(push.accepted?.length, syncSchema.SYNC_KEYS.length,
      'production protocol 2 should accept all 52 declared sync keys');
    assert.equal(push.rejected?.length, 0);
    const pulled = await requestJson(
      `${config.projectUrl}/rest/v1/rpc/lumno_pull_setting_changes_v2`,
      config.publishableKey,
      {
        method: 'POST',
        headers: authHeaders,
        body: { p_device_id: deviceId, p_cursor: 0, p_limit: 500 }
      }
    );
    assert(
      pulled.some((row) => row.key === settingKey && row.value === 'dark'),
      'accepted remote setting should be returned by the pull cursor'
    );
    assert.deepStrictEqual(new Set(pulled.map((row) => row.key)), new Set(syncSchema.SYNC_KEYS),
      'production protocol 2 pull should return the complete 52-key fixture');

    const isolatedOperationId = crypto.randomUUID();
    const isolatedPush = await requestJson(
      `${config.projectUrl}/rest/v1/rpc/lumno_push_setting_changes_v2`,
      config.publishableKey,
      {
        method: 'POST',
        headers: authHeaders,
        body: {
          p_device_id: deviceId,
          p_changes: [{
            operation_id: crypto.randomUUID(),
            key: '_x_extension_future_unsupported_key_',
            value: true,
            base_version: 0
          }, {
            operation_id: isolatedOperationId,
            key: settingKey,
            value: 'light',
            base_version: 1
          }]
        }
      }
    );
    assert.equal(isolatedPush.accepted?.[0]?.operation_id, isolatedOperationId,
      'a supported item should commit even when its batch contains an unknown key');
    assert.equal(isolatedPush.rejected?.[0]?.code, 'unsupported_key',
      'an unknown key should be rejected as one isolated item');

    const legacyKey = syncSchema.STORAGE_KEYS.language;
    const legacyOperationId = crypto.randomUUID();
    const legacyPush = await requestJson(
      `${config.projectUrl}/rest/v1/rpc/lumno_push_setting_changes`,
      config.publishableKey,
      {
        method: 'POST',
        headers: authHeaders,
        body: {
          p_device_id: deviceId,
          p_changes: [{
            operation_id: legacyOperationId,
            key: legacyKey,
            value: 'en',
            base_version: 1
          }]
        }
      }
    );
    assert.equal(legacyPush.accepted?.[0]?.operation_id, legacyOperationId,
      'the legacy push RPC must remain writable after protocol 2 deployment');
    const legacyPull = await requestJson(
      `${config.projectUrl}/rest/v1/rpc/lumno_pull_setting_changes`,
      config.publishableKey,
      {
        method: 'POST',
        headers: authHeaders,
        body: { p_device_id: deviceId, p_cursor: 0, p_limit: 500 }
      }
    );
    assert(legacyPull.some((row) => row.key === legacyKey && row.value === 'en'),
      'the legacy pull RPC must remain readable after protocol 2 deployment');

    const consentVersion = 'remote-smoke-v1';
    await requestJson(
      `${config.projectUrl}/rest/v1/lumno_consents?on_conflict=user_id`,
      config.publishableKey,
      {
        method: 'POST',
        headers: {
          ...authHeaders,
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: [{
          user_id: userId,
          privacy_notice_version: consentVersion,
          sync_terms_version: consentVersion,
          sync_consented_at: new Date().toISOString(),
          analytics_terms_version: consentVersion,
          analytics_consented_at: new Date().toISOString()
        }]
      }
    );

    await smokeMediaGateway({
      projectUrl: config.projectUrl,
      publishableKey: config.publishableKey,
      accessToken: session.access_token
    });

    const telemetry = await requestJson(
      `${config.projectUrl}/functions/v1/telemetry-ingest`,
      config.publishableKey,
      {
        method: 'POST',
        headers: authHeaders,
        body: {
          schema_version: 1,
          batch_id: crypto.randomUUID(),
          day: new Date().toISOString().slice(0, 10),
          metrics: { newtab_opened: 1 },
          dimensions: {
            extension_version: '0.9.30',
            locale: 'en',
            browser_family: 'chrome',
            platform_family: 'other'
          },
          configuration: {
            schema_version: 1,
            theme_mode: 'dark',
            language_mode: 'en',
            recent_mode: 'recent',
            recent_count_bucket: '5-8',
            newtab_width_mode: 'standard',
            newtab_search_width_bucket: '801-920',
            newtab_theme_mode: 'dark',
            wallpaper_source: 'custom',
            overlay_size_mode: 'standard',
            shortcut_count: 0,
            pinned_recent_site_count: 0,
            hidden_recent_site_count: 0,
            custom_search_provider_count: 0,
            disabled_search_provider_count: 0,
            search_blacklist_rule_count: 0,
            favicon_blacklist_rule_count: 0,
            auto_pip_enabled: false,
            tab_switcher_enabled: true,
            document_pip_enabled: false,
            pinned_tab_recovery_enabled: false
          }
        }
      }
    );
    assert.equal(telemetry.ok, true, 'remote consented aggregate telemetry should be accepted');

    const deletion = await requestJsonResult(
      `${config.projectUrl}/functions/v1/delete-account`,
      config.publishableKey,
      { method: 'POST', headers: authHeaders, body: { confirmation: 'DELETE' } }
    );
    assert.equal(deletion.status, 403,
      'remote account deletion must require an independent OAuth step-up token');
    assert.deepStrictEqual(deletion.data, { ok: false, error: 'step_up_required' });
    console.log('remote Supabase smoke test passed: 52-key protocol, isolated rejection, legacy sync, private media, analytics, deletion guard');
  } finally {
    if (userId && !deleted) {
      await requestJson(`${config.projectUrl}/auth/v1/admin/users/${userId}`, keys.serviceRole, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${keys.serviceRole}` }
      }).catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
