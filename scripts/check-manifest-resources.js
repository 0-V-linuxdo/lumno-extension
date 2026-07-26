const fs = require('fs');
const path = require('path');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const missing = [];
const injectedScriptFiles = [
  'src/background/extension-pages.js',
  'src/background/message-router.js',
  'src/background/newtab-fallback.js',
  'src/background/shortcut-rules.js',
  'src/background/pip-ownership.js',
  'src/background/pip-main-world.js',
  'src/background/recent-tab-switcher.js',
  'src/shared/extension-routes.js',
  'src/shared/navigation-disposition.js',
  'src/shared/settings.js',
  'src/shared/search-utils.js',
  'src/shared/site-search-store.js',
  'src/shared/suggestion-action-model.js',
  'src/shared/suggestion-navigation.js',
  'src/shared/ime-key-guard.js',
  'src/shared/search-input-ui.js',
  'src/react/overlay-islands.js',
  'src/shared/search-input-mode.js',
  'src/shared/search-input.css',
  'src/shared/url-guards.js',
  'src/shared/favicon-utils.js',
  'src/shared/favicon-cache.js',
  'src/shared/favicon-view-core.js',
  'src/newtab/recent-sites-view.js',
  'src/newtab/bookmarks-view.js',
  'src/newtab/suggestions-view.js',
  'src/overlay/runtime.js',
  'src/overlay/favicon-view.js',
  'src/overlay/suggestions-view.css',
  'src/overlay/shell.js',
  'src/overlay/lifecycle.js',
  'src/overlay/site-fixes.js',
  'src/overlay/page-theme.js',
  'src/overlay/search-panel.js',
  'src/overlay/tab-switcher.js',
  'src/content/document-pip-picker.js'
];

function checkPath(value) {
  if (!value || typeof value !== 'string') {
    return;
  }
  if (/^(https?:|chrome:|__MSG_)/.test(value)) {
    return;
  }
  if (value === '_favicon/*') {
    return;
  }
  if (!fs.existsSync(value)) {
    missing.push(value);
  }
}

function checkRelativeResourcePath(file, value) {
  if (!value || typeof value !== 'string') {
    return;
  }
  if (/^(https?:|data:|blob:|mailto:|tel:|chrome:|about:|#|__MSG_)/.test(value)) {
    return;
  }
  if (value.includes('${') || value.startsWith('var(')) {
    return;
  }
  const cleanValue = value.split(/[?#]/)[0];
  if (!cleanValue || cleanValue.startsWith('#')) {
    return;
  }
  const resolved = cleanValue.startsWith('/')
    ? path.normalize(cleanValue.slice(1))
    : path.normalize(path.join(path.dirname(file), cleanValue));
  if (resolved.startsWith('..') || path.isAbsolute(resolved)) {
    return;
  }
  checkPath(resolved);
}

function checkCssUrlReferences(file, source) {
  const cssUrlPattern = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)"'\s]+))\s*\)/g;
  let match = null;
  while ((match = cssUrlPattern.exec(source))) {
    checkRelativeResourcePath(file, match[1] || match[2] || match[3] || '');
  }
}

function checkConcreteExtensionPathReferences(file, source) {
  const extensionPathPattern = /(['"`])((?:assets|src|_locales|output)\/[^'"`?#)>\s]+)(?:[?#][^'"`]*)?\1/g;
  let match = null;
  while ((match = extensionPathPattern.exec(source))) {
    if (!match[2].includes('${')) {
      checkPath(match[2]);
    }
  }
}

function listJsFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
      return;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  });
  return files;
}

function listFilesWithExtension(dir, extension) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesWithExtension(fullPath, extension));
      return;
    }
    if (entry.isFile() && fullPath.endsWith(extension)) {
      files.push(fullPath);
    }
  });
  return files;
}

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listHtmlFiles(fullPath));
      return;
    }
    if (entry.isFile() && fullPath.endsWith('.html')) {
      files.push(fullPath);
    }
  });
  return files;
}

function checkRuntimeGetUrlReferences() {
  const files = listJsFiles('src');
  const staticGetUrlPattern = /chrome\.runtime\.getURL\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  files.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    checkConcreteExtensionPathReferences(file, source);
    checkCssUrlReferences(file, source);
    let match = null;
    while ((match = staticGetUrlPattern.exec(source))) {
      const value = match[2];
      if (!value || value.includes('${')) {
        continue;
      }
      checkPath(value.split(/[?#]/)[0]);
    }
  });
}

function checkHtmlReferences() {
  const files = listHtmlFiles('src');
  const referencePattern = /\b(?:src|href)=["']([^"']+)["']/g;
  files.forEach((file) => {
    const source = fs.readFileSync(file, 'utf8');
    checkCssUrlReferences(file, source);
    let match = null;
    while ((match = referencePattern.exec(source))) {
      const value = match[1];
      if (!value || /^(https?:|data:|mailto:|tel:|#|__MSG_)/.test(value)) {
        continue;
      }
      const cleanValue = value.split(/[?#]/)[0];
      const resolved = path.normalize(path.join(path.dirname(file), cleanValue));
      checkPath(resolved);
    }
  });
}

function checkCssFiles() {
  const files = [
    ...listFilesWithExtension('src', '.css'),
    ...listFilesWithExtension('assets', '.css')
  ];
  files.forEach((file) => {
    checkCssUrlReferences(file, fs.readFileSync(file, 'utf8'));
  });
}

function checkNewtabWallpaperFiles() {
  const file = 'src/newtab/wallpaper.js';
  if (!fs.existsSync(file)) {
    return;
  }
  const source = fs.readFileSync(file, 'utf8');
  const directoryMatch = source.match(/NEWTAB_WALLPAPER_EXTENSION_DIRECTORY\s*=\s*['"]([^'"]+)['"]/);
  const suffixMatch = source.match(/NEWTAB_WALLPAPER_THUMBNAIL_SUFFIX\s*=\s*['"]([^'"]+)['"]/);
  const directory = directoryMatch ? directoryMatch[1] : '';
  const thumbnailSuffix = suffixMatch ? suffixMatch[1] : '';
  if (!directory) {
    return;
  }
  const filePattern = /\bfile:\s*['"]([^'"]+\.webp)['"]/g;
  let match = null;
  while ((match = filePattern.exec(source))) {
    const wallpaperFile = match[1];
    checkPath(`${directory}/${wallpaperFile}`);
    if (thumbnailSuffix) {
      const thumbnailFile = wallpaperFile.replace(/\.[^.]+$/, thumbnailSuffix);
      checkPath(`${directory}/${thumbnailFile}`);
    }
  }
}

checkPath(manifest.background && manifest.background.service_worker);
checkPath(manifest.chrome_url_overrides && manifest.chrome_url_overrides.newtab);
checkPath(manifest.options_ui && manifest.options_ui.page);

Object.values(manifest.icons || {}).forEach(checkPath);
(manifest.content_scripts || []).forEach((script) => {
  (script.js || []).forEach(checkPath);
  (script.css || []).forEach(checkPath);
});
(manifest.web_accessible_resources || []).forEach((entry) => {
  (entry.resources || []).forEach(checkPath);
});
injectedScriptFiles.forEach(checkPath);
checkRuntimeGetUrlReferences();
checkHtmlReferences();
checkCssFiles();
checkNewtabWallpaperFiles();

if (missing.length > 0) {
  console.error('Missing manifest resources:');
  missing.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('manifest resources ok');
