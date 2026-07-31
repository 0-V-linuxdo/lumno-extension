const assert = require('assert');
const path = require('path');

const timers = new Map();
let nextTimerId = 1;
const animationFrames = new Map();
let nextAnimationFrameId = 1;
const windowObj = {
  cancelAnimationFrame(frameId) {
    animationFrames.delete(frameId);
  },
  clearTimeout(timerId) {
    timers.delete(timerId);
  },
  requestAnimationFrame(callback) {
    const frameId = nextAnimationFrameId++;
    animationFrames.set(frameId, callback);
    return frameId;
  },
  setTimeout(callback, duration) {
    const timerId = nextTimerId++;
    timers.set(timerId, { callback, duration });
    return timerId;
  }
};
function flushAnimationFrame() {
  const entries = Array.from(animationFrames.entries());
  animationFrames.clear();
  entries.forEach(([, callback]) => callback());
}
const styleValues = new Map();
const toastElement = {
  attributes: new Map(),
  style: {
    removeProperty(property) {
      styleValues.delete(property);
    },
    setProperty(property, value) {
      styleValues.set(property, value);
    }
  },
  textContent: '',
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
};

delete global.LumnoToast;
require(path.resolve(__dirname, '../src/shared/toast.js'));

assert.strictEqual(global.LumnoToast.implementation, 'dom');
assert.strictEqual(typeof global.LumnoToast.createToastStyleGate, 'function');

const stylesheetListeners = new Map();
const stylesheetElement = {
  sheet: null,
  addEventListener(type, listener) {
    stylesheetListeners.set(type, listener);
  },
  removeEventListener(type, listener) {
    if (stylesheetListeners.get(type) === listener) {
      stylesheetListeners.delete(type);
    }
  }
};
const styleGate = global.LumnoToast.createToastStyleGate(toastElement, {
  stylesheetElement,
  windowObj
});
assert.strictEqual(styleValues.get('opacity'), '0');
assert.strictEqual(styleValues.get('pointer-events'), 'none');
assert.strictEqual(
  styleValues.get('transform'),
  'translateX(-50%) translateY(-10px)'
);
assert.strictEqual(styleValues.get('transition'), 'none');
assert.strictEqual(styleGate.isReady(), false);
assert.strictEqual(typeof stylesheetListeners.get('load'), 'function');

stylesheetElement.sheet = {};
stylesheetListeners.get('load')();
assert.strictEqual(styleGate.isReady(), true);
assert.strictEqual(styleValues.get('opacity'), '0');
flushAnimationFrame();
assert.strictEqual(styleValues.get('opacity'), '0');
flushAnimationFrame();
assert.strictEqual(styleValues.has('opacity'), false);
assert.strictEqual(styleValues.has('pointer-events'), false);
assert.strictEqual(styleValues.has('transform'), false);
assert.strictEqual(styleValues.has('transition'), false);
assert.strictEqual(stylesheetListeners.has('load'), false);

const controller = global.LumnoToast.createToastController(toastElement, {
  windowObj
});

controller.show('Press Backspace again');
assert.strictEqual(toastElement.textContent, 'Press Backspace again');
assert.strictEqual(toastElement.attributes.get('data-show'), 'true');
assert.strictEqual(timers.size, 1);
assert.strictEqual(Array.from(timers.values())[0].duration, 2200);

controller.hide();
assert.strictEqual(toastElement.attributes.get('data-show'), 'false');
assert.strictEqual(timers.size, 0);

controller.show('Failed', { error: true, duration: 0 });
assert.strictEqual(styleValues.get('background'), 'rgba(153, 27, 27, 0.92)');
assert.strictEqual(timers.size, 0);

controller.destroy();
styleGate.destroy();
controller.show('Ignored');
assert.strictEqual(toastElement.textContent, 'Failed');

console.log('shared Toast tests passed');
