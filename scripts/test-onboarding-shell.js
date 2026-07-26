const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'onboarding', 'onboarding.html'),
  'utf8'
);
const script = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'onboarding', 'onboarding.js'),
  'utf8'
);
const content = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'onboarding', 'onboarding-content.js'),
  'utf8'
);
const sharedSuggestionsCss = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'overlay', 'suggestions-view.css'),
  'utf8'
);
const lumnoWebWordmarkAsset = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'images', 'lumno-web-textlogo.svg'),
  'utf8'
);

assert.match(
  script,
  /const NAVIGATION_DISPOSITION = globalThis\.LumnoNavigationDisposition \|\| \{\};[\s\S]*function runExtensionAction\(actionTarget, event\)[\s\S]*const disposition = getOpenDisposition\(event, 'newTab'\);[\s\S]*action: messageAction,[\s\S]*disposition/,
  'action-backed onboarding links should forward background-opening modifiers'
);
assert.match(
  script,
  /document\.addEventListener\('auxclick',[\s\S]*Number\(event\.button\) !== 1[\s\S]*interaction-accordion-link\[data-action\][\s\S]*runExtensionAction\(target, event\)/,
  'onboarding inline action links should support middle-click background opening'
);
const homepagePipAsset = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'images', 'onboarding-auto-pip.svg'),
  'utf8'
);
const newtabFiltersAsset = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'images', 'onboarding-newtab-filters.webp')
);
const wheatAsset = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'images', 'onboarding-wheat.svg'),
  'utf8'
);
const bodyStyle = html.match(/\n\s*body\s*\{[\s\S]*?\n\s*\}/);
const copyPanelStyle = html.match(/\.copy-panel\s*\{[\s\S]*?\n\s*\}/);
const newtabWatermarkStyle = html.match(/\.onboarding-newtab-watermark\s*\{[\s\S]*?\n\s*\}/);
const newtabWatermarkSolidStyle = html.match(/\.onboarding-newtab-watermark__solid\s*\{[\s\S]*?\n\s*\}/);
const visualPanelSlotStyle = html.match(/\.visual-panel-slot\s*\{[\s\S]*?\n\s*\}/);
const visualPanelStyle = html.match(/\.visual-panel\s*\{[\s\S]*?\n\s*\}/);
const newtabPreviewBrowserBackdropStyle = html.match(/\.browser-window\.newtab-preview-browser-backdrop\s*\{[\s\S]*?\n\s*\}/);
const newtabPreviewBrowserForegroundStyle = html.match(/\.newtab-preview-browser-foreground\s*\{[\s\S]*?\n\s*\}/);
const newtabPreviewBrowserPageBeforeStyle = html.match(/\.newtab-preview-browser-page::before\s*\{[\s\S]*?\n\s*\}/);
const visualCanvasStyle = html.match(/\.visual-canvas\s*\{[\s\S]*?\n\s*\}/);
const browserWindowStyle = html.match(/\.browser-window\s*\{[\s\S]*?\n\s*\}/);

function getCssRule(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`(?:^|\\n)\\s*${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `${selector} should exist in onboarding CSS`);
  return match[1];
}

assert.match(html, /data-onboarding-shell/, 'page should expose a stable onboarding shell root');
assert.match(html, /id="onboarding-copy-panel"/, 'left copy panel should have a stable mount point');
assert.match(html, /id="onboarding-page-strip"/, 'left copy panel should expose an in-panel page strip from the second slide onward');
assert.match(html, /id="onboarding-interaction-slots"/, 'left interactions should have a stable mount point');
assert.match(html, /id="onboarding-visual-slot"/, 'right UI should expose a stable visual grid-slot wrapper');
assert.match(html, /id="onboarding-visual-panel"/, 'right UI should expose a stable fixed-ratio visual panel');
assert.match(html, /id="onboarding-visual-stage"/, 'right UI should render into a stable visual stage');
assert.match(html, /id="onboarding-visual-canvas"/, 'right UI should wrap illustration and cursor layers in a fixed-ratio canvas');
assert.match(html, /id="onboarding-cursor-layer"/, 'right UI should reserve a cursor animation layer');
assert.match(html, /data-cursor-mode="intro"/, 'right UI cursor layer should boot in the cover-page logo wander mode');
assert.match(html, /id="onboarding-shortcut-label"/, 'page should expose a stable shortcut label target');
assert.match(html, /id="onboarding-body-note"/, 'page should expose a stable body note target below the shortcut subtitle');
assert.match(
  html,
  /class="onboarding-newtab-watermark" aria-hidden="true"[\s\S]*?class="onboarding-newtab-watermark__solid"[\s\S]*?src="\.\.\/\.\.\/assets\/images\/lumno-wordmark\.svg"/,
  'intro copy panel should render the newtab wordmark watermark in the top-left blank area'
);
assert.match(
  copyPanelStyle ? copyPanelStyle[0] : '',
  /--onboarding-copy-padding-x:\s*56px;[\s\S]*?--onboarding-copy-padding-y:\s*56px;[\s\S]*?position:\s*relative;[\s\S]*?padding:\s*max\(var\(--onboarding-copy-padding-y\),\s*calc\(env\(safe-area-inset-top\) \+ 12px\)\)[\s\S]*?max\(var\(--onboarding-copy-padding-x\),\s*env\(safe-area-inset-left\)\);/,
  'copy panel should expose reusable padding variables while clearing viewport safe areas'
);
assert.match(
  newtabWatermarkStyle ? newtabWatermarkStyle[0] : '',
  /position:\s*absolute;[\s\S]*?left:\s*var\(--onboarding-copy-padding-x\);[\s\S]*?top:\s*max\([\s\S]*?var\(--onboarding-copy-padding-y\),[\s\S]*?calc\(env\(safe-area-inset-top\) \+ 12px\)[\s\S]*?\);[\s\S]*?width:\s*118px;[\s\S]*?height:\s*27px;[\s\S]*?pointer-events:\s*none;[\s\S]*?transform:\s*translateY\(12px\);/,
  'newtab watermark should sit smaller and closer to the title without adding layout height or stealing input'
);
assert.match(
  html,
  /\.onboarding-shell\[data-active-slide="intro"\]\s+\.copy-block\s*\{[\s\S]*?padding-top:\s*18px;[\s\S]*?\}/,
  'intro title group should sit farther below the Lumno wordmark on desktop'
);
assert.match(
  html,
  /html\[lang="en"\]\s+\.onboarding-shell\[data-active-slide="intro"\]\s+\.title-logo-mark\s*\{[\s\S]*?--title-logo-mark-offset-y:\s*0\.08em;[\s\S]*?\}/,
  'English intro title logo should have a tiny downward optical offset without affecting other locales'
);
assert.match(
  newtabWatermarkSolidStyle ? newtabWatermarkSolidStyle[0] : '',
  /-webkit-mask:\s*url\("\.\.\/\.\.\/assets\/images\/lumno-wordmark-mask\.svg"\) center \/ contain no-repeat;[\s\S]*?mask:\s*url\("\.\.\/\.\.\/assets\/images\/lumno-wordmark-mask\.svg"\) center \/ contain no-repeat;/,
  'newtab watermark should reuse the newtab solid-mask wordmark treatment for adaptive ink'
);
assert.match(
  html,
  /\.onboarding-shell:not\(\[data-active-slide="intro"\]\)\s+\.onboarding-newtab-watermark\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  'newtab watermark should only appear on the intro slide and leave later page-strip slides clean'
);
assert.match(
  html,
  /\.onboarding-shell\s*\{[\s\S]*?--onboarding-shell-padding-x:\s*clamp\(16px,\s*3\.4vw,\s*42px\);[\s\S]*?--onboarding-visual-max-width:\s*704px;[\s\S]*?--onboarding-visual-ratio:\s*704 \/ 680;[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*100vh;[\s\S]*?height:\s*100dvh;[\s\S]*?place-items:\s*center;[\s\S]*?overflow:\s*auto;[\s\S]*?\}/,
  'onboarding shell should center a responsive frame while constraining the right visual ratio'
);
assert.match(
  html,
  /\.onboarding-shell\s*\{[\s\S]*?--onboarding-shell-lift-y:\s*clamp\(14px,\s*2\.4vh,\s*24px\);[\s\S]*?padding:\s*max\([\s\S]*?calc\(var\(--onboarding-shell-padding-y\) - var\(--onboarding-shell-lift-y\)\),[\s\S]*?calc\(env\(safe-area-inset-top\) \+ 12px\)[\s\S]*?\)[\s\S]*?max\(var\(--onboarding-shell-padding-x\),\s*env\(safe-area-inset-right\)\)[\s\S]*?max\([\s\S]*?calc\(var\(--onboarding-shell-padding-y\) \+ var\(--onboarding-shell-lift-y\)\),[\s\S]*?calc\(env\(safe-area-inset-bottom\) \+ 12px\)[\s\S]*?\)[\s\S]*?max\(var\(--onboarding-shell-padding-x\),\s*env\(safe-area-inset-left\)\);[\s\S]*?\}/,
  'onboarding shell should keep its upward bias while clearing every viewport safe area'
);
assert.match(
  html,
  /@media \(max-height:\s*559px\) and \(min-width:\s*860px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?--onboarding-shell-lift-y:\s*0px;[\s\S]*?\}/,
  'very short onboarding layouts should disable the upward lift only after the frame-scale range is exhausted'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?--onboarding-shell-lift-y:\s*0px;[\s\S]*?place-items:\s*start center;[\s\S]*?\}/,
  'stacked onboarding layouts should start at the top without an extra upward lift'
);
assert.match(
  html,
  /\.onboarding-shell\s*\{[\s\S]*?--onboarding-visual-canvas-width:\s*704px;[\s\S]*?--onboarding-visual-canvas-height:\s*680px;[\s\S]*?--onboarding-visual-scale:\s*1;[\s\S]*?--onboarding-visual-rendered-width:\s*var\(--onboarding-visual-canvas-width\);[\s\S]*?\}/,
  'right-side visuals should define a fixed design panel whose rendered size and scale can be updated independently'
);
assert.match(
  html,
  /\.onboarding-shell\s*\{[\s\S]*?--onboarding-frame-width:\s*1240px;[\s\S]*?--onboarding-frame-height:\s*680px;[\s\S]*?--onboarding-frame-scale:\s*1;[\s\S]*?--onboarding-frame-rendered-width:\s*var\(--onboarding-frame-width\);[\s\S]*?--onboarding-frame-rendered-height:\s*var\(--onboarding-frame-height\);[\s\S]*?\}/,
  'onboarding should expose a fixed outer frame size that can scale proportionally before switching to vertical layout'
);
assert.match(
  html,
  /\.onboarding-shell\s*\{[\s\S]*?--onboarding-visual-rendered-height:\s*var\(--onboarding-visual-canvas-height\);[\s\S]*?\}/,
  'right-side visuals should expose the scaled panel height so stacked layouts reserve the actual rendered visual area'
);
assert.match(
  html,
  /\.onboarding-frame\s*\{[\s\S]*?position:\s*relative;[\s\S]*?width:\s*min\(1240px,\s*100%\);[\s\S]*?height:\s*min\(680px,\s*100%\);[\s\S]*?max-height:\s*680px;[\s\S]*?border:\s*0;[\s\S]*?overflow:\s*clip;[\s\S]*?grid-template-columns:\s*minmax\(340px,\s*1fr\) minmax\(var\(--onboarding-visual-min-width\),\s*var\(--onboarding-visual-max-width\)\);[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\);[\s\S]*?\}/,
  'onboarding frame should avoid hard edge borders while giving the fixed-ratio visual panel a bounded row'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\)[\s\S]*?\.onboarding-frame\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?grid-template-rows:\s*auto auto;[\s\S]*?\}[\s\S]*?\.visual-panel-slot\s*\{[\s\S]*?height:\s*var\(--onboarding-visual-rendered-height\);[\s\S]*?\}/,
  'narrow onboarding layouts should stack copy and the fixed-ratio visual panel vertically'
);
assert.match(
  html,
  /@media \(max-width:\s*1240px\) and \(min-width:\s*860px\), \(max-height:\s*760px\) and \(min-height:\s*560px\) and \(min-width:\s*860px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?padding:\s*0;[\s\S]*?grid-template-columns:\s*var\(--onboarding-frame-rendered-width\);[\s\S]*?grid-template-rows:\s*var\(--onboarding-frame-rendered-height\);[\s\S]*?place-content:\s*center;[\s\S]*?place-items:\s*start;[\s\S]*?overflow:\s*hidden;[\s\S]*?\}[\s\S]*?\.onboarding-frame\s*\{[\s\S]*?width:\s*var\(--onboarding-frame-width\);[\s\S]*?height:\s*var\(--onboarding-frame-height\);[\s\S]*?transform:\s*scale\(var\(--onboarding-frame-scale,\s*1\)\);[\s\S]*?transform-origin:\s*top left;[\s\S]*?\}/,
  'split-screen onboarding layouts should center a proportionally scaled rendered frame before switching to vertical layout'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?min-width:\s*760px;[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?grid-template-rows:\s*auto;[\s\S]*?padding:\s*0;[\s\S]*?place-items:\s*stretch;[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/,
  'very small split-screen onboarding layouts should enter compact vertical mode only after the frame-scale range is exhausted'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.onboarding-frame\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100dvh;[\s\S]*?border-radius:\s*0;[\s\S]*?box-shadow:\s*none;[\s\S]*?overflow:\s*hidden;[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?grid-template-rows:\s*minmax\(0,\s*1fr\) var\(--onboarding-visual-rendered-height\);[\s\S]*?\}/,
  'compact vertical onboarding should remove the outer card margins and reserve remaining height for the top copy area'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.copy-panel\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*?grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;[\s\S]*?align-content:\s*stretch;[\s\S]*?\}[\s\S]*?\.interaction-slots\s*\{[\s\S]*?align-self:\s*end;[\s\S]*?\}[\s\S]*?\.onboarding-copy-actions\s*\{[\s\S]*?align-self:\s*end;[\s\S]*?\}/,
  'compact vertical onboarding should keep a single-column top information flow that distributes across the available height'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.onboarding-newtab-watermark\s*\{[\s\S]*?top:\s*max\([\s\S]*?clamp\(32px,\s*4\.6vh,\s*44px\),[\s\S]*?calc\(env\(safe-area-inset-top\) \+ 12px\)[\s\S]*?\);[\s\S]*?width:\s*104px;[\s\S]*?height:\s*24px;[\s\S]*?opacity:\s*0\.54;[\s\S]*?transform:\s*none;[\s\S]*?\}[\s\S]*?\.onboarding-newtab-watermark__image\s*\{[\s\S]*?width:\s*104px;[\s\S]*?\}/,
  'compact intro layout should keep the Lumno wordmark separated from the title'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.onboarding-shell\[data-active-slide="intro"\]\s+\.copy-block\s*\{[\s\S]*?padding-top:\s*clamp\(18px,\s*3\.2vh,\s*34px\);[\s\S]*?\}/,
  'compact intro title group should sit lower to leave room for the Lumno wordmark'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.title\s*\{[\s\S]*?--title-base-size:\s*clamp\(27px,\s*5vh,\s*30px\);[\s\S]*?\}[\s\S]*?\.body-copy\s*\{[\s\S]*?font-size:\s*clamp\(13px,\s*2\.35vh,\s*14px\);[\s\S]*?line-height:\s*1\.42;[\s\S]*?\}/,
  'compact vertical onboarding should reduce type and copy rhythm before letting the page scroll'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.title-line--with-logo\s*\{[\s\S]*?gap:\s*0\.32em;[\s\S]*?\}[\s\S]*?\.title-logo-mark\s*\{[\s\S]*?width:\s*0\.96em;[\s\S]*?height:\s*0\.96em;[\s\S]*?filter:\s*drop-shadow\(0 5px 7px rgba\(56,\s*172,\s*248,\s*0\.34\)\);[\s\S]*?\}/,
  'compact intro title logo should keep more breathing room from the title text'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\), \(max-height:\s*559px\)[\s\S]*?\.visual-panel-slot\s*\{[\s\S]*?width:\s*100vw;[\s\S]*?height:\s*var\(--onboarding-visual-rendered-height\);[\s\S]*?align-self:\s*stretch;[\s\S]*?justify-self:\s*start;[\s\S]*?align-items:\s*end;[\s\S]*?justify-items:\s*center;[\s\S]*?background:\s*url\("\.\.\/\.\.\/assets\/wallpapers\/settings-bg-light-monet-newtab\.webp"\) center \/ cover no-repeat;[\s\S]*?overflow:\s*hidden;[\s\S]*?\}[\s\S]*?\.visual-panel\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?left:\s*50%;[\s\S]*?top:\s*auto;[\s\S]*?bottom:\s*0;[\s\S]*?margin-left:\s*calc\(var\(--onboarding-visual-canvas-width\) \* -0\.5\);[\s\S]*?margin-top:\s*0;[\s\S]*?transform-origin:\s*center bottom;[\s\S]*?\}/,
  'compact vertical visual slot should keep a complete fixed-ratio preview anchored to the bottom'
);
assert.match(
  html,
  /@media \(max-width:\s*859px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?--onboarding-stacked-copy-min-height:\s*588px;[\s\S]*?\}[\s\S]*?\.copy-panel\s*\{[\s\S]*?min-height:\s*var\(--onboarding-stacked-copy-min-height\);[\s\S]*?\}/,
  'stacked onboarding layouts should reserve a consistent left copy height based on the tallest normal stacked slide'
);
assert.match(
  html,
  /@media \(max-width:\s*380px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?--onboarding-stacked-copy-min-height:\s*638px;[\s\S]*?\}/,
  'small phone stacked layouts should reserve enough left copy height for wrapped actions'
);
assert.match(
  html,
  /@media \(max-width:\s*340px\)[\s\S]*?\.onboarding-shell\s*\{[\s\S]*?--onboarding-stacked-copy-min-height:\s*660px;[\s\S]*?\}/,
  'extra narrow stacked layouts should keep the left copy height consistent after longer labels wrap'
);
assert.match(
  html,
  /\.interaction-slots\[data-accordion="true"\]\s*\{[\s\S]*?min-height:\s*clamp\(150px,\s*32vh,\s*220px\);[\s\S]*?\}/,
  'accordion interaction area should compress on short viewports instead of pushing the left-panel actions out of frame'
);
assert.match(
  html,
  /\.\.\/shared\/tooltip\.css/,
  'onboarding should load the shared Lumno tooltip stylesheet'
);
[
  '../shared/settings.js',
  '../shared/search-utils.js',
  '../shared/site-search-store.js',
  '../shared/suggestion-action-model.js',
  '../shared/suggestion-navigation.js',
  '../shared/search-input-ui.js',
  '../shared/search-input-mode.js',
  '../overlay/runtime.js',
  '../overlay/search-panel.js'
].forEach((dependencyPath) => {
  assert.match(
    html,
    new RegExp(`<script src="${dependencyPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
    `onboarding should load ${dependencyPath} so the real search overlay can mount locally`
  );
});
assert.match(
  html,
  /\.shortcut-keycap\s*\{[\s\S]*?min-width:\s*24px;[\s\S]*?height:\s*24px;[\s\S]*?border:\s*2px solid #000;[\s\S]*?box-shadow:\s*0 2px 0 var\(--shortcut-keycap-shadow\);[\s\S]*?\}/,
  'shortcut label should render as lighter simulated keycaps with a square minimum size'
);
assert.match(
  html,
  /\.shortcut-label\s*\{[\s\S]*?vertical-align:\s*middle;[\s\S]*?transform:\s*translateY\(-2px\);[\s\S]*?\}/,
  'shortcut label should align the simulated keycaps with the surrounding text'
);
assert.match(
  script,
  /function renderShortcutLabel\(/,
  'onboarding should render shortcut labels as keycap tokens inside body copy'
);
assert.match(
  script,
  /function getBrowserLocale\(/,
  'onboarding should resolve its default locale through a dedicated browser-locale helper'
);
assert.match(
  script,
  /chromeApi\.i18n[\s\S]*?getUILanguage/,
  'system language mode should follow the browser UI language when Chrome exposes it'
);
assert.match(
  script,
  /stored && stored !== 'system'[\s\S]*?\? stored[\s\S]*?: getBrowserLocale\(\)/,
  'onboarding should let the Lumno language setting override system mode'
);
assert.match(
  script,
  /runtimeCopy = blueprint\.runtimeCopy/,
  'onboarding should use the localized runtime copy bundled with the resolved blueprint'
);
assert.match(
  script,
  /function triggerOnboardingSearchOverlay\(/,
  'onboarding should expose a local handler that opens the real search overlay from the configured shortcut'
);
assert.match(
  script,
  /shortcutHotkeyMatchesEvent\(currentShortcutValue,\s*event\)/,
  'onboarding should match keydown events against the browser-configured command shortcut'
);
assert.match(
  script,
  /function showActionButtonTooltip\(button\)/,
  'onboarding should show shared hover tooltips for configured action buttons'
);
assert.match(
  script,
  /const maxWidth = getActionButtonTooltipMaxWidth\(button\);[\s\S]*?actionTooltipController\.show\(button,\s*text,\s*\{[\s\S]*?placement:\s*'top'[\s\S]*?maxWidth,[\s\S]*?\}\)/,
  'action button tooltip should read max width from button attributes before showing the shared tooltip'
);
assert.match(
  script,
  /button\.dataset\.tooltip = tooltip;/,
  'rendered action buttons should receive data-tooltip text for the shared tooltip'
);
assert.match(
  script,
  /button\.dataset\.tooltipMaxWidth = String\(tooltipMaxWidth\);/,
  'rendered action buttons should receive data-tooltip-max-width when configured'
);
assert.match(
  script,
  /button\.removeAttribute\('data-tooltip'\);/,
  'action buttons without tooltip copy should not keep stale tooltip attributes'
);
assert.match(
  script,
  /button\.removeAttribute\('data-tooltip-max-width'\);/,
  'action buttons without configured tooltip width should not keep stale max-width attributes'
);
assert.match(
  script,
  /let expandedInteractionAccordionId = '';/,
  'onboarding should track which shared accordion row is expanded'
);
assert.match(
  script,
  /function createInteractionAccordionPanel\(slot,\s*isExpanded\)/,
  'onboarding should render expandable accordion panels for interaction rows'
);
assert.match(
  script,
  /function createInteractionAccordionChevron\(accordion\)/,
  'accordion rows should render their chevron as a shared trailing affordance'
);
assert.match(
  script,
  /function createInteractionAccordionTrigger\(slot\)[\s\S]*?trigger\.appendChild\(createInteractionLabel\(slot\)\);[\s\S]*?trigger\.appendChild\(createInteractionAccordionChevron\(slot\.accordion\)\);/,
  'accordion rows should keep the text and chevron in the same clickable trigger area'
);
assert.match(
  script,
  /trigger\.type = 'button';[\s\S]*?trigger\.dataset\.action = slot\.actionId;[\s\S]*?trigger\.dataset\.accordionId = getInteractionAccordionId\(slot\);[\s\S]*?trigger\.setAttribute\('aria-expanded', isExpanded \? 'true' : 'false'\);/,
  'accordion rows should put action and aria-expanded on the title trigger rather than the text panel'
);
assert.match(
  script,
  /if \(id === 'toggleInteractionAccordion'\)[\s\S]*?toggleInteractionAccordion\(target && target\.dataset && target\.dataset\.accordionId\);/,
  'clicking an accordion row should toggle by accordion id so only one content block opens at a time'
);
assert.match(
  script,
  /function navigateOnboardingToNewtab\(\)[\s\S]*?LumnoExtensionRoutes[\s\S]*?buildLumnoNewtabUrl[\s\S]*?focus:\s*true[\s\S]*?chromeApi\.runtime\.getURL\('src\/newtab\/lumno-newtab\.html\?focus=1'\)[\s\S]*?window\.location\.assign\(url\)/,
  'final start action should navigate the onboarding tab to the standalone focused Lumno newtab URL while preserving browser history'
);
assert.match(
  script,
  /if \(id === 'openNewtab'\)[\s\S]*?if \(navigateOnboardingToNewtab\(\)\)[\s\S]*?return;[\s\S]*?\}/,
  'openNewtab should try navigating the current onboarding tab before falling back to background tab creation'
);
assert.match(
  script,
  /function appendLinkedText\(target,\s*text,\s*links\)[\s\S]*?const actionId = String\(link && link\.actionId \|\| ''\)\.trim\(\);[\s\S]*?anchor\.className = 'interaction-accordion-link';[\s\S]*?anchor\.href = href;[\s\S]*?anchor\.dataset\.action = actionId;/,
  'accordion text should render configured phrases as action-backed links'
);
assert.match(
  script,
  /const accordionLinkTarget = event\.target && event\.target\.closest[\s\S]*?event\.target\.closest\('\.interaction-accordion-link\[data-action\]'\)[\s\S]*?if \(accordionLinkTarget\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?runExtensionAction\(accordionLinkTarget, event\);[\s\S]*?return;/,
  'accordion chrome links should use background actions instead of blocked direct chrome:// navigation'
);
assert.match(
  script,
  /if \(event\.target && event\.target\.closest && event\.target\.closest\('\.interaction-accordion-panel'\)\)\s*\{\s*return;\s*\}/,
  'clicking expanded accordion text should not toggle the accordion row'
);
assert.match(
  script,
  /\[primaryActionButton,\s*secondaryActionButton,\s*ghostActionButton\]\.forEach\(bindActionButtonTooltip\);/,
  'onboarding should bind hover tooltip handlers to every lower-left action button'
);
assert.match(
  script,
  /const bodyNote = document\.getElementById\('onboarding-body-note'\);/,
  'onboarding should cache the body note element for the focus-search shortcut hint'
);
assert.match(
  script,
  /bodyNote\.textContent = String\(slide\.copy\.note \|\| ''\);/,
  'onboarding should render optional copy notes below the subtitle'
);
assert.match(
  script,
  /function renderPageStrip\(/,
  'onboarding should render the in-panel page strip from state'
);
assert.match(
  script,
  /function syncOnboardingSlideParam\(index\)[\s\S]*?new URL\(window\.location\.href\)[\s\S]*?url\.searchParams\.set\('slide',\s*String\(safeIndex\)\)[\s\S]*?window\.history\.replaceState\(window\.history\.state,\s*'',\s*nextUrl\);/,
  'onboarding should sync the active slide into the current URL so refreshing keeps the same page'
);
assert.match(
  script,
  /function commitState\(nextState\)[\s\S]*?state = nextState;[\s\S]*?syncOnboardingSlideParam\(state\.index\);[\s\S]*?render\(\);/,
  'committing onboarding state should update the slide query parameter before rendering the new page'
);
assert.match(
  script,
  /pageStrip\.hidden\s*=\s*state\.index\s*<=\s*0;/,
  'in-panel page strip should stay hidden on the intro slide'
);
assert.doesNotMatch(html, /class="onboarding-footer"/, 'onboarding shell should not render bottom footer controls');
assert.doesNotMatch(html, /id="onboarding-progress-dots"/, 'onboarding shell should not render bottom progress dots');
assert.doesNotMatch(html, /data-onboarding-prev/, 'onboarding shell should not render bottom previous-page control');
assert.doesNotMatch(html, /data-onboarding-next/, 'onboarding shell should not render bottom next-page control');
assert.doesNotMatch(
  bodyStyle ? bodyStyle[0] : '',
  /settings-bg-light-monet-newtab\.webp|url\(/,
  'onboarding page body should not use a wallpaper image background'
);
assert.doesNotMatch(
  html,
  /--page-bg-image|--page-bg-tint/,
  'onboarding page body should not keep wallpaper-specific background variables'
);
assert.match(
  html,
  /--page-bg-fill-top:[^;]+;[\s\S]*?--page-bg-fill-bottom:[^;]+;/,
  'onboarding page should define neutral background fill stops'
);
assert.match(
  html,
  /linear-gradient\(180deg,\s*var\(--page-bg-fill-top\)[\s\S]*?var\(--page-bg-fill-bottom\)\s*100%\)/,
  'onboarding page should use a quiet neutral fill instead of an image'
);
assert.match(
  visualPanelStyle ? visualPanelStyle[0] : '',
  /settings-bg-light-monet-newtab\.webp/,
  'right-side fixed-ratio visual panel should keep the unblurred Monet wallpaper background'
);
assert.match(
  visualPanelSlotStyle ? visualPanelSlotStyle[0] : '',
  /width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?max-height:\s*100%;[\s\S]*?align-self:\s*stretch;[\s\S]*?display:\s*grid;[\s\S]*?align-items:\s*start;[\s\S]*?justify-items:\s*start;[\s\S]*?background:\s*transparent;[\s\S]*?overflow:\s*visible;/,
  'right-side visual slot should left-align the scaled fixed-ratio panel without drawing an unscaled wallpaper behind it'
);
assert.match(
  visualPanelStyle ? visualPanelStyle[0] : '',
  /width:\s*var\(--onboarding-visual-canvas-width\);[\s\S]*?height:\s*var\(--onboarding-visual-canvas-height\);[\s\S]*?aspect-ratio:\s*var\(--onboarding-visual-ratio\);[\s\S]*?background:\s*url\("\.\.\/\.\.\/assets\/wallpapers\/settings-bg-light-monet-newtab\.webp"\) center \/ cover no-repeat;[\s\S]*?overflow:\s*visible;[\s\S]*?transform:\s*scale\(var\(--onboarding-visual-scale,\s*1\)\);/,
  'right-side visual panel should be the single fixed-ratio surface that scales as a whole'
);
assert.doesNotMatch(
  newtabPreviewBrowserBackdropStyle ? newtabPreviewBrowserBackdropStyle[0] : '',
  /--onboarding-browser-final-filter:\s*blur\(/,
  'newtab browser preview should not blur the browser illustration itself'
);
assert.match(
  newtabPreviewBrowserPageBeforeStyle ? newtabPreviewBrowserPageBeforeStyle[0] : '',
  /content:\s*"";[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*1;[\s\S]*?backdrop-filter:\s*blur\([^)]*\)\s+saturate\([^)]*\);[\s\S]*?-webkit-backdrop-filter:\s*blur\([^)]*\)\s+saturate\([^)]*\);/,
  'newtab browser preview should place a backdrop-blur layer over the browser illustration'
);
assert.match(
  html,
  /\.newtab-preview-viewport\s*\{[\s\S]*?z-index:\s*2;/,
  'newtab browser preview content should render above the backdrop-blur layer'
);
assert.match(
  visualCanvasStyle ? visualCanvasStyle[0] : '',
  /position:\s*absolute;[\s\S]*?left:\s*0;[\s\S]*?top:\s*0;[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?isolation:\s*isolate;/,
  'right-side canvas contents should fill the fixed visual panel and inherit the panel-level scale'
);
assert.doesNotMatch(
  html,
  /class="visual-background"|--onboarding-visual-bg-blur|\.visual-background::before/,
  'generic right-side visual background should not be blurred across all onboarding pages'
);
assert.match(
  html,
  /\.interaction-slot\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?\}/,
  'auxiliary interaction rows should not render card borders or fills'
);
assert.match(
  html,
  /\.interaction-slots\s*\{[^}]*?gap:\s*12px;[^}]*?\}/,
  'auxiliary interaction rows should have more breathing room between rows'
);
assert.match(
  html,
  /\.copy-panel\s*\{[\s\S]*?grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;[\s\S]*?align-content:\s*stretch;[\s\S]*?\}/,
  'left copy panel should reserve a centered middle row and a bottom action row'
);
assert.match(
  html,
  /\.body-note\s*\{[\s\S]*?display:\s*block;[\s\S]*?margin-top:\s*10px;[\s\S]*?font-size:\s*14px;[\s\S]*?line-height:\s*1\.55;[\s\S]*?\}/,
  'shortcut change hint should render as a smaller second line below the subtitle'
);
assert.match(
  html,
  /\.body-note:empty\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  'empty body notes should not reserve space on slides without the shortcut hint'
);
assert.match(
  html,
  /\.page-strip\s*\{[\s\S]*?--page-strip-track:\s*rgba\(17,\s*24,\s*39,\s*0\.045\);[\s\S]*?--page-strip-active:\s*rgba\(17,\s*24,\s*39,\s*0\.14\);[\s\S]*?width:\s*min\(280px,\s*100%\);[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(var\(--page-strip-count,\s*4\),\s*minmax\(0,\s*1fr\)\);[\s\S]*?\}/,
  'second-and-later slides should render a shorter, lighter segmented page strip above the copy'
);
assert.match(
  html,
  /\.page-strip-segment\s*\{[\s\S]*?all:\s*unset;[\s\S]*?box-sizing:\s*border-box;[\s\S]*?height:\s*5px;[\s\S]*?cursor:\s*pointer;[\s\S]*?background:\s*var\(--page-strip-track\);[\s\S]*?\}/,
  'page strip segments should be thin clickable buttons with a soft gray track'
);
assert.match(
  html,
  /\.page-strip-segment\[data-active="true"\]\s*\{[\s\S]*?background:\s*var\(--page-strip-active\);[\s\S]*?\}/,
  'page strip should highlight only the active slide segment'
);
assert.match(
  html,
  /\.page-strip-segment:hover\s*\{[\s\S]*?background:\s*var\(--page-strip-hover\);[\s\S]*?\}/,
  'page strip segments should show a subtle hover state'
);
assert.match(
  html,
  /\.page-strip-segment\[data-active="true"\]:hover\s*\{[\s\S]*?background:\s*var\(--page-strip-active-hover\);[\s\S]*?\}/,
  'active page strip segment should keep a subtly stronger hover state'
);
assert.match(
  html,
  /\.page-strip-segment:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--page-strip-focus\);[\s\S]*?outline-offset:\s*3px;[\s\S]*?\}/,
  'page strip segments should expose a keyboard focus ring'
);
assert.match(
  html,
  /\.page-strip\[data-entering="true"\]\s*\{[\s\S]*?animation:\s*onboarding-page-strip-enter 360ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) both;[\s\S]*?\}/,
  'page strip should animate in when it appears after the intro page'
);
assert.match(
  html,
  /\.page-strip\[data-entering="true"\]\s+\.page-strip-segment\s*\{[\s\S]*?animation:\s*onboarding-page-strip-segment-enter 520ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) both;[\s\S]*?animation-delay:\s*calc\(80ms \+ var\(--page-strip-segment-index,\s*0\) \* 55ms\);[\s\S]*?\}/,
  'page strip segments should stagger their entrance instead of appearing all at once'
);
assert.match(
  html,
  /@keyframes onboarding-page-strip-enter[\s\S]*?@keyframes onboarding-page-strip-segment-enter/,
  'page strip entrance should define dedicated keyframes for the track and segments'
);
assert.match(
  script,
  /const wasPageStripHidden = pageStrip\.hidden;[\s\S]*?pageStrip\.dataset\.entering = wasPageStripHidden && !pageStrip\.hidden \? 'true' : 'false';/,
  'page strip should only mark itself entering when it changes from hidden to visible'
);
assert.match(
  script,
  /segment\.style\.setProperty\('--page-strip-segment-index', String\(pageIndex\)\);/,
  'page strip segments should expose an index for staggered animation delays'
);
assert.match(
  script,
  /const pageCount = Math\.max\(1,\s*blueprint\.slides\.length - 1\);[\s\S]*?const currentPageIndex = Math\.max\(0,\s*state\.index - 1\);/,
  'page strip should count the native focus search page as page one by excluding the intro slide'
);
assert.match(
  script,
  /for \(let pageIndex = 0; pageIndex < pageCount; pageIndex \+= 1\)[\s\S]*?const slideIndex = pageIndex \+ 1;[\s\S]*?const segment = document\.createElement\('button'\);[\s\S]*?segment\.type = 'button';[\s\S]*?segment\.dataset\.active = pageIndex === currentPageIndex \? 'true' : 'false';[\s\S]*?segment\.dataset\.slideTarget = String\(slideIndex\);[\s\S]*?segment\.setAttribute\('aria-label', formatRuntimeTemplate\([\s\S]*?getRuntimeMiscText\('pageSegmentAriaTemplate', 'Page \{page\}'\)[\s\S]*?\{ page: pageIndex \+ 1 \}/,
  'page strip should render labelled buttons whose page index maps to real slide indexes after the intro'
);
assert.match(
  script,
  /segment\.setAttribute\('aria-current', 'step'\);/,
  'active page strip segment should expose aria-current step'
);
assert.match(
  html,
  /\.interaction-slots\s*\{[\s\S]*?width:\s*max-content;[\s\S]*?max-width:\s*100%;[\s\S]*?align-self:\s*end;[\s\S]*?justify-self:\s*start;[\s\S]*?\}/,
  'auxiliary interaction rows should sit above the lower-left actions while aligning with the left copy edge'
);
assert.match(
  html,
  /\.interaction-slot\s*\{[\s\S]*?grid-template-columns:\s*18px minmax\(0,\s*1fr\);[\s\S]*?\}/,
  'auxiliary interaction rows should reserve a compact icon column before the text'
);
assert.match(
  html,
  /\.interaction-row-icon\s*\{[\s\S]*?color:\s*var\(--page-muted\);[\s\S]*?font-size:\s*16px;[\s\S]*?\}/,
  'auxiliary interaction row icons should stay inline and muted'
);
assert.match(
  html,
  /\.interaction-label\s*\{[\s\S]*?color:\s*var\(--page-muted\);[\s\S]*?font-weight:\s*400;[\s\S]*?\}/,
  'auxiliary interaction row text should be muted regular copy'
);
assert.match(
  html,
  /\.interaction-copy--with-info\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?gap:\s*4px;[\s\S]*?\}/,
  'interaction rows with info should keep the info affordance immediately after the row text'
);
assert.match(
  html,
  /\.interaction-info-button\s*\{[\s\S]*?width:\s*20px;[\s\S]*?height:\s*20px;[\s\S]*?border-radius:\s*999px;[\s\S]*?\}/,
  'compatibility info should render as a compact circular info affordance'
);
assert.match(
  html,
  /\.interaction-info-button:hover\s*\{[\s\S]*?color:\s*var\(--page-ink\);[\s\S]*?\}/,
  'compatibility info affordance should follow Lumno hover styling'
);
assert.doesNotMatch(
  html,
  /\.interaction-info-button:hover\s*\{[^}]*transform:\s*translateY\(-1px\);[^}]*\}/,
  'info affordances should not move upward on hover'
);
assert.doesNotMatch(
  html,
  /\.interaction-info-button\s*\{[^}]*transform 140ms ease;[^}]*\}/,
  'info affordance transitions should not include hover movement'
);
assert.match(
  html,
  /\.interaction-link-button\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?text-decoration:\s*none;[\s\S]*?\}/,
  'interaction link affordances should look like info buttons while behaving as links'
);
assert.match(
  html,
  /\.browser-avatar-group\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?vertical-align:\s*middle;[\s\S]*?\}/,
  'browser support tooltip should render browser avatars inline inside the floating surface'
);
assert.match(
  html,
  /\.browser-avatar\s*\{[\s\S]*?width:\s*22px;[\s\S]*?height:\s*22px;[\s\S]*?flex:\s*0 0 22px;[\s\S]*?border-radius:\s*999px;[\s\S]*?\}/,
  'browser avatars should stay compact'
);
assert.match(
  html,
  /\.browser-avatar-image\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover;[\s\S]*?\}/,
  'browser avatars should render image assets inside clipped circles'
);
assert.match(
  html,
  /\.browser-avatar-ellipsis\s*\{[\s\S]*?margin-left:\s*3px;[\s\S]*?font-size:\s*16px;[\s\S]*?\}/,
  'browser support tooltip should show a compact ellipsis after the avatars'
);
assert.match(
  script,
  /function createBrowserAvatarGroup\(/,
  'onboarding should render the browser row with a dedicated inline avatar group'
);
assert.match(
  script,
  /function createBrowserAvatar\(/,
  'onboarding should render each browser as a dedicated avatar element'
);
assert.match(
  script,
  /browser-avatar-image/,
  'browser avatar renderer should use image assets rather than inline browser paths'
);
assert.match(
  script,
  /browser-avatar--comet/,
  'browser avatar renderer should include Comet'
);
assert.match(
  script,
  /function createInteractionRowIcon\(/,
  'onboarding should render requested row icons with a dedicated helper'
);
assert.match(
  script,
  /function createInteractionInfoButton\(/,
  'onboarding should render compatibility row info affordance with a dedicated helper'
);
assert.match(
  script,
  /function createInteractionLinkButton\(/,
  'onboarding should render trust row GitHub affordance with a dedicated link helper'
);
assert.match(
  content,
  /githubTooltip:\s*'以 GPL-3\.0 许可证开源，点击访问 GitHub 仓库'[\s\S]*?icon:\s*'ri-github-fill'[\s\S]*?tooltip:\s*rows\.githubTooltip/,
  'trust row should use the filled Remix GitHub icon and precise GPL tooltip copy'
);
assert.match(
  script,
  /function showOnboardingInfoTooltip\(/,
  'onboarding should show shared Lumno tooltips for info affordances'
);
assert.match(
  script,
  /LumnoTooltip\.createController/,
  'onboarding should use the shared Lumno tooltip controller'
);
assert.match(
  script,
  /className:\s*'onboarding-info-tooltip'/,
  'onboarding info tooltips should declare a component class for local styling'
);
assert.doesNotMatch(
  html,
  /\.onboarding-info-tooltip\s+\._x_extension_tooltip_line_2026_unique_\s*\+\s*\._x_extension_tooltip_line_2026_unique_\s*\{[\s\S]*?margin-top:\s*6px;[\s\S]*?\}/,
  'onboarding should rely on the shared tooltip component for multiline text spacing'
);
assert.match(
  script,
  /copy\.appendChild\(createInteractionInfoButton\(slot\.infoTooltip,\s*slot\.browserAvatars\)\);/,
  'browser support row should pass avatar metadata into its info tooltip affordance'
);
assert.match(
  script,
  /copy\.appendChild\(createInteractionLinkButton\(slot\.linkButton\)\);/,
  'trust row should append the GitHub link affordance immediately after the row text'
);
assert.match(
  html,
  /\.onboarding-copy-actions\[data-visible="true"\]\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?\}/,
  'slides with configured lower-left actions should reveal the action row'
);
assert.match(
  html,
  /class="onboarding-action-button onboarding-action-button--primary"[^>]*data-action="next"[\s\S]*?<span>Get started<\/span>[\s\S]*?ri-arrow-right-line/,
  'initial primary lower-left action should have an English fallback before localized rendering'
);
assert.match(
  getCssRule('.onboarding-action-button'),
  /border:\s*1px solid var\(--onboarding-action-border-color,\s*transparent\);[\s\S]*?background:\s*var\(--onboarding-action-bg,\s*transparent\);[\s\S]*?background-clip:\s*padding-box;[\s\S]*?box-shadow:\s*var\(--onboarding-action-shadow,\s*none\);/,
  'onboarding action button base should own the structural border, background, and shadow layers'
);
assert.match(
  getCssRule('.onboarding-action-button::before'),
  /box-shadow:\s*var\(--onboarding-action-before-shadow,\s*none\);/,
  'onboarding action button base should own the shared pseudo highlight layer'
);
assert.match(
  getCssRule('.onboarding-action-button:hover'),
  /background:\s*var\(--onboarding-action-hover-bg,\s*var\(--onboarding-action-bg,\s*transparent\)\);[\s\S]*?border-color:\s*var\(--onboarding-action-hover-border-color,\s*var\(--onboarding-action-border-color,\s*transparent\)\);[\s\S]*?color:\s*var\(--onboarding-action-hover-color,\s*var\(--onboarding-action-color,\s*var\(--page-ink\)\)\);[\s\S]*?box-shadow:\s*var\(--onboarding-action-hover-shadow,\s*var\(--onboarding-action-shadow,\s*none\)\);/,
  'onboarding action button base should consume shared hover variables for every variant'
);
assert.match(
  getCssRule('.onboarding-action-button:focus-visible'),
  /outline:\s*var\(--onboarding-action-focus-outline,\s*2px solid rgba\(37,\s*99,\s*235,\s*0\.46\)\);[\s\S]*?outline-offset:\s*var\(--onboarding-action-focus-outline-offset,\s*3px\);/,
  'onboarding action focus should be controlled through shared action button variables'
);
assert.match(
  getCssRule('.onboarding-action-button--primary'),
  /--onboarding-action-border-color:\s*#040404;[\s\S]*?--onboarding-action-before-shadow:\s*inset 0 1px 1\.6px rgba\(255,\s*255,\s*255,\s*0\.34\);[\s\S]*?--onboarding-action-focus-outline:\s*none;[\s\S]*?--onboarding-action-focus-outline-offset:\s*0;/,
  'onboarding primary actions should use the shared border layer for the single black ring and disable the extra focus outline through variables'
);
assert.ok(
  !/(?:^|\n)\s*\.onboarding-action-button--primary:focus-visible\s*\{/.test(html),
  'onboarding primary actions should not need a separate focus-visible patch'
);
assert.ok(
  !/(?:^|\n)\s*\.onboarding-action-button--primary::before\s*\{/.test(html),
  'onboarding primary actions should use the shared button pseudo-element instead of a variant pseudo-element'
);
['primary', 'secondary', 'ghost'].forEach((variant) => {
  assert.ok(
    !new RegExp(`(?:^|\\n)\\s*\\.onboarding-action-button--${variant}:hover\\s*\\{`).test(html),
    `onboarding ${variant} hover should be controlled by variant tokens consumed by the shared button hover rule`
  );
});
const darkPrimaryActionRule = html.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*\.onboarding-action-button--primary\s*\{([\s\S]*?)\}\s*\.onboarding-action-button--secondary\s*\{/);
assert.ok(darkPrimaryActionRule, 'dark onboarding primary action rule should exist');
assert.match(
  darkPrimaryActionRule[1],
  /--onboarding-action-bg:\s*linear-gradient\(180deg,\s*#4a566c 0%,\s*#334157 100%\);[\s\S]*?--onboarding-action-color:\s*#f8fafc;[\s\S]*?--onboarding-action-hover-bg:\s*linear-gradient\(180deg,\s*#56647c 0%,\s*#3a4b66 100%\);/,
  'dark onboarding primary actions should only swap primary color tokens'
);
assert.doesNotMatch(
  darkPrimaryActionRule[1],
  /--onboarding-action-border-color|--onboarding-action-shadow|--onboarding-action-before-shadow|box-shadow:/,
  'dark onboarding primary actions should not redefine structure, rings, shadows, or highlights'
);
const darkSecondaryActionRule = html.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*\.onboarding-action-button--primary\s*\{[\s\S]*?\}\s*\.onboarding-action-button--secondary\s*\{([\s\S]*?)\}\s*\.onboarding-action-button--ghost\s*\{/);
assert.ok(darkSecondaryActionRule, 'dark onboarding secondary action rule should exist');
assert.doesNotMatch(
  darkSecondaryActionRule[1],
  /#ffffff|#1f2937|inset 0 1px/,
  'dark onboarding secondary actions should not reuse the light surface or keep an inner top highlight'
);
const secondaryActionHtml = html.match(/<button class="onboarding-action-button onboarding-action-button--secondary"[^>]*data-action="prev"[^>]*hidden[\s\S]*?<\/button>/);
assert.ok(secondaryActionHtml, 'initial secondary lower-left action should stay hidden until content config reveals it');
assert.match(
  secondaryActionHtml[0],
  /<span>Back<\/span>/,
  'initial secondary lower-left action should have an English fallback before localized rendering'
);
assert.doesNotMatch(
  secondaryActionHtml[0],
  /<i\b|ri-arrow-left-line/,
  'secondary lower-left actions should not render a template icon'
);
assert.match(
  html,
  /class="onboarding-action-button onboarding-action-button--ghost"[^>]*data-action="openShortcuts"[^>]*hidden[\s\S]*?<span>Change shortcut<\/span>[\s\S]*?ri-external-link-line/,
  'shortcut action should have an English fallback until localized rendering reveals it'
);
assert.match(
  content,
  /shortcutActionTooltip:\s*'由于浏览器的限制，请在 扩展程序\/键盘快捷键 页面修改插件的所有快捷键，点击前往'[\s\S]*?changeShortcut:\s*'更换快捷键'[\s\S]*?actionId:\s*'openShortcuts'[\s\S]*?label:\s*actions\.changeShortcut[\s\S]*?tooltip:\s*text\.setup\.shortcutActionTooltip[\s\S]*?tooltipMaxWidth:\s*260/,
  'shortcut action should expose the requested label, tooltip copy, and narrower tooltip width'
);
assert.doesNotMatch(
  content,
  /如需更换快捷键，可前往「浏览器快捷键」设置，在该页找到 Lumno。/,
  'focus search page should no longer include the old inline shortcut-change note'
);
assert.match(
  content,
  /function createSetupRows\(text\)[\s\S]*?accordionId:\s*'dia-browser'[\s\S]*?text:\s*text\.setup\.diaText[\s\S]*?label:\s*text\.setup\.shortcutsLink[\s\S]*?href:\s*SHORTCUTS_PAGE_URL[\s\S]*?actionId:\s*'openShortcuts'[\s\S]*?accordionId:\s*'local-file-search'[\s\S]*?text:\s*text\.setup\.localFileText[\s\S]*?label:\s*text\.setup\.detailsLink[\s\S]*?href:\s*EXTENSION_DETAILS_URL[\s\S]*?actionId:\s*'openExtensionDetails'[\s\S]*?id:\s*'setup'[\s\S]*?interactionRows:\s*createSetupRows\(text\)/,
  'focus search page should expose two shared accordion rows with linked accordion phrases'
);
assert.match(
  html,
  /\.interaction-slots\[data-accordion="true"\]\s*\{[\s\S]*?min-height:\s*clamp\(150px,\s*32vh,\s*220px\);[\s\S]*?align-content:\s*end;[\s\S]*?\}/,
  'shared accordion rows should reserve flexible room and grow upward from above the action row'
);
assert.match(
  html,
  /\.interaction-accordion-trigger\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?\}/,
  'accordion title triggers should expose the pointer affordance'
);
assert.match(
  html,
  /\.interaction-accordion-trigger\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?gap:\s*4px;[\s\S]*?\}/,
  'accordion rows should keep the label and chevron beside each other'
);
assert.match(
  html,
  /\.interaction-accordion-chevron\s*\{[\s\S]*?transition:\s*transform 180ms ease;[\s\S]*?\}/,
  'accordion chevrons should rotate smoothly when expanded'
);
assert.match(
  html,
  /\.interaction-slot--accordion\[data-expanded="true"\]\s+\.interaction-accordion-chevron\s*\{[\s\S]*?transform:\s*rotate\(-90deg\);[\s\S]*?\}/,
  'accordion chevrons should rotate to indicate the expanded state'
);
assert.match(
  html,
  /\.interaction-accordion-panel\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?display:\s*grid;[\s\S]*?grid-template-rows:\s*0fr;[\s\S]*?transition:\s*grid-template-rows 220ms ease;[\s\S]*?\}/,
  'accordion panels should collapse and expand in the normal row flow'
);
assert.match(
  html,
  /\.interaction-accordion-panel\s*\{[\s\S]*?cursor:\s*default;[\s\S]*?\}/,
  'expanded accordion text should not present itself as a clickable target'
);
assert.match(
  html,
  /\.interaction-slot--accordion\[data-expanded="true"\]\s+\.interaction-accordion-panel\s*\{[\s\S]*?grid-template-rows:\s*1fr;[\s\S]*?\}/,
  'expanded accordion rows should open their panel inside the shared component'
);
assert.match(
  html,
  /\.interaction-accordion-text\s*\{[\s\S]*?white-space:\s*pre-line;[\s\S]*?\}/,
  'accordion text should preserve line breaks'
);
assert.match(
  html,
  /\.interaction-accordion-link\s*\{[\s\S]*?color:\s*var\(--page-ink\);[\s\S]*?text-decoration:\s*underline;[\s\S]*?\}/,
  'accordion inline links should be visually distinguishable inside the expanded text'
);
assert.match(
  html,
  /\.t-panel-slide\s*\{[\s\S]*?transition:[\s\S]*?transform var\(--panel-close-dur\) var\(--panel-ease\)[\s\S]*?opacity\s+var\(--panel-close-dur\) var\(--panel-ease\)[\s\S]*?filter\s+var\(--panel-close-dur\) var\(--panel-ease\)[\s\S]*?\}/,
  'accordion text should use the shared panel reveal transition'
);
assert.doesNotMatch(
  html,
  /interaction-disclosure/,
  'accordion styles should not keep Dia-specific disclosure selectors'
);
assert.match(
  script,
  /panel\.className = 'interaction-accordion-panel';[\s\S]*?textNode\.className = 'interaction-accordion-text t-panel-slide';[\s\S]*?textNode\.dataset\.open = isExpanded \? 'true' : 'false';/,
  'accordion text should stay mounted and reveal via a data-open transition state'
);
assert.match(
  content,
  /id:\s*'search'[\s\S]*?primary:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'next'[\s\S]*?label:\s*actions\.next[\s\S]*?icon:\s*'ri-arrow-right-line'[\s\S]*?\}\)/,
  'newtab preview page should expose the lower-left next action'
);
assert.doesNotMatch(
  content,
  /id:\s*'search'[\s\S]*?secondary:\s*Object\.freeze\(\{[\s\S]*?label:\s*'返回'[\s\S]*?\}\)/,
  'newtab preview page should not expose the return action'
);
assert.match(
  content,
  /id:\s*'search'[\s\S]*?actions:\s*Object\.freeze\(\{\s*primary:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'next'[\s\S]*?label:\s*actions\.next[\s\S]*?icon:\s*'ri-arrow-right-line'[\s\S]*?\}\)\s*\}\)\s*\}\),\s*Object\.freeze\(\{\s*id:\s*'newtab'/,
  'newtab preview page should not expose the site list ghost action'
);
assert.match(
  content,
  /id:\s*'newtab'[\s\S]*?title:\s*text\.newtab\.title[\s\S]*?body:\s*text\.newtab\.body[\s\S]*?primary:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'next'[\s\S]*?label:\s*actions\.next[\s\S]*?icon:\s*'ri-arrow-right-line'[\s\S]*?\}\)[\s\S]*?ghost:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'openSiteSearchOptions'[\s\S]*?label:\s*text\.newtab\.supportList[\s\S]*?icon:\s*'ri-external-link-line'[\s\S]*?tooltip:\s*text\.newtab\.supportTooltip[\s\S]*?\}\)/,
  'page after newtab preview should expose the site search copy, next action, and right-aligned support list ghost action'
);
assert.match(
  content,
  /newtab:\s*Object\.freeze\(\{[\s\S]*?title:\s*'AI \/ 站内搜索一键直达'[\s\S]*?body:\s*'输入关键词，按下 Tab，直接搜索站点内结果。'/,
  'page after newtab preview should use the requested site-search title and subtitle'
);
assert.match(
  content,
  /id:\s*'newtab'[\s\S]*?visualKind:\s*'site-search-demo-surface'[\s\S]*?visualVisible:\s*true/,
  'page after newtab preview should render the site-search demo illustration on the right side'
);
assert.match(
  html,
  /\.visual-stage\[data-visual-kind="site-search-demo-surface"\]\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?\}/,
  'site-search demo surface should use the same open right-side visual stage treatment'
);
assert.match(
  html,
  /\.site-search-demo-surface\s*\{[\s\S]*?animation:\s*onboarding-newtab-preview-enter 760ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\) 140ms both;[\s\S]*?\}/,
  'site-search demo surface should enter with the existing newtab visual transition'
);
assert.match(
  html,
  /\.site-search-demo-card\s+\.x-lumno-search-input__container\s*\{[\s\S]*?border-radius:\s*28px 28px 0 0;[\s\S]*?\}/,
  'site-search demo cards should reuse the Lumno search input shell geometry'
);
assert.match(
  html,
  /\.ri-icon\s*\{[\s\S]*?width:\s*var\(--ri-size,\s*16px\);[\s\S]*?height:\s*var\(--ri-size,\s*16px\);[\s\S]*?font-size:\s*var\(--ri-size,\s*16px\);[\s\S]*?\}[\s\S]*?\.ri-size-16\s*\{\s*--ri-size:\s*16px;\s*\}/,
  'onboarding should define the same Remix icon sizing primitives as the extension surfaces'
);
assert.match(
  html,
  /\.site-search-demo-stack\s*\{[\s\S]*?width:\s*min\(620px,\s*100%\);[\s\S]*?gap:\s*30px;[\s\S]*?\}/,
  'site-search demo cases should use a compact stacked overlay layout'
);
assert.match(
  html,
  /\.site-search-demo-card\s*\{[\s\S]*?--site-search-demo-tab-hint-delay:\s*1500ms;[\s\S]*?--site-search-demo-mode-switch-delay:\s*2320ms;[\s\S]*?--site-search-demo-prompt-type-delay:\s*2620ms;[\s\S]*?--site-search-demo-results-delay:\s*3460ms;[\s\S]*?--site-search-demo-row-delay:\s*3620ms;/,
  'site-search demo should wait after trigger typing and the Tab hint before switching into provider mode'
);
assert.match(
  html,
  /\.site-search-demo-query-token\s*\{[\s\S]*?max-width:\s*var\(--typed-width,\s*calc\(10ch \+ var\(--typed-width-buffer,\s*0\.65em\)\)\);[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/,
  'site-search demo typed text should keep enough final width for punctuation and the caret'
);
assert.match(
  html,
  /\.site-search-demo-query-token--trigger\s*\{[\s\S]*?site-search-demo-trigger-exit 220ms[\s\S]*?calc\(var\(--case-delay,\s*0ms\) \+ var\(--site-search-demo-mode-switch-delay\)\)/,
  'site-search demo trigger text should remain visible until after the Tab hint pause'
);
assert.match(
  html,
  /\.site-search-demo-query-token--trigger \.onboarding-typing-char\s*\{[\s\S]*?animation-delay:\s*calc\(var\(--case-delay,\s*0ms\) \+ 620ms \+ var\(--typing-char-delay,\s*0ms\)\);[\s\S]*?\}/,
  'site-search demo trigger text should reveal character-by-character without clipping glyphs'
);
assert.match(
  html,
  /\.site-search-demo-tab-hint\s*\{[\s\S]*?animation:\s*site-search-demo-tab-hint-cycle 1120ms[\s\S]*?calc\(var\(--case-delay,\s*0ms\) \+ var\(--site-search-demo-tab-hint-delay\)\)/,
  'site-search demo Tab hint should appear after trigger typing and hold before mode switch'
);
assert.match(
  html,
  /\.site-search-demo-mode-prefix\s*\{[\s\S]*?animation:\s*site-search-demo-prefix-enter 300ms[\s\S]*?calc\(var\(--case-delay,\s*0ms\) \+ var\(--site-search-demo-mode-switch-delay\)\)/,
  'site-search demo should enter provider mode after the Tab hint pause'
);
assert.match(
  html,
  /\.site-search-demo-query-token--prompt \.onboarding-typing-char\s*\{[\s\S]*?animation-delay:\s*calc\(var\(--case-delay,\s*0ms\) \+ var\(--site-search-demo-prompt-type-delay\) \+ var\(--typing-char-delay,\s*0ms\)\);[\s\S]*?\}/,
  'site-search demo should type the provider query after switching mode'
);
assert.match(
  html,
  /@keyframes onboarding-type-character-reveal[\s\S]*?max-width:\s*var\(--typing-char-width,\s*1\.35em\);/,
  'typed characters should appear whole instead of revealing by clipping the middle of a glyph'
);
assert.match(
  html,
  /\.onboarding-typing-char\s*\{[\s\S]*?animation:\s*onboarding-type-character-reveal 16ms linear forwards;[\s\S]*?\}/,
  'typed character reveal should retain the visible end state after each character appears'
);
assert.match(
  html,
  /\.site-search-demo-results\s*\{[\s\S]*?--x-ov-suggestions-max-height:\s*76px;[\s\S]*?\}/,
  'site-search demo result areas should stay compact instead of stretching the panels'
);
assert.match(
  html,
  /\.site-search-demo-results\s*\{[\s\S]*?animation:\s*onboarding-overlay-results-reveal 980ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)[\s\S]*?\}/,
  'site-search demo results should reuse the first search page result reveal timing'
);
assert.match(
  html,
  /\.site-search-demo-result\s*\{[\s\S]*?animation:\s*onboarding-overlay-row-enter 500ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)[\s\S]*?\}/,
  'site-search demo highlighted result should reuse the first search page row transition'
);
assert.match(
  content,
  /siteSearchDemo:\s*Object\.freeze\(\{[\s\S]*?kind:\s*'site'[\s\S]*?modeLabel:\s*'GitHub'[\s\S]*?resultTitle:\s*'在 GitHub 中搜索 "lumno extension"'[\s\S]*?actionLabel:\s*'在 GitHub 中搜索'[\s\S]*?kind:\s*'ai'[\s\S]*?modeLabel:\s*'ChatGPT'[\s\S]*?promptQuery:\s*'这个 PR 有哪些隐藏风险？'[\s\S]*?resultTitle:\s*'向 ChatGPT 提问 "这个 PR 有哪些隐藏风险？"'[\s\S]*?actionLabel:\s*'打开 ChatGPT 网页版'/,
  'site-search demo should define one regular site-search case and one AI case'
);
const siteSearchDemoCasesBlock = content.match(/siteSearchDemo:\s*Object\.freeze\(\{[\s\S]*?cases:\s*Object\.freeze\(\[[\s\S]*?\n\s*\]\)[\s\S]*?\n\s*\}\)/);
assert.ok(siteSearchDemoCasesBlock, 'site-search demo cases block should be easy to inspect');
assert.doesNotMatch(
  siteSearchDemoCasesBlock ? siteSearchDemoCasesBlock[0] : '',
  /actionKey:/,
  'site-search demo cases should not define an Enter keycap for the highlighted result'
);
assert.doesNotMatch(
  siteSearchDemoCasesBlock ? siteSearchDemoCasesBlock[0] : '',
  /resultDetail:/,
  'site-search demo cases should not define URL detail text that the real site-search result does not render'
);
assert.doesNotMatch(
  siteSearchDemoCasesBlock ? siteSearchDemoCasesBlock[0] : '',
  /总结这篇文章|为什么首屏加载慢/,
  'site-search demo AI case should use a more concrete and interesting question'
);
assert.match(
  content,
  /brandAccentRgb:\s*Object\.freeze\(\[36,\s*41,\s*46\]\)[\s\S]*?brandAccentRgb:\s*Object\.freeze\(\[16,\s*163,\s*127\]\)/,
  'site-search demo should start from the same provider brand accents as the real theme code'
);
assert.match(
  script,
  /function normalizeSiteSearchDemoAccentRgb\([\s\S]*?luminance < 0\.12[\s\S]*?mixNewtabPreviewColor\(accentRgb,\s*\[255,\s*255,\s*255\],\s*0\.55\)/,
  'site-search demo should normalize very dark brand accents like the real theme code'
);
assert.doesNotMatch(
  script,
  /resultTag:\s*'站内搜索'|resultTag:\s*'AI'/,
  'site-search demo result rows should not include source tags that the real site-search result does not render'
);
const siteSearchDemoResultBlock = script.match(/function createSiteSearchDemoResult\(item\) \{[\s\S]*?\n  \}\n\n  function createSiteSearchDemoCase/);
assert.ok(siteSearchDemoResultBlock, 'site-search demo result renderer should be easy to inspect');
assert.match(
  siteSearchDemoResultBlock ? siteSearchDemoResultBlock[0] : '',
  /visitButton\.className = 'x-ov-suggestion-action-button x-ov-suggestion-visit-button';[\s\S]*?visitButton\.dataset\.visible = 'true';[\s\S]*?appendInlineLabelWithIcon\(visitButton,\s*item\.actionLabel,\s*'ri-arrow-right-line ri-size-12'\);/,
  'site-search demo highlighted result should render the real visit button label with an arrow icon'
);
assert.doesNotMatch(
  siteSearchDemoResultBlock ? siteSearchDemoResultBlock[0] : '',
  /createLumnoOverlayActionTag|x-ov-action-tag__key|actionKey|Enter/,
  'site-search demo highlighted result should not render a keyboard action tag'
);
assert.match(
  siteSearchDemoResultBlock ? siteSearchDemoResultBlock[0] : '',
  /if \(item\.resultDetail\) \{[\s\S]*?className = 'x-ov-suggestion-url-line';[\s\S]*?textWrapper\.appendChild\(detail\);[\s\S]*?\}/,
  'site-search demo should only render URL detail rows when explicitly configured'
);
const siteSearchDemoInputBlock = script.match(/function createSiteSearchDemoInput\(item\) \{[\s\S]*?\n  \}\n\n  function createSiteSearchDemoResult/);
assert.ok(siteSearchDemoInputBlock, 'site-search demo input renderer should be easy to inspect');
assert.match(
  siteSearchDemoInputBlock ? siteSearchDemoInputBlock[0] : '',
  /searchIcon\.appendChild\(createIcon\('ri-search-line ri-size-16'\)\);/,
  'site-search demo input should use the same 16px search icon as the shared search input component'
);
assert.match(
  siteSearchDemoInputBlock ? siteSearchDemoInputBlock[0] : '',
  /rightIcon\.appendChild\(createIcon\('ri-settings-line ri-size-16'\)\);/,
  'site-search demo input should use the same settings icon as the shared search input component'
);
assert.doesNotMatch(
  siteSearchDemoInputBlock ? siteSearchDemoInputBlock[0] : '',
  /ri-settings-3-line/,
  'site-search demo input should not use the suggestion command settings icon'
);
assert.match(
  script,
  /function createSiteSearchDemoCase\(/,
  'site-search demo should render each stacked case through a shared helper'
);
assert.match(
  script,
  /function createSiteSearchDemoSurface\([\s\S]*?getSiteSearchDemoCases\(\)\.forEach\(/,
  'site-search demo surface should render the two configured cases vertically'
);
assert.doesNotMatch(
  script,
  /function createSiteSearchDemoSurface\(\)\s*\{(?:(?!function createDemoCursorSvg)[\s\S])*createBrowserWindowClip/,
  'site-search demo should not include a background browser illustration'
);
assert.doesNotMatch(
  script,
  /site-search-demo-card-header|site-search-demo-card-marker|site-search-demo-card-label/,
  'site-search demo cases should not render extra top-left card labels'
);
assert.doesNotMatch(
  html,
  /site-search-demo-browser|site-search-demo-card-header|site-search-demo-card-marker|site-search-demo-card-label/,
  'site-search demo CSS should not keep the removed browser illustration or card labels'
);
assert.match(
  script,
  /if \(item && item\.kind === 'ai'\) \{[\s\S]*?createSiteSearchDemoProviderIcon\(item,\s*'site-search-demo-mode-prefix__icon'\)/,
  'site-search demo prefix should only show the provider icon for AI providers like the real input mode'
);
assert.match(
  script,
  /label\.textContent = formatRuntimeTemplate\([\s\S]*?getRuntimeSection\('siteSearchDemo'\)\.tabHintTemplate[\s\S]*?\{ provider: item\.modeLabel \|\| item\.label \|\| '' \}/,
  'site-search demo tab hint should use the same copy shape as the real input mode'
);
assert.match(
  html,
  /\.site-search-demo-result\[data-active="true"\]\s*\{[\s\S]*?background:\s*var\(--x-ov-suggestion-row-bg,[\s\S]*?border-color:\s*var\(--x-ov-suggestion-row-border,[\s\S]*?\}/,
  'site-search demo active rows should use provider theme variables instead of hard-coded blue or green'
);
assert.match(
  script,
  /--x-ov-suggestion-action-button-bg[\s\S]*?--x-ov-suggestion-action-button-text[\s\S]*?--x-ov-suggestion-action-button-border/,
  'site-search demo should pass provider theme variables into the real visit button palette'
);
assert.match(
  html,
  /\.site-search-demo-result \.x-ov-suggestion-action-button\s*\{[\s\S]*?display:\s*none;[\s\S]*?background:\s*var\(--x-ov-suggestion-action-button-bg,[\s\S]*?color:\s*var\(--x-ov-suggestion-action-button-text,[\s\S]*?\}[\s\S]*?\.site-search-demo-result \.x-ov-suggestion-action-button\[data-visible="true"\]\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?\}[\s\S]*?\.site-search-demo-result \.x-ov-suggestion-visit-button\s*\{[\s\S]*?border:\s*1px solid var\(--x-ov-suggestion-action-button-border,[\s\S]*?border-radius:\s*16px;/,
  'site-search demo should style the arrow visit button using the real overlay button classes'
);
assert.match(
  script,
  /slide\.visual\.kind === 'site-search-demo-surface'[\s\S]*?visualStage\.appendChild\(createSiteSearchDemoSurface\(\)\)/,
  'visual renderer should mount the site-search demo surface on the fourth page'
);
assert.match(
  content,
  /id:\s*'finish'[\s\S]*?visualKind:\s*'feature-cards-surface'[\s\S]*?visualVisible:\s*true[\s\S]*?actions:\s*Object\.freeze\(\{\s*primary:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'openNewtab'[\s\S]*?label:\s*text\.finish\.primaryAction[\s\S]*?icon:\s*'ri-arrow-right-line'[\s\S]*?\}\),[\s\S]*?secondary:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'openChromeWebStore'[\s\S]*?label:\s*text\.finish\.ratingAction[\s\S]*?\}\),[\s\S]*?ghost:\s*Object\.freeze\(\{[\s\S]*?actionId:\s*'openOptions'[\s\S]*?label:\s*text\.finish\.settingsAction[\s\S]*?icon:\s*'ri-external-link-line'[\s\S]*?\}\)[\s\S]*?\}\)/,
  'final page should render the right-side practical feature card surface with start, rating, and settings actions'
);
assert.match(
  script,
  /const LUMNO_CHROME_WEB_STORE_URL = 'https:\/\/chromewebstore\.google\.com\/detail\/lumno-%E8%81%9A%E7%84%A6%E6%90%9C%E7%B4%A2%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5\/nggfkkbmogmadfoikakkfegkoilfcfao\?utm_source=item-share-cb';/,
  'onboarding should keep a stable Chrome Web Store landing page URL for the rating action'
);
assert.match(
  script,
  /function openExternalTab\(url, eventOrDisposition\)[\s\S]*?chromeApi\.runtime\.sendMessage\(\{\s*action:\s*'createTab',\s*url:\s*targetUrl,\s*disposition\s*\}/,
  'onboarding should open external action URLs through the background createTab message'
);
assert.match(
  script,
  /if \(id === 'openChromeWebStore'\) \{[\s\S]*?openExternalTab\(LUMNO_CHROME_WEB_STORE_URL, disposition\);[\s\S]*?return;[\s\S]*?\}/,
  'final rating action should open the Chrome Web Store landing page'
);
assert.match(
  content,
  /featureCards:\s*Object\.freeze\(\[[\s\S]*?art:\s*'homepage-pip'[\s\S]*?title:\s*'自动视频画中画'[\s\S]*?body:\s*'切走视频页时自动开启'[\s\S]*?art:\s*'newtab-filters'[\s\S]*?artSize:\s*Object\.freeze\(\{\s*width:\s*298,\s*height:\s*120\s*\}\)[\s\S]*?title:\s*'打造你的个性新标签页'[\s\S]*?body:\s*'可更换壁纸，支持海量滤镜效果'/,
  'final feature cards should use the requested copy, homepage PiP art, and optimized newtab filter art'
);
assert.match(
  content,
  /featureAwards:\s*Object\.freeze\(\[[\s\S]*?Object\.freeze\(\{\s*lines:\s*Object\.freeze\(\['开源',\s*'无隐私风险'\]\)[\s\S]*?Object\.freeze\(\{\s*lines:\s*Object\.freeze\(\['永久免费'\]\)[\s\S]*?Object\.freeze\(\{\s*lines:\s*Object\.freeze\(\['专注',\s*'用户体验'\]\)/,
  'final feature cards should add the three requested wheat award groups above the cards'
);
assert.match(
  script,
  /function createFeatureCardsSurface\(\)[\s\S]*?getFeatureCards\(\)\.forEach\(/,
  'final feature card surface should render the configured cards through a shared helper'
);
const featureCardsSurfaceBlock = script.match(/function createFeatureCardsSurface\(\) \{[\s\S]*?\n  \}\n\n  function renderVisualSurface/);
assert.ok(featureCardsSurfaceBlock, 'final feature card surface renderer should be easy to inspect');
assert.match(
  script,
  /function createFeatureAwards\(\)[\s\S]*?getFeatureAwards\(\)\.forEach\([\s\S]*?awards\.appendChild\(createFeatureAward\(item,\s*index\)\);[\s\S]*?return awards;/,
  'final feature card surface should render wheat award groups from a shared helper'
);
assert.match(
  featureCardsSurfaceBlock ? featureCardsSurfaceBlock[0] : '',
  /surface\.appendChild\(createFeatureAwards\(\)\);[\s\S]*?surface\.appendChild\(stack\);/,
  'wheat award groups should sit above the final feature cards in the surface'
);
assert.match(
  script,
  /slide\.visual\.kind === 'feature-cards-surface'[\s\S]*?visualStage\.appendChild\(createFeatureCardsSurface\(\)\)/,
  'visual renderer should mount the final feature card surface'
);
assert.match(
  html,
  /\.visual-stage\[data-visual-kind="feature-cards-surface"\]\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?\}/,
  'final feature cards should use the same open right-side visual stage treatment'
);
assert.match(
  html,
  /\.feature-cards-surface\s*\{[\s\S]*?animation:\s*onboarding-newtab-preview-enter 760ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\) 140ms both;[\s\S]*?\}/,
  'final feature card surface should enter with the existing right-side visual transition'
);
assert.match(
  html,
  /\.feature-cards-surface\s*\{[\s\S]*?--feature-award-leaf:\s*oklch\(47% 0\.035 88 \/ 0\.66\);[\s\S]*?--feature-award-ink:\s*oklch\(36% 0\.03 86 \/ 0\.76\);[\s\S]*?\}/,
  'wheat award groups should use a muted warm color sampled to blend with the onboarding wallpaper'
);
assert.match(
  html,
  /\.feature-cards-surface__awards\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*80px;[\s\S]*?width:\s*min\(628px,\s*calc\(100% - 72px\)\);[\s\S]*?transform:\s*translateX\(-50%\);[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?gap:\s*42px;[\s\S]*?\}/,
  'wheat award groups should stay centered above the final feature cards'
);
assert.match(
  html,
  /\.feature-award\s*\{[\s\S]*?width:\s*176px;[\s\S]*?grid-template-columns:\s*22px minmax\(0,\s*112px\) 22px;[\s\S]*?gap:\s*10px;[\s\S]*?\}/,
  'individual wheat award groups should share one visual width with breathing room between text and wheat marks'
);
assert.match(
  html,
  /\.feature-award__wheat\s*\{[\s\S]*?width:\s*22px;[\s\S]*?height:\s*57px;[\s\S]*?-webkit-mask:\s*url\("\.\.\/\.\.\/assets\/images\/onboarding-wheat\.svg"\) center \/ contain no-repeat;[\s\S]*?mask:\s*url\("\.\.\/\.\.\/assets\/images\/onboarding-wheat\.svg"\) center \/ contain no-repeat;[\s\S]*?\}/,
  'wheat award groups should reuse the provided wheat SVG as a smaller tintable mask'
);
assert.match(
  html,
  /\.feature-award__label\s*\{[\s\S]*?width:\s*112px;[\s\S]*?font-size:\s*17px;[\s\S]*?line-height:\s*1\.12;[\s\S]*?\}/,
  'wheat award text should use a shared label width while the wheat marks keep their silhouette size'
);
assert.match(
  wheatAsset,
  /<svg width="24" height="62" viewBox="0 0 24 62"[\s\S]*?<path[\s\S]*?fill="black"\/>/,
  'wheat award asset should preserve the provided 24 by 62 SVG silhouette'
);
assert.match(
  html,
  /\.feature-cards-surface__stack\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*298px\);[\s\S]*?gap:\s*22px;[\s\S]*?\}/,
  'final feature cards should sit in one row with fixed homepage-card columns'
);
assert.doesNotMatch(
  html,
  /\.feature-cards-surface__stack\s*\{[\s\S]*?transform:\s*translateY\(-66px\);[\s\S]*?\}/,
  'final feature cards should align visually with the subtitle without an extra upward offset'
);
assert.match(
  html,
  /\.feature-card\s*\{[\s\S]*?width:\s*298px;[\s\S]*?height:\s*222px;[\s\S]*?border-radius:\s*12px;[\s\S]*?box-shadow:\s*0 18px 34px[\s\S]*?isolation:\s*isolate;[\s\S]*?\}/,
  'final feature cards should follow the Lumno web card shell treatment'
);
assert.match(
  html,
  /\.feature-card__art\s*\{[\s\S]*?width:\s*298px;[\s\S]*?height:\s*120px;[\s\S]*?flex:\s*0 0 120px;[\s\S]*?\}/,
  'final feature cards should reserve the same 298 by 120 artwork slot as the homepage cards'
);
assert.match(
  script,
  /const HOMEPAGE_PIP_ART_SRC = '\.\.\/\.\.\/assets\/images\/onboarding-auto-pip\.svg';/,
  'PiP feature card should point at the extracted homepage Picture-in-Picture asset'
);
assert.match(
  homepagePipAsset,
  /<svg width="298" height="120" viewBox="0 0 298 120"[\s\S]*?<rect x="139\.799" y="16\.9508" width="126" height="79"[\s\S]*?<rect x="175\.53" y="10" width="55\.9867" height="19\.28"[\s\S]*?<linearGradient id="paint2_linear_3359_444"/,
  'extracted PiP asset should keep the homepage SVG dimensions, window, and Auto PiP pill artwork'
);
assert.match(
  script,
  /function createHomepagePipArtwork\(\)[\s\S]*?image\.className = 'feature-card__art-image';[\s\S]*?image\.src = HOMEPAGE_PIP_ART_SRC;[\s\S]*?image\.alt = '';[\s\S]*?image\.decoding = 'async';[\s\S]*?image\.loading = 'eager';[\s\S]*?image\.draggable = false;[\s\S]*?art\.appendChild\(image\);/,
  'PiP feature card should render the extracted homepage artwork as an image resource'
);
assert.match(
  script,
  /const NEWTAB_FILTERS_ART_SRC = '\.\.\/\.\.\/assets\/images\/onboarding-newtab-filters\.webp';/,
  'newtab feature card should point at the optimized filter artwork asset'
);
assert.strictEqual(
  newtabFiltersAsset.subarray(0, 4).toString('ascii'),
  'RIFF',
  'newtab filter artwork should be a WebP RIFF asset'
);
assert.strictEqual(
  newtabFiltersAsset.subarray(8, 12).toString('ascii'),
  'WEBP',
  'newtab filter artwork should use the WebP container'
);
assert.ok(
  newtabFiltersAsset.length <= 12 * 1024,
  'newtab filter artwork should stay compressed for the onboarding surface'
);
assert.match(
  script,
  /function createNewtabFiltersArtwork\(\)[\s\S]*?image\.className = 'feature-card__art-image';[\s\S]*?image\.src = NEWTAB_FILTERS_ART_SRC;[\s\S]*?image\.alt = '';[\s\S]*?image\.decoding = 'async';[\s\S]*?image\.loading = 'eager';[\s\S]*?image\.draggable = false;[\s\S]*?art\.appendChild\(image\);/,
  'newtab feature card should render the optimized filter artwork as an image resource'
);
assert.doesNotMatch(
  script,
  /createHomepagePipIllustration|createFeatureSvgElement|document\.createElementNS\('http:\/\/www\.w3\.org\/2000\/svg'/,
  'PiP feature card should not rebuild the homepage SVG from manual DOM nodes'
);
assert.match(
  html,
  /\.feature-card__art-image\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?display:\s*block;[\s\S]*?object-fit:\s*contain;[\s\S]*?\}/,
  'PiP feature card image should fill the reserved artwork slot without distortion'
);
assert.doesNotMatch(
  html,
  /homepage-pip-|feature-card__art-svg/,
  'final feature card CSS should not keep manually reconstructed homepage PiP SVG classes'
);
assert.match(
  script,
  /item && item\.art === 'newtab-filters'[\s\S]*?return createNewtabFiltersArtwork\(\);/,
  'second feature card should render the newtab filter artwork instead of leaving the slot blank'
);
assert.doesNotMatch(
  featureCardsSurfaceBlock ? featureCardsSurfaceBlock[0] : '',
  /feature-card__icon|createIcon\(|ri-picture-in-picture-line|ri-image-edit-line/,
  'final feature cards should not render standalone Remix icons'
);
assert.doesNotMatch(
  html,
  /\.feature-card__icon|ri-picture-in-picture-line|ri-image-edit-line/,
  'final feature card CSS and template should not keep icon-only treatments'
);
assert.doesNotMatch(
  featureCardsSurfaceBlock ? featureCardsSurfaceBlock[0] : '',
  /createBrowserWindowClip|createGenericVisualSurface|createDemoCursorSvg/,
  'final feature card surface should not render a browser mock or generic illustration'
);
assert.doesNotMatch(
  content,
  /secondary:\s*Object\.freeze\(\{[\s\S]*?icon:\s*'ri-arrow-left-line'[\s\S]*?\}\)/,
  'secondary onboarding actions should not declare the old arrow-left icon'
);
assert.match(
  html,
  /\.onboarding-action-button\[hidden\]\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  'hidden lower-left action buttons should not be re-shown by component display styles'
);
assert.match(
  html,
  /\.onboarding-copy-actions\s*\{[\s\S]*?width:\s*100%;[\s\S]*?\}/,
  'lower-left action row should span the copy panel so ghost actions can align right'
);
assert.match(
  getCssRule('.onboarding-action-button--ghost'),
  /margin-left:\s*auto;[\s\S]*?--onboarding-action-border-color:\s*transparent;[\s\S]*?--onboarding-action-bg:\s*transparent;[\s\S]*?--onboarding-action-shadow:\s*none;/,
  'shortcut action should use the shared action button variables for its right-aligned ghost treatment'
);
assert.match(
  script,
  /function renderCopyActions\(slide\)[\s\S]*?renderActionButton\(primaryActionButton,\s*actions\.primary\)[\s\S]*?renderActionButton\(secondaryActionButton,\s*actions\.secondary\)[\s\S]*?renderActionButton\(ghostActionButton,\s*actions\.ghost\)/,
  'lower-left actions should be rendered from the active slide content model'
);
assert.doesNotMatch(
  html,
  /\[data-visual-visible="false"\]\s+\.onboarding-frame\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\}/,
  'slides without right-side illustrations should keep the two-column container and background'
);
assert.doesNotMatch(
  html,
  /\[data-visual-visible="false"\]\s+\.visual-panel\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  'slides without right-side illustrations should keep the right visual panel visible'
);
assert.match(
  script,
  /openShortcuts:\s*'openExtensionShortcutsPage'/,
  'shortcut action should route to the Chrome extension keyboard shortcuts page'
);
assert.match(
  script,
  /openExtensionDetails:\s*'openExtensionDetailsPage'/,
  'accordion details link should route through the extension details background action'
);
assert.match(
  script,
  /openSiteSearchOptions:\s*'openSiteSearchOptionsPage'/,
  'site list ghost action should route through the site-search options background action'
);
assert.match(
  script,
  /const SITE_SEARCH_OPTIONS_PAGE_PATH = 'src\/options\/options\.html#shortcuts';[\s\S]*?function openExtensionPageTab\([\s\S]*?chromeApi\.tabs\.create\(\{\s*url,\s*active:\s*disposition !== 'backgroundTab'\s*\}\);[\s\S]*?function openSiteSearchOptionsFallback\([\s\S]*?openExtensionPageTab\(SITE_SEARCH_OPTIONS_PAGE_PATH, eventOrDisposition\)/,
  'site list ghost action should fall back to opening the options shortcuts tab directly from onboarding'
);
assert.match(
  script,
  /chromeApi\.runtime\.sendMessage\(\{\s*action:\s*messageAction,\s*disposition\s*\},\s*\(response\)\s*=>\s*\{[\s\S]*?id === 'openSiteSearchOptions'[\s\S]*?openSiteSearchOptionsFallback\(disposition\)/,
  'site list ghost action should not silently fail when the background message is unavailable or rejected'
);
assert.match(
  script,
  /createInteractionRowIcon\(slot\.icon\)/,
  'interaction slots should render the icon declared by the content model'
);
assert.match(
  script,
  /image\.src = src;/,
  'browser avatar renderer should assign browser image sources from content metadata'
);
assert.doesNotMatch(
  script,
  /BROWSER_ICON_BY_ID/,
  'browser avatar renderer should not keep the legacy inline SVG icon map'
);
assert.match(
  script,
  /image\.decoding = 'async';/,
  'browser avatar images should be decoded asynchronously'
);
assert.match(
  script,
  /image\.addEventListener\('error'/,
  'browser avatar images should retain a text fallback if an asset fails'
);
assert.match(
  content,
  /google-chrome-2022\.svg[\s\S]*microsoft-edge-2019\.svg[\s\S]*dia\.jpg[\s\S]*comet\.jpg/,
  'browser avatar assets should be declared by content metadata'
);
assert.doesNotMatch(
  html,
  /\.browser-avatar svg/,
  'browser avatar styles should not target legacy inline SVG icons'
);
assert.doesNotMatch(
  html,
  /conic-gradient\(#ea4335/,
  'browser avatars should use the provided logo assets rather than faux Chrome gradients'
);
assert.match(
  script,
  /const separator = getRuntimeMiscText\('browserNameSeparator', ', '\);[\s\S]*?const suffix = getRuntimeMiscText\('browserAvatarSuffix', 'and more'\);[\s\S]*?aria-label', names\.length > 0 \? `\$\{names\.join\(separator\)\} \$\{suffix\}`\.trim\(\) : ''/,
  'browser avatar group should expose a compact accessible browser-name label with an etc. hint'
);
assert.match(
  script,
  /ellipsis\.textContent = '…';/,
  'browser avatar group should append a visual ellipsis after the four logos'
);
assert.match(
  script,
  /infoTooltip\.type === 'browser-avatars'/,
  'browser support info tooltip should render avatar content instead of plain text'
);
assert.match(
  html,
  /\.onboarding-browser-tooltip\s*\{[\s\S]*?padding:\s*8px 10px;[\s\S]*?\}/,
  'browser support tooltip should have compact Lumno tooltip padding'
);
assert.match(
  html,
  /\.\.\/shared\/tooltip\.js[\s\S]*onboarding\.js/,
  'shared tooltip script should load before onboarding behavior'
);
assert.match(
  html,
  /--text-swap-dur:\s*200ms;/,
  'title rotator should install text-swap timing tokens'
);
assert.match(
  html,
  /--resize-dur:\s*300ms;/,
  'title rotator should install resize timing tokens'
);
assert.match(
  html,
  /\.t-resize\s*\{[\s\S]*?width\s+var\(--resize-dur\)\s+var\(--resize-ease\)[\s\S]*?will-change:\s*width,\s*height;[\s\S]*?\}/,
  'title rotator should use the resize transition hook for badge width changes'
);
assert.match(
  html,
  /\.t-text-swap\s*\{[\s\S]*?will-change:\s*transform,\s*filter,\s*opacity;[\s\S]*?\}/,
  'title rotator should use the text-swap transition hook'
);
assert.match(
  html,
  /\.title-rotator\s*\{[\s\S]*?border-radius:\s*8px;[\s\S]*?background:\s*var\(--title-rotator-bg\);[\s\S]*?\}/,
  'rotating title labels should render inside rectangular containers'
);
assert.match(
  html,
  /\.title-rotator\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?width:\s*max-content;[\s\S]*?text-align:\s*left;[\s\S]*?\}/,
  'rotating title labels should hug their content and keep their left edge anchored'
);
assert.doesNotMatch(
  html,
  /width:\s*5\.62em;/,
  'rotating title labels should not reserve the longest badge width'
);
assert.doesNotMatch(
  html,
  /min-width:\s*2\.52em;/,
  'rotating title labels should not force a short-label minimum width on mobile'
);
assert.match(
  html,
  /\.title-rotator\[data-tone="bookmark"\]\s*\{[\s\S]*?--title-rotator-bg:\s*#fef3c7;[\s\S]*?--title-rotator-ink:\s*#d97706;[\s\S]*?\}/,
  'bookmark title label should use the existing Lumno bookmark yellow'
);
assert.match(
  html,
  /\.title-rotator\[data-tone="history"\]/,
  'history title label should have its own background tone'
);
assert.match(
  html,
  /\.title-rotator\[data-tone="top-sites"\]/,
  'top-sites title label should have its own background tone'
);
assert.match(
  html,
  /\.title-rotator\[data-tone="settings"\]/,
  'settings title label should have its own background tone'
);
assert.match(
  html,
  /\.title-line--with-logo\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?align-items:\s*center;[\s\S]*?\}/,
  'title line with the Lumno logo should keep the text and logo aligned inline'
);
assert.match(
  html,
  /\.title\s*\{[\s\S]*?--title-base-size:\s*36px;[\s\S]*?--title-fit-scale:\s*1;[\s\S]*?font-size:\s*calc\(var\(--title-base-size\) \* var\(--title-fit-scale\)\);[\s\S]*?\}/,
  'page title should expose a measured fit scale rather than wrapping into extra lines'
);
assert.match(
  html,
  /\.title\s*\{[\s\S]*?--title-font-weight:\s*760;[\s\S]*?font-weight:\s*var\(--title-font-weight\);[\s\S]*?\}[\s\S]*?html\[lang="en"\]\s+\.title\s*\{[\s\S]*?--title-font-weight:\s*620;[\s\S]*?\}/,
  'English onboarding titles should render lighter than the default CJK title weight'
);
assert.match(
  html,
  /\.title\s*\{[\s\S]*?--title-font-stretch:\s*100%;[\s\S]*?--title-font-width-axis:\s*100;[\s\S]*?font-stretch:\s*var\(--title-font-stretch\);[\s\S]*?font-variation-settings:\s*"wdth" var\(--title-font-width-axis\);[\s\S]*?letter-spacing:\s*0;[\s\S]*?\}[\s\S]*?html\[lang="en"\]\s+\.title\s*\{[\s\S]*?--title-font-stretch:\s*94%;[\s\S]*?--title-font-width-axis:\s*94;[\s\S]*?\}/,
  'English onboarding titles should use a narrower font width while keeping neutral letter spacing'
);
assert.match(
  html,
  /\.title\s*\{[\s\S]*?--title-line-gap:\s*0px;[\s\S]*?\}[\s\S]*?html\[lang="en"\]\s+\.onboarding-shell\[data-active-slide="intro"\]\s+\.title\s*\{[\s\S]*?--title-line-gap:\s*0\.1em;[\s\S]*?\}[\s\S]*?\.title-break\s*\{[\s\S]*?height:\s*var\(--title-line-gap\);[\s\S]*?\}/,
  'English intro title should add extra space before the second line without changing letter spacing'
);
assert.match(
  html,
  /\.title-line\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?\}/,
  'configured title lines should stay on their intended line count'
);
assert.match(
  html,
  /\.body-copy\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?overflow-wrap:\s*break-word;[\s\S]*?\}/,
  'subtitle copy should be allowed to wrap naturally'
);
assert.match(
  script,
  /function updateTitleFitScale\(\)[\s\S]*?title\.style\.setProperty\('--title-fit-scale', '1'\);[\s\S]*?availableWidth \/ widestLine[\s\S]*?--title-fit-scale/,
  'onboarding should shrink the title only when a title line would overflow'
);
assert.match(
  script,
  /const VISUAL_CANVAS_WIDTH = 704;[\s\S]*?const VISUAL_CANVAS_HEIGHT = 680;/,
  'onboarding should keep the right-side illustration canvas at its designed dimensions in script'
);
assert.match(
  script,
  /const ONBOARDING_FRAME_WIDTH = 1240;[\s\S]*?const ONBOARDING_FRAME_HEIGHT = 680;/,
  'onboarding script should keep the outer frame design size for proportional split-screen scaling'
);
assert.match(
  script,
  /function updateOnboardingFrameScale\(\)[\s\S]*?isFrameScaledOnboardingLayout\(\)[\s\S]*?window\.innerWidth[\s\S]*?ONBOARDING_FRAME_WIDTH[\s\S]*?ONBOARDING_FRAME_HEIGHT[\s\S]*?--onboarding-frame-scale[\s\S]*?--onboarding-frame-rendered-width[\s\S]*?--onboarding-frame-rendered-height/,
  'onboarding should scale the whole outer frame proportionally in the split-screen range'
);
assert.match(
  script,
  /function getCompactCopyContentHeight\(\)[\s\S]*?copyPanel\.querySelector\('\.copy-block'\)[\s\S]*?copyPanel\.querySelector\('\.interaction-slots'\)[\s\S]*?copyPanel\.querySelector\('\.onboarding-copy-actions'\)[\s\S]*?function updateVisualCanvasScale\(\)[\s\S]*?updateOnboardingFrameScale\(\)[\s\S]*?visualSlot\.getBoundingClientRect\(\)[\s\S]*?isStackedOnboardingLayout[\s\S]*?viewportWidth[\s\S]*?viewportHeight[\s\S]*?Math\.min\(viewportWidth,\s*visualSlot\.clientWidth[\s\S]*?getCompactCopyContentHeight\(\)[\s\S]*?const scale = isCompactLayout[\s\S]*?Math\.max\(0\.1,\s*Math\.min\(availableWidth \/ VISUAL_CANVAS_WIDTH,\s*availableHeight \/ VISUAL_CANVAS_HEIGHT\)\)[\s\S]*?Math\.min\(1,\s*availableWidth \/ VISUAL_CANVAS_WIDTH,\s*availableHeight \/ VISUAL_CANVAS_HEIGHT\)[\s\S]*?--onboarding-visual-scale[\s\S]*?--onboarding-visual-rendered-width/,
  'compact vertical onboarding should contain the bottom visual to the visible viewport under the natural copy height while horizontal layouts keep contained proportional scaling'
);
assert.match(
  script,
  /renderVisualSurface\(slide\);[\s\S]*?scheduleVisualCanvasScaleUpdate\(\);/,
  'rendering a slide should refresh the right visual canvas scale without scaling the whole onboarding frame'
);
assert.match(
  script,
  /ResizeObserver\(scheduleVisualCanvasScaleUpdate\)[\s\S]*?visualResizeObserver\.observe\(visualSlot\);/,
  'right-side visual scale should follow visual slot resize events, not only window resizes'
);
assert.match(
  html,
  /\.title-logo-mark\s*\{[\s\S]*?--title-logo-mark-offset-y:\s*0px;[\s\S]*?width:\s*1\.08em;[\s\S]*?height:\s*1\.08em;[\s\S]*?filter:\s*drop-shadow\(0 7px 8px rgba\(56,\s*172,\s*248,\s*0\.38\)\);[\s\S]*?transform:\s*translateY\(var\(--title-logo-mark-offset-y\)\) rotate\(7deg\);[\s\S]*?\}/,
  'title logo should render larger with a compact blue shadow and right tilt'
);
assert.match(
  html,
  /\.title\.t-copy-swap,\s*\.body-copy\.t-copy-swap\s*\{[\s\S]*?filter:\s*blur\(0\);[\s\S]*?transition:[\s\S]*?transform var\(--text-swap-dur\) var\(--text-swap-ease\)[\s\S]*?filter var\(--text-swap-dur\) var\(--text-swap-ease\)[\s\S]*?opacity var\(--text-swap-dur\) var\(--text-swap-ease\)[\s\S]*?will-change:\s*transform,\s*filter,\s*opacity;[\s\S]*?\}/,
  'page title and subtitle should opt into the shared blurred text swap transition'
);
assert.match(
  html,
  /\.title\.t-copy-swap\.is-exit,\s*\.body-copy\.t-copy-swap\.is-exit\s*\{[\s\S]*?transform:\s*translateY\(calc\(var\(--text-swap-translate-y\) \* -1\)\);[\s\S]*?filter:\s*blur\(var\(--text-swap-blur\)\);[\s\S]*?opacity:\s*0;[\s\S]*?\}/,
  'page title and subtitle should blur upward while exiting'
);
assert.match(
  html,
  /\.title\.t-copy-swap\.is-enter-start,\s*\.body-copy\.t-copy-swap\.is-enter-start\s*\{[\s\S]*?transform:\s*translateY\(var\(--text-swap-translate-y\)\);[\s\S]*?filter:\s*blur\(var\(--text-swap-blur\)\);[\s\S]*?transition:\s*none;[\s\S]*?\}/,
  'page title and subtitle should enter from below with blur before settling'
);
assert.match(
  html,
  /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.t-copy-swap\s*\{\s*transition:\s*none !important;\s*\}/,
  'copy text swap animation should respect reduced motion preferences'
);
assert.match(
  html,
  /@media \(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\.title-logo-mark\s*\{[\s\S]*?filter:\s*drop-shadow\(0 7px 9px rgba\(72,\s*184,\s*255,\s*0\.46\)\);[\s\S]*?\}/,
  'dark mode title logo shadow should stay color-tinted instead of neutral black'
);
assert.match(
  script,
  /TITLE_CYCLE_INTERVAL_MS/,
  'onboarding should define an automatic cadence for the title rotator'
);
assert.match(
  script,
  /const TITLE_CYCLE_FIRST_DELAY_MS = 520;/,
  'title cycle should use a shorter first delay so the intro quickly reveals the history label'
);
assert.match(
  script,
  /if \(titleCycleFirstTimeout\) \{[\s\S]*?window\.clearTimeout\(titleCycleFirstTimeout\);[\s\S]*?titleCycleFirstTimeout = 0;[\s\S]*?\}/,
  'stopping the title cycle should clear the first short delay timeout'
);
assert.match(
  script,
  /function startTitleCycle\(/,
  'onboarding should start automatic title label rotation when the title renders'
);
assert.match(
  script,
  /function advanceTitleCycle\(rotator,\s*items\)[\s\S]*?titleCycleIndex = \(titleCycleIndex \+ 1\) % items\.length;[\s\S]*?swapTitleCycleItem\(rotator,\s*items\[titleCycleIndex\]\);/,
  'title cycle should advance through labels with one shared helper'
);
assert.match(
  script,
  /titleCycleFirstTimeout = window\.setTimeout\(\(\) => \{[\s\S]*?advanceTitleCycle\(rotator,\s*safeItems\);[\s\S]*?titleCycleInterval = window\.setInterval\(\(\) => \{[\s\S]*?advanceTitleCycle\(rotator,\s*safeItems\);[\s\S]*?\}, TITLE_CYCLE_INTERVAL_MS\);[\s\S]*?\}, TITLE_CYCLE_FIRST_DELAY_MS\);/,
  'title cycle should only shorten the first bookmark-to-history wait before using the normal cadence'
);
assert.match(
  script,
  /function swapTitleCycleItem\(/,
  'onboarding should animate title label swaps vertically'
);
assert.match(
  script,
  /function measureTitleCycleWidth\(/,
  'onboarding should measure each badge label before resizing'
);
assert.match(
  script,
  /function setTitleCycleWidth\(/,
  'onboarding should set measured badge widths for resize transitions'
);
assert.match(
  script,
  /setTitleCycleWidth\(rotator,\s*item\.label\)/,
  'onboarding should resize the badge to the next label before swapping text'
);
assert.match(
  script,
  /function animateCopySwap\(nextState\)[\s\S]*?classList\.add\('t-copy-swap'\)[\s\S]*?classList\.add\('is-exit'\)[\s\S]*?commitState\(nextState\)[\s\S]*?classList\.add\('t-copy-swap',\s*'is-enter-start'\)/,
  'onboarding should animate page title and subtitle through a blurred swap when changing slides'
);
assert.match(
  script,
  /const nextState = MODEL\.reduceOnboardingState\(state,\s*action\);[\s\S]*?animateCopySwap\(nextState\);/,
  'slide dispatch should use the copy blur animation for real page changes'
);
assert.match(
  script,
  /function isFrameScaledOnboardingLayout\(\)[\s\S]*?matchMedia\('\(max-width:\s*1240px\) and \(min-width:\s*860px\), \(max-height:\s*760px\) and \(min-height:\s*560px\) and \(min-width:\s*860px\)'\)\.matches/,
  'onboarding should detect the split-screen frame-scale range separately from vertical layout'
);
assert.match(
  script,
  /function isStackedOnboardingLayout\(\)[\s\S]*?matchMedia\('\(max-width:\s*859px\), \(max-height:\s*559px\)'\)\.matches/,
  'onboarding should detect the compact vertical responsive layout before applying scroll corrections'
);
assert.match(
  script,
  /function resetStackedLayoutScroll\(\)[\s\S]*?root\.scrollTop\s*=\s*0;[\s\S]*?requestAnimationFrame[\s\S]*?root\.scrollTop\s*=\s*0;/,
  'stacked onboarding layouts should reset the shell scroll position after slide changes'
);
assert.match(
  script,
  /function commitState\(nextState\)[\s\S]*?render\(\);[\s\S]*?resetStackedLayoutScroll\(\);/,
  'committing a slide change should keep the stacked copy panel anchored at the top'
);
assert.match(
  script,
  /rotator\.className = 'title-rotator t-resize';/,
  'title rotator should opt into the resize transition class'
);
assert.match(
  script,
  /function createTitleLogoMark\(/,
  'onboarding should create the trailing Lumno title logo with a dedicated helper'
);
assert.match(
  script,
  /logo\.className = 'title-logo-mark';[\s\S]*logo\.src = String\(titleLogo\.src \|\| ''\);/,
  'title logo helper should render the Lumno image asset'
);
assert.match(
  script,
  /appendTitleLine\(secondLine,\s*slide\.copy\.titleLogo\)/,
  'title cycle renderer should append the Lumno logo after the second title line'
);
assert.match(
  script,
  /if \(lines\.length > 0 && text\) \{[\s\S]*?title\.setAttribute\('aria-label', text\);[\s\S]*?\}/,
  'forced multiline titles should keep the full title available as an accessible label'
);
assert.match(
  script,
  /data-title-rotator-text/,
  'onboarding should render a stable text node for the animated title label'
);
assert.match(
  content,
  /id:\s*'intro'[\s\S]*?visualKind:\s*'lumno-web-wordmark-surface'[\s\S]*?visualVisible:\s*true/,
  'first page should keep the right-side container and show the Lumno web wordmark'
);
assert.match(
  content,
  /id:\s*'search'[\s\S]*?visualKind:\s*'newtab-preview-surface'[\s\S]*?visualVisible:\s*true/,
  'third page should keep the right-side container and show the complete newtab preview'
);
assert.match(
  script,
  /const LUMNO_WEB_WORDMARK_SRC = '\.\.\/\.\.\/assets\/images\/lumno-web-textlogo\.svg';/,
  'home wordmark demo should use the Lumno web textlogo asset'
);
assert.match(
  lumnoWebWordmarkAsset,
  /<svg width="165" height="43"[\s\S]*?fill="#79C3F2"/,
  'copied wordmark asset should match the Lumno web homepage textlogo'
);
assert.match(
  script,
  /function createLumnoWebWordmarkSurface\([\s\S]*?logo-wordmark-wrap[\s\S]*?logo-butterfly-stage[\s\S]*?seo-wordmark-text/,
  'first-page visual should render the Lumno web homepage wordmark structure'
);
assert.match(
  script,
  /const LUMNO_WEB_BUTTERFLY_FLUTTER_PATH = 'M4\.32468 17\.7823[\s\S]*?function createLumnoWebButterflyWing\([\s\S]*?animateTransform[\s\S]*?-1\.5 5\.5 15\.5;0 5\.5 15\.5;-1\.5 5\.5 15\.5/,
  'first-page visual should reuse the animated butterfly path from Lumno web'
);
assert.match(
  html,
  /\.visual-stage\[data-visual-kind="lumno-web-wordmark-surface"\]\s*\{[\s\S]*?display:\s*grid;[\s\S]*?place-items:\s*center;[\s\S]*?\}/,
  'Lumno web wordmark should be centered in the existing right-side visual stage'
);
assert.match(
  html,
  /\.lumno-web-wordmark-surface \.logo-butterfly-stage\s*\{[\s\S]*?left:\s*calc\(var\(--wordmark-width\) \* 152 \/ 165\);[\s\S]*?transform:\s*rotate\(-4deg\);[\s\S]*?\}/,
  'wordmark butterfly placement should follow the Lumno web homepage CSS'
);
assert.doesNotMatch(
  script,
  /createLumnowebMarkSurface|lumnoweb-word-dark|lumnoweb-butterfly-wing--left/,
  'first-page wordmark should not use the previous hand-built fake logo'
);
assert.match(
  content,
  /lumnoOverlay:\s*Object\.freeze\(\{[\s\S]*?results:\s*Object\.freeze/,
  'right-side onboarding visual should declare fake Lumno overlay result data'
);
assert.match(
  content,
  /type:\s*'topSite'[\s\S]*type:\s*'bookmark'[\s\S]*type:\s*'history'/,
  'fake overlay results should mirror actual search suggestion types'
);
assert.doesNotMatch(
  script,
  /默认搜索引擎|tone:\s*'settings'/,
  'fake overlay results should not include non-query settings filler'
);
assert.match(
  script,
  /function createLumnoOverlaySurface\(/,
  'right-side onboarding visual should build a Lumno overlay surface from DOM pieces'
);
assert.match(
  script,
  /const ONBOARDING_OVERLAY_DEMO_PANEL_ID = '_x_extension_onboarding_overlay_demo_2026_unique_';/,
  'right-side onboarding overlay demo should use a dedicated id separate from the live overlay panel'
);
assert.match(
  script,
  /panel\.id = ONBOARDING_OVERLAY_DEMO_PANEL_ID;/,
  'right-side onboarding overlay demo should assign the dedicated panel id'
);
assert.match(
  sharedSuggestionsCss,
  /Onboarding reuses these suggestion row styles[\s\S]*?verify src\/onboarding\/onboarding\.html\?slide=1/,
  'shared overlay suggestion styles should remind maintainers to verify the onboarding overlay demo'
);
assert.match(
  sharedSuggestionsCss,
  /:is\(#_x_extension_overlay_2024_unique_,\s*#_x_extension_onboarding_overlay_demo_2026_unique_\)\s+\.x-ov-suggestion-item\s*\{/,
  'shared overlay suggestion item styles should also target the onboarding overlay demo id'
);
assert.match(
  sharedSuggestionsCss,
  /:is\(#_x_extension_overlay_2024_unique_,\s*#_x_extension_onboarding_overlay_demo_2026_unique_\)\s+\.x-ov-suggestion-left\s*\{/,
  'shared overlay suggestion layout styles should also target the onboarding overlay demo id'
);
assert.match(
  sharedSuggestionsCss,
  /:is\(#_x_extension_overlay_2024_unique_,\s*#_x_extension_onboarding_overlay_demo_2026_unique_\)\s+\.x-ov-suggestion-action-button\s*\{/,
  'shared overlay suggestion action button styles should also target the onboarding overlay demo id'
);
assert.match(
  script,
  /createLumnoOverlayResult\(/,
  'right-side onboarding visual should render individual fake overlay result rows'
);
assert.match(
  script,
  /function createLumnoOverlayFavicon\(/,
  'right-side onboarding visual should use favicon-style icons like real overlay suggestions'
);
assert.match(
  script,
  /const iconNode = createLumnoOverlayFavicon\(result\);[\s\S]*iconSlot\.dataset\.favicon = iconNode\.tagName === 'IMG' \? 'true' : 'false';[\s\S]*iconSlot\.dataset\.emphasis = result\.active \? 'true' : 'false';/,
  'non-favicon fake overlay result icons should expose favicon and emphasis state for the rounded icon background'
);
assert.match(
  script,
  /const iconSlot = item\.querySelector\('\.x-ov-suggestion-icon-slot'\);[\s\S]*iconSlot\.dataset\.emphasis = isActive \? 'true' : 'false';/,
  'fake overlay hover loop should toggle the non-favicon icon background with the active result'
);
assert.match(
  html,
  /#_x_extension_onboarding_overlay_demo_2026_unique_ \.lumno-overlay-result \.x-ov-suggestion-icon-slot\[data-emphasis="true"\]\[data-favicon="false"\]\s*\{[\s\S]*?background-color:\s*#ffffff;[\s\S]*?\}/,
  'fake overlay non-favicon icons should use the same rounded rectangle background as the real overlay active state'
);
assert.match(
  script,
  /function appendHighlightedQueryText\(/,
  'right-side onboarding visual should highlight the entered query inside result titles'
);
assert.match(
  script,
  /textWrapper\.appendChild\(detailNode\);[\s\S]*textWrapper\.appendChild\(sourceTag\);/,
  'right-side onboarding visual should render URL or bookmark path before the source tag'
);
assert.match(
  script,
  /actionTags\.dataset\.visible = result\.active && result\.actionTagLabel \? 'true' : 'false';/,
  'right-side onboarding visual should show keyboard action tags only for the active row'
);
assert.match(
  script,
  /visitButton\.className = 'x-ov-suggestion-action-button x-ov-suggestion-visit-button';[\s\S]*visitButton\.dataset\.visible = result\.active && result\.actionTagLabel \? 'false' : 'true';/,
  'right-side onboarding visual should keep the real overlay visit button state for inactive rows'
);
assert.match(
  script,
  /x-ov-history-delete-slot/,
  'history-like fake rows should preserve the real overlay history delete slot'
);
assert.match(
  script,
  /historyDeleteSlot\.dataset\.visible = 'false';[\s\S]*historyDeleteButton\.dataset\.visible = 'false';/,
  'history-like fake rows should keep the delete slot collapsed so the visit button stays right-aligned'
);
assert.match(
  html,
  /#_x_extension_onboarding_overlay_demo_2026_unique_ \.lumno-overlay-result \.x-ov-history-delete-slot\[data-visible="false"\]\s*\{[\s\S]*?display:\s*none;[\s\S]*?\}/,
  'collapsed fake history delete slots should not contribute a flex gap after the visit button'
);
assert.match(
  script,
  /visualStage\.appendChild\(createBookmarkFocusSurface\(\)\);/,
  'bookmark-focus visual should mount the composed browser and Lumno overlay demo'
);
assert.match(
  script,
  /function createNewtabPreviewSurface\(/,
  'right-side newtab onboarding visual should have a dedicated renderer'
);
assert.match(
  script,
  /const surface = createNewtabPreviewSurface\(\);[\s\S]*?visualStage\.appendChild\(surface\);[\s\S]*?startNewtabPreviewHoverLoop\(surface\);/,
  'newtab visual should mount the composed newtab preview and start its hover demo loop'
);
assert.match(
  script,
  /surface\.className = 'newtab-preview-surface'/,
  'newtab visual renderer should expose a stable surface class'
);
assert.match(
  script,
  /createNewtabPreviewSearchPanel\([\s\S]*?_x_extension_newtab_search_layer_2024_unique_/,
  'newtab preview should recreate the real newtab search layer structure'
);
assert.match(
  content,
  /bookmarks:[\s\S]*title:\s*'工作台'[\s\S]*type:\s*'folder'[\s\S]*title:\s*'设计素材'[\s\S]*type:\s*'folder'[\s\S]*title:\s*'开发文档'[\s\S]*type:\s*'folder'[\s\S]*recentSites:[\s\S]*Lumno - Chrome Web Store[\s\S]*kubai087\/lumno-extension[\s\S]*Tailwind CSS Docs/,
  'newtab preview should prefill real-looking recent-site rows and three folder bookmarks'
);
assert.match(
  script,
  /field\.value = getNewtabPreviewQuery\(\);[\s\S]*field\.placeholder = getRuntimeMiscText\('newtabSearchPlaceholder', 'Search or enter URL\.\.\.'\);[\s\S]*viewport\.dataset\.ntSuggestionsOpen = 'false';/,
  'newtab preview should render the real empty-input newtab state instead of prefilled query text'
);
assert.match(
  script,
  /createNewtabPreviewSuggestionsStack\([\s\S]*?_x_extension_newtab_suggestions_surface_2026_unique_[\s\S]*?surface\.dataset\.visible = 'false';[\s\S]*?_x_extension_newtab_suggestions_container_2024_unique_[\s\S]*?container\.dataset\.visible = 'false';/,
  'newtab preview should keep the real newtab suggestions surface mounted but closed for the empty input state'
);
assert.match(
  script,
  /bottomDockScroller\.appendChild\(createNewtabPreviewSection\('bookmarks', getNewtabPreviewSectionTitle\('bookmarks', 'Bookmarks'\), getNewtabPreviewBookmarks\(\)\)\);[\s\S]*bottomDockScroller\.appendChild\(sectionSafeCorridor\);[\s\S]*bottomDockScroller\.appendChild\(createNewtabPreviewSection\('recent', getNewtabPreviewSectionTitle\('recent', 'Recent'\), getNewtabPreviewRecentSites\(\)\)\);/,
  'newtab preview should include the real bottom-dock bookmarks and recent sections with fake data'
);
assert.match(
  script,
  /browserBackdrop\.className = 'browser-window newtab-preview-browser-backdrop';[\s\S]*browserBackdrop\.appendChild\(createBrowserBar\(\)\);[\s\S]*browserForeground\.className = 'newtab-preview-browser-foreground';[\s\S]*page\.className = 'newtab-preview-browser-page';[\s\S]*page\.appendChild\(createNewtabPreviewViewport\(\)\);/,
  'newtab preview should keep the browser chrome backdrop and render the newtab page in a clear foreground layer'
);
assert.doesNotMatch(
  script,
  /browserBackdrop\.appendChild\(createBrowserPageSkeleton\(\)\);/,
  'newtab preview should not show generic webpage skeleton lines above the newtab content'
);
assert.match(
  script,
  /function createBrowserWindowClip\(browserWindow\)[\s\S]*?clip\.className = 'browser-window-clip';[\s\S]*?clip\.appendChild\(browserWindow\);/,
  'browser illustrations should be wrapped in a reusable clipping layer inside the fixed right-side canvas'
);
assert.match(
  script,
  /rootNode\.appendChild\(createBrowserWindowClip\(browserWindow\)\);[\s\S]*rootNode\.appendChild\(createLumnoOverlaySurface\(\)\);/,
  'focus-search visual should clip the background browser while keeping the overlay outside that clipping layer'
);
assert.match(
  script,
  /const backdropClip = createBrowserWindowClip\(browserBackdrop\);[\s\S]*backdropClip\.classList\.add\('newtab-preview-browser-backdrop-clip'\);[\s\S]*const foregroundClip = createBrowserWindowClip\(browserForeground\);[\s\S]*foregroundClip\.classList\.add\('newtab-preview-browser-foreground-clip'\);[\s\S]*surface\.appendChild\(backdropClip\);[\s\S]*surface\.appendChild\(foregroundClip\);/,
  'newtab visual should clip separate browser backdrop and clear-foreground layers inside the fixed right-side canvas'
);
assert.match(
  html,
  /\.\.\/shared\/search-input\.css[\s\S]*\.\.\/overlay\/suggestions-view\.css/,
  'onboarding should load the same search input and overlay suggestion styles used by the plugin overlay'
);
assert.match(
  html,
  /\.lumno-overlay-panel\s*\{[\s\S]*?background:\s*var\(--x-ov-bg,\s*rgba\(255,\s*255,\s*255,\s*0\.95\)\);[\s\S]*?backdrop-filter:\s*blur\(var\(--x-ov-blur,\s*24px\)\)\s*saturate\(var\(--x-ov-saturate,\s*165%\)\);[\s\S]*?border-radius:\s*28px;[\s\S]*?box-shadow:\s*var\(--x-ov-shadow,[\s\S]*?\);[\s\S]*?\}/,
  'right-side Lumno overlay demo should reuse the plugin overlay shell surface style'
);
assert.match(
  html,
  /\.lumno-overlay-panel[\s\S]*onboarding-overlay-enter/,
  'right-side Lumno overlay demo should include an entrance animation'
);
assert.match(
  html,
  /\.lumno-overlay-query-caret[\s\S]*onboarding-caret-blink/,
  'right-side Lumno overlay demo should include a simulated text cursor animation'
);
assert.match(
  html,
  /\.visual-stage\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?\}/,
  'right-side visual stage should not clip overlay shadows'
);
assert.match(
  html,
  /\.visual-stage\[data-visual-kind="newtab-preview-surface"\]\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*visible;[\s\S]*?\}/,
  'newtab preview visual should reuse the full browser illustration stage'
);
assert.match(
  html,
  /\.browser-window-clip\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?pointer-events:\s*none;[\s\S]*?isolation:\s*isolate;[\s\S]*?\}/,
  'right-side browser illustrations should keep their oversized contents clipped even when the outer responsive layout stacks vertically'
);
assert.doesNotMatch(
  html,
  /\.onboarding-shell\[data-active-slide="search"\]\s+\.visual-panel\s*\{[\s\S]*?background:\s*linear-gradient/,
  'newtab preview slide should reuse the same Monet wallpaper panel background as the browser illustration'
);
assert.match(
  html,
  /\.newtab-preview-surface\s*\{[\s\S]*?--newtab-preview-page-scale:\s*0\.84;[\s\S]*?animation:\s*onboarding-newtab-preview-enter/,
  'newtab preview should keep the browser illustration full-size and scale the embedded newtab page into the marked browser content area'
);
assert.match(
  newtabPreviewBrowserBackdropStyle ? newtabPreviewBrowserBackdropStyle[0] : '',
  /animation-delay:\s*80ms;/,
  'the reused newtab browser backdrop should keep the delayed browser entrance without blurring the illustration itself'
);
assert.match(
  newtabPreviewBrowserForegroundStyle ? newtabPreviewBrowserForegroundStyle[0] : '',
  /left:\s*var\(--onboarding-browser-window-inset\);[\s\S]*?top:\s*var\(--onboarding-browser-window-inset\);[\s\S]*?width:\s*176%;[\s\S]*?height:\s*162%;[\s\S]*?overflow:\s*hidden;/,
  'newtab foreground should align with the reused browser backdrop without inheriting its blur'
);
assert.match(
  html,
  /\.newtab-preview-browser-foreground\s+\.newtab-preview-browser-page\s*\{[\s\S]*?margin-top:\s*50px;[\s\S]*?\}/,
  'newtab foreground page should start below the reused browser chrome'
);
assert.match(
  html,
  /\.newtab-preview-browser-page\s*\{[\s\S]*?height:\s*calc\(100% - 50px\);[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/,
  'newtab preview should reserve the red-frame browser content region below the chrome'
);
assert.match(
  html,
  /\.newtab-preview-viewport\s*\{[\s\S]*?left:\s*0;[\s\S]*?top:\s*0;[\s\S]*?transform:\s*scale\(var\(--newtab-preview-page-scale\)\);[\s\S]*?background:\s*transparent;[\s\S]*?overflow:\s*hidden;[\s\S]*?\}/,
  'embedded newtab viewport should be drawn from the browser-page origin so the container crops its upper-left content'
);
assert.match(
  html,
  /\.newtab-preview-viewport\s*\{[\s\S]*?--x-nt-bottom-dock-y-offset:\s*48px;[\s\S]*?--x-nt-bottom-dock-bottom-padding:\s*60px;/,
  'newtab preview bottom dock should define a vertical lift so recent cards do not sit on the browser bottom edge'
);
assert.match(
  html,
  /\.newtab-preview-bottom-dock,\s*[\s\S]*?#_x_extension_newtab_bottom_dock_2024_unique_\s*\{[\s\S]*?bottom:\s*var\(--x-nt-bottom-dock-y-offset\);/,
  'newtab preview bottom dock should use the lift variable instead of pinning to bottom zero'
);
assert.match(
  html,
  /\.newtab-preview-wordmark[\s\S]*margin:\s*100px auto 14px;[\s\S]*#_x_extension_newtab_root_2024_unique_[\s\S]*#_x_extension_newtab_suggestions_container_2024_unique_[\s\S]*\.x-nt-recent-card[\s\S]*\.x-nt-bookmark-card/,
  'newtab preview CSS should cover real wordmark, search, suggestions, recent, and bookmarks'
);
assert.match(
  html,
  /--x-nt-content-max-width:\s*1040px;[\s\S]*--x-nt-bookmark-columns:\s*4;/,
  'newtab preview should leave the same content gutter and default bookmark columns as Lumno newtab'
);
assert.match(
  html,
  /\.newtab-preview-viewport\s*\{[\s\S]*?--x-nt-content-viewport-width:\s*1040px;[\s\S]*?\}/,
  'newtab preview should use a fixed design viewport width so the embedded page scales with the outer visual panel instead of the browser viewport'
);
assert.match(
  html,
  /\.newtab-preview-viewport #_x_extension_newtab_root_2024_unique_\s*\{[\s\S]*?width:\s*var\(--x-nt-search-max-width\);[\s\S]*?max-width:\s*var\(--x-nt-search-max-width\);/,
  'newtab preview search panel should keep its designed width and inherit proportional scaling from the visual panel'
);
assert.match(
  html,
  /\.newtab-preview-bottom-dock,\s*[\s\S]*?#_x_extension_newtab_bottom_dock_2024_unique_\s*\{[\s\S]*?width:\s*var\(--x-nt-content-max-width\);/,
  'newtab preview bottom dock should keep its designed width instead of shrinking with the real viewport'
);
assert.doesNotMatch(
  html,
  /\.newtab-preview-viewport[\s\S]*?\b(?:90|96)vw\b/,
  'newtab preview should not depend on real viewport units inside the embedded fixed-size browser content'
);
assert.match(
  html,
  /\.newtab-preview-wordmark img\s*\{[\s\S]*?width:\s*108px;[\s\S]*?opacity:\s*0\.52;/,
  'newtab preview wordmark should be smaller and lighter inside the cropped browser area'
);
assert.match(
  script,
  /function getNewtabPreviewFolderSvg\(idSuffix\)[\s\S]*data-folder-layer="lower"[\s\S]*data-folder-layer="upper"[\s\S]*linearGradient/,
  'newtab preview folder bookmark should use the layered gradient folder SVG instead of the old flat placeholder'
);
assert.match(
  html,
  /--x-nt-bookmark-card-hover-underlay:\s*rgba\(0,\s*0,\s*0,\s*0\)/,
  'newtab bookmark cards should not inherit the dark hover underlay in their resting state'
);
assert.match(
  html,
  /@keyframes onboarding-newtab-preview-enter[\s\S]*?@keyframes onboarding-newtab-section-rise/,
  'newtab preview should include staged entrance animation keyframes'
);
assert.match(
  browserWindowStyle ? browserWindowStyle[0] : '',
  /--onboarding-browser-window-inset:\s*5%;[\s\S]*?left:\s*var\(--onboarding-browser-window-inset\);[\s\S]*?top:\s*var\(--onboarding-browser-window-inset\);[\s\S]*?width:\s*176%;[\s\S]*?height:\s*162%;/,
  'browser skeleton should keep balanced visible top and left inset while showing only its upper-left portion inside the visual container'
);
assert.match(
  visualPanelStyle ? visualPanelStyle[0] : '',
  /width:\s*var\(--onboarding-visual-canvas-width\);[\s\S]*?height:\s*var\(--onboarding-visual-canvas-height\);[\s\S]*?transform:\s*scale\(var\(--onboarding-visual-scale,\s*1\)\);[\s\S]*?transform-origin:\s*top left;/,
  'right visual panel should be the fixed 704x680 scaled unit, including the wallpaper, UI mock, and cursor coordinate space'
);
assert.match(
  visualCanvasStyle ? visualCanvasStyle[0] : '',
  /width:\s*100%;[\s\S]*?height:\s*100%;/,
  'visual canvas should fill the fixed scaled panel rather than own the responsive scale'
);
assert.doesNotMatch(
  visualCanvasStyle ? visualCanvasStyle[0] : '',
  /transform:\s*scale\(var\(--onboarding-visual-scale/,
  'visual canvas should not scale independently inside the right visual panel'
);
assert.doesNotMatch(
  browserWindowStyle ? browserWindowStyle[0] : '',
  /(?:^|\n)\s*inset\s*:/,
  'oversized browser skeleton should use explicit left/top/width/height rather than inset filling the panel'
);
assert.match(
  browserWindowStyle ? browserWindowStyle[0] : '',
  /border:\s*1px solid transparent;[\s\S]*?border-top-color:\s*rgba\(255,\s*255,\s*255,\s*0\.62\);[\s\S]*?border-left-color:\s*transparent;[\s\S]*?border-right-color:\s*transparent;[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.42\);/,
  'browser skeleton should keep a soft top edge without vertical outline seams'
);
assert.match(
  browserWindowStyle ? browserWindowStyle[0] : '',
  /box-shadow:[\s\S]*?inset 0 1px 0 rgba\(255,\s*255,\s*255,\s*0\.8\)/,
  'browser skeleton should keep airy inner white edge lighting instead of a solid card treatment'
);
assert.match(
  html,
  /\.lumno-overlay-panel\s*\{[\s\S]*?--onboarding-overlay-scale:\s*0\.9;[\s\S]*?\}/,
  'Lumno overlay demo should declare a smaller visual scale'
);
assert.match(
  html,
  /\.lumno-overlay-panel\s*\{[\s\S]*?width:\s*min\(680px,\s*calc\(100% - 56px\)\);[\s\S]*?\}/,
  'Lumno overlay demo should be scaled down and contained within the right visual panel'
);
assert.match(
  html,
  /\.browser-bar\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(88px,\s*0\.34fr\) minmax\(0,\s*1fr\) auto;[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\);[\s\S]*?\}/,
  'browser skeleton top chrome should be clearer and structured like a normal webpage window'
);
assert.match(
  html,
  /\.browser-address\s*\{[\s\S]*?background:\s*rgba\(15,\s*23,\s*42,\s*0\.08\);[\s\S]*?\}/,
  'browser address bar should use a visible neutral skeleton fill instead of blending into the wallpaper'
);
assert.match(
  html,
  /\.browser-window\s*\{[\s\S]*?--onboarding-browser-window-inset:\s*5%;[\s\S]*?left:\s*var\(--onboarding-browser-window-inset\);[\s\S]*?top:\s*var\(--onboarding-browser-window-inset\);[\s\S]*?border-left-color:\s*transparent;[\s\S]*?\}/,
  'browser illustration should use matching top and left inset while hiding the cropped left edge'
);
assert.match(
  html,
  /\.browser-window \.surface-rail-dot\s*\{[\s\S]*?width:\s*14px;[\s\S]*?height:\s*14px;[\s\S]*?border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.62\);[\s\S]*?background:\s*rgba\(15,\s*23,\s*42,\s*0\.16\);[\s\S]*?\}/,
  'mock macOS window dots should be large enough to read as window controls'
);
assert.match(
  html,
  /\.browser-page-line\s*\{[\s\S]*?background:\s*rgba\(15,\s*23,\s*42,\s*0\.055\);[\s\S]*?\}/,
  'webpage content skeleton should be neutral grayscale and readable'
);
assert.match(
  html,
  /\.browser-page-skeleton\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(120px,\s*0\.34fr\);[\s\S]*?\}/,
  'browser illustration should render a neutral webpage skeleton larger than the overlay'
);
assert.doesNotMatch(
  script,
  /bookmarkGrid|bookmark-tile|bookmark-mark/,
  'browser illustration should no longer render colored bookmark tiles'
);
assert.match(
  script,
  /className = 'browser-page-skeleton'/,
  'bookmark-focus visual should build a normal webpage skeleton behind the overlay'
);
assert.match(
  html,
  /\.demo-cursor\s*\{[\s\S]*?width:\s*34px;[\s\S]*?height:\s*36px;[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*rotate\(-6deg\);[\s\S]*?drop-shadow\(0 12px 16px rgba\(15,\s*23,\s*42,\s*0\.24\)\);[\s\S]*?\}/,
  'animated cursor should use a flatter Figma-like pointer scale without excessive rotation'
);
assert.match(
  script,
  /function createDemoCursorSvg\([\s\S]*?M8\.5 6\.5 L43\.5 28\.7 L29\.3 33 L20\.8 50 Z[\s\S]*?figma-cursor__outline[\s\S]*?figma-cursor__fill[\s\S]*?stroke-width',\s*'2'[\s\S]*?#303030/,
  'animated cursor should render a more symmetrical black pointer fill'
);
assert.match(
  html,
  /\.figma-cursor__outline\s*\{[\s\S]*?stroke-width:\s*10;[\s\S]*?\}/,
  'animated cursor should use a thicker white outline'
);
assert.match(
  html,
  /data-cursor-mode="intro"[\s\S]*?onboarding-cursor-logo-wander 8600ms[\s\S]*?data-cursor-mode="setup"[\s\S]*?onboarding-cursor-type 2600ms[\s\S]*?onboarding-cursor-hover-loop 9600ms linear[\s\S]*?data-direction="forward"[\s\S]*?onboarding-cursor-setup-from-logo 4240ms[\s\S]*?onboarding-cursor-hover-loop 9600ms linear[\s\S]*?@keyframes onboarding-cursor-logo-wander[\s\S]*?left:\s*58%;[\s\S]*?top:\s*43%;[\s\S]*?left:\s*47%;[\s\S]*?top:\s*58%;[\s\S]*?@keyframes onboarding-cursor-setup-from-logo[\s\S]*?left:\s*16%;[\s\S]*?top:\s*33%;[\s\S]*?left:\s*61%;[\s\S]*?top:\s*40\.6%;[\s\S]*?@keyframes onboarding-cursor-hover-loop[\s\S]*?0%,[\s\S]*?16\.67%[\s\S]*?left:\s*61%;[\s\S]*?top:\s*40\.6%;[\s\S]*?21\.67%,[\s\S]*?33\.33%[\s\S]*?top:\s*48%;[\s\S]*?38\.33%,[\s\S]*?50%[\s\S]*?top:\s*55\.4%;[\s\S]*?55%,[\s\S]*?66\.67%[\s\S]*?top:\s*62\.8%;[\s\S]*?71\.67%,[\s\S]*?83\.33%[\s\S]*?top:\s*70\.2%;[\s\S]*?88%[\s\S]*?left:\s*68%;[\s\S]*?top:\s*74\.6%;[\s\S]*?94%[\s\S]*?left:\s*68%;[\s\S]*?top:\s*36\.8%;[\s\S]*?100%[\s\S]*?left:\s*61%;[\s\S]*?top:\s*40\.6%;/,
  'animated cursor should wander around the cover logo, move into the focus-search input start, then arc from the last result back to the first without a loop jump'
);
assert.match(
  html,
  /@keyframes onboarding-cursor-idle-drift[\s\S]*?left:\s*70%;[\s\S]*?top:\s*72%;/,
  'animated cursor should keep a quiet idle motion on later onboarding pages'
);
assert.match(
  html,
  /data-cursor-mode="search"[\s\S]*?onboarding-cursor-newtab-triangle-loop 4060ms linear 1500ms infinite[\s\S]*?data-active-slide="search"\]\[data-direction="forward"\][\s\S]*?onboarding-cursor-newtab-from-setup 5040ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) both,[\s\S]*?onboarding-cursor-newtab-triangle-loop 4060ms linear 5040ms infinite[\s\S]*?@keyframes onboarding-cursor-newtab-from-setup[\s\S]*?--onboarding-cursor-transition-left[\s\S]*?left:\s*38%;[\s\S]*?top:\s*82%;[\s\S]*?left:\s*36\.6%;[\s\S]*?top:\s*56\.4%;[\s\S]*?100%[\s\S]*?left:\s*54\.8%;[\s\S]*?top:\s*66\.5%;[\s\S]*?@keyframes onboarding-cursor-newtab-triangle-loop[\s\S]*?0%[\s\S]*?left:\s*54\.8%;[\s\S]*?top:\s*66\.5%;[\s\S]*?12\.81%,[\s\S]*?42\.36%[\s\S]*?left:\s*38%;[\s\S]*?top:\s*82%;[\s\S]*?55\.17%,[\s\S]*?84\.73%[\s\S]*?left:\s*36\.6%;[\s\S]*?top:\s*56\.4%;[\s\S]*?100%[\s\S]*?left:\s*54\.8%;[\s\S]*?top:\s*66\.5%;/,
  'newtab preview cursor should loop a triangle through recent, bookmark, and the midpoint between rows'
);
assert.match(
  html,
  /data-cursor-mode="newtab"[\s\S]*?onboarding-cursor-site-search-idle 7200ms[\s\S]*?data-active-slide="newtab"\]\[data-direction="forward"\][\s\S]*?onboarding-cursor-site-search-from-newtab 3560ms[\s\S]*?onboarding-cursor-site-search-idle 7200ms[\s\S]*?3560ms infinite[\s\S]*?@keyframes onboarding-cursor-site-search-from-newtab[\s\S]*?--onboarding-cursor-transition-left[\s\S]*?--onboarding-cursor-transition-top[\s\S]*?left:\s*84%;[\s\S]*?top:\s*34%;[\s\S]*?left:\s*84%;[\s\S]*?top:\s*56%;[\s\S]*?left:\s*76%;[\s\S]*?top:\s*67\.5%;[\s\S]*?@keyframes onboarding-cursor-site-search-idle[\s\S]*?left:\s*76%;[\s\S]*?top:\s*67\.5%;/,
  'site-search page cursor should move from the previous page cursor position before idling near the demo result'
);
assert.match(
  html,
  /data-active-slide="finish"\]\[data-direction="forward"\]\s+\[data-cursor-mode="finish"\] \.demo-cursor\s*\{[\s\S]*?onboarding-cursor-finish-from-site-search 3200ms[\s\S]*?onboarding-cursor-idle-drift 7200ms[\s\S]*?3200ms infinite[\s\S]*?@keyframes onboarding-cursor-finish-from-site-search[\s\S]*?--onboarding-cursor-transition-left[\s\S]*?--onboarding-cursor-transition-top[\s\S]*?left:\s*70%;[\s\S]*?top:\s*72%;/,
  'finish page cursor should animate from the site-search cursor position before settling into the final idle drift'
);
assert.match(
  script,
  /const NEWTAB_PREVIEW_HOVER_START_MS = 1500;[\s\S]*?const NEWTAB_PREVIEW_HOVER_HOLD_MS = 1200;[\s\S]*?const NEWTAB_PREVIEW_HOVER_MOVE_MS = 520;[\s\S]*?const NEWTAB_PREVIEW_HOVER_SETTLE_MS = 1140;/,
  'newtab preview hover state sequence should match the one-shot triangle cursor timing'
);
assert.match(
  script,
  /const steps = \[[\s\S]*?\{ target: 'recent', duration: NEWTAB_PREVIEW_HOVER_HOLD_MS \}[\s\S]*?\{ target: '', duration: NEWTAB_PREVIEW_HOVER_MOVE_MS \}[\s\S]*?\{ target: 'bookmark', duration: NEWTAB_PREVIEW_HOVER_HOLD_MS \}[\s\S]*?\{ target: '', duration: NEWTAB_PREVIEW_HOVER_SETTLE_MS \}[\s\S]*?const step = steps\[newtabPreviewHoverStepIndex % steps\.length\];/,
  'newtab preview hover state sequence should loop with the triangle cursor timing'
);
assert.match(
  html,
  /\.x-nt-recent-card\.x-nt-recent-card--hover[\s\S]*?box-shadow:\s*var\(--x-nt-recent-card-shadow-hover\)[\s\S]*?\.x-nt-bookmark-card\.x-nt-bookmark-card--hover[\s\S]*?transform:\s*translateY\(-2\.5px\)[\s\S]*?\.x-nt-bookmark-card--folder\.x-nt-bookmark-card--hover \.x-nt-folder-preview/,
  'newtab preview hover classes should mirror plugin recent-card and bookmark-folder hover styling'
);
assert.match(
  html,
  /\.newtab-preview-viewport \.x-nt-folder-preview\s*\{[\s\S]*?margin-right:\s*-2px;[\s\S]*?\.newtab-preview-viewport \.x-nt-bookmark-card--folder\.x-nt-bookmark-card--hover \.x-nt-folder-preview\s*\{[\s\S]*?padding:\s*2px 0 2px 3px;/,
  'newtab preview should mirror the plugin folder favicon edge alignment and left-side rotation clearance'
);
assert.match(
  script,
  /cursorLayer\.dataset\.cursorMode = slide\.cursor\.enabled \? slide\.id : '';/,
  'cursor renderer should expose the active slide as a cursor animation mode'
);
assert.match(
  script,
  /function captureCursorTransitionStart\(nextState\)[\s\S]*?currentSlide\.id === 'intro' && nextSlide\.id === 'setup'[\s\S]*?currentSlide\.id === 'setup' && nextSlide\.id === 'search'[\s\S]*?currentSlide\.id === 'search' && nextSlide\.id === 'newtab'[\s\S]*?currentSlide\.id === 'newtab' && nextSlide\.id === 'finish'[\s\S]*?getComputedStyle\(cursor\)[\s\S]*?--onboarding-cursor-transition-left[\s\S]*?--onboarding-cursor-transition-top[\s\S]*?--onboarding-cursor-transition-transform/,
  'cursor transition should capture the current animated cursor frame before moving between cursor-driven pages, including site-search to finish'
);
assert.match(
  script,
  /function setNewtabPreviewHoverState\(container,\s*targetKind\)[\s\S]*?classList\.toggle\('x-nt-recent-card--hover'[\s\S]*?classList\.toggle\('x-nt-bookmark-card--hover'[\s\S]*?function startNewtabPreviewHoverLoop\(container\)[\s\S]*?stopNewtabPreviewHoverLoop\(container\)[\s\S]*?scheduleNewtabPreviewHoverStep\(container\)/,
  'newtab preview hover loop should toggle real plugin hover classes on recent cards and folder bookmarks'
);
assert.match(
  html,
  /@keyframes onboarding-cursor-setup-from-logo[\s\S]*?transform:\s*var\(--onboarding-cursor-transition-transform,\s*translate3d\(0,\s*0,\s*0\) rotate\(-7deg\)\);/,
  'cursor transition should start from the captured transform rather than resetting before it moves'
);
assert.match(
  html,
  /@keyframes onboarding-overlay-enter[\s\S]*?scale\(var\(--onboarding-overlay-enter-scale,\s*0\.985\)\)[\s\S]*?scale\(var\(--onboarding-overlay-scale,\s*1\)\)/,
  'overlay entrance animation should preserve the smaller final scale'
);
assert.match(
  html,
  /\.browser-window\s*\{[\s\S]*?--onboarding-browser-final-filter:\s*blur\(0\);[\s\S]*?animation:\s*onboarding-browser-enter 680ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) 80ms both;[\s\S]*?\}/,
  'browser illustration should have its own blurred entrance transition and default to a sharp final state'
);
assert.match(
  html,
  /@keyframes onboarding-browser-enter[\s\S]*?100%\s*\{[\s\S]*?filter:\s*var\(--onboarding-browser-final-filter,\s*blur\(0\)\);/,
  'browser illustration entrance should allow the newtab page to keep a small final blur without affecting other slides'
);
assert.match(
  html,
  /\.lumno-overlay-query-text\s*\{[\s\S]*?max-width:\s*calc\(9ch \+ 0\.75em\);[\s\S]*?overflow:\s*hidden;[\s\S]*?opacity:\s*1;[\s\S]*?\}/,
  'overlay query should leave enough reveal width for the typed keyword'
);
assert.match(
  html,
  /\.lumno-overlay-query-text \.onboarding-typing-char\s*\{[\s\S]*?animation-delay:\s*calc\(1640ms \+ var\(--typing-char-delay,\s*0ms\)\);[\s\S]*?\}/,
  'overlay query should reveal extension character-by-character as the cursor moves across the input'
);
assert.match(
  html,
  /\.lumno-overlay-panel \.x-lumno-search-input__container\s*\{[\s\S]*?border-radius:\s*28px;[\s\S]*?animation:\s*onboarding-overlay-input-shell-expand 980ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) 1900ms both;[\s\S]*?\}/,
  'overlay input should start as a compact standalone search box before results open'
);
assert.match(
  html,
  /\.lumno-overlay-results\s*\{[\s\S]*?max-height:\s*0;[\s\S]*?padding-top:\s*0;[\s\S]*?padding-bottom:\s*0;[\s\S]*?opacity:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?animation:\s*onboarding-overlay-results-reveal 980ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) 1900ms both;[\s\S]*?\}/,
  'overlay results should occupy no visible space before the typed query starts producing matches'
);
assert.match(
  html,
  /\.lumno-overlay-result\s*\{[\s\S]*?visibility:\s*hidden;[\s\S]*?animation:\s*onboarding-overlay-row-enter 500ms cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\) both;[\s\S]*?animation-delay:\s*calc\(1940ms \+ \(var\(--result-index,\s*0\) \* 170ms\)\);[\s\S]*?\}/,
  'overlay result rows should reveal one by one while extension is being typed'
);
assert.match(
  html,
  /\.lumno-overlay-result\s*\{[\s\S]*?--onboarding-overlay-result-hover-ease:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);[\s\S]*?background-color 380ms var\(--onboarding-overlay-result-hover-ease\)[\s\S]*?border-color 380ms var\(--onboarding-overlay-result-hover-ease\)[\s\S]*?box-shadow 420ms var\(--onboarding-overlay-result-hover-ease\)[\s\S]*?\}[\s\S]*?#_x_extension_onboarding_overlay_demo_2026_unique_ \.lumno-overlay-result\[data-active="true"\]\s*\{[\s\S]*?box-shadow:[\s\S]*?rgba\(86,\s*139,\s*220,\s*0\.12\)[\s\S]*?\}[\s\S]*?\.lumno-overlay-result \.x-ov-suggestion-source-tag,[\s\S]*?\.lumno-overlay-result \.x-ov-suggestion-action-button\s*\{[\s\S]*?background-color 320ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)[\s\S]*?color 260ms ease-out/,
  'overlay hover rows should use a softer transition for highlight, border, shadow, tags, and action buttons'
);
assert.match(
  html,
  /@keyframes onboarding-overlay-results-reveal[\s\S]*?max-height:\s*0;[\s\S]*?padding-top:\s*0;[\s\S]*?padding-bottom:\s*0;[\s\S]*?max-height:\s*var\(--x-ov-suggestions-max-height,\s*330px\);[\s\S]*?padding-top:\s*12px;[\s\S]*?padding-bottom:\s*12px;/,
  'overlay results reveal should expand the panel from an empty-input state into the full result stack'
);
assert.match(
  script,
  /function startLumnoOverlayHoverLoop\(container\)[\s\S]*?overlayHoverIndex = 0;[\s\S]*?setLumnoOverlayDemoActiveIndex\(panel,\s*overlayHoverIndex\);[\s\S]*?scheduleLumnoOverlayHoverStep\(panel,\s*results\.length,\s*LUMNO_OVERLAY_HOVER_STEP_MS \+ LUMNO_OVERLAY_HOVER_LEAD_MS\);/,
  'overlay demo should pre-warm the first active row before cycling through all results'
);
assert.match(
  script,
  /const LUMNO_OVERLAY_HOVER_LEAD_MS = 1040;[\s\S]*?const LUMNO_OVERLAY_HOVER_START_MS = 4240 - LUMNO_OVERLAY_HOVER_LEAD_MS;/,
  'overlay demo should lead the first hover highlight so it is visible when the cursor reaches the first result'
);
assert.match(
  script,
  /const LUMNO_OVERLAY_HOVER_WRAP_STEP_MS = 1600;/,
  'overlay demo should reserve a dedicated timing step for the last-result to first-result cursor return'
);
assert.match(
  script,
  /function scheduleLumnoOverlayHoverStep\(panel,\s*resultCount,\s*firstStepDelay\)[\s\S]*?const isWrapping = overlayHoverIndex >= resultCount - 1;[\s\S]*?const hasFirstStepDelay = Number\.isFinite\(firstStepDelay\) && firstStepDelay > 0;[\s\S]*?const stepDelay = hasFirstStepDelay[\s\S]*?\? firstStepDelay[\s\S]*?: isWrapping[\s\S]*?\? LUMNO_OVERLAY_HOVER_STEP_MS \+ LUMNO_OVERLAY_HOVER_WRAP_STEP_MS[\s\S]*?: LUMNO_OVERLAY_HOVER_STEP_MS;[\s\S]*?overlayHoverStepTimeout = window\.setTimeout\(\(\) => \{[\s\S]*?overlayHoverIndex = isWrapping \? 0 : overlayHoverIndex \+ 1;[\s\S]*?setLumnoOverlayDemoActiveIndex\(panel,\s*overlayHoverIndex\);[\s\S]*?scheduleLumnoOverlayHoverStep\(panel,\s*resultCount\);[\s\S]*?\},\s*stepDelay\);/,
  'overlay hover loop should hold the last active row while the cursor takes a distinct return path'
);
assert.match(
  script,
  /function prepareVisualExit\(nextState\)[\s\S]*?currentSlide\.visual\.kind === 'bookmark-focus-surface'[\s\S]*?nextSlide\.visual\.kind === 'lumno-web-wordmark-surface'[\s\S]*?classList\.add\('is-visual-exit'\)/,
  'returning from the second slide to the first should blur out the right-side illustration'
);
assert.match(
  content,
  /lumnoOverlay:\s*Object\.freeze\(\{[\s\S]*?query:\s*'extension'/,
  'overlay demo should use a common keyword that can naturally show extension/browser-page results'
);
assert.match(
  content,
  /type:\s*'topSite'[\s\S]*?sourceTag:\s*'常用'[\s\S]*?type:\s*'bookmark'[\s\S]*?sourceTag:\s*'书签'[\s\S]*?type:\s*'history'[\s\S]*?sourceTag:\s*'历史'[\s\S]*?type:\s*'newtab'[\s\S]*?visitButtonLabel:\s*'搜索'[\s\S]*?type:\s*'browserPage'[\s\S]*?chrome:\/\/extensions\//,
  'fake overlay results should match the real search order: top site, bookmark, history, Google search, browser-page command'
);
const overlayResultsSource = content.match(/lumnoOverlay:\s*Object\.freeze\(\{[\s\S]*?results:\s*Object\.freeze\(\[[\s\S]*?\n\s*\]\)[\s\S]*?\n\s*\}\)/);
assert.ok(overlayResultsSource, 'overlay fake result data should be declared as a frozen array');
assert.doesNotMatch(
  overlayResultsSource[0],
  /Lumno 工作台|Lumno Roadmap|Release \| Lumno|lumno\.kubai|kubai087\/lumno-extension/,
  'fake search result data should not use Lumno-specific examples'
);
assert.match(
  script,
  /rightIcon\.appendChild\(createIcon\('ri-settings-line ri-size-16'\)\);/,
  'overlay input right icon should match the real settings icon'
);
assert.match(
  script,
  /searchIcon\.appendChild\(createIcon\('ri-search-line ri-size-16'\)\);/,
  'overlay input left icon should match the real shared search input icon'
);
assert.match(
  html,
  /\.lumno-overlay-panel \.x-lumno-search-input__container\s*\{[\s\S]*?--x-ext-input-right-icon-inset:\s*13px;[\s\S]*?\}[\s\S]*?\.lumno-overlay-panel \.x-lumno-search-input__field\s*\{[\s\S]*?padding-right:\s*64px;[\s\S]*?\}/,
  'overlay input should right-align the settings button without reserving a trailing action slot'
);
assert.doesNotMatch(
  script,
  /closeOtherTabsButton|x-ov-close-other-tabs|ri-brush-2-line/,
  'onboarding overlay input should not reserve the close-other-tabs slot beside settings'
);
assert.match(
  script,
  /modeBadge\.dataset\.visible = 'false';/,
  'normal keyword search state should keep the mode badge hidden'
);
assert.doesNotMatch(script, /const iconWrap = document\.createElement\('span'\);/, 'auxiliary interaction rows should not create legacy card icons');
assert.doesNotMatch(html, /class="brand"/, 'onboarding shell should not show the extension logo header');
assert.doesNotMatch(html, /lumno\.png/, 'onboarding shell should not render the extension logo image');
assert.doesNotMatch(html, /data-onboarding-release/, 'onboarding shell should stay separate from release flow');
assert.doesNotMatch(html, /id="onboarding-steps"/, 'old checklist layout should not remain');
assert.doesNotMatch(html, /id="onboarding-features"/, 'old feature-card layout should not remain');

console.log('onboarding shell tests passed');
