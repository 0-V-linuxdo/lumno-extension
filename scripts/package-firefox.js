const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const geckoRuntime = require('../src/shared/gecko-runtime.js');

const PRODUCT_TAG = geckoRuntime.PRODUCT_TAG || '0.9.51-firefox-v1.1.0';
const FIREFOX_MANIFEST_VERSION = '1.1.0';

const repoRoot = process.cwd();
const sourceManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
const firefoxManifest = JSON.parse(JSON.stringify(sourceManifest));

delete firefoxManifest.key;
delete firefoxManifest.externally_connectable;
delete firefoxManifest.host_permissions;
delete firefoxManifest.action;

firefoxManifest.manifest_version = 2;
firefoxManifest.version = FIREFOX_MANIFEST_VERSION;

const helperScripts = [
  'src/background/gecko-mv2-polyfill.js',
  'src/shared/gecko-runtime.js'
];
const importOrder = [];
const backgroundSource = fs.readFileSync(path.join(repoRoot, 'src/background/background.js'), 'utf8');
const importMatches = [...backgroundSource.matchAll(/lumnoImportScript\('([^']+)'/g)];
importMatches.forEach((match) => {
  if (!helperScripts.includes(match[1]) && !importOrder.includes(match[1])) {
    importOrder.push(match[1]);
  }
});

firefoxManifest.background = {
  scripts: helperScripts.concat(importOrder).concat(['src/background/background.js']),
  persistent: true
};

firefoxManifest.browser_action = {
  default_title: sourceManifest.action && sourceManifest.action.default_title
    ? sourceManifest.action.default_title
    : '__MSG_ext_name__',
  default_icon: sourceManifest.icons || {
    16: 'assets/images/lumno.png',
    48: 'assets/images/lumno.png',
    128: 'assets/images/lumno.png'
  }
};

firefoxManifest.browser_specific_settings = {
  gecko: {
    id: 'lumno@0-v-linuxdo.github.io',
    strict_min_version: '109.0',
    data_collection_permissions: {
      required: ['none']
    }
  }
};

firefoxManifest.commands = firefoxManifest.commands || {};
const geckoShortcuts = geckoRuntime.COMMAND_DEFAULTS;
Object.keys(geckoShortcuts).forEach((name) => {
  if (!firefoxManifest.commands[name]) {
    return;
  }
  firefoxManifest.commands[name].suggested_key = {
    default: geckoShortcuts[name],
    mac: geckoShortcuts[name]
  };
});

const droppedPermissions = new Set(['scripting', 'favicon', 'tabGroups']);
const permissions = (sourceManifest.permissions || []).filter((item) => !droppedPermissions.has(item));
if (!permissions.includes('activeTab')) {
  permissions.push('activeTab');
}
if (!permissions.includes('<all_urls>')) {
  permissions.push('<all_urls>');
}
firefoxManifest.permissions = permissions;

if (Array.isArray(sourceManifest.web_accessible_resources)) {
  const resources = [];
  sourceManifest.web_accessible_resources.forEach((entry) => {
    const list = entry && Array.isArray(entry.resources) ? entry.resources : [];
    list.forEach((resource) => {
      if (resource && resource !== '_favicon/*' && !resources.includes(resource)) {
        resources.push(resource);
      }
    });
  });
  firefoxManifest.web_accessible_resources = resources;
}

if (Array.isArray(firefoxManifest.content_scripts)) {
  firefoxManifest.content_scripts = firefoxManifest.content_scripts.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return entry;
    }
    const next = { ...entry };
    delete next.match_origin_as_fallback;
    if (index === 0 && Array.isArray(next.js) &&
        !next.js.includes('src/overlay/gecko-overlay-bridge.js')) {
      next.js = next.js.concat(['src/overlay/gecko-overlay-bridge.js']);
    }
    return next;
  });
}

const overlayFiles = Array.isArray(geckoRuntime.OVERLAY_CONTENT_SCRIPT_FILES)
  ? geckoRuntime.OVERLAY_CONTENT_SCRIPT_FILES.slice()
  : [];
if (overlayFiles.length) {
  firefoxManifest.content_scripts = firefoxManifest.content_scripts || [];
  firefoxManifest.content_scripts.push({
    matches: ['http://*/*', 'https://*/*'],
    js: overlayFiles,
    run_at: 'document_idle'
  });
}

const distDir = path.join(repoRoot, 'dist');
const zipPath = path.join(distDir, `lumno-${PRODUCT_TAG}.zip`);
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
  if (path.basename(sourcePath) === '.DS_Store') {
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
console.log(`Product: ${PRODUCT_TAG} (manifest version ${FIREFOX_MANIFEST_VERSION}, MV2)`);
