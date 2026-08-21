const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const imported = [...backgroundSource.matchAll(/lumnoImportScript\('([^']+)'/g)].map((match) => match[1]);

assert.strictEqual(manifest.manifest_version, 3, 'Chrome source stays MV3');
assert.strictEqual(manifest.version, '0.9.51', 'Chrome source stays upstream 0.9.51');
assert.ok(manifest.background.service_worker, 'Chrome still needs service_worker');
assert.ok(!manifest.background.scripts, 'Chrome source must not ship Firefox background.scripts');
assert.ok(imported.includes('src/shared/gecko-runtime.js'), 'background should load gecko runtime first');
assert.strictEqual(imported[0], 'src/shared/gecko-runtime.js');
imported.forEach((file) => {
  assert.ok(fs.existsSync(file), `background helper missing: ${file}`);
});

assert.match(
  backgroundSource,
  /typeof importScripts !== 'function'/,
  'Firefox background pages have no importScripts'
);
assert.match(
  backgroundSource,
  /triggerShowSearchForTab\(tab, 'action'\)/,
  'Gecko toolbar clicks should open the command bar'
);
assert.match(
  backgroundSource,
  /function canAttemptOverlayOnTab\(/,
  'Firefox onCommand tabs without url must still attempt overlay inject'
);
assert.match(
  backgroundSource,
  /GECKO_HOTKEY_DUP_GUARD_MS/,
  'Firefox must debounce command + page-hotkey double fires'
);
assert.match(
  backgroundSource,
  /src\/shared\/gecko-runtime\.js[\s\S]*src\/content\/shortcut-key-observer\.js/,
  'Existing tabs must receive gecko-runtime before the page observer'
);
assert.match(
  backgroundSource,
  /function ensureGeckoCommandShortcuts\(/,
  'Firefox temporary add-ons often have empty commands; bind Alt+K/Q on boot'
);
assert.match(
  backgroundSource,
  /function prepareGeckoPageHotkeys\(/,
  'Already-open https tabs need hotkey-listener after about:debugging load'
);
assert.match(
  backgroundSource,
  /triggerTabSwitcherFromGeckoHotkey/,
  'Firefox page listener should open tab switcher without using Alt+Tab'
);
assert.match(
  backgroundSource,
  /function tryOpenOverlayViaContentScript\(/,
  'Firefox should open the command bar through the page content script first'
);
assert.match(
  backgroundSource,
  /ensureOpen: openOptions\.ensureOpen === true \|\| isGeckoRuntime\(\)/,
  'Firefox command bar must open rather than toggle-close'
);

const contentScripts = manifest.content_scripts || [];
const hasGeckoInObserver = contentScripts.some((entry) =>
  Array.isArray(entry.js) &&
  entry.js.includes('src/shared/gecko-runtime.js') &&
  entry.js.includes('src/content/shortcut-key-observer.js')
);
const hasGeckoInHotkey = contentScripts.some((entry) =>
  Array.isArray(entry.js) &&
  entry.js.includes('src/shared/gecko-runtime.js') &&
  entry.js.includes('src/content/hotkey-listener.js')
);
assert.ok(hasGeckoInObserver, 'shortcut observer content script must include gecko-runtime.js');
assert.ok(hasGeckoInHotkey, 'hotkey listener content script must include gecko-runtime.js');
const hasOverlayBridge = contentScripts.some((entry) =>
  Array.isArray(entry.js) && entry.js.includes('src/overlay/gecko-overlay-bridge.js')
);
assert.ok(hasOverlayBridge, 'source content scripts should include the gecko overlay bridge');
assert.ok(
  contentScripts.every((entry) => !Array.isArray(entry.js) || !entry.js.includes('src/overlay/search-panel.js')),
  'Chrome source must not preload the 1.3MB overlay on every page'
);

console.log('firefox manifest ok');
