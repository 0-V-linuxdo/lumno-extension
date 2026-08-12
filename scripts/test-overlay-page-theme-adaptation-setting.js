const assert = require('assert');
const fs = require('fs');

const settings = require('../src/shared/settings.js');
const pageTheme = require('../src/overlay/page-theme.js');
const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const optionsSource = fs.readFileSync('src/options/options.js', 'utf8');
const overlayRuntimeSource = fs.readFileSync('src/overlay/runtime.js', 'utf8');
const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');

const overlaySectionStart = optionsHtml.indexOf(
  'data-i18n="settings_webpage_focus_overlay_section_title"'
);
const appearanceEnd = optionsHtml.indexOf(
  'data-content="shortcuts"',
  overlaySectionStart
);
const overlaySection = optionsHtml.slice(overlaySectionStart, appearanceEnd);
const sizeIndex = overlaySection.indexOf('data-i18n="settings_overlay_size_title"');
const animationIndex = overlaySection.indexOf(
  'data-i18n="settings_overlay_enter_animation_title"'
);
const adaptationIndex = overlaySection.indexOf(
  'data-i18n="settings_overlay_page_theme_adaptation_title"'
);

assert(sizeIndex >= 0 && animationIndex > sizeIndex, 'overlay appearance controls should exist');
assert(
  adaptationIndex > animationIndex,
  'webpage theme adaptation should be the final overlay appearance setting'
);
assert.match(
  overlaySection,
  /id="_x_extension_overlay_page_theme_adaptation_toggle_2026_unique_" type="checkbox" checked/,
  'webpage theme adaptation should default to enabled'
);
assert.match(
  overlaySection,
  /id="_x_extension_overlay_page_theme_adaptation_info_2026_unique_"/,
  'the setting should expose a shared InfoButton host'
);
assert.match(
  optionsSource,
  /overlayPageThemeAdaptationInfoController\.render\([\s\S]*?settings_overlay_page_theme_adaptation_tooltip/,
  'the shared InfoButton should receive the localized disabled-behavior tooltip'
);
assert(
  !overlaySection.includes('title="'),
  'the setting should not leave a native title tooltip fallback'
);

assert.strictEqual(
  settings.OVERLAY_PAGE_THEME_ADAPTATION_ENABLED_STORAGE_KEY,
  '_x_extension_overlay_page_theme_adaptation_enabled_2026_unique_'
);
assert(settings.CHROME_SYNC_STORAGE_KEYS.includes(
  settings.OVERLAY_PAGE_THEME_ADAPTATION_ENABLED_STORAGE_KEY
));
assert.strictEqual(settings.normalizeOverlayPageThemeAdaptationEnabled(undefined), true);
assert.strictEqual(settings.normalizeOverlayPageThemeAdaptationEnabled(false), false);

assert.match(
  optionsSource,
  /overlayPageThemeAdaptationToggle\.addEventListener\('change'[\s\S]*?storageArea\.set\(\{ \[OVERLAY_PAGE_THEME_ADAPTATION_ENABLED_STORAGE_KEY\]: next \}\)/,
  'options should persist adaptation changes immediately'
);
assert.match(
  optionsSource,
  /storageArea\.get\(\[OVERLAY_PAGE_THEME_ADAPTATION_ENABLED_STORAGE_KEY\][\s\S]*?setOptionsToggleState\(overlayPageThemeAdaptationToggle, stored\)/,
  'options should restore and normalize the adaptation setting'
);
assert.match(
  overlayRuntimeSource,
  /overlayPageThemeAdaptationEnabled: '_x_extension_overlay_page_theme_adaptation_enabled_2026_unique_'/,
  'overlay runtime should expose the synchronized adaptation key'
);
assert.match(
  overlaySource,
  /pageThemeAdaptationEnabled: overlayPageThemeAdaptationEnabled/,
  'overlay theme resolution should receive the live adaptation preference'
);
assert.match(
  overlaySource,
  /!changes\[THEME_STORAGE_KEY\][\s\S]*?!changes\[OVERLAY_PAGE_THEME_ADAPTATION_ENABLED_STORAGE_KEY\][\s\S]*?applyOverlayTheme\(nextMode\)/,
  'an open overlay should update immediately when either theme preference changes'
);

const cases = [
  [{ mode: 'system', pageTheme: 'light', systemTheme: 'dark' }, 'light'],
  [{ mode: 'system', pageTheme: 'light', systemTheme: 'dark', pageThemeAdaptationEnabled: false }, 'dark'],
  [{ mode: 'system', pageTheme: 'dark', systemTheme: 'light', pageThemeAdaptationEnabled: false }, 'light'],
  [{ mode: 'light', pageTheme: 'dark', systemTheme: 'dark', pageThemeAdaptationEnabled: false }, 'light'],
  [{ mode: 'dark', pageTheme: 'light', systemTheme: 'light', pageThemeAdaptationEnabled: false }, 'dark']
];
cases.forEach(([input, expected]) => {
  assert.strictEqual(pageTheme.resolveOverlayTheme(input), expected);
});

const expectedCopy = {
  en: ['Adapt theme colors to each webpage', 'Auto follows only your system appearance', 'Light always stays light', 'Dark always stays dark'],
  ja: ['Web ページの色に合わせてテーマを自動変更', 'システムの外観だけに従います', '常にライトを使用します', '常にダークを使用します'],
  zh_CN: ['基于网页色彩自动变更主题色', '仅跟随系统深浅色', '始终使用浅色', '始终使用深色'],
  zh_TW: ['依網頁色彩自動變更主題色', '僅跟隨系統深淺色', '一律使用淺色', '一律使用深色']
};
Object.entries(expectedCopy).forEach(([locale, fragments]) => {
  const messages = JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'));
  const title = messages.settings_overlay_page_theme_adaptation_title.message;
  const tooltip = messages.settings_overlay_page_theme_adaptation_tooltip.message;
  assert.strictEqual(title, fragments[0]);
  fragments.slice(1).forEach((fragment) => assert(tooltip.includes(fragment)));
});

console.log('overlay page theme adaptation setting tests passed');
