const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const search = require('../src/shared/search-utils.js');

function readSource(path) {
  return fs.readFileSync(path, 'utf8');
}

const sharedSource = readSource('src/shared/search-input-mode.js');
const sharedCss = readSource('src/shared/search-input.css');
const newtabSource = readSource('src/newtab/newtab.js');
const overlaySource = readSource('src/overlay/search-panel.js');

assert.match(
  sharedSource,
  /DEFAULT_MODE_MENU_DOUBLE_TAB_DURATION = 700[\s\S]*?function shouldOpenModeMenuOnDoubleTab\(event\)[\s\S]*?event\.defaultPrevented[\s\S]*?event\.repeat/,
  'shared input mode should own the timed, distinct-key double-Tab state'
);
assert.match(
  sharedSource,
  /SEARCH_INPUT_MODE_RUNTIME_VERSION[\s\S]*?root\.LumnoSearchInputMode\.runtimeVersion === SEARCH_INPUT_MODE_RUNTIME_VERSION/,
  'shared input mode should replace stale page-scoped runtimes after an extension update'
);
assert.match(
  sharedSource,
  /function handleModeInput\(event\) \{\s*resetModeMenuDoubleTab\(\);[\s\S]*?function handleModeInputKeydown\(event\)[\s\S]*?event\.key !== 'Tab'[\s\S]*?resetModeMenuDoubleTab\(\);[\s\S]*?input\.addEventListener\('blur', handleModeInputBlur\)/,
  'input, non-Tab keys, and blur should reset the pending double-Tab gesture'
);
assert.match(
  sharedSource,
  /function shouldOpenModeMenuForActiveModeOnTab\(event\)[\s\S]*?hasModeTag[\s\S]*?if \(hasModifier \|\| event\.repeat[\s\S]*?resetModeMenuDoubleTab\(\);[\s\S]*?if \(!hasModeTag\) \{\s*return false;\s*\}[\s\S]*?event\.preventDefault\(\)[\s\S]*?return true;/,
  'an active tag should own plain Tab even when its query is non-empty'
);
assert.match(
  sharedSource,
  /function shouldCompleteModeMenuDoubleTab\(event\)[\s\S]*?!modeMenuDoubleTabPending[\s\S]*?event\.repeat[\s\S]*?resetModeMenuDoubleTab\(\);\s*return true;/,
  'overlay should be able to complete the pending gesture after applying its automatic open-tabs tag'
);
assert.match(
  sharedSource,
  /function setPrefixText\(prefixText, theme, prefixOptions\)[\s\S]*?if \(!nextOptions\.preserveModeMenuDoubleTab\) \{\s*resetModeMenuDoubleTab\(\);/,
  'automatic overlay tag activation should be able to preserve only the pending double-Tab gesture'
);
assert.match(
  sharedSource,
  /function shouldContainModeMenuTab\(event\)[\s\S]*?!modeMenuOpen && !modeMenuPending[\s\S]*?event\.preventDefault\(\)[\s\S]*?return true;/,
  'an open scope menu should contain unmodified Tab focus on both search surfaces'
);
assert.match(
  sharedSource,
  /data-search-input-mode-menu-content[\s\S]*?data-search-input-mode-menu-footer[\s\S]*?function refreshModeMenuLanguage\(\)[\s\S]*?formatShortcutReference\('Tab Tab'[\s\S]*?search_scope_menu_shortcut_hint/,
  'shared scope menu should mount a localized, platform-aware footer outside its content grid'
);
assert.match(
  sharedCss,
  /\.x-lumno-search-input-mode__menu-footer\s*\{[\s\S]*?padding:\s*8px var\(--x-lumno-search-mode-footer-inline-start, 16px\) 9px !important;[\s\S]*?text-align:\s*left !important;/,
  'the fixed scope-panel shortcut hint should use the same measured inset on both sides'
);
assert.match(
  sharedCss,
  /\.x-lumno-search-input-mode__menu-footer\s*\{[\s\S]*?font:\s*400 12px\/18px[\s\S]*?\.x-lumno-search-input-mode__menu-footer-key\s*\{[\s\S]*?margin-inline-start:\s*auto !important;[\s\S]*?font:\s*500 11px\/16px[\s\S]*?\.x-lumno-search-input-mode__menu-footer-filter-text\s*\{[\s\S]*?flex:\s*0 1 auto !important;[\s\S]*?text-align:\s*left !important;/,
  'the lighter filter hint should stay left while the shortcut hint aligns right'
);
assert.doesNotMatch(
  sharedSource,
  /data-search-input-mode-menu-footer-divider/,
  'the scope footer should not render a divider between its swapped hints'
);
assert.match(
  sharedSource,
  /function updateModeMenuFooterAlignment\(\)[\s\S]*?querySelector\(\s*'\.x-lumno-search-input-mode__menu-icon'[\s\S]*?iconRect\.left - footerRect\.left[\s\S]*?--x-lumno-search-mode-footer-inline-start/,
  'the shared scope menu should align its footer to the first rendered icon'
);

for (const [surface, source] of [
  ['New Tab', newtabSource],
  ['overlay', overlaySource]
]) {
  assert.match(
    source,
    /function handleTabKey|handleTabKey = function/,
    `${surface} should expose its Tab handler`
  );
  assert.match(
    source,
    /shouldContainModeMenuTab\((?:event|e)\)[\s\S]*?return true;/,
    `${surface} should keep Tab from focusing a scroll container while the scope menu is open`
  );
  assert.match(
    source,
    /if \(!(?:event|e) \|\| (?:event|e)\.defaultPrevented\) \{\s*return false;[\s\S]*?shouldOpenModeMenuOnDoubleTab\((?:event|e)\)[\s\S]*?openSearchModeMenuFromDoubleTab\(\)/,
    `${surface} should ignore a second handler pass for the same event and use the shared gesture`
  );
  assert.match(
    source,
    /shouldOpenModeMenuForActiveModeOnTab\((?:event|e)\)[\s\S]*?inputModeController\.openModeMenu\('none'\);\s*return true;[\s\S]*?if \(siteSearchState \|\| localSearchScopeState/,
    `${surface} should open on one Tab for an existing tag before its active-mode guard`
  );
  assert.match(
    source,
    /function openSearchModeMenuFromDoubleTab\(\)[\s\S]*?activateSiteSearch\(provider\);\s*inputModeController\.openModeMenu\('none'\);/,
    `${surface} should activate the default tag before opening the scope menu`
  );
  assert.ok(
    source.includes('inputModeController.refreshModeMenuLanguage();'),
    `${surface} should refresh the scope-panel hint when its locale changes`
  );
  assert.match(
    source,
    /function getSearchModeMenuResultOffset\(\)[\s\S]*?suggestionsContainer\.offsetHeight[\s\S]*?setModeMenuResultOffset/,
    `${surface} should keep a tagged Tab-opened panel positioned by unscaled result height`
  );
}

const overlayTabHandlerStart = overlaySource.indexOf('function handleTabKey(e) {');
const overlayTabHandlerEnd = overlaySource.indexOf(
  'captureTabHandler = function(e) {',
  overlayTabHandlerStart
);
const overlayTabHandlerSource = overlaySource.slice(
  overlayTabHandlerStart,
  overlayTabHandlerEnd
);
assert.match(
  overlayTabHandlerSource,
  /shouldCompleteModeMenuDoubleTab\(e\)[\s\S]*?openSearchModeMenuFromDoubleTab\(\)[\s\S]*?shouldOpenModeMenuForActiveModeOnTab\(e\)/,
  'overlay should complete a pending double Tab before treating its automatic open-tabs tag as explicit'
);
assert.match(
  overlayTabHandlerSource,
  /shouldOpenModeMenuOnDoubleTab\(e\)[\s\S]*?if \(e\.defaultPrevented\) \{\s*activateOpenTabsSearchMode\(\{ preserveModeMenuDoubleTab: true \}\);\s*return true;/,
  'overlay first Tab should immediately restore open-tabs search without losing the second-press window'
);

const overlayDoubleTabOpenStart = overlaySource.indexOf(
  'function openSearchModeMenuFromDoubleTab() {'
);
const overlayDoubleTabOpenEnd = overlaySource.indexOf(
  'function restoreSearchModeQuery',
  overlayDoubleTabOpenStart
);
const overlayDoubleTabOpenSource = overlaySource.slice(
  overlayDoubleTabOpenStart,
  overlayDoubleTabOpenEnd
);
assert.match(
  overlayDoubleTabOpenSource,
  /expectedOpenTabsSearchModeActive = openTabsSearchModeActive[\s\S]*?openTabsSearchModeActive !== expectedOpenTabsSearchModeActive/,
  'a delayed provider activation should keep the exact temporary open-tabs state that initiated it'
);

for (const [surface, source, visibleAttributes] of [
  ['New Tab', newtabSource, { 'data-visible': 'true' }],
  ['overlay', overlaySource, { 'aria-hidden': 'false', 'data-collapsed': 'false' }]
]) {
  const resultOffsetStart = source.indexOf(
    'function getSearchModeMenuResultOffset() {'
  );
  const resultOffsetEnd = source.indexOf(
    'function syncSearchModeMenuResultOffset() {',
    resultOffsetStart
  );
  const resultOffsetSource = source.slice(resultOffsetStart, resultOffsetEnd);
  const resultOffsetContext = vm.createContext({
    suggestionsContainer: {
      getAttribute: (name) => visibleAttributes[name] || null,
      getBoundingClientRect: () => ({ height: 192 }),
      offsetHeight: 240
    }
  });
  vm.runInContext(
    `${resultOffsetSource}\nthis.getResultOffsetForTest = getSearchModeMenuResultOffset;`,
    resultOffsetContext,
    { filename: `${surface.toLowerCase().replace(/\s+/g, '-')}-result-offset.js` }
  );
  assert.strictEqual(
    resultOffsetContext.getResultOffsetForTest(),
    240,
    `${surface} should use the unscaled layout height instead of a transformed visual height`
  );
}

assert.match(
  newtabSource,
  /function getDefaultSearchModeProvider\(providers\)[\s\S]*?getSearchEngineSiteSearchProvider\(\s*defaultSearchEngineState,\s*providers/,
  'New Tab should derive its initial tag from the current search engine state'
);
assert.match(
  overlaySource,
  /function getCurrentPageSiteSearchModeProvider\(providers\)[\s\S]*?getUrlHost\(initialContextTabUrl\)[\s\S]*?!isSearchEngineSiteSearchProvider\(provider\)[\s\S]*?!isAiSiteSearchProvider\(provider\)[\s\S]*?siteSearchHostsMatch/,
  'overlay should match the current page only against real site-search providers'
);
assert.match(
  overlaySource,
  /const provider = getCurrentPageSiteSearchModeProvider\(providers\) \|\|\s*getOverlayDefaultSearchModeProvider\(providers\);/,
  'overlay should prefer the current-page site search and fall back to the current engine'
);
assert.match(
  overlaySource,
  /overlaySearchEngineStateReady = loadOverlaySearchEngineState[\s\S]*?Promise\.all\(\[[\s\S]*?overlaySearchEngineStateReady[\s\S]*?getSiteSearchProviders\(\)/,
  'overlay double-Tab activation should wait for both the stored engine and provider list'
);

const providers = search.getDefaultSiteSearchProviders();
assert.strictEqual(
  search.getSearchEngineSiteSearchProvider({
    id: 'google',
    host: 'www.google.com',
    name: 'Google',
    searchTemplate: 'https://www.google.com/search?q={query}'
  }, providers).key,
  'gg',
  'known current engines should reuse their library provider'
);
const detected360 = search.getSearchEngineSiteSearchProvider({
  id: 'so',
  host: 'www.so.com',
  name: '360搜索',
  searchTemplate: 'https://www.so.com/s?q={query}'
}, providers);
assert.strictEqual(
  detected360.key,
  'engine-so',
  'an engine id must not collide with an unrelated provider key'
);
assert.strictEqual(detected360.name, '360搜索');
assert.strictEqual(detected360.category, 'searchEngine');
assert.strictEqual(
  search.getSearchEngineSiteSearchProvider({}, providers).key,
  'gg',
  'the pre-storage fallback should remain Google on both surfaces'
);

const expectedShortcutTitles = {
  en: 'Open search scope panel',
  ja: '検索範囲パネルを開く',
  zh_CN: '打开搜索范围面板',
  zh_TW: '開啟搜尋範圍面板'
};
const expectedShortcutHints = {
  en: 'Quickly open this panel',
  ja: 'このパネルをすばやく開く',
  zh_CN: '快速打开此面板',
  zh_TW: '快速開啟此面板'
};
const expectedShortcutDescriptions = {
  en: 'When the input is empty, press Tab twice; with a search scope selected, press Tab once',
  ja: '入力欄が空のときは Tab を2回、検索範囲を選択済みのときは Tab を1回押します',
  zh_CN: '输入框为空时连续按两次 Tab；已选择搜索范围时按一次 Tab',
  zh_TW: '輸入框為空時連按兩次 Tab；已選擇搜尋範圍時按一次 Tab'
};
Object.entries(expectedShortcutTitles).forEach(([locale, expectedTitle]) => {
  const messages = JSON.parse(readSource(`_locales/${locale}/messages.json`));
  assert.strictEqual(
    messages.shortcut_reference_search_open_scope_menu_title &&
      messages.shortcut_reference_search_open_scope_menu_title.message,
    expectedTitle,
    `${locale} should localize the Options double-Tab shortcut title`
  );
  assert.strictEqual(
    messages.shortcut_reference_search_open_scope_menu_desc &&
      messages.shortcut_reference_search_open_scope_menu_desc.message,
    expectedShortcutDescriptions[locale],
    `${locale} should localize the Options double-Tab shortcut description`
  );
  assert.strictEqual(
    messages.search_scope_menu_shortcut_hint &&
      messages.search_scope_menu_shortcut_hint.message,
    expectedShortcutHints[locale],
    `${locale} should localize the fixed scope-panel shortcut hint`
  );
});

async function runRuntimeStabilityTests() {
  const staleControllerFactory = function staleControllerFactory() {};
  const sharedRuntimeContext = vm.createContext({
    window: {
      LumnoSearchInputMode: Object.freeze({
        createInputModeController: staleControllerFactory,
        runtimeVersion: 'stale-runtime'
      })
    }
  });
  vm.runInContext(sharedSource, sharedRuntimeContext, {
    filename: 'src/shared/search-input-mode.js'
  });
  const upgradedRuntime = sharedRuntimeContext.window.LumnoSearchInputMode;
  assert.notStrictEqual(
    upgradedRuntime.createInputModeController,
    staleControllerFactory,
    'a stale page-scoped input-mode runtime should be replaced on reinjection'
  );
  assert.ok(
    upgradedRuntime.runtimeVersion,
    'the current input-mode runtime should expose a version marker'
  );
  vm.runInContext(sharedSource, sharedRuntimeContext, {
    filename: 'src/shared/search-input-mode.js'
  });
  assert.strictEqual(
    sharedRuntimeContext.window.LumnoSearchInputMode,
    upgradedRuntime,
    'reinjection should keep an already-current input-mode runtime stable'
  );

  let resolveEngineState;
  let engineStateReady = false;
  const engineStateReadyPromise = new Promise((resolve) => {
    resolveEngineState = () => {
      engineStateReady = true;
      resolve();
    };
  });
  const activations = [];
  const menuOpens = [];
  const providerItems = [
    { key: 'gg', name: 'Google' },
    { key: 'bi', name: 'Bing' }
  ];
  const overlayRuntimeContext = vm.createContext({
    Promise,
    defaultSiteSearchProviders: providerItems,
    getCurrentPageSiteSearchModeProvider: () => null,
    getOverlayDefaultSearchModeProvider: () => (
      engineStateReady ? providerItems[1] : providerItems[0]
    ),
    getSiteSearchProviders: () => Promise.resolve(providerItems),
    inputModeController: {
      openModeMenu: (focusTarget) => menuOpens.push(focusTarget)
    },
    localSearchScopeState: null,
    openTabsSearchModeActive: true,
    overlaySearchEngineStateReady: engineStateReadyPromise,
    searchInput: { value: '' },
    siteSearchProvidersCache: providerItems,
    siteSearchState: null,
    activateSiteSearch: (provider) => activations.push(provider.key)
  });
  vm.runInContext(
    `${overlayDoubleTabOpenSource}\nthis.openSearchModeMenuFromDoubleTabForTest = openSearchModeMenuFromDoubleTab;`,
    overlayRuntimeContext,
    { filename: 'overlay-double-tab-open.js' }
  );
  const pendingActivation = overlayRuntimeContext.openSearchModeMenuFromDoubleTabForTest();
  await Promise.resolve();
  assert.deepStrictEqual(
    activations,
    [],
    'a fast double-Tab must not activate the Google fallback before storage resolves'
  );
  assert.deepStrictEqual(
    menuOpens,
    [],
    'the scope menu should not open with a temporary fallback selection'
  );
  resolveEngineState();
  assert.strictEqual(
    await pendingActivation,
    true,
    'double-Tab activation should finish after the engine state becomes ready'
  );
  assert.deepStrictEqual(
    activations,
    ['bi'],
    'the resolved default engine should win over the pre-storage Google fallback'
  );
  assert.deepStrictEqual(
    menuOpens,
    ['none'],
    'the scope menu should open only after the stable provider is active'
  );

  let resolveStaleEngineState;
  overlayRuntimeContext.overlaySearchEngineStateReady = new Promise((resolve) => {
    resolveStaleEngineState = resolve;
  });
  overlayRuntimeContext.searchInput.value = '';
  const staleActivation = overlayRuntimeContext.openSearchModeMenuFromDoubleTabForTest();
  overlayRuntimeContext.searchInput.value = 'typed while loading';
  resolveStaleEngineState();
  assert.strictEqual(
    await staleActivation,
    false,
    'a delayed provider resolution should stop after the user changes the input'
  );
  assert.deepStrictEqual(
    activations,
    ['bi'],
    'a stale async completion must not replace the user\'s newer interaction state'
  );
  assert.deepStrictEqual(
    menuOpens,
    ['none'],
    'a stale async completion must not reopen the scope menu'
  );
}

runRuntimeStabilityTests().then(() => {
  console.log('search scope double-Tab tests passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
