const assert = require('assert');
const fs = require('fs');
const settings = require('../src/shared/settings.js');

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const optionsHtml = read('src/options/options.html');
const optionsSource = read('src/options/options.js');
const newtabSource = read('src/newtab/newtab.js');
const overlaySource = read('src/overlay/search-panel.js');
const overlayRuntimeSource = read('src/overlay/runtime.js');

const sourcesIndex = optionsHtml.indexOf('data-i18n="settings_search_result_sources_title"');
const displayLimitIndex = optionsHtml.indexOf('data-i18n="settings_search_result_display_limit_title"');
const openTabsIndex = optionsHtml.indexOf('data-i18n="settings_overlay_open_tabs_default_visible_title"');
assert(sourcesIndex >= 0 && displayLimitIndex > sourcesIndex && openTabsIndex > displayLimitIndex,
  'result display limit should sit between result types and default open tabs');

assert.match(optionsSource,
  /kind: 'search-result-display-limit'[\s\S]*?min: 5,[\s\S]*?max: 10,[\s\S]*?step: 1,/,
  'Options should reuse the range-slider controller with a 5-10 integer range');
assert.match(optionsSource,
  /ticks: \[\s*\{ align: 'start', label: '5' \},\s*\{ align: 'end', label: '10' \}\s*\]/,
  'the minimum and maximum tick labels should align to the two slider endpoints');
assert.match(optionsHtml,
  /#_x_extension_bookmark_rows_control_2026_unique_,[\s\S]*?#_x_extension_search_result_display_limit_control_2026_unique_ \{[\s\S]*?width: 210px;/,
  'the result limit should reuse the existing slider width pattern');

assert.strictEqual(
  settings.SEARCH_RESULT_DISPLAY_LIMIT_STORAGE_KEY,
  '_x_extension_search_result_display_limit_2026_unique_'
);
assert(settings.CHROME_SYNC_STORAGE_KEYS.includes(settings.SEARCH_RESULT_DISPLAY_LIMIT_STORAGE_KEY));
assert.match(overlayRuntimeSource,
  /searchResultDisplayLimit: '_x_extension_search_result_display_limit_2026_unique_'/,
  'overlay runtime should expose the synced display-limit key');

[newtabSource, overlaySource].forEach((source) => {
  assert.match(source,
    /limitSearchSuggestionsForDisplay\(list, \{\s*limit: (?:searchResultDisplayLimit|overlaySearchResultDisplayLimit)\s*\}\)/,
    'each search surface should pass the configurable limit to shared display limiting');
  assert.match(source,
    /uncapped: slashCommandModeActive/,
    'slash-command discovery should stay uncapped');
});
assert.match(newtabSource,
  /changes\[SEARCH_RESULT_DISPLAY_LIMIT_STORAGE_KEY\][\s\S]*?renderSuggestions\(lastSuggestionResponse, latestQuery\)/,
  'New Tab should re-render current results when the limit changes');
assert.match(overlaySource,
  /changes\[SEARCH_RESULT_DISPLAY_LIMIT_STORAGE_KEY\][\s\S]*?refreshOverlaySuggestionsFromLastResponse\(\)/,
  'overlay should re-render current results when the limit changes');
assert.match(overlaySource,
  /function limitOverlayTabsForDisplay\(list\)[\s\S]*?slice\(0, normalizeSearchResultDisplayLimit\(overlaySearchResultDisplayLimit\)\)/,
  'overlay should apply the configured result limit to opened-tab results');
assert.match(overlaySource,
  /changes\[SEARCH_RESULT_DISPLAY_LIMIT_STORAGE_KEY\][\s\S]*?openTabsSearchModeActive[\s\S]*?shouldShowOpenTabsForEmptyQuery\(\)[\s\S]*?renderTabSuggestions\(filterTabsForOverlay\(tabs, latestOverlayQuery\)\)/,
  'overlay should immediately re-render visible opened tabs when the limit changes');
assert.match(overlaySource,
  /function renderTabSuggestions\(tabList\)[\s\S]*?const list = limitOverlayTabsForDisplay\(tabList\);/,
  'both default and searched opened-tab lists should use the configured result limit');
assert.match(overlaySource,
  /function filterTabsForOverlay\(tabList, queryText\) \{\s*const list = Array\.isArray\(tabList\) \? tabList : \[\];/,
  'opened-tab matching should search the complete tab list before display limiting');

['en', 'ja', 'zh_CN', 'zh_TW'].forEach((locale) => {
  const messages = JSON.parse(read(`_locales/${locale}/messages.json`));
  assert(messages.settings_search_result_display_limit_title?.message,
    `${locale} should localize the result display limit label`);
});

console.log('search result display limit setting tests passed');
