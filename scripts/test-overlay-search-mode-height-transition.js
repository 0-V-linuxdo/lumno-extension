const assert = require('assert');
const fs = require('fs');

const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');

assert.match(
  overlaySource,
  /function shouldPreserveSearchModeResults\(rawQuery\) \{\s*return Boolean\(String\(rawQuery \|\| ''\)\.trim\(\)\);\s*\}[\s\S]*?const preserveResults = shouldPreserveSearchModeResults\(rawQuery\)/,
  'scope selection should preserve rendered results without starting a height session'
);
assert.match(
  overlaySource,
  /activateOpenTabsSearchMode\(\{[\s\S]*?deferResults: true,[\s\S]*?preserveResults[\s\S]*?activateLocalSearchScope\([\s\S]*?\{ preserveResults \}[\s\S]*?activateSiteSearch\(item\.provider, \{ preserveResults \}\)/,
  'all overlay scope-menu modes should keep old rows until the replacement renders'
);
assert.match(
  overlaySource,
  /function activateLocalSearchScope\(scope, activationOptions\)[\s\S]*?if \(options\.preserveResults !== true\) \{\s*clearSearchSuggestions\(\);[\s\S]*?function activateSiteSearch\(provider, activationOptions\)[\s\S]*?if \(options\.preserveResults !== true\) \{\s*clearSearchSuggestions\(\);/,
  'local and provider scope activation should not clear preserved results prematurely'
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
const emptyRenderIndex = renderTabSuggestionsSource.indexOf(
  'renderOverlayEmptyState(emptyText);'
);
const emptyRevealIndex = renderTabSuggestionsSource.indexOf(
  'setOverlayResultsCollapsed(false, { deferLayoutSync: true });'
);
const emptyCommitIndex = renderTabSuggestionsSource.indexOf(
  'commitSuggestionsNaturalHeightAfterRender();'
);
const tabRenderIndex = renderTabSuggestionsSource.indexOf(
  'reactView.renderTabs(list);'
);
const tabRevealIndex = renderTabSuggestionsSource.indexOf(
  'setOverlayResultsCollapsed(false, { deferLayoutSync: true });',
  tabRenderIndex
);
const tabCommitIndex = renderTabSuggestionsSource.indexOf(
  'commitSuggestionsNaturalHeightAfterRender();',
  tabRenderIndex
);
assert.ok(
  emptyRenderIndex >= 0 &&
    emptyRevealIndex > emptyRenderIndex &&
    emptyCommitIndex > emptyRevealIndex &&
    tabRenderIndex >= 0 &&
    tabRevealIndex > tabRenderIndex &&
    tabCommitIndex > tabRevealIndex,
  'open-tab and empty results should render first, then commit their natural height directly'
);
assert.match(
  overlaySource,
  /const requestModeKey = getOverlaySearchModeKey\(\);[\s\S]*?const requestSeq = overlayTabsRequestSeq;[\s\S]*?requestSeq !== overlayTabsRequestSeq[\s\S]*?requestModeKey !== getOverlaySearchModeKey\(\)/,
  'stale or late open-tab responses should not replace results after a newer request or scope change'
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
const updateCommitIndex = updateSearchSuggestionsSource.indexOf(
  'commitSuggestionsNaturalHeightAfterRender();'
);
assert.ok(
  updateRenderIndex >= 0 &&
    updateRevealIndex > updateRenderIndex &&
    updateCommitIndex > updateRevealIndex,
  'ordinary results should render before their final natural-height layout is published'
);
assert.match(
  updateSearchSuggestionsSource,
  /setOverlayResultsCollapsed\(false, \{\s*deferLayoutSync: true\s*\}\);[\s\S]*?commitSuggestionsNaturalHeightAfterRender\(\);/,
  'each result render should use one direct final-height commit'
);
assert.doesNotMatch(
  updateSearchSuggestionsSource,
  /previousHeightState|deferCappedShrink|settleHeightAfterRemoteMix|requestAnimationFrame|setTimeout/,
  'the render commit should not capture, defer, or schedule result height'
);

assert.match(
  overlaySource,
  /const waitForFirstResultMix =\s*suggestionsContainer\.getAttribute\('data-collapsed'\) === 'true';[\s\S]*?OVERLAY_FIRST_RESULT_REVEAL_DELAY_MS[\s\S]*?const remoteDelay = waitForFirstResultMix\s*\? 0[\s\S]*?if \(remoteMixState\.visualSettled\) \{\s*return;/,
  'the first local and remote result stages should still produce only one visible commit'
);
assert.match(
  overlaySource,
  /if \(isPaste \|\| getDirectUrlSuggestion\(query\)\) \{\s*updatePendingSearchSuggestions\(query\);\s*\}/,
  'direct URL previews should update immediately without a height-deferral option'
);
assert.match(
  overlaySource,
  /!finalRemoteMix && remoteMixState &&[\s\S]*?remoteMixState\.settled && remoteMixState\.hasFinalSuggestions[\s\S]*?return;/,
  'a late local render should not overwrite an already completed remote mix'
);

[
  'animateSuggestionsHeight',
  'captureSuggestionsHeightState',
  'clipSuggestionsToHeight',
  'deferCappedShrink',
  'finishSuggestionsHeightInputSession',
  'getSuggestionsHeightTransitionProperties',
  'holdSuggestionsHeightForRemoteMix',
  'scheduleSearchPanelsLayoutTransition',
  'scheduleStandaloneSuggestionsHeightTransition',
  'settleHeightAfterRemoteMix',
  'suggestionsHeightAnimationFrame',
  'suggestionsHeightInputSettleTimer',
  'suggestionsHeightRemoteMixSettleMs'
].forEach((legacyHeightSymbol) => {
  assert.strictEqual(
    overlaySource.includes(legacyHeightSymbol),
    false,
    `${legacyHeightSymbol} should be removed with the height animation pipeline`
  );
});

assert.match(
  overlaySource,
  /function commitSuggestionsNaturalHeightAfterRender\(\) \{\s*SUGGESTIONS_HEIGHT_LAYOUT\.applyNaturalSuggestionsHeightLayout\(\s*suggestionsContainer\s*\);\s*syncSearchModeMenuResultOffset\(\);\s*\}/,
  'the final menu offset should be synchronized in the same direct layout commit'
);
assert.match(
  overlaySource,
  /if \(shouldCollapse\) \{\s*SUGGESTIONS_HEIGHT_LAYOUT\.applyNaturalSuggestionsHeightLayout\([\s\S]*?suggestionsContainer[\s\S]*?return;\s*\}\s*SUGGESTIONS_HEIGHT_LAYOUT\.applyNaturalSuggestionsHeightLayout\([\s\S]*?suggestionsContainer/,
  'collapse and reveal should both clear any stale height interpolation styles'
);
assert.doesNotMatch(
  overlaySource,
  /function applyInstantSuggestionsHeightLayout/,
  'Overlay should not retain a private copy of the shared height-layout policy'
);

console.log('overlay instant result height tests passed');
