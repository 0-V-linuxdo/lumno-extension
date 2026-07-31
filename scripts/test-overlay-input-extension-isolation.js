const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const searchPanelSource = fs.readFileSync(
  path.join(__dirname, '../src/overlay/search-panel.js'),
  'utf8'
);

const handlerStart = searchPanelSource.indexOf('overlayKeyCaptureHandler = function(e) {');
const handlerEnd = searchPanelSource.indexOf(
  "window.addEventListener('keydown', overlayKeyCaptureHandler, true);",
  handlerStart
);
assert.ok(handlerStart > 0 && handlerEnd > handlerStart, 'overlay should define an early key capture handler');

const handlerSource = searchPanelSource.slice(handlerStart, handlerEnd);
assert.match(
  handlerSource,
  /if \(isImeCompositionEvent\(e\)\) \{\s*e\.stopImmediatePropagation\(\);\s*return;\s*\}/,
  'input isolation should keep IME keys away from the host page without running Lumno key handling'
);
assert.ok(
  handlerSource.includes('if (e.metaKey || e.ctrlKey || e.altKey)'),
  'input isolation should leave browser and system modifier shortcuts untouched'
);
assert.ok(
  !handlerSource.includes('e.shiftKey'),
  'Shift-modified text should remain isolated from page and extension shortcuts'
);
assert.ok(
  handlerSource.includes("if (e.type === 'keydown')") &&
    handlerSource.includes('handleSearchInputKeydown(e);'),
  'captured keydown events should still run Lumno input behavior'
);
assert.ok(
  handlerSource.includes('e.stopImmediatePropagation();'),
  'captured text keys should not reach document-level extension shortcuts'
);
assert.match(
  searchPanelSource,
  /if \(e\.key === 'Tab'\) \{\s*handleTabKey\(e\);\s*return;\s*\}/,
  'the double-Tab scope shortcut should run inside the isolated input key handler'
);

['keydown', 'keypress', 'keyup'].forEach((eventName) => {
  assert.ok(
    searchPanelSource.includes(
      `window.addEventListener('${eventName}', overlayKeyCaptureHandler, true);`
    ),
    `overlay should isolate ${eventName} during capture`
  );
  assert.ok(
    searchPanelSource.includes(
      `window.removeEventListener('${eventName}', overlayKeyCaptureHandler, true);`
    ),
    `overlay should remove the ${eventName} isolation listener on close`
  );
});

const dom = new JSDOM('<!doctype html><div id="overlay"></div><div id="lumno-host"></div>');
const { window } = dom;
const { document } = window;
const overlay = document.getElementById('overlay');
const host = document.getElementById('lumno-host');
const shadowRoot = host.attachShadow({ mode: 'open' });
const searchInput = document.createElement('input');
shadowRoot.appendChild(searchInput);

const handledInputKeys = [];
const hostPageKeys = [];
const hostPageKeyups = [];
const createHandler = new Function(
  'overlay',
  'searchInput',
  'document',
  'isImeCompositionEvent',
  'handleSearchInputKeydown',
  'syncSuggestionActionModifiersFromEvent',
  `let overlayKeyCaptureHandler;\n${handlerSource}\nreturn overlayKeyCaptureHandler;`
);
const overlayKeyCaptureHandler = createHandler(
  overlay,
  searchInput,
  document,
  (event) => Boolean(event && event.isComposing),
  (event) => {
    handledInputKeys.push(event.key);
    if (event.key === 'Tab') {
      event.preventDefault();
    }
  },
  () => {}
);

window.addEventListener('keydown', overlayKeyCaptureHandler, true);
window.addEventListener('keyup', overlayKeyCaptureHandler, true);
document.addEventListener('keydown', (event) => {
  hostPageKeys.push({ key: event.key, targetTag: event.target.tagName });
});
document.addEventListener('keyup', (event) => {
  hostPageKeyups.push({ key: event.key, targetTag: event.target.tagName });
});
searchInput.focus();

const imeKeydown = new window.KeyboardEvent('keydown', {
  bubbles: true,
  composed: true,
  key: 'f',
  code: 'KeyF',
  isComposing: true
});
searchInput.dispatchEvent(imeKeydown);

assert.strictEqual(
  imeKeydown.defaultPrevented,
  false,
  'IME isolation should not prevent the browser from updating the composition'
);
assert.deepStrictEqual(
  handledInputKeys,
  [],
  'IME keys should not run Lumno search input shortcuts'
);
assert.deepStrictEqual(
  hostPageKeys,
  [],
  'IME keys from the Shadow DOM input should not reach host-page player shortcuts'
);

const regularKeydown = new window.KeyboardEvent('keydown', {
  bubbles: true,
  composed: true,
  key: 'x',
  code: 'KeyX'
});
searchInput.dispatchEvent(regularKeydown);

assert.deepStrictEqual(
  handledInputKeys,
  ['x'],
  'regular text keys should continue through Lumno input handling'
);
assert.deepStrictEqual(
  hostPageKeys,
  [],
  'regular text keys should remain isolated from host-page shortcuts'
);

const doubleTabEvents = [0, 1].map(() => new window.KeyboardEvent('keydown', {
  bubbles: true,
  cancelable: true,
  composed: true,
  key: 'Tab',
  code: 'Tab'
}));
doubleTabEvents.forEach((event) => {
  searchInput.dispatchEvent(event);
  searchInput.dispatchEvent(new window.KeyboardEvent('keyup', {
    bubbles: true,
    composed: true,
    key: 'Tab',
    code: 'Tab'
  }));
});

assert.deepStrictEqual(
  handledInputKeys,
  ['x', 'Tab', 'Tab'],
  'both presses of the double-Tab shortcut should stay in Lumno input handling'
);
assert.ok(
  doubleTabEvents.every((event) => event.defaultPrevented),
  'both Tab presses should keep focus inside the Lumno input'
);
assert.deepStrictEqual(
  hostPageKeys,
  [],
  'double-Tab keydown events should not reach host-page shortcuts'
);
assert.deepStrictEqual(
  hostPageKeyups,
  [],
  'double-Tab keyup events should not reach host-page shortcuts'
);

console.log('overlay input extension isolation tests passed');
