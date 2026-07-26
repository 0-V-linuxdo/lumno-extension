const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const optionsHtml = fs.readFileSync(path.join(repoRoot, 'src/options/options.html'), 'utf8');
const optionsJs = fs.readFileSync(path.join(repoRoot, 'src/options/options.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));

function getContentBlock(name) {
  const start = optionsHtml.indexOf(`data-content="${name}"`);
  assert.notStrictEqual(start, -1, `${name} settings content should exist`);
  const nextContent = optionsHtml.indexOf('class="_x_extension_settings_content_2024_unique_"', start + 1);
  const end = nextContent === -1 ? optionsHtml.length : nextContent;
  return optionsHtml.slice(start, end);
}

const generalContent = getContentBlock('general');
const shortcutRowIndex = generalContent.indexOf('id="_x_extension_shortcuts_status_2024_unique_"');
const referenceIndex = generalContent.indexOf('id="_x_extension_shortcut_reference_2026_unique_"');
const restrictedIndex = generalContent.indexOf('data-i18n="settings_restricted_title"');

assert.notStrictEqual(shortcutRowIndex, -1, 'general settings should keep the editable shortcut row');
assert.notStrictEqual(referenceIndex, -1, 'general settings should include a shortcut reference list');
assert.notStrictEqual(restrictedIndex, -1, 'general settings should include restricted shortcut behavior settings');
assert.ok(
  shortcutRowIndex < restrictedIndex && restrictedIndex < referenceIndex,
  'restricted behavior settings should sit directly below the primary shortcut row and above the shortcut reference list'
);
assert.match(
  generalContent,
  /_x_extension_shortcut_restricted_subrow_2026_unique_[\s\S]*data-i18n="settings_restricted_title"/,
  'restricted behavior row should be visually indented under the primary shortcut row'
);

assert.match(
  optionsHtml,
  /<script src="\.\.\/shared\/shortcut-reference\.js"><\/script>[\s\S]*src="\.\.\/shared\/react-page-bootstrap\.js"[\s\S]*data-page-entry="\.\.\/options\/options\.js"/,
  'options page should load shared shortcut definitions before the page bootstrap'
);
assert.match(
  generalContent,
  /_x_extension_shortcuts_section_title_row_2026_unique_[\s\S]*data-i18n="settings_shortcuts_section_title"[\s\S]*id="_x_extension_open_shortcuts_page_2026_unique_"[\s\S]*data-i18n="settings_shortcuts_action"/,
  'shortcut settings header should align the shortcut settings button with the section title'
);
assert.match(
  generalContent,
  /_x_extension_shortcuts_section_title_row_2026_unique_[\s\S]*_x_extension_shortcuts_section_copy_2026_unique_[\s\S]*data-i18n="settings_shortcuts_section_title"[\s\S]*_x_extension_shortcuts_section_desc_2026_unique_[\s\S]*id="_x_extension_open_shortcuts_page_2026_unique_/,
  'shortcut settings header should center the button against the title and hint copy stack'
);
assert.match(
  optionsHtml,
  /\._x_extension_shortcut_submit_2024_unique_\._x_extension_shortcuts_link_2026_unique_\s*\{[^}]*align-self:\s*center;/,
  'shortcut settings header button should keep center alignment after the base submit rule'
);
assert.match(
  generalContent,
  /data-i18n="settings_shortcuts_title"[\s\S]*data-i18n="settings_shortcuts_dia_tag"/,
  'Dia usage badge should sit beside the Open command bar shortcut title'
);
assert.match(
  optionsJs,
  /const shortcutReferenceList = document\.getElementById\('_x_extension_shortcut_reference_list_2026_unique_'\);/,
  'options should cache the shortcut reference list container'
);
assert.match(
  optionsJs,
  /function renderShortcutReferenceList\(\)[\s\S]*LumnoShortcutReference[\s\S]*chrome\.commands\.getAll/,
  'options should render shortcut rows from shared definitions and current browser commands'
);
assert.match(
  optionsJs,
  /function createShortcutReferenceGroupTitle\(\w+\)[\s\S]*_x_extension_shortcut_reference_group_title_2026_unique_/,
  'options should render subtle group titles inside the shortcut reference list'
);
assert.match(
  optionsJs,
  /item && item\.commandName === 'show-search'/,
  'options should not duplicate the primary command bar shortcut row'
);
assert.doesNotMatch(
  generalContent,
  /data-open-shortcuts="true"|shortcut_reference_edit_action/,
  'shortcut settings should only keep the header shortcut settings button'
);
assert.doesNotMatch(
  optionsJs,
  /createShortcutReferenceEditButton|data-open-shortcuts|shortcut_reference_edit_action/,
  'shortcut reference rows should not render inline edit buttons'
);

const shortcutReference = require('../src/shared/shortcut-reference.js');
const browserShortcuts = shortcutReference.getBrowserShortcutDefinitions();
const fixedShortcuts = shortcutReference.getFixedShortcutDefinitions();
const manifestCommands = Object.keys(manifest.commands || {}).sort();

assert.deepStrictEqual(
  browserShortcuts.map((item) => item.commandName).sort(),
  manifestCommands,
  'editable browser shortcut list should cover every manifest command'
);
assert.ok(
  fixedShortcuts.length >= 8,
  'fixed shortcut list should cover Lumno search, tab switcher, and clipping interactions'
);
assert.ok(
  fixedShortcuts.some((item) => item.id === 'tab-switcher-cycle' && /Q/.test(item.shortcut)),
  'fixed shortcut list should include tab switcher Q cycling'
);
assert.ok(
  fixedShortcuts.some((item) => item.id === 'document-pip-picker-parent' && /\[/.test(item.shortcut)),
  'fixed shortcut list should include document clipping element selection'
);
assert.ok(
  !fixedShortcuts.some((item) => [
    'tab-switcher-close',
    'document-pip-picker-confirm',
    'document-pip-picker-cancel'
  ].includes(item.id)),
  'fixed shortcut list should omit secondary close/confirm/cancel rows requested for removal'
);
const referenceGroups = shortcutReference.getShortcutReferenceGroups({ platform: 'mac' });
assert.deepStrictEqual(
  referenceGroups.map((group) => group.id),
  ['search', 'page-link', 'tab-switcher', 'web-clip'],
  'shortcut reference should render as four subtle clustered groups'
);
assert.deepStrictEqual(
  referenceGroups.map((group) => group.items.map((item) => item.id).filter((id) => id !== 'show-search')),
  [
    [
      'search-navigate',
      'search-confirm',
      'search-tab-mode',
      'search-close',
      'search-current-tab',
      'search-switch-new-tab'
    ],
    [
      'show-search-prefill',
      'show-search-prefill-v'
    ],
    [
      'show-tab-switcher',
      'tab-switcher-cycle',
      'tab-switcher-confirm'
    ],
    [
      'document-pip-picker-parent',
      'document-pip-picker-child'
    ]
  ],
  'shortcut rows should be clustered by command bar actions, page-link actions, tab switcher actions, then web clipping actions'
);

const requiredMessageKeys = [
  'shortcut_reference_title',
  'shortcut_reference_unset'
];
browserShortcuts.concat(fixedShortcuts).forEach((item) => {
  requiredMessageKeys.push(item.titleKey, item.descKey);
});
referenceGroups.forEach((group) => {
  requiredMessageKeys.push(group.titleKey);
});

['en', 'ja', 'zh_CN', 'zh_TW'].forEach((locale) => {
  const messages = JSON.parse(fs.readFileSync(path.join(repoRoot, '_locales', locale, 'messages.json'), 'utf8'));
  requiredMessageKeys.forEach((key) => {
    assert.ok(messages[key] && String(messages[key].message || '').trim(), `${locale} should define ${key}`);
  });
  assert.doesNotMatch(
    messages.settings_shortcuts_browser_desc_prefix.message,
    /Chromium|Dia|Edge|内核|核心/,
    `${locale} shortcut hint prefix should not include browser examples`
  );
});
const zhCnMessages = JSON.parse(fs.readFileSync(path.join(repoRoot, '_locales', 'zh_CN', 'messages.json'), 'utf8'));
assert.strictEqual(
  zhCnMessages.settings_restricted_title.message,
  '在受限页行为',
  'Simplified Chinese restricted behavior title should match the requested copy'
);
assert.strictEqual(
  zhCnMessages.restricted_action_default.message,
  '前往 Lumno 新标签页',
  'Simplified Chinese restricted default action should make Lumno newtab explicit'
);
assert.strictEqual(
  zhCnMessages.restricted_action_none.message,
  '遵循浏览器设置',
  'Simplified Chinese restricted none action should describe browser newtab fallback behavior'
);
assert.match(
  generalContent,
  /data-restricted-action="none"[\s\S]*data-i18n="restricted_action_none"/,
  'browser-setting restricted action should keep the localized label'
);
assert.doesNotMatch(
  generalContent,
  /restricted_action_browser_setting_tooltip|data-restricted-action="none"[\s\S]*ri-information-line/,
  'browser-setting restricted action should not keep the superseded tooltip copy'
);
assert.match(
  optionsJs,
  /const RESTRICTED_ACTION_AUTO_BROWSER_SETTING_DONE_STORAGE_KEY = '_x_extension_restricted_action_auto_browser_setting_done_2026_unique_';/,
  'options should know the one-shot automatic restricted-action marker'
);
assert.match(
  optionsJs,
  /function createRestrictedActionStorageUpdate\(action\)[\s\S]*RESTRICTED_ACTION_STORAGE_KEY[\s\S]*RESTRICTED_ACTION_AUTO_BROWSER_SETTING_DONE_STORAGE_KEY/,
  'manual restricted-action changes should mark automatic selection as already handled'
);
assert.match(
  optionsJs,
  /restrictedActionSelect\.addEventListener\('change'[\s\S]*storageArea\.set\(createRestrictedActionStorageUpdate\(next\)\)/,
  'select-based restricted-action changes should set the one-shot marker'
);
assert.match(
  optionsJs,
  /button\.addEventListener\('click'[\s\S]*storageArea\.set\(createRestrictedActionStorageUpdate\(nextAction\)\)/,
  'tab-button restricted-action changes should set the one-shot marker'
);

console.log('options shortcut reference tests passed');
