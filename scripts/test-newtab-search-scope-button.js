const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');
const searchInputCss = fs.readFileSync('src/shared/search-input.css', 'utf8');

assert.match(
  newtabSource,
  /iconStyleOverrides:\s*\{[\s\S]*?'left': '7px'/,
  'the search action hit box should stay optically aligned with the original icon'
);
assert.match(
  newtabSource,
  /searchScopeIcon\.dataset\.searchScopeAction = 'true'[\s\S]*?setAttribute\('role', 'button'\)[\s\S]*?setAttribute\('tabindex', '0'\)[\s\S]*?setAttribute\('aria-label', searchScopeTooltipText\(\)\)/,
  'the search icon should expose an accessible action contract'
);
assert.match(
  newtabSource,
  /function activateSearchScopeIcon\(event\)[\s\S]*?resetModeMenuDoubleTab\(\)[\s\S]*?openSearchModeMenuFromDoubleTab\(\)/,
  'clicking the search icon should reuse the double-Tab scope-panel result and animation'
);
assert.match(
  newtabSource,
  /function openSearchModeMenuFromDoubleTab\(\)[\s\S]*?activateSiteSearch\(provider\);[\s\S]*?function activateSiteSearch\(provider, activationOptions\)[\s\S]*?animate: options\.animatePrefix !== false/,
  'icon, double-Tab, and keyword-Tab activation should share the normal tag entrance animation'
);
assert.match(
  newtabSource,
  /function openSearchModeMenuFromDoubleTab\(\) \{[\s\S]*?const expectedInputValue = String\(inputParts\.input\.value \|\| ''\);[\s\S]*?beginSearchModeResultTransition\(expectedInputValue\);[\s\S]*?activateSiteSearch\(provider, \{ preserveResults: true \}\);[\s\S]*?restoreSearchModeQuery\(expectedInputValue\);/,
  'the search action should open the scope panel without discarding an existing query or result list'
);
assert.match(
  newtabSource,
  /function isBundledInputModeProviderIcon\(iconUrl\) \{[\s\S]*?SHORTCUT_FAVICON\.SITE_SEARCH_PINNED_ICON_ASSETS[\s\S]*?Object\.values\(pinnedIconAssets\)\.some[\s\S]*?resolvedIconUrl\.href === bundledIconUrl\.href[\s\S]*?function attachInputModeFaviconData\(icon, iconUrl, iconHost\) \{[\s\S]*?isBundledInputModeProviderIcon\(resolvedIconUrl\)[\s\S]*?return;[\s\S]*?attachFaviconData\(icon, resolvedIconUrl, iconHost\);[\s\S]*?attachFaviconData: attachInputModeFaviconData/,
  'bundled New Tab provider icons should keep their layout slot instead of entering the async favicon placeholder pipeline'
);
const inputModeFaviconHelperStart = newtabSource.indexOf(
  'function isBundledInputModeProviderIcon(iconUrl)'
);
const inputModeFaviconHelperEnd = newtabSource.indexOf(
  '\n\n  function getSiteSearchProviders()',
  inputModeFaviconHelperStart
);
assert.ok(
  inputModeFaviconHelperStart >= 0 && inputModeFaviconHelperEnd > inputModeFaviconHelperStart,
  'the New Tab input-mode favicon helper should be extractable for its cold-load regression test'
);
const attachedInputModeFavicons = [];
const inputModeFaviconContext = {
  SHORTCUT_FAVICON: {
    SITE_SEARCH_PINNED_ICON_ASSETS: {
      gg: 'assets/images/site-search/google.svg'
    }
  },
  URL,
  window: {
    location: {
      href: 'chrome-extension://lumno/src/newtab/newtab.html'
    }
  },
  getExtensionResourceUrl(resourcePath) {
    return `chrome-extension://lumno/${resourcePath}`;
  },
  attachFaviconData(...args) {
    attachedInputModeFavicons.push(args);
  }
};
vm.runInNewContext(
  `${newtabSource.slice(inputModeFaviconHelperStart, inputModeFaviconHelperEnd)}\n` +
    'this.attachInputModeFaviconDataForTest = attachInputModeFaviconData;',
  inputModeFaviconContext
);
const providerIconElement = {};
inputModeFaviconContext.attachInputModeFaviconDataForTest(
  providerIconElement,
  'chrome-extension://lumno/assets/images/site-search/google.svg',
  'google.com'
);
assert.strictEqual(
  attachedInputModeFavicons.length,
  0,
  'a bundled Google icon should remain a direct image so its 16px slot never collapses'
);
inputModeFaviconContext.attachInputModeFaviconDataForTest(
  providerIconElement,
  'https://example.com/favicon.ico',
  'example.com'
);
assert.deepStrictEqual(
  attachedInputModeFavicons[0],
  [providerIconElement, 'https://example.com/favicon.ico', 'example.com'],
  'remote provider icons should retain the existing favicon-data fallback behavior'
);
assert.match(
  newtabSource,
  /searchScopeIcon\.addEventListener\('click', activateSearchScopeIcon\)[\s\S]*?event\.key !== 'Enter' && event\.key !== ' '[\s\S]*?activateSearchScopeIcon\(event\)/,
  'the search icon should support pointer and keyboard activation'
);
assert.match(
  newtabSource,
  /const activeElement = document\.activeElement;\s*if \(searchScopeIcon && activeElement === searchScopeIcon\) \{\s*return;/,
  'global type-to-search should leave Enter and Space available to the focused search action'
);
assert.match(
  newtabSource,
  /const searchInputCursorTooltipController = globalThis\.LumnoCursorTooltip[\s\S]*?id: '_x_extension_newtab_search_input_cursor_tooltip_2026_unique_'/,
  'new Tab search actions should own a cursor-following bubble controller'
);
assert.match(
  newtabSource,
  /bindSearchInputCursorTooltip\(searchScopeIcon, searchScopeTooltipText\)/,
  'the search icon should use the same cursor-following bubble as overlay'
);
assert.match(
  newtabSource,
  /const settingsTooltipText = \(\) => formatMessage\([\s\S]*?rightIcon\.setAttribute\('data-tooltip', settingsTooltipText\(\)\)[\s\S]*?bindSearchInputCursorTooltip\(rightIcon, settingsTooltipText\)/,
  'the settings icon should restore the same cursor-following bubble as overlay'
);
assert.match(
  newtabSource,
  /searchInputCursorTooltipController\.bind\(button, getText, \{[\s\S]*?deferHideVisibility: true,[\s\S]*?preserveVisibleOnTargetSwitch: true,[\s\S]*?handoffRoot: inputParts && inputParts\.container/,
  'new Tab input bubbles should hand off between search and settings without disappearing'
);
assert.match(
  searchInputCss,
  /\.x-lumno-search-input__icon\[data-search-scope-action="true"\]\s*\{[\s\S]*?width:\s*30px;[\s\S]*?height:\s*30px;[\s\S]*?cursor:\s*pointer;/,
  'the search action should match the settings action hit target'
);
assert.match(
  searchInputCss,
  /\.x-lumno-search-input__icon\[data-search-scope-action="true"\]\[data-hover-active="true"\]\s*\{[\s\S]*?var\(--x-ext-input-icon-hover-bg[\s\S]*?var\(--x-ext-input-icon-hover/,
  'the search action should reuse the settings hover tokens'
);
assert.match(
  searchInputCss,
  /\.x-lumno-search-input__icon\[data-search-scope-action="true"\]\[data-hover-active="true"\] \.ri-icon\s*\{\s*transform:\s*scale\(1\.06\);/,
  'the search action should match the settings icon hover scale'
);

console.log('New Tab search scope button tests passed');
