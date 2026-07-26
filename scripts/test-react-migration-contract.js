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
const sharedBundlePath = path.join(repoRoot, 'src/react/react-shared.js');
const runtimeBundlePath = path.join(repoRoot, 'src/react/react-runtime.js');
const newtabBundle = fs.readFileSync(newtabBundlePath, 'utf8');
const optionsBundle = fs.readFileSync(optionsBundlePath, 'utf8');
const onboardingBundle = fs.readFileSync(onboardingBundlePath, 'utf8');
const sharedBundle = fs.readFileSync(sharedBundlePath, 'utf8');
const runtimeBundle = fs.readFileSync(runtimeBundlePath, 'utf8');
const bundles = [
  runtimeBundle,
  sharedBundle,
  newtabBundle,
  optionsBundle,
  onboardingBundle
];
const bundle = bundles.join('\n');
const bundlePaths = [
  runtimeBundlePath,
  sharedBundlePath,
  newtabBundlePath,
  optionsBundlePath,
  onboardingBundlePath
];

const legacyScript = '<script src="shortcut-dialog.js"></script>';
const legacyRecentSitesScript = '<script src="recent-sites-view.js"></script>';
const legacyBookmarksScript = '<script src="bookmarks-view.js"></script>';
const legacySuggestionsScript = '<script src="suggestions-view.js"></script>';
const legacyShortcutsScript = '<script src="shortcuts-view.js"></script>';
const legacyToastScript = '<script src="toast.js"></script>';
const bootstrapScript = 'src="../shared/react-page-bootstrap.js"';

assert(
  newtabHtml.includes(legacyScript) &&
    newtabHtml.includes(legacyRecentSitesScript) &&
    newtabHtml.includes(legacyBookmarksScript) &&
    newtabHtml.includes(legacySuggestionsScript) &&
    newtabHtml.includes(legacyShortcutsScript) &&
    newtabHtml.includes(legacyToastScript) &&
    newtabHtml.includes(bootstrapScript),
  'newtab should declare its fallback APIs and React-aware page bootstrap'
);
assert(
  newtabHtml.indexOf(legacyRecentSitesScript) <
      newtabHtml.indexOf(bootstrapScript) &&
    newtabHtml.indexOf(legacyBookmarksScript) <
      newtabHtml.indexOf(bootstrapScript) &&
    newtabHtml.indexOf(legacySuggestionsScript) <
      newtabHtml.indexOf(bootstrapScript) &&
    newtabHtml.indexOf(legacyShortcutsScript) <
      newtabHtml.indexOf(bootstrapScript) &&
    newtabHtml.indexOf(legacyToastScript) <
      newtabHtml.indexOf(bootstrapScript) &&
    newtabHtml.indexOf(legacyScript) < newtabHtml.indexOf(bootstrapScript),
  'fallback APIs should be ready before the React-aware bootstrap starts'
);
assert(
  !newtabHtml.includes('<script src="newtab.js"></script>') &&
    newtabHtml.includes('data-react-entry="../react/newtab-islands.js"') &&
    newtabHtml.includes('data-page-entry="../newtab/newtab.js"') &&
    newtabHtml.includes('data-react-state="LumnoNewtabReactBootstrap"') &&
    bootstrap.includes('import(reactEntryUrl)') &&
    bootstrap.includes("startPage(bootstrapState.reactReady ? 'react' : 'legacy')"),
  'the bootstrap should wait for the React islands before injecting the classic page runtime'
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
  bootstrap.includes("startPage('legacy')") &&
    bootstrap.includes('allowReactUpgrade') &&
    bootstrap.includes('1500'),
  'the bootstrap should retain a bounded legacy fallback when React cannot start'
);
assert.strictEqual(
  packageJson.scripts['build:react'],
  'vite build --config vite.react.config.mjs',
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
    260 * 1024,
  'the New Tab React route should stay within its 260 KiB uncompressed budget'
);
assert(
  zlib.gzipSync(runtimeBundle).length +
      zlib.gzipSync(sharedBundle).length +
      zlib.gzipSync(newtabBundle).length <=
    80 * 1024,
  'the New Tab React route should stay within its 80 KiB gzip budget'
);
assert(
  bundlePaths.reduce((total, file) => total + fs.statSync(file).size, 0) <=
    276 * 1024,
  'all shared React artifacts and three page entries should stay within their 276 KiB package budget'
);
assert(
  bundles.reduce((total, source) => total + zlib.gzipSync(source).length, 0) <=
    84 * 1024,
  'all shared React artifacts and three page entries should stay within their 84 KiB gzip budget'
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
  newtabBundle.includes('LumnoNewtabShortcutDialogReact') &&
    newtabBundle.includes('LumnoNewtabRecentSitesViewReact') &&
    newtabBundle.includes('LumnoNewtabBookmarksViewReact') &&
    newtabBundle.includes('LumnoNewtabSuggestionsViewReact') &&
    newtabBundle.includes('LumnoNewtabShortcutsViewReact') &&
    newtabBundle.includes('LumnoNewtabToastReact') &&
    newtabBundle.includes('LumnoNewtabReactIslands') &&
    sharedBundle.includes('data-react-island'),
  'the compiled islands should expose diagnostic APIs and host markers'
);
assert(
  optionsBundle.includes('LumnoOptionsToastReact') &&
    optionsBundle.includes('LumnoOptionsReactIslands') &&
    optionsSource.includes('optionsToastApi.createToastController') &&
    optionsSource.includes('toastController.show'),
  'Options should expose and consume its React Toast island'
);
assert(
  onboardingBundle.includes('LumnoOnboardingPageStripReact') &&
    onboardingBundle.includes('LumnoOnboardingActionsReact') &&
    onboardingBundle.includes('LumnoOnboardingBodyCopyReact') &&
    onboardingBundle.includes('LumnoOnboardingCopyHeadingReact') &&
    onboardingBundle.includes('LumnoOnboardingCursorLayerReact') &&
    onboardingBundle.includes('LumnoOnboardingInteractionsReact') &&
    onboardingBundle.includes('LumnoOnboardingReactIslands') &&
    onboardingBundle.includes('onboarding-page-strip') &&
    onboardingBundle.includes('onboarding-actions') &&
    onboardingBundle.includes('onboarding-body-copy') &&
    onboardingBundle.includes('onboarding-title-copy') &&
    onboardingBundle.includes('onboarding-cursor-layer') &&
    onboardingBundle.includes('onboarding-interactions') &&
    onboardingSource.includes('onboardingPageStripApi.createPageStripController') &&
    onboardingSource.includes('pageStripController.render') &&
    onboardingSource.includes('onboardingActionsApi.createActionButtonsController') &&
    onboardingSource.includes('copyActionsController.render') &&
    onboardingSource.includes('onboardingBodyCopyApi.createBodyCopyController') &&
    onboardingSource.includes('bodyCopyController.render') &&
    onboardingSource.includes('onboardingCopyHeadingApi.createCopyHeadingController') &&
    onboardingSource.includes('copyHeadingController.render') &&
    onboardingSource.includes('onboardingCursorLayerApi.createCursorLayerController') &&
    onboardingSource.includes('cursorLayerController.render') &&
    onboardingSource.includes('onboardingInteractionsApi.createInteractionsController') &&
    onboardingSource.includes('interactionSlotsController.render'),
  'Onboarding should expose and consume its React page-strip, action, body-copy, copy-heading, cursor-layer, and interaction islands'
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
