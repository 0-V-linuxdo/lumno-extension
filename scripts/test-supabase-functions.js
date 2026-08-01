const assert = require('assert');
const fs = require('fs');
const path = require('path');

const schema = require('../src/shared/cloud-sync-schema.js');

const usageSchema = fs.readFileSync('supabase/functions/_shared/usage-schema.ts', 'utf8');
const telemetry = fs.readFileSync('supabase/functions/telemetry-ingest/index.ts', 'utf8');
const deletion = fs.readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
const authorization = fs.readFileSync('supabase/functions/_shared/auth.ts', 'utf8');
const supabaseConfig = fs.readFileSync('supabase/config.toml', 'utf8');

function run() {
  schema.USAGE_METRICS.forEach((metric) => {
    assert(
      usageSchema.includes(`'${metric}'`),
      `Edge Function usage allowlist should include ${metric}`
    );
  });

  [
    'extension_version',
    'locale',
    'browser_family',
    'platform_family'
  ].forEach((dimension) => {
    assert(usageSchema.includes(`'${dimension}'`), `usage dimension should include ${dimension}`);
  });

  assert.match(usageSchema, /hasExactOrSubsetKeys\(value, new Set\(\[/);
  assert.match(usageSchema, /value\.schema_version !== 1/);
  assert.match(telemetry, /sanitizeUsageBatch\(await readSmallJson\(request\)\)/);
  assert.match(telemetry, /lumno_ingest_usage_batch/);
  assert.match(authorization, /userClient\.auth\.getUser\(\)/);
  assert.match(authorization, /SUPABASE_PUBLISHABLE_KEYS/);
  assert.match(authorization, /SUPABASE_SECRET_KEYS/);

  const templatePath = supabaseConfig.match(/content_path\s*=\s*"([^"]+)"/)?.[1];
  assert(templatePath, 'Supabase config should declare an OTP email template');
  assert(
    fs.existsSync(path.resolve(templatePath)),
    `Supabase OTP template should resolve from the repository root: ${templatePath}`
  );

  const removeObjectsAt = deletion.indexOf('.remove(');
  const deleteUserAt = deletion.indexOf('.deleteUser(');
  assert(removeObjectsAt >= 0 && deleteUserAt > removeObjectsAt,
    'private objects should be deleted before the auth user cascades database rows');
  assert.match(deletion, /confirmation[^\n]+!== 'DELETE'/);
  assert.match(deletion, /\$\{userPrefix\}\/wallpapers/);
  assert.match(deletion, /\$\{userPrefix\}\/wallpaper-thumbs/);

  console.log('supabase Edge Function tests passed');
}

run();
