(function(root, factory) {
  const repositoryApi = typeof module === 'object' && module.exports
    ? require('../shared/settings-repository.js')
    : root.LumnoSettingsRepository;
  const api = factory(repositoryApi);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoCloudWallpaperRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(repositoryApi) {
  'use strict';

  const DB_NAME = 'lumno-newtab-wallpaper';
  const DB_VERSION = 1;
  const STORE_NAME = 'wallpapers';
  const WALLPAPER_KIND = 'wallpaper';
  const SHORTCUT_ICON_KIND = 'shortcut_icon';
  const WALLPAPER_CLIENT_ID_PATTERN = /^custom-wallpaper-[a-zA-Z0-9-]{1,100}$/;
  const SHORTCUT_ICON_CLIENT_ID_PATTERN = /^shortcut-icon-[0-9a-f]{64}$/;
  const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const SHORTCUT_ICON_STORAGE_KEY = '_x_extension_newtab_shortcut_icons_2026_unique_';
  const SHORTCUTS_STORAGE_KEY = '_x_extension_newtab_shortcuts_2026_unique_';
  const SHORTCUT_ICON_META_KEY = '_lumno_cloud_shortcut_icon_meta_v1_';
  const MEDIA_DELETIONS_KEY = '_lumno_cloud_media_deletions_v1_';
  const MAX_ASSET_BYTES = 5 * 1024 * 1024;
  const MAX_WALLPAPER_UPLOAD_BYTES = 2 * 1024 * 1024;
  const MAX_WALLPAPER_THUMBNAIL_BYTES = 160 * 1024;
  const MAX_SHORTCUT_ICON_BYTES = 96 * 1024;
  const MAX_SHORTCUT_ICON_DATA_URL_LENGTH = 160 * 1024;
  const MAX_ASSETS = 20;

  function hasImageSignature(bytes, mimeType) {
    if (!bytes || bytes.length < 12) return false;
    if (mimeType === 'image/jpeg') {
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    }
    return String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
  }

  function dataUrlToBlob(dataUrl) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!match || !ALLOWED_MIME_TYPES.has(match[1])) {
      throw new Error('invalid_wallpaper_data');
    }
    const binary = atob(match[2]);
    if (binary.length < 1 || binary.length > MAX_ASSET_BYTES) {
      throw new Error('wallpaper_size_out_of_range');
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    if (!hasImageSignature(bytes, match[1])) throw new Error('invalid_wallpaper_signature');
    return new Blob([bytes], { type: match[1] });
  }

  async function blobToDataUrl(blob) {
    if (!blob || !ALLOWED_MIME_TYPES.has(String(blob.type || ''))) {
      throw new Error('invalid_wallpaper_blob');
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.length < 1 || bytes.length > MAX_ASSET_BYTES) {
      throw new Error('wallpaper_size_out_of_range');
    }
    if (!hasImageSignature(bytes, blob.type)) throw new Error('invalid_wallpaper_signature');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return `data:${blob.type};base64,${btoa(binary)}`;
  }

  async function sha256Bytes(bytes, cryptoApi) {
    const api = cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    if (!api || !api.subtle) throw new Error('crypto_unavailable');
    const digest = await api.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function sha256Hex(blob, cryptoApi) {
    return blob.arrayBuffer().then((bytes) => sha256Bytes(bytes, cryptoApi));
  }

  function sha256Text(value, cryptoApi) {
    const text = String(value || '');
    const bytes = typeof TextEncoder === 'function'
      ? new TextEncoder().encode(text)
      : Uint8Array.from(unescape(encodeURIComponent(text)), (character) => character.charCodeAt(0));
    return sha256Bytes(bytes, cryptoApi);
  }

  function getAssetKind(asset) {
    const explicit = String(asset && asset.asset_kind || '');
    if (explicit === SHORTCUT_ICON_KIND || explicit === WALLPAPER_KIND) return explicit;
    const clientAssetId = String(asset && asset.client_asset_id || '');
    return SHORTCUT_ICON_CLIENT_ID_PATTERN.test(clientAssetId)
      ? SHORTCUT_ICON_KIND
      : WALLPAPER_KIND;
  }

  function normalizeShortcutId(value) {
    const id = String(value || '').trim();
    return id && id.length <= 200 && !/[\u0000-\u001f\u007f]/.test(id) ? id : '';
  }

  function getDataUrlByteLength(value) {
    const match = /^data:[^;,]+;base64,([a-zA-Z0-9+/]*={0,2})$/.exec(String(value || '').trim());
    if (!match) return 0;
    const encoded = match[1];
    const padding = encoded.endsWith('==') ? 2 : (encoded.endsWith('=') ? 1 : 0);
    return Math.max(0, Math.floor((encoded.length * 3) / 4) - padding);
  }

  function normalizeShortcutIconMap(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = {};
    Object.entries(source).slice(0, MAX_ASSETS * 2).forEach(([rawId, rawDataUrl]) => {
      const shortcutId = normalizeShortcutId(rawId);
      const dataUrl = String(rawDataUrl || '').trim();
      if (shortcutId && dataUrl.startsWith('data:image/png;base64,') &&
          dataUrl.length <= MAX_SHORTCUT_ICON_DATA_URL_LENGTH &&
          getDataUrlByteLength(dataUrl) <= MAX_SHORTCUT_ICON_BYTES) {
        result[shortcutId] = dataUrl;
      }
    });
    return result;
  }

  function normalizeShortcutIconMeta(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = {};
    Object.entries(source).forEach(([rawId, rawMeta]) => {
      const shortcutId = normalizeShortcutId(rawId);
      const meta = rawMeta && typeof rawMeta === 'object' ? rawMeta : {};
      const clientAssetId = String(meta.clientAssetId || '');
      if (!shortcutId || !SHORTCUT_ICON_CLIENT_ID_PATTERN.test(clientAssetId)) return;
      result[shortcutId] = {
        clientAssetId,
        cloudAssetId: String(meta.cloudAssetId || ''),
        cloudUpdatedAt: String(meta.cloudUpdatedAt || ''),
        sha256: /^[0-9a-f]{64}$/.test(String(meta.sha256 || '')) ? String(meta.sha256) : ''
      };
    });
    return result;
  }

  function createIndexedDbStore(indexedDBApi) {
    function openDb() {
      return new Promise((resolve, reject) => {
        if (!indexedDBApi) {
          reject(new Error('indexeddb_unavailable'));
          return;
        }
        const request = indexedDBApi.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        request.onerror = () => reject(request.error || new Error('indexeddb_open_failed'));
        request.onsuccess = () => resolve(request.result);
      });
    }

    async function transact(mode, operation) {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let result;
        try {
          result = operation(store);
        } catch (error) {
          db.close();
          reject(error);
          return;
        }
        transaction.oncomplete = () => {
          db.close();
          resolve(result && Object.prototype.hasOwnProperty.call(result, 'result') ? result.result : result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error || new Error('indexeddb_transaction_failed'));
        };
      });
    }

    function readAll() {
      return openDb().then((db) => new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () => reject(request.error || new Error('indexeddb_read_failed'));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      }));
    }

    return {
      readAll,
      write(record) { return transact('readwrite', (store) => store.put(record)); },
      remove(key) { return transact('readwrite', (store) => store.delete(key)); },
      clear() { return transact('readwrite', (store) => store.clear()); }
    };
  }

  async function defaultGetImageDimensions(blob) {
    if (typeof createImageBitmap !== 'function') return { width: 1920, height: 1080 };
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    if (typeof bitmap.close === 'function') bitmap.close();
    return dimensions;
  }

  function createRuntime(options) {
    const config = options && typeof options === 'object' ? options : {};
    const transport = config.transport;
    const repository = config.repository;
    const localArea = config.localArea || null;
    const store = config.store || createIndexedDbStore(config.indexedDBApi ||
      (typeof indexedDB !== 'undefined' ? indexedDB : null));
    const cryptoApi = config.cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    const getImageDimensions = typeof config.getImageDimensions === 'function'
      ? config.getImageDimensions
      : defaultGetImageDimensions;
    let activeSync = null;

    async function readLocal(keys) {
      return repositoryApi.getAreaValues(localArea, keys);
    }

    async function writeLocal(values) {
      return repositoryApi.mutateArea(localArea, 'set', values);
    }

    async function removeLocal(keys) {
      return repositoryApi.mutateArea(localArea, 'remove', keys);
    }

    async function readShortcutIconState() {
      const values = await readLocal([SHORTCUT_ICON_STORAGE_KEY, SHORTCUT_ICON_META_KEY]);
      return {
        icons: normalizeShortcutIconMap(values[SHORTCUT_ICON_STORAGE_KEY]),
        meta: normalizeShortcutIconMeta(values[SHORTCUT_ICON_META_KEY])
      };
    }

    async function writeShortcutIconState(icons, meta) {
      await writeLocal({
        [SHORTCUT_ICON_STORAGE_KEY]: normalizeShortcutIconMap(icons),
        [SHORTCUT_ICON_META_KEY]: normalizeShortcutIconMeta(meta)
      });
    }

    async function getShortcutIconClientAssetId(shortcutId) {
      const normalized = normalizeShortcutId(shortcutId);
      if (!normalized) throw new Error('invalid_shortcut_icon_id');
      return `shortcut-icon-${await sha256Text(normalized, cryptoApi)}`;
    }

    async function canSync() {
      if (!transport || !repository || await repository.getMode() !== repositoryApi.MODE_CLOUD) return null;
      return transport.getSession();
    }

    async function enqueueDeletion(kind, clientAssetId) {
      const values = await readLocal([MEDIA_DELETIONS_KEY]);
      const current = Array.isArray(values[MEDIA_DELETIONS_KEY]) ? values[MEDIA_DELETIONS_KEY] : [];
      const next = current.filter((item) => item && item.client_asset_id !== clientAssetId);
      next.push({ kind, client_asset_id: clientAssetId });
      await writeLocal({ [MEDIA_DELETIONS_KEY]: next.slice(-MAX_ASSETS * 2) });
    }

    async function removeQueuedDeletion(clientAssetId) {
      const values = await readLocal([MEDIA_DELETIONS_KEY]);
      const current = Array.isArray(values[MEDIA_DELETIONS_KEY]) ? values[MEDIA_DELETIONS_KEY] : [];
      const next = current.filter((item) => item && item.client_asset_id !== clientAssetId);
      if (next.length === 0) await removeLocal([MEDIA_DELETIONS_KEY]);
      else await writeLocal({ [MEDIA_DELETIONS_KEY]: next });
    }

    async function flushDeletions() {
      const values = await readLocal([MEDIA_DELETIONS_KEY]);
      const current = Array.isArray(values[MEDIA_DELETIONS_KEY]) ? values[MEDIA_DELETIONS_KEY] : [];
      let deleted = 0;
      for (const item of current) {
        const clientAssetId = String(item && item.client_asset_id || '');
        if (!WALLPAPER_CLIENT_ID_PATTERN.test(clientAssetId) &&
            !SHORTCUT_ICON_CLIENT_ID_PATTERN.test(clientAssetId)) continue;
        await transport.deleteAsset(clientAssetId);
        deleted += 1;
      }
      if (current.length > 0) await removeLocal([MEDIA_DELETIONS_KEY]);
      return deleted;
    }

    async function uploadRecord(recordValue) {
      const session = await canSync();
      if (!session) return { skipped: true, reason: 'cloud-disabled' };
      const record = recordValue && typeof recordValue === 'object' ? recordValue : {};
      const clientAssetId = String(record.id || '').trim();
      if (!WALLPAPER_CLIENT_ID_PATTERN.test(clientAssetId)) throw new Error('invalid_wallpaper_id');
      const imageBlob = dataUrlToBlob(record.imageDataUrl);
      const thumbnailBlob = dataUrlToBlob(record.thumbnailDataUrl || record.imageDataUrl);
      if (imageBlob.type !== 'image/webp' || thumbnailBlob.type !== 'image/webp' ||
          imageBlob.size > MAX_WALLPAPER_UPLOAD_BYTES ||
          thumbnailBlob.size > MAX_WALLPAPER_THUMBNAIL_BYTES) {
        throw new Error('wallpaper_must_be_compressed_before_upload');
      }
      const [dimensions, thumbnailDimensions] = await Promise.all([
        getImageDimensions(imageBlob),
        getImageDimensions(thumbnailBlob)
      ]);
      const width = Math.max(1, Math.round(Number(dimensions.width) || Number(record.width) || 1920));
      const height = Math.max(1, Math.round(Number(dimensions.height) || Number(record.height) || 1080));
      const thumbnailWidth = Math.max(1, Math.round(Number(thumbnailDimensions.width) || 0));
      const thumbnailHeight = Math.max(1, Math.round(Number(thumbnailDimensions.height) || 0));
      if (width > 2560 || height > 2560 || thumbnailWidth > 480 || thumbnailHeight > 480 ||
          Math.abs((width / height) - (16 / 9)) > 0.015 ||
          Math.abs((thumbnailWidth / thumbnailHeight) - (16 / 9)) > 0.015) {
        throw new Error('invalid_compressed_wallpaper_dimensions');
      }
      const sha256 = await sha256Hex(imageBlob, cryptoApi);
      const asset = await transport.uploadAsset({
        asset_kind: WALLPAPER_KIND,
        client_asset_id: clientAssetId,
        original_name: String(record.name || '').slice(0, 200),
        imageBlob,
        thumbnailBlob
      });
      const nextRecord = {
        ...record,
        id: clientAssetId,
        key: String(record.key || clientAssetId),
        width,
        height,
        cloudAssetId: String(asset.id || ''),
        cloudUpdatedAt: String(asset.updated_at || new Date().toISOString())
      };
      await store.write(nextRecord);
      await removeQueuedDeletion(clientAssetId);
      return { ok: true, asset, record: nextRecord };
    }

    async function downloadAsset(asset) {
      const clientAssetId = String(asset && asset.client_asset_id || '');
      if (!WALLPAPER_CLIENT_ID_PATTERN.test(clientAssetId)) throw new Error('invalid_wallpaper_id');
      const [imageBlob, thumbnailBlob] = await Promise.all([
        transport.downloadObject(asset.storage_path),
        asset.thumbnail_path
          ? transport.downloadObject(asset.thumbnail_path)
          : transport.downloadObject(asset.storage_path)
      ]);
      const record = {
        id: clientAssetId,
        key: clientAssetId,
        name: String(asset.original_name || ''),
        imageDataUrl: await blobToDataUrl(imageBlob),
        thumbnailDataUrl: await blobToDataUrl(thumbnailBlob),
        width: Number(asset.width) || 1920,
        height: Number(asset.height) || 1080,
        updatedAt: Date.parse(asset.updated_at) || Date.now(),
        cloudAssetId: String(asset.id || ''),
        cloudUpdatedAt: String(asset.updated_at || '')
      };
      await store.write(record);
      return record;
    }

    async function uploadShortcutIcon(shortcutIdValue, dataUrlValue) {
      const session = await canSync();
      if (!session) return { skipped: true, reason: 'cloud-disabled' };
      const shortcutId = normalizeShortcutId(shortcutIdValue);
      if (!shortcutId) throw new Error('invalid_shortcut_icon_id');
      const imageBlob = dataUrlToBlob(dataUrlValue);
      if (imageBlob.type !== 'image/png' || imageBlob.size > MAX_SHORTCUT_ICON_BYTES) {
        throw new Error('invalid_shortcut_icon_data');
      }
      const state = await readShortcutIconState();
      const clientAssetId = await getShortcutIconClientAssetId(shortcutId);
      const sha256 = await sha256Hex(imageBlob, cryptoApi);
      const asset = await transport.uploadAsset({
        asset_kind: SHORTCUT_ICON_KIND,
        client_asset_id: clientAssetId,
        original_name: shortcutId,
        imageBlob
      });
      const latest = await readShortcutIconState();
      latest.icons[shortcutId] = String(dataUrlValue || '');
      latest.meta[shortcutId] = {
        clientAssetId,
        cloudAssetId: String(asset.id || ''),
        cloudUpdatedAt: String(asset.updated_at || new Date().toISOString()),
        sha256
      };
      await writeShortcutIconState(latest.icons, latest.meta);
      await removeQueuedDeletion(clientAssetId);
      return { ok: true, asset, shortcutId };
    }

    async function downloadShortcutIcon(asset) {
      const shortcutId = normalizeShortcutId(asset && asset.original_name);
      const clientAssetId = String(asset && asset.client_asset_id || '');
      if (!shortcutId || !SHORTCUT_ICON_CLIENT_ID_PATTERN.test(clientAssetId)) {
        throw new Error('invalid_shortcut_icon_asset');
      }
      const imageBlob = await transport.downloadObject(asset.storage_path);
      if (imageBlob.type !== 'image/png' || imageBlob.size > MAX_SHORTCUT_ICON_BYTES) {
        throw new Error('invalid_shortcut_icon_blob');
      }
      const dataUrl = await blobToDataUrl(imageBlob);
      const state = await readShortcutIconState();
      state.icons[shortcutId] = dataUrl;
      state.meta[shortcutId] = {
        clientAssetId,
        cloudAssetId: String(asset.id || ''),
        cloudUpdatedAt: String(asset.updated_at || ''),
        sha256: String(asset.sha256 || '')
      };
      await writeShortcutIconState(state.icons, state.meta);
      return { shortcutId, dataUrl };
    }

    async function syncWallpapers() {
      let allRemoteAssets = (await transport.listAssets())
        .filter((asset) => getAssetKind(asset) === WALLPAPER_KIND);
      let remoteAssets = allRemoteAssets.filter((asset) => !asset.deleted_at).slice(0, MAX_ASSETS);
      let remoteByClientId = new Map(allRemoteAssets.map((asset) => [asset.client_asset_id, asset]));
      let deleted = 0;
      for (const tombstone of allRemoteAssets.filter((asset) => asset.deleted_at)) {
        if (!WALLPAPER_CLIENT_ID_PATTERN.test(String(tombstone.client_asset_id || ''))) continue;
        await store.remove(tombstone.client_asset_id);
        deleted += 1;
      }
      const localRecords = (await store.readAll())
        .filter((record) => WALLPAPER_CLIENT_ID_PATTERN.test(String(record && record.id || '')))
        .slice(0, MAX_ASSETS);
      let uploaded = 0;
      for (const record of localRecords) {
        const remote = remoteByClientId.get(record.id);
        if (!remote && !record.cloudAssetId) {
          await uploadRecord(record);
          uploaded += 1;
        }
      }
      if (uploaded > 0) {
        allRemoteAssets = (await transport.listAssets())
          .filter((asset) => getAssetKind(asset) === WALLPAPER_KIND);
        remoteAssets = allRemoteAssets.filter((asset) => !asset.deleted_at).slice(0, MAX_ASSETS);
        remoteByClientId = new Map(allRemoteAssets.map((asset) => [asset.client_asset_id, asset]));
      }
      const refreshedLocal = new Map((await store.readAll()).map((record) => [record.id, record]));
      let downloaded = 0;
      for (const asset of remoteAssets) {
        const local = refreshedLocal.get(asset.client_asset_id);
        if (local && String(local.cloudAssetId || '') === String(asset.id || '') &&
            String(local.cloudUpdatedAt || '') === String(asset.updated_at || '')) continue;
        await downloadAsset(asset);
        downloaded += 1;
      }
      return { ok: true, uploaded, downloaded, deleted };
    }

    async function syncShortcutIcons() {
      if (!localArea || !repository || typeof repository.get !== 'function') {
        return { skipped: true, uploaded: 0, downloaded: 0, deleted: 0 };
      }
      const settings = await repository.get([SHORTCUTS_STORAGE_KEY]);
      const shortcuts = settings[SHORTCUTS_STORAGE_KEY];
      const validShortcutIds = new Set((Array.isArray(shortcuts) ? shortcuts : [])
        .map((item) => normalizeShortcutId(item && item.id))
        .filter(Boolean)
        .slice(0, MAX_ASSETS));
      let state = await readShortcutIconState();
      let allRemoteAssets = (await transport.listAssets())
        .filter((asset) => getAssetKind(asset) === SHORTCUT_ICON_KIND);
      let uploaded = 0;
      let downloaded = 0;
      let deleted = 0;
      const matchedMeta = {};

      for (const tombstone of allRemoteAssets.filter((asset) => asset.deleted_at)) {
        const clientAssetId = String(tombstone.client_asset_id || '');
        const tombstoneShortcutId = normalizeShortcutId(tombstone.original_name);
        if (tombstoneShortcutId) {
          delete state.icons[tombstoneShortcutId];
          delete state.meta[tombstoneShortcutId];
        }
        Object.entries(state.meta).forEach(([shortcutId, meta]) => {
          if (meta.clientAssetId === clientAssetId) {
            delete state.icons[shortcutId];
            delete state.meta[shortcutId];
          }
        });
      }

      for (const shortcutId of Object.keys(state.icons)) {
        if (!validShortcutIds.has(shortcutId)) {
          delete state.icons[shortcutId];
          delete state.meta[shortcutId];
        }
      }

      const remoteByShortcutId = new Map();
      for (const asset of allRemoteAssets.filter((item) => !item.deleted_at).slice(0, MAX_ASSETS)) {
        const shortcutId = normalizeShortcutId(asset.original_name);
        if (!shortcutId || !validShortcutIds.has(shortcutId)) {
          // A shortcut setting and its media upload travel through separate
          // endpoints. Ignoring an as-yet-unreferenced icon avoids deleting it
          // during that short propagation window; explicit local removal
          // creates the durable media tombstone.
          continue;
        }
        remoteByShortcutId.set(shortcutId, asset);
      }

      await writeShortcutIconState(state.icons, state.meta);
      for (const shortcutId of validShortcutIds) {
        const localDataUrl = state.icons[shortcutId];
        const remote = remoteByShortcutId.get(shortcutId);
        if (localDataUrl && !remote) {
          await uploadShortcutIcon(shortcutId, localDataUrl);
          uploaded += 1;
          continue;
        }
        if (!localDataUrl && remote) {
          await downloadShortcutIcon(remote);
          downloaded += 1;
          continue;
        }
        if (!localDataUrl || !remote) continue;
        const localSha256 = await sha256Hex(dataUrlToBlob(localDataUrl), cryptoApi);
        if (localSha256 === String(remote.sha256 || '')) {
          matchedMeta[shortcutId] = {
            clientAssetId: String(remote.client_asset_id || ''),
            cloudAssetId: String(remote.id || ''),
            cloudUpdatedAt: String(remote.updated_at || ''),
            sha256: localSha256
          };
          continue;
        }
        const meta = state.meta[shortcutId];
        if (meta && meta.cloudAssetId === String(remote.id || '') &&
            meta.cloudUpdatedAt === String(remote.updated_at || '')) {
          await uploadShortcutIcon(shortcutId, localDataUrl);
          uploaded += 1;
        } else {
          await downloadShortcutIcon(remote);
          downloaded += 1;
        }
      }
      state = await readShortcutIconState();
      Object.entries(matchedMeta).forEach(([shortcutId, meta]) => {
        if (state.icons[shortcutId]) state.meta[shortcutId] = meta;
      });
      await writeShortcutIconState(state.icons, state.meta);
      return { ok: true, uploaded, downloaded, deleted };
    }

    async function runSyncAll() {
      if (!(await canSync())) return { skipped: true, reason: 'cloud-disabled' };
      const queuedDeleted = await flushDeletions();
      const wallpaper = await syncWallpapers();
      const shortcutIcons = await syncShortcutIcons();
      return {
        ok: true,
        uploaded: wallpaper.uploaded + shortcutIcons.uploaded,
        downloaded: wallpaper.downloaded + shortcutIcons.downloaded,
        deleted: queuedDeleted + wallpaper.deleted + shortcutIcons.deleted,
        wallpaper,
        shortcutIcons
      };
    }

    function syncAll() {
      if (activeSync) return activeSync;
      activeSync = runSyncAll().finally(() => { activeSync = null; });
      return activeSync;
    }

    async function deleteRecord(clientAssetIdValue) {
      const clientAssetId = String(clientAssetIdValue || '');
      if (!WALLPAPER_CLIENT_ID_PATTERN.test(clientAssetId)) throw new Error('invalid_wallpaper_id');
      await store.remove(clientAssetId);
      if (!(await canSync())) {
        await enqueueDeletion(WALLPAPER_KIND, clientAssetId);
        return { queued: true, reason: 'cloud-disabled' };
      }
      const result = await transport.deleteAsset(clientAssetId);
      await removeQueuedDeletion(clientAssetId);
      return result;
    }

    async function deleteShortcutIcon(shortcutIdValue) {
      const shortcutId = normalizeShortcutId(shortcutIdValue);
      if (!shortcutId) throw new Error('invalid_shortcut_icon_id');
      const clientAssetId = await getShortcutIconClientAssetId(shortcutId);
      const state = await readShortcutIconState();
      delete state.icons[shortcutId];
      delete state.meta[shortcutId];
      await writeShortcutIconState(state.icons, state.meta);
      if (!(await canSync())) {
        await enqueueDeletion(SHORTCUT_ICON_KIND, clientAssetId);
        return { queued: true, reason: 'cloud-disabled' };
      }
      const result = await transport.deleteAsset(clientAssetId);
      await removeQueuedDeletion(clientAssetId);
      return result;
    }

    async function clearLocal() {
      if (store && typeof store.clear === 'function') await store.clear();
      else {
        const records = store && typeof store.readAll === 'function' ? await store.readAll() : [];
        for (const record of records) {
          if (record && typeof store.remove === 'function') await store.remove(record.key || record.id);
        }
      }
      await removeLocal([SHORTCUT_ICON_STORAGE_KEY, SHORTCUT_ICON_META_KEY, MEDIA_DELETIONS_KEY]);
      return { ok: true };
    }

    return Object.freeze({
      store,
      uploadRecord,
      downloadAsset,
      uploadShortcutIcon,
      downloadShortcutIcon,
      deleteShortcutIcon,
      syncAll,
      deleteRecord,
      clearLocal
    });
  }

  return Object.freeze({
    DB_NAME,
    STORE_NAME,
    WALLPAPER_KIND,
    SHORTCUT_ICON_KIND,
    SHORTCUT_ICON_STORAGE_KEY,
    SHORTCUTS_STORAGE_KEY,
    SHORTCUT_ICON_META_KEY,
    MEDIA_DELETIONS_KEY,
    MAX_ASSET_BYTES,
    MAX_WALLPAPER_UPLOAD_BYTES,
    MAX_WALLPAPER_THUMBNAIL_BYTES,
    MAX_SHORTCUT_ICON_BYTES,
    MAX_SHORTCUT_ICON_DATA_URL_LENGTH,
    MAX_ASSETS,
    hasImageSignature,
    dataUrlToBlob,
    blobToDataUrl,
    sha256Hex,
    sha256Text,
    getDataUrlByteLength,
    normalizeShortcutIconMap,
    createIndexedDbStore,
    createRuntime
  });
});
