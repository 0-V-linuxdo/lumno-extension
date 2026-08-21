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
  /function prepareGeckoOverlaySurface\(/,
  'Already-open https tabs need the overlay files after about:debugging load'
);
assert.match(
  backgroundSource,
  /function notifyGeckoHotkeyFailure\(/,
  'Firefox inject failures must not stay silent'
);
assert.match(
  backgroundSource,
  /commands\.getAll/,
  'Firefox should only bind empty command shortcuts so user remaps survive'
);
assert.match(
  backgroundSource,
  /function getTabSwitcherInjectionFiles\(/,
  'Firefox tab switcher inject must not depend on the debug surface'
);
assert.match(
  backgroundSource,
  /shouldInjectOverlayCodexDebugSurface = !isGeckoRuntime\(\)/,
  'Firefox overlay inject must never include the debug surface'
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
assert.match(
  backgroundSource,
  /function isOwnExtensionPageUrl\(url\)[\s\S]*isBrowserExtensionProtocol\(protocol\)[\s\S]*runtime\.getURL/,
  'Firefox moz-extension pages must count as own extension pages via runtime.getURL root'
);
assert.match(
  backgroundSource,
  /function openNewtabFallback\(options\)[\s\S]*openNewtabFallbackUnwrapped\(options\)/,
  'Firefox restricted pages must open the Lumno newtab fallback, not a Gecko no-op'
);
assert.match(
  backgroundSource,
  /function openBrowserNewtabFallback\(options\)[\s\S]*openBrowserNewtabFallbackUnwrapped\(options\)/,
  'Firefox must be able to open the browser default new tab as a restricted-page fallback'
);
assert.doesNotMatch(
  backgroundSource,
  /function openNewtabFallback\(options\)[\s\S]{0,80}if \(isGeckoRuntime\(\)\) \{\s*return;/,
  'Firefox must not no-op openNewtabFallback'
);
assert.doesNotMatch(
  backgroundSource,
  /tab-switcher-gecko-no-host-hop/,
  'Firefox Alt+Q on restricted pages should hop or open a new tab like Chrome'
);
assert.match(
  backgroundSource,
  /tab-switcher-host-hop[\s\S]*focusWindowAndActivateTab\(hostTab.id, hostTab.windowId/,
  'Firefox Alt+Q should activate a hostable tab when the current page cannot host the switcher'
);
assert.match(
  backgroundSource,
  /tab-switcher-fallback-newtab[\s\S]*openNewtabFallbackForUrl\(activeUrl, \{ sourceTab: activeTab \}\)/,
  'Firefox Alt+Q should open Lumno newtab when no hostable tab exists'
);
assert.match(
  backgroundSource,
  /runSwitcherToggle/,
  'Firefox tab switcher should toggle an existing helper before re-injecting files'
);
assert.match(
  backgroundSource,
  /function geckoHotkeyFailureMessage\(/,
  'Firefox hotkey failures must use a reason-specific toast'
);
assert.match(
  backgroundSource,
  /notifyGeckoHotkeyFailure\(activeTab, 'command-bar', 'restricted-page'\)/,
  'Firefox command bar must toast on restricted pages instead of failing silently'
);
assert.match(
  backgroundSource,
  /src\/shared\/gecko-content-globals\.js/,
  'Firefox tab switcher inject must include the Gecko globalThis-to-window mirror'
);
assert.match(
  fs.readFileSync('src/overlay/gecko-overlay-bridge.js', 'utf8'),
  /search_panel_failed/,
  'Firefox command bar bridge must not report success when the overlay did not open'
);
assert.match(
  fs.readFileSync('src/react/overlay-islands.js', 'utf8'),
  /new Proxy\(globalThis/,
  'Firefox overlay islands must dual-write APIs onto window'
);
assert.match(
  fs.readFileSync('src/shared/gecko-content-globals.js', 'utf8'),
  /mirrorGeckoContentGlobals/,
  'Firefox must ship a content-script globalThis-to-window mirror'
);

const polyfillSource = fs.readFileSync('src/background/gecko-mv2-polyfill.js', 'utf8');
assert.match(
  polyfillSource,
  /function toExtensionFilePath\(/,
  'Firefox tabs.executeScript relative files resolve against the page URL'
);
assert.match(
  polyfillSource,
  /'\/' \+ path/,
  'Firefox inject files must be extension-root paths starting with /'
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
