const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const repoRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
);
const newtabHtml = fs.readFileSync(
  path.join(repoRoot, 'src/newtab/newtab.html'),
  'utf8'
);
const optionsHtml = fs.readFileSync(
  path.join(repoRoot, 'src/options/options.html'),
  'utf8'
);
const optionsSource = fs.readFileSync(
  path.join(repoRoot, 'src/options/options.js'),
  'utf8'
);
const onboardingHtml = fs.readFileSync(
  path.join(repoRoot, 'src/onboarding/onboarding.html'),
  'utf8'
);
const onboardingSource = fs.readFileSync(
  path.join(repoRoot, 'src/onboarding/onboarding.js'),
  'utf8'
);
const overlaySuggestionsCss = fs.readFileSync(
  path.join(repoRoot, 'src/overlay/suggestions-view.css'),
  'utf8'
);
const overlaySource = fs.readFileSync(
  path.join(repoRoot, 'src/overlay/search-panel.js'),
  'utf8'
);
const reactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/shortcut-dialog.tsx'),
  'utf8'
);
const recentSitesReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/recent-sites.tsx'),
  'utf8'
);
const bookmarksReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/bookmarks.tsx'),
  'utf8'
);
const suggestionsReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/suggestions.tsx'),
  'utf8'
);
const shortcutsReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/shortcuts.tsx'),
  'utf8'
);
const feedbackReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/feedback.tsx'),
  'utf8'
);
const selectMenuReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/select-menu.tsx'),
  'utf8'
);
const dockReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/dock.tsx'),
  'utf8'
);
const wordmarkReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/wordmark.tsx'),
  'utf8'
);
const searchInputReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/shared/search-input.tsx'),
  'utf8'
);
const toastReactSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/shared/toast.tsx'),
  'utf8'
);
const bootstrapPath = path.join(repoRoot, 'src/shared/react-page-bootstrap.js');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const newtabBundlePath = path.join(
  repoRoot,
  'src/react/newtab-islands.js'
);
const optionsBundlePath = path.join(repoRoot, 'src/react/options-islands.js');
const onboardingBundlePath = path.join(
  repoRoot,
  'src/react/onboarding-islands.js'
);
const overlayBundlePath = path.join(repoRoot, 'src/react/overlay-islands.js');
const sharedBundlePath = path.join(repoRoot, 'src/react/react-shared.js');
const runtimeBundlePath = path.join(repoRoot, 'src/react/react-runtime.js');
const newtabBundle = fs.readFileSync(newtabBundlePath, 'utf8');
const optionsBundle = fs.readFileSync(optionsBundlePath, 'utf8');
const onboardingBundle = fs.readFileSync(onboardingBundlePath, 'utf8');
const overlayBundle = fs.readFileSync(overlayBundlePath, 'utf8');
const sharedBundle = fs.readFileSync(sharedBundlePath, 'utf8');
const runtimeBundle = fs.readFileSync(runtimeBundlePath, 'utf8');
const bundles = [
  runtimeBundle,
  sharedBundle,
  newtabBundle,
  optionsBundle,
  onboardingBundle,
  overlayBundle
];
const bundle = bundles.join('\n');
const bundlePaths = [
  runtimeBundlePath,
  sharedBundlePath,
  newtabBundlePath,
  optionsBundlePath,
  onboardingBundlePath,
  overlayBundlePath
];

const retiredNewtabRendererScripts = [
  'bookmarks-topbar.js',
  'page-notice.js',
  'toast.js',
  'dock.js',
  'recent-sites-view.js',
  'bookmarks-view.js',
  'suggestions-view.js',
  'shortcut-dialog.js',
  'shortcuts-view.js'
].map((name) => `<script src="${name}"></script>`);
const retiredRendererFiles = [
  'src/newtab/bookmarks-topbar.js',
  'src/newtab/bookmarks-view.js',
  'src/newtab/dock.js',
  'src/newtab/page-notice.js',
  'src/newtab/recent-sites-view.js',
  'src/newtab/shortcut-dialog.js',
  'src/newtab/shortcuts-view.js',
  'src/newtab/suggestions-view.js',
  'src/newtab/toast.js',
  'src/overlay/input-ui.js',
  'src/overlay/shell.js',
  'src/shared/checkbox.js',
  'src/shared/custom-select.js',
  'src/shared/search-input-ui.js'
];
const bootstrapScript = 'src="../shared/react-page-bootstrap.js"';

assert(
  retiredNewtabRendererScripts.every((script) => !newtabHtml.includes(script)) &&
    newtabHtml.includes(bootstrapScript),
  'New Tab should load its React entry without retired renderer scripts'
);
assert(
  retiredRendererFiles.every(
    (relativePath) => !fs.existsSync(path.join(repoRoot, relativePath))
  ),
  'retired UI renderer and fallback files should stay deleted'
);
assert(
  !newtabHtml.includes('<script src="newtab.js"></script>') &&
    newtabHtml.includes('data-react-entry="../react/newtab-islands.js"') &&
    newtabHtml.includes('data-page-entry="../newtab/newtab.js"') &&
    newtabHtml.includes('data-react-state="LumnoNewtabReactBootstrap"') &&
    bootstrap.includes('import(reactEntryUrl)') &&
    bootstrap.includes('if (!bootstrapState.reactReady)') &&
    bootstrap.includes('startPage();'),
  'the bootstrap should require React readiness before injecting the browser adapter'
);
assert(
  !optionsHtml.includes('<script src="options.js"></script>') &&
    optionsHtml.includes(bootstrapScript) &&
    optionsHtml.includes('data-react-entry="../react/options-islands.js"') &&
    optionsHtml.includes('data-page-entry="../options/options.js"') &&
    optionsHtml.includes('data-react-state="LumnoOptionsReactBootstrap"'),
  'Options should use the shared React-aware bootstrap and retain classic page semantics'
);
assert(
  !onboardingHtml.includes('<script src="onboarding.js"></script>') &&
    onboardingHtml.includes(bootstrapScript) &&
    onboardingHtml.includes('data-react-entry="../react/onboarding-islands.js"') &&
    onboardingHtml.includes('data-page-entry="../onboarding/onboarding.js"') &&
    onboardingHtml.includes('data-react-state="LumnoOnboardingReactBootstrap"'),
  'Onboarding should use the shared React-aware bootstrap and retain classic page semantics'
);
assert(
  !bootstrap.includes("startPage('legacy')") &&
    !bootstrap.includes('allowReactUpgrade') &&
    !bootstrap.includes('1500') &&
    bootstrap.includes("root.dataset.lumnoReactRuntime = 'error'") &&
    bootstrap.includes('React page failed to start'),
  'the bootstrap should fail explicitly instead of reviving a legacy UI path'
);
assert.strictEqual(
  packageJson.scripts['build:react'],
  'vite build --config vite.react.config.mjs && vite build --config vite.overlay-react.config.mjs',
  'the React output should have a reproducible local build command'
);
assert(
  packageJson.scripts.test.includes('test:legacy') &&
    packageJson.scripts.test.includes('test:react'),
  'the default test command should cover both runtimes'
);
assert(
  packageJson.dependencies.react && packageJson.dependencies['react-dom'],
  'React runtime dependencies should be explicit'
);
assert(
  fs.statSync(runtimeBundlePath).size +
      fs.statSync(sharedBundlePath).size +
      fs.statSync(newtabBundlePath).size <=
    360 * 1024,
  'the New Tab React route should stay within its 360 KiB uncompressed budget'
);
assert(
  zlib.gzipSync(runtimeBundle).length +
      zlib.gzipSync(sharedBundle).length +
      zlib.gzipSync(newtabBundle).length <=
    112 * 1024,
  'the New Tab React route should stay within its 112 KiB gzip budget'
);
assert(
    fs.statSync(runtimeBundlePath).size +
      fs.statSync(sharedBundlePath).size +
      fs.statSync(optionsBundlePath).size <=
    238 * 1024,
  'the Options React route should stay within its 238 KiB uncompressed budget'
);
assert(
  zlib.gzipSync(runtimeBundle).length +
      zlib.gzipSync(sharedBundle).length +
      zlib.gzipSync(optionsBundle).length <=
    71 * 1024,
  'the Options React route should stay within its 71 KiB gzip budget'
);
assert(
  fs.statSync(overlayBundlePath).size <= 250 * 1024,
  'the injected Overlay React route should stay within its 250 KiB uncompressed budget'
);
assert(
  zlib.gzipSync(overlayBundle).length <= 78 * 1024,
  'the injected Overlay React route should stay within its 78 KiB gzip budget'
);
assert(
  bundlePaths.reduce((total, file) => total + fs.statSync(file).size, 0) <=
    700 * 1024,
  'all shared React artifacts and four page entries should stay within their 700 KiB package budget'
);
assert(
  bundles.reduce((total, source) => total + zlib.gzipSync(source).length, 0) <=
    215 * 1024,
  'all shared React artifacts and four page entries should stay within their 215 KiB gzip budget'
);
assert(
  newtabBundle.includes('from"./react-runtime.js"') &&
    newtabBundle.includes('from"./react-shared.js"') &&
    optionsBundle.includes('from"./react-shared.js"') &&
    onboardingBundle.includes('from"./react-runtime.js"') &&
    sharedBundle.includes('from"./react-runtime.js"'),
  'New Tab, Options, and Onboarding should reuse the shared React runtime'
);
assert(
  overlayBundle.includes('LumnoOverlayReactBootstrap') &&
    overlayBundle.includes('LumnoOverlayShellReact') &&
    overlayBundle.includes('LumnoOverlaySuggestionsViewReact') &&
    overlayBundle.includes('LumnoOverlayTabSwitcherViewReact') &&
    overlayBundle.includes('LumnoSearchInputUIReact') &&
    overlayBundle.includes('overlay-shell') &&
    overlayBundle.includes('overlay-tab-switcher') &&
    overlayBundle.includes('suggestions') &&
    overlayBundle.includes('shared-search-input'),
  'the injected Overlay IIFE should install React shell, suggestions, and search-input APIs'
);
assert(
  /\.x-ov-suggestion-mark\s*\{[^}]*background:\s*var\(--x-ext-mark-bg,\s*#CFE8FF\)[^}]*color:\s*var\(--x-ext-mark-text,\s*#1E3A8A\)/s.test(
    overlaySuggestionsCss
  ),
  'the Overlay query mark should retain its themed background and text colors'
);
assert(
  overlaySource.includes(
    'overlay._lumnoSuggestionsView = overlaySuggestionsView'
  ) &&
    overlaySource.includes(
      'const mountedSuggestionsView = overlayElement._lumnoSuggestionsView ||'
    ) &&
    overlaySource.includes('mountedSuggestionsView.destroy()'),
  'the Overlay panel should retain and destroy the React suggestions owner across toggle invocations'
);
assert(
  newtabBundle.includes('LumnoNewtabShortcutDialogReact') &&
    newtabBundle.includes('LumnoNewtabRecentSitesViewReact') &&
    newtabBundle.includes('LumnoNewtabBookmarksViewReact') &&
    newtabBundle.includes('LumnoNewtabSuggestionsViewReact') &&
    newtabBundle.includes('LumnoNewtabShortcutsViewReact') &&
    newtabBundle.includes('LumnoNewtabToastReact') &&
    newtabBundle.includes('LumnoNewtabFeedbackControlReact') &&
    newtabBundle.includes('LumnoNewtabSelectMenuReact') &&
    newtabBundle.includes('LumnoNewtabDockReact') &&
    newtabBundle.includes('LumnoNewtabWordmarkReact') &&
    newtabBundle.includes('LumnoSearchInputUIReact') &&
    newtabBundle.includes('LumnoNewtabReactIslands') &&
    newtabBundle.includes('newtab-feedback-control') &&
    newtabBundle.includes('newtab-select-menu') &&
    newtabBundle.includes('newtab-bottom-dock') &&
    newtabBundle.includes('newtab-wordmark') &&
    feedbackReactSource.includes('createFeedbackControlController') &&
    feedbackReactSource.includes("host.dataset.reactIsland = 'newtab-feedback-control'") &&
    selectMenuReactSource.includes('createSelectMenuController') &&
    selectMenuReactSource.includes("host.dataset.reactIsland = 'newtab-select-menu'") &&
    dockReactSource.includes("bottomDock.dataset.reactIsland = 'newtab-bottom-dock'") &&
    wordmarkReactSource.includes("host.dataset.reactIsland = 'newtab-wordmark'") &&
    sharedBundle.includes('data-react-island'),
  'the compiled islands should expose diagnostic APIs and host markers'
);
assert(
  sharedBundle.includes('shared-search-input') &&
    sharedBundle.includes('_x_lumnoTooltipRenderReact_2026_unique_') &&
    overlayBundle.includes('_x_lumnoTooltipRenderReact_2026_unique_') &&
    searchInputReactSource.includes('createSearchInput') &&
    searchInputReactSource.includes(
      "container.dataset.reactIsland = 'shared-search-input'"
    ),
  'the shared React search input should keep a diagnostic host marker'
);
assert(
  [
    'LumnoOptionsToastReact',
    'LumnoOptionsBlacklistListReact',
    'LumnoOptionsPopconfirmReact',
    'LumnoOptionsSegmentedControlReact',
    'LumnoOptionsSelectControlReact',
    'LumnoOptionsSettingsNavigationReact',
    'LumnoOptionsSettingsControlsReact',
    'LumnoOptionsSettingsFormsReact',
    'LumnoOptionsShortcutReferenceReact',
    'LumnoOptionsShortcutHotkeyReact',
    'LumnoOptionsSiteSearchListReact',
    'LumnoOptionsThemePickerReact',
    'LumnoOptionsReactIslands'
  ].every((name) => optionsBundle.includes(name)) &&
    [
      'optionsBlacklistListApi.createBlacklistListController',
      'optionsPopconfirmApi',
      'optionsSegmentedControlApi.createSegmentedControlController',
      'optionsSelectControlApi.createSelectControlController',
      'optionsSettingsControlsApi.createToggleControlController',
      'optionsSettingsControlsApi.createRequiredCheckboxGroupController',
      'optionsSettingsFormsApi.createSiteSearchFormController',
      'optionsSettingsFormsApi.createBlacklistFormController',
      'optionsSettingsNavigationApi.createSettingsNavigationController',
      'optionsShortcutReferenceApi.createShortcutReferenceController',
      'optionsShortcutHotkeyApi.createShortcutHotkeyController',
      'optionsSiteSearchListApi.createSiteSearchListController',
      'optionsThemePickerApi.createThemePickerController',
      'optionsToastApi.createToastController'
    ].every((contract) => optionsSource.includes(contract)),
  'Options should install and consume every migrated React controller'
);
assert(
  [
    'LumnoOnboardingPageStripReact',
    'LumnoOnboardingActionsReact',
    'LumnoOnboardingBodyCopyReact',
    'LumnoOnboardingCopyHeadingReact',
    'LumnoOnboardingCursorLayerReact',
    'LumnoOnboardingInteractionsReact',
    'LumnoOnboardingVisualSurfaceReact',
    'LumnoOnboardingReactIslands'
  ].every((name) => onboardingBundle.includes(name)) &&
    sharedBundle.includes('renderBrowserAvatarTooltip') &&
    [
      'onboardingPageStripApi.createPageStripController',
      'onboardingActionsApi.createActionButtonsController',
      'onboardingBodyCopyApi.createBodyCopyController',
      'onboardingCopyHeadingApi.createCopyHeadingController',
      'onboardingCursorLayerApi.createCursorLayerController',
      'onboardingInteractionsApi.createInteractionsController',
      'onboardingVisualSurfaceApi.createVisualSurfaceController',
      'tooltipView.renderBrowserAvatarTooltip('
    ].every((contract) => onboardingSource.includes(contract)),
  'Onboarding should install and consume every migrated React controller'
);
assert(
  !bundle.includes('process.env.NODE_ENV') &&
    !bundle.includes('sourceMappingURL=') &&
    !bootstrap.includes('sourceMappingURL=') &&
    !/\beval\(|new Function/.test(`${bundle}\n${bootstrap}`),
  'the extension bundle should be production-only, CSP-safe, and omit source maps'
);
assert(
  !/<script[^>]+src=["']https?:\/\//i.test(newtabHtml) &&
    !/<script[^>]+src=["']https?:\/\//i.test(optionsHtml) &&
    !/<script[^>]+src=["']https?:\/\//i.test(onboardingHtml),
  'MV3 pages should not load React or any script from a CDN'
);
assert(
  !reactSource.includes("from '../../src/newtab/wallpaper") &&
    !reactSource.includes("from '../../src/newtab/theme") &&
    !reactSource.includes("from '../../src/newtab/newtab") &&
    !recentSitesReactSource.includes("from '../../src/newtab/wallpaper") &&
    !recentSitesReactSource.includes("from '../../src/newtab/theme") &&
    !recentSitesReactSource.includes("from '../../src/newtab/newtab") &&
    !bookmarksReactSource.includes("from '../../src/newtab/wallpaper") &&
    !bookmarksReactSource.includes("from '../../src/newtab/theme") &&
    !bookmarksReactSource.includes("from '../../src/newtab/newtab") &&
    !suggestionsReactSource.includes("from '../../src/newtab/wallpaper") &&
    !suggestionsReactSource.includes("from '../../src/newtab/theme") &&
    !suggestionsReactSource.includes("from '../../src/newtab/newtab") &&
    !shortcutsReactSource.includes("from '../../src/newtab/wallpaper") &&
    !shortcutsReactSource.includes("from '../../src/newtab/theme") &&
    !shortcutsReactSource.includes("from '../../src/newtab/newtab") &&
    !toastReactSource.includes("from '../../src/newtab/wallpaper") &&
    !toastReactSource.includes("from '../../src/newtab/theme") &&
    !toastReactSource.includes("from '../../src/newtab/newtab"),
  'the pilot islands should remain isolated from recently changed page systems'
);
assert(
  !fs.existsSync(path.join(repoRoot, 'src/newtab/react-islands.js')),
  'the obsolete monolithic New Tab bundle should not remain in the extension'
);
assert(
  !fs.existsSync(path.join(repoRoot, 'src/newtab/react-bootstrap.js')),
  'page-specific bootstrap copies should not remain after sharing the loader'
);
assert(
  !fs.existsSync(path.join(repoRoot, 'src/newtab/shortcut-dialog-react.js')),
  'the extension should ship one shared React runtime instead of per-island copies'
);
assert(
  !fs.existsSync(path.join(repoRoot, 'src/newtab/shortcuts-view-react.js')),
  'the shortcuts grid should reuse the shared React runtime'
);
assert(
  !fs.existsSync(path.join(repoRoot, 'src/newtab/toast-react.js')),
  'the toast should reuse the shared React runtime'
);

console.log('React migration contract tests passed');
