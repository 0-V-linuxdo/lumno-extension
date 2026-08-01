(function(root) {
  'use strict';

  const CUSTOM_WALLPAPER_ID = 'custom-upload';
  const CUSTOM_WALLPAPER_ID_PREFIX = 'custom-wallpaper-';
  const DB_NAME = 'lumno-newtab-wallpaper';
  const DB_VERSION = 1;
  const STORE_NAME = 'wallpapers';
  const LEGACY_RECORD_KEY = 'custom';
  const OUTPUT_RATIO = 16 / 9;
  const MAX_OUTPUT_WIDTH = 2560;
  const THUMBNAIL_WIDTH = 480;
  const LEGACY_GENERIC_NAMES = [
    'Custom wallpaper',
    '\u81ea\u5b9a\u4e49\u58c1\u7eb8'
  ];

  function getOption(options, key, fallback) {
    if (options && Object.prototype.hasOwnProperty.call(options, key)) {
      return options[key];
    }
    return fallback;
  }

  function isCustomWallpaperId(id) {
    return String(id || '').startsWith(CUSTOM_WALLPAPER_ID_PREFIX);
  }

  function isGenericCustomWallpaperName(name) {
    const normalized = String(name || '').trim();
    if (!normalized) {
      return true;
    }
    return LEGACY_GENERIC_NAMES.indexOf(normalized) !== -1;
  }

  function createWallpaperLocalStore(options) {
    const documentObj = getOption(options, 'documentObj', root.document);
    const windowObj = getOption(options, 'windowObj', root.window);

    function normalizeRecord(record) {
      if (!record || typeof record !== 'object') {
        return null;
      }
      const imageDataUrl = String(record.imageDataUrl || '');
      const thumbnailDataUrl = String(record.thumbnailDataUrl || imageDataUrl);
      if (!imageDataUrl || !thumbnailDataUrl) {
        return null;
      }
      const rawId = String(record.id || record.key || '').trim();
      const isLegacyRecord = rawId === CUSTOM_WALLPAPER_ID ||
        String(record.key || '') === LEGACY_RECORD_KEY;
      const id = isCustomWallpaperId(rawId)
        ? rawId
        : `${CUSTOM_WALLPAPER_ID_PREFIX}${isLegacyRecord ? 'legacy' : Date.now()}`;
      const storedName = String(record.name || '').trim();
      return {
        id,
        key: String(record.key || id),
        name: isLegacyRecord && isGenericCustomWallpaperName(storedName) ? '' : storedName,
        imageDataUrl,
        thumbnailDataUrl,
        width: Math.max(0, Number(record.width) || 0),
        height: Math.max(0, Number(record.height) || 0),
        updatedAt: Number(record.updatedAt) || Date.now(),
        cloudAssetId: String(record.cloudAssetId || ''),
        cloudUpdatedAt: String(record.cloudUpdatedAt || '')
      };
    }

    function openDb() {
      return new Promise((resolve, reject) => {
        if (!windowObj || !windowObj.indexedDB) {
          reject(new Error('IndexedDB is not available.'));
          return;
        }
        const request = windowObj.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        request.onerror = () => {
          reject(request.error || new Error('Failed to open wallpaper database.'));
        };
        request.onsuccess = () => {
          resolve(request.result);
        };
      });
    }

    function readAll() {
      return openDb().then((db) => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = typeof store.getAll === 'function' ? store.getAll() : null;
          if (!request) {
            reject(new Error('Wallpaper database does not support getAll.'));
            return;
          }
          request.onerror = () => {
            reject(request.error || new Error('Failed to read wallpapers.'));
          };
          request.onsuccess = () => {
            const records = Array.isArray(request.result) ? request.result : [];
            resolve(records
              .map(normalizeRecord)
              .filter(Boolean)
              .sort((a, b) => a.updatedAt - b.updatedAt));
          };
          transaction.oncomplete = () => {
            db.close();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error || new Error('Failed to read wallpapers.'));
          };
        });
      });
    }

    function write(record) {
      return openDb().then((db) => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.put(Object.assign({}, record, { key: record.key || record.id }));
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error || new Error('Failed to save wallpaper.'));
          };
        });
      });
    }

    function remove(record) {
      return openDb().then((db) => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.delete(record && record.key ? record.key : '');
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error || new Error('Failed to delete wallpaper.'));
          };
        });
      });
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
          reject(reader.error || new Error('Failed to read image.'));
        };
        reader.onload = () => {
          resolve(String(reader.result || ''));
        };
        reader.readAsDataURL(file);
      });
    }

    function loadImageFromDataUrl(dataUrl) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve(image);
        };
        image.onerror = () => {
          reject(new Error('Failed to load image.'));
        };
        image.src = dataUrl;
      });
    }

    function getCenteredCrop(width, height) {
      const sourceWidth = Math.max(1, Number(width) || 1);
      const sourceHeight = Math.max(1, Number(height) || 1);
      const sourceRatio = sourceWidth / sourceHeight;
      if (sourceRatio > OUTPUT_RATIO) {
        const cropWidth = Math.round(sourceHeight * OUTPUT_RATIO);
        return {
          x: Math.round((sourceWidth - cropWidth) / 2),
          y: 0,
          width: cropWidth,
          height: sourceHeight
        };
      }
      const cropHeight = Math.round(sourceWidth / OUTPUT_RATIO);
      return {
        x: 0,
        y: Math.round((sourceHeight - cropHeight) / 2),
        width: sourceWidth,
        height: cropHeight
      };
    }

    function renderCroppedDataUrl(image, crop, targetWidth, quality) {
      const canvas = documentObj.createElement('canvas');
      const width = Math.max(1, Math.round(targetWidth));
      const height = Math.max(1, Math.round(width / OUTPUT_RATIO));
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available.');
      }
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/webp', quality);
      return dataUrl && dataUrl.startsWith('data:image/webp')
        ? dataUrl
        : canvas.toDataURL('image/jpeg', quality);
    }

    function buildRecordFromFile(file) {
      if (!file || !String(file.type || '').startsWith('image/')) {
        return Promise.reject(new Error('Invalid image file.'));
      }
      return readFileAsDataUrl(file).then((dataUrl) => {
        return loadImageFromDataUrl(dataUrl);
      }).then((image) => {
        const crop = getCenteredCrop(image.naturalWidth || image.width, image.naturalHeight || image.height);
        const outputWidth = Math.min(MAX_OUTPUT_WIDTH, Math.max(1, crop.width));
        const wallpaperDataUrl = renderCroppedDataUrl(image, crop, outputWidth, 0.9);
        const thumbnailDataUrl = renderCroppedDataUrl(image, crop, THUMBNAIL_WIDTH, 0.78);
        return {
          id: `${CUSTOM_WALLPAPER_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name
            ? String(file.name).replace(/\.[^.]+$/, '')
            : '',
          imageDataUrl: wallpaperDataUrl,
          thumbnailDataUrl,
          width: outputWidth,
          height: Math.max(1, Math.round(outputWidth / OUTPUT_RATIO)),
          updatedAt: Date.now()
        };
      });
    }

    return {
      buildRecordFromFile,
      isCustomWallpaperId,
      normalizeRecord,
      readAll,
      remove,
      write
    };
  }

  root.LumnoNewtabWallpaperLocalStore = {
    CUSTOM_WALLPAPER_ID,
    CUSTOM_WALLPAPER_ID_PREFIX,
    createWallpaperLocalStore
  };
})(globalThis);
