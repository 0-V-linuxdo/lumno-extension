const assert = require('assert');
const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const backgroundSource = fs.readFileSync('src/background/background.js', 'utf8');
const contentSource = fs.readFileSync('src/content/selection-quick-actions.js', 'utf8');
const intentSource = fs.readFileSync('src/shared/selection-intent.js', 'utf8');
const iconSource = fs.readFileSync('src/shared/selection-action-icons.js', 'utf8');
const settingsSource = fs.readFileSync('src/shared/settings.js', 'utf8');
const selectStyles = fs.readFileSync('src/shared/custom-select.css', 'utf8');
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const storageKey = '_x_extension_selection_quick_actions_enabled_2026_unique_';
const providerStorageKey = '_x_extension_selection_quick_actions_provider_2026_unique_';
const groupEnabledStorageKey = '_x_extension_selection_quick_actions_group_enabled_2026_unique_';
const iconSetStorageKey = '_x_extension_selection_quick_actions_icon_set_2026_unique_';
const triggerStyleStorageKey = '_x_extension_selection_quick_actions_trigger_style_2026_unique_';

const selectionContentScript = manifest.content_scripts.find((entry) => (
  Array.isArray(entry.js) && entry.js.includes('src/content/selection-quick-actions.js')
));
assert(selectionContentScript, 'manifest should inject the selection quick actions content script');
assert.deepStrictEqual(
  selectionContentScript.js,
  ['src/shared/settings.js', 'src/shared/selection-action-icons.js', 'src/shared/selection-intent.js', 'src/content/selection-quick-actions.js'],
  'provider-aware settings and the selection classifier should load before the content interaction runtime'
);
assert.strictEqual(
  fs.existsSync('src/shared/selection-butterfly.js'),
  false,
  'the removed butterfly option should not leave a bundled runtime behind'
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
assert(optionsSource.includes(groupEnabledStorageKey), 'options should persist the optional selection group setting');
assert(!optionsSource.includes(iconSetStorageKey), 'options should not persist a fixed toolbar icon library');
assert(!optionsSource.includes(triggerStyleStorageKey), 'options should not persist a removed trigger-style choice');
assert(
  optionsHtml.includes('_x_extension_selection_quick_actions_provider_select_2026_unique_'),
  'Labs should render the preferred provider dropdown'
);
const groupToggleTag = optionsHtml.match(
  /<input\b[^>]*id="_x_extension_selection_quick_actions_group_toggle_2026_unique_"[^>]*>/
);
assert(groupToggleTag, 'Labs should render the optional selection group toggle');
assert.doesNotMatch(groupToggleTag[0], /\bchecked\b/, 'selection grouping should be off by default');
assert(!optionsHtml.includes('selection_quick_actions_icon_set'),
  'Labs should not show an icon-library setting when the toolbar always uses Remix');
assert(!optionsHtml.includes('selection_quick_actions_trigger_style'),
  'Labs should not ask users to choose between selection-entry visuals');
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
  /const SYNC_KEYS = \[[\s\S]*SELECTION_QUICK_ACTIONS_GROUP_ENABLED_STORAGE_KEY[\s\S]*\];/.test(optionsSource),
  'selection grouping should participate in sync/export/import'
);
assert(!settingsSource.includes(iconSetStorageKey),
  'browser sync should not retain the removed toolbar icon-library field');
assert(!settingsSource.includes(triggerStyleStorageKey),
  'browser sync should not retain the removed trigger-style field');
assert(
  /selectionQuickActions:[\s\S]*runSelectionQuickAction[\s\S]*handleSelectionQuickActionMessage/.test(backgroundSource),
  'background message routing should isolate the selection quick action feature'
);
assert(
  /Promise\.all\(\[[\s\S]*loadSelectionQuickActionsGroupEnabled\(\)[\s\S]*\]\)/.test(backgroundSource) &&
    /SELECTION_TARGET\.openSelectionTarget\([\s\S]*groupEnabled[\s\S]*groupTitle:\s*SELECTION_TARGET\.DEFAULT_GROUP_TITLE[\s\S]*groupColor:\s*'blue'/.test(backgroundSource),
  'selection targets should only use the optional AI 查询 group when the setting is enabled'
);
assert(
  /active:\s*true/.test(fs.readFileSync('src/background/selection-target.js', 'utf8')),
  'default selection target tabs should activate immediately'
);

assert(contentSource.includes("document.addEventListener('copy', cancelSelectionGesture"));
assert(contentSource.includes("document.addEventListener('scroll', cancelSelectionGesture"));
assert(contentSource.includes("document.addEventListener('selectstart', handleSelectStart, true"));
assert(contentSource.includes('selectionChangeTimer'));
assert(contentSource.includes('function handlePointerCancel'));
assert(contentSource.includes("event.key === 'Escape'"));
assert(contentSource.includes("sourceKind: 'text-control'"),
  'ordinary text controls should produce immutable selection snapshots');
assert(contentSource.includes('element.selectionStart'));
assert(contentSource.includes('element.selectionEnd'));
assert(contentSource.includes('function getUnifiedSelectionSnapshot'));
assert(contentSource.includes('function buildCandidateFromSnapshot(snapshot)'));
assert(!/suppressed[\s\S]*settings\.editable\s*===\s*true/.test(intentSource),
  'editable context alone should not suppress a meaningful selection');
assert(contentSource.includes('input[type="password"]'));
assert(contentSource.includes('[autocomplete^="cc-"]'));
assert(
  contentSource.includes("assets/images/lumno-selection-mark.png"),
  'the default floating selection affordance should use the supplied Lumno mark'
);
assert(
  contentSource.includes("const RUNTIME_REVISION = 'selection-toolbar-v13'") &&
    contentSource.includes('const RUNTIME_VERSION = 13'),
  'the selection runtime should expose the compact-toolbar revision for live diagnostics'
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
  contentSource.includes("positionSurface(candidate.rect, 'inline')"),
  'every triggerable selection should anchor the same compact entry inline with the selected text'
);
assert(
  contentSource.includes('const inlineRect = clientRects.length > 0') &&
    /inline:\s*\{[\s\S]*?right:\s*inlineRect\.right/.test(contentSource) &&
    contentSource.includes('const gap = 2') &&
    contentSource.includes('const topOffset = Math.max(4, Math.min(7, bounds.height * 0.4))'),
  'selection positioning should use the final selected client rect'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\][\s\S]*?width:\s*18px[\s\S]*?min-height:\s*18px/.test(contentSource) &&
    /\.lumno-selection-main\[data-icon-only="true"\] \.lumno-selection-logo[\s\S]*?width:\s*12px[\s\S]*?height:\s*12px/.test(contentSource),
  'the low-distraction selection affordance should use the compact half-size entry mark'
);
assert(
  /\.lumno-selection-main\[data-icon-only="true"\]::before[\s\S]*?inset:\s*-5px/.test(contentSource),
  'the compact visual should keep a forgiving invisible pointer target'
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
assert(!contentSource.includes('ICON_SET_STORAGE_KEY'), 'content runtime should not read an obsolete icon-set choice');
assert(
  contentSource.includes("const TOOLBAR_FALLBACK_ACTIONS = Object.freeze(['ask', 'search', 'translate'])") &&
    /function getToolbarActions\(primary\)[\s\S]*?\.slice\(0, 3\)/.test(contentSource),
  'the inferred action should lead an exactly three-item toolbar'
);
assert(
  contentSource.includes("menu.setAttribute('role', 'toolbar')") &&
    !contentSource.includes('lumno-selection-more'),
  'the butterfly should open the toolbar directly without a second disclosure control'
);
assert(!contentSource.toLowerCase().includes('butterfly'),
  'content runtime should render only the fixed Lumno selection mark');
assert(iconSource.includes('remix: Object.freeze') && !iconSource.toLowerCase().includes('hugeicons'),
  'the bundled action icon library should contain Remix only');
assert(
  /ask:\s*icon\('<path fill="currentColor" d="M1 11C6\.52285/.test(iconSource),
  'Ask AI should use the simpler single-sparkle Remix icon'
);
assert(
  /\.lumno-selection-surface\s*\{[\s\S]*?height:\s*38px[\s\S]*?padding:\s*3px[\s\S]*?border-radius:\s*13px[\s\S]*?background:\s*light-dark\(rgba\(244, 245, 247, 0\.94\), rgba\(26, 27, 31, 0\.96\)\)/.test(contentSource),
  'the expanded toolbar should use the approved compact surface geometry'
);
assert(
  /\.lumno-selection-surface\s*\{[\s\S]*?border:\s*1px solid light-dark\(rgba\(15, 23, 42, 0\.12\), rgba\(255, 255, 255, 0\.13\)\)[\s\S]*?color:\s*light-dark\(#18181b, #e7e8eb\)/.test(contentSource),
  'the expanded toolbar should tune border and text contrast for each theme'
);
assert(
  /box-shadow:\s*inset 0 1px 0 light-dark\(rgba\(255, 255, 255, 0\.34\), rgba\(255, 255, 255, 0\.04\)\),[\s\S]*?inset 0 2px 10px light-dark\(rgba\(255, 255, 255, 0\.55\), rgba\(255, 255, 255, 0\.10\)\),[\s\S]*?0 8px 24px light-dark\(rgba\(15, 23, 42, 0\.14\), rgba\(0, 0, 0, 0\.38\)\)/.test(contentSource),
  'the expanded toolbar should pair a soft edge with a broader blurred inset glow'
);
assert(
  /\.lumno-selection-surface\s*\{[\s\S]*?-webkit-backdrop-filter:\s*blur\(14px\) saturate\(130%\)[\s\S]*?backdrop-filter:\s*blur\(14px\) saturate\(130%\)/.test(contentSource),
  'the expanded toolbar should use a translucent acrylic backdrop treatment'
);
assert(
  /\.lumno-selection-toolbar\s*\{[\s\S]*?gap:\s*0/.test(contentSource) &&
    /button\s*\{[\s\S]*?padding:\s*0 8px[\s\S]*?min-height:\s*32px[\s\S]*?border-radius:\s*9px[\s\S]*?gap:\s*5px[\s\S]*?font:\s*500 12px/.test(contentSource) &&
    /\.lumno-selection-toolbar button \+ button::before[\s\S]*?width:\s*1px[\s\S]*?height:\s*18px/.test(contentSource) &&
    /\.lumno-selection-action-icon\s*\{[\s\S]*?width:\s*16px[\s\S]*?height:\s*16px/.test(contentSource),
  'the expanded toolbar should separate its action groups with compact vertical dividers'
);
assert(
  contentSource.includes('menu.tabIndex = -1') &&
    /function renderMenu\(\)[\s\S]*?menu\.focus\(\{ preventScroll: true \}\)/.test(contentSource) &&
    !contentSource.includes('actionButtons[0].focus({ preventScroll: true })') &&
    /\.lumno-selection-toolbar:focus\s*\{[\s\S]*?outline:\s*none/.test(contentSource),
  'opening the toolbar should focus its neutral container instead of pre-highlighting the first action'
);
assert(
  contentSource.includes('function animateToolbarEntrance(originRect)') &&
    contentSource.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches") &&
    /surface\.animate\(\[[\s\S]*?opacity:\s*0\.76,[\s\S]*?transform:[\s\S]*?opacity:\s*1,[\s\S]*?transform:[\s\S]*?duration:\s*180,[\s\S]*?easing:\s*'cubic-bezier\(0\.22, 1, 0\.36, 1\)'/.test(contentSource),
  'the toolbar should use the approved 180ms transform-and-opacity FLIP entrance'
);
assert(
  contentSource.includes('function runToolbarEntranceFallback') &&
    contentSource.includes("transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)"),
  'the same entrance motion should remain available when Web Animations is unavailable'
);
assert(
  /function hideSurface\(options\)\s*\{[\s\S]*?cancelToolbarEntranceAnimation\(\)/.test(contentSource) &&
    /function clearOwnedSurface\(\)\s*\{[\s\S]*?cancelToolbarEntranceAnimation\(\)/.test(contentSource),
  'dismissal and runtime handoff should interrupt the toolbar entrance animation'
);
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
    'settings_selection_quick_actions_group_title',
    'settings_selection_quick_actions_group_desc',
    'selection_quick_action_ask',
    'selection_quick_action_translate',
    'selection_quick_action_explain',
    'selection_quick_action_summarize',
    'selection_quick_action_search',
    'selection_quick_action_calculate'
  ].forEach((key) => {
    assert(messages[key] && String(messages[key].message || '').trim(), `${locale} should localize ${key}`);
  });
  [
    'settings_selection_quick_actions_icon_set_title',
    'selection_quick_actions_icon_set_remix',
    'selection_quick_actions_icon_set_hugeicons',
    'settings_selection_quick_actions_trigger_style_title',
    'selection_quick_actions_trigger_style_lumno',
    'selection_quick_actions_trigger_style_butterfly'
  ].forEach((key) => {
    assert.strictEqual(messages[key], undefined, `${locale} should remove the obsolete trigger-style copy`);
  });
});

console.log('selection quick actions integration tests passed');
