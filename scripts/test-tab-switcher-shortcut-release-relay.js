const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const repoRoot = path.join(__dirname, '..');
const source = fs.readFileSync(
  path.join(repoRoot, 'src', 'content', 'tab-switcher-shortcut-release.js'),
  'utf8'
);
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  runScripts: 'outside-only',
  url: 'https://editor.example.test/frame'
});
const { window } = dom;
const runtimeMessages = [];
let keyupHandler = null;
let runtimeMessageListener = null;
const keyupHandlers = new Set();
const runtimeMessageListeners = new Set();
const nativeAddEventListener = window.addEventListener.bind(window);
const nativeRemoveEventListener = window.removeEventListener.bind(window);

window.addEventListener = (type, listener, options) => {
  if (type === 'keyup') {
    keyupHandler = listener;
    keyupHandlers.add(listener);
  }
  return nativeAddEventListener(type, listener, options);
};
window.removeEventListener = (type, listener, options) => {
  if (type === 'keyup') {
    keyupHandlers.delete(listener);
  }
  return nativeRemoveEventListener(type, listener, options);
};
window.chrome = {
  runtime: {
    lastError: null,
    onMessage: {
      addListener(listener) {
        runtimeMessageListener = listener;
        runtimeMessageListeners.add(listener);
      },
      removeListener(listener) {
        runtimeMessageListeners.delete(listener);
      }
    },
    sendMessage(message, callback) {
      runtimeMessages.push(message);
      callback?.();
    }
  }
};

window.eval(source);
assert.strictEqual(typeof keyupHandler, 'function', 'the frame should observe configured shortcut-key releases');
assert.strictEqual(typeof runtimeMessageListener, 'function', 'the frame should wait for the switcher command to arm it');
window.eval(source);
assert.strictEqual(
  keyupHandlers.size,
  1,
  'reinjection after an extension reload should replace the stale keyup listener'
);
assert.strictEqual(
  runtimeMessageListeners.size,
  1,
  'reinjection after an extension reload should replace the stale runtime listener'
);

keyupHandler({ isTrusted: false, key: 'Meta', code: 'MetaLeft' });
keyupHandler({ isTrusted: true, key: '1', code: 'Digit1' });
assert.deepStrictEqual(
  runtimeMessages,
  [],
  'synthetic and unarmed releases must not cross the privileged runtime boundary'
);

let armResponse = null;
runtimeMessageListener({ action: 'armTabSwitcherShortcutRelease', keys: ['Meta'] }, {}, (response) => {
  armResponse = response;
});
assert.deepStrictEqual({ ...armResponse }, { ok: true });
keyupHandler({ isTrusted: true, key: '1', code: 'Digit1' });
assert.deepStrictEqual(
  runtimeMessages,
  [],
  'releasing the trigger key must neither commit nor disarm a held Command shortcut'
);
keyupHandler({ isTrusted: true, key: 'Meta', code: 'MetaLeft' });
assert.deepStrictEqual(
  runtimeMessages.map((message) => ({ ...message })),
  [{ action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Meta' }],
  'releasing Command should relay exactly one commit request'
);
keyupHandler({ isTrusted: true, key: 'Meta', code: 'MetaLeft' });
assert.strictEqual(
  runtimeMessages.length,
  1,
  'the observer should disarm after the configured modifier is released'
);

runtimeMessageListener({ action: 'armTabSwitcherShortcutRelease', keys: ['Control'] }, {}, () => {});
keyupHandler({ isTrusted: true, key: '?', code: 'Slash' });
assert.strictEqual(runtimeMessages.length, 1, 'releasing Slash must not commit while Control remains held');
keyupHandler({ isTrusted: true, key: 'Control', code: 'ControlLeft' });
assert.deepStrictEqual(
  runtimeMessages.map((message) => ({ ...message })),
  [
    { action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Meta' },
    { action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Control' }
  ],
  'Ctrl+Shift+/ should commit only when its primary Control modifier is released'
);

const quickReleaseCommandStartedAt = Date.now() - 10;
keyupHandler({ isTrusted: true, key: 'Meta', code: 'MetaRight' });
runtimeMessageListener({
  action: 'armTabSwitcherShortcutRelease',
  keys: ['Meta'],
  commandStartedAt: quickReleaseCommandStartedAt
}, {}, () => {});
assert.deepStrictEqual(
  runtimeMessages.map((message) => ({ ...message })),
  [
    { action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Meta' },
    { action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Control' },
    { action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Meta' }
  ],
  'a trusted shortcut release that beats the async arm message should be replayed for the same command'
);

keyupHandler({ isTrusted: true, key: 'Control', code: 'ControlRight' });
runtimeMessageListener({
  action: 'armTabSwitcherShortcutRelease',
  keys: ['Control'],
  commandStartedAt: Date.now() + 1000
}, {}, () => {});
assert.strictEqual(
  runtimeMessages.length,
  3,
  'a release observed before the current command started must not be replayed'
);
keyupHandler({ isTrusted: true, key: 'Control', code: 'ControlLeft' });
assert.deepStrictEqual(
  runtimeMessages.map((message) => ({ ...message })).at(-1),
  { action: 'notifyTabSwitcherShortcutModifierReleased', key: 'Control' },
  'an armed observer should still relay the next live release after rejecting a stale buffered release'
);

dom.window.close();
console.log('tab switcher shortcut release relay tests passed');
