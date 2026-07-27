const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const repoRoot = path.join(__dirname, '..');
const source = fs.readFileSync(
  path.join(repoRoot, 'src', 'overlay', 'tab-switcher.js'),
  'utf8'
);
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  runScripts: 'outside-only',
  url: 'chrome-extension://lumno/src/options/options.html'
});
const { window } = dom;
let createViewCalls = 0;

window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {}
});
window.requestAnimationFrame = (callback) => {
  callback(0);
  return 1;
};
window.cancelAnimationFrame = () => {};
window.chrome = {
  i18n: {
    getMessage() {
      return '';
    }
  },
  runtime: {
    sendMessage(_message, callback) {
      callback?.();
    }
  },
  storage: {
    onChanged: {
      addListener() {},
      removeListener() {}
    },
    sync: {
      get(_keys, callback) {
        callback({});
      }
    }
  }
};

window.eval(source);

const unavailableResult =
  window._x_extension_toggleTabSwitcher_2026_unique_({
    tabs: [{ id: 1, title: 'Before React' }]
  });
assert.deepStrictEqual(
  { ...unavailableResult },
  { ok: false, reason: 'react-view-unavailable' },
  'the classic runtime should fail cleanly while the page React API is unavailable'
);
assert.strictEqual(
  window.document.getElementById('_x_extension_tab_switcher_host_2026_unique_'),
  null,
  'a missing React API should not leave a partial switcher host behind'
);

window.LumnoOverlayTabSwitcherView = {
  createTabSwitcherView(options) {
    createViewCalls += 1;
    const panel = window.document.createElement('div');
    panel.id = options.panelId;
    const button = window.document.createElement('button');
    button.className = 'x-tab-switcher-card';
    panel.appendChild(button);
    options.root.appendChild(panel);
    return {
      panel,
      buttons: [button],
      destroy() {},
      updateSelection() {},
      updateThumbnail() {
        return { ok: true };
      }
    };
  }
};

const readyResult =
  window._x_extension_toggleTabSwitcher_2026_unique_({
    tabs: [{ id: 1, title: 'After React' }]
  });
assert.deepStrictEqual(
  { ...readyResult },
  { ok: true },
  'the runtime should resolve a React API installed after the classic script loaded'
);
assert.strictEqual(createViewCalls, 1);
assert.ok(
  window.document.getElementById('_x_extension_tab_switcher_host_2026_unique_'),
  'the extension page should mount the switcher after React becomes ready'
);

dom.window.close();
console.log('tab switcher extension-page runtime tests passed');
