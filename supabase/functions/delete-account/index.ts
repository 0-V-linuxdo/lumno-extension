import { authorizeRequest, type AuthorizedClients } from '../_shared/auth.ts';
import { handlePreflight, jsonResponse, readSmallJson } from '../_shared/http.ts';

const BUCKET = 'lumno-user-media';
const PAGE_SIZE = 100;

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
    const body = await readSmallJson(request, 1024);
    if (!body || typeof body !== 'object' || (body as { confirmation?: unknown }).confirmation !== 'DELETE') {
      return jsonResponse(400, { ok: false, error: 'confirmation_required' });
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
