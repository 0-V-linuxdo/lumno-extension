import { authorizeRequest, type AuthorizedClients } from '../_shared/auth.ts';
import { corsHeaders, handlePreflight, jsonResponse, readSmallJson } from '../_shared/http.ts';
import {
  assertMediaShape,
  inspectImage,
  MAX_UPLOAD_BODY_BYTES,
  MEDIA_BUCKET,
  MediaRequestError,
  type MediaKind,
  sha256Hex
} from '../_shared/media.ts';

const WALLPAPER_ID = /^custom-wallpaper-[a-zA-Z0-9-]{1,100}$/;
const SHORTCUT_ICON_ID = /^shortcut-icon-[0-9a-f]{64}$/;

function cleanOriginalName(value: unknown): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 200);
}

function validateClientAssetId(kind: MediaKind, value: unknown): string {
  const id = String(value || '').trim();
  const valid = kind === 'wallpaper' ? WALLPAPER_ID.test(id) : SHORTCUT_ICON_ID.test(id);
  if (!valid) throw new MediaRequestError(400, 'invalid_asset_id');
  return id;
}

async function removePaths(admin: AuthorizedClients['admin'], paths: string[]): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await admin.storage.from(MEDIA_BUCKET).remove(unique);
  if (error) throw error;
}

async function uploadMedia(request: Request, authorized: AuthorizedClients): Promise<Response> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_UPLOAD_BODY_BYTES) {
    throw new MediaRequestError(413, 'media_upload_too_large');
  }
  const form = await request.formData();
  const allowedFields = new Set(['asset_kind', 'client_asset_id', 'original_name', 'image', 'thumbnail']);
  const fieldCounts = new Map<string, number>();
  let parsedBodyBytes = 0;
  for (const [key, value] of form.entries()) {
    if (!allowedFields.has(key)) throw new MediaRequestError(400, 'invalid_media_form');
    fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);
    parsedBodyBytes += typeof value === 'string'
      ? new TextEncoder().encode(value).byteLength
      : value.size;
  }
  if ([...fieldCounts.values()].some((count) => count !== 1) ||
      parsedBodyBytes > MAX_UPLOAD_BODY_BYTES) {
    throw new MediaRequestError(413, 'media_upload_too_large');
  }
  const kind = String(form.get('asset_kind') || '') as MediaKind;
  if (kind !== 'wallpaper' && kind !== 'shortcut_icon') {
    throw new MediaRequestError(400, 'invalid_asset_kind');
  }
  const clientAssetId = validateClientAssetId(kind, form.get('client_asset_id'));
  const originalName = cleanOriginalName(form.get('original_name'));
  const imageFile = form.get('image');
  const thumbnailFile = form.get('thumbnail');
  if (!(imageFile instanceof File) || (kind === 'wallpaper' && !(thumbnailFile instanceof File)) ||
      (kind === 'shortcut_icon' && thumbnailFile !== null)) {
    throw new MediaRequestError(400, 'invalid_media_form');
  }

  const imageBytes = new Uint8Array(await imageFile.arrayBuffer());
  const thumbnailBytes = thumbnailFile instanceof File
    ? new Uint8Array(await thumbnailFile.arrayBuffer())
    : null;
  if (imageBytes.byteLength + (thumbnailBytes?.byteLength || 0) > MAX_UPLOAD_BODY_BYTES) {
    throw new MediaRequestError(413, 'media_upload_too_large');
  }
  const image = inspectImage(imageBytes, imageFile.type);
  const thumbnail = thumbnailBytes && thumbnailFile instanceof File
    ? inspectImage(thumbnailBytes, thumbnailFile.type)
    : undefined;
  assertMediaShape(
    kind,
    image,
    imageBytes.byteLength,
    thumbnail,
    thumbnailBytes?.byteLength || 0
  );

  const imageSha256 = await sha256Hex(imageBytes);
  const thumbnailSha256 = thumbnailBytes ? await sha256Hex(thumbnailBytes) : null;
  const leaseToken = crypto.randomUUID();
  const { data: leaseAcquired, error: leaseError } = await authorized.admin.rpc(
    'lumno_acquire_media_upload_lease',
    {
      p_user_id: authorized.user.id,
      p_client_asset_id: clientAssetId,
      p_lease_token: leaseToken
    }
  );
  if (leaseError) throw leaseError;
  if (leaseAcquired !== true) {
    throw new MediaRequestError(409, 'media_upload_in_progress');
  }

  const uploadedPaths: string[] = [];
  try {
    // Acquire the logical-asset lease before recording quota usage. A burst of
    // retries for one asset therefore consumes at most one rate-limit event.
    const { error: authorizationError } = await authorized.admin.rpc('lumno_authorize_media_upload', {
      p_user_id: authorized.user.id,
      p_asset_kind: kind,
      p_client_asset_id: clientAssetId,
      p_byte_size: imageBytes.byteLength,
      p_thumbnail_byte_size: thumbnailBytes?.byteLength || 0
    });
    if (authorizationError) {
      if (authorizationError.code === '42901') throw new MediaRequestError(429, 'media_upload_rate_limited');
      if (authorizationError.code === '23514') throw new MediaRequestError(413, 'media_quota_exceeded');
      throw authorizationError;
    }

    const objectId = crypto.randomUUID();
    const userPrefix = authorized.user.id;
    const storagePath = kind === 'wallpaper'
      ? `${userPrefix}/wallpapers/${objectId}.webp`
      : `${userPrefix}/shortcut-icons/${objectId}.png`;
    const thumbnailPath = kind === 'wallpaper'
      ? `${userPrefix}/wallpaper-thumbs/${objectId}.webp`
      : null;

    const { error: imageUploadError } = await authorized.admin.storage.from(MEDIA_BUCKET).upload(
      storagePath,
      imageBytes,
      { contentType: image.mimeType, cacheControl: '31536000', upsert: false }
    );
    if (imageUploadError) throw imageUploadError;
    uploadedPaths.push(storagePath);

    if (thumbnailPath && thumbnailBytes && thumbnail) {
      const { error: thumbnailUploadError } = await authorized.admin.storage.from(MEDIA_BUCKET).upload(
        thumbnailPath,
        thumbnailBytes,
        { contentType: thumbnail.mimeType, cacheControl: '31536000', upsert: false }
      );
      if (thumbnailUploadError) throw thumbnailUploadError;
      uploadedPaths.push(thumbnailPath);
    }

    const { data: previousRows, error: previousError } = await authorized.admin
      .from('lumno_assets')
      .select('id,storage_path,thumbnail_path')
      .eq('user_id', authorized.user.id)
      .eq('client_asset_id', clientAssetId)
      .limit(1);
    if (previousError) throw previousError;
    const previous = previousRows?.[0] || null;
    const { data: committedAsset, error: metadataError } = await authorized.admin.rpc(
      'lumno_commit_media_asset',
      {
        p_user_id: authorized.user.id,
        p_asset_kind: kind,
        p_client_asset_id: clientAssetId,
        p_lease_token: leaseToken,
        p_original_name: originalName,
        p_storage_path: storagePath,
        p_thumbnail_path: thumbnailPath,
        p_sha256: imageSha256,
        p_thumbnail_sha256: thumbnailSha256,
        p_mime_type: image.mimeType,
        p_byte_size: imageBytes.byteLength,
        p_thumbnail_byte_size: thumbnailBytes?.byteLength || 0,
        p_width: image.width,
        p_height: image.height
      }
    );
    if (metadataError) {
      if (metadataError.code === '23514') throw new MediaRequestError(413, 'media_quota_exceeded');
      throw metadataError;
    }
    const asset = Array.isArray(committedAsset) ? committedAsset[0] : committedAsset;
    if (!asset) throw new MediaRequestError(409, 'media_upload_lease_expired');

    const oldPaths = [previous?.storage_path || '', previous?.thumbnail_path || '']
      .filter((path) => path && path !== storagePath && path !== thumbnailPath);
    let cleanupPending = false;
    try {
      await removePaths(authorized.admin, oldPaths);
    } catch (_error) {
      // Old immutable paths are no longer referenced and cannot be downloaded
      // through the gateway. Account deletion recursively removes them later.
      cleanupPending = true;
    }
    return jsonResponse(200, { ok: true, asset, cleanup_pending: cleanupPending });
  } catch (error) {
    try {
      await removePaths(authorized.admin, uploadedPaths);
    } catch (_cleanupError) {
      // The unreferenced random paths remain inaccessible to authenticated
      // clients and are covered by recursive account deletion.
    }
    throw error;
  } finally {
    // Token matching prevents a delayed request from releasing a successor's
    // lease. Expiry recovers automatically if the Edge invocation is killed.
    try {
      await authorized.admin.rpc('lumno_release_media_upload_lease', {
        p_user_id: authorized.user.id,
        p_client_asset_id: clientAssetId,
        p_lease_token: leaseToken
      });
    } catch (_error) {
      // The short lease expiry is the recovery path for a failed release.
    }
  }
}

async function deleteMedia(body: Record<string, unknown>, authorized: AuthorizedClients): Promise<Response> {
  const candidate = String(body.client_asset_id || '').trim();
  if (!WALLPAPER_ID.test(candidate) && !SHORTCUT_ICON_ID.test(candidate)) {
    throw new MediaRequestError(400, 'invalid_asset_id');
  }
  const { data: rows, error } = await authorized.admin
    .from('lumno_assets')
    .select('id,storage_path,thumbnail_path')
    .eq('user_id', authorized.user.id)
    .eq('client_asset_id', candidate)
    .is('deleted_at', null)
    .limit(1);
  if (error) throw error;
  const asset = rows?.[0] || null;
  if (!asset) return jsonResponse(200, { ok: true, deleted: false });

  // Object deletion is the commit prerequisite. Quota is released only after
  // both referenced paths are gone.
  await removePaths(authorized.admin, [asset.storage_path, asset.thumbnail_path || '']);
  const { error: tombstoneError } = await authorized.admin
    .from('lumno_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', asset.id)
    .eq('user_id', authorized.user.id);
  if (tombstoneError) throw tombstoneError;
  return jsonResponse(200, { ok: true, deleted: true });
}

async function downloadMedia(body: Record<string, unknown>, authorized: AuthorizedClients): Promise<Response> {
  const path = String(body.path || '').trim();
  const escapedUserId = authorized.user.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const canonicalPath = new RegExp(
    `^${escapedUserId}\/(?:wallpapers|wallpaper-thumbs)\/[0-9a-f-]{36}\\.webp$|` +
    `^${escapedUserId}\/shortcut-icons\/[0-9a-f-]{36}\\.png$`,
    'i'
  );
  if (!canonicalPath.test(path)) {
    throw new MediaRequestError(400, 'invalid_asset_path');
  }
  const { data: rows, error } = await authorized.admin
    .from('lumno_assets')
    .select('asset_kind,storage_path,thumbnail_path,mime_type,byte_size,thumbnail_byte_size,width,height,ingest_version')
    .eq('user_id', authorized.user.id)
    .is('deleted_at', null)
    .or(`storage_path.eq.${path},thumbnail_path.eq.${path}`)
    .limit(1);
  if (error) throw error;
  const asset = rows?.[0] || null;
  if (!asset) throw new MediaRequestError(404, 'asset_not_found');
  const expectedBytes = path === asset.thumbnail_path
    ? Number(asset.thumbnail_byte_size || 0)
    : Number(asset.byte_size || 0);
  // Reserve egress before touching Storage so an over-quota caller cannot
  // repeatedly force privileged downloads whose bytes are never accounted.
  // Failed downstream reads remain conservatively charged.
  const { error: egressError } = await authorized.admin.rpc('lumno_record_media_egress', {
    p_user_id: authorized.user.id,
    p_byte_size: expectedBytes
  });
  if (egressError) {
    if (egressError.code === '23514') throw new MediaRequestError(429, 'media_egress_quota_exceeded');
    throw egressError;
  }
  const { data: blob, error: downloadError } = await authorized.admin.storage
    .from(MEDIA_BUCKET)
    .download(path);
  if (downloadError || !blob) throw downloadError || new Error('media_download_failed');
  if (blob.size !== expectedBytes) throw new MediaRequestError(409, 'media_size_mismatch');
  const expectedMimeType = path === asset.thumbnail_path ? 'image/webp' : asset.mime_type;
  const responseBody = Number(asset.ingest_version || 0) >= 2
    ? new Uint8Array(await blob.arrayBuffer())
    : blob;
  if (responseBody instanceof Uint8Array) {
    const inspected = inspectImage(responseBody, expectedMimeType);
    if (path === asset.thumbnail_path) {
      const ratio = inspected.width / inspected.height;
      if (inspected.mimeType !== 'image/webp' || inspected.width > 480 || inspected.height > 480 ||
          Math.abs(ratio - (16 / 9)) > 0.015) {
        throw new MediaRequestError(409, 'media_shape_mismatch');
      }
    } else if (inspected.width !== Number(asset.width) || inspected.height !== Number(asset.height)) {
      throw new MediaRequestError(409, 'media_shape_mismatch');
    } else if (asset.asset_kind === 'shortcut_icon') {
      assertMediaShape('shortcut_icon', inspected, responseBody.byteLength);
    } else {
      const ratio = inspected.width / inspected.height;
      if (inspected.mimeType !== 'image/webp' || inspected.width > 2560 || inspected.height > 2560 ||
          Math.abs(ratio - (16 / 9)) > 0.015) {
        throw new MediaRequestError(409, 'media_shape_mismatch');
      }
    }
  }
  return new Response(responseBody, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': expectedMimeType,
      'Content-Length': String(blob.size),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request);
  if (preflight) return preflight;
  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }
  try {
    const authorized = await authorizeRequest(request);
    if (!authorized) return jsonResponse(401, { ok: false, error: 'unauthorized' });

    const contentType = request.headers.get('content-type') || '';
    if (contentType.toLowerCase().startsWith('multipart/form-data')) {
      return await uploadMedia(request, authorized);
    }
    const body = await readSmallJson(request, 2048) as Record<string, unknown>;
    if (body.action === 'delete') return await deleteMedia(body, authorized);
    if (body.action === 'download') return await downloadMedia(body, authorized);
    throw new MediaRequestError(400, 'invalid_media_action');
  } catch (error) {
    if (error instanceof MediaRequestError) {
      return jsonResponse(error.status, { ok: false, error: error.code });
    }
    const invalidBody = error instanceof SyntaxError || String(error).includes('too large');
    return jsonResponse(invalidBody ? 400 : 500, {
      ok: false,
      error: invalidBody ? 'invalid_payload' : 'media_operation_failed'
    });
  }
});
