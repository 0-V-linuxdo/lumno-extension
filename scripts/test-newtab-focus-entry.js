const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const sourcePath = path.join(repoRoot, 'src/newtab/newtab-focus-entry.js');
const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '';
const backgroundSource = fs.readFileSync(
  path.join(repoRoot, 'src/background/background.js'),
  'utf8'
);
const storageKey = '_x_extension_newtab_input_auto_focus_enabled_2026_unique_';

assert.match(
  html,
  /<script src="newtab-focus-entry\.js"><\/script>/,
  'the maintained New Tab page should load the preference-aware focus entry router'
);
assert.ok(
  html.indexOf('<script src="../shared/settings.js"></script>') <
    html.indexOf('<script src="newtab-focus-entry.js"></script>'),
  'the shared setting contract should load before the focus entry router'
);
assert.ok(
  html.indexOf('<script src="newtab-focus-entry.js"></script>') <
    html.indexOf('<script src="wallpaper-preload.js"></script>'),
  'the focus route should settle before the New Tab starts visual preloading'
);
assert.match(
  html,
  /html\[data-nt-focus-route-pending="true"\][\s\S]*visibility:\s*hidden/,
  'the direct New Tab page should stay hidden while an enabled redirect decision is pending'
);

function runEntry({ storedValue, search = '', storageAvailable = true }) {
  const replacedUrls = [];
  const attributes = new Set();
  let storageReads = 0;
  const href = `chrome-extension://abc/src/newtab/newtab.html${search}`;
  const location = {
    href,
    search,
    replace(url) {
      replacedUrls.push(url);
    }
  };
  const chromeApi = storageAvailable
    ? {
        storage: {
          sync: {
            get(keys, callback) {
              storageReads += 1;
              assert.deepStrictEqual(Array.from(keys), [storageKey]);
              callback({ [storageKey]: storedValue });
            }
          }
        }
      }
    : {};
  const sandbox = {
    URL,
    chrome: chromeApi,
    document: {
      documentElement: {
        setAttribute(name) {
          attributes.add(name);
        },
        removeAttribute(name) {
          attributes.delete(name);
        }
      }
    },
    LumnoSettings: {
      NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY: storageKey,
      normalizeNewtabInputAutoFocusEnabled(value) {
        return value === true;
      }
    },
    window: {
      chrome: chromeApi,
      location
    }
  };
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  return { attributes, replacedUrls, storageReads };
}

{
  const result = runEntry({ storedValue: false });
  assert.deepStrictEqual(result.replacedUrls, []);
  assert.strictEqual(result.storageReads, 1);
  assert.strictEqual(result.attributes.has('data-nt-focus-route-pending'), false);
}

{
  const result = runEntry({ storedValue: undefined });
  assert.deepStrictEqual(result.replacedUrls, [], 'the missing preference should default to disabled');
  assert.strictEqual(result.storageReads, 1);
  assert.strictEqual(result.attributes.has('data-nt-focus-route-pending'), false);
}

{
  const result = runEntry({ storedValue: true });
  assert.deepStrictEqual(
    result.replacedUrls,
    ['chrome-extension://abc/src/newtab/newtab.html?focus=1'],
    'an existing enabled preference should retain the renderer-navigation focus handoff'
  );
  assert.strictEqual(result.storageReads, 1);
}

{
  const result = runEntry({ search: '?focus=1', storedValue: true });
  assert.deepStrictEqual(result.replacedUrls, []);
  assert.strictEqual(result.storageReads, 0, 'the focused destination must not redirect again');
}

{
  const result = runEntry({ storageAvailable: false });
  assert.deepStrictEqual(result.replacedUrls, [], 'storage failures should preserve the disabled default');
  assert.strictEqual(result.attributes.has('data-nt-focus-route-pending'), false);
}

const openNewTabBlock = backgroundSource.match(/case 'openNewTab': \{([\s\S]*?)\n    \}/);
assert(openNewTabBlock, 'background should expose the openNewTab action');
assert.doesNotMatch(
  openNewTabBlock[1],
  /\burl\s*:/,
  'openNewTab should omit an extension URL so Chromium opens chrome://newtab'
);
assert.match(
  openNewTabBlock[1],
  /createTabWithSourceGroup\(\{[\s\S]*active:/,
  'openNewTab should retain foreground/background disposition while using the browser New Tab route'
);

console.log('newtab focus entry tests passed');
