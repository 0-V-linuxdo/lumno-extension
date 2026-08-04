const assert = require('assert');
const fs = require('fs');

const schema = require('../src/shared/cloud-sync-schema.js');

const usageSchema = fs.readFileSync('supabase/functions/_shared/usage-schema.ts', 'utf8');
const telemetry = fs.readFileSync('supabase/functions/telemetry-ingest/index.ts', 'utf8');
const deletion = fs.readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
const media = fs.readFileSync('supabase/functions/media-asset/index.ts', 'utf8');
const mediaValidation = fs.readFileSync('supabase/functions/_shared/media.ts', 'utf8');
const authorization = fs.readFileSync('supabase/functions/_shared/auth.ts', 'utf8');
const signupCaptcha = fs.readFileSync('supabase/functions/signup-captcha/index.ts', 'utf8');
const monitorSnapshot = fs.readFileSync('supabase/functions/monitor-snapshot/index.ts', 'utf8');
const supabaseConfig = fs.readFileSync('supabase/config.toml', 'utf8');
const localSmoke = fs.readFileSync('scripts/smoke-supabase-local.js', 'utf8');
const remoteSmoke = fs.readFileSync('scripts/smoke-supabase-remote.js', 'utf8');

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
  assert.match(telemetry, /error\.code === '42901'/,
    'database telemetry limits should map to an HTTP rate-limit response');
  assert.match(telemetry, /ingest_rate_limited/);
  assert.match(authorization, /userClient\.auth\.getUser\(\)/);
  assert.match(authorization, /SUPABASE_PUBLISHABLE_KEYS/);
  assert.match(authorization, /SUPABASE_SECRET_KEYS/);

  assert.match(
    supabaseConfig,
    /\[auth\.email\][\s\S]*?enable_signup\s*=\s*false/,
    'new email signups must remain disabled'
  );
  assert.match(
    supabaseConfig,
    /\[auth\.rate_limit\][\s\S]*?sign_in_sign_ups\s*=\s*20/,
    'Auth sign-in and signup bursts should use the reviewed project limit'
  );
  assert.match(
    supabaseConfig,
    /\[auth\.hook\.before_user_created\][\s\S]*?enabled\s*=\s*true[\s\S]*?lumno_before_user_created/,
    'the deployable Auth configuration should enable the database signup hook'
  );
  assert.doesNotMatch(
    supabaseConfig,
    /\[auth\.email\.template\.|content_path\s*=/,
    'retired email OTP templates must not remain in deployable config'
  );
  [localSmoke, remoteSmoke].forEach((source) => {
    assert.match(source, /app_metadata:\s*\{ lumno_system_fixture: true \}/,
      'service-role smoke users must carry the private Auth-hook bypass marker');
  });

  const removeObjectsAt = deletion.indexOf('.remove(');
  const deleteUserAt = deletion.indexOf('.deleteUser(');
  assert(removeObjectsAt >= 0 && deleteUserAt > removeObjectsAt,
    'private objects should be deleted before the auth user cascades database rows');
  assert.match(deletion, /confirmation[^\n]+!== 'DELETE'/);
  assert.match(deletion, /listObjectPathsRecursively/,
    'account deletion should enumerate the complete user prefix recursively');
  assert.doesNotMatch(deletion, /\$\{userPrefix\}\/(?:wallpapers|wallpaper-thumbs|shortcut-icons)/,
    'account deletion must not depend on a fixed list of media directories');
  assert.match(deletion, /lumno_consume_delete_step_up_session/,
    'account deletion must atomically consume the independent step-up session');

  assert.match(media, /lumno_authorize_media_upload/);
  assert(
    media.indexOf("rpc(\n    'lumno_acquire_media_upload_lease'") <
      media.indexOf("rpc('lumno_authorize_media_upload'"),
    'the logical-asset lease must be acquired before quota events are recorded'
  );
  assert(
    media.indexOf("rpc(\n    'lumno_acquire_media_upload_lease'") < media.indexOf('.upload('),
    'a logical media asset must be leased before its Storage objects are uploaded'
  );
  assert.match(media, /lumno_commit_media_asset/,
    'media metadata must use the lease-fenced commit RPC');
  assert.doesNotMatch(media, /\.upsert\(/,
    'the Edge Function must not bypass the lease fence with a second REST metadata write');
  assert.match(media, /finally \{[\s\S]*?lumno_release_media_upload_lease/,
    'media replacement leases must be released on success and failure');
  assert.match(media, /lumno_record_media_egress/);
  assert(
    media.indexOf("rpc('lumno_record_media_egress'") < media.indexOf('.download(path)'),
    'egress quota must be reserved before the privileged Storage download'
  );
  assert.match(media, /inspectImage\(responseBody, expectedMimeType\)/,
    'gateway downloads should re-inspect v2 object bytes before returning them');
  assert.doesNotMatch(media, /requireModeration|lumno_reserve_media_moderation/,
    'private media sync should not depend on a third-party content-review service');
  assert.match(media, /await removePaths\([\s\S]*?deleted_at/,
    'object deletion should precede the metadata tombstone');
  assert.doesNotMatch(mediaValidation, /Sightengine|SIGHTENGINE|api\.sightengine\.com/,
    'media validation should not send private wallpaper bytes to a moderation provider');
  assert.match(mediaValidation, /png_metadata_not_allowed/);
  assert.match(mediaValidation, /webp_metadata_not_allowed/);
  assert.match(mediaValidation, /MAX_WALLPAPER_BYTES = 2 \* 1024 \* 1024/);
  assert.match(mediaValidation, /MAX_ICON_BYTES = 96 \* 1024/);
  assert.match(supabaseConfig, /\[functions\.media-asset\][\s\S]*?verify_jwt\s*=\s*false/);
  assert.match(supabaseConfig, /\[functions\.signup-captcha\][\s\S]*?verify_jwt\s*=\s*false/);
  assert.match(signupCaptcha, /https:\/\/www\.google\.com\/recaptcha\/api\/siteverify/,
    'CAPTCHA tokens should be verified with Google only from the Edge Function');
  assert.match(signupCaptcha, /result\.action !== ACTION/,
    'CAPTCHA verification should bind the token to the OAuth action');
  assert.match(signupCaptcha, /ALLOWED_HOSTNAMES\.has/,
    'CAPTCHA verification should validate the issuing hostname');
  assert.match(signupCaptcha, /errorCodes\.length > 0/,
    'quota or replay errors must fail closed even if a score is returned');
  assert.match(signupCaptcha, /score < minimumScore\(\)/,
    'low-confidence traffic should be rejected server-side');
  assert.match(signupCaptcha, /lumno_record_signup_captcha_pass/,
    'a successful Google verification should mint a short database pass');
  assert.doesNotMatch(signupCaptcha, /console\.(?:log|error)|token\s*:/,
    'the function must not log or echo the CAPTCHA token');
  assert.match(supabaseConfig, /\[functions\.monitor-snapshot\][\s\S]*?verify_jwt\s*=\s*false/);
  assert.match(monitorSnapshot, /safeEqual\(suppliedKey, expectedKey\)/,
    'the monitoring endpoint should compare its dedicated secret without early exit');
  assert.match(monitorSnapshot, /lumno_get_monitor_snapshot/,
    'the monitoring endpoint should return only the reviewed aggregate RPC');
  assert.doesNotMatch(monitorSnapshot, /select\(|\.from\(/,
    'the Edge Function should not query arbitrary internal tables directly');

  console.log('supabase Edge Function tests passed');
}

run();
