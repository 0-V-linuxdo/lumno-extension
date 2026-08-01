const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8');
}

function assertPathMissing(relativePath) {
  assert.ok(!fs.existsSync(repoPath(relativePath)), `${relativePath} should be removed`);
}

[
  'src/background/telemetry.js',
  'src/shared/telemetry-schema.js',
  'serverless/tencent-scf-telemetry-ingest',
  'docs/telemetry-plan.md',
  'scripts/test-telemetry-runtime.js',
  'scripts/test-telemetry-schema.js',
  'scripts/test-telemetry-ingest-sanitize.js',
  'scripts/test-options-telemetry-copy.js'
].forEach(assertPathMissing);

const analyticsRuntime = read('src/background/usage-analytics-runtime.js');
const analyticsSchema = read('src/shared/cloud-sync-schema.js');
const accountUi = read('src/options/options.html');
const edgeIngest = read('supabase/functions/telemetry-ingest/index.ts');

assert.match(analyticsRuntime, /if \(!schema\.USAGE_METRICS\.includes\(metric\) \|\| !\(await isConsented\(\)\)\)/,
  'usage counters must not be created before explicit consent');
assert.match(analyticsRuntime, /usage\.clear\(\)|CLOUD_LOCAL_KEYS\.usage/,
  'pending local usage counters should be removable');
assert.match(analyticsSchema, /FORBIDDEN_ANALYTICS_KEY_PATTERN/,
  'the analytics data contract should reject browsing-value field names');
assert.match(accountUi, /id="_x_extension_cloud_analytics_toggle_2026_unique_" type="checkbox" disabled/,
  'analytics consent should be off and disabled until sign-in');
assert.match(accountUi, /不会上传 URL、搜索词、网页标题、历史记录或书签内容/,
  'the consent surface should prominently disclose excluded browsing data');
assert.match(accountUi, /与账号关联[\s\S]*?最多保留 24 个月/,
  'the consent surface should disclose account linkage and the detailed retention period');
assert.doesNotMatch(accountUi, /匿名化产品使用统计|去识别化产品使用统计/,
  'account-linked analytics must not be described as anonymous');
assert.match(edgeIngest, /sanitizeUsageBatch/,
  'the server should independently sanitize every usage batch');

console.log('privacy-gated usage statistics tests passed');
