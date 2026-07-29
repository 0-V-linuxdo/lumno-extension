const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
assert.ok(
  handlerSource.includes('if (isImeCompositionEvent(e))'),
  'input isolation should leave IME composition events untouched'
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

console.log('overlay input extension isolation tests passed');
