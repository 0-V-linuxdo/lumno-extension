const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const readSource = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const newtabSource = readSource('src/newtab/newtab.js');
const overlaySource = readSource('src/overlay/search-panel.js');
const backgroundSource = readSource('src/background/background.js');
const inputModeSource = readSource('src/shared/search-input-mode.js');

[newtabSource, overlaySource].forEach((source, index) => {
  const surface = index === 0 ? 'newtab' : 'overlay';
  assert.match(
    source,
    /localSearchScopeTriggerState[\s\S]*?activateLocalSearchScope/,
    `${surface} should expose local-scope activation through its Tab trigger state`
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
  newtabSource,
  /localSearchQueryModeActive[\s\S]*?t\('overlay_empty_result', '无匹配结果'\)[\s\S]*?suggestionsView\.render\(\{[\s\S]*?emptyMessage/,
  'newtab local search should pass a visible empty message to the suggestions view'
);
assert.match(
  overlaySource,
  /else if \(localSearchQueryModeActive && allSuggestions\.length === 0\) \{\s*renderOverlayEmptyState\(t\('overlay_empty_result', '无匹配结果'\)\);/,
  'overlay local search should render its existing empty-state row'
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
