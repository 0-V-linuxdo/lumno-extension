const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadGeckoRuntime(sandboxExtras) {
  const sandbox = Object.assign({ console }, sandboxExtras || {});
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync('src/shared/gecko-runtime.js', 'utf8'), sandbox, {
    filename: 'src/shared/gecko-runtime.js'
  });
  assert.ok(sandbox.LumnoGeckoRuntime, 'LumnoGeckoRuntime should be exported');
  return sandbox.LumnoGeckoRuntime;
}

const gecko = loadGeckoRuntime();
assert.strictEqual(gecko.PRODUCT_TAG, '0.9.51-firefox-v1.0.0');
assert.strictEqual(gecko.getDefaultShortcut('show-search'), 'Alt+K');
assert.strictEqual(gecko.getDefaultShortcut('show-tab-switcher'), 'Alt+Q');
assert.strictEqual(gecko.isGeckoRuntime(), false, 'Node test runtime is not Gecko');
assert.strictEqual(gecko.resolveShortcut('show-search', 'Ctrl+Shift+K'), 'Ctrl+Shift+K');

const firefoxGecko = loadGeckoRuntime({
  chrome: {
    runtime: {
      getURL() {
        return 'moz-extension://lumno-id/';
      }
    }
  }
});
assert.strictEqual(firefoxGecko.isGeckoRuntime(), true);
assert.strictEqual(firefoxGecko.resolveShortcut('show-search', ''), 'Alt+K');
assert.strictEqual(firefoxGecko.resolveShortcut('show-search', 'Ctrl+Shift+K'), 'Alt+K');
assert.strictEqual(firefoxGecko.resolveShortcut('show-tab-switcher', ''), 'Alt+Q');
assert.strictEqual(firefoxGecko.resolveShortcut('show-search', 'Alt+Slash'), 'Alt+Slash');

const polyfill = fs.readFileSync('src/background/gecko-mv2-polyfill.js', 'utf8');
assert.match(polyfill, /new Promise/, 'MV2 polyfill should return a Promise like chrome.scripting');
assert.match(polyfill, /chrome\.tabs\.executeScript/, 'MV2 polyfill should use tabs.executeScript');
assert.match(polyfill, /chrome\.browserAction/, 'MV2 polyfill should alias browserAction to action');

const observerSource = fs.readFileSync('src/content/shortcut-key-observer.js', 'utf8');
assert.match(observerSource, /applyGeckoPageShortcutDefaults/, 'Page observer should seed Gecko defaults immediately');
assert.match(observerSource, /triggerTabSwitcherFromGeckoHotkey/, 'Page observer should relay Alt+Q on Gecko');

const hotkeySource = fs.readFileSync('src/content/hotkey-listener.js', 'utf8');
assert.match(hotkeySource, /applyGeckoHotkeyDefaults/, 'Hotkey listener should seed Gecko defaults immediately');

console.log('gecko runtime ok');
