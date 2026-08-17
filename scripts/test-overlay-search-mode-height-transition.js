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
  /const requestModeKey = getOverlaySearchModeKey\(\);[\s\S]*?const requestSeq = overlayTabsRequestSeq;[\s\S]*?requestSeq !== overlayTabsRequestSeq[\s\S]*?requestModeKey !== getOverlaySearchModeKey\(\)/,
  'stale or late open-tab responses should not replace results after a newer request or scope change'
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

const renderTabSuggestionsStart = overlaySource.indexOf(
  'function renderTabSuggestions(tabList) {'
);
const renderTabSuggestionsEnd = overlaySource.indexOf(
  'function getOverlaySearchModeKey()',
  renderTabSuggestionsStart
);
const renderTabSuggestionsSource = overlaySource.slice(
  renderTabSuggestionsStart,
  renderTabSuggestionsEnd
);
const tabHeightCaptureIndex = renderTabSuggestionsSource.indexOf(
  'const previousHeightState = captureSuggestionsHeightState(suggestionsContainer);'
);
const emptyRenderIndex = renderTabSuggestionsSource.indexOf(
  'renderOverlayEmptyState(emptyText);'
);
const emptyRevealIndex = renderTabSuggestionsSource.indexOf(
  'setOverlayResultsCollapsed(false, { deferLayoutSync: true });'
);
const tabRenderIndex = renderTabSuggestionsSource.indexOf(
  'reactView.renderTabs(list);'
);
const tabRevealIndex = renderTabSuggestionsSource.indexOf(
  'setOverlayResultsCollapsed(false, { deferLayoutSync: true });',
  tabRenderIndex
);
assert.ok(
  tabHeightCaptureIndex >= 0 &&
    emptyRenderIndex > tabHeightCaptureIndex &&
    emptyRevealIndex > emptyRenderIndex &&
    tabRenderIndex > tabHeightCaptureIndex &&
    tabRevealIndex > tabRenderIndex,
  'open-tab results must reveal the result surface only after its target rows are rendered'
);

const updateSearchSuggestionsStart = overlaySource.indexOf(
  'function updateSearchSuggestions(suggestions, query, options) {'
);
const updateSearchSuggestionsEnd = overlaySource.indexOf(
  'function clearSearchSuggestions()',
  updateSearchSuggestionsStart
);
const updateSearchSuggestionsSource = overlaySource.slice(
  updateSearchSuggestionsStart,
  updateSearchSuggestionsEnd
);
const updateRenderIndex = updateSearchSuggestionsSource.indexOf(
  'reactView.render({'
);
const updateRevealIndex = updateSearchSuggestionsSource.indexOf(
  'setOverlayResultsCollapsed(false, {'
);
assert.ok(
  updateRenderIndex >= 0 && updateRevealIndex > updateRenderIndex,
  'ordinary results must reveal the result surface after the async target render'
);
assert.match(
  updateSearchSuggestionsSource,
  /setOverlayResultsCollapsed\(false, \{\s*deferLayoutSync: Boolean\(previousHeightState\)\s*\}\);[\s\S]*?reconcileSuggestionsHeightAfterRender\(previousHeightState, query/,
  'the first result reveal must not publish a natural-height offset before height reconciliation'
);

assert.match(
  overlaySource,
  /const waitForFirstResultMix =\s*suggestionsContainer\.getAttribute\('data-collapsed'\) === 'true';[\s\S]*?OVERLAY_FIRST_RESULT_REVEAL_DELAY_MS[\s\S]*?const remoteDelay = waitForFirstResultMix\s*\? 0[\s\S]*?if \(remoteMixState\.visualSettled\) \{\s*return;/,
  'the first local and remote result stages should produce only one visible height commit'
);
assert.match(
  overlaySource,
  /function extendSuggestionsHeightInputSessionForRemoteMix\(query\)[\s\S]*?suggestionsHeightRemoteMixSettleMs[\s\S]*?finishSuggestionsHeightInputSession\(\)/,
  'an in-flight remote mix should keep the original result height locked beyond the typing settle window'
);
assert.match(
  overlaySource,
  /const remoteMixState = \{[\s\S]*?extendSuggestionsHeightInputSessionForRemoteMix\(requestQuery\)[\s\S]*?settleHeightAfterRemoteMix: true/,
  'remote suggestion settlement should release the input-height lock only after the final rows are rendered'
);
assert.match(
  updateSearchSuggestionsSource,
  /reconcileSuggestionsHeightAfterRender\(previousHeightState, query, \{[\s\S]*?if \(settleHeightAfterRemoteMix\) \{\s*finishSuggestionsHeightInputSession\(\);\s*\}/,
  'the final remote mix should animate once from the held height to its final measured height'
);

const pendingUpdateStart = overlaySource.indexOf(
  'function updatePendingSearchSuggestions(query, options) {'
);
const pendingUpdateEnd = overlaySource.indexOf(
  'function requestOverlaySearchSuggestions(query)',
  pendingUpdateStart
);
const pendingUpdateSource = overlaySource.slice(
  pendingUpdateStart,
  pendingUpdateEnd
);
let pendingUpdateCount = 0;
const pendingUpdateContext = vm.createContext({
  lastSuggestionResponse: [],
  suggestionsContainer: {
    getAttribute(name) {
      return name === 'data-collapsed' ? 'true' : null;
    }
  },
  updateSearchSuggestions() {
    pendingUpdateCount += 1;
  }
});
vm.runInContext(
  `${pendingUpdateSource}\nthis.updatePendingSearchSuggestionsForTest = updatePendingSearchSuggestions;`,
  pendingUpdateContext,
  { filename: 'overlay-pending-suggestions-visibility.js' }
);
assert.strictEqual(
  pendingUpdateContext.updatePendingSearchSuggestionsForTest('1', {}),
  false,
  'a direct-URL preview must not expand a result surface that is still collapsed'
);
assert.strictEqual(
  pendingUpdateCount,
  0,
  'the first character must wait for a visible result commit instead of rendering an empty preview shell'
);
pendingUpdateContext.suggestionsContainer.getAttribute = () => null;
assert.strictEqual(
  pendingUpdateContext.updatePendingSearchSuggestionsForTest('12', {}),
  true,
  'direct-URL previews should still update an already-visible result surface'
);
assert.strictEqual(pendingUpdateCount, 1);

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
const collapsedState = captureRuntimeContext.captureSuggestionsHeightStateForTest({
  children: [],
  getAttribute(name) {
    return name === 'data-collapsed' ? 'true' : null;
  }
});
assert.strictEqual(collapsedState.height, 0);
assert.strictEqual(
  captureCancelCount,
  0,
  'height capture must preserve the zero-padding styles owned by a collapsed result surface'
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

const beginInputSessionStart = overlaySource.indexOf(
  'function beginSuggestionsHeightInputSession(query) {'
);
const beginInputSessionEnd = overlaySource.indexOf(
  'function getSuggestionsHeightTransitionProperties(',
  beginInputSessionStart
);
const beginInputSessionSource = overlaySource.slice(
  beginInputSessionStart,
  beginInputSessionEnd
);
let zeroHeightSettleTimerCount = 0;
let zeroHeightClipCount = 0;
const zeroHeightInputSessionContext = vm.createContext({
  Math,
  Number,
  suggestionsHeightInputLockedHeight: 0,
  suggestionsHeightInputLockedPadding: null,
  suggestionsHeightInputSettleTimer: 0,
  suggestionsHeightInputSettleMs: 280,
  deferredSuggestionsHeightQuery: '',
  suggestionsContainer: {
    style: {
      setProperty() {}
    }
  },
  overlay: {
    _lumnoSuggestionsHeightSettleTimer: 0
  },
  clearSuggestionsHeightInputSettleTimer() {},
  captureSuggestionsHeightState: () => ({
    height: 0,
    heldHeight: 0,
    padding: null
  }),
  cancelSuggestionsHeightAnimation() {},
  clipSuggestionsToHeight() {
    zeroHeightClipCount += 1;
  },
  finishSuggestionsHeightInputSession() {},
  setTimeout() {
    zeroHeightSettleTimerCount += 1;
    return 1;
  }
});
vm.runInContext(
  `${beginInputSessionSource}\nthis.beginSuggestionsHeightInputSessionForTest = beginSuggestionsHeightInputSession;`,
  zeroHeightInputSessionContext,
  { filename: 'overlay-zero-height-input-session.js' }
);
zeroHeightInputSessionContext.beginSuggestionsHeightInputSessionForTest('a');
assert.strictEqual(
  zeroHeightSettleTimerCount,
  0,
  'the first character must not arm a settle timer that restarts the initial result expansion'
);
assert.strictEqual(
  zeroHeightClipCount,
  0,
  'the collapsed result surface must remain owned by the initial expansion transition'
);

let renderedHeightSettleTimerCount = 0;
let renderedHeightClip = null;
const renderedHeightInputSessionContext = vm.createContext({
  Math,
  Number,
  suggestionsHeightInputLockedHeight: 184,
  suggestionsHeightInputLockedPadding: { top: 12, bottom: 12 },
  suggestionsHeightInputSettleTimer: 0,
  suggestionsHeightInputSettleMs: 280,
  deferredSuggestionsHeightQuery: '',
  suggestionsContainer: {
    style: {
      setProperty() {}
    }
  },
  overlay: {
    _lumnoSuggestionsHeightSettleTimer: 0
  },
  clearSuggestionsHeightInputSettleTimer() {},
  captureSuggestionsHeightState() {
    throw new Error('an existing input-session lock must be reused');
  },
  cancelSuggestionsHeightAnimation() {},
  clipSuggestionsToHeight(_container, height, options) {
    renderedHeightClip = { height, options };
  },
  finishSuggestionsHeightInputSession() {},
  setTimeout() {
    renderedHeightSettleTimerCount += 1;
    return 7;
  }
});
vm.runInContext(
  `${beginInputSessionSource}\nthis.beginSuggestionsHeightInputSessionForTest = beginSuggestionsHeightInputSession;`,
  renderedHeightInputSessionContext,
  { filename: 'overlay-rendered-height-input-session.js' }
);
renderedHeightInputSessionContext.beginSuggestionsHeightInputSessionForTest('ab');
assert.strictEqual(
  renderedHeightSettleTimerCount,
  1,
  'typing over existing results should retain the input settle session'
);
assert.strictEqual(renderedHeightClip && renderedHeightClip.height, 184);
assert.strictEqual(
  renderedHeightClip && renderedHeightClip.options.scrollable,
  true
);
assert.strictEqual(
  renderedHeightClip && renderedHeightClip.options.padding.top,
  12
);
assert.strictEqual(
  renderedHeightClip && renderedHeightClip.options.padding.bottom,
  12,
  'existing results should remain clipped at their visible height while input settles'
);

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
let standaloneOffsetSyncCount = 0;
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
  syncSearchModeMenuResultOffset: () => {
    standaloneOffsetSyncCount += 1;
  },
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
  0,
  'the first ordinary overlay result should reveal its rows and final height in one paint'
);
assert.strictEqual(
  standaloneOffsetSyncCount,
  1,
  'the atomic first reveal should publish the final result offset once'
);

console.log('overlay search mode height transition tests passed');
