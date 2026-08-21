const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { OVERLAY_CONTENT_SCRIPT_FILES } = require('../src/shared/gecko-shortcuts.js');

const repoRoot = process.cwd();
const sourceManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
const firefoxManifest = JSON.parse(JSON.stringify(sourceManifest));

delete firefoxManifest.key;
delete firefoxManifest.externally_connectable;

const developmentOnlyFiles = new Set([
  'src/background/codex-debug-bridge.js',
  'src/shared/codex-debug-surface.js'
]);

firefoxManifest.background = {
  scripts: (Array.isArray(sourceManifest.background && sourceManifest.background.scripts)
    ? sourceManifest.background.scripts
    : ['src/background/background.js']).filter((file) => !developmentOnlyFiles.has(file))
};

firefoxManifest.browser_specific_settings = {
  gecko: {
    id: 'lumno@0-v-linuxdo.github.io',
    strict_min_version: '121.0',
    data_collection_permissions: {
      required: ['none']
    }
  }
};

firefoxManifest.commands = firefoxManifest.commands || {};
const geckoShortcuts = {
  'show-search-prefill': { default: 'Alt+L', mac: 'Alt+L' },
  'show-search-prefill-v': { default: 'Alt+Shift+C', mac: 'Alt+Shift+C' },
  'show-tab-switcher': { default: 'Alt+Q', mac: 'Alt+Q' }
};
Object.keys(geckoShortcuts).forEach((name) => {
  if (!firefoxManifest.commands[name]) {
    return;
  }
  firefoxManifest.commands[name].suggested_key = geckoShortcuts[name];
});
if (firefoxManifest.commands['show-search']) {
  delete firefoxManifest.commands['show-search'].suggested_key;
}
firefoxManifest.commands._execute_action = {
  suggested_key: { default: 'Alt+K', mac: 'Alt+K' },
  description: (firefoxManifest.commands['show-search'] &&
    firefoxManifest.commands['show-search'].description) ||
    'Open command bar'
};

const chromeOnlyPermissions = new Set(['favicon']);
firefoxManifest.permissions = (firefoxManifest.permissions || []).filter((item) => !chromeOnlyPermissions.has(item));
if (!firefoxManifest.permissions.includes('activeTab')) {
  firefoxManifest.permissions.unshift('activeTab');
}
firefoxManifest.optional_host_permissions = ['<all_urls>'];

if (Array.isArray(firefoxManifest.web_accessible_resources)) {
  firefoxManifest.web_accessible_resources = firefoxManifest.web_accessible_resources.map((entry) => {
    if (!entry || !Array.isArray(entry.resources)) {
      return entry;
    }
    return {
      ...entry,
      resources: entry.resources.filter((resource) => resource !== '_favicon/*')
    };
  });
}

const overlayFiles = Array.isArray(OVERLAY_CONTENT_SCRIPT_FILES)
  ? OVERLAY_CONTENT_SCRIPT_FILES.slice()
  : [];
firefoxManifest.content_scripts = Array.isArray(firefoxManifest.content_scripts)
  ? firefoxManifest.content_scripts.slice()
  : [];

const hasOverlayContentScript = firefoxManifest.content_scripts.some((entry) =>
  entry && Array.isArray(entry.js) && entry.js.includes('src/overlay/search-panel.js')
);
if (!hasOverlayContentScript && overlayFiles.length) {
  firefoxManifest.content_scripts.push({
    matches: ['http://*/*', 'https://*/*'],
    js: overlayFiles,
    run_at: 'document_idle'
  });
}

const version = firefoxManifest.version;
const distDir = path.join(repoRoot, 'dist');
const zipPath = path.join(distDir, `lumno-firefox-v${version}.zip`);
const packageRoots = ['src', '_locales', 'assets'];

fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath);
}

const packageStageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumno-firefox-package-'));

function cleanup() {
  fs.rmSync(packageStageDir, { recursive: true, force: true });
}
process.on('exit', cleanup);

function normalizePackagePath(value) {
  return String(value || '').split(path.sep).join('/');
}

function stagedPath(value) {
  return path.join(packageStageDir, value);
}

function shouldCopyPackagePath(sourcePath) {
  const packagePath = normalizePackagePath(path.relative(repoRoot, sourcePath));
  if (developmentOnlyFiles.has(packagePath) || path.basename(sourcePath) === '.DS_Store') {
    return false;
  }
  return packagePath !== 'assets/images/readme' && !packagePath.startsWith('assets/images/readme/');
}

packageRoots.forEach((packageRoot) => {
  fs.cpSync(path.join(repoRoot, packageRoot), stagedPath(packageRoot), {
    recursive: true,
    filter: shouldCopyPackagePath
  });
});
fs.writeFileSync(stagedPath('manifest.json'), `${JSON.stringify(firefoxManifest, null, 2)}\n`);

const pythonZip = [
  'import os, sys, zipfile',
  'root, out = sys.argv[1], sys.argv[2]',
  'with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:',
  '    for dirpath, dirnames, filenames in os.walk(root):',
  '        for name in filenames:',
  '            full = os.path.join(dirpath, name)',
  '            rel = os.path.relpath(full, root).replace(os.sep, "/")',
  '            archive.write(full, rel)'
].join('\n');
const zipResult = spawnSync('python3', ['-c', pythonZip, packageStageDir, zipPath], {
  stdio: 'inherit'
});
if (zipResult.status !== 0) {
  process.exit(zipResult.status || 1);
}

console.log(`Firefox package written: ${zipPath}`);
