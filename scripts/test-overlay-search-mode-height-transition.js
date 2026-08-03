const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');

assert.match(
  overlaySource,
  /function beginSearchModeResultTransition\(rawQuery\)[\s\S]*?beginSuggestionsHeightInputSession\(query\)[\s\S]*?const preserveResults = beginSearchModeResultTransition\(rawQuery\)/,
  'scope selection should lock the rendered result height before changing modes'
);
assert.match(
  overlaySource,
  /activateOpenTabsSearchMode\(\{[\s\S]*?deferResults: true,[\s\S]*?preserveResults[\s\S]*?activateLocalSearchScope\([\s\S]*?\{ preserveResults \}[\s\S]*?activateSiteSearch\(item\.provider, \{ preserveResults \}\)/,
  'all overlay scope-menu modes should preserve old results until the restored query renders'
);
assert.match(
  overlaySource,
  /function activateLocalSearchScope\(scope, activationOptions\)[\s\S]*?if \(options\.preserveResults !== true\) \{\s*clearSearchSuggestions\(\);[\s\S]*?function activateSiteSearch\(provider, activationOptions\)[\s\S]*?if \(options\.preserveResults !== true\) \{\s*clearSearchSuggestions\(\);/,
  'local and provider scope activation should not collapse preserved results to zero'
);
assert.match(
  overlaySource,
  /function reconcileSuggestionsHeightAfterRender\(previousState, query, options\)[\s\S]*?holdSuggestionsHeightForRemoteMix\([\s\S]*?animateSuggestionsHeight\(suggestionsContainer, previousState\)/,
  'result renderers should use one shared measured-height reconciliation path'
);
assert.match(
  overlaySource,
  /function renderTabSuggestions\(tabList\)[\s\S]*?captureSuggestionsHeightState\(suggestionsContainer\)[\s\S]*?reconcileSuggestionsHeightAfterRender\([\s\S]*?function getOverlaySearchModeKey\(\)/,
  'open-tab results should participate in the same height transition as other result types'
);
assert.match(
  overlaySource,
  /const requestModeKey = getOverlaySearchModeKey\(\);[\s\S]*?requestQuery !== latestOverlayQuery \|\|[\s\S]*?requestModeKey !== getOverlaySearchModeKey\(\)/,
  'late open-tab responses should not replace results after the user changes scope'
);
assert.match(
  overlaySource,
  /function scheduleSearchPanelsLayoutTransition\([\s\S]*?beginModeMenuResultTransition\(\{ fromOffset: fromHeight \}\)[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?setProperty\('height', `\$\{toHeight\}px`[\s\S]*?targetModeMenuResultTransition\(\{[\s\S]*?toOffset: toHeight/,
  'the result surface and visible-or-opening scope panel should use one shared transaction'
);
assert.match(
  overlaySource,
  /function getSearchPanelsLayoutTransitionMenu\(\)[\s\S]*?isModeMenuVisible\(\)[\s\S]*?const modeMenu = getSearchPanelsLayoutTransitionMenu\(\);[\s\S]*?if \(modeMenu\) \{[\s\S]*?scheduleSearchPanelsLayoutTransition\([\s\S]*?scheduleStandaloneSuggestionsHeightTransition\(/,
  'the controller visibility state should include the menu opening frame without including closed panels'
);

const clipStart = overlaySource.indexOf(
  'function clipSuggestionsToHeight(container, height, options) {'
);
const clipEnd = overlaySource.indexOf(
  'function cancelSuggestionsHeightAnimation(container)',
  clipStart
);
const clipSource = overlaySource.slice(clipStart, clipEnd);
const clipStyles = new Map();
const clipAttributes = new Map();
const clipContainer = {
  setAttribute(name, value) {
    clipAttributes.set(name, value);
  },
  style: {
    setProperty(name, value, priority) {
      clipStyles.set(name, { value, priority });
    }
  }
};
const clipRuntimeContext = vm.createContext({ Math, Number });
vm.runInContext(
  `${clipSource}\nthis.clipSuggestionsToHeightForTest = clipSuggestionsToHeight;`,
  clipRuntimeContext,
  { filename: 'overlay-suggestions-height-clip.js' }
);
clipRuntimeContext.clipSuggestionsToHeightForTest(clipContainer, 0, {
  collapsePadding: true
});
assert.strictEqual(clipAttributes.get('data-height-clipped'), 'true');
assert.deepStrictEqual(
  clipStyles.get('flex'),
  { value: '0 0 auto', priority: 'important' },
  'the clipped result surface must not flex-grow beyond its animated height'
);
assert.deepStrictEqual(
  clipStyles.get('height'),
  { value: '0px', priority: 'important' }
);
assert.deepStrictEqual(
  clipStyles.get('padding-top'),
  { value: '0px', priority: 'important' },
  'zero-height clipping must remove the physical top-padding floor'
);
assert.deepStrictEqual(
  clipStyles.get('padding-bottom'),
  { value: '0px', priority: 'important' },
  'zero-height clipping must remove the physical bottom-padding floor'
);
assert.deepStrictEqual(
  clipStyles.get('overflow-y'),
  { value: 'hidden', priority: 'important' },
  'new result rows should stay clipped until the height transition completes'
);
assert.match(
  overlaySource,
  /function cancelSuggestionsHeightAnimation\(container\)[\s\S]*?removeAttribute\('data-height-clipped'\)[\s\S]*?removeProperty\('flex'\)[\s\S]*?removeProperty\('overflow-y'\)/,
  'animation cleanup should restore flexible scrolling only after the active transition finishes'
);

const captureStart = overlaySource.indexOf(
  'function captureSuggestionsHeightState(container) {'
);
const captureEnd = overlaySource.indexOf(
  'function holdSuggestionsHeightForRemoteMix',
  captureStart
);
const captureSource = overlaySource.slice(captureStart, captureEnd);
let captureCancelCount = 0;
const captureRuntimeContext = vm.createContext({
  Boolean,
  suggestionsHeightAnimationTarget: 480,
  suggestionsHeightAnimationTargetIsCapped: true,
  readSuggestionsHeightMetrics: () => ({
    atMaxHeight: false,
    height: 184,
    maxHeight: 580
  }),
  readSuggestionsVerticalPadding: () => ({ top: 6, bottom: 10 }),
  cancelSuggestionsHeightAnimation: () => {
    captureCancelCount += 1;
  }
});
vm.runInContext(
  `${captureSource}\nthis.captureSuggestionsHeightStateForTest = captureSuggestionsHeightState;`,
  captureRuntimeContext,
  { filename: 'overlay-suggestions-height-capture.js' }
);
const interruptedState = captureRuntimeContext.captureSuggestionsHeightStateForTest({
  children: [{}, {}]
});
assert.strictEqual(
  interruptedState.heldHeight,
  184,
  'rapid overlay rerenders should hold the currently visible height instead of the stale 480px target'
);
assert.strictEqual(interruptedState.atMaxHeight, true);
assert.deepStrictEqual(
  interruptedState.padding,
  { top: 6, bottom: 10 },
  'interruption capture should preserve the current padding phase with the current height'
);
assert.strictEqual(captureCancelCount, 1);

const animateStart = overlaySource.indexOf(
  'function animateSuggestionsHeight(container, previousState) {'
);
const animateEnd = overlaySource.indexOf(
  'function closeOverlayAfterCommand()',
  animateStart
);
const animateSource = overlaySource.slice(animateStart, animateEnd);
const coordinatedCalls = [];
let offsetSyncCount = 0;
const modeMenu = { id: 'open-scope-menu' };
const runtimeContext = vm.createContext({
  Boolean,
  Math,
  getSearchPanelsLayoutTransitionMenu: () => modeMenu,
  readSuggestionsHeightMetrics: () => ({
    height: 312,
    maxHeight: 580,
    atMaxHeight: false
  }),
  scheduleSearchPanelsLayoutTransition: (...args) => {
    coordinatedCalls.push(args);
  },
  scheduleStandaloneSuggestionsHeightTransition: () => {
    throw new Error('an open scope menu must use the coordinated scheduler');
  },
  syncSearchModeMenuResultOffset: () => {
    offsetSyncCount += 1;
  },
  window: {
    matchMedia: () => ({ matches: false })
  }
});
vm.runInContext(
  `${animateSource}\nthis.animateSuggestionsHeightForTest = animateSuggestionsHeight;`,
  runtimeContext,
  { filename: 'overlay-suggestions-height-animation.js' }
);
const newlyRenderedContainer = {
  children: [{}, {}, {}],
  getAttribute(name) {
    if (name === 'data-collapsed') {
      return 'false';
    }
    return null;
  }
};
runtimeContext.animateSuggestionsHeightForTest(newlyRenderedContainer, {
  height: 0,
  padding: { top: 0, bottom: 0 }
});
assert.strictEqual(
  coordinatedCalls.length,
  1,
  'new local-scope content should enter the coordinated scheduler even when the old result height was zero'
);
assert.strictEqual(
  coordinatedCalls[0][1].height,
  0,
  'the scheduler should clip newly rendered content at zero before growing its container'
);
assert.strictEqual(
  coordinatedCalls[0].length,
  3,
  'menu transform ownership should stay inside the shared controller instead of leaking a menu node into the scheduler'
);
assert.strictEqual(offsetSyncCount, 0);

const standaloneCalls = [];
const standaloneRuntimeContext = vm.createContext({
  Boolean,
  Math,
  getSearchPanelsLayoutTransitionMenu: () => null,
  readSuggestionsHeightMetrics: () => ({
    height: 156,
    maxHeight: 580,
    atMaxHeight: false
  }),
  scheduleSearchPanelsLayoutTransition: () => {
    throw new Error('a closed scope menu must not use the coordinated scheduler');
  },
  scheduleStandaloneSuggestionsHeightTransition: (...args) => {
    standaloneCalls.push(args);
  },
  syncSearchModeMenuResultOffset: () => {},
  window: {
    matchMedia: () => ({ matches: false })
  }
});
vm.runInContext(
  `${animateSource}\nthis.animateSuggestionsHeightForTest = animateSuggestionsHeight;`,
  standaloneRuntimeContext,
  { filename: 'overlay-suggestions-height-standalone-animation.js' }
);
standaloneRuntimeContext.animateSuggestionsHeightForTest(
  {
    children: [{}],
    getAttribute(name) {
      return name === 'data-collapsed' ? 'false' : null;
    }
  },
  {
    height: 0,
    padding: { top: 0, bottom: 0 }
  }
);
assert.strictEqual(
  standaloneCalls.length,
  1,
  'the first ordinary overlay result should animate from a collapsed surface'
);
assert.strictEqual(
  standaloneCalls[0][1].height,
  0,
  'ordinary results should start their height transition at zero'
);

console.log('overlay search mode height transition tests passed');
