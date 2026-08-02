const assert = require('assert');
const { webcrypto } = require('crypto');

const repositoryApi = require('../src/shared/settings-repository.js');
const wallpaperApi = require('../src/background/cloud-wallpaper-runtime.js');

function webpDataUrl(suffix) {
  const bytes = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([8, 0, 0, 0]),
    Buffer.from('WEBP'),
    Buffer.from(String(suffix || 'data'))
  ]);
  return `data:image/webp;base64,${bytes.toString('base64')}`;
}

function createStore(initial) {
  const records = new Map((initial || []).map((record) => [record.id, { ...record }]));
  return {
    records,
    async readAll() { return Array.from(records.values()).map((record) => ({ ...record })); },
    async write(record) { records.set(record.id, { ...record }); },
    async remove(key) { records.delete(key); }
  };
}

async function run() {
  const validBlob = wallpaperApi.dataUrlToBlob(webpDataUrl('wallpaper'));
  assert.strictEqual(validBlob.type, 'image/webp');
  await assert.rejects(async () => wallpaperApi.dataUrlToBlob(
    `data:image/webp;base64,${Buffer.from('not-an-image').toString('base64')}`
  ), /invalid_wallpaper_signature/);
  assert.match(await wallpaperApi.blobToDataUrl(validBlob), /^data:image\/webp;base64,/);

  const localRecord = {
    id: 'custom-wallpaper-1700000000000-abcdef',
    key: 'custom-wallpaper-1700000000000-abcdef',
    name: 'My wallpaper',
    imageDataUrl: webpDataUrl('full-image'),
    thumbnailDataUrl: webpDataUrl('thumbnail'),
    updatedAt: 100
  };
  const store = createStore([localRecord]);
  const uploads = [];
  const assets = [];
  const session = { user: { id: '11111111-1111-4111-8111-111111111111' } };
  const transport = {
    async getSession() { return session; },
    async upsertAsset(asset) {
      const row = { ...asset, updated_at: '2026-08-01T00:00:00.000Z' };
      assets.splice(0, assets.length, row);
      return row;
    },
    async uploadObject(path, blob) { uploads.push({ path, size: blob.size }); },
    async deleteAsset() { return { ok: true }; },
    async listAssets() { return assets.map((asset) => ({ ...asset })); },
    async downloadObject(path) {
      return wallpaperApi.dataUrlToBlob(path.includes('thumb') ? webpDataUrl('remote-thumb') : webpDataUrl('remote-full'));
    }
  };
  const repository = { async getMode() { return repositoryApi.MODE_CLOUD; } };
  const runtime = wallpaperApi.createRuntime({
    transport,
    repository,
    store,
    cryptoApi: webcrypto,
    uuid: () => '22222222-2222-4222-8222-222222222222',
    getImageDimensions: async () => ({ width: 1920, height: 1080 })
  });
  const uploaded = await runtime.uploadRecord(localRecord);
  assert.strictEqual(uploaded.ok, true);
  assert.strictEqual(uploads.length, 2);
  assert.strictEqual(assets[0].client_asset_id, localRecord.id);
  assert.match(assets[0].sha256, /^[0-9a-f]{64}$/);
  assert.strictEqual(store.records.get(localRecord.id).cloudAssetId, '22222222-2222-4222-8222-222222222222');

  const secondStore = createStore([]);
  const secondRuntime = wallpaperApi.createRuntime({
    transport,
    repository,
    store: secondStore,
    cryptoApi: webcrypto,
    getImageDimensions: async () => ({ width: 1920, height: 1080 })
  });
  const synced = await secondRuntime.syncAll();
  assert.strictEqual(synced.downloaded, 1);
  assert.strictEqual(secondStore.records.get(localRecord.id).name, 'My wallpaper');
  assert.match(secondStore.records.get(localRecord.id).imageDataUrl, /^data:image\/webp;base64,/);

  assets[0].deleted_at = '2026-08-02T00:00:00.000Z';
  const tombstoneSync = await secondRuntime.syncAll();
  assert.strictEqual(tombstoneSync.deleted, 1);
  assert.strictEqual(secondStore.records.has(localRecord.id), false,
    'remote tombstones should remove media cached by another device');

  console.log('cloud wallpaper runtime tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
