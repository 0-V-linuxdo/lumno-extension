import { createAdminClient } from '../_shared/auth.ts';

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }
  const expectedKey = String(Deno.env.get('LUMNO_MONITOR_KEY') || '').trim();
  const suppliedKey = String(request.headers.get('x-lumno-monitor-key') || '').trim();
  if (!expectedKey || !suppliedKey || !safeEqual(suppliedKey, expectedKey)) {
    return jsonResponse(401, { ok: false, error: 'unauthorized' });
  }

  const { data, error } = await createAdminClient().rpc('lumno_get_monitor_snapshot');
  if (error || !data || typeof data !== 'object') {
    return jsonResponse(503, { ok: false, error: 'snapshot_unavailable' });
  }
  return jsonResponse(200, { ok: true, snapshot: data });
});
