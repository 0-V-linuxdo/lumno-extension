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
  const CLIENT_ID_PATTERN = /^custom-wallpaper-[a-zA-Z0-9-]{1,100}$/;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const MAX_ASSET_BYTES = 5 * 1024 * 1024;
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

  function createUuid(cryptoApi) {
    const api = cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    if (api && typeof api.randomUUID === 'function') return api.randomUUID();
    const part = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    return `${part()}${part()}-${part()}-4${part().slice(1)}-8${part().slice(1)}-${part()}${part()}${part()}`;
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

  async function sha256Hex(blob, cryptoApi) {
    const api = cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    if (!api || !api.subtle) throw new Error('crypto_unavailable');
    const digest = await api.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  function extensionForMime(mimeType) {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/jpeg') return 'jpg';
    return 'webp';
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
      remove(key) { return transact('readwrite', (store) => store.delete(key)); }
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
    const store = config.store || createIndexedDbStore(config.indexedDBApi ||
      (typeof indexedDB !== 'undefined' ? indexedDB : null));
    const cryptoApi = config.cryptoApi || (typeof crypto !== 'undefined' ? crypto : null);
    const uuid = typeof config.uuid === 'function' ? config.uuid : () => createUuid(cryptoApi);
    const getImageDimensions = typeof config.getImageDimensions === 'function'
      ? config.getImageDimensions
      : defaultGetImageDimensions;
    let activeSync = null;

    async function canSync() {
      if (!transport || !repository || await repository.getMode() !== repositoryApi.MODE_CLOUD) return null;
      return transport.getSession();
    }

    async function uploadRecord(recordValue) {
      const session = await canSync();
      if (!session) return { skipped: true, reason: 'cloud-disabled' };
      const record = recordValue && typeof recordValue === 'object' ? recordValue : {};
      const clientAssetId = String(record.id || '').trim();
      if (!CLIENT_ID_PATTERN.test(clientAssetId)) throw new Error('invalid_wallpaper_id');
      const imageBlob = dataUrlToBlob(record.imageDataUrl);
      const thumbnailBlob = dataUrlToBlob(record.thumbnailDataUrl || record.imageDataUrl);
      const dimensions = await getImageDimensions(imageBlob);
      const width = Math.max(1, Math.min(2560, Math.round(Number(record.width) || dimensions.width || 1920)));
      const height = Math.max(1, Math.min(2560, Math.round(Number(record.height) || dimensions.height || 1080)));
      const assetId = UUID_PATTERN.test(String(record.cloudAssetId || '')) ? record.cloudAssetId : uuid();
      const imageExtension = extensionForMime(imageBlob.type);
      const thumbExtension = extensionForMime(thumbnailBlob.type);
      const storagePath = `${session.user.id}/wallpapers/${assetId}.${imageExtension}`;
      const thumbnailPath = `${session.user.id}/wallpaper-thumbs/${assetId}.${thumbExtension}`;
      const sha256 = await sha256Hex(imageBlob, cryptoApi);
      const asset = await transport.upsertAsset({
        id: assetId,
        client_asset_id: clientAssetId,
        original_name: String(record.name || '').slice(0, 200),
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        sha256,
        mime_type: imageBlob.type,
        byte_size: imageBlob.size,
        width,
        height
      });
      try {
        await transport.uploadObject(storagePath, imageBlob, imageBlob.type);
        await transport.uploadObject(thumbnailPath, thumbnailBlob, thumbnailBlob.type);
      } catch (error) {
        await transport.deleteAsset(clientAssetId).catch(() => {});
        throw error;
      }
      const nextRecord = {
        ...record,
        id: clientAssetId,
        key: String(record.key || clientAssetId),
        width,
        height,
        cloudAssetId: String(asset.id || assetId),
        cloudUpdatedAt: String(asset.updated_at || new Date().toISOString())
      };
      await store.write(nextRecord);
      return { ok: true, asset, record: nextRecord };
    }

    async function downloadAsset(asset) {
      const clientAssetId = String(asset && asset.client_asset_id || '');
      if (!CLIENT_ID_PATTERN.test(clientAssetId)) throw new Error('invalid_wallpaper_id');
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

    async function runSyncAll() {
      if (!(await canSync())) return { skipped: true, reason: 'cloud-disabled' };
      let allRemoteAssets = await transport.listAssets();
      let remoteAssets = allRemoteAssets.filter((asset) => !asset.deleted_at).slice(0, MAX_ASSETS);
      let remoteByClientId = new Map(allRemoteAssets.map((asset) => [asset.client_asset_id, asset]));
      let deleted = 0;
      for (const tombstone of allRemoteAssets.filter((asset) => asset.deleted_at)) {
        if (!CLIENT_ID_PATTERN.test(String(tombstone.client_asset_id || ''))) continue;
        await store.remove(tombstone.client_asset_id);
        deleted += 1;
      }
      const localRecords = (await store.readAll())
        .filter((record) => CLIENT_ID_PATTERN.test(String(record && record.id || '')))
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
        allRemoteAssets = await transport.listAssets();
        remoteAssets = allRemoteAssets.filter((asset) => !asset.deleted_at).slice(0, MAX_ASSETS);
        remoteByClientId = new Map(allRemoteAssets.map((asset) => [asset.client_asset_id, asset]));
      }
      const refreshedLocal = new Map((await store.readAll()).map((record) => [record.id, record]));
      let downloaded = 0;
      for (const asset of remoteAssets) {
        const local = refreshedLocal.get(asset.client_asset_id);
        if (local && String(local.cloudAssetId || '') === String(asset.id || '') &&
            String(local.cloudUpdatedAt || '') === String(asset.updated_at || '')) {
          continue;
        }
        await downloadAsset(asset);
        downloaded += 1;
      }
      return { ok: true, uploaded, downloaded, deleted };
    }

    function syncAll() {
      if (activeSync) return activeSync;
      activeSync = runSyncAll().finally(() => { activeSync = null; });
      return activeSync;
    }

    async function deleteRecord(clientAssetId) {
      if (!(await canSync())) return { skipped: true, reason: 'cloud-disabled' };
      if (!CLIENT_ID_PATTERN.test(String(clientAssetId || ''))) throw new Error('invalid_wallpaper_id');
      const result = await transport.deleteAsset(clientAssetId);
      await store.remove(clientAssetId);
      return result;
    }

    return Object.freeze({
      store,
      uploadRecord,
      downloadAsset,
      syncAll,
      deleteRecord
    });
  }

  return Object.freeze({
    DB_NAME,
    STORE_NAME,
    MAX_ASSET_BYTES,
    MAX_ASSETS,
    hasImageSignature,
    dataUrlToBlob,
    blobToDataUrl,
    sha256Hex,
    createIndexedDbStore,
    createRuntime
  });
});
