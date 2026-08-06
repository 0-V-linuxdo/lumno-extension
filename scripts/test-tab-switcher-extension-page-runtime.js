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
let latestViewOptions = null;
const runtimeMessages = [];

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
    sendMessage(message, callback) {
      runtimeMessages.push(message);
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
    latestViewOptions = options;
    const panel = window.document.createElement('div');
    panel.id = options.panelId;
    const button = window.document.createElement('button');
    button.className = 'x-tab-switcher-card';
    button.addEventListener('click', (event) => {
      options.onActivate(0, event);
    });
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
const switcherHost = window.document.getElementById(
  '_x_extension_tab_switcher_host_2026_unique_'
);
assert.ok(
  switcherHost,
  'the extension page should mount the switcher after React becomes ready'
);
assert.strictEqual(
  switcherHost.shadowRoot,
  null,
  'the page must not be able to traverse the tab switcher Shadow DOM'
);

const switcherCard = latestViewOptions.root.querySelector('.x-tab-switcher-card');
switcherCard.dispatchEvent(new window.MouseEvent('pointerdown', {
  bubbles: true,
  composed: true
}));
assert.ok(
  switcherHost.isConnected,
  'pointerdown inside the closed tab switcher must not be treated as an outside click'
);

switcherCard.click();
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));
window.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'Alt' }));
assert.deepStrictEqual(
  runtimeMessages,
  [],
  'synthetic clicks and global keyboard events must not request a privileged tab switch'
);
assert.ok(
  switcherHost.isConnected,
  'rejected synthetic events must leave the switcher available for real input'
);

latestViewOptions.onActivate(0, {
  isTrusted: true,
  preventDefault() {},
  stopImmediatePropagation() {},
  stopPropagation() {}
});
assert.deepStrictEqual(
  runtimeMessages.map((message) => ({ ...message })),
  [{ action: 'switchToTab', tabId: 1, windowId: null }],
  'a trusted activation must preserve the normal privileged switch path'
);

dom.window.close();
console.log('tab switcher extension-page runtime tests passed');
