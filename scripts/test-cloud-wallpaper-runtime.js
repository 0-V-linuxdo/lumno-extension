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

function pngDataUrl(suffix) {
  const bytes = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(String(suffix || 'icon'))
  ]);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function createArea(initialValues) {
  const values = { ...(initialValues || {}) };
  return {
    values,
    get(keys, callback) {
      const result = Object.fromEntries((Array.isArray(keys) ? keys : Object.keys(values)).flatMap((key) => (
        Object.prototype.hasOwnProperty.call(values, key) ? [[key, values[key]]] : []
      )));
      callback(result);
    },
    set(payload, callback) {
      Object.assign(values, payload);
      if (callback) callback();
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete values[key]);
      if (callback) callback();
    }
  };
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
  const objects = new Map();
  const session = { user: { id: '11111111-1111-4111-8111-111111111111' } };
  const transport = {
    async getSession() { return session; },
    async upsertAsset(asset) {
      const row = { ...asset, updated_at: '2026-08-01T00:00:00.000Z' };
      const existingIndex = assets.findIndex((item) => item.client_asset_id === row.client_asset_id);
      if (existingIndex >= 0) {
        row.id = assets[existingIndex].id;
        row.updated_at = '2026-08-02T00:00:00.000Z';
        assets[existingIndex] = row;
      } else {
        assets.push(row);
      }
      return { ...row };
    },
    async uploadObject(path, blob) {
      uploads.push({ path, size: blob.size });
      objects.set(path, blob);
    },
    async deleteAsset(clientAssetId) {
      const asset = assets.find((item) => item.client_asset_id === clientAssetId);
      if (asset) asset.deleted_at = '2026-08-03T00:00:00.000Z';
      return { ok: true, deleted: Boolean(asset) };
    },
    async listAssets() { return assets.map((asset) => ({ ...asset })); },
    async downloadObject(path) {
      return objects.get(path) || wallpaperApi.dataUrlToBlob(
        path.includes('thumb') ? webpDataUrl('remote-thumb') : webpDataUrl('remote-full')
      );
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

  const shortcutId = 'shortcut-1700000000000-cloud';
  const firstIcon = pngDataUrl('first-icon');
  const firstIconArea = createArea({
    [wallpaperApi.SHORTCUTS_STORAGE_KEY]: [{ id: shortcutId, url: 'https://example.com/' }],
    [wallpaperApi.SHORTCUT_ICON_STORAGE_KEY]: { [shortcutId]: firstIcon }
  });
  const iconRepository = {
    async getMode() { return repositoryApi.MODE_CLOUD; },
    async get(keys) {
      return Object.fromEntries(keys.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(firstIconArea.values, key)
          ? [[key, firstIconArea.values[key]]]
          : []
      )));
    }
  };
  const iconRuntime = wallpaperApi.createRuntime({
    transport,
    repository: iconRepository,
    localArea: firstIconArea,
    store: createStore([]),
    cryptoApi: webcrypto,
    uuid: () => '33333333-3333-4333-8333-333333333333'
  });
  const iconUpload = await iconRuntime.uploadShortcutIcon(shortcutId, firstIcon);
  assert.strictEqual(iconUpload.ok, true);
  const iconAsset = assets.find((asset) => asset.asset_kind === wallpaperApi.SHORTCUT_ICON_KIND);
  assert(iconAsset, 'shortcut icons should be uploaded as private typed media');
  assert.strictEqual(iconAsset.original_name, shortcutId);
  assert.match(iconAsset.client_asset_id, /^shortcut-icon-[0-9a-f]{64}$/);
  assert.match(iconAsset.storage_path, /\/shortcut-icons\//);

  const secondIconArea = createArea({
    [wallpaperApi.SHORTCUTS_STORAGE_KEY]: [{ id: shortcutId, url: 'https://example.com/' }]
  });
  const secondIconRepository = {
    async getMode() { return repositoryApi.MODE_CLOUD; },
    async get(keys) {
      return Object.fromEntries(keys.flatMap((key) => (
        Object.prototype.hasOwnProperty.call(secondIconArea.values, key)
          ? [[key, secondIconArea.values[key]]]
          : []
      )));
    }
  };
  const secondIconRuntime = wallpaperApi.createRuntime({
    transport,
    repository: secondIconRepository,
    localArea: secondIconArea,
    store: createStore([]),
    cryptoApi: webcrypto
  });
  const iconSync = await secondIconRuntime.syncAll();
  assert.strictEqual(iconSync.shortcutIcons.downloaded, 1);
  assert.strictEqual(
    secondIconArea.values[wallpaperApi.SHORTCUT_ICON_STORAGE_KEY][shortcutId],
    firstIcon,
    'a second device should restore custom shortcut icon bytes'
  );

  const replacementIcon = pngDataUrl('replacement-icon');
  secondIconArea.values[wallpaperApi.SHORTCUT_ICON_STORAGE_KEY][shortcutId] = replacementIcon;
  const replacementSync = await secondIconRuntime.syncAll();
  assert.strictEqual(replacementSync.shortcutIcons.uploaded, 1,
    'a local icon edit should win when it is based on the current cloud metadata');
  assert.notStrictEqual(iconAsset.sha256, assets.find((asset) => (
    asset.asset_kind === wallpaperApi.SHORTCUT_ICON_KIND
  )).sha256);

  await secondIconRuntime.deleteShortcutIcon(shortcutId);
  assert.strictEqual(
    secondIconArea.values[wallpaperApi.SHORTCUT_ICON_STORAGE_KEY][shortcutId],
    undefined,
    'deleting a custom icon should remove its local bytes'
  );
  assert(assets.find((asset) => asset.asset_kind === wallpaperApi.SHORTCUT_ICON_KIND).deleted_at,
    'deleting a custom icon should leave a cloud tombstone');

  assets.find((asset) => asset.asset_kind === wallpaperApi.WALLPAPER_KIND).deleted_at =
    '2026-08-02T00:00:00.000Z';
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
