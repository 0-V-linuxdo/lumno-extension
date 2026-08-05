const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const contentSource = fs.readFileSync('src/content/selection-quick-actions.js', 'utf8');
const iconSource = fs.readFileSync('src/shared/selection-action-icons.js', 'utf8');
const butterflySource = fs.readFileSync('src/shared/selection-butterfly.js', 'utf8');
const selectStyles = fs.readFileSync('src/shared/custom-select.css', 'utf8');
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const storageKey = '_x_extension_selection_quick_actions_enabled_2026_unique_';
const providerStorageKey = '_x_extension_selection_quick_actions_provider_2026_unique_';
const iconSetStorageKey = '_x_extension_selection_quick_actions_icon_set_2026_unique_';
const triggerStyleStorageKey = '_x_extension_selection_quick_actions_trigger_style_2026_unique_';

const selectionContentScript = manifest.content_scripts.find((entry) => (
  Array.isArray(entry.js) && entry.js.includes('src/content/selection-quick-actions.js')
));
assert(selectionContentScript, 'manifest should inject the selection quick actions content script');
assert.deepStrictEqual(
  selectionContentScript.js,
  ['src/shared/settings.js', 'src/shared/selection-butterfly.js', 'src/shared/selection-action-icons.js', 'src/shared/selection-intent.js', 'src/content/selection-quick-actions.js'],
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
assert(optionsSource.includes(triggerStyleStorageKey), 'options should persist the selection trigger style');
assert(
  /function handleSelectionQuickActionsTriggerStyleSelection\(value\)[\s\S]*?Promise\.all\(writes\)[\s\S]*?recoverInvalidatedOptionsContext\(error\)/.test(optionsSource),
  'the trigger style should only update visually after persistence and recover a stale options context'
);
assert(
  optionsHtml.includes('_x_extension_selection_quick_actions_provider_select_2026_unique_'),
  'Labs should render the preferred provider dropdown'
);
assert(
  optionsHtml.includes('_x_extension_selection_quick_actions_icon_set_tabs_wrap_2026_unique_') &&
    optionsHtml.includes('data-selection-quick-actions-icon-set="remix"') &&
    optionsHtml.includes('data-selection-quick-actions-icon-set="hugeicons"') &&
    !optionsHtml.includes('data-selection-quick-actions-icon-set="butterfly"'),
  'Labs should keep the action icon-set tabs limited to Remix/Hugeicons'
);
assert(
  optionsHtml.includes('_x_extension_selection_quick_actions_trigger_style_tabs_wrap_2026_unique_') &&
    optionsHtml.includes('data-selection-quick-actions-trigger-style="lumno"') &&
    optionsHtml.includes('data-selection-quick-actions-trigger-style="butterfly"'),
  'Labs should render a separate selection trigger style control'
);
assert(
  /_x_extension_theme_indicator_2024_unique_\[data-ready="false"\][\s\S]*?_x_extension_theme_option_2024_unique_\[data-active="true"\][\s\S]*?background:\s*var\(--inline-tab-active-bg\)/.test(optionsHtml),
  'segmented controls should preserve an active background before their indicator can be measured'
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
assert(
  /const SYNC_KEYS = \[[\s\S]*SELECTION_QUICK_ACTIONS_TRIGGER_STYLE_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'selection trigger style should participate in sync/export/import'
);
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

assert(contentSource.includes("document.addEventListener('copy', cancelSelectionGesture"));
assert(contentSource.includes("document.addEventListener('scroll', cancelSelectionGesture"));
assert(contentSource.includes("document.addEventListener('selectstart', handleSelectStart, true"));
assert(contentSource.includes('selectionChangeTimer'));
assert(contentSource.includes('function handlePointerCancel'));
assert(contentSource.includes("event.key === 'Escape'"));
assert(
  contentSource.includes("assets/images/lumno-selection-mark.png"),
  'the default floating selection affordance should use the supplied Lumno mark'
);
assert(
  contentSource.includes("const RUNTIME_REVISION = 'selection-butterfly-v6'"),
  'the selection runtime should expose the current butterfly revision for live diagnostics'
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
  'the low-distraction selection affordance should anchor inline with the selected text'
);
assert(
  contentSource.includes('const inlineRect = clientRects.length > 0') &&
    /inline:\s*\{[\s\S]*?right:\s*inlineRect\.right/.test(contentSource) &&
    contentSource.includes('const topOffset = Math.max(8, Math.min(16, bounds.height * 0.7))'),
  'selection positioning should use the final selected client rect'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\][\s\S]*?width:\s*36px[\s\S]*?min-height:\s*36px/.test(contentSource),
  'the low-distraction selection affordance should preserve the enlarged entry button'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\]\s*\{[\s\S]*?background:\s*rgba\(250,\s*250,\s*250,\s*0\.76\)[\s\S]*?backdrop-filter:\s*blur\(10px\)/.test(contentSource),
  'the floating selection mark should use a stable high-contrast acrylic backing'
);
assert(!contentSource.includes('mix-blend-mode: difference'),
  'the floating selection mark should not blur into page text through difference blending');
assert(
  /\.lumno-selection-surface\[data-icon-only="true"\] \.lumno-selection-main:hover[\s\S]*?backdrop-filter:\s*blur\(10px\)/.test(contentSource),
  'the hover state should use a translucent acrylic treatment'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\][\s\S]*?filter:\s*blur\(8px\)/.test(contentSource) &&
    /\.lumno-selection-surface\[data-icon-only="true"\] \.lumno-selection-main\s*\{[\s\S]*?transition:[\s\S]*?filter\s+240ms/.test(contentSource) &&
    /:host\(\[data-visible="true"\]\) \.lumno-selection-main\[data-icon-only="true"\][\s\S]*?filter:\s*blur\(0\)/.test(contentSource),
  'the floating selection mark should animate from blurred to sharp when it appears'
);
assert(contentSource.includes('let enabled = false;'), 'content runtime should start disabled');
assert(contentSource.includes('lumno-selection-action-icon'), 'content runtime should render inline action SVGs');
assert(contentSource.includes('ICON_SET_STORAGE_KEY'), 'content runtime should read the selected icon set');
assert(contentSource.includes('TRIGGER_STYLE_STORAGE_KEY'), 'content runtime should read the selected trigger style');
assert(iconSource.includes('remix: Object.freeze') && iconSource.includes('hugeicons: Object.freeze'),
  'the bundled action icon library should include both icon sets');
assert(
  butterflySource.includes('root.LumnoSelectionButterfly') &&
    butterflySource.includes("fill: '#79C3F2'") &&
    butterflySource.includes("duration: '2800ms'") &&
    butterflySource.includes("begin: '120ms'") &&
    butterflySource.includes('transformValues:'),
  'the standalone selection visual definition should include the tuned looping butterfly material'
);
assert(
  contentSource.includes('createButterflyStage') &&
    contentSource.includes('FALLBACK_BUTTERFLY') &&
    contentSource.includes('selectionButterfly') &&
    contentSource.includes('selectionMark') &&
    contentSource.includes('.lumno-selection-butterfly-wing-back') &&
    contentSource.includes('opacity: 0.22') &&
    contentSource.includes('filter: blur(0.1px)') &&
    contentSource.includes('.lumno-selection-butterfly-wing-front') &&
    contentSource.includes('opacity: 0.34'),
  'the compact selection entry should render the butterfly with the website material even if the shared module is unavailable'
);
assert(
  contentSource.includes('result[ENABLED_STORAGE_KEY] === true'),
  'content runtime should require an explicit enabled setting'
);
assert(
  contentSource.includes('triggerStyleStorageArea') &&
    contentSource.includes('resolveTriggerStyle(localTriggerStyle, providerTriggerStyle)') &&
    contentSource.includes("triggerStyleSource = hasLocalTriggerStyle") &&
    contentSource.includes("areaName === 'local'"),
  'the content runtime should use a local trigger-style mirror across provider modes'
);
assert(
  optionsSource.includes('writes.push(storageSet(triggerStyleStorageArea, payload))') &&
    optionsSource.includes('writes.push(storageSet(storageArea, payload))') &&
    optionsSource.includes('Promise.all(writes)'),
  'the options control should await entry-style persistence locally and in the active sync provider'
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
    'settings_selection_quick_actions_trigger_style_title',
    'selection_quick_actions_trigger_style_lumno',
    'selection_quick_actions_trigger_style_butterfly',
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
