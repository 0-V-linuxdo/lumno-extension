const assert = require('assert');
const fs = require('fs');

const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');

const triggerStart = backgroundSource.indexOf('function triggerShowSearchForTab(tab, source)');
const triggerEnd = backgroundSource.indexOf('\nfunction injectTabSwitcherOnTab', triggerStart);
const triggerSource = backgroundSource.slice(triggerStart, triggerEnd);
assert.ok(triggerStart >= 0 && triggerEnd > triggerStart, 'show-search trigger should remain discoverable');
assert.match(
  triggerSource,
  /const activeUrl = getResolvedTabUrl\(tab\);[\s\S]*?if \(canOpenOverlayOnUrl\(activeUrl\)\) \{[\s\S]*?openOverlayOnTab\(tab, \[\], source\);[\s\S]*?return;[\s\S]*?chrome\.tabs\.query/,
  'injectable pages should start opening immediately and reserve a tab query for restricted-page recovery'
);

const runtimeVersionMatch = overlaySource.match(
  /_x_extension_search_overlay_runtime_version_2026_unique_\s*=\s*\n?\s*'([^']+)'/
);
assert.ok(runtimeVersionMatch, 'overlay should publish a runtime version for safe same-page reuse');
assert.ok(
  backgroundSource.includes(`const expectedOverlayRuntimeVersion = '${runtimeVersionMatch[1]}'`),
  'background and injected overlay should agree on the reusable runtime version'
);
assert.match(
  backgroundSource,
  /chrome\.scripting\.executeScript\(\{\s*target: \{tabId: activeTab\.id\},\s*func: \(runtimeVersion\) => \{[\s\S]*?_x_extension_search_overlay_runtime_version_2026_unique_[\s\S]*?_x_extension_toggleSearchOverlay_2026_unique_[\s\S]*?args: \[expectedOverlayRuntimeVersion\][\s\S]*?if \(runtimeReady\) \{[\s\S]*?runOverlayWithResolvedZoom\(\);\s*return;\s*\}[\s\S]*?injectOverlayRuntime\(\);/,
  'same-page reopen should call the existing runtime and inject the full file set only after a failed version probe'
);
assert.match(
  overlaySource,
  /const initialOverlaySettingsReady = overlayRuntime\.getStorageValues\([\s\S]*?LANGUAGE_STORAGE_KEY,[\s\S]*?THEME_STORAGE_KEY,[\s\S]*?OVERLAY_SIZE_MODE_STORAGE_KEY,[\s\S]*?OVERLAY_ENTER_ANIMATION_STORAGE_KEY,[\s\S]*?MOTION_EFFECTS_ENABLED_STORAGE_KEY,[\s\S]*?OVERLAY_OPEN_TABS_DEFAULT_VISIBLE_STORAGE_KEY[\s\S]*?\)\.catch\(\(\) => \(\{\}\)\);/,
  'first open should batch initial overlay preferences into one storage read'
);
assert.match(
  overlaySource,
  /const initialOverlayContentReady = Promise\.all\([\s\S]*?initialOverlayOpenTabsDefaultVisibleReady,[\s\S]*?initialFaviconEnhancedFetchReady[\s\S]*?if \(initialPrefillQuery\)[\s\S]*?requestTabsAndRender\(\)/,
  'non-critical initial content should still hydrate after its preferences are ready'
);
const initialContentStart = overlaySource.indexOf('const initialOverlayContentReady = Promise.all([');
const revealStart = overlaySource.indexOf('\n    const revealOverlay =', initialContentStart);
const initialContentSource = overlaySource.slice(initialContentStart, revealStart);
assert.ok(
  initialContentStart >= 0 && revealStart > initialContentStart,
  'initial overlay content block should remain discoverable'
);
assert.doesNotMatch(
  initialContentSource,
  /renderTabSuggestions\(filterTabsForOverlay\(tabs, ''\)\)/,
  'the overlay should not render a caller snapshot and immediately replace it with a fresh tab query'
);
assert.match(
  overlaySource,
  /function applyLanguageStrings\(options\)[\s\S]*?const refreshResults = !options \|\| options\.refreshResults !== false;[\s\S]*?if \(!refreshResults\) \{[\s\S]*?return;[\s\S]*?requestTabsAndRender\(\);/,
  'initial language hydration should be able to update labels without starting a second tab request'
);
assert.match(
  overlaySource,
  /initialLanguageReady\.then\(\(\) => \{[\s\S]*?applyLanguageStrings\(\{ refreshResults: false \}\);/,
  'initial language hydration should leave the first tab request to the content pipeline'
);
assert.match(
  initialContentSource,
  /if \(initialPrefillQuery\)[\s\S]*?return true;[\s\S]*?return initialLanguageReady\.catch\(\(\) => \{\}\)\.then\(\(\) => \{[\s\S]*?requestTabsAndRender\(\);/,
  'empty-query tab hydration should wait for labels while URL-prefill remains immediate'
);
assert.doesNotMatch(
  overlaySource.slice(overlaySource.lastIndexOf('const revealReady =')),
  /initialLanguageReady|initialOverlayContentReady|initialFaviconEnhancedFetchReady/,
  'visible input reveal should not wait for language, tab rows, or favicon policy'
);
assert.match(
  backgroundSource,
  /const siteSearchProviders = Array\.isArray\(siteSearchCache\) \? siteSearchCache : \[\];[\s\S]*?loadSiteSearchProviders\(\)[\s\S]*?chrome\.scripting\.executeScript\(\{/,
  'cold startup should open with cached providers immediately and warm missing provider data in parallel'
);
assert.match(
  backgroundSource,
  /function createOverlayTabPayload\(tab, fetchSeq\) \{[\s\S]*?id: tab\.id,[\s\S]*?title:[\s\S]*?url:[\s\S]*?favIconUrl:[\s\S]*?_xTabFetchSeq: fetchSeq[\s\S]*?\}/,
  'open-tab responses should project browser tabs to the fields consumed by the overlay'
);
assert.match(
  backgroundSource,
  /const withSeq = sortedTabs\.map\(\(tab\) => createOverlayTabPayload\(tab, tabOverlayFetchSeq\)\);/,
  'open-tab responses should avoid serializing full browser Tab objects into the page'
);
assert.match(
  overlaySource,
  /let overlayTabsCacheReady = initialOverlayTabs\.length > 0;[\s\S]*?let overlayTabsRequestInFlight = false;[\s\S]*?let overlayTabsRequestSeq = 0;/,
  'the overlay should track a reusable full-tab cache and its active request'
);
assert.match(
  overlaySource,
  /function renderCachedTabsOrRequest\(filterQuery\) \{[\s\S]*?renderCachedTabsForOverlay\(filterQuery\)[\s\S]*?if \(!overlayTabsRequestInFlight\) \{[\s\S]*?requestTabsAndRender\(filterQuery\);/,
  'open-tab input should filter the cache and coalesce cache-miss requests'
);
const inputHandlerStart = overlaySource.indexOf('function handleSearchInputCompositionEnd(event)');
const inputHandlerEnd = overlaySource.indexOf("searchInput.addEventListener('compositionstart'", inputHandlerStart);
const inputHandlerSource = overlaySource.slice(inputHandlerStart, inputHandlerEnd);
assert.ok(
  inputHandlerStart >= 0 && inputHandlerEnd > inputHandlerStart,
  'search input handlers should remain discoverable'
);
assert.doesNotMatch(
  inputHandlerSource,
  /if \(openTabsSearchModeActive\) \{\s*requestTabsAndRender\(/,
  'typing in open-tab mode should not query every keystroke'
);
assert.match(
  inputHandlerSource,
  /if \(openTabsSearchModeActive\) \{\s*renderCachedTabsOrRequest\(query\);/,
  'typing in open-tab mode should render from the full-tab cache'
);
const activateOpenTabsStart = overlaySource.indexOf('function activateOpenTabsSearchMode(options)');
const activateOpenTabsEnd = overlaySource.indexOf('\n    function clearOpenTabsSearchMode', activateOpenTabsStart);
const activateOpenTabsSource = overlaySource.slice(activateOpenTabsStart, activateOpenTabsEnd);
assert.match(
  activateOpenTabsSource,
  /renderCachedTabsForOverlay\(latestOverlayQuery\);[\s\S]*?requestTabsAndRender\(latestOverlayQuery\);/,
  'entering open-tab mode should render cached rows immediately and refresh them once'
);
assert.match(
  overlaySource,
  /const requestSeq = overlayTabsRequestSeq;[\s\S]*?if \(requestSeq !== overlayTabsRequestSeq\) \{[\s\S]*?return;[\s\S]*?tabs = freshTabs;[\s\S]*?overlayTabsCacheReady = true;[\s\S]*?renderCachedTabsForOverlay\(activeQuery\);/,
  'only the latest tab response should replace the full cache and render the active query'
);
assert.doesNotMatch(
  overlaySource,
  /tabs = filteredTabs;/,
  'filtering should not overwrite the reusable full-tab cache'
);

console.log('overlay fast-open contract tests passed');
