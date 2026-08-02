const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const optionsHtml = fs.readFileSync(path.join(repoRoot, 'src/options/options.html'), 'utf8');
const optionsJs = fs.readFileSync(path.join(repoRoot, 'src/options/options.js'), 'utf8');

function getContentBlock(name) {
  const start = optionsHtml.indexOf(`data-content="${name}"`);
  assert.notStrictEqual(start, -1, `${name} settings content should exist`);
  const nextContent = optionsHtml.indexOf('class="_x_extension_settings_content_2024_unique_"', start + 1);
  const end = nextContent === -1 ? optionsHtml.length : nextContent;
  return optionsHtml.slice(start, end);
}

const generalContent = getContentBlock('general');
const accountContent = getContentBlock('account');
const labsContent = getContentBlock('labs');

const updateNoticeTitleIndex = generalContent.indexOf('data-i18n="settings_update_notice_title"');
const autoPipTitleIndex = generalContent.indexOf('data-i18n="settings_auto_pip_title"');
const searchResultsSectionIndex = generalContent.indexOf('data-i18n="settings_search_results_section_title"');
const accountSectionTitleIndex = accountContent.indexOf('data-i18n="cloud_account_section_title"');
const syncTitleIndex = accountContent.indexOf('data-i18n="settings_sync_title"');

assert.notStrictEqual(updateNoticeTitleIndex, -1, 'update notice switch should live in general settings');
assert.notStrictEqual(autoPipTitleIndex, -1, 'auto picture-in-picture should live in general settings');
assert.notStrictEqual(searchResultsSectionIndex, -1, 'general settings should include search results section');
assert.notStrictEqual(accountSectionTitleIndex, -1, 'account settings should include the account and sync heading');
assert.notStrictEqual(syncTitleIndex, -1, 'account settings should include Lumno configuration');
assert.ok(
  syncTitleIndex < accountSectionTitleIndex,
  'browser sync configuration should appear above the account sync method heading'
);
assert.doesNotMatch(
  generalContent,
  /data-i18n="settings_sync_title"/,
  'Lumno configuration should no longer appear in general settings'
);
assert.ok(
  updateNoticeTitleIndex < autoPipTitleIndex,
  'auto picture-in-picture should appear below the update notice switch'
);
assert.ok(
  autoPipTitleIndex < searchResultsSectionIndex,
  'auto picture-in-picture should stay in general settings before search results settings'
);
assert.doesNotMatch(
  labsContent,
  /data-i18n="settings_auto_pip_title"/,
  'auto picture-in-picture should no longer appear in Labs'
);

assert.match(
  optionsHtml,
  /id="_x_extension_update_notice_toggle_2026_unique_" type="checkbox" checked/,
  'update notice switch should default to checked in markup'
);
assert.match(
  optionsJs,
  /const updateNoticeToggle = document\.getElementById\('_x_extension_update_notice_toggle_2026_unique_'\);/,
  'options should cache the update notice toggle'
);
assert.match(
  optionsJs,
  /const UPDATE_NOTICE_ENABLED_STORAGE_KEY = '_x_extension_update_notice_enabled_2026_unique_';/,
  'options should define a storage key for the update notice toggle'
);
assert.match(
  optionsJs,
  /UPDATE_NOTICE_ENABLED_STORAGE_KEY,[\s\S]*AUTO_PIP_ENABLED_STORAGE_KEY,/,
  'update notice preference should be included in synced settings payloads'
);
assert.match(
  optionsJs,
  /updateNoticeToggle\.addEventListener\('change'[\s\S]*UPDATE_NOTICE_ENABLED_STORAGE_KEY/,
  'changing the update notice switch should persist the preference'
);

console.log('options auto PiP placement tests passed');
