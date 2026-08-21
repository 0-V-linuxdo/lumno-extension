const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const geckoRuntime = require('../src/shared/gecko-runtime.js');

const repoRoot = process.cwd();
const pack = spawnSync(process.execPath, ['scripts/package-firefox.js'], {
  cwd: repoRoot,
  encoding: 'utf8'
});
assert.strictEqual(pack.status, 0, pack.stderr || pack.stdout || 'package:firefox failed');

const zipName = `lumno-${geckoRuntime.PRODUCT_TAG}.zip`;
const zipPath = path.join(repoRoot, 'dist', zipName);
assert.ok(fs.existsSync(zipPath), `Firefox zip missing: ${zipPath}`);

const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumno-firefox-zip-'));
const unzip = spawnSync('python3', ['-c', [
  'import sys, zipfile',
  'zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])'
].join('\n'), zipPath, extractDir], { encoding: 'utf8' });
assert.strictEqual(unzip.status, 0, unzip.stderr || 'failed to unzip firefox package');

const packagedManifest = JSON.parse(fs.readFileSync(path.join(extractDir, 'manifest.json'), 'utf8'));
assert.strictEqual(packagedManifest.manifest_version, 2, 'Firefox package must be Manifest V2');
assert.strictEqual(packagedManifest.version, geckoRuntime.FIREFOX_MANIFEST_VERSION || '1.7.0');
assert.ok(!packagedManifest.key, 'Firefox package must not include the Chrome public key');
assert.ok(!packagedManifest.externally_connectable, 'Firefox package must not include Chrome-only externally_connectable');
assert.ok(!packagedManifest.host_permissions, 'MV2 host access belongs in permissions');
assert.ok(!packagedManifest.service_worker && !packagedManifest.background.service_worker,
  'Firefox MV2 package must not declare service_worker');
assert.strictEqual(packagedManifest.background.persistent, true);
assert.ok(Array.isArray(packagedManifest.background.scripts));
assert.ok(packagedManifest.background.scripts.includes('src/background/gecko-mv2-polyfill.js'));
assert.ok(packagedManifest.background.scripts.includes('src/shared/gecko-runtime.js'));
assert.ok(packagedManifest.background.scripts.includes('src/background/background.js'));
assert.strictEqual(
  packagedManifest.background.scripts[packagedManifest.background.scripts.length - 1],
  'src/background/background.js'
);
assert.ok(packagedManifest.browser_action, 'Firefox MV2 uses browser_action');
assert.ok(!(packagedManifest.permissions || []).includes('favicon'));
assert.ok(!(packagedManifest.permissions || []).includes('scripting'));
assert.ok(!(packagedManifest.permissions || []).includes('tabGroups'));
assert.ok((packagedManifest.permissions || []).includes('<all_urls>'),
  'MV2 must grant host access on install so content scripts inject');
assert.ok((packagedManifest.permissions || []).includes('activeTab'));
assert.strictEqual(packagedManifest.commands['show-search'].suggested_key.default, 'Alt+K');
assert.strictEqual(packagedManifest.commands['show-tab-switcher'].suggested_key.default, 'Alt+Q');
assert.ok(Array.isArray(packagedManifest.web_accessible_resources));
assert.ok(!packagedManifest.web_accessible_resources.includes('_favicon/*'));
assert.ok(
  fs.existsSync(path.join(extractDir, 'src/background/gecko-mv2-polyfill.js')),
  'Firefox zip must contain the MV2 scripting polyfill'
);
assert.ok(
  packagedManifest.content_scripts.every((entry) => !entry.match_origin_as_fallback),
  'Firefox must not keep Chrome-only match_origin_as_fallback'
);
assert.ok(!fs.existsSync(path.join(extractDir, 'src/onboarding/gecko-host-access.html')));
assert.ok(fs.existsSync(path.join(extractDir, 'src/overlay/gecko-overlay-bridge.js')));
assert.ok(fs.existsSync(path.join(extractDir, 'src/shared/gecko-runtime.js')));
const overlayEntry = (packagedManifest.content_scripts || []).find((entry) =>
  Array.isArray(entry.js) && entry.js.includes('src/overlay/search-panel.js')
);
assert.ok(overlayEntry, 'Firefox package must preload the command bar as a content script');
assert.deepStrictEqual(overlayEntry.matches, ['http://*/*', 'https://*/*']);
assert.ok(overlayEntry.js.includes('src/overlay/tab-switcher.js'));
assert.ok(overlayEntry.js.includes('src/shared/gecko-content-globals.js'));
assert.ok(
  overlayEntry.js.indexOf('src/react/overlay-islands.js') <
    overlayEntry.js.indexOf('src/shared/gecko-content-globals.js'),
  'Gecko global mirror must run after overlay-islands'
);
assert.ok(fs.existsSync(path.join(extractDir, 'src/shared/gecko-content-globals.js')));
assert.ok(overlayEntry.js.includes('src/overlay/gecko-overlay-bridge.js'));
const firstScripts = packagedManifest.content_scripts[0] && packagedManifest.content_scripts[0].js;
assert.ok(Array.isArray(firstScripts) && firstScripts.includes('src/overlay/gecko-overlay-bridge.js'));
const packagedPolyfill = fs.readFileSync(
  path.join(extractDir, 'src/background/gecko-mv2-polyfill.js'),
  'utf8'
);
assert.match(packagedPolyfill, /function toExtensionFilePath\(/);
assert.match(packagedPolyfill, /'\/' \+ path/);

fs.rmSync(extractDir, { recursive: true, force: true });
console.log('package firefox ok');
