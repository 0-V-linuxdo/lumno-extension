const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const optionsJs = fs.readFileSync(path.join(repoRoot, 'src/options/options.js'), 'utf8');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const htmlFiles = [
  'src/newtab/newtab.html',
  'src/options/options.html',
  'src/onboarding/onboarding.html'
];

function assertMatches(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

const optionsResizeListeners = optionsJs.match(/window\.addEventListener\('resize'/g) || [];
assert.strictEqual(
  optionsResizeListeners.length,
  1,
  'options should use one coordinated resize listener'
);
assertMatches(
  optionsJs,
  /function scheduleOptionsViewportLayoutRefresh\(\) \{[\s\S]*?if \(optionsResizeFrame\)[\s\S]*?requestAnimationFrame/,
  'options resize work should be coalesced with requestAnimationFrame'
);
assertMatches(
  optionsJs,
  /function refreshAllTabsIndicators\(\) \{[\s\S]*?const measurements = \[[\s\S]*?measurements\.forEach\(applyTabsIndicatorMeasurement\)/,
  'options should finish indicator measurements before applying style writes'
);
assert.strictEqual(
  (optionsJs.match(/^\s*chrome\.storage\.onChanged\.addListener/gm) || []).length,
  1,
  'options storage listeners should register through the guarded helper'
);
assertMatches(
  optionsJs,
  /buttonRect\.left - containerRect\.left \+ \(Number\(container\.scrollLeft\) \|\| 0\)/,
  'indicator positioning should account for a horizontally scrolled tab strip'
);

assertMatches(
  newtabJs,
  /function scheduleRecentReloadIfVisible\(\) \{[\s\S]*?clearTimeout\(recentExternalChangeTimer\)[\s\S]*?setTimeout\([\s\S]*?NEWTAB_EXTERNAL_CHANGE_DEBOUNCE_MS/,
  'recent-site external changes should be debounced'
);
assertMatches(
  newtabJs,
  /function scheduleBookmarkReloadIfVisible\(\) \{[\s\S]*?clearTimeout\(bookmarkExternalChangeTimer\)[\s\S]*?setTimeout\([\s\S]*?NEWTAB_EXTERNAL_CHANGE_DEBOUNCE_MS/,
  'bookmark external changes should be debounced'
);
assert.ok(
  newtabJs.indexOf("let latestQuery = '';") < newtabJs.indexOf('bootstrapInitialThemeMode();'),
  'new tab query state should initialize before synchronous theme bootstrapping'
);
assertMatches(
  newtabJs,
  /function refreshFallbackIcons\(\) \{[\s\S]*?if \(faviconViewRuntime && typeof faviconViewRuntime\.refreshFallbackIcons === 'function'\)/,
  'new tab theme bootstrap should tolerate favicon runtime initialization still being pending'
);
assert.strictEqual(
  (newtabJs.match(/^\s*chrome\.storage\.onChanged\.addListener/gm) || []).length,
  1,
  'new tab storage listeners should register through the guarded helper'
);
assert.strictEqual(
  (newtabJs.match(/chrome\.runtime\.getURL\(/g) || []).length,
  1,
  'new tab extension resources should resolve through the guarded URL helper'
);
assertMatches(
  newtabJs,
  /function sendRuntimeMessage\(message, callback\) \{[\s\S]*?typeof chrome === 'undefined'[\s\S]*?try \{[\s\S]*?chrome\.runtime\.sendMessage\(message, callback\);[\s\S]*?catch/,
  'new tab runtime messages should use a guarded transport helper'
);
assertMatches(
  newtabJs,
  /function requestSuggestions\(query, options\) \{[\s\S]*?const localRequestSent = sendRuntimeMessage\(\{[\s\S]*?action: 'getSearchSuggestions'[\s\S]*?sendRuntimeMessage\(\{[\s\S]*?action: 'getSearchEngineSuggestions'[\s\S]*?if \(!localRequestSent\) \{[\s\S]*?renderSuggestions\(\[\], requestQuery\)/,
  'new tab suggestions should fall back locally when the extension runtime is unavailable'
);

htmlFiles.forEach((relativePath) => {
  const html = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  assertMatches(
    html,
    /<meta name="theme-color"/,
    `${relativePath} should define a theme color`
  );
  const images = html.match(/<img\b[^>]*>/g) || [];
  images.forEach((image) => {
    assert.ok(/\bwidth="[^"]+"/.test(image), `${relativePath} image should define width: ${image}`);
    assert.ok(/\bheight="[^"]+"/.test(image), `${relativePath} image should define height: ${image}`);
  });
});

const optionsHtml = fs.readFileSync(path.join(repoRoot, 'src/options/options.html'), 'utf8');
assertMatches(
  optionsHtml,
  /\._x_extension_toggle_2024_unique_ input:focus-visible\s*\{[\s\S]*?outline:/,
  'custom settings toggles should retain a visible keyboard focus indicator'
);
assertMatches(
  optionsHtml,
  /@media \(max-width: 720px\) \{[\s\S]*?#_x_extension_settings_tabs_2024_unique_ \{[\s\S]*?overflow-x: auto;[\s\S]*?\._x_extension_settings_tab_button_2024_unique_ \{[\s\S]*?white-space: nowrap;/,
  'narrow settings tabs should scroll horizontally instead of wrapping labels'
);
assertMatches(
  optionsJs,
  /document\.documentElement\.style\.colorScheme = resolvedTheme/,
  'options should synchronize native controls with the resolved theme'
);
assertMatches(
  newtabJs,
  /document\.documentElement\.style\.colorScheme = resolved/,
  'new tab should synchronize native controls with the resolved theme'
);

console.log('performance and style stability tests passed');
