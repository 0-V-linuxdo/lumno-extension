const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const readSource = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const newtabSource = readSource('src/newtab/newtab.js');
const overlaySource = readSource('src/overlay/search-panel.js');
const backgroundSource = readSource('src/background/background.js');
const inputModeSource = readSource('src/shared/search-input-mode.js');
const inputModeCss = readSource('src/shared/search-input.css');
const newtabHtml = readSource('src/newtab/newtab.html');

function getFunctionSection(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `${functionName} should have a readable source section`);
  return source.slice(start, end);
}

assert.match(
  inputModeSource,
  /function createModeMenuIcon\(item\)[\s\S]*?attachProviderIcon\(image,[\s\S]*?onIconUnavailable: showFallback/,
  'scope menu provider icons should use the shared favicon fallback and persistence runtime'
);
assert.match(
  inputModeSource,
  /function removeProviderIconRuntimeFallbacks\(parent\)[\s\S]*?_x_extension_favicon_fallback_2024_unique_[\s\S]*?_x_extension_overlay_favicon_fallback_2026_unique_/,
  'provider icon fallback should remove runtime-owned fallback siblings on both search surfaces'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-icon\s*\{[\s\S]*?width:\s*52px !important;[\s\S]*?border-radius:\s*12px !important;[\s\S]*?--x-lumno-search-mode-icon-bg/,
  'scope menu icons should enlarge the complete shortcut theme container with a tighter radius'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-icon\s*\{[\s\S]*?--x-nt-shortcut-smooth-mask-outer[\s\S]*?mask-image:\s*var\(--x-lumno-search-mode-smooth-mask-outer\)/,
  'scope menu icon containers should reuse the shortcut outer squircle mask'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-favicon-mask\s*\{[\s\S]*?width:\s*36px !important;[\s\S]*?--x-lumno-search-mode-smooth-mask-inner/,
  'scope menu favicons should keep shortcut-like padding inside an inner crop mask'
);
assert.match(
  inputModeSource,
  /function applyModeMenuIconTheme\(wrap, theme\)[\s\S]*?isDarkMode\(\) \? 0\.72 : 0\.82[\s\S]*?--x-lumno-search-mode-icon-bg/,
  'scope menu icon backgrounds should reuse the shortcut theme mixing ratios'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-item:hover:not\(\[aria-checked="true"\]\)[\s\S]*?--x-lumno-search-mode-hover-bg[\s\S]*?color-mix\([\s\S]*?--x-nt-hover-bg[\s\S]*?--x-ov-hover-bg[\s\S]*?60%,[\s\S]*?transparent/,
  'scope menu hover should soften the shared neutral hover surface on both search surfaces'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-item:hover:not\(\[aria-checked="true"\]\)[\s\S]*?border-color:\s*transparent !important;/,
  'scope menu hover should keep its border transparent'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-item\[aria-checked="true"\]\s*\{[\s\S]*?--x-lumno-search-mode-selected-bg[\s\S]*?border-color: transparent !important;/,
  'the active search scope should keep its themed background instead of the neutral hover surface'
);
assert.match(
  inputModeSource,
  /setStyle\(container, '--x-lumno-search-mode-selected-bg', visual\.background, useImportantStyles\)/,
  'the search scope menu should receive the current provider theme background'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-favicon-mask\s*>\s*\[hidden\]\s*\{\s*display: none !important;/,
  'resolved provider favicons should visually suppress their hidden fallback glyph'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu\[data-surface="newtab"\]\s*\{\s*backdrop-filter: none !important;[\s\S]*?-webkit-backdrop-filter: none !important;/,
  'the newtab scope menu should use an opaque surface without wallpaper blur'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu\[data-surface="overlay"\]\s*\{\s*backdrop-filter: none !important;[\s\S]*?-webkit-backdrop-filter: none !important;/,
  'the overlay scope menu should use an opaque surface without page blur'
);
assert.match(
  newtabHtml,
  /--x-nt-mode-menu-bg:\s*#ffffff;[\s\S]*?body\[data-theme="dark"\][\s\S]*?--x-nt-mode-menu-bg:\s*#141414;/,
  'newtab scope menu materials should stay opaque in light and dark themes'
);
assert.match(
  overlaySource,
  /light:\s*\{[\s\S]*?modeMenuBg:\s*'#FFFFFF'[\s\S]*?dark:\s*\{[\s\S]*?modeMenuBg:\s*'#141414'/,
  'overlay scope menu materials should stay opaque in light and dark themes'
);

[newtabSource, overlaySource].forEach((source, index) => {
  const surface = index === 0 ? 'newtab' : 'overlay';
  const menuBuilderName = source.includes('function buildSearchModeMenuItems')
    ? 'buildSearchModeMenuItems'
    : 'getSearchModeMenuItems';
  const menuBuilderEnd = menuBuilderName === 'buildSearchModeMenuItems'
    ? 'getSearchModeMenuItems'
    : 'restoreSearchModeQuery';
  const menuSource = getFunctionSection(
    source,
    menuBuilderName,
    menuBuilderEnd
  );
  const providerChainIndex = menuSource.indexOf('providers');
  const engineProviderIndex = menuSource.indexOf(
    '.filter((provider) => isSearchEngineSiteSearchProvider(provider))',
    providerChainIndex
  );
  const siteProviderIndex = menuSource.indexOf(
    '.concat(providers.filter((provider) => (',
    engineProviderIndex
  );
  const aiProviderIndex = menuSource.indexOf(
    '.concat(providers.filter((provider) => isAiSiteSearchProvider(provider)))'
  );
  const browserContentIndex = menuSource.indexOf("['topSite', 'bookmark', 'history']");
  assert.doesNotMatch(
    menuSource,
    /id:\s*['"]all['"]/,
    `${surface} scope switcher should not offer an all-search item`
  );
  assert.doesNotMatch(
    source,
    /item\.kind === ['"]all['"]/,
    `${surface} should not retain an unreachable all-search selection branch`
  );
  assert.ok(
    engineProviderIndex >= 0 &&
      siteProviderIndex > engineProviderIndex &&
      aiProviderIndex > siteProviderIndex &&
      browserContentIndex > aiProviderIndex,
    `${surface} scope switcher should group all providers by search engine, site search, AI, then browser content`
  );
  assert.match(
    menuSource,
    /const isAi = isAiSiteSearchProvider\(provider\);[\s\S]*?const isSearchEngine = isSearchEngineSiteSearchProvider\(provider\);[\s\S]*?group: isSearchEngine \? engineGroup : \(isAi \? aiGroup : siteGroup\)/,
    `${surface} scope switcher should place custom providers according to their selected category`
  );
  assert.match(
    menuSource,
    /menuIconName:\s*sourceType === 'topSite' \? 'star' : sourceType/,
    `${surface} browser-content cards should use the lighter menu-only icon set`
  );
  assert.match(
    source,
    /localSearchScopeTriggerState[\s\S]*?activateLocalSearchScope/,
    `${surface} should expose local-scope activation through its Tab trigger state`
  );
  assert.match(
    source,
    /function setLocalSearchScopePrefix\(scope\)[\s\S]*?menuIconName:\s*scope\.sourceType === 'topSite' \? 'star' : scope\.sourceType/,
    `${surface} active local-scope tag should reuse its built-in SVG icon`
  );
  assert.match(
    source,
    /sourceTypes:\s*requestLocalSearchScope\s*\?\s*\[requestLocalSearchScope\.sourceType\]\s*:\s*undefined/,
    `${surface} should request only the active local source`
  );
  assert.match(
    source,
    /includeOpenTabs:\s*requestLocalSearchScope\s*\?\s*false\s*:\s*undefined/,
    `${surface} should exclude open tabs from category-only search`
  );
  assert.match(
    source,
    /if \(requestLocalSearchScope\) \{[\s\S]*?return;/,
    `${surface} should skip remote search-engine suggestions in local scope mode`
  );
  assert.match(
    source,
    /if \(localSearchScopeState\) \{\s*return;\s*\}/,
    `${surface} should not fall through to a web search when a scoped query has no result`
  );
});

assert.match(
  overlaySource,
  /id:\s*'openTabs'[\s\S]*?menuIconName:\s*'browser'/,
  'overlay open-tabs card should use the lighter browser menu icon'
);
assert.match(
  overlaySource,
  /function setOpenTabsSearchPrefix\(theme\)[\s\S]*?menuIconName:\s*'browser'/,
  'overlay open-tabs tag should reuse the browser SVG icon'
);
assert.match(
  inputModeCss,
  /\.x-lumno-search-input-mode__menu-line-icon\s*\{[\s\S]*?width:\s*26px !important;[\s\S]*?height:\s*26px !important;/,
  'browser-content menu icons should keep their footprint while using lighter vectors'
);
assert.match(
  inputModeSource,
  /function applyModeMenuBuiltInIconTheme\(wrap\)[\s\S]*?--x-lumno-search-mode-icon-bg[\s\S]*?--x-lumno-search-mode-icon-color/,
  'built-in browser-content icons should use the active surface theme instead of the default blue brand fallback'
);

assert.match(
  newtabSource,
  /localSearchQueryModeActive[\s\S]*?t\('overlay_empty_result', '无匹配结果'\)[\s\S]*?suggestionsView\.render\(\{[\s\S]*?emptyMessage/,
  'newtab local search should pass a visible empty message to the suggestions view'
);
assert.match(
  overlaySource,
  /localSearchQueryModeActive && allSuggestions\.length === 0[\s\S]*?t\('overlay_empty_result', '无匹配结果'\)[\s\S]*?reactView\.render\(\{[\s\S]*?emptyMessage/,
  'overlay local search should pass a visible empty message to the React suggestions view'
);

assert.match(
  backgroundSource,
  /configuredSourceTypes\.filter\(\(sourceType\) => requestedSourceTypes\.includes\(sourceType\)\)/,
  'request-scoped sources should remain constrained by the user-enabled source settings'
);
assert.match(
  backgroundSource,
  /const allowOpenTabs = requestOptions\.includeOpenTabs !== false;/,
  'background search should allow local scopes to explicitly disable open-tab mixing'
);

assert.match(
  inputModeSource,
  /const explicitLabel = provider && provider\.tabHintLabel[\s\S]*?const label = explicitLabel \|\|[\s\S]*?site_search_tab_hint/,
  'shared Tab hint rendering should allow local scopes to override the site-search sentence'
);

const overlayTabKeySource = getFunctionSection(
  overlaySource,
  'handleTabKey',
  'handleSearchInputKeydown'
);
assert.match(
  overlayTabKeySource,
  /if \(!triggerInput\) \{\s*e\.preventDefault\(\);\s*activateOpenTabsSearchMode\(\);\s*return true;/,
  'overlay Tab should enter open-tabs search when the empty-query suggestion list is collapsed or empty'
);
assert.doesNotMatch(
  overlayTabKeySource,
  /suggestionItems\.length/,
  'overlay Tab activation should not depend on open-tab suggestions already being rendered'
);

[newtabSource, overlaySource].forEach((source, index) => {
  const surface = index === 0 ? 'newtab' : 'overlay';
  assert.match(
    source,
    /function getLocalSearchScopeTabHintProvider\(scope\)[\s\S]*?'local_search_tab_hint'[\s\S]*?'仅搜索\{source\}'/,
    `${surface} should use the dedicated local-search Tab hint copy`
  );
});

[
  ['en', 'Only search {source}'],
  ['zh_CN', '仅搜索{source}'],
  ['zh_TW', '僅搜尋{source}'],
  ['ja', '{source}のみ検索']
].forEach(([locale, expected]) => {
  const messages = JSON.parse(readSource(`_locales/${locale}/messages.json`));
  assert.strictEqual(
    messages.local_search_tab_hint && messages.local_search_tab_hint.message,
    expected,
    `${locale} should localize the category-only Tab hint`
  );
});

console.log('local search scope tests passed');
