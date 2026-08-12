const assert = require('assert');
const fs = require('fs');

const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');

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

console.log('overlay fast-open contract tests passed');
