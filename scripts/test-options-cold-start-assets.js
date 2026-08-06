const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const htmlPath = path.join(repoRoot, 'src/options/options.html');
const preloadPath = path.join(repoRoot, 'src/options/theme-preload.js');
const optionsSourcePath = path.join(repoRoot, 'src/options/options.js');
const lightBackgroundPath = path.join(repoRoot, 'assets/images/settings-bg-light.webp');
const darkBackgroundPath = path.join(repoRoot, 'assets/images/settings-bg-dark.webp');

const html = fs.readFileSync(htmlPath, 'utf8');
const optionsSource = fs.readFileSync(optionsSourcePath, 'utf8');

assert(
  fs.existsSync(preloadPath),
  'Options should have an early theme and background preloader'
);

const firstStylesheetIndex = html.indexOf('<link rel="stylesheet"');
const themePreloadIndex = html.indexOf('<script src="theme-preload.js"></script>');
assert(
  themePreloadIndex >= 0 && themePreloadIndex < firstStylesheetIndex,
  'Options should run its theme preloader before render-blocking stylesheets'
);
assert(
  html.includes('settings-bg-light.webp') &&
    html.includes('settings-bg-dark.webp') &&
    !html.includes('settings-bg-light.png') &&
    !html.includes('settings-bg-dark.png'),
  'Options should render the resized WebP background assets'
);
assert(fs.existsSync(lightBackgroundPath), 'light Options WebP should exist');
assert(fs.existsSync(darkBackgroundPath), 'dark Options WebP should exist');
assert(
  fs.statSync(lightBackgroundPath).size < 1024 * 1024 &&
    fs.statSync(darkBackgroundPath).size < 1024 * 1024,
  'Options backgrounds should stay below 1 MiB each'
);

const elements = new Map();
function createElementRecord(id) {
  const attributes = new Map();
  return {
    id,
    style: {},
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

const root = createElementRecord('root');
const body = createElementRecord('body');
const panel = createElementRecord('_x_extension_settings_panel_2024_unique_');
const themeColorMeta = createElementRecord('theme-color');
elements.set(panel.id, panel);

const headChildren = [];
const documentObject = {
  body,
  documentElement: root,
  head: {
    appendChild(node) {
      headChildren.push(node);
      if (node.id) {
        elements.set(node.id, node);
      }
    }
  },
  createElement(tagName) {
    return Object.assign(createElementRecord(''), {
      tagName: String(tagName).toUpperCase(),
      as: '',
      fetchPriority: '',
      href: '',
      rel: ''
    });
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    return selector === 'meta[name="theme-color"]' ? themeColorMeta : null;
  }
};

const localStorageValues = new Map();
const sandbox = {
  chrome: {
    runtime: {
      getURL(relativePath) {
        return `chrome-extension://lumno/${relativePath}`;
      }
    },
    storage: {
      sync: {
        get(_keys, callback) {
          callback({ _x_extension_theme_mode_2024_unique_: 'dark' });
        }
      }
    }
  },
  document: documentObject,
  localStorage: {
    getItem(key) {
      return localStorageValues.get(key) || null;
    },
    setItem(key, value) {
      localStorageValues.set(key, String(value));
    }
  },
  matchMedia() {
    return { matches: false };
  },
  MutationObserver: class {
    observe() {}
    disconnect() {}
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

vm.runInNewContext(fs.readFileSync(preloadPath, 'utf8'), sandbox, {
  filename: 'theme-preload.js'
});

assert.strictEqual(root.getAttribute('data-theme-ready'), 'true');
assert.strictEqual(root.getAttribute('data-options-preload-theme'), 'dark');
assert.strictEqual(body.getAttribute('data-theme'), 'dark');
assert.strictEqual(panel.getAttribute('data-theme'), 'dark');
assert.strictEqual(themeColorMeta.getAttribute('content'), '#111111');
assert.strictEqual(
  localStorageValues.get('_x_extension_options_theme_preload_2026_unique_'),
  'dark',
  'the definitive stored preference should refresh the synchronous cache'
);
const imagePreload = headChildren.find((node) => node.id === '_x_extension_options_background_preload_2026_unique_');
assert(imagePreload, 'Options should preload its resolved background before first paint');
assert.strictEqual(imagePreload.rel, 'preload');
assert.strictEqual(imagePreload.as, 'image');
assert.strictEqual(imagePreload.fetchPriority, 'high');
assert.strictEqual(
  imagePreload.href,
  'chrome-extension://lumno/assets/images/settings-bg-dark.webp'
);
assert(
  optionsSource.includes("const OPTIONS_THEME_PRELOAD_STORAGE_KEY = '_x_extension_options_theme_preload_2026_unique_';") &&
    optionsSource.includes('cacheOptionsThemeMode(storedMode);') &&
    optionsSource.includes('cacheOptionsThemeMode(nextMode);'),
  'Options should keep the synchronous theme cache current after reads and changes'
);

console.log('Options cold-start asset tests passed');
