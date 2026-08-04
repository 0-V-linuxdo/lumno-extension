const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const schema = require('../src/shared/cloud-sync-schema.js');
const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '202608040020_sync_protocol_v2.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

function functionBody(name, nextName) {
  const start = sql.indexOf(`create or replace function public.${name}`);
  const end = nextName
    ? sql.indexOf(`create or replace function public.${nextName}`, start + 1)
    : sql.length;
  assert(start >= 0 && end > start, `${name} must exist in the protocol migration`);
  return sql.slice(start, end);
}

function extractSettingKeys(source) {
  return [...source.matchAll(/'(_x_extension_[^']+)'/g)].map((match) => match[1]);
}

const v1Body = functionBody('lumno_sync_keys_v1', 'lumno_sync_keys_v2');
const v2Body = functionBody('lumno_sync_keys_v2', 'lumno_get_sync_capabilities');
const v1Keys = extractSettingKeys(v1Body);
const v2Additions = extractSettingKeys(v2Body);

assert.deepStrictEqual(new Set(v1Keys), new Set(schema.LEGACY_SYNC_KEYS),
  'the database protocol 1 contract must match the frozen client contract');
assert.deepStrictEqual(new Set([...v1Keys, ...v2Additions]), new Set(schema.SYNC_KEYS),
  'the database protocol 2 contract must match every client sync key');

const hashSource = [...schema.SYNC_KEY_DEFINITIONS]
  .sort((left, right) => left.key.localeCompare(right.key))
  .map((definition) => `${definition.introducedProtocol}:${definition.key}`)
  .join('\n');
const schemaHash = crypto.createHash('sha256').update(hashSource).digest('hex');
assert.strictEqual(schemaHash, schema.SYNC_SCHEMA_HASH,
  'the client schema hash must be regenerated when the protocol contract changes');
assert(sql.includes(schema.SYNC_SCHEMA_HASH),
  'the capability RPC must advertise the same schema hash as the client');

assert.match(sql,
  /grant execute on function public\.lumno_get_sync_capabilities\(\) to anon, authenticated/,
  'capability discovery must require only the publishable project key');
assert.match(sql,
  /grant execute on function public\.lumno_push_setting_changes_v2\(uuid, jsonb\) to authenticated/,
  'protocol 2 writes must remain authenticated');
assert.match(sql,
  /v_rejected := v_rejected \|\| jsonb_build_array/,
  'protocol 2 must isolate invalid or unsupported items instead of aborting the batch');
assert.doesNotMatch(sql,
  /create or replace function public\.lumno_push_setting_changes\s*\(/,
  'the expand migration must not replace the deployed legacy push RPC');
assert.doesNotMatch(sql,
  /create or replace function public\.lumno_pull_setting_changes\s*\(/,
  'the expand migration must not replace the deployed legacy pull RPC');

console.log('sync protocol contract tests passed (old/new client and database matrix)');
