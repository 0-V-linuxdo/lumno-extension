import { authorizeRequest } from '../_shared/auth.ts';
import { handlePreflight, jsonResponse, readSmallJson } from '../_shared/http.ts';
import { sanitizeUsageBatch } from '../_shared/usage-schema.ts';

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) {
    return preflight;
  }
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const authorized = await authorizeRequest(request);
    if (!authorized) {
      return jsonResponse(401, { ok: false, error: 'unauthorized' });
    }
    const payload = sanitizeUsageBatch(await readSmallJson(request));
    if (!payload) {
      return jsonResponse(400, { ok: false, error: 'invalid_payload' });
    }

    const { data, error } = await authorized.admin.rpc('lumno_ingest_usage_batch', {
      p_user_id: authorized.user.id,
      p_batch_id: payload.batch_id,
      p_usage_day: payload.day,
      p_metrics: payload.metrics,
      p_dimensions: payload.dimensions,
      p_configuration: payload.configuration
    });
    if (error) {
      const denied = error.code === '42501';
      const rateLimited = error.code === '42901';
      return jsonResponse(denied ? 403 : (rateLimited ? 429 : 500), {
        ok: false,
        error: denied
          ? 'analytics_consent_required'
          : (rateLimited ? 'ingest_rate_limited' : 'ingest_failed')
      });
    }
    return jsonResponse(200, { ok: true, duplicate: data === false });
  } catch (error) {
    const invalidBody = error instanceof SyntaxError || String(error).includes('too large');
    return jsonResponse(invalidBody ? 400 : 500, {
      ok: false,
      error: invalidBody ? 'invalid_payload' : 'internal_error'
    });
  }
});
