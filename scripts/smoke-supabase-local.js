#!/usr/bin/env node

const assert = require('assert');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = new URL('../', `file://${__filename}`).pathname;

function readLocalStatus() {
  const raw = execFileSync(
    'npx',
    ['--yes', 'supabase@latest', 'status', '-o', 'json'],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const jsonStart = raw.indexOf('{');
  if (jsonStart < 0) {
    throw new Error('Supabase CLI did not return local status JSON');
  }
  return JSON.parse(raw.slice(jsonStart));
}

async function requestJson(url, publishableKey, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('apikey', publishableKey);
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
  const data = responseText ? JSON.parse(responseText) : null;
  if (!response.ok) {
    throw new Error(`${response.status} ${url}: ${responseText}`);
  }
  return data;
}

async function main() {
  const status = readLocalStatus();
  const apiUrl = status.API_URL;
  const functionsUrl = status.FUNCTIONS_URL || `${apiUrl}/functions/v1`;
  const publishableKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY;
  assert(apiUrl && publishableKey && serviceRoleKey, 'local Supabase services should be running');

  const email = `lumno-smoke-${Date.now()}@example.com`;
  const password = `Lumno-${crypto.randomBytes(20).toString('hex')}!`;
  await requestJson(`${apiUrl}/auth/v1/admin/users`, serviceRoleKey, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceRoleKey}` },
    body: { email, password, email_confirm: true }
  });
  const session = await requestJson(`${apiUrl}/auth/v1/token?grant_type=password`, publishableKey, {
    method: 'POST',
    body: { email, password }
  });
  assert(session.access_token && session.user?.id, 'admin-created test fixture should return a session');

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };
  const deviceId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const settingKey = '_x_extension_theme_mode_2024_unique_';

  await requestJson(`${apiUrl}/rest/v1/rpc/lumno_register_device`, publishableKey, {
    method: 'POST',
    headers: authHeaders,
    body: {
      p_device_id: deviceId,
      p_display_name: 'Local smoke test',
      p_browser_family: 'chrome',
      p_platform_family: 'other',
      p_extension_version: '0.9.30'
    }
  });
  const push = await requestJson(`${apiUrl}/rest/v1/rpc/lumno_push_setting_changes`, publishableKey, {
    method: 'POST',
    headers: authHeaders,
    body: {
      p_device_id: deviceId,
      p_changes: [{
        operation_id: operationId,
        key: settingKey,
        value: 'dark',
        base_version: 0,
        deleted: false,
        schema_version: 1
      }]
    }
  });
  assert.equal(push.accepted?.[0]?.operation_id, operationId, 'setting push should be accepted');
  const pulled = await requestJson(`${apiUrl}/rest/v1/rpc/lumno_pull_setting_changes`, publishableKey, {
    method: 'POST',
    headers: authHeaders,
    body: { p_device_id: deviceId, p_cursor: 0, p_limit: 500 }
  });
  assert(
    pulled.some((row) => row.key === settingKey && row.value === 'dark'),
    'the accepted setting should be readable through the pull cursor'
  );

  const consentVersion = 'local-smoke-v1';
  await requestJson(`${apiUrl}/rest/v1/lumno_consents?on_conflict=user_id`, publishableKey, {
    method: 'POST',
    headers: {
      ...authHeaders,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: [{
      user_id: session.user.id,
      privacy_notice_version: consentVersion,
      sync_terms_version: consentVersion,
      sync_consented_at: new Date().toISOString(),
      analytics_terms_version: consentVersion,
      analytics_consented_at: new Date().toISOString()
    }]
  });

  const image = Uint8Array.from(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  ));
  const assetId = crypto.randomUUID();
  const clientAssetId = `custom-wallpaper-${crypto.randomUUID()}`;
  const storagePath = `${session.user.id}/wallpapers/${clientAssetId}.png`;
  await requestJson(`${apiUrl}/rest/v1/lumno_assets?on_conflict=user_id,client_asset_id`, publishableKey, {
    method: 'POST',
    headers: {
      ...authHeaders,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: [{
      id: assetId,
      user_id: session.user.id,
      client_asset_id: clientAssetId,
      original_name: 'smoke.png',
      storage_path: storagePath,
      thumbnail_path: null,
      sha256: crypto.createHash('sha256').update(image).digest('hex'),
      mime_type: 'image/png',
      byte_size: image.byteLength,
      width: 1,
      height: 1,
      deleted_at: null
    }]
  });
  const uploadResponse = await fetch(
    `${apiUrl}/storage/v1/object/lumno-user-media/${storagePath}`,
    {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: authHeaders.Authorization,
        'Content-Type': 'image/png',
        'x-upsert': 'false'
      },
      body: image
    }
  );
  assert.equal(uploadResponse.ok, true, `wallpaper upload should pass RLS: ${await uploadResponse.text()}`);
  const downloadResponse = await fetch(
    `${apiUrl}/storage/v1/object/authenticated/lumno-user-media/${storagePath}`,
    { headers: { apikey: publishableKey, ...authHeaders } }
  );
  assert.equal(downloadResponse.ok, true, 'private wallpaper should be downloadable by its owner');
  assert.equal((await downloadResponse.arrayBuffer()).byteLength, image.byteLength);

  const configuration = {
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
  };
  const telemetry = await requestJson(`${functionsUrl}/telemetry-ingest`, publishableKey, {
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
      configuration
    }
  });
  assert.equal(telemetry.ok, true, 'consented aggregate telemetry should be accepted');

  const deletion = await requestJson(`${functionsUrl}/delete-account`, publishableKey, {
    method: 'POST',
    headers: authHeaders,
    body: { confirmation: 'DELETE' }
  });
  assert.equal(deletion.ok, true, 'account deletion should clean up the smoke-test account');

  console.log('local Supabase smoke test passed: auth fixture, sync, private media, analytics, deletion');
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
