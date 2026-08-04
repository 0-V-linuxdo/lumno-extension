import { createAdminClient } from '../_shared/auth.ts';

const ACTION = 'lumno_oauth';
const ALLOWED_ORIGINS = new Set([
  'https://lumno.kubai.design',
  'http://127.0.0.1:4321',
  'http://localhost:4321'
]);
const ALLOWED_HOSTNAMES = new Set([
  'lumno.kubai.design',
  '127.0.0.1',
  'localhost'
]);
const MAX_BODY_BYTES = 8 * 1024;
const MAX_TOKEN_LENGTH = 4096;
const MAX_TOKEN_AGE_MS = 3 * 60 * 1000;

type CaptchaRequest = {
  action?: unknown;
  provider?: unknown;
  token?: unknown;
};

type RecaptchaResponse = {
  success?: unknown;
  score?: unknown;
  action?: unknown;
  challenge_ts?: unknown;
  hostname?: unknown;
  'error-codes'?: unknown;
};

function responseHeaders(origin: string): HeadersInit {
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin'
  };
}

function jsonResponse(status: number, payload: unknown, origin: string): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders(origin)
  });
}

function getRequestIp(request: Request): string {
  const raw = request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] || '';
  let value = raw.trim();
  const bracketed = value.match(/^\[([0-9a-f:]+)\](?::\d+)?$/i);
  if (bracketed) value = bracketed[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.split(':')[0];
  if (!value || value.length > 64 || !/^[0-9a-f:.]+$/i.test(value)) {
    throw new Error('request_ip_unavailable');
  }
  return value;
}

function readSecret(): string {
  const secret = String(Deno.env.get('RECAPTCHA_SECRET_KEY') || '').trim();
  if (!secret) throw new Error('recaptcha_not_configured');
  return secret;
}

function minimumScore(): number {
  const configured = Number(Deno.env.get('RECAPTCHA_MIN_SCORE') || 0.5);
  return Number.isFinite(configured) && configured >= 0 && configured <= 1 ? configured : 0.5;
}

async function readBody(request: Request): Promise<CaptchaRequest> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) throw new Error('invalid_payload');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error('invalid_payload');
  const parsed = raw ? JSON.parse(raw) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_payload');
  }
  return parsed as CaptchaRequest;
}

function validateVerification(result: RecaptchaResponse): number {
  const score = Number(result.score);
  const timestamp = Date.parse(String(result.challenge_ts || ''));
  const errorCodes = Array.isArray(result['error-codes']) ? result['error-codes'] : [];
  if (
    result.success !== true ||
    errorCodes.length > 0 ||
    result.action !== ACTION ||
    !ALLOWED_HOSTNAMES.has(String(result.hostname || '').toLowerCase()) ||
    !Number.isFinite(score) ||
    score < minimumScore() ||
    !Number.isFinite(timestamp) ||
    timestamp < Date.now() - MAX_TOKEN_AGE_MS ||
    timestamp > Date.now() + 30_000
  ) {
    throw new Error('captcha_rejected');
  }
  return score;
}

Deno.serve(async (request) => {
  const origin = String(request.headers.get('origin') || '').trim();
  if (!ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(403, { ok: false, error: 'origin_not_allowed' }, origin);
  }
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' }, origin);
  }

  try {
    const body = await readBody(request);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const provider = typeof body.provider === 'string' ? body.provider.toLowerCase() : '';
    if (
      body.action !== ACTION ||
      !['google', 'github'].includes(provider) ||
      !token ||
      token.length > MAX_TOKEN_LENGTH
    ) {
      return jsonResponse(400, { ok: false, error: 'invalid_payload' }, origin);
    }

    const requestIp = getRequestIp(request);
    const parameters = new URLSearchParams({
      secret: readSecret(),
      response: token,
      remoteip: requestIp
    });
    const verificationResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: parameters,
      signal: AbortSignal.timeout(5000)
    });
    if (!verificationResponse.ok) throw new Error('captcha_upstream_failed');
    const score = validateVerification(await verificationResponse.json() as RecaptchaResponse);

    const { error } = await createAdminClient().rpc('lumno_record_signup_captcha_pass', {
      p_origin_ip: requestIp,
      p_provider: provider,
      p_score: score
    });
    if (error) {
      const rateLimited = error.code === '42901';
      return jsonResponse(rateLimited ? 429 : 500, {
        ok: false,
        error: rateLimited ? 'captcha_rate_limited' : 'captcha_pass_failed'
      }, origin);
    }
    return jsonResponse(200, { ok: true }, origin);
  } catch (error) {
    const message = String((error as { message?: unknown } | null)?.message || error || '');
    const invalidPayload = error instanceof SyntaxError || message === 'invalid_payload';
    const rejected = message === 'captcha_rejected';
    return jsonResponse(invalidPayload ? 400 : rejected ? 403 : 503, {
      ok: false,
      error: invalidPayload ? 'invalid_payload' : rejected ? 'captcha_rejected' : 'captcha_unavailable'
    }, origin);
  }
});
