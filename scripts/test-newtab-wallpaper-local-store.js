const assert = require('assert');

const wallpaperStoreApi = require('../src/newtab/wallpaper-local-store.js');

function dataUrlBytes(dataUrl) {
  return Buffer.from(String(dataUrl).split(',')[1] || '', 'base64').byteLength;
}

function createStore(options) {
  const settings = options || {};
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        drawImage() {},
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low'
      };
    },
    toDataURL(type, quality) {
      assert.strictEqual(type, 'image/webp');
      const byteLength = quality > 0.7
        ? wallpaperStoreApi.MAX_WALLPAPER_BYTES + 1
        : (settings.outputBytes || 100);
      return `data:image/webp;base64,${Buffer.alloc(byteLength, 1).toString('base64')}`;
    }
  };
  class FakeFileReader {
    readAsDataURL() {
      this.result = 'data:image/png;base64,c291cmNl';
      this.onload();
    }
  }
  class FakeImage {
    set src(_value) {
      this.naturalWidth = settings.width || 4000;
      this.naturalHeight = settings.height || 3000;
      this.onload();
    }
  }
  return wallpaperStoreApi.createWallpaperLocalStore({
    documentObj: { createElement: () => canvas },
    windowObj: {
      FileReader: FakeFileReader,
      Image: FakeImage
    }
  });
}

async function run() {
  assert.strictEqual(wallpaperStoreApi.MAX_SOURCE_BYTES, 25 * 1024 * 1024);
  assert.strictEqual(wallpaperStoreApi.MAX_WALLPAPER_BYTES, 2 * 1024 * 1024);
  assert.strictEqual(wallpaperStoreApi.MAX_THUMBNAIL_BYTES, 160 * 1024);
  assert.deepStrictEqual(
    Array.from(wallpaperStoreApi.ACCEPTED_SOURCE_MIME_TYPES),
    ['image/jpeg', 'image/png', 'image/webp']
  );

  const record = await createStore().buildRecordFromFile({
    type: 'image/png',
    size: 5 * 1024 * 1024,
    name: 'wallpaper.png'
  });
  assert.strictEqual(record.width, 2560);
  assert.strictEqual(record.height, 1440);
  assert(dataUrlBytes(record.imageDataUrl) <= wallpaperStoreApi.MAX_WALLPAPER_BYTES);
  assert(dataUrlBytes(record.thumbnailDataUrl) <= wallpaperStoreApi.MAX_THUMBNAIL_BYTES);
  assert.match(record.imageDataUrl, /^data:image\/webp;base64,/);

  await assert.rejects(
    () => createStore().buildRecordFromFile({
      type: 'image/png',
      size: wallpaperStoreApi.MAX_SOURCE_BYTES + 1,
      name: 'huge.png'
    }),
    /source file is too large/
  );
  await assert.rejects(
    () => createStore().buildRecordFromFile({ type: 'image/svg+xml', size: 100, name: 'polyglot.svg' }),
    /Invalid image file/
  );
  await assert.rejects(
    () => createStore({ width: 9000, height: 100 }).buildRecordFromFile({
      type: 'image/webp',
      size: 100,
      name: 'wide.webp'
    }),
    /source dimensions are too large/
  );

  console.log('newtab wallpaper local store tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
