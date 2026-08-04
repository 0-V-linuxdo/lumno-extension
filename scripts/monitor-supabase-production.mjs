import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import { pathToFileURL } from 'node:url';

const PROJECT_REF = 'krpyocaoeqfwpepnsthc';
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const MANAGEMENT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const PUBLISHABLE_KEY = 'sb_publishable_mDUxTyAulyytM1LAnDYx-g_uoBOXBnp';
const MEDIA_GLOBAL_LIMIT_BYTES = 943_718_400;
const STATE_VERSION = 1;

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function incident(key, severity, title, summary) {
  return { key, severity, title, summary };
}

export function createManualTestIncident(enabled) {
  return enabled
    ? incident('manual_test', 'warning', '生产告警通道测试', '这是手动触发的合成事件；未检测到真实故障')
    : null;
}

export function evaluateSnapshot(snapshot) {
  const incidents = [];
  const signupHour = numberValue(snapshot.signup_hour);
  if (signupHour >= 55) {
    incidents.push(incident('signup_capacity', 'critical', '注册量接近全局上限', `最近 1 小时新账号 ${signupHour}/60`));
  } else if (signupHour >= 45) {
    incidents.push(incident('signup_capacity', 'warning', '注册量明显升高', `最近 1 小时新账号 ${signupHour}/60`));
  }

  const captchaHour = numberValue(snapshot.captcha_verified_hour);
  if (captchaHour >= 100) {
    incidents.push(incident('captcha_volume', 'warning', '登录验证流量异常升高', `最近 1 小时通过 Google 验签 ${captchaHour} 次`));
  }

  const syncHotAccounts = numberValue(snapshot.sync_hot_accounts);
  if (syncHotAccounts > 0) {
    incidents.push(incident(
      'sync_concurrency',
      'warning',
      '账号同步接近并发上限',
      `${syncHotAccounts} 个账号在当前分钟达到限额的 80%；峰值 注册 ${numberValue(snapshot.sync_max_register)}/20、推送 ${numberValue(snapshot.sync_max_push)}/30、拉取 ${numberValue(snapshot.sync_max_pull)}/60`,
    ));
  }

  const mediaBytes = numberValue(snapshot.media_active_bytes);
  const mediaRatio = mediaBytes / MEDIA_GLOBAL_LIMIT_BYTES;
  if (mediaRatio >= 0.85) {
    incidents.push(incident('media_capacity', 'critical', '媒体存储接近硬上限', `已使用 ${(mediaRatio * 100).toFixed(1)}%`));
  } else if (mediaRatio >= 0.7) {
    incidents.push(incident('media_capacity', 'warning', '媒体存储容量预警', `已使用 ${(mediaRatio * 100).toFixed(1)}%`));
  }

  const retentionAt = Date.parse(String(snapshot.retention_last_completed_at || ''));
  if (!Number.isFinite(retentionAt) || retentionAt < Date.now() - 26 * 60 * 60 * 1000) {
    incidents.push(incident('retention_stale', 'critical', '数据保留任务未按时完成', '最近成功时间已超过 26 小时'));
  }
  return incidents;
}

export function evaluateLogMetrics(edgeMetrics, postgresMetrics) {
  const incidents = [];
  const requests = numberValue(edgeMetrics.requests);
  const serverErrors = numberValue(edgeMetrics.server_errors);
  const errorRatio = requests > 0 ? serverErrors / requests : 0;
  if (serverErrors >= 5 && errorRatio >= 0.05) {
    incidents.push(incident('edge_5xx', 'critical', 'Supabase 5xx 错误率过高', `10 分钟内 ${serverErrors}/${requests}（${(errorRatio * 100).toFixed(1)}%）`));
  }
  if (numberValue(edgeMetrics.delete_errors) > 0) {
    incidents.push(incident('delete_account_5xx', 'critical', '删除账号接口失败', `10 分钟内 ${numberValue(edgeMetrics.delete_errors)} 次 5xx`));
  }
  if (numberValue(edgeMetrics.captcha_errors) >= 10) {
    incidents.push(incident('captcha_rejections', 'warning', '登录安全验证异常增多', `10 分钟内 ${numberValue(edgeMetrics.captcha_errors)} 次 4xx/5xx`));
  }
  if (numberValue(edgeMetrics.rate_limited) >= 20) {
    incidents.push(incident('rate_limit_surge', 'warning', '限流响应异常增多', `10 分钟内 ${numberValue(edgeMetrics.rate_limited)} 次 429`));
  }
  if (requests >= 500) {
    incidents.push(incident('request_surge', requests >= 1000 ? 'critical' : 'warning', 'Supabase 请求流量突增', `10 分钟内 ${requests} 次请求`));
  }
  const postgresErrors = numberValue(postgresMetrics.postgres_errors);
  if (postgresErrors >= 5) {
    incidents.push(incident('postgres_errors', 'critical', 'Postgres 错误异常增多', `10 分钟内 ${postgresErrors} 条 ERROR/FATAL/PANIC`));
  }
  return incidents;
}

export function calculateTransitions(previousState, incidents) {
  const previous = previousState?.active && typeof previousState.active === 'object'
    ? previousState.active
    : {};
  const current = Object.fromEntries(incidents.map((item) => [item.key, {
    severity: item.severity,
    title: item.title,
  }]));
  const started = incidents.filter((item) => !previous[item.key]);
  const escalated = incidents.filter((item) => previous[item.key] && previous[item.key].severity !== item.severity);
  const recovered = Object.entries(previous)
    .filter(([key]) => !current[key])
    .map(([key, value]) => ({ key, ...value }));
  return {
    started,
    escalated,
    recovered,
    nextState: { version: STATE_VERSION, active: current },
  };
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEndpoint(fetchImpl, name, url, options = {}) {
  try {
    const response = await fetchWithTimeout(fetchImpl, url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return null;
  } catch (_error) {
    return incident(`health_${name}`, 'critical', `${name} 健康检查失败`, `${url} 未在 8 秒内返回成功状态`);
  }
}

async function fetchLogMetrics(fetchImpl, token, now) {
  const start = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const end = now.toISOString();
  async function query(sql) {
    const parameters = new URLSearchParams({ sql, iso_timestamp_start: start, iso_timestamp_end: end });
    const response = await fetchWithTimeout(
      fetchImpl,
      `${MANAGEMENT_API}/analytics/endpoints/logs?${parameters}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error(`logs_http_${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.result) || !payload.result[0]) throw new Error('logs_result_missing');
    return payload.result[0];
  }
  const edgeSql = `select count() as requests,
    countIf(toInt32OrZero(log_attributes['response.status_code']) between 500 and 599) as server_errors,
    countIf(toInt32OrZero(log_attributes['response.status_code']) = 429) as rate_limited,
    countIf(position(log_attributes['request.path'], 'delete-account') > 0 and toInt32OrZero(log_attributes['response.status_code']) between 500 and 599) as delete_errors,
    countIf(position(log_attributes['request.path'], 'signup-captcha') > 0 and toInt32OrZero(log_attributes['response.status_code']) >= 400) as captcha_errors
    from logs where source_name = 'edge_logs'`;
  const postgresSql = `select count() as postgres_errors from logs
    where source_name = 'postgres_logs' and severity_text in ('ERROR', 'FATAL', 'PANIC')`;
  const [edgeMetrics, postgresMetrics] = await Promise.all([query(edgeSql), query(postgresSql)]);
  return { edgeMetrics, postgresMetrics };
}

async function fetchSnapshot(fetchImpl, monitorKey) {
  const response = await fetchWithTimeout(fetchImpl, `${PROJECT_URL}/functions/v1/monitor-snapshot`, {
    headers: { 'x-lumno-monitor-key': monitorKey },
  });
  if (!response.ok) throw new Error(`snapshot_http_${response.status}`);
  const payload = await response.json();
  if (payload.ok !== true || !payload.snapshot || typeof payload.snapshot !== 'object') {
    throw new Error('snapshot_invalid');
  }
  return payload.snapshot;
}

function formatNotification(transitions, now) {
  const lines = [`Lumno 生产告警 · ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}`];
  for (const item of [...transitions.started, ...transitions.escalated]) {
    lines.push(`${item.severity === 'critical' ? '🔴' : '🟠'} ${item.title}`);
    lines.push(`   ${item.summary}`);
  }
  for (const item of transitions.recovered) lines.push(`🟢 已恢复：${item.title}`);
  lines.push('项目：lumno / Tokyo');
  lines.push('处置手册：https://github.com/kubai087/lumno-extension/blob/main/docs/supabase-operations-runbook.md');
  return lines.join('\n');
}

async function sendFeishu(fetchImpl, webhookUrl, text) {
  const response = await fetchWithTimeout(fetchImpl, webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ msg_type: 'text', content: { text } }),
  });
  if (!response.ok) throw new Error(`feishu_http_${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0) throw new Error(`feishu_code_${payload.code}`);
}

function createSmtpReader(socket) {
  let buffer = '';
  const lines = [];
  const waiters = [];
  let failure = null;
  function flush() {
    while (waiters.length > 0 && (lines.length > 0 || failure)) {
      const waiter = waiters.shift();
      if (failure) waiter.reject(failure);
      else waiter.resolve(lines.shift());
    }
  }
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      lines.push(buffer.slice(0, newline).replace(/\r$/, ''));
      buffer = buffer.slice(newline + 1);
    }
    flush();
  });
  socket.on('error', (error) => { failure = error; flush(); });
  socket.on('close', () => { failure ||= new Error('smtp_connection_closed'); flush(); });
  return () => new Promise((resolve, reject) => {
    waiters.push({ resolve, reject });
    flush();
  });
}

async function sendSmtpMail(configuration, subject, body) {
  const socket = tls.connect({
    host: configuration.host,
    port: configuration.port,
    servername: configuration.host,
    rejectUnauthorized: true,
  });
  const nextLine = createSmtpReader(socket);
  async function readResponse(expected) {
    let line;
    do {
      line = await nextLine();
    } while (!/^\d{3} /.test(line));
    const status = Number(line.slice(0, 3));
    if (!expected.includes(status)) throw new Error(`smtp_status_${status}`);
  }
  async function command(value, expected) {
    socket.write(`${value}\r\n`);
    await readResponse(expected);
  }
  try {
    await readResponse([220]);
    await command('EHLO github-actions', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(configuration.user).toString('base64'), [334]);
    await command(Buffer.from(configuration.password).toString('base64'), [235]);
    await command(`MAIL FROM:<${configuration.user}>`, [250]);
    await command(`RCPT TO:<${configuration.to}>`, [250, 251]);
    await command('DATA', [354]);
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const message = [
      `From: Lumno Monitor <${configuration.user}>`,
      `To: ${configuration.to}`,
      `Subject: ${encodedSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@lumno.kubai.design>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body.replace(/^\./gm, '..'),
      '.',
    ].join('\r\n');
    socket.write(`${message}\r\n`);
    await readResponse([250]);
    await command('QUIT', [221]);
  } finally {
    socket.destroy();
  }
}

function readState(statePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return parsed?.version === STATE_VERSION ? parsed : { version: STATE_VERSION, active: {} };
  } catch (_error) {
    return { version: STATE_VERSION, active: {} };
  }
}

function writeState(statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  fs.writeFileSync(statePath, serialized, { mode: 0o600 });
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export async function runMonitor({
  env = process.env,
  fetchImpl = fetch,
  smtpSender = sendSmtpMail,
  now = new Date(),
  statePath = path.resolve('.monitor-state/supabase.json'),
} = {}) {
  const incidents = [];
  const publicChecks = await Promise.all([
    checkEndpoint(fetchImpl, 'Supabase Auth', `${PROJECT_URL}/auth/v1/health`, {
      headers: { apikey: PUBLISHABLE_KEY },
    }),
    checkEndpoint(fetchImpl, 'Supabase REST', `${PROJECT_URL}/rest/v1/`, {
      method: 'OPTIONS',
      headers: { apikey: PUBLISHABLE_KEY },
    }),
    checkEndpoint(fetchImpl, '验证码函数', `${PROJECT_URL}/functions/v1/signup-captcha`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://lumno.kubai.design' },
    }),
    checkEndpoint(fetchImpl, 'Lumno 登录页', 'https://lumno.kubai.design/account/'),
  ]);
  incidents.push(...publicChecks.filter(Boolean));

  if (!env.SUPABASE_MANAGEMENT_TOKEN) {
    incidents.push(incident('logs_unavailable', 'critical', '日志监控未配置', '缺少只读 Management API token'));
  } else {
    try {
      const metrics = await fetchLogMetrics(fetchImpl, env.SUPABASE_MANAGEMENT_TOKEN, now);
      incidents.push(...evaluateLogMetrics(metrics.edgeMetrics, metrics.postgresMetrics));
    } catch (_error) {
      incidents.push(incident('logs_unavailable', 'critical', 'Supabase 日志读取失败', '监控暂时无法判断 5xx、429 与数据库错误'));
    }
  }

  if (!env.LUMNO_MONITOR_KEY) {
    incidents.push(incident('snapshot_unavailable', 'critical', '内部指标监控未配置', '缺少专用监控密钥'));
  } else {
    try {
      incidents.push(...evaluateSnapshot(await fetchSnapshot(fetchImpl, env.LUMNO_MONITOR_KEY)));
    } catch (_error) {
      incidents.push(incident('snapshot_unavailable', 'critical', '内部指标快照读取失败', '注册、同步、媒体和保留任务暂时不可见'));
    }
  }

  const manualTest = createManualTestIncident(env.MONITOR_TEST_NOTIFICATION === '1');
  if (manualTest) incidents.push(manualTest);

  const previousState = readState(statePath);
  const transitions = calculateTransitions(previousState, incidents);
  const hasTransitions = transitions.started.length + transitions.escalated.length + transitions.recovered.length > 0;
  if (hasTransitions) {
    const message = formatNotification(transitions, now);
    const deliveries = [];
    if (env.FEISHU_ALERT_WEBHOOK_URL) {
      deliveries.push({
        channel: 'feishu',
        promise: sendFeishu(fetchImpl, env.FEISHU_ALERT_WEBHOOK_URL, message),
      });
    }
    if (env.FEISHU_SMTP_PASSWORD) {
      deliveries.push({
        channel: 'email',
        promise: smtpSender({
          host: 'smtp.feishu.cn',
          port: 465,
          user: 'i@kubai.design',
          password: env.FEISHU_SMTP_PASSWORD,
          to: 'i@kubai.design',
        }, `[Lumno ${incidents.some((item) => item.severity === 'critical') ? 'P0' : 'P1'}] 生产告警`, message),
      });
    }
    if (deliveries.length === 0) throw new Error('alert_channels_not_configured');
    const results = await Promise.allSettled(deliveries.map((item) => item.promise));
    results.forEach((result, index) => {
      process.stdout.write(`Alert delivery ${deliveries[index].channel}: ${result.status === 'fulfilled' ? 'ok' : 'failed'}.\n`);
    });
    if (results.every((result) => result.status === 'rejected')) {
      throw new Error('all_alert_channels_failed');
    }
  }

  const stateHash = writeState(statePath, transitions.nextState);
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `state_hash=${stateHash}\n`);
  return { incidents, transitions, stateHash };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  runMonitor().then(({ incidents, transitions }) => {
    const activeKeys = incidents.length > 0
      ? incidents.map((item) => `${item.key}:${item.severity}`).join(',')
      : 'none';
    process.stdout.write(`Supabase monitor completed: ${incidents.length} active incident(s), ${transitions.started.length + transitions.escalated.length + transitions.recovered.length} transition(s); active=${activeKeys}.\n`);
  }).catch((error) => {
    process.stderr.write(`Supabase monitor failed: ${String(error?.message || error)}\n`);
    process.exitCode = 1;
  });
}
