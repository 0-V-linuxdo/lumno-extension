const assert = require('assert');
const fs = require('fs');

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const newtabSource = read('src/newtab/newtab.js');
const newtabHtml = read('src/newtab/newtab.html');
const onboardingHtml = read('src/onboarding/onboarding.html');
const overlaySource = read('src/overlay/search-panel.js');
const overlayCss = read('src/overlay/suggestions-view.css');
const suggestionsSource = read('react-src/newtab/suggestions.tsx');
const suggestionNavigation = require('../src/shared/suggestion-navigation.js');

function createKeyEvent(overrides) {
  return {
    key: '',
    code: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    ...(overrides || {})
  };
}

const activatedIndexes = [];
const shortcutItems = Array.from({ length: 3 }, (_, index) => ({
  click() {
    activatedIndexes.push(index);
  }
}));

const shortcutContainer = {
  attributes: new Map(),
  setAttribute(name, value) {
    this.attributes.set(name, value);
  },
  removeAttribute(name) {
    this.attributes.delete(name);
  },
  getAttribute(name) {
    return this.attributes.get(name) || null;
  }
};

const commandModeEvent = createKeyEvent({
  key: ' ',
  code: 'Space',
  metaKey: true,
  shiftKey: true
});
assert.strictEqual(
  suggestionNavigation.handleNumberShortcutKeydown(
    commandModeEvent,
    shortcutItems,
    shortcutContainer,
    { timeoutMs: 100 }
  ),
  true,
  'Command-Shift-Space should enter number jump mode'
);
assert.strictEqual(commandModeEvent.defaultPrevented, true);
assert.strictEqual(commandModeEvent.propagationStopped, true);
assert.strictEqual(
  shortcutContainer.getAttribute('data-number-shortcuts-active'),
  'true'
);
assert.deepStrictEqual(activatedIndexes, []);

const numberEvent = createKeyEvent({ key: '2', code: 'Digit2' });
assert.strictEqual(
  suggestionNavigation.handleNumberShortcutKeydown(
    numberEvent,
    shortcutItems,
    shortcutContainer
  ),
  true,
  'a plain number should activate its result after jump mode is entered'
);
assert.strictEqual(numberEvent.defaultPrevented, true);
assert.strictEqual(numberEvent.propagationStopped, true);
assert.deepStrictEqual(activatedIndexes, [2]);
assert.strictEqual(
  shortcutContainer.getAttribute('data-number-shortcuts-active'),
  null,
  'number jump mode should close after a selection'
);

const oldCommandNumberEvent = createKeyEvent({ key: '1', metaKey: true });
assert.strictEqual(
  suggestionNavigation.handleNumberShortcutKeydown(
    oldCommandNumberEvent,
    shortcutItems,
    shortcutContainer
  ),
  false,
  'Command-number should remain available to Chrome outside jump mode'
);
assert.strictEqual(oldCommandNumberEvent.defaultPrevented, false);
assert.deepStrictEqual(activatedIndexes, [2]);

const controlModeEvent = createKeyEvent({
  key: ' ',
  code: 'Space',
  ctrlKey: true,
  shiftKey: true
});
assert.strictEqual(
  suggestionNavigation.handleNumberShortcutKeydown(
    controlModeEvent,
    shortcutItems,
    shortcutContainer,
    { timeoutMs: 100 }
  ),
  true,
  'Control-Shift-Space should enter number jump mode'
);
const escapeEvent = createKeyEvent({ key: 'Escape', code: 'Escape' });
assert.strictEqual(
  suggestionNavigation.handleNumberShortcutKeydown(
    escapeEvent,
    shortcutItems,
    shortcutContainer
  ),
  true,
  'Escape should cancel number jump mode'
);
assert.strictEqual(escapeEvent.defaultPrevented, true);
assert.strictEqual(
  shortcutContainer.getAttribute('data-number-shortcuts-active'),
  null
);

suggestionNavigation.handleNumberShortcutKeydown(
  commandModeEvent,
  shortcutItems,
  shortcutContainer,
  { timeoutMs: 100 }
);
const ordinaryKeyEvent = createKeyEvent({ key: 'x', code: 'KeyX' });
assert.strictEqual(
  suggestionNavigation.handleNumberShortcutKeydown(
    ordinaryKeyEvent,
    shortcutItems,
    shortcutContainer
  ),
  false,
  'ordinary input should cancel jump mode and continue normally'
);
assert.strictEqual(ordinaryKeyEvent.defaultPrevented, false);
assert.strictEqual(
  shortcutContainer.getAttribute('data-number-shortcuts-active'),
  null
);

suggestionNavigation.handleNumberShortcutKeydown(
  commandModeEvent,
  shortcutItems,
  shortcutContainer,
  { timeoutMs: 100 }
);
const wheelEvent = createKeyEvent();
assert.strictEqual(
  suggestionNavigation.preventNumberShortcutWheel(wheelEvent, shortcutContainer),
  true,
  'wheel scrolling should be blocked while number shortcuts are visible'
);
assert.strictEqual(wheelEvent.defaultPrevented, true);
suggestionNavigation.cancelNumberShortcuts(shortcutContainer);
assert.strictEqual(
  suggestionNavigation.preventNumberShortcutWheel(createKeyEvent(), shortcutContainer),
  false,
  'wheel scrolling should resume after number jump mode closes'
);

assert.match(
  suggestionsSource,
  /x-nt-suggestion-number-shortcut[\s\S]*?\{index\}/,
  'the shared result view should render each visible result number beside its icon'
);

assert.match(
  newtabSource,
  /document\.addEventListener\('keydown',[\s\S]*?SUGGESTION_NAVIGATION\.handleNumberShortcutKeydown\(\s*event,\s*suggestionItems,\s*suggestionsContainer\s*\)[\s\S]*?return;/,
  'New Tab should consume number jump mode keys before ordinary input handling'
);

assert.match(
  overlaySource,
  /overlayKeyCaptureHandler = function\(e\)[\s\S]*?SUGGESTION_NAVIGATION\.handleNumberShortcutKeydown\(\s*e,\s*suggestionItems,\s*suggestionsContainer\s*\)[\s\S]*?stopImmediatePropagation\(\)[\s\S]*?return;/,
  'Overlay should capture number jump mode keys before the host page handles them'
);

const newtabModifierSource = newtabSource.slice(
  newtabSource.indexOf('function setSuggestionActionModifiersActive'),
  newtabSource.indexOf('function syncSuggestionActionModifiersFromEvent')
);
assert.ok(
  !newtabModifierSource.includes('setNumberShortcutsActive'),
  'New Tab should not reveal number badges for the background-open modifier alone'
);
const overlayModifierSource = overlaySource.slice(
  overlaySource.indexOf('function setSuggestionActionModifiersActive'),
  overlaySource.indexOf('function syncSuggestionActionModifiersFromEvent')
);
assert.ok(
  !overlayModifierSource.includes('setNumberShortcutsActive'),
  'Overlay should not reveal number badges for the background-open modifier alone'
);

assert.match(
  newtabSource,
  /document\.addEventListener\('pointerdown',[\s\S]*?cancelNumberShortcuts\(suggestionsContainer\)/,
  'New Tab should close number jump mode on pointer interaction'
);
assert.match(
  overlaySource,
  /overlay\.addEventListener\('pointerdown',[\s\S]*?cancelNumberShortcuts\(suggestionsContainer\)/,
  'Overlay should close number jump mode on pointer interaction'
);

assert.match(
  newtabHtml,
  /data-number-shortcuts-active="true"[\s\S]*?\.x-nt-suggestion-number-shortcut[\s\S]*?display:\s*inline-flex/,
  'New Tab should reveal number badges only while number jump mode is active'
);

assert.match(
  overlayCss,
  /data-number-shortcuts-active="true"[\s\S]*?\.x-ov-suggestion-number-shortcut[\s\S]*?display:\s*inline-flex/,
  'Overlay should reveal number badges only while number jump mode is active'
);

assert.match(
  onboardingHtml,
  /x-nt-suggestion-number-shortcut/,
  'the New Tab onboarding mirror should include the shared number badge style'
);

assert.match(
  onboardingHtml,
  /href="\.\.\/overlay\/suggestions-view\.css"/,
  'the Overlay onboarding mirror should keep consuming the shared Overlay result styles'
);

suggestionNavigation.handleNumberShortcutKeydown(
  commandModeEvent,
  shortcutItems,
  shortcutContainer,
  { timeoutMs: 5 }
);
setTimeout(() => {
  assert.strictEqual(
    shortcutContainer.getAttribute('data-number-shortcuts-active'),
    null,
    'number jump mode should expire after its timeout'
  );
  console.log('search result number shortcut tests passed');
}, 15);
