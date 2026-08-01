import { authorizeRequest, type AuthorizedClients } from '../_shared/auth.ts';
import { handlePreflight, jsonResponse, readSmallJson } from '../_shared/http.ts';

const BUCKET = 'lumno-user-media';
const PAGE_SIZE = 100;

async function listObjectPaths(admin: AuthorizedClients['admin'], prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error) {
      throw error;
    }
    const files = (data || []).filter((item) => item.id).map((item) => `${prefix}/${item.name}`);
    paths.push(...files);
    if (!data || data.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
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
    const body = await readSmallJson(request, 1024);
    if (!body || typeof body !== 'object' || (body as { confirmation?: unknown }).confirmation !== 'DELETE') {
      return jsonResponse(400, { ok: false, error: 'confirmation_required' });
    }

    const userPrefix = authorized.user.id;
    const [wallpapers, thumbnails] = await Promise.all([
      listObjectPaths(authorized.admin, `${userPrefix}/wallpapers`),
      listObjectPaths(authorized.admin, `${userPrefix}/wallpaper-thumbs`)
    ]);
    const objectPaths = [...new Set([...wallpapers, ...thumbnails])];
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
