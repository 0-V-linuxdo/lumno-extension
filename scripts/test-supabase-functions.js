const assert = require('assert');
const fs = require('fs');

const schema = require('../src/shared/cloud-sync-schema.js');

const usageSchema = fs.readFileSync('supabase/functions/_shared/usage-schema.ts', 'utf8');
const telemetry = fs.readFileSync('supabase/functions/telemetry-ingest/index.ts', 'utf8');
const deletion = fs.readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
const media = fs.readFileSync('supabase/functions/media-asset/index.ts', 'utf8');
const mediaValidation = fs.readFileSync('supabase/functions/_shared/media.ts', 'utf8');
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

  assert.match(
    supabaseConfig,
    /\[auth\.email\][\s\S]*?enable_signup\s*=\s*false/,
    'new email signups must remain disabled'
  );
  assert.doesNotMatch(
    supabaseConfig,
    /\[auth\.email\.template\.|content_path\s*=/,
    'retired email OTP templates must not remain in deployable config'
  );

  const removeObjectsAt = deletion.indexOf('.remove(');
  const deleteUserAt = deletion.indexOf('.deleteUser(');
  assert(removeObjectsAt >= 0 && deleteUserAt > removeObjectsAt,
    'private objects should be deleted before the auth user cascades database rows');
  assert.match(deletion, /confirmation[^\n]+!== 'DELETE'/);
  assert.match(deletion, /listObjectPathsRecursively/,
    'account deletion should enumerate the complete user prefix recursively');
  assert.doesNotMatch(deletion, /\$\{userPrefix\}\/(?:wallpapers|wallpaper-thumbs|shortcut-icons)/,
    'account deletion must not depend on a fixed list of media directories');

  assert.match(media, /lumno_authorize_media_upload/);
  assert.match(media, /lumno_reserve_media_moderation/,
    'uploads should reserve global free moderation capacity before calling the provider');
  assert.match(media, /lumno_record_media_egress/);
  assert.match(media, /inspectImage\(responseBody, expectedMimeType\)/,
    'gateway downloads should re-inspect v2 object bytes before returning them');
  assert.match(media, /await requireModeration\(/,
    'actual media bytes should be moderated before entering Storage');
  assert.match(media, /await removePaths\([\s\S]*?deleted_at/,
    'object deletion should precede the metadata tombstone');
  assert.match(mediaValidation, /media_moderation_unavailable/,
    'production uploads should fail closed when moderation is unavailable');
  assert.match(mediaValidation, /redirect: 'error'/,
    'the moderation service must not follow redirects');
  assert.match(mediaValidation, /https:\/\/api\.sightengine\.com\/1\.0\/check\.json/,
    'moderation should use the fixed Sightengine HTTPS endpoint');
  assert.match(mediaValidation, /SIGHTENGINE_API_USER/);
  assert.match(mediaValidation, /SIGHTENGINE_API_SECRET/);
  assert.match(mediaValidation, /nudity-2\.1/);
  assert.match(mediaValidation, /recreational_drug/);
  assert.match(mediaValidation, /gambling/);
  assert.match(mediaValidation, /text-content-2\.0/);
  assert.match(mediaValidation, /png_metadata_not_allowed/);
  assert.match(mediaValidation, /webp_metadata_not_allowed/);
  assert.match(mediaValidation, /MAX_WALLPAPER_BYTES = 2 \* 1024 \* 1024/);
  assert.match(mediaValidation, /MAX_ICON_BYTES = 96 \* 1024/);
  assert.match(supabaseConfig, /\[functions\.media-asset\][\s\S]*?verify_jwt\s*=\s*false/);

  console.log('supabase Edge Function tests passed');
}

run();
