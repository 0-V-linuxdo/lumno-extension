const assert = require('assert');
const fs = require('fs');

delete globalThis.LumnoOverlayLifecycle;
require('../src/overlay/lifecycle.js');

const lifecycle = globalThis.LumnoOverlayLifecycle;
const lifecycleSource = fs.readFileSync('src/overlay/lifecycle.js', 'utf8');
const shellSource = fs.readFileSync('react-src/overlay/shell.tsx', 'utf8');
const searchPanelSource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');
const sharedSearchInputSource = fs.readFileSync(
  'src/shared/search-input.css',
  'utf8'
);
const suggestionsViewSource = fs.readFileSync(
  'src/overlay/suggestions-view.css',
  'utf8'
);

function createStyleSink() {
  const values = new Map();
  return {
    setProperty(name, value, priority) {
      values.set(name, {
        value: String(value),
        priority: priority || ''
      });
    },
    getPropertyValue(name) {
      return values.has(name) ? values.get(name).value : '';
    },
    getPropertyPriority(name) {
      return values.has(name) ? values.get(name).priority : '';
    },
    removeProperty(name) {
      const oldValue = this.getPropertyValue(name);
      values.delete(name);
      return oldValue;
    }
  };
}

function createOverlayElement() {
  return {
    isConnected: true,
    style: createStyleSink()
  };
}

function createFakeWindow(options) {
  const settings = options || {};
  const windowListeners = new Map();
  const visualViewportListeners = new Map();
  const win = {
    devicePixelRatio: Number(settings.devicePixelRatio) || 1,
    innerWidth: Number(settings.innerWidth) || 1200,
    innerHeight: Number(settings.innerHeight) || 800,
    document: {
      documentElement: {
        clientWidth: Number(settings.innerWidth) || 1200,
        clientHeight: Number(settings.innerHeight) || 800
      }
    },
    addEventListener(type, handler) {
      windowListeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (windowListeners.get(type) === handler) {
        windowListeners.delete(type);
      }
    },
    visualViewport: {
      width: Number(settings.visualWidth) || Number(settings.innerWidth) || 1200,
      height: Number(settings.visualHeight) || Number(settings.innerHeight) || 800,
      scale: Number(settings.visualScale) || 1,
      offsetLeft: Number(settings.visualOffsetLeft) || 0,
      offsetTop: Number(settings.visualOffsetTop) || 0,
      addEventListener(type, handler) {
        visualViewportListeners.set(type, handler);
      },
      removeEventListener(type, handler) {
        if (visualViewportListeners.get(type) === handler) {
          visualViewportListeners.delete(type);
        }
      }
    },
    triggerWindowResize() {
      const handler = windowListeners.get('resize');
      if (handler) {
        handler();
      }
    },
    triggerVisualViewportResize() {
      const handler = visualViewportListeners.get('resize');
      if (handler) {
        handler();
      }
    },
    triggerVisualViewportScroll() {
      const handler = visualViewportListeners.get('scroll');
      if (handler) {
        handler();
      }
    }
  };
  return win;
}

assert.ok(
  lifecycle && typeof lifecycle.createViewportSizeSync === 'function',
  'overlay lifecycle should expose viewport size synchronization'
);
assert.doesNotMatch(
  lifecycleSource,
  /setProperty\('zoom'/,
  'overlay viewport compensation should not use CSS zoom because it shifts fixed-position anchors'
);
assert.match(
  shellSource,
  /scale\(var\(--x-ov-visible-scale,\s*1\)\)/,
  'overlay shell should compose viewport compensation into transform scale'
);
assert.match(
  searchPanelSource,
  /translateX\(-50%\) translateY\(0\) scale\(var\(--x-ov-visible-scale,\s*1\)\) scaleX\(1\)/,
  'overlay reveal state should preserve viewport scale while completing the centered horizontal stretch'
);
assert.match(
  searchPanelSource,
  /function applyOverlayEnterAnimationInitialState\(overlayElement\)[\s\S]*?overlayEnterAnimation === 'fade'[\s\S]*?--x-lumno-search-entry-scale-start', '0\.92'[\s\S]*?--x-lumno-search-entry-duration', '270ms'[\s\S]*?--x-lumno-search-entry-delay', '40ms'/,
  'the whole overlay panel should use a pronounced horizontal stretch after its initial blur starts clearing'
);
assert.match(
  searchPanelSource,
  /const revealTransform = getOverlayEnterAnimationRevealTransform\(\);\s*if \(reduceMotion\) \{[\s\S]*?setProperty\('transform', revealTransform, 'important'\)[\s\S]*?runEnterAnimation\(overlay, \(\) => \{[\s\S]*?setProperty\('transform', revealTransform, 'important'\)/,
  'overlay reveal should stretch the entire panel in the visible frame and skip transitions for reduced motion'
);
assert.match(
  searchPanelSource,
  /if \(overlayEnterAnimation === 'fade'\) \{[\s\S]*?translateY\(10px\)[\s\S]*?scale\(0\.985\)[\s\S]*?blur\(6px\)[\s\S]*?transform 340ms cubic-bezier\(0\.2, 1, 0\.36, 1\), opacity 220ms ease, filter 300ms ease/,
  'fade mode should restore the former overlay entrance motion'
);
assert.match(
  searchPanelSource,
  /Promise\.all\(\[[\s\S]*?revealReady[\s\S]*?initialOverlayEnterAnimationReady[\s\S]*?applyOverlayEnterAnimationInitialState\(overlay\);\s*revealOverlay\(\);/,
  'overlay reveal should wait for the stored animation preference before exposing the mount'
);
assert.match(
  shellSource,
  /const OVERLAY_PANEL_ENTRY_TRANSFORM =\s*'translateX\(-50%\) translateY\(4px\) scale\(var\(--x-ov-visible-scale, 1\)\) scaleX\(var\(--x-lumno-search-entry-scale-start, 0\.97\)\)';[\s\S]*?const OVERLAY_PANEL_TRANSITION =\s*'transform var\(--x-lumno-search-entry-duration, 240ms\) var\(--x-lumno-search-entry-easing,[\s\S]*?var\(--x-lumno-search-entry-delay, 40ms\)[\s\S]*?opacity 180ms ease, filter 240ms ease'[\s\S]*?transform: \$\{OVERLAY_PANEL_ENTRY_TRANSFORM\} !important;[\s\S]*?filter: blur\(10px\) !important;[\s\S]*?transition: \$\{OVERLAY_PANEL_TRANSITION\} !important;/,
  'the overlay shell should keep centering and horizontal stretch in one transform chain'
);
assert.match(
  sharedSearchInputSource,
  /--x-lumno-search-entry-scale-start:\s*0\.97;[\s\S]*?--x-lumno-search-entry-easing:\s*cubic-bezier\(0\.16, 1, 0\.3, 1\);/,
  'overlay and new-tab should retain a shared fallback token definition'
);
assert.match(
  shellSource,
  /--x-ov-panel-radius:\s*28px;[\s\S]*?border-radius:\s*var\(--x-ov-panel-radius\)\s*!important;/,
  'overlay shell should use the smaller 28px radius on every outer corner'
);
assert.doesNotMatch(
  shellSource,
  /--x-ov-panel-top-radius/,
  'overlay shell should expose one shared outer-corner radius token'
);
assert.match(
  searchPanelSource,
  /setOverlayPanelScopedStyle\([\s\S]*?'border-radius',[\s\S]*?'var\(--x-ov-panel-radius, 28px\)'[\s\S]*?\);/,
  'collapsed and expanded overlays should keep the same 28px radius on all four outer corners'
);
assert.match(
  searchPanelSource,
  /shouldCollapse\s*\?\s*'var\(--x-ov-panel-radius, 28px\)'\s*:\s*'var\(--x-ov-panel-radius, 28px\) var\(--x-ov-panel-radius, 28px\) 0 0'/,
  'the input should retain 28px top corners while its internal expanded seam stays square'
);
assert.match(
  suggestionsViewSource,
  /border-radius:\s*0 0 var\(--x-ov-panel-radius,\s*28px\) var\(--x-ov-panel-radius,\s*28px\);/,
  'overlay results should share the 28px shell radius at the lower corners'
);
assert.match(
  searchPanelSource,
  /function captureSuggestionsHeightState\(container\)[\s\S]*?suggestionsHeightAnimationTargetIsCapped[\s\S]*?state\.heldHeight[\s\S]*?suggestionsHeightAnimationTarget[\s\S]*?cancelSuggestionsHeightAnimation\(container\)/,
  'overlay suggestion rerenders should preserve the intended animation target instead of treating its intermediate height as stable'
);
assert.match(
  searchPanelSource,
  /const previousHeightState =[\s\S]*?updateKind === 'highlight' \|\| updateKind === 'content'[\s\S]*?\? null[\s\S]*?: captureSuggestionsHeightState\(suggestionsContainer\);[\s\S]*?reactView\.render\(\{[\s\S]*?if \(previousHeightState\) \{[\s\S]*?holdSuggestionsHeightForRemoteMix\([\s\S]*?animateSuggestionsHeight\([\s\S]*?suggestionsContainer,[\s\S]*?previousHeightState\.height/,
  'overlay structural replacements should animate from the existing height while local content and highlight updates bypass the height pipeline'
);
assert.match(
  searchPanelSource,
  /function holdSuggestionsHeightForRemoteMix\(container, previousState, query, enabled\)[\s\S]*?shouldHold[\s\S]*?suggestionsHeightInputLockedHeight[\s\S]*?previousState\.heldHeight[\s\S]*?height.*heldHeight[\s\S]*?transition', 'none'/,
  'intermediate URL and remote result renders should keep the prior input-session height while mixing'
);
assert.match(
  searchPanelSource,
  /function beginSuggestionsHeightInputSession\(query\)[\s\S]*?suggestionsHeightInputLockedHeight[\s\S]*?setTimeout\([\s\S]*?finishSuggestionsHeightInputSession\(\)/,
  'overlay typing should lock suggestion height until the input burst settles'
);
assert.match(
  searchPanelSource,
  /handleSearchInputEvent\(event\)[\s\S]*?beginSuggestionsHeightInputSession\(query\)[\s\S]*?requestOverlaySearchSuggestions\(query\)/,
  'overlay input should start the stable-height session before matching each query'
);
assert.match(
  searchPanelSource,
  /suggestionsHeightAnimationTarget = toHeight;[\s\S]*?suggestionsHeightAnimationTargetIsCapped = targetMetrics\.atMaxHeight;/,
  'height animations should track their intended target so rapid typing cannot restart from an in-flight pixel value'
);
assert.match(
  searchPanelSource,
  /updateSearchSuggestions\(localSuggestions, requestQuery, \{[\s\S]*?deferCappedShrink: true,[\s\S]*?remoteMixState[\s\S]*?remoteMixState\.settled = true;[\s\S]*?updateSearchSuggestions\(remoteResponse\.suggestions, requestQuery\);/,
  'the overlay request pipeline should defer capped shrink only until the remote mix settles'
);
assert.match(
  searchPanelSource,
  /if \(siteSearchState && requestQuery\) \{\s*updateSearchSuggestions\(\[\], requestQuery\);\s*return;\s*\}/,
  'active site-search queries should render their deterministic single result without waiting for remote suggestion mixing'
);
assert.match(
  searchPanelSource,
  /const isLargeShrink = toHeight < fromHeight - Math\.max\(104, fromHeight \* 0\.35\);[\s\S]*?transitionDurationMs = isLargeShrink \? 100 : 180/,
  'large result collapses should use the faster height transition'
);
assert.match(
  searchPanelSource,
  /if \(isPaste \|\| getDirectUrlSuggestion\(query\)\) \{[\s\S]*?updatePendingSearchSuggestions\(query, \{[\s\S]*?deferCappedShrink: true[\s\S]*?\}\);/,
  'an immediate URL preview should retain existing rows and height until its full local and remote results arrive'
);
assert.match(
  searchPanelSource,
  /remoteMixState && remoteMixState\.settled && remoteMixState\.hasFinalSuggestions[\s\S]*?return;/,
  'a late local render should not overwrite an already completed remote mix'
);
assert.doesNotMatch(
  searchPanelSource,
  /function animateSuggestionsGrowth\(/,
  'overlay should not keep the append-only growth animation that caused repeated flashes while typing'
);

{
  const win = createFakeWindow({
    innerWidth: 1200,
    innerHeight: 800,
    visualWidth: 600,
    visualHeight: 400,
    visualScale: 2,
    visualOffsetLeft: 120,
    visualOffsetTop: 40
  });
  const overlay = createOverlayElement();
  const sync = lifecycle.createViewportSizeSync(win, {
    getSizePreset: () => ({ width: 760, maxHeightVh: 75, uiScale: 1 }),
    getRequestedTabZoomFactor: () => 1
  });

  sync.start(overlay);

  assert.strictEqual(
    overlay.style.getPropertyValue('--x-ov-visible-scale'),
    '0.5',
    'overlay should reverse visual viewport pinch zoom so cmd+wheel does not magnify it'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('zoom'),
    '',
    'overlay should avoid CSS zoom so fixed-position centering stays stable'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('left'),
    '420px',
    'overlay should keep its original 50vw screen position inside the shifted visual viewport'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('top'),
    '120px',
    'overlay should keep its original 20vh screen position inside the shifted visual viewport'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('max-width'),
    '1176px',
    'overlay max-width should use the scaled visual viewport width so pinch zoom does not shrink the panel'
  );
}

{
  const win = createFakeWindow({
    innerWidth: 1200,
    innerHeight: 800,
    visualWidth: 1200,
    visualHeight: 800,
    visualScale: 1
  });
  const overlay = createOverlayElement();
  const sync = lifecycle.createViewportSizeSync(win, {
    getSizePreset: () => ({ width: 760, maxHeightVh: 75, uiScale: 1 }),
    getRequestedTabZoomFactor: () => 1
  });

  sync.start(overlay);
  assert.strictEqual(overlay.style.getPropertyValue('--x-ov-visible-scale'), '1');

  win.visualViewport.width = 600;
  win.visualViewport.height = 400;
  win.visualViewport.scale = 2;
  win.visualViewport.offsetLeft = 240;
  win.visualViewport.offsetTop = 80;
  win.triggerVisualViewportResize();

  assert.strictEqual(
    overlay.style.getPropertyValue('--x-ov-visible-scale'),
    '0.5',
    'overlay should resync when cmd+wheel changes visual viewport scale after mounting'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('left'),
    '540px',
    'overlay should resync the original vw position when the visual viewport offset changes'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('top'),
    '160px',
    'overlay should resync the original vh position when the visual viewport offset changes'
  );

  win.visualViewport.offsetTop = 100;
  win.triggerVisualViewportScroll();
  assert.strictEqual(
    overlay.style.getPropertyValue('top'),
    '180px',
    'overlay should follow visual viewport scrolling without waiting for a resize'
  );
}

console.log('overlay viewport size sync tests passed');
