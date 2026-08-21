const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const imported = [...backgroundSource.matchAll(/lumnoImportScript\('([^']+)'/g)].map((match) => match[1]);
const scripts = manifest.background && Array.isArray(manifest.background.scripts)
  ? manifest.background.scripts
  : [];

assert.ok(manifest.browser_specific_settings && manifest.browser_specific_settings.gecko, 'gecko id is required');
assert.strictEqual(manifest.browser_specific_settings.gecko.id, 'lumno@0-v-linuxdo.github.io');
assert.ok(manifest.background.service_worker, 'Chrome still needs service_worker');
assert.ok(scripts.length > 2, 'Firefox event page must load helper scripts, not just background.js');
assert.strictEqual(scripts[scripts.length - 1], 'src/background/background.js');
assert.deepStrictEqual(
  scripts.slice(0, -1),
  imported,
  'manifest.background.scripts must match lumnoImportScript order so Firefox window pages boot'
);

const reserved = /^(Ctrl|Control|Command|Cmd|MacCtrl)\+Shift\+[KCIJ]$/i;
Object.keys(manifest.commands || {}).forEach((name) => {
  const suggested = manifest.commands[name] && manifest.commands[name].suggested_key;
  if (!suggested) {
    return;
  }
  Object.keys(suggested).forEach((platform) => {
    assert.ok(
      !reserved.test(String(suggested[platform] || '')),
      `${name} ${platform} shortcut ${suggested[platform]} collides with Firefox DevTools`
    );
  });
});

assert.strictEqual(manifest.commands['show-search'].suggested_key.default, 'Alt+K');
assert.strictEqual(manifest.commands['show-tab-switcher'].suggested_key.default, 'Alt+Q');

const contentScripts = manifest.content_scripts || [];
const hasGeckoInObserver = contentScripts.some((entry) =>
  Array.isArray(entry.js) &&
  entry.js.includes('src/shared/gecko-shortcuts.js') &&
  entry.js.includes('src/content/shortcut-key-observer.js')
);
const hasGeckoInHotkey = contentScripts.some((entry) =>
  Array.isArray(entry.js) &&
  entry.js.includes('src/shared/gecko-shortcuts.js') &&
  entry.js.includes('src/content/hotkey-listener.js')
);
const hasGeckoOverlayBridge = contentScripts.some((entry) =>
  Array.isArray(entry.js) &&
  entry.js.includes('src/overlay/gecko-overlay-bridge.js')
);
assert.ok(hasGeckoInObserver, 'shortcut observer content script must include gecko-shortcuts.js');
assert.ok(hasGeckoInHotkey, 'hotkey listener content script must include gecko-shortcuts.js');
assert.ok(hasGeckoOverlayBridge, 'document_start content scripts must include gecko-overlay-bridge.js');
assert.ok(
  !contentScripts.some((entry) => Array.isArray(entry.js) && entry.js.includes('src/overlay/search-panel.js')),
  'Chrome source manifest must not register the overlay as a content script'
);

imported.forEach((file) => {
  assert.ok(fs.existsSync(file), `background helper missing: ${file}`);
});

console.log('firefox manifest ok');
