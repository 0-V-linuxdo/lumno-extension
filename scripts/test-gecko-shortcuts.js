const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function loadGeckoShortcuts(sandboxExtras) {
  const sandbox = Object.assign({ console }, sandboxExtras || {});
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync('src/shared/gecko-shortcuts.js', 'utf8'), sandbox, {
    filename: 'src/shared/gecko-shortcuts.js'
  });
  assert.ok(sandbox.LumnoGeckoShortcuts, 'LumnoGeckoShortcuts should be exported');
  return sandbox.LumnoGeckoShortcuts;
}

const gecko = loadGeckoShortcuts();

assert.strictEqual(gecko.getDefaultShortcut('show-search'), 'Alt+K');
assert.strictEqual(gecko.getDefaultShortcut('show-tab-switcher'), 'Alt+Q');
assert.strictEqual(gecko.getDefaultShortcut('show-search-prefill'), 'Alt+L');
assert.strictEqual(gecko.getDefaultShortcut('show-search-prefill-v'), 'Alt+Shift+C');

assert.strictEqual(gecko.isConflictingShortcut(''), true);
assert.strictEqual(gecko.isConflictingShortcut('Ctrl+Shift+K'), true);
assert.strictEqual(gecko.isConflictingShortcut('Ctrl+Shift+C'), true);
assert.strictEqual(gecko.isConflictingShortcut('Ctrl+Shift+I'), true);
assert.strictEqual(gecko.isConflictingShortcut('Command+Shift+K'), true);
assert.strictEqual(gecko.isConflictingShortcut('Alt+K'), false);
assert.strictEqual(gecko.isConflictingShortcut('Alt+Q'), false);

assert.strictEqual(gecko.isGeckoRuntime(), false, 'Node test runtime is not Gecko');
assert.strictEqual(
  gecko.resolveShortcut('show-search', 'Ctrl+Shift+K'),
  'Ctrl+Shift+K',
  'Chrome runtime should keep the current shortcut'
);

const firefoxGecko = loadGeckoShortcuts({
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

const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
assert.match(
  backgroundSource,
  /typeof importScripts !== 'function'/,
  'Firefox event pages have no importScripts and must skip worker-only loading'
);
assert.match(
  backgroundSource,
  /lumnoImportScript\('src\/shared\/gecko-shortcuts\.js'/,
  'Background worker entry should load gecko shortcut helpers first'
);
assert.match(
  backgroundSource,
  /triggerShowSearchForTab\(tab, 'action'\)/,
  'Gecko toolbar clicks should open the command bar instead of Document PiP'
);
assert.match(
  backgroundSource,
  /browser\.search\.search/,
  'Firefox search fallback should use browser.search.search'
);

const observerSource = fs.readFileSync('src/content/shortcut-key-observer.js', 'utf8');
assert.match(observerSource, /applyGeckoPageShortcutDefaults/, 'Page observer should seed Gecko defaults immediately');

const hotkeySource = fs.readFileSync('src/content/hotkey-listener.js', 'utf8');
assert.match(hotkeySource, /applyGeckoHotkeyDefaults/, 'Hotkey listener should seed Gecko defaults immediately');

console.log('gecko shortcuts ok');
