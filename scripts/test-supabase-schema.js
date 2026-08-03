const assert = require('assert');
const fs = require('fs');

const schema = require('../src/shared/cloud-sync-schema.js');

const migrationPath = 'supabase/migrations/202608010001_lumno_cloud.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
const retentionMigrationPath = 'supabase/migrations/202608020002_data_retention.sql';
const retentionSql = fs.readFileSync(retentionMigrationPath, 'utf8');
const syncAllowlistMigrationPath =
  'supabase/migrations/202608020003_selection_quick_actions_sync_key.sql';
const syncAllowlistSql = fs.readFileSync(syncAllowlistMigrationPath, 'utf8');
const fullConfigurationMigrationPath =
  'supabase/migrations/202608020005_full_configuration_and_media_assets.sql';
const fullConfigurationSql = fs.readFileSync(fullConfigurationMigrationPath, 'utf8');
const hardeningMigrationPath =
  'supabase/migrations/202608030006_media_gateway_and_resource_limits.sql';
const hardeningSql = fs.readFileSync(hardeningMigrationPath, 'utf8');
const retiredModerationMigrationPath =
  'supabase/migrations/202608030007_sightengine_moderation_budget.sql';
const retiredModerationSql = fs.readFileSync(retiredModerationMigrationPath, 'utf8');
const privateMediaMigrationPath =
  'supabase/migrations/202608030008_private_active_media_sync.sql';
const privateMediaSql = fs.readFileSync(privateMediaMigrationPath, 'utf8');
const authTriggerHardeningMigrationPath =
  'supabase/migrations/202608030009_revoke_auth_trigger_rpc.sql';
const authTriggerHardeningSql = fs.readFileSync(authTriggerHardeningMigrationPath, 'utf8');

function run() {
  const syncSchemaSql = `${sql}\n${syncAllowlistSql}\n${fullConfigurationSql}\n${hardeningSql}`;
  schema.SYNC_KEYS.forEach((key) => {
    assert(syncSchemaSql.includes(`'${key}'`), `database sync allowlist should include ${key}`);
  });
  const initialSyncFunctionSql = sql.slice(
    sql.indexOf('create or replace function public.lumno_is_sync_key'),
    sql.indexOf('create or replace function public.lumno_is_usage_metric')
  );
  const extractSyncKeys = (source) => Array.from(
    source.matchAll(/'(_x_extension_[^']+)'/g),
    (match) => match[1]
  );
  const expectedFollowupKeys = new Set(schema.SYNC_KEYS);
  const actualFollowupKeys = new Set(extractSyncKeys(fullConfigurationSql));
  assert.deepStrictEqual(
    Array.from(actualFollowupKeys).sort(),
    Array.from(expectedFollowupKeys).sort(),
    'the latest follow-up migration should replace the complete sync allowlist without dropping keys'
  );
  schema.USAGE_METRICS.forEach((metric) => {
    assert(sql.includes(`'${metric}'`), `database usage allowlist should include ${metric}`);
  });

  [
    'lumno_profiles',
    'lumno_devices',
    'lumno_settings',
    'lumno_sync_operations',
    'lumno_assets',
    'lumno_consents',
    'lumno_usage_ingest_batches',
    'lumno_usage_daily'
  ].forEach((table) => {
    assert(
      sql.includes(`alter table public.${table} enable row level security;`),
      `${table} should enable RLS`
    );
    assert(
      sql.includes(`alter table public.${table} force row level security;`),
      `${table} should force RLS`
    );
  });

  assert.match(sql, /create policy lumno_settings_select_own[\s\S]*?\(select auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(
    sql,
    /grant\s+(?:insert|update|delete|all)[^;]*on\s+public\.lumno_settings\s+to\s+authenticated/i,
    'settings writes must go through the concurrency-safe RPC'
  );
  assert.doesNotMatch(
    sql,
    /grant\s+[^;]*on\s+public\.lumno_usage_(?:daily|ingest_batches)\s+to\s+(?:anon|authenticated)/i,
    'usage tables must not be client-readable or client-writable'
  );
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /order by item->>'key'/, 'sync writes should lock settings in a deterministic order');
  assert.match(sql, /v_operation_id is null or v_key is null/,
    'sync writes should reject missing operation ids and keys explicitly');
  assert.match(sql, /Operation id was already used for a different setting/,
    'idempotency keys must not be reusable across settings');
  assert.match(sql, /coalesce\(jsonb_typeof\(p_changes\), ''\) <> 'array'/,
    'null or non-array change payloads should be rejected before expansion');
  assert.match(sql, /on conflict \(user_id, batch_id\) do nothing/, 'usage batches should be idempotent');
  assert.match(sql, /'lumno-user-media',[\s\S]*?false,[\s\S]*?5242880/);
  assert.match(sql, /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  assert.match(sql, /unique \(user_id, client_asset_id\)/,
    'wallpaper ids must remain stable across devices');
  assert.match(sql, /A user may store at most 20 active media assets/,
    'the database should enforce a per-user media count cap');
  assert.match(fullConfigurationSql, /asset_kind in \('wallpaper', 'shortcut_icon'\)/,
    'private media should distinguish wallpapers from shortcut icons');
  assert.match(fullConfigurationSql, /\^shortcut-icon-\[0-9a-f\]\{64\}\$/,
    'shortcut icon asset ids should be deterministic and constrained');
  assert.match(fullConfigurationSql, /byte_size <= 163840/,
    'shortcut icons should retain their tighter client-side size limit in the database');
  assert.match(fullConfigurationSql, /asset_kind = new\.asset_kind/,
    'wallpapers and shortcut icons should each receive an independent asset quota');
  assert.match(hardeningSql, /A user may store at most 48 MiB of active media/,
    'the final schema should enforce a hard account byte budget');
  assert.match(hardeningSql, /lumno_authorize_media_upload/,
    'media uploads should pass an atomic server-side quota and rate check');
  assert.match(hardeningSql, /Media upload rate limit exceeded/,
    'media uploads should have a per-account hourly rate limit');
  assert.match(hardeningSql, /Monthly media egress quota exceeded/,
    'media downloads should have a per-account monthly egress budget');
  assert.match(hardeningSql, /drop policy if exists lumno_media_insert_own on storage\.objects/,
    'authenticated clients must lose direct Storage upload access');
  assert.match(hardeningSql, /revoke insert, update, delete on public\.lumno_assets from authenticated/,
    'authenticated clients must not mutate asset metadata directly');
  assert.match(hardeningSql, /revoke insert, update, delete on public\.lumno_devices from authenticated/,
    'authenticated clients must register devices only through the capped RPC');
  assert.match(hardeningSql, /at most 10 active devices/,
    'device registration should enforce a per-account cap');
  assert.match(hardeningSql, /octet_length\(new\.value::text\) > 32768/,
    'each synchronized JSON value should have a byte bound');
  assert.match(hardeningSql, /not public\.lumno_jsonb_within_depth\(new\.value, 8\)/,
    'each synchronized JSON value should have a nesting-depth bound');
  assert.match(hardeningSql, /remaining_depth <= 1/,
    'depth validation should stop after the allowed depth instead of recursing through attacker input');
  assert.match(hardeningSql, /allowed_mime_types = array\['image\/png', 'image\/webp'\]/,
    'the private bucket should accept only normalized output formats');
  assert.doesNotMatch(retiredModerationSql, /create\s+(?:table|function)/i,
    'the withdrawn moderation migration version should remain a no-op');
  assert.match(privateMediaSql, /drop table if exists public\.lumno_media_moderation_events/,
    'obsolete third-party moderation accounting should be removed');
  assert.match(privateMediaSql, /at most two active wallpapers/,
    'the database should enforce one active light and one active dark wallpaper');
  assert.match(privateMediaSql, /at most 20 active shortcut icons/,
    'all shortcut icons should retain their bounded cloud backup');
  assert.match(privateMediaSql, /10485760/,
    'the final schema should enforce a 10 MiB active-media budget');
  assert.match(privateMediaSql, /943718400/,
    'global uploads should stop before exhausting the storage allowance');
  assert.match(privateMediaSql, /v_recent_uploads >= 40/,
    'media uploads should retain a per-account hourly request gate');
  assert.match(privateMediaSql, /33554432/,
    'media uploads should have a 32 MiB daily byte budget');
  assert.match(privateMediaSql, /268435456/,
    'media uploads should have a 256 MiB monthly byte budget');
  assert.match(privateMediaSql, /134217728/,
    'media downloads should have a 128 MiB monthly egress budget');
  assert.match(privateMediaSql, /pg_advisory_xact_lock/,
    'global and per-user quota checks should be serialized');
  assert.match(privateMediaSql,
    /revoke all on function public\.lumno_authorize_media_upload[\s\S]*?from public, anon, authenticated/,
    'quota functions should remain service-role-only');
  assert.match(authTriggerHardeningSql,
    /revoke all on function public\.lumno_handle_new_user\(\)[\s\S]*?from public, anon, authenticated/,
    'the auth trigger function must not remain exposed as a public RPC');

  ['lumno_usage_monthly_totals', 'lumno_maintenance_state'].forEach((table) => {
    assert(
      retentionSql.includes(`alter table public.${table} enable row level security;`),
      `${table} should enable RLS`
    );
    assert(
      retentionSql.includes(`alter table public.${table} force row level security;`),
      `${table} should force RLS`
    );
  });
  assert.match(retentionSql, /interval '24 months'/,
    'account-linked daily usage should have an explicit 24-month retention limit');
  assert.match(retentionSql, /insert into public\.lumno_usage_monthly_totals[\s\S]*?group by[\s\S]*?metric/i,
    'expired linked usage should roll up to non-identifying monthly metric totals');
  assert.doesNotMatch(retentionSql, /create table if not exists public\.lumno_usage_monthly_totals[\s\S]*?user_id[\s\S]*?primary key/i,
    'long-term monthly totals must not retain a user identifier');
  assert.match(retentionSql, /pg_advisory_xact_lock/,
    'retention rollups should serialize to prevent double counting');
  assert.match(retentionSql, /for each statement execute function public\.lumno_maybe_apply_data_retention\(\)/,
    'retention should run automatically after telemetry ingestion');
  assert.match(retentionSql, /revoke all on public\.lumno_usage_monthly_totals from public, anon, authenticated/,
    'long-term internal totals must not be client-readable');

  console.log('supabase schema tests passed');
}

run();
