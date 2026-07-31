const assert = require('assert');
const fs = require('fs');
const path = require('path');
const search = require('../src/shared/search-utils.js');

const repoRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertDirectNavigationDelegatesToShared(relativePath) {
  const source = readSource(relativePath);
  assert.ok(
    /function getDirectNavigationUrl\(input\)\s*\{[\s\S]*?typeof (?:SEARCH_UTILS|searchUtils)\.getDirectNavigationUrl === 'function'[\s\S]*?(?:SEARCH_UTILS|searchUtils)\.getDirectNavigationUrl\(input\)/.test(source),
    `${relativePath} should delegate direct URL parsing to shared search utils`
  );
  assert.doesNotMatch(
    source,
    /function isNumericHostLike\(hostname\)|function isDevHostLike\(hostname\)|DIRECT_NAVIGATION_FALLBACK_SINGLE_COLON_PROTOCOLS|getDirectNavigationFallbackProtocol|isExplicitDirectNavigationFallbackUrl/,
    `${relativePath} should not keep a second direct URL parser`
  );
}

function assertTabMatchUrlDelegatesToShared(relativePath, options = {}) {
  const source = readSource(relativePath);
  const includeSearch = options.includeSearch !== false;
  const expectedCall = includeSearch
    ? /SEARCH_UTILS\.buildTabMatchUrl\(url\)/
    : /SEARCH_UTILS\.buildTabMatchUrl\(url,\s*\{\s*includeSearch:\s*false\s*\}\)/;
  const normalizerName = includeSearch
    ? 'normalizeTabMatchUrl'
    : 'normalizeTabMatchUrlWithoutSearch';
  const normalizerStart = new RegExp(`function ${normalizerName}\\(url\\)\\s*\\{`);
  const startIndex = source.search(normalizerStart);
  assert.ok(startIndex >= 0, `${relativePath} should define ${normalizerName}`);
  const normalizerSource = source.slice(startIndex, startIndex + 900);
  assert.match(
    normalizerSource,
    expectedCall,
    `${relativePath} should delegate ${normalizerName} to the shared port-aware URL matcher`
  );
}

function assertKeywordOnlySuggestionsKeepSearchActionFirst(relativePath) {
  const source = readSource(relativePath);
  assert.match(
    source,
    /function getKeywordSearchSuggestionState\(list\)\s*\{[\s\S]*?SEARCH_UTILS\.getKeywordSearchSuggestionState\(list\)/,
    `${relativePath} should delegate keyword-search suggestion state to shared search utils`
  );
  assert.match(
    source,
    /const keywordSuggestionState = getKeywordSearchSuggestionState\(allSuggestions\);\s*const onlyKeywordSuggestions = keywordSuggestionState\.onlyKeywordSuggestions;/,
    `${relativePath} should use the shared keyword-only suggestion state`
  );
  assert.match(
    source,
    /!strongNavigationMatch && preferAutocompleteFirst && !onlyKeywordSuggestions/,
    `${relativePath} should not promote search-engine suggestions ahead of the explicit search action`
  );
  assert.match(
    source,
    /if \(onlyKeywordSuggestions\) \{\s*clearAutocomplete\(\);\s*\} else \{\s*applyAutocomplete\(allSuggestions,\s*primarySuggestion,\s*primaryHighlightReason\);\s*\}/,
    `${relativePath} should disable autocomplete when the only available results are keyword search suggestions`
  );
  assert.match(
    source,
    /if \(!siteSearchState && query && !onlyKeywordSuggestions &&/,
    `${relativePath} should not promote matched search-suggestion URLs through open-tab quick switch`
  );
  assert.match(
    source,
    /const autocompleteSuggestions = getKeywordSearchSuggestionState\(allSuggestions\)\.autocompleteSuggestions;[\s\S]*?getDomainPrefixCandidate\(autocompleteSuggestions,/,
    `${relativePath} should use shared autocomplete filtering for inline autocomplete`
  );
  assert.match(
    source,
    /getAutocompleteCandidate\(keywordSuggestionState\.autocompleteSuggestions,/,
    `${relativePath} should use shared autocomplete filtering before primary highlight promotion`
  );
}

function score(item, query, sourceType = 'history') {
  const context = search.buildSearchQueryContext(query);
  return search.calculateSearchRelevanceScore(item, sourceType, context, {
    getTitlePinyinMatchScore: () => ({ score: 0, reason: '' }),
    isLocalNetworkHost: () => false,
    isOwnExtensionUrl: () => false
  });
}

const shortAsciiContext = search.buildSearchQueryContext('x');
assert.strictEqual(
  search.matchesSearchQueryText({ title: 'Example Docs', url: 'https://example.com/docs' }, shortAsciiContext),
  false,
  'short ASCII terms should not match by loose contains'
);
assert.strictEqual(
  search.matchesSearchQueryText({ title: 'X Home', url: 'https://example.com/' }, shortAsciiContext),
  true,
  'short ASCII terms should still match title tokens'
);
assert.strictEqual(
  search.matchesSearchQueryText(
    { title: 'Final Cut Camera', url: 'https://apps.apple.com/final-cut-camera' },
    search.buildSearchQueryContext('fcc')
  ),
  true,
  'short ASCII terms should match multi-word title initials'
);
assert.strictEqual(
  search.matchesSearchQueryText(
    { title: 'SwitchBot', url: 'https://switchbot.example.com/' },
    search.buildSearchQueryContext('sb')
  ),
  true,
  'short ASCII terms should match camel-case title initials'
);
assert.strictEqual(
  search.matchesSearchQueryText(
    { title: 'Final Cut Camera', url: 'https://apps.apple.com/final-cut-camera' },
    search.buildSearchQueryContext('fcx')
  ),
  false,
  'title initials should not match unrelated letter combinations'
);

const releaseContext = search.buildSearchQueryContext('lumno release');
const releaseCoverage = search.getSearchTermCoverageStats(releaseContext, {
  titleLower: 'lumno',
  hostname: 'lumno.kubai.design',
  urlLower: 'https://lumno.kubai.design/release/',
  titleTokens: ['lumno'],
  hostLabels: ['lumno', 'kubai', 'design'],
  pathTokens: ['release']
});
assert.strictEqual(releaseCoverage.allMatched, true, 'title + path tokens should cover multi-term queries');

const rootScore = score({ title: 'Lumno', url: 'https://lumno.kubai.design/' }, 'lumno release', 'topSite');
const releaseScore = score({ title: 'Release | Lumno', url: 'https://lumno.kubai.design/release/' }, 'lumno release', 'history');
assert.ok(releaseScore > rootScore, 'specific release page should outrank root for path-intent queries');

const selectionNow = 1_800_000_000_000;
let selectionStats = search.normalizeSearchSelectionStats(null, { now: selectionNow });
for (let i = 0; i < 12; i += 1) {
  selectionStats = search.recordSearchSelectionInStats(selectionStats, {
    query: 'ProjectX',
    title: 'ProjectX | Selected Project',
    url: 'https://selected.example.com/',
    type: 'history'
  }, { now: selectionNow + i });
}
const selectionContext = search.buildSearchQueryContext('ProjectX');
const selectedCandidate = {
  title: 'ProjectX | Selected Project',
  url: 'https://selected.example.com/',
  visitCount: 5,
  lastVisitTime: selectionNow
};
const topSiteCandidate = {
  title: 'ProjectX',
  url: 'https://projectx.example.com/',
  visitCount: 40,
  lastVisitTime: selectionNow
};
const selectionOptions = {
  now: selectionNow + 12,
  getTitlePinyinMatchScore: () => ({ score: 0, reason: '' }),
  isLocalNetworkHost: () => false,
  isOwnExtensionUrl: () => false
};
const selectedScore = search.calculateSearchRelevanceScore(selectedCandidate, 'history', selectionContext, selectionOptions) +
  search.getSearchSelectionBoost(selectedCandidate, selectionContext, selectionStats, selectionOptions);
const topSiteScore = search.calculateSearchRelevanceScore(topSiteCandidate, 'topSite', selectionContext, selectionOptions);
assert.ok(
  selectedScore > topSiteScore,
  'query-specific selection history should be strong enough to outrank a generic top-site match'
);
const selectedSelectionBoost = search.getSearchSelectionBoost(
  selectedCandidate,
  selectionContext,
  selectionStats,
  selectionOptions
);
const learnedNavigationList = [
  {
    type: 'topSite',
    title: topSiteCandidate.title,
    url: topSiteCandidate.url,
    isTopSite: true
  },
  {
    type: 'history',
    title: selectedCandidate.title,
    url: selectedCandidate.url,
    selectionBoost: selectedSelectionBoost
  }
];
const learnedNavigationMatch = search.promoteStrongNavigationMatch(learnedNavigationList, 'ProjectX');
assert.strictEqual(
  learnedNavigationMatch.url,
  selectedCandidate.url,
  'strong navigation promotion should respect query-specific selection boost'
);

const displaySuggestionItems = Array.from({ length: 12 }, (_, index) => ({
  type: 'history',
  title: `Result ${index + 1}`,
  url: `https://example.com/${index + 1}`
}));
assert.strictEqual(
  search.limitSearchSuggestionsForDisplay(displaySuggestionItems).length,
  10,
  'display suggestions should default to the shared visible-result cap'
);
assert.deepStrictEqual(
  search.limitSearchSuggestionsForDisplay(displaySuggestionItems, { limit: 3 }).map((item) => item.title),
  ['Result 1', 'Result 2', 'Result 3'],
  'display suggestion limiting should preserve ranking order'
);
assert.deepStrictEqual(
  search.filterSearchSuggestionsBySourceTypes([
    { type: 'topSite', title: 'Frequent', url: 'https://frequent.example.com/' },
    { type: 'bookmark', title: 'Bookmark', url: 'https://bookmark.example.com/' },
    { type: 'history', title: 'History', url: 'https://history.example.com/' },
    { type: 'googleSuggest', title: 'Search Suggestion', url: 'https://google.example.com/' },
    { type: 'newtab', title: 'Search', url: 'https://search.example.com/' },
    { type: 'directUrl', title: 'Direct', url: 'https://direct.example.com/' }
  ], ['bookmark']).map((item) => item.type),
  ['bookmark', 'googleSuggest', 'newtab', 'directUrl'],
  'source filtering should only remove disabled local result types'
);
assert.deepStrictEqual(
  search.normalizeSearchEngineSuggestions([
    'foo',
    'foo bar',
    'Foo Bar',
    'foo baz',
    'foo qux'
  ], 'foo', { limit: 2 }),
  ['foo bar', 'foo baz'],
  'search engine suggestions should drop exact-query and duplicate items before applying the cap'
);
const keywordOnlySuggestionState = search.getKeywordSearchSuggestionState([
  { type: 'newtab', title: 'Search', url: 'https://www.google.com/search?q=foo' },
  { type: 'googleSuggest', title: 'foo bar', url: 'https://www.google.com/search?q=foo%20bar' }
]);
assert.strictEqual(
  keywordOnlySuggestionState.onlyKeywordSuggestions,
  true,
  'keyword-only state should cover the explicit search action plus engine suggestions'
);
assert.deepStrictEqual(
  keywordOnlySuggestionState.autocompleteSuggestions.map((item) => item.type),
  ['newtab', 'googleSuggest'],
  'keyword-only autocomplete pool can keep engine suggestions because there are no local results to outrank'
);
const mixedKeywordSuggestionState = search.getKeywordSearchSuggestionState([
  { type: 'newtab', title: 'Search', url: 'https://www.google.com/search?q=foo' },
  { type: 'googleSuggest', title: 'foo bar', url: 'https://www.google.com/search?q=foo%20bar' },
  { type: 'history', title: 'Foo Local', url: 'https://foo.example.com/' }
]);
assert.strictEqual(
  mixedKeywordSuggestionState.onlyKeywordSuggestions,
  false,
  'mixed local result state should not be treated as keyword-only'
);
assert.deepStrictEqual(
  mixedKeywordSuggestionState.autocompleteSuggestions.map((item) => item.type),
  ['newtab', 'history'],
  'engine suggestions should be removed from autocomplete candidates when local results exist'
);
const enginePolicyWithLocalResults = search.getSearchEngineSuggestionPolicy(
  search.buildSearchQueryContext('github'),
  [{ type: 'history', title: 'GitHub', url: 'https://github.com/' }],
  { maxEngineSuggestions: 5 }
);
assert.strictEqual(
  enginePolicyWithLocalResults.limit,
  3,
  'engine suggestion policy should allow up to three supplemental items when local results exist'
);
assert.ok(
  enginePolicyWithLocalResults.score <= 1,
  'engine suggestion policy should keep supplemental items below local result scores'
);
assert.strictEqual(
  search.getSearchEngineSuggestionPolicy(
    search.buildSearchQueryContext('什么东西'),
    [],
    { maxEngineSuggestions: 5 }
  ).limit,
  5,
  'engine suggestion policy should allow the full cap when no local results exist'
);
const engineSuggestionItems = [
  '什么东西补血',
  '什么东西解酒',
  '什么东西补钙',
  '什么东西补铁',
  '什么东西化痰'
].map((query) => ({
  type: 'googleSuggest',
  title: query,
  url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
}));
assert.deepStrictEqual(
  search.applySearchSuggestionHostDiversity(engineSuggestionItems).map((item) => item.title),
  engineSuggestionItems.map((item) => item.title),
  'search engine keyword suggestions should not be collapsed by same-host diversity limits'
);

const navList = [
  { type: 'history', title: 'Example Blog Detail', url: 'https://example.com/blog/detail' },
  { type: 'history', title: 'Example Home', url: 'https://example.com/' }
];
const promoted = search.promoteStrongNavigationMatch(navList, 'example');
assert.strictEqual(promoted.title, 'Example Home', 'strong navigation promotion should choose representative pages');
assert.strictEqual(navList[0].title, 'Example Home', 'strong navigation promotion should mutate the list consistently');

const blobUrl = 'blob:https://example.com/6b44b52f-04bb-4dc9-8df3-5d979bd66d5f';
assert.strictEqual(
  search.getDirectNavigationUrl(blobUrl),
  blobUrl,
  'blob protocol URLs should be preserved as direct navigation targets'
);
[
  'file:///Users/kevinxu/Downloads/report.pdf',
  'data:text/plain,hello',
  'view-source:https://example.com/',
  'mailto:hello@example.com',
  'magnet:?xt=urn:btih:0123456789abcdef',
  'vscode://file/Users/kevinxu/github/Lumno',
  'about:blank',
  'javascript:alert(1)'
].forEach((directUrl) => {
  assert.strictEqual(
    search.getDirectNavigationUrl(directUrl),
    directUrl,
    `${directUrl} should be preserved as a direct navigation target`
  );
});
assert.strictEqual(
  search.getDirectNavigationUrl('example.com/docs'),
  'https://example.com/docs',
  'shared direct navigation should keep existing host-like input behavior'
);
assert.strictEqual(
  search.getDirectNavigationUrl('localhost:3000'),
  'https://localhost:3000',
  'host:port development inputs should keep direct navigation behavior'
);
assert.strictEqual(
  search.getDirectNavigationUrl('example.com:8080/docs'),
  'https://example.com:8080/docs',
  'host:port web inputs should keep direct navigation behavior'
);
assert.strictEqual(
  search.buildTabMatchUrl('http://127.0.0.1:8765/'),
  '127.0.0.1:8765/',
  'open-tab matching should preserve an explicit numeric-IP port'
);
assert.notStrictEqual(
  search.buildTabMatchUrl('http://127.0.0.1:8765/'),
  search.buildTabMatchUrl('https://127.0.0.1:5173/'),
  'numeric-IP URLs on different ports should not match the same open tab'
);
assert.strictEqual(
  search.buildTabMatchUrl('http://127.0.0.1:8765/path?mode=one', { includeSearch: false }),
  '127.0.0.1:8765/path',
  'current-page matching may ignore the query while still preserving the port'
);
assert.strictEqual(
  search.getDirectNavigationUrl('site:example.com'),
  '',
  'search operators should not be treated as direct custom protocol navigation'
);
assertDirectNavigationDelegatesToShared('src/newtab/newtab.js');
assertDirectNavigationDelegatesToShared('src/overlay/search-panel.js');
assertDirectNavigationDelegatesToShared('src/background/background.js');
assertTabMatchUrlDelegatesToShared('src/newtab/newtab.js');
assertTabMatchUrlDelegatesToShared('src/overlay/search-panel.js');
assertTabMatchUrlDelegatesToShared('src/overlay/search-panel.js', { includeSearch: false });
assertKeywordOnlySuggestionsKeepSearchActionFirst('src/newtab/newtab.js');
assertKeywordOnlySuggestionsKeepSearchActionFirst('src/overlay/search-panel.js');

function testDirectNavigationUrl(input) {
  const raw = String(input || '').trim();
  if (!raw || /\s/.test(raw) || !raw.includes('.')) {
    return '';
  }
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const complexUrlInput = 'apps.apple.com/cn/app/%E6%97%A5%E8%BF%99%E9%94%81%E5%B1%8F';
const unrelatedOpenTabSuggestion = {
  type: 'history',
  title: '(1) App Store / X',
  url: 'https://x.com/i/bookmarks/2057032873014652963',
  _xMatchedTabId: 42
};
const directComplexUrlSuggestion = {
  type: 'directUrl',
  title: `打开 https://${complexUrlInput}`,
  url: `https://${complexUrlInput}`
};
assert.strictEqual(
  search.isDirectNavigationMatch(unrelatedOpenTabSuggestion, complexUrlInput, {
    getDirectNavigationUrl: testDirectNavigationUrl
  }),
  false,
  'unrelated open tabs should not be treated as matches for a complex URL input'
);
assert.strictEqual(
  search.isDirectNavigationMatch(directComplexUrlSuggestion, complexUrlInput, {
    getDirectNavigationUrl: testDirectNavigationUrl
  }),
  true,
  'the direct open-url suggestion should be treated as the URL navigation match'
);
const complexNavigationList = [unrelatedOpenTabSuggestion, directComplexUrlSuggestion];
const complexPromoted = search.promoteStrongNavigationMatch(complexNavigationList, complexUrlInput, {
  getDirectNavigationUrl: testDirectNavigationUrl,
  getUrlDisplay: search.getDefaultNavigationUrlDisplay
});
assert.strictEqual(
  complexPromoted.url,
  directComplexUrlSuggestion.url,
  'complex URL navigation promotion should choose the direct open-url suggestion over unrelated open tabs'
);
assert.deepStrictEqual(
  search.findSearchOpenTabMatchIndex([
    directComplexUrlSuggestion,
    unrelatedOpenTabSuggestion
  ], {
    rawQuery: complexUrlInput,
    primaryHighlightIndex: 0,
    openTabQuickSwitchEnabled: true,
    getDirectNavigationUrl: testDirectNavigationUrl
  }),
  { index: -1, reason: '' },
  'open-tab promotion should not override a direct URL primary with an unrelated open tab'
);
assert.deepStrictEqual(
  search.findSearchOpenTabMatchIndex([
    { ...directComplexUrlSuggestion, _xMatchedTabId: 99 },
    unrelatedOpenTabSuggestion
  ], {
    rawQuery: complexUrlInput,
    primaryHighlightIndex: 0,
    openTabQuickSwitchEnabled: true,
    getDirectNavigationUrl: testDirectNavigationUrl
  }),
  { index: 0, reason: 'openTab' },
  'open-tab promotion should still recognize an already-open exact URL navigation match'
);
assert.deepStrictEqual(
  search.findSearchOpenTabMatchIndex([
    { type: 'newtab', title: 'Search', url: 'https://search.example.com/?q=github' },
    unrelatedOpenTabSuggestion
  ], {
    rawQuery: 'github',
    primaryHighlightIndex: -1,
    openTabQuickSwitchEnabled: true,
    getDirectNavigationUrl: testDirectNavigationUrl
  }),
  { index: 1, reason: 'openTab' },
  'open-tab promotion should continue to work for non-URL queries'
);
assert.doesNotThrow(
  () => search.findSearchOpenTabMatchIndex([
    directComplexUrlSuggestion,
    unrelatedOpenTabSuggestion
  ], {
    rawQuery: complexUrlInput,
    primaryHighlightIndex: 0,
    openTabQuickSwitchEnabled: true,
    getDirectNavigationUrl: () => {
      throw new Error('resolver unavailable');
    }
  }),
  'open-tab promotion should not break overlay rendering when direct URL resolution fails'
);

const xRootSuggestion = search.createSearchSuggestion({
  title: '(1) نوف | Nouf (@Nouf0633) / X',
  url: 'https://x.com/'
}, 'history', 100);
assert.strictEqual(xRootSuggestion.title, 'X', 'configured site roots should use stable direct titles');

const xProfileSuggestion = search.createSearchSuggestion({
  title: '(1) نوف | Nouf (@Nouf0633) / X',
  url: 'https://x.com/Nouf0633'
}, 'history', 100);
assert.strictEqual(xProfileSuggestion.title, '(1) نوف | Nouf (@Nouf0633) / X', 'configured titles should not replace profile paths');

const xBookmarkSuggestion = search.createSearchSuggestion({
  title: 'My X bookmark',
  url: 'https://x.com/'
}, 'bookmark', 100);
assert.strictEqual(xBookmarkSuggestion.title, 'My X bookmark', 'bookmark titles should remain user controlled');

const dedupUrl = search.buildSearchDedupUrlKey('https://www.example.com/docs/?utm_source=x&ref=abc&keep=1#section');
assert.strictEqual(dedupUrl, 'https://example.com/docs?keep=1', 'dedupe URL should drop tracking params and hashes');

const geminiBase = search.normalizeSiteSearchProvider({
  key: 'gm',
  aliases: ['gemini'],
  name: 'Gemini',
  template: 'https://gemini.google.com/app',
  action: 'openAndSubmit',
  submitStrategy: 'geminiPrompt'
});
assert.ok(search.isAiSiteSearchProvider(geminiBase), 'openAndSubmit provider should be AI');
assert.ok(search.isInteractiveSiteSearchProvider(geminiBase), 'Gemini provider should be interactive');

const defaultSearchEngines = search.getDefaultSiteSearchProviders()
  .filter(search.isSearchEngineSiteSearchProvider);
assert.deepStrictEqual(
  defaultSearchEngines.map((provider) => provider.key),
  ['so', 'bi', 'gg', 'ddg', 'br', 'eco'],
  'built-in search engines should be explicitly classified and keep their intended order'
);
assert.strictEqual(
  search.isSearchEngineSiteSearchProvider({
    key: 'gg',
    category: 'site',
    _xIsCustom: true
  }),
  false,
  'a custom provider explicitly placed under site search should not inherit a built-in key category'
);
assert.strictEqual(
  search.normalizeSiteSearchProvider(
    { key: 'gg', category: 'site', template: 'https://example.com?q={query}' },
    { key: 'gg', category: 'searchEngine', template: 'https://google.com?q={query}' }
  ).category,
  'site',
  'an explicit custom site placement should survive normalization against a built-in engine'
);
assert.strictEqual(
  search.isSearchEngineSiteSearchProvider({
    key: 'custom-engine',
    category: 'searchEngine',
    _xIsCustom: true
  }),
  true,
  'a custom provider placed under search engines should be classified by its saved category'
);
assert.strictEqual(
  defaultSearchEngines.find((provider) => provider.key === 'ddg').template,
  'https://duckduckgo.com/?q={query}',
  'DuckDuckGo should use its official query URL'
);
assert.strictEqual(
  defaultSearchEngines.find((provider) => provider.key === 'br').template,
  'https://search.brave.com/search?q={query}',
  'Brave Search should use its public result URL'
);
assert.strictEqual(
  defaultSearchEngines.find((provider) => provider.key === 'eco').template,
  'https://www.ecosia.org/search?q={query}',
  'Ecosia should use its documented default-search URL'
);

const customizedGemini = search.normalizeSiteSearchProvider({
  key: 'gm',
  aliases: ['g'],
  name: 'Gemini Custom',
  template: 'https://gemini.google.com/app'
}, geminiBase);
assert.strictEqual(customizedGemini.action, 'openAndSubmit', 'customized provider should inherit action');
assert.strictEqual(customizedGemini.submitStrategy, 'geminiPrompt', 'customized provider should inherit submit strategy');

const merged = search.mergeCustomProviders([geminiBase], [customizedGemini]);
assert.strictEqual(merged.length, 1, 'custom provider should replace same-key built-in provider');
assert.strictEqual(merged[0].action, 'openAndSubmit');
assert.strictEqual(merged[0]._xIsCustom, true, 'merged custom providers should retain their custom identity');

assert.deepStrictEqual(
  search.getSiteSearchProviderDisplayNameMessage({ key: 'dbai' }),
  { messageKey: 'site_search_name_doubao', fallback: 'Doubao' },
  'AI provider display names should resolve from shared mapping'
);
assert.deepStrictEqual(
  search.getSiteSearchProviderDisplayNameMessage({ key: 'jd' }),
  { messageKey: 'site_search_name_juejin', fallback: 'Juejin' },
  'legacy juejin key should resolve from shared mapping'
);
assert.deepStrictEqual(
  search.getSiteSearchProviderDisplayNameMessage({ key: 'wx' }),
  { messageKey: 'site_search_name_wechat', fallback: 'WeChat Official Accounts' },
  'wechat provider display name should describe WeChat Official Accounts search'
);
assert.strictEqual(
  search.getSiteSearchProviderDisplayNameMessage({ key: 'unknown' }),
  null,
  'unknown provider display names should fall back to caller-owned name'
);
assert.strictEqual(
  search.getSiteSearchProviderDisplayNameMessage({
    key: 'db',
    name: 'Dribbble',
    _xIsCustom: true
  }),
  null,
  'custom providers should keep their user-defined names when a key matches a built-in provider'
);
const duplicateDbProvider = search.findSiteSearchProviderKeyConflict(
  'DB',
  [{ key: 'db', name: 'Douban' }],
  ''
);
assert.strictEqual(
  duplicateDbProvider && duplicateDbProvider.name,
  'Douban',
  'site-search trigger conflicts should be detected case-insensitively'
);
assert.strictEqual(
  search.findSiteSearchProviderKeyConflict(
    'db',
    [{ key: 'db', name: 'Douban' }],
    'db'
  ),
  null,
  'editing a provider should allow it to retain its current trigger'
);

const wechatProvider = search.getDefaultSiteSearchProviders().find((provider) => provider.key === 'wx');
assert.strictEqual(
  wechatProvider && wechatProvider.name,
  'WeChat Official Accounts',
  'default wechat provider name should describe WeChat Official Accounts search'
);
const taobaoProvider = search.getDefaultSiteSearchProviders().find((provider) => provider.key === 'tb');
const tmallProvider = search.getDefaultSiteSearchProviders().find((provider) => provider.key === 'tm');
const googleProvider = search.getDefaultSiteSearchProviders().find((provider) => provider.key === 'gg');
assert.strictEqual(
  googleProvider && googleProvider.iconUrl,
  'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
  'Google should use the stable high-resolution brand mark instead of a page favicon'
);
assert.strictEqual(
  taobaoProvider && taobaoProvider.iconUrl,
  'https://www.taobao.com/favicon.ico',
  'Taobao should use its real main-domain favicon instead of a generic proxy placeholder'
);
assert.strictEqual(
  tmallProvider && tmallProvider.iconUrl,
  'https://www.tmall.com/favicon.ico',
  'Tmall should use its real main-domain favicon instead of a generic proxy placeholder'
);
assert.strictEqual(
  search.findProviderForSiteSearchSuggestion(
    {
      type: 'history',
      title: '下载',
      url: 'https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html'
    },
    [wechatProvider]
  ),
  null,
  'site-search provider inference should not treat arbitrary Weixin developer URLs as WeChat Official Accounts search'
);

assert.strictEqual(
  search.buildSearchUrlFromTemplate('https://example.com/search?q={searchTerms}', 'hello world'),
  'https://example.com/search?q=hello%20world',
  'searchTerms templates should normalize to query templates'
);

const githubProvider = {
  key: 'gh',
  aliases: ['github'],
  name: 'GitHub',
  template: 'https://github.com/search?q={query}'
};
const defaultSiteSearchProviders = search.getDefaultSiteSearchProviders();
defaultSiteSearchProviders.forEach((provider) => {
  const triggers = [provider.key].concat(provider.aliases || []);
  triggers.forEach((trigger) => {
    assert.strictEqual(
      search.getSiteSearchTriggerCandidate(trigger, defaultSiteSearchProviders, null),
      provider,
      `the configured site-search trigger "${trigger}" should expose the matching Tab hint`
    );
  });
});
assert.strictEqual(
  search.findSiteSearchProvider('github', [githubProvider]),
  githubProvider,
  'provider aliases should match site-search triggers'
);
const namedProvider = {
  key: 'forge',
  aliases: [],
  name: 'Code Forge',
  template: 'https://code.example.com/search?q={query}'
};
assert.strictEqual(
  search.findSiteSearchProvider('  Code Forge  ', [namedProvider]),
  namedProvider,
  'a trimmed exact provider title should match a site-search trigger'
);
assert.strictEqual(
  search.getSiteSearchTriggerCandidate('Code Forge', [namedProvider], null),
  namedProvider,
  'an exact multi-word provider title should expose the site-search trigger'
);
assert.strictEqual(
  search.findSiteSearchProviderByInput('docs.github.com lumno', [githubProvider]),
  githubProvider,
  'provider input parsing should match subdomains to provider hosts'
);
assert.strictEqual(
  search.getSiteSearchTriggerCandidate('github.com', [githubProvider], null),
  githubProvider,
  'an exact provider domain should expose the site-search trigger without requiring a short key'
);
assert.strictEqual(
  search.getSiteSearchTriggerCandidate('git', [githubProvider], null),
  null,
  'a partial provider title should not trigger site search without a matching local site result'
);
assert.strictEqual(
  search.getSiteSearchTriggerCandidate('github lumno', [githubProvider], null),
  null,
  'a provider followed by query text should remain an inline search candidate instead of a bare trigger'
);
assert.deepStrictEqual(
  search.getInlineSiteSearchCandidate('gh lumno extension', [githubProvider]),
  { provider: githubProvider, query: 'lumno extension' },
  'inline site-search parsing should preserve the query after the provider trigger'
);
assert.ok(
  search.suggestionMatchesSiteSearchProvider(
    { type: 'topSite', title: 'GitHub Docs', url: 'https://docs.github.com/' },
    githubProvider
  ),
  'provider host matching should accept subdomain suggestions'
);
assert.strictEqual(
  search.findProviderForSiteSearchSuggestion(
    { type: 'history', title: 'GitHub Docs', url: 'https://docs.github.com/' },
    [githubProvider]
  ),
  githubProvider,
  'provider suggestion matching should work for eligible suggestion types'
);
assert.strictEqual(
  search.getSiteSearchTriggerCandidate(
    'gh',
    [githubProvider],
    { type: 'topSite', title: 'GitLab', url: 'https://gitlab.com/' },
    { matchesTopSitePrefix: () => true }
  ),
  null,
  'short provider triggers should not hijack a mismatched top-site prefix'
);

const titledProvider = {
  key: 'apps',
  aliases: [],
  name: 'Apps Library',
  template: 'https://downloads.example.com/search?q={query}'
};
assert.strictEqual(
  search.getSiteSearchTriggerCandidate(
    'macked',
    [titledProvider],
    { type: 'topSite', title: 'MacKed - Mac Apps Library', url: 'https://downloads.example.com/' }
  ),
  titledProvider,
  'site-search triggers should allow the matched provider host to use the site title as a keyword'
);
assert.strictEqual(
  search.getSiteSearchTriggerCandidate(
    'macked',
    [titledProvider],
    { type: 'topSite', title: 'MacKed - Search Results', url: 'https://downloads.example.com/search?q=macked' }
  ),
  null,
  'site-search title matching should ignore provider search-result URLs to avoid query-title overlap'
);

const shortcutRules = require('../assets/data/shortcut-rules.json').items;
assert.deepStrictEqual(
  search.findLocalSearchScope('  BOOKMARKS  ', shortcutRules),
  { sourceType: 'bookmark', trigger: 'bookmarks', key: 'bookmarks' },
  'bookmark scope should reuse the exact bundled English shortcut keyword'
);
assert.deepStrictEqual(
  search.findLocalSearchScope('历史', shortcutRules),
  { sourceType: 'history', trigger: '历史', key: '历史' },
  'history scope should reuse the exact bundled Chinese shortcut keyword'
);
assert.deepStrictEqual(
  search.findLocalSearchScope('常用', shortcutRules),
  { sourceType: 'topSite', trigger: '常用', key: '常用' },
  'frequent-site scope should expose a Chinese keyword'
);
assert.deepStrictEqual(
  search.findLocalSearchScope('top sites', shortcutRules),
  { sourceType: 'topSite', trigger: 'top sites', key: 'top sites' },
  'frequent-site scope should expose an English keyword'
);
assert.strictEqual(
  search.findLocalSearchScope('history today', shortcutRules),
  null,
  'local scopes should require an exact keyword so normal searches are not hijacked'
);

console.log('search utils tests passed');
