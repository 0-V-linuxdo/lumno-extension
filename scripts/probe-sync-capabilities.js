#!/usr/bin/env node

const assert = require('assert');

const cloudConfig = require('../src/shared/cloud-config.js');
const syncSchema = require('../src/shared/cloud-sync-schema.js');

async function main() {
  const config = cloudConfig.getConfig();
  assert(config.configured, 'cloud client configuration should be populated');
  const response = await fetch(`${config.projectUrl}/rest/v1/rpc/lumno_get_sync_capabilities`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  const text = await response.text();
  assert(response.ok, `capability probe failed with HTTP ${response.status}: ${text}`);
  const capabilities = JSON.parse(text);
  assert.equal(capabilities.current_protocol, syncSchema.CURRENT_SYNC_PROTOCOL);
  assert.equal(capabilities.schema_hash, syncSchema.SYNC_SCHEMA_HASH);
  assert.deepStrictEqual(new Set(capabilities.sync_keys), new Set(syncSchema.SYNC_KEYS));
  console.log(`production sync capability probe passed: protocol ${capabilities.current_protocol}, ${capabilities.sync_keys.length} keys`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
