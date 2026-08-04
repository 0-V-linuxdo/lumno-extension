const assert = require('assert');
const fs = require('fs');

async function run() {
  const monitor = await import('./monitor-supabase-production.mjs');
  const monitorSource = fs.readFileSync('scripts/monitor-supabase-production.mjs', 'utf8');
  assert.match(monitorSource, /auth\/v1\/health[\s\S]*?headers: \{ apikey: PUBLISHABLE_KEY \}/,
    'the Auth health probe should include the required publishable API key');
  assert.match(monitorSource, /'Supabase REST'[\s\S]*?method: 'OPTIONS'/,
    'the REST health probe should avoid a privileged schema request');
  assert.match(monitorSource, /querySources\('source'\)[\s\S]*?querySources\('source_name'\)/,
    'log queries should support both the current source field and the announced source_name migration');
  const healthy = monitor.evaluateSnapshot({
    signup_hour: 12,
    captcha_verified_hour: 20,
    sync_hot_accounts: 0,
    media_active_bytes: 100,
    retention_last_completed_at: new Date().toISOString()
  });
  assert.deepStrictEqual(healthy, []);

  const stressed = monitor.evaluateSnapshot({
    signup_hour: 56,
    captcha_verified_hour: 101,
    sync_hot_accounts: 2,
    sync_max_register: 18,
    sync_max_push: 25,
    sync_max_pull: 50,
    media_active_bytes: 850000000,
    retention_last_completed_at: '2000-01-01T00:00:00Z'
  });
  assert(stressed.some((item) => item.key === 'signup_capacity' && item.severity === 'critical'));
  assert(stressed.some((item) => item.key === 'sync_concurrency'));
  assert(stressed.some((item) => item.key === 'media_capacity' && item.severity === 'critical'));
  assert(stressed.some((item) => item.key === 'retention_stale'));

  const logIncidents = monitor.evaluateLogMetrics({
    requests: 600,
    server_errors: 40,
    delete_errors: 1,
    captcha_errors: 10,
    rate_limited: 22
  }, { postgres_errors: 6 });
  ['edge_5xx', 'delete_account_5xx', 'captcha_rejections', 'rate_limit_surge', 'request_surge', 'postgres_errors']
    .forEach((key) => assert(logIncidents.some((item) => item.key === key), `${key} should alert`));

  const first = monitor.calculateTransitions({ version: 1, active: {} }, stressed);
  assert.strictEqual(first.started.length, stressed.length);
  assert.strictEqual(first.recovered.length, 0);
  const unchanged = monitor.calculateTransitions(first.nextState, stressed);
  assert.strictEqual(unchanged.started.length, 0);
  assert.strictEqual(unchanged.escalated.length, 0);
  assert.strictEqual(unchanged.recovered.length, 0);
  const recovered = monitor.calculateTransitions(first.nextState, []);
  assert.strictEqual(recovered.recovered.length, stressed.length);

  assert.strictEqual(monitor.createManualTestIncident(false), null);
  assert.deepStrictEqual(monitor.createManualTestIncident(true), {
    key: 'manual_test',
    severity: 'warning',
    title: '生产告警通道测试',
    summary: '这是手动触发的合成事件；未检测到真实故障'
  });
  console.log('Supabase production monitor tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
