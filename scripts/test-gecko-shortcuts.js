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
assert.ok(
  Array.isArray(gecko.OVERLAY_CONTENT_SCRIPT_FILES),
  'Gecko overlay content-script file list should be exported'
);
assert.ok(
  gecko.OVERLAY_CONTENT_SCRIPT_FILES.includes('src/overlay/search-panel.js'),
  'Firefox overlay content scripts must include the command bar'
);
assert.ok(
  gecko.OVERLAY_CONTENT_SCRIPT_FILES.includes('src/overlay/tab-switcher.js'),
  'Firefox overlay content scripts must include the tab switcher'
);
assert.ok(
  gecko.OVERLAY_CONTENT_SCRIPT_FILES.includes('src/overlay/gecko-overlay-bridge.js'),
  'Firefox overlay content scripts must include the gecko overlay bridge'
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
  /function requestGeckoHostPermission\(/,
  'Firefox must request host access on a user gesture'
);
assert.match(
  backgroundSource,
  /function maybeOpenGeckoHostAccessOnStartup\(/,
  'Firefox must open the host-access page when a temporary add-on loads without site access'
);
assert.match(
  backgroundSource,
  /if \(isGeckoRuntime\(\)\) \{\s*maybeOpenGeckoHostAccessOnStartup\(\);/,
  'Gecko install/reload must prompt for host access instead of waiting for a dead shortcut'
);
assert.match(
  backgroundSource,
  /function injectGeckoSurfaceIntoOpenTabs\(/,
  'After host access is granted, overlay scripts must be injected into already-open tabs'
);
assert.match(
  backgroundSource,
  /if \(isGeckoRuntime\(\)\) \{\s*maybeOpenGeckoHostAccessOnStartup\(\);/,
  'Gecko install/reload must prompt for host access instead of waiting for a dead shortcut'
);
assert.match(
  fs.readFileSync('src/onboarding/gecko-host-access.js', 'utf8'),
  /geckoHostPermissionGranted/,
  'Host-access page must tell the background to inject overlay scripts after grant'
);
assert.match(
  backgroundSource,
  /geckoHostPermissionGranted/,
  'The host-access page must tell the background to inject overlay scripts'
);
assert.match(
  backgroundSource,
  /handleGeckoInjectFailure\(errorMessage, hostTab/,
  'Tab Switcher inject failures must also request host access instead of going silent'
);
assert.match(
  backgroundSource,
  /geckoUnknownUrl \? false : !canOpenOverlayOnUrl\(activeUrl\)/,
  'Firefox commands often omit tab.url; empty url must not be treated as a restricted page'
);
assert.match(
  backgroundSource,
  /if \(tab && typeof tab.id === 'number'\) \{\s*runForTab\(tab\);/,
  'Firefox must inject from onCommand immediately so activeTab user gesture is not lost'
);
assert.ok(
  fs.existsSync('src/onboarding/gecko-host-access.html'),
  'Host-access page must exist so temporary add-ons can grant <all_urls>'
);
assert.match(
  backgroundSource,
  /browser\.search\.search/,
  'Firefox search fallback should use browser.search.search'
);

assert.match(
  backgroundSource,
  /function getRuntimeInjectableFiles\(files\)/,
  'Gecko inject path must strip development-only files'
);
assert.match(
  backgroundSource,
  /function executeScriptsOnTab\(/,
  'Gecko should inject overlay/switcher scripts without missing files'
);
assert.match(
  backgroundSource,
  /gecko-skip-newtab-fallback/,
  'Failed command-bar/tab-switcher injects must not open the Lumno homepage on Firefox'
);
assert.match(
  backgroundSource,
  /GECKO_HOTKEY_DUP_GUARD_MS/,
  'Firefox must debounce chrome.commands and page-hotkey double fires'
);
assert.doesNotMatch(
  backgroundSource,
  /GECKO_SCRIPT_INJECT_BATCH_SIZE = 1/,
  'Do not inject overlay files one-by-one with a 1.5s timeout; that aborted the 1.3MB inject and silenced shortcuts'
);
assert.doesNotMatch(
  backgroundSource,
  /GECKO_CHROME_API_TIMEOUT_MS/,
  'Do not wrap every Gecko chrome API in a 1.5s timeout; executeScript of the overlay exceeds that'
);
assert.match(
  backgroundSource,
  /function detectGeckoRuntimeInline\(/,
  'Gecko detection must not depend only on gecko-shortcuts.js loading'
);
assert.match(
  backgroundSource,
  /function hydrateCommandTab\(/,
  'Firefox commands.onCommand tabs often omit url and must be hydrated'
);
assert.match(
  backgroundSource,
  /function invokeChromeCallback\(/,
  'Gecko chrome.* APIs must settle both callback and promise with a timeout'
);
assert.match(
  backgroundSource,
  /function tryOpenOverlayViaContentScript\(/,
  'Firefox must open the command bar through the in-page content script before executeScript'
);
assert.match(
  backgroundSource,
  /openSearchOverlayFromBackground/,
  'Background must sendMessage to the gecko overlay bridge'
);
assert.doesNotMatch(
  backgroundSource,
  /function runAfterGeckoCommandChance/,
  'Page hotkeys must not wait for chrome.commands; that path hung and swallowed Alt+K/Alt+Q'
);
assert.doesNotMatch(
  backgroundSource,
  /function hydrateCommandTab\(tab, callback\)[\s\S]{0,900}?chrome\.tabs\.get\(/,
  'hydrateCommandTab must not block on tabs.get which Firefox may never callback'
);
assert.match(
  backgroundSource,
  /ensureOpen: openOptions\.ensureOpen === true \|\| isGeckoRuntime\(\)/,
  'Firefox command bar must open rather than toggle-close on a duplicate hotkey'
);
assert.match(
  backgroundSource,
  /if \(!hostTab && !isGeckoRuntime\(\)\)/,
  'Firefox must not jump to the Lumno newtab page to host Tab Switcher'
);
assert.match(
  backgroundSource,
  /function invokeScriptingExecuteScript\(/,
  'executeScript must settle both callback and promise so Firefox event pages do not hang'
);
assert.match(
  backgroundSource,
  /executeScriptsOnTab\(hostTab\.id,\s*\[[\s\S]*'src\/react\/overlay-islands\.js'[\s\S]*'src\/overlay\/tab-switcher\.js'/,
  'Tab switcher inject must go through the Gecko file filter'
);
assert.doesNotMatch(
  backgroundSource,
  /executeScriptsOnTab\(hostTab\.id,\s*\[\s*'src\/shared\/icon-font-preload\.js',\s*'src\/shared\/codex-debug-surface\.js'/,
  'Tab switcher must not executeScript a missing debug file'
);
assert.doesNotMatch(
  backgroundSource,
  /chrome\.scripting\.executeScript\(\{\s*target:\s*\{\s*tabId:\s*hostTab\.id\s*\},\s*files:\s*\[[^\]]*codex-debug-surface/,
  'Tab switcher must not executeScript a missing debug file directly'
);

const observerSource = fs.readFileSync('src/content/shortcut-key-observer.js', 'utf8');
assert.match(observerSource, /applyGeckoPageShortcutDefaults/, 'Page observer should seed Gecko defaults immediately');
assert.match(
  observerSource,
  /tryOpenCommandBarLocally/,
  'Gecko page hotkeys must open the in-page command bar without waiting for the event page'
);

const hotkeySource = fs.readFileSync('src/content/hotkey-listener.js', 'utf8');
assert.match(hotkeySource, /applyGeckoHotkeyDefaults/, 'Hotkey listener should seed Gecko defaults immediately');
assert.match(
  hotkeySource,
  /sendRuntimeMessageWithRetry/,
  'Page hotkeys must retry when the Firefox event page is still waking'
);
assert.match(
  hotkeySource,
  /tryOpenCommandBarLocally/,
  'Hotkey listener must open the in-page command bar on Gecko'
);

const geckoSource = fs.readFileSync('src/shared/gecko-shortcuts.js', 'utf8');
assert.match(geckoSource, /function sendRuntimeMessageWithRetry/, 'Gecko helpers should retry disconnected runtime messages');
assert.match(geckoSource, /function isMissingHostPermissionError/, 'Gecko helpers should detect Missing host permission for the tab');
assert.match(observerSource, /sendBackgroundHotkey/, 'Shortcut observer should retry background hotkey messages');

const bridgeSource = fs.readFileSync('src/overlay/gecko-overlay-bridge.js', 'utf8');
assert.match(bridgeSource, /openSearchOverlayFromBackground/, 'Bridge must accept background overlay messages');
assert.match(bridgeSource, /lumno-gecko-keepalive/, 'Bridge must keep the Firefox event page awake');
assert.match(
  bridgeSource,
  /_x_extension_toggleSearchOverlay_2026_unique_/,
  'Bridge must call the in-page command bar toggle'
);
assert.match(
  bridgeSource,
  /_x_extension_toggleTabSwitcher_2026_unique_/,
  'Bridge must be able to open the in-page tab switcher'
);

console.log('gecko shortcuts ok');
