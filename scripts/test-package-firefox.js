const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { OVERLAY_CONTENT_SCRIPT_FILES } = require('../src/shared/gecko-shortcuts.js');

const repoRoot = process.cwd();
const pack = spawnSync(process.execPath, ['scripts/package-firefox.js'], {
  cwd: repoRoot,
  encoding: 'utf8'
});
assert.strictEqual(pack.status, 0, pack.stderr || pack.stdout || 'package:firefox failed');

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
const zipPath = path.join(repoRoot, 'dist', `lumno-firefox-v${manifest.version}.zip`);
assert.ok(fs.existsSync(zipPath), `Firefox zip missing: ${zipPath}`);

const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumno-firefox-zip-'));
const unzip = spawnSync('python3', ['-c', [
  'import sys, zipfile',
  'zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])'
].join('\n'), zipPath, extractDir], { encoding: 'utf8' });
assert.strictEqual(unzip.status, 0, unzip.stderr || 'failed to unzip firefox package');

const packagedManifest = JSON.parse(fs.readFileSync(path.join(extractDir, 'manifest.json'), 'utf8'));
assert.ok(!packagedManifest.key, 'Firefox package must not include the Chrome public key');
assert.ok(!packagedManifest.externally_connectable, 'Firefox package must not include Chrome-only externally_connectable');
assert.ok(!(packagedManifest.permissions || []).includes('favicon'), 'Firefox package must drop chrome favicon permission');
assert.ok(Array.isArray(packagedManifest.background.scripts), 'Firefox package must declare background.scripts');
assert.ok(
  !packagedManifest.background.service_worker,
  'Firefox package must not declare service_worker or some builds load only background.js'
);
assert.ok(
  packagedManifest.background.scripts.length > 2,
  'Firefox package must ship helper scripts on the event page'
);
assert.ok(
  !packagedManifest.background.scripts.includes('src/background/codex-debug-bridge.js'),
  'Firefox package should omit development-only background files'
);
assert.ok(
  packagedManifest.background.scripts.includes('src/shared/gecko-shortcuts.js'),
  'Firefox package must load gecko shortcut helpers before background.js'
);
assert.strictEqual(
  packagedManifest.background.scripts[packagedManifest.background.scripts.length - 1],
  'src/background/background.js'
);
assert.strictEqual(packagedManifest.commands['show-search'].suggested_key.default, 'Alt+K');
assert.strictEqual(packagedManifest.commands['show-tab-switcher'].suggested_key.default, 'Alt+Q');
assert.ok(
  fs.existsSync(path.join(extractDir, 'src/shared/gecko-shortcuts.js')),
  'Firefox zip must contain gecko-shortcuts.js'
);
assert.ok(
  fs.existsSync(path.join(extractDir, 'src/background/background.js')),
  'Firefox zip must contain background.js'
);
assert.ok(
  fs.existsSync(path.join(extractDir, 'src/overlay/gecko-overlay-bridge.js')),
  'Firefox zip must contain the gecko overlay bridge'
);

const overlayEntry = (packagedManifest.content_scripts || []).find((entry) =>
  entry && Array.isArray(entry.js) && entry.js.includes('src/overlay/search-panel.js')
);
assert.ok(overlayEntry, 'Firefox package must declare command-bar overlay content_scripts');
assert.deepStrictEqual(
  overlayEntry.matches,
  ['http://*/*', 'https://*/*'],
  'Overlay content scripts should only run on http(s) pages'
);
assert.strictEqual(overlayEntry.run_at, 'document_idle');
OVERLAY_CONTENT_SCRIPT_FILES.forEach((file) => {
  assert.ok(
    overlayEntry.js.includes(file),
    `Firefox overlay content_scripts must include ${file}`
  );
  assert.ok(
    fs.existsSync(path.join(extractDir, file)),
    `Firefox zip must contain overlay file ${file}`
  );
});
assert.ok(
  overlayEntry.js.includes('src/overlay/tab-switcher.js'),
  'Firefox overlay content_scripts must include tab-switcher.js'
);
assert.ok(
  overlayEntry.js.includes('src/overlay/gecko-overlay-bridge.js'),
  'Firefox overlay content_scripts must include gecko-overlay-bridge.js'
);

const sourceHasOverlayContentScript = (manifest.content_scripts || []).some((entry) =>
  entry && Array.isArray(entry.js) && entry.js.includes('src/overlay/search-panel.js')
);
assert.ok(
  !sourceHasOverlayContentScript,
  'Chrome source manifest must not preload the 1.3MB overlay on every page'
);

fs.rmSync(extractDir, { recursive: true, force: true });
console.log('package firefox ok');
