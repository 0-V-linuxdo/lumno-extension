import {
  authorizeRequest,
  verifyAccessToken,
  type AuthorizedClients,
  type VerifiedJwtClaims
} from '../_shared/auth.ts';
import { handlePreflight, jsonResponse, readSmallJson } from '../_shared/http.ts';

const BUCKET = 'lumno-user-media';
const PAGE_SIZE = 100;
const STEP_UP_MAX_AGE_SECONDS = 5 * 60;
const STEP_UP_CLOCK_SKEW_SECONDS = 30;
const OAUTH_METHOD = 'oauth';

function getFreshOAuthAuthenticationTimestamp(
  claims: VerifiedJwtClaims,
  nowSeconds = Math.floor(Date.now() / 1000)
): number | null {
  if (!Array.isArray(claims.amr)) return null;
  const entry = claims.amr.find((candidate) => {
    if (!candidate || typeof candidate !== 'object') return false;
    const method = (candidate as { method?: unknown }).method;
    const timestamp = (candidate as { timestamp?: unknown }).timestamp;
    if (method !== OAUTH_METHOD) return false;
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return false;
    return timestamp <= nowSeconds + STEP_UP_CLOCK_SKEW_SECONDS &&
      timestamp >= nowSeconds - STEP_UP_MAX_AGE_SECONDS;
  });
  if (!entry || typeof entry !== 'object') return null;
  const timestamp = (entry as { timestamp?: unknown }).timestamp;
  return typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : null;
}

async function consumeStepUpProof(
  authorized: AuthorizedClients,
  accessToken: string
): Promise<boolean> {
  const proof = await verifyAccessToken(accessToken);
  if (
    !proof ||
    proof.user.id !== authorized.user.id ||
    proof.claims.session_id === authorized.claims.session_id
  ) {
    return false;
  }

  const authenticatedAt = getFreshOAuthAuthenticationTimestamp(proof.claims);
  if (authenticatedAt === null) return false;

  // This RPC has a primary-key insert as its replay barrier. Auth sign-out is
  // useful cleanup, but it is not the atomic one-use guarantee by itself.
  const { data: consumed, error: consumeError } = await authorized.admin.rpc(
    'lumno_consume_delete_step_up_session',
    {
      p_user_id: authorized.user.id,
      p_step_up_session_id: proof.claims.session_id,
      p_primary_session_id: authorized.claims.session_id,
      p_authenticated_at: new Date(authenticatedAt * 1000).toISOString()
    }
  );
  if (consumeError || consumed !== true) return false;

  // If this races with another local sign-out, the database consumption has
  // already made the proof unusable, so cleanup failure is non-fatal.
  await authorized.admin.auth.admin.signOut(proof.accessToken, 'local').catch(() => {});
  return true;
}

async function listObjectPathsRecursively(
  admin: AuthorizedClients['admin'],
  rootPrefix: string
): Promise<string[]> {
  const paths: string[] = [];
  const prefixes = [rootPrefix];
  while (prefixes.length > 0) {
    const prefix = prefixes.shift() as string;
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });
      if (error) throw error;
      for (const item of data || []) {
        const name = String(item.name || '').trim();
        if (!name || name === '.emptyFolderPlaceholder') continue;
        const fullPath = `${prefix}/${name}`;
        if (item.id) paths.push(fullPath);
        else prefixes.push(fullPath);
      }
      if (!data || data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  return paths;
}

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
    const body = await readSmallJson(request);
    if (!body || typeof body !== 'object' || (body as { confirmation?: unknown }).confirmation !== 'DELETE') {
      return jsonResponse(400, { ok: false, error: 'confirmation_required' });
    }
    const stepUpAccessToken = (body as { step_up_access_token?: unknown }).step_up_access_token;
    if (
      typeof stepUpAccessToken !== 'string' ||
      !(await consumeStepUpProof(authorized, stepUpAccessToken))
    ) {
      return jsonResponse(403, { ok: false, error: 'step_up_required' });
    }

    // Enumerate the whole account prefix. This covers future media kinds,
    // legacy paths, abandoned immutable uploads, and unexpected subfolders.
    const objectPaths = await listObjectPathsRecursively(
      authorized.admin,
      authorized.user.id
    );
    for (let index = 0; index < objectPaths.length; index += PAGE_SIZE) {
      const { error } = await authorized.admin.storage
        .from(BUCKET)
        .remove(objectPaths.slice(index, index + PAGE_SIZE));
      if (error) {
        throw error;
      }
    }

    const { error: deleteError } = await authorized.admin.auth.admin.deleteUser(authorized.user.id, false);
    if (deleteError) {
      throw deleteError;
    }
    return jsonResponse(200, { ok: true });
  } catch (error) {
    const invalidBody = error instanceof SyntaxError || String(error).includes('too large');
    return jsonResponse(invalidBody ? 400 : 500, {
      ok: false,
      error: invalidBody ? 'invalid_payload' : 'account_deletion_failed'
    });
  }
});
