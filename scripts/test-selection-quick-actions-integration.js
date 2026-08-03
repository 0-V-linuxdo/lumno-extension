const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const contentSource = fs.readFileSync('src/content/selection-quick-actions.js', 'utf8');
const iconSource = fs.readFileSync('src/shared/selection-action-icons.js', 'utf8');
const cloudSchemaSource = fs.readFileSync('src/shared/cloud-sync-schema.js', 'utf8');
const selectStyles = fs.readFileSync('src/shared/custom-select.css', 'utf8');
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const storageKey = '_x_extension_selection_quick_actions_enabled_2026_unique_';
const providerStorageKey = '_x_extension_selection_quick_actions_provider_2026_unique_';
const iconSetStorageKey = '_x_extension_selection_quick_actions_icon_set_2026_unique_';

const selectionContentScript = manifest.content_scripts.find((entry) => (
  Array.isArray(entry.js) && entry.js.includes('src/content/selection-quick-actions.js')
));
assert(selectionContentScript, 'manifest should inject the selection quick actions content script');
assert.deepStrictEqual(
  selectionContentScript.js,
  ['src/shared/settings.js', 'src/shared/selection-action-icons.js', 'src/shared/selection-intent.js', 'src/content/selection-quick-actions.js'],
  'provider-aware settings and the selection classifier should load before the content interaction runtime'
);
assert.strictEqual(selectionContentScript.run_at, 'document_idle');

const optionsToggleTag = optionsHtml.match(
  /<input\b[^>]*id="_x_extension_selection_quick_actions_toggle_2026_unique_"[^>]*>/
);
assert(optionsToggleTag, 'Labs should render the selection quick actions toggle');
assert.doesNotMatch(
  optionsToggleTag[0],
  /\bchecked\b/,
  'Labs should show the selection quick actions toggle as disabled by default'
);
assert(optionsSource.includes(storageKey), 'options should persist the selection setting');
assert(optionsSource.includes(providerStorageKey), 'options should persist the preferred selection provider');
assert(optionsSource.includes(iconSetStorageKey), 'options should persist the selection icon set');
assert(
  optionsHtml.includes('_x_extension_selection_quick_actions_provider_select_2026_unique_'),
  'Labs should render the preferred provider dropdown'
);
assert(
  optionsHtml.includes('_x_extension_selection_quick_actions_icon_set_tabs_wrap_2026_unique_') &&
    optionsHtml.includes('data-selection-quick-actions-icon-set="remix"') &&
    optionsHtml.includes('data-selection-quick-actions-icon-set="hugeicons"'),
  'Labs should render the Remix/Hugeicons icon-set tabs'
);
assert.strictEqual(
  (optionsHtml.match(/data-icon-path="assets\/images\/site-search\/tile-[^"]+"/g) || []).length >= 8,
  true,
  'the provider dropdown should pair each provider with a bundled icon'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*SELECTION_QUICK_ACTIONS_ENABLED_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'selection setting should participate in sync/export/import'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*SELECTION_QUICK_ACTIONS_PROVIDER_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'selection provider should participate in sync/export/import'
);
assert(
  /const SYNC_KEYS = \[[\s\S]*SELECTION_QUICK_ACTIONS_ICON_SET_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'selection icon set should participate in sync/export/import'
);
assert(cloudSchemaSource.includes(storageKey), 'cloud settings schema should include the selection setting');
assert(cloudSchemaSource.includes(providerStorageKey), 'cloud settings schema should include the selection provider');
assert(cloudSchemaSource.includes(iconSetStorageKey), 'cloud settings schema should include the selection icon set');

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
assert(
  contentSource.includes("assets/images/lumno-selection-mark.png"),
  'the default floating selection affordance should use the supplied Lumno mark'
);
assert(
  /\.lumno-selection-surface\[data-icon-only="true"\][\s\S]*?border:\s*0[;\s\S]*?box-shadow:\s*none/.test(contentSource),
  'the default floating selection affordance should not have a border or shadow'
);
assert(
  /\.lumno-selection-surface\[data-icon-only="true"\][\s\S]*?\.lumno-selection-main:hover[\s\S]*?background:/.test(contentSource),
  'the default floating selection affordance should reveal its background on hover'
);
assert(
  contentSource.includes('positionSurface(candidate.rect, mode === \'medium\' ? \'inline\' : \'panel\')'),
  'the low-distraction selection affordance should anchor inline with the end of the selection'
);
assert(
  contentSource.includes('const inlineRect = clientRects.length > 0'),
  'selection positioning should use the final client rect for multi-line selections'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\][\s\S]*?width:\s*22px[\s\S]*?min-height:\s*22px/.test(contentSource),
  'the low-distraction selection affordance should be compact enough to read as a footnote marker'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\] \.lumno-selection-logo[\s\S]*?filter:\s*brightness\(0\) invert\(1\)[\s\S]*?mix-blend-mode:\s*difference/.test(contentSource),
  'the floating selection mark should adapt its contrast to the page behind it'
);
assert(
  /\.lumno-selection-surface\[data-icon-only="true"\] \.lumno-selection-main:hover[\s\S]*?backdrop-filter:\s*blur\(10px\)/.test(contentSource),
  'the hover state should use a translucent acrylic treatment'
);
assert(contentSource.includes('let enabled = false;'), 'content runtime should start disabled');
assert(contentSource.includes('lumno-selection-action-icon'), 'content runtime should render inline action SVGs');
assert(contentSource.includes('ICON_SET_STORAGE_KEY'), 'content runtime should read the selected icon set');
assert(iconSource.includes('remix: Object.freeze') && iconSource.includes('hugeicons: Object.freeze'),
  'the bundled action icon library should include both icon sets');
assert(
  contentSource.includes('result[ENABLED_STORAGE_KEY] === true'),
  'content runtime should require an explicit enabled setting'
);
assert(
  backgroundSource.includes('result[SELECTION_QUICK_ACTIONS_ENABLED_STORAGE_KEY] === true'),
  'background actions should require an explicit enabled setting'
);
assert(
  /selectSelectionQuickActionProvider\(providers, preferredProviderKey\)/.test(backgroundSource),
  'background actions should honor the stored preferred provider'
);
assert(
  /\._x_extension_select_trigger_2024_unique_\s*\{[\s\S]*?gap:\s*8px/.test(selectStyles),
  'the selected provider icon and label should use the same 8px gap as menu options'
);

localeNames.forEach((locale) => {
  const messages = JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'));
  [
    'settings_selection_quick_actions_title',
    'settings_selection_quick_actions_desc',
    'settings_selection_quick_actions_provider_title',
    'settings_selection_quick_actions_icon_set_title',
    'selection_quick_actions_icon_set_remix',
    'selection_quick_actions_icon_set_hugeicons',
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
