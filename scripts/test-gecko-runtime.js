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
assert.strictEqual(gecko.PRODUCT_TAG, '0.9.51-firefox-v1.7.0');
assert.strictEqual(gecko.FIREFOX_MANIFEST_VERSION, '1.7.0');
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
const hotkeySource = fs.readFileSync('src/content/hotkey-listener.js', 'utf8');
assert.match(observerSource, /applyGeckoPageShortcutDefaults/, 'Page observer should seed Gecko defaults immediately');
assert.match(observerSource, /triggerTabSwitcherFromGeckoHotkey/, 'Page observer should relay Alt+Q on Gecko');
assert.match(observerSource, /tryOpenCommandBarLocally/, 'Page observer should open the command bar in-page on Gecko');
assert.match(observerSource, /tryOpenTabSwitcherLocally/, 'Page observer should open the tab switcher in-page on Gecko');
assert.match(observerSource, /_x_extension_openLumnoTabSwitcher_2026_unique_/, 'Page observer should call the in-page tab switcher when preloaded');
assert.match(hotkeySource, /_x_extension_openLumnoCommandBar_2026_unique_/, 'Hotkey listener should try the in-page command bar first');

const bridgeSource = fs.readFileSync('src/overlay/gecko-overlay-bridge.js', 'utf8');
assert.match(bridgeSource, /openSearchOverlayFromBackground/, 'Gecko overlay bridge should toggle from background messages');
assert.match(bridgeSource, /showGeckoHotkeyToast/, 'Gecko overlay bridge should show hotkey failure toasts in-page');
assert.match(polyfill, /hasTabsExecute/, 'MV2 polyfill must always overwrite scripting.executeScript');
assert.match(polyfill, /function toExtensionFilePath\(/, 'Firefox tabs.executeScript needs extension-root file paths');
assert.match(polyfill, /'\/' \+ path/, 'Firefox tabs.executeScript files must start with /');
assert.match(polyfill, /codex-debug/, 'MV2 polyfill should skip a failed debug-only inject file');
assert.match(polyfill, /already been declared/, 'MV2 polyfill should continue after a redeclaration inject error');
assert.doesNotMatch(
  polyfill,
  /if \(chrome\.scripting && typeof chrome\.scripting\.executeScript === 'function'\) \{\s*return;/,
  'MV2 polyfill must not skip when Firefox already exposes scripting.executeScript'
);

function loadPolyfill() {
  const calls = [];
  const sandbox = {
    chrome: {
      action: {},
      browserAction: {},
      runtime: { lastError: null },
      tabs: {
        executeScript(tabId, details, callback) {
          calls.push({ tabId: tabId, details: details });
          if (typeof callback === 'function') {
            callback();
          }
        }
      },
      scripting: {
        executeScript() {
          throw new Error('native scripting must not run when tabs.executeScript exists');
        }
      }
    },
    console
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(polyfill, sandbox, { filename: 'src/background/gecko-mv2-polyfill.js' });
  return { chrome: sandbox.chrome, calls: calls };
}

const polyfillRuntime = loadPolyfill();
polyfillRuntime.chrome.scripting.executeScript({
  target: { tabId: 7 },
  files: ['src/shared/gecko-runtime.js', 'src/overlay/search-panel.js']
}, () => {});
assert.strictEqual(polyfillRuntime.calls.length, 2, 'polyfill injects one file at a time');
assert.strictEqual(polyfillRuntime.calls[0].details.file, '/src/shared/gecko-runtime.js');
assert.strictEqual(polyfillRuntime.calls[1].details.file, '/src/overlay/search-panel.js');
polyfillRuntime.calls.length = 0;
polyfillRuntime.chrome.scripting.executeScript({
  target: { tabId: 8 },
  files: ['/src/overlay/tab-switcher.js']
}, () => {});
assert.strictEqual(polyfillRuntime.calls[0].details.file, '/src/overlay/tab-switcher.js');

function loadPolyfillWithRedeclare() {
  const calls = [];
  const sandbox = {
    chrome: {
      action: {},
      browserAction: {},
      runtime: { lastError: null },
      tabs: {
        executeScript(tabId, details, callback) {
          calls.push({ tabId: tabId, details: details });
          if (details && details.file === '/src/shared/settings.js') {
            sandbox.chrome.runtime.lastError = { message: 'redeclaration of const settings' };
          } else {
            sandbox.chrome.runtime.lastError = null;
          }
          if (typeof callback === 'function') {
            callback();
          }
        }
      },
      scripting: {
        executeScript() {
          throw new Error('native scripting must not run when tabs.executeScript exists');
        }
      }
    },
    console
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(polyfill, sandbox, { filename: 'src/background/gecko-mv2-polyfill.js' });
  return { chrome: sandbox.chrome, calls: calls };
}

const redeclareRuntime = loadPolyfillWithRedeclare();
redeclareRuntime.chrome.scripting.executeScript({
  target: { tabId: 9 },
  files: ['src/shared/settings.js', 'src/overlay/search-panel.js']
}, () => {});
assert.strictEqual(redeclareRuntime.calls.length, 3, 'polyfill continues after redeclaration and clears lastError');
assert.strictEqual(redeclareRuntime.calls[0].details.file, '/src/shared/settings.js');
assert.strictEqual(redeclareRuntime.calls[1].details.file, '/src/overlay/search-panel.js');
assert.strictEqual(redeclareRuntime.calls[2].details.code, '1');

const mirrorSource = fs.readFileSync('src/shared/gecko-content-globals.js', 'utf8');
const windowLike = {};
const contentGlobal = {
  LumnoOverlayTabSwitcherView: { createTabSwitcherView() { return true; } },
  LumnoOverlayShell: { createOverlayMount() { return true; } },
  _x_extension_toggleTabSwitcher_2026_unique_: function() {}
};
contentGlobal.globalThis = contentGlobal;
contentGlobal.window = windowLike;
vm.runInNewContext(mirrorSource, contentGlobal, { filename: 'src/shared/gecko-content-globals.js' });
assert.strictEqual(
  windowLike.LumnoOverlayTabSwitcherView,
  contentGlobal.LumnoOverlayTabSwitcherView,
  'Gecko mirror copies Lumno APIs from globalThis onto window'
);
assert.strictEqual(
  windowLike.LumnoOverlayShell,
  contentGlobal.LumnoOverlayShell,
  'Gecko mirror copies overlay shell onto window'
);

const islandsSource = fs.readFileSync('src/react/overlay-islands.js', 'utf8');
assert.match(islandsSource, /new Proxy\(globalThis/, 'overlay-islands must dual-write onto window on Gecko');
assert.ok(
  gecko.OVERLAY_CONTENT_SCRIPT_FILES.includes('src/shared/gecko-content-globals.js'),
  'overlay content scripts must include the Gecko global mirror'
);
const islandsIndex = gecko.OVERLAY_CONTENT_SCRIPT_FILES.indexOf('src/react/overlay-islands.js');
const mirrorIndex = gecko.OVERLAY_CONTENT_SCRIPT_FILES.indexOf('src/shared/gecko-content-globals.js');
assert.ok(islandsIndex >= 0 && mirrorIndex > islandsIndex, 'mirror must run after overlay-islands');

const splitRoot = {};
const splitWindow = {};
const geckoDual = loadGeckoRuntime({ window: splitWindow });
assert.ok(geckoDual);
assert.ok(splitWindow.LumnoGeckoRuntime, 'Gecko runtime must also assign onto window');

console.log('gecko runtime ok');
