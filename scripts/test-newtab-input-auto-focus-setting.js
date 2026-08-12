const assert = require('assert');
const fs = require('fs');
const settings = require('../src/shared/settings.js');

const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');

const topContentIndex = optionsHtml.indexOf('data-i18n="settings_newtab_wordmark_title"');
const inputAutoFocusIndex = optionsHtml.indexOf('data-i18n="newtab_input_auto_focus_title"', topContentIndex);
const shortcutsIndex = optionsHtml.indexOf('data-i18n="settings_newtab_shortcuts_title"', inputAutoFocusIndex);

assert(topContentIndex >= 0, 'options should keep the New Tab top-content setting');
assert(
  inputAutoFocusIndex > topContentIndex && inputAutoFocusIndex < shortcutsIndex,
  'input auto-focus should appear directly below the search-box top-content setting'
);
assert.match(
  optionsHtml,
  /id="_x_extension_newtab_input_auto_focus_toggle_2026_unique_" type="checkbox" aria-label="输入框自动聚焦" data-i18n-aria-label="newtab_input_auto_focus_title"/,
  'options should expose an accessible input auto-focus switch that defaults to off'
);

assert.strictEqual(
  settings.NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY,
  '_x_extension_newtab_input_auto_focus_enabled_2026_unique_'
);
assert(settings.CHROME_SYNC_STORAGE_KEYS.includes(settings.NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY));
assert.match(
  optionsSource,
  /const newtabInputAutoFocusToggle = document\.getElementById\('_x_extension_newtab_input_auto_focus_toggle_2026_unique_'\);/,
  'options should cache the duplicated toggle'
);
assert.match(
  optionsSource,
  /\[newtabInputAutoFocusToggle, 'newtab-input-auto-focus'\]/,
  'options should render the switch through the shared toggle controller'
);
assert.match(
  optionsSource,
  /newtabInputAutoFocusToggle\.addEventListener\('change'[\s\S]*?storageArea\.set\(\{ \[NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY\]: next \}\)/,
  'changing the options switch should persist the shared New Tab preference'
);
assert.match(
  optionsSource,
  /storageArea\.get\(\[NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY\][\s\S]*?setOptionsToggleState\(newtabInputAutoFocusToggle, stored\)/,
  'options should restore the shared New Tab preference'
);
assert.match(
  optionsSource,
  /changes\[NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY\][\s\S]*?setOptionsToggleState\(newtabInputAutoFocusToggle, next\)/,
  'options should react when the appearance-panel copy changes the shared preference'
);
assert.match(
  newtabSource,
  /NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY = SETTINGS\.NEWTAB_INPUT_AUTO_FOCUS_ENABLED_STORAGE_KEY/,
  'New Tab should continue to read the same shared preference key'
);

console.log('newtab input auto-focus setting tests passed');
