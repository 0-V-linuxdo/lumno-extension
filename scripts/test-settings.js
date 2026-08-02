const assert = require('assert');
const settings = require('../src/shared/settings.js');

assert.strictEqual(settings.normalizeLocale(''), 'en');
assert.strictEqual(settings.normalizeLocale('en-US'), 'en');
assert.strictEqual(settings.normalizeLocale('ja-JP'), 'ja');
assert.strictEqual(settings.normalizeLocale('zh-CN'), 'zh_CN');
assert.strictEqual(settings.normalizeLocale('zh-HK'), 'zh_TW');
assert.strictEqual(settings.normalizeLocale('zh-Hant-TW'), 'zh_TW');
assert.strictEqual(settings.localeToHtmlLang('en-US'), 'en');
assert.strictEqual(settings.localeToHtmlLang('ja-JP'), 'ja');
assert.strictEqual(settings.localeToHtmlLang('zh-CN'), 'zh-CN');
assert.strictEqual(settings.localeToHtmlLang('zh-HK'), 'zh-TW');

assert.strictEqual(settings.normalizeNewtabWidthMode('standard'), 'standard');
assert.strictEqual(settings.normalizeNewtabWidthMode('wide'), 'wide');
assert.strictEqual(settings.normalizeNewtabWidthMode('other'), 'wide');

assert.strictEqual(settings.normalizeNewtabSearchWidth(719), 720);
assert.strictEqual(settings.normalizeNewtabSearchWidth(920), 920);
assert.strictEqual(settings.normalizeNewtabSearchWidth(1200), 1040);
assert.strictEqual(settings.normalizeNewtabSearchWidth(undefined), 920);
assert.strictEqual(settings.normalizeNewtabSearchWidth(undefined, { allowNull: true }), null);
assert.strictEqual(settings.normalizeNewtabSearchWidth(639, { min: 640, max: 1040, fallback: 920 }), 640);
assert.strictEqual(settings.normalizeNewtabSearchWidth(680, { min: 640, max: 1040, fallback: 920 }), 680);

assert.strictEqual(settings.normalizeNewtabWordmarkVisible(false), false);
assert.strictEqual(settings.normalizeNewtabWordmarkVisible(true), true);
assert.strictEqual(settings.normalizeNewtabWordmarkVisible(undefined), true);
assert.strictEqual(settings.normalizeNewtabWordmarkVisible('time'), true);
assert.strictEqual(settings.normalizeNewtabWordmarkVisible('off'), false);
assert.strictEqual(settings.normalizeNewtabTopContentMode(false), 'off');
assert.strictEqual(settings.normalizeNewtabTopContentMode(true), 'brand');
assert.strictEqual(settings.normalizeNewtabTopContentMode('brand'), 'brand');
assert.strictEqual(settings.normalizeNewtabTopContentMode('time'), 'time');
assert.strictEqual(settings.normalizeNewtabTopContentMode('off'), 'off');
assert.strictEqual(settings.normalizeNewtabTopContentMode(undefined), 'brand');
assert.strictEqual(
  settings.NEWTAB_TOP_CONTENT_MODE_STORAGE_KEY,
  '_x_extension_newtab_wordmark_visible_2026_unique_'
);

assert.strictEqual(settings.normalizeNewtabShortcutsVisible(false), false);
assert.strictEqual(settings.normalizeNewtabShortcutsVisible(true), true);
assert.strictEqual(settings.normalizeNewtabShortcutsVisible(undefined), true);
assert.strictEqual(settings.normalizeNewtabShortcutsVisible('false'), true);

assert.strictEqual(settings.normalizeNewtabShortcutAddVisible(false), false);
assert.strictEqual(settings.normalizeNewtabShortcutAddVisible(true), true);
assert.strictEqual(settings.normalizeNewtabShortcutAddVisible(undefined), true);
assert.strictEqual(settings.normalizeNewtabShortcutAddVisible('false'), true);
assert.strictEqual(
  settings.NEWTAB_SHORTCUT_ADD_VISIBLE_STORAGE_KEY,
  '_x_extension_newtab_shortcut_add_visible_2026_unique_'
);

assert.strictEqual(settings.normalizeNewtabShortcutDockMagnificationEnabled(false), false);
assert.strictEqual(settings.normalizeNewtabShortcutDockMagnificationEnabled(true), true);
assert.strictEqual(settings.normalizeNewtabShortcutDockMagnificationEnabled(undefined), true);
assert.strictEqual(settings.normalizeNewtabShortcutDockMagnificationEnabled('false'), true);
assert.strictEqual(
  settings.NEWTAB_SHORTCUT_DOCK_MAGNIFICATION_ENABLED_STORAGE_KEY,
  '_x_extension_newtab_shortcut_dock_magnification_enabled_2026_unique_'
);

assert.strictEqual(settings.normalizeBookmarkFolderIconsVisible(false), false);
assert.strictEqual(settings.normalizeBookmarkFolderIconsVisible(true), true);
assert.strictEqual(settings.normalizeBookmarkFolderIconsVisible(undefined), true);
assert.strictEqual(settings.normalizeBookmarkFolderIconsVisible('false'), true);
assert.strictEqual(
  settings.BOOKMARK_FOLDER_ICONS_VISIBLE_STORAGE_KEY,
  '_x_extension_bookmark_folder_icons_visible_2026_unique_'
);

assert.strictEqual(settings.normalizeUpdateNoticeEnabled(false), false);
assert.strictEqual(settings.normalizeUpdateNoticeEnabled(true), true);
assert.strictEqual(settings.normalizeUpdateNoticeEnabled(undefined), true);
assert.strictEqual(settings.normalizeUpdateNoticeEnabled('false'), true);

assert.strictEqual(settings.normalizeFaviconEnhancedFetchEnabled(false), false);
assert.strictEqual(settings.normalizeFaviconEnhancedFetchEnabled(true), true);
assert.strictEqual(settings.normalizeFaviconEnhancedFetchEnabled(undefined), true);
assert.strictEqual(settings.normalizeFaviconEnhancedFetchEnabled('false'), true);

assert.strictEqual(settings.normalizeOverlayOpenTabsDefaultVisible(false), false);
assert.strictEqual(settings.normalizeOverlayOpenTabsDefaultVisible(true), true);
assert.strictEqual(settings.normalizeOverlayOpenTabsDefaultVisible(undefined), true);
assert.strictEqual(settings.normalizeOverlayOpenTabsDefaultVisible('false'), true);

assert.strictEqual(settings.normalizeOverlaySizeMode('compact'), 'compact');
assert.strictEqual(settings.normalizeOverlaySizeMode('large'), 'large');
assert.strictEqual(settings.normalizeOverlaySizeMode('standard'), 'standard');
assert.strictEqual(settings.normalizeOverlaySizeMode('other'), 'standard');

assert.strictEqual(settings.normalizeOverlayEnterAnimation('elastic'), 'elastic');
assert.strictEqual(settings.normalizeOverlayEnterAnimation('fade'), 'fade');
assert.strictEqual(settings.normalizeOverlayEnterAnimation(undefined), 'elastic');
assert.strictEqual(settings.normalizeOverlayEnterAnimation('other'), 'elastic');
assert.strictEqual(
  settings.OVERLAY_ENTER_ANIMATION_STORAGE_KEY,
  '_x_extension_overlay_enter_animation_2026_unique_'
);

assert.strictEqual(settings.normalizeOverlayTabPriorityMode('switchTabFirst'), true);
assert.strictEqual(settings.normalizeOverlayTabPriorityMode('newtabFirst'), false);
assert.strictEqual(settings.normalizeOverlayTabPriorityMode(false), false);
assert.strictEqual(settings.normalizeOverlayTabPriorityMode(undefined), true);

assert.strictEqual(settings.normalizeSearchResultPriority('search'), 'search');
assert.strictEqual(settings.normalizeSearchResultPriority('autocomplete'), 'autocomplete');
assert.strictEqual(settings.normalizeSearchResultPriority('other'), 'autocomplete');
assert.deepStrictEqual(
  settings.normalizeSearchResultSourceTypes(['topSite', 'bookmark']),
  ['topSite', 'bookmark']
);
assert.deepStrictEqual(
  settings.normalizeSearchResultSourceTypes(['frequent', 'bookmarks', 'history', 'history']),
  ['topSite', 'bookmark', 'history']
);
assert.deepStrictEqual(
  settings.normalizeSearchResultSourceTypes([]),
  ['topSite', 'bookmark', 'history']
);

assert.strictEqual(settings.normalizeTabRankScoreDebugMode(true), true);
assert.strictEqual(settings.normalizeTabRankScoreDebugMode(false), false);
assert.strictEqual(settings.normalizeTabRankScoreDebugMode('true'), false);

assert.strictEqual(settings.normalizeTabSwitcherEnabled(false), false);
assert.strictEqual(settings.normalizeTabSwitcherEnabled(true), true);
assert.strictEqual(settings.normalizeTabSwitcherEnabled(undefined), true);
assert.strictEqual(settings.normalizeTabSwitcherEnabled('false'), true);

assert.strictEqual(settings.normalizeSelectionQuickActionsEnabled(false), false);
assert.strictEqual(settings.normalizeSelectionQuickActionsEnabled(true), true);
assert.strictEqual(settings.normalizeSelectionQuickActionsEnabled(undefined), true);
assert.strictEqual(settings.normalizeSelectionQuickActionsEnabled('false'), true);
assert.strictEqual(
  settings.SELECTION_QUICK_ACTIONS_ENABLED_STORAGE_KEY,
  '_x_extension_selection_quick_actions_enabled_2026_unique_'
);

assert.strictEqual(settings.normalizeThemePreference('dark'), 'dark');
assert.strictEqual(settings.normalizeThemePreference('light'), 'light');
assert.strictEqual(settings.normalizeThemePreference('system'), '');

assert.strictEqual(settings.normalizeThemeMode('dark'), 'dark');
assert.strictEqual(settings.normalizeThemeMode('light'), 'light');
assert.strictEqual(settings.normalizeThemeMode('system'), 'system');
assert.strictEqual(settings.normalizeThemeMode('other'), 'system');
assert.deepStrictEqual(
  settings.createGlobalThemeModeStorageUpdate('dark'),
  {
    _x_extension_theme_mode_2024_unique_: 'dark'
  },
  'global theme writes should not clear the New Tab-specific appearance override'
);
assert.deepStrictEqual(
  settings.createGlobalThemeModeStorageUpdate('weird'),
  {
    _x_extension_theme_mode_2024_unique_: 'system'
  },
  'global theme writes should normalize invalid theme modes to system'
);

console.log('settings tests passed');
