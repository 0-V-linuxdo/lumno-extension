const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const contentSource = fs.readFileSync('src/content/selection-quick-actions.js', 'utf8');
const cloudSchemaSource = fs.readFileSync('src/shared/cloud-sync-schema.js', 'utf8');
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const storageKey = '_x_extension_selection_quick_actions_enabled_2026_unique_';

const selectionContentScript = manifest.content_scripts.find((entry) => (
  Array.isArray(entry.js) && entry.js.includes('src/content/selection-quick-actions.js')
));
assert(selectionContentScript, 'manifest should inject the selection quick actions content script');
assert.deepStrictEqual(
  selectionContentScript.js,
  ['src/shared/selection-intent.js', 'src/content/selection-quick-actions.js'],
  'selection classifier should load before the content interaction runtime'
);
assert.strictEqual(selectionContentScript.run_at, 'document_idle');

assert.match(
  optionsHtml,
  /id="_x_extension_selection_quick_actions_toggle_2026_unique_"[^>]*type="checkbox"[^>]*checked/,
  'Labs should show the selection quick actions toggle as enabled by default'
);
assert(optionsSource.includes(storageKey), 'options should persist the selection setting');
assert(
  /const SYNC_KEYS = \[[\s\S]*SELECTION_QUICK_ACTIONS_ENABLED_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'selection setting should participate in sync/export/import'
);
assert(cloudSchemaSource.includes(storageKey), 'cloud settings schema should include the selection setting');

assert(
  /selectionQuickActions:[\s\S]*runSelectionQuickAction[\s\S]*handleSelectionQuickActionMessage/.test(backgroundSource),
  'background message routing should isolate the selection quick action feature'
);
assert(
  /SELECTION_TARGET\.openSelectionTarget\([\s\S]*groupTitle:\s*'Lumno AI'[\s\S]*groupColor:\s*'blue'/.test(backgroundSource),
  'selection targets should use the dedicated Lumno AI group fallback'
);
assert(
  /active:\s*false/.test(fs.readFileSync('src/background/selection-target.js', 'utf8')),
  'selection target tabs should open in the background'
);

assert(contentSource.includes("document.addEventListener('copy', hideSurface"));
assert(contentSource.includes("document.addEventListener('scroll', hideSurface"));
assert(contentSource.includes("event.key === 'Escape'"));

localeNames.forEach((locale) => {
  const messages = JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'));
  [
    'settings_selection_quick_actions_title',
    'settings_selection_quick_actions_desc',
    'selection_quick_action_ask',
    'selection_quick_action_translate',
    'selection_quick_action_explain',
    'selection_quick_action_summarize',
    'selection_quick_action_search',
    'selection_quick_action_calculate'
  ].forEach((key) => {
    assert(messages[key] && String(messages[key].message || '').trim(), `${locale} should localize ${key}`);
  });
});

console.log('selection quick actions integration tests passed');
