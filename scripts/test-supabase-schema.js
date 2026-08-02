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

function run() {
  const syncSchemaSql = `${sql}\n${syncAllowlistSql}`;
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
  const expectedFollowupKeys = new Set([
    ...extractSyncKeys(initialSyncFunctionSql),
    '_x_extension_selection_quick_actions_enabled_2026_unique_'
  ]);
  const actualFollowupKeys = new Set(extractSyncKeys(syncAllowlistSql));
  assert.deepStrictEqual(
    Array.from(actualFollowupKeys).sort(),
    Array.from(expectedFollowupKeys).sort(),
    'the follow-up migration should replace the complete sync allowlist without dropping legacy keys'
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
  assert.match(sql, /storage_path = name or thumbnail_path = name/,
    'storage uploads must have an owned metadata row before accepting bytes');

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
