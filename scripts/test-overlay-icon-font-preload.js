const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const preloadPath = path.join(repoRoot, 'src/shared/icon-font-preload.js');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
const backgroundSource = fs.readFileSync(path.join(repoRoot, 'src/background/background.js'), 'utf8');
const remixCss = fs.readFileSync(
  path.join(repoRoot, 'assets/remixicon/fonts/remixicon.css'),
  'utf8'
);
const optionsHtml = fs.readFileSync(path.join(repoRoot, 'src/options/options.html'), 'utf8');

assert(
  fs.existsSync(preloadPath),
  'shared icon font preloader should exist'
);

const appended = [];
const elements = new Map();
const documentObject = {
  head: {
    appendChild(node) {
      appended.push(node);
      if (node.id) {
        elements.set(node.id, node);
      }
    }
  },
  documentElement: {},
  createElement(tagName) {
    return {
      as: '',
      crossOrigin: '',
      fetchPriority: '',
      href: '',
      id: '',
      rel: '',
      tagName: String(tagName).toUpperCase(),
      type: ''
    };
  },
  getElementById(id) {
    return elements.get(id) || null;
  }
};
const sandbox = {
  chrome: {
    runtime: {
      getURL(relativePath) {
        return `chrome-extension://lumno/${relativePath}`;
      }
    }
  },
  document: documentObject
};
sandbox.globalThis = sandbox;

const preloadSource = fs.readFileSync(preloadPath, 'utf8');
vm.runInNewContext(preloadSource, sandbox, { filename: 'icon-font-preload.js' });
vm.runInNewContext(preloadSource, sandbox, { filename: 'icon-font-preload.js' });

assert.strictEqual(appended.length, 1, 'icon font preload should be idempotent');
assert.strictEqual(appended[0].rel, 'preload');
assert.strictEqual(appended[0].as, 'font');
assert.strictEqual(appended[0].type, 'font/woff2');
assert.strictEqual(appended[0].crossOrigin, 'anonymous');
assert.strictEqual(appended[0].fetchPriority, 'high');
assert.strictEqual(
  appended[0].href,
  'chrome-extension://lumno/assets/remixicon/fonts/remixicon.woff2'
);
assert(
  remixCss.includes('src: url("remixicon.woff2") format("woff2");'),
  'the Remix stylesheet should request the exact URL that was preloaded'
);

const startupScripts = manifest.content_scripts[0].js;
assert.strictEqual(
  startupScripts[0],
  'src/shared/icon-font-preload.js',
  'new ordinary pages should warm the icon font at document_start'
);
assert(
  startupScripts.indexOf('src/shared/icon-font-preload.js') <
    startupScripts.indexOf('src/content/hotkey-listener.js')
);

const overlayInjectionStart = backgroundSource.indexOf('const overlayInjectionFiles = [');
const overlayInjectionEnd = backgroundSource.indexOf('];', overlayInjectionStart);
const overlayInjectionBlock = backgroundSource.slice(overlayInjectionStart, overlayInjectionEnd);
assert(
  overlayInjectionBlock.indexOf("'src/shared/icon-font-preload.js'") >= 0 &&
    overlayInjectionBlock.indexOf("'src/shared/icon-font-preload.js'") <
      overlayInjectionBlock.indexOf("'src/react/overlay-islands.js'"),
  'existing tabs should start warming the icon font before Overlay React/runtime injection'
);

const switcherInjectionStart = backgroundSource.indexOf('const runDynamicSwitcherScript = (switcherContext) => {');
const switcherInjectionEnd = backgroundSource.indexOf('runDynamicSwitcherScript(switcherContext);', switcherInjectionStart);
const switcherInjectionBlock = backgroundSource.slice(switcherInjectionStart, switcherInjectionEnd);
assert(
  switcherInjectionBlock.indexOf("'src/shared/icon-font-preload.js'") >= 0 &&
    switcherInjectionBlock.indexOf("'src/shared/icon-font-preload.js'") <
      switcherInjectionBlock.indexOf("'src/react/overlay-islands.js'"),
  'the standalone tab switcher should also warm the icon font before rendering'
);
assert(
  optionsHtml.indexOf('<script src="../shared/icon-font-preload.js"></script>') >= 0 &&
    optionsHtml.indexOf('<script src="../shared/icon-font-preload.js"></script>') <
      optionsHtml.indexOf('<link rel="stylesheet"'),
  'Options should warm the icon font before its stylesheets'
);

console.log('Overlay icon font preload tests passed');
