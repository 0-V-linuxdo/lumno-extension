#!/usr/bin/env node

const assert = require('assert');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const cloudConfig = require('../src/shared/cloud-config.js');

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

async function main() {
  const config = cloudConfig.getConfig();
  assert(config.configured, 'cloud client configuration should be populated');
  const projectRef = new URL(config.projectUrl).hostname.split('.')[0];
  const keys = readRemoteKeys(projectRef);
  assert.equal(keys.publishable, config.publishableKey, 'client key should match the linked project');
  assert(keys.serviceRole, 'a server-only service-role JWT should be available for test setup');

  const email = `lumno-remote-smoke-${Date.now()}@example.com`;
  let userId = '';
  let deleted = false;

  try {
    const fixture = await requestJson(`${config.projectUrl}/auth/v1/admin/generate_link`, keys.serviceRole, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keys.serviceRole}` },
      body: { type: 'magiclink', email }
    });
    userId = fixture.id;
    assert(userId && fixture.hashed_token,
      'admin test setup should create a user and a non-delivered test token');

    const session = await requestJson(
      `${config.projectUrl}/auth/v1/verify`,
      config.publishableKey,
      { method: 'POST', body: { token_hash: fixture.hashed_token, type: 'email' } }
    );
    assert(session.access_token && session.user?.id === userId, 'test user should receive a session');
    const authHeaders = { Authorization: `Bearer ${session.access_token}` };

    const deviceId = crypto.randomUUID();
    const operationId = crypto.randomUUID();
    const settingKey = '_x_extension_theme_mode_2024_unique_';
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
      `${config.projectUrl}/rest/v1/rpc/lumno_push_setting_changes`,
      config.publishableKey,
      {
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
      }
    );
    assert.equal(push.accepted?.[0]?.operation_id, operationId, 'remote setting push should be accepted');
    const pulled = await requestJson(
      `${config.projectUrl}/rest/v1/rpc/lumno_pull_setting_changes`,
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

    const image = Uint8Array.from(Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    ));
    const assetId = crypto.randomUUID();
    const clientAssetId = `custom-wallpaper-${crypto.randomUUID()}`;
    const storagePath = `${userId}/wallpapers/${clientAssetId}.png`;
    await requestJson(
      `${config.projectUrl}/rest/v1/lumno_assets?on_conflict=user_id,client_asset_id`,
      config.publishableKey,
      {
        method: 'POST',
        headers: {
          ...authHeaders,
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: [{
          id: assetId,
          user_id: userId,
          client_asset_id: clientAssetId,
          original_name: 'remote-smoke.png',
          storage_path: storagePath,
          thumbnail_path: null,
          sha256: crypto.createHash('sha256').update(image).digest('hex'),
          mime_type: 'image/png',
          byte_size: image.byteLength,
          width: 1,
          height: 1,
          deleted_at: null
        }]
      }
    );
    const uploadResponse = await fetch(
      `${config.projectUrl}/storage/v1/object/${config.mediaBucket}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          apikey: config.publishableKey,
          Authorization: authHeaders.Authorization,
          'Content-Type': 'image/png',
          'x-upsert': 'false'
        },
        body: image
      }
    );
    assert.equal(uploadResponse.ok, true, `remote wallpaper upload should pass RLS: ${await uploadResponse.text()}`);
    const downloadResponse = await fetch(
      `${config.projectUrl}/storage/v1/object/authenticated/${config.mediaBucket}/${storagePath}`,
      { headers: { apikey: config.publishableKey, ...authHeaders } }
    );
    assert.equal(downloadResponse.ok, true, 'owner should download the private remote wallpaper');
    assert.equal((await downloadResponse.arrayBuffer()).byteLength, image.byteLength);

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

    const deletion = await requestJson(
      `${config.projectUrl}/functions/v1/delete-account`,
      config.publishableKey,
      { method: 'POST', headers: authHeaders, body: { confirmation: 'DELETE' } }
    );
    assert.equal(deletion.ok, true, 'remote account deletion should succeed');
    deleted = true;
    console.log('remote Supabase smoke test passed: sync, private media, analytics, deletion');
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
