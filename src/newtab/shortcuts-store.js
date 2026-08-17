(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoNewtabShortcutsStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const DEFAULT_SHORTCUTS_KEY = '_x_extension_newtab_shortcuts_2026_unique_';
  const DEFAULT_MAX_SHORTCUTS = 60;
  const DEFAULT_SHORTCUTS_CHUNK_SIZE = 20;
  const DEFAULT_SHORTCUTS_CHUNK_KEYS = Object.freeze([
    DEFAULT_SHORTCUTS_KEY,
    '_x_extension_newtab_shortcuts_chunk_2_2026_unique_',
    '_x_extension_newtab_shortcuts_chunk_3_2026_unique_'
  ]);
  const DEFAULT_SHORTCUTS = Object.freeze([
    Object.freeze({
      id: 'shortcut-lumno-default',
      title: 'Lumno',
      url: 'https://lumno.kubai.design/'
    })
  ]);

  function defaultNormalizeHost(hostname) {
    return String(hostname || '').trim().toLowerCase().replace(/^www\./i, '');
  }

  function getNormalizeHost(options) {
    return options && typeof options.normalizeHost === 'function'
      ? options.normalizeHost
      : defaultNormalizeHost;
  }

  function sanitizeDisplayText(text, options) {
    const value = options && typeof options.sanitizeDisplayText === 'function'
      ? options.sanitizeDisplayText(text)
      : text;
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function getMaxShortcuts(options) {
    const raw = Number(options && options.maxShortcuts);
    return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : DEFAULT_MAX_SHORTCUTS;
  }

  function getShortcutStorageChunkSize(options) {
    const raw = Number(options && options.chunkSize);
    return Number.isFinite(raw) && raw > 0
      ? Math.max(1, Math.floor(raw))
      : DEFAULT_SHORTCUTS_CHUNK_SIZE;
  }

  function getShortcutStorageKeys(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const key = opts.key || DEFAULT_SHORTCUTS_KEY;
    const chunkSize = getShortcutStorageChunkSize(opts);
    const chunkCount = Math.max(1, Math.ceil(getMaxShortcuts(opts) / chunkSize));
    const configuredKeys = Array.isArray(opts.chunkKeys)
      ? opts.chunkKeys
      : (key === DEFAULT_SHORTCUTS_KEY ? DEFAULT_SHORTCUTS_CHUNK_KEYS : []);
    const keys = [key];
    configuredKeys.forEach((configuredKey) => {
      const normalizedKey = String(configuredKey || '').trim();
      if (normalizedKey && !keys.includes(normalizedKey)) {
        keys.push(normalizedKey);
      }
    });
    while (keys.length < chunkCount) {
      keys.push(`${key}_chunk_${keys.length + 1}`);
    }
    return keys.slice(0, chunkCount);
  }

  function stableHashCode(text) {
    const value = String(text || '');
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function normalizeShortcutUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '';
      }
      if (!parsed.hostname) {
        return '';
      }
      return parsed.toString();
    } catch (error) {
      return '';
    }
  }

  function createShortcutId(url, options) {
    const now = Number.isFinite(Number(options && options.now))
      ? Math.max(0, Math.floor(Number(options.now)))
      : Date.now();
    return `shortcut-${now}-${stableHashCode(url)}`;
  }

  function normalizeShortcutItem(item, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const source = item && typeof item === 'object' ? item : {};
    const url = normalizeShortcutUrl(source.url);
    if (!url) {
      return null;
    }
    const normalizeHost = getNormalizeHost(opts);
    let host = '';
    try {
      host = normalizeHost(new URL(url).hostname);
    } catch (error) {
      host = '';
    }
    const rawTitle = sanitizeDisplayText(source.title || source.name || '', opts);
    const title = rawTitle || host || url;
    const now = Number.isFinite(Number(opts.now))
      ? Math.max(0, Math.floor(Number(opts.now)))
      : Date.now();
    const createdAt = Math.max(0, Number(source.createdAt) || now);
    const updatedAt = Math.max(createdAt, Math.max(0, Number(source.updatedAt) || now));
    const id = sanitizeDisplayText(source.id || '', opts) || createShortcutId(url, opts);
    return {
      id,
      title,
      url,
      host,
      createdAt,
      updatedAt
    };
  }

  function createShortcutRecord(input, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const now = Number.isFinite(Number(opts.now))
      ? Math.max(0, Math.floor(Number(opts.now)))
      : Date.now();
    return normalizeShortcutItem({
      ...(input || {}),
      createdAt: now,
      updatedAt: now
    }, {
      ...opts,
      now
    });
  }

  function normalizeShortcuts(items, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const maxShortcuts = getMaxShortcuts(opts);
    if (!Array.isArray(items) || maxShortcuts <= 0) {
      return [];
    }
    const normalized = [];
    const seenUrls = new Set();
    for (let i = 0; i < items.length; i += 1) {
      const item = normalizeShortcutItem(items[i], opts);
      if (!item || seenUrls.has(item.url)) {
        continue;
      }
      seenUrls.add(item.url);
      normalized.push(item);
      if (normalized.length >= maxShortcuts) {
        break;
      }
    }
    return normalized;
  }

  function getDefaultShortcuts(options) {
    const opts = options && typeof options === 'object' ? options : {};
    return normalizeShortcuts(DEFAULT_SHORTCUTS, opts);
  }

  function storageGet(storage, keys) {
    return new Promise((resolve) => {
      if (!storage || typeof storage.get !== 'function') {
        resolve({});
        return;
      }
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      storage.get(requestedKeys, (result) => {
        resolve(result || {});
      });
    });
  }

  function storageSet(storage, value) {
    return new Promise((resolve) => {
      if (!storage || typeof storage.set !== 'function') {
        resolve();
        return;
      }
      storage.set(value, () => resolve());
    });
  }

  function loadShortcuts(storage, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const keys = getShortcutStorageKeys(opts);
    return storageGet(storage, keys).then((result) => {
      const hasStoredValue = keys.some((key) => Boolean(
        result &&
        Object.prototype.hasOwnProperty.call(result, key) &&
        typeof result[key] !== 'undefined'
      ));
      if (!hasStoredValue) {
        return getDefaultShortcuts(opts);
      }
      const items = [];
      keys.forEach((key) => {
        if (Array.isArray(result[key])) {
          items.push(...result[key]);
        }
      });
      return normalizeShortcuts(items, opts);
    });
  }

  function createShortcutStoragePayload(items, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const keys = getShortcutStorageKeys(opts);
    const chunkSize = getShortcutStorageChunkSize(opts);
    return keys.reduce((payload, key, index) => {
      const start = index * chunkSize;
      payload[key] = items.slice(start, start + chunkSize);
      return payload;
    }, {});
  }

  function saveShortcuts(storage, items, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const normalized = normalizeShortcuts(items, opts);
    return storageSet(storage, createShortcutStoragePayload(normalized, opts))
      .then(() => normalized);
  }

  function saveShortcut(storage, input, options) {
    const opts = options && typeof options === 'object' ? options : {};
    return loadShortcuts(storage, opts).then((items) => {
      const nextShortcut = createShortcutRecord(input, opts);
      if (!nextShortcut) {
        return items;
      }
      const withoutDuplicate = items.filter((item) => item && item.url !== nextShortcut.url);
      const maxShortcuts = getMaxShortcuts(opts);
      const nextItems = withoutDuplicate.concat(nextShortcut);
      const savedItems = maxShortcuts > 0 && nextItems.length <= maxShortcuts
        ? nextItems
        : items;
      return storageSet(storage, createShortcutStoragePayload(savedItems, opts))
        .then(() => savedItems);
    });
  }

  return {
    DEFAULT_SHORTCUTS_KEY,
    DEFAULT_MAX_SHORTCUTS,
    DEFAULT_SHORTCUTS_CHUNK_SIZE,
    DEFAULT_SHORTCUTS_CHUNK_KEYS,
    DEFAULT_SHORTCUTS,
    getShortcutStorageChunkSize,
    getShortcutStorageKeys,
    normalizeShortcutUrl,
    normalizeShortcutItem,
    createShortcutRecord,
    normalizeShortcuts,
    getDefaultShortcuts,
    loadShortcuts,
    saveShortcuts,
    saveShortcut
  };
});
