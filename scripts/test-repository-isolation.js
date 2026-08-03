const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');

const cloudConfig = require('../src/shared/cloud-config.js');

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
const trackedSecretFiles = trackedFiles.filter((file) => (
  /(^|\/)\.env(?:\.|$)/.test(file) && !/\.example$/.test(file)
));
assert.deepStrictEqual(trackedSecretFiles, [], 'runtime environment secret files must not be tracked');

const clientFiles = trackedFiles.filter((file) => (
  file === 'manifest.json' || file.startsWith('src/')
)).filter((file) => fs.existsSync(file) && fs.statSync(file).isFile());
const clientSource = clientFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.doesNotMatch(clientSource, /sb_secret_[A-Za-z0-9_-]+/,
  'Supabase secret keys must never enter extension source');
assert.doesNotMatch(clientSource, /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY\s*[:=]\s*['"][^'"]+/,
  'service-role credentials must stay in Edge Function environment variables');
assert.match(cloudConfig.PUBLISHABLE_KEY, /^sb_publishable_/,
  'the extension may contain only the public Supabase client identifier');

const oauthClientIds = Object.values(cloudConfig.OAUTH_CLIENT_IDS);
assert.strictEqual(new Set(oauthClientIds).size, oauthClientIds.length,
  'development and store builds must use distinct OAuth public clients');

const packageScript = fs.readFileSync('scripts/package-store.js', 'utf8');
assert.match(packageScript, /delete storeManifest\.key/);
assert.match(packageScript, /delete storeManifest\.externally_connectable/);
assert.doesNotMatch(packageScript, /packageRoots\s*=\s*\[[\s\S]*?'supabase'/,
  'database migrations and Edge Functions must never enter the extension package');

console.log('repository isolation tests passed');
