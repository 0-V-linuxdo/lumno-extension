const assert = require('assert');
const fs = require('fs');

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
  /function reconcileSuggestionsHeightAfterRender\(previousState, query, options\)[\s\S]*?holdSuggestionsHeightForRemoteMix\([\s\S]*?animateSuggestionsHeight\(suggestionsContainer, previousState\.height\)/,
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
  /function scheduleSearchPanelsLayoutTransition\(container, fromHeight, targetMetrics, modeMenu\)[\s\S]*?searchPanelsLayoutTransitionActive = true;[\s\S]*?setModeMenuResultOffset\(fromHeight\)[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?setProperty\('height', `\$\{toHeight\}px`[\s\S]*?setModeMenuResultOffset\(toHeight\)/,
  'the upper result surface and lower mode panel should be driven by one frame scheduler'
);
assert.match(
  overlaySource,
  /function getSearchPanelsLayoutTransitionMenu\(\)[\s\S]*?menu\.hidden[\s\S]*?menu\.getAttribute\('data-open'\) !== 'true'[\s\S]*?const modeMenu = getSearchPanelsLayoutTransitionMenu\(\);\s*if \(modeMenu\) \{[\s\S]*?scheduleSearchPanelsLayoutTransition\([\s\S]*?scheduleStandaloneSuggestionsHeightTransition\(/,
  'closed scope panels should leave local browser-result searches on the standalone height path'
);

console.log('overlay search mode height transition tests passed');
