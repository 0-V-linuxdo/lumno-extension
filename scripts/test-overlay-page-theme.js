const assert = require('assert');
const fs = require('fs');
const path = require('path');

const pageTheme = require('../src/overlay/page-theme.js');

function createElement(config) {
  const element = {
    id: config.id || '',
    nodeType: 1,
    parentElement: config.parentElement || null,
    children: [],
    _style: {
      backgroundColor: config.backgroundColor || 'rgba(0, 0, 0, 0)',
      color: config.color || 'rgb(17, 24, 39)',
      opacity: config.opacity || '1',
      display: config.display || 'block',
      visibility: config.visibility || 'visible'
    },
    hasAttribute(name) {
      return Boolean(config.attributes && Object.prototype.hasOwnProperty.call(config.attributes, name));
    },
    getAttribute(name) {
      if (name === 'id') {
        return this.id;
      }
      return config.attributes && Object.prototype.hasOwnProperty.call(config.attributes, name)
        ? config.attributes[name]
        : null;
    }
  };
  if (element.parentElement && element.parentElement.children) {
    element.parentElement.children.push(element);
  }
  return element;
}

function createDocumentWithSamples(samples, options) {
  const docEl = createElement({
    backgroundColor: options && options.rootBackgroundColor
      ? options.rootBackgroundColor
      : 'rgba(0, 0, 0, 0)'
  });
  const body = createElement({
    parentElement: docEl,
    backgroundColor: options && options.bodyBackgroundColor
      ? options.bodyBackgroundColor
      : 'rgba(0, 0, 0, 0)'
  });
  const document = {
    documentElement: docEl,
    body,
    elementFromPoint(x, y) {
      if (typeof samples === 'function') {
        return samples(x, y);
      }
      return samples.shift() || null;
    }
  };
  const window = {
    innerWidth: 1000,
    innerHeight: 800,
    getComputedStyle(element) {
      return element && element._style ? element._style : {};
    }
  };
  return { document, window, docEl, body };
}

function testVisualThemeUsesVisibleDarkSurfaces() {
  const { document, window, body } = createDocumentWithSamples([], {
    rootBackgroundColor: 'rgb(250, 250, 250)',
    bodyBackgroundColor: 'rgba(0, 0, 0, 0)'
  });
  const darkSurface = createElement({
    parentElement: body,
    backgroundColor: 'rgb(18, 18, 18)',
    color: 'rgb(238, 238, 238)'
  });
  document.elementFromPoint = () => darkSurface;

  assert.strictEqual(
    pageTheme.detectPageVisualTheme({ document, window }),
    'dark',
    'visible dark app surfaces should override a transparent body/root fallback'
  );
}

function testVisualThemeReturnsNullForAmbiguousSurfaces() {
  const { document, window, body } = createDocumentWithSamples([], {});
  const middleSurface = createElement({
    parentElement: body,
    backgroundColor: 'rgb(128, 128, 128)',
    color: 'rgb(96, 96, 96)'
  });
  document.elementFromPoint = () => middleSurface;

  assert.strictEqual(
    pageTheme.detectPageVisualTheme({ document, window }),
    null,
    'ambiguous mid-tone surfaces should not force a theme'
  );
}

function testVisualThemeUsesLightTextWhenBackgroundIsTransparent() {
  const { document, window, body } = createDocumentWithSamples([], {
    rootBackgroundColor: 'rgba(0, 0, 0, 0)',
    bodyBackgroundColor: 'rgba(0, 0, 0, 0)'
  });
  const transparentDarkUiSurface = createElement({
    parentElement: body,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    color: 'rgb(245, 245, 245)'
  });
  document.elementFromPoint = () => transparentDarkUiSurface;

  assert.strictEqual(
    pageTheme.detectPageVisualTheme({ document, window }),
    'dark',
    'light text on transparent sampled surfaces should count as a dark UI signal'
  );
}

function testVisualThemeIgnoresLumnoOverlayElements() {
  const { document, window, body } = createDocumentWithSamples([], {});
  const overlayPanel = createElement({
    id: '_x_extension_overlay_2024_unique_',
    parentElement: body,
    backgroundColor: 'rgb(20, 20, 20)',
    color: 'rgb(238, 238, 238)'
  });
  const lightSurface = createElement({
    parentElement: body,
    backgroundColor: 'rgb(255, 255, 255)',
    color: 'rgb(17, 24, 39)'
  });
  let calls = 0;
  document.elementFromPoint = () => {
    calls += 1;
    return calls <= 2 ? overlayPanel : lightSurface;
  };

  assert.strictEqual(
    pageTheme.detectPageVisualTheme({ document, window }),
    'light',
    'theme sampling should ignore Lumno overlay elements to avoid self-reinforcing detection'
  );
}

function testVisualThemeSamplesOverlayFootprint() {
  const { document, window, body } = createDocumentWithSamples([], {
    bodyBackgroundColor: 'rgb(18, 18, 18)'
  });
  const darkSurface = createElement({
    parentElement: body,
    backgroundColor: 'rgb(18, 18, 18)',
    color: 'rgb(238, 238, 238)'
  });
  let sampleCount = 0;
  document.elementFromPoint = () => {
    sampleCount += 1;
    return darkSurface;
  };

  assert.strictEqual(pageTheme.detectPageVisualTheme({ document, window }), 'dark');
  assert.ok(
    sampleCount >= 24,
    'visual theme sampling should cover the overlay footprint with more than a tiny set of points'
  );
}

function testTransparentCssColorsDoNotBecomeDarkThemeSignals() {
  assert.strictEqual(
    pageTheme.getCssColorThemeSignal('rgba(0, 0, 0, 0)', 0.78),
    null,
    'a fully transparent root background should not count as a black page surface'
  );
  assert.strictEqual(
    pageTheme.getCssColorThemeSignal('rgba(0, 0, 0, 0.1)', 0.78).theme,
    'light',
    'a faint translucent black surface should be composited over the page canvas before classification'
  );
}

function testWappalyzerLikeLightPageSignalsResolveLight() {
  const signals = [
    { theme: 'light', confidence: 0.74, weight: 0.48 },
    { theme: 'light', confidence: 0.62, weight: 0.26 },
    pageTheme.getCssColorThemeSignal('#4608ad', 0.72),
    pageTheme.getCssColorThemeSignal('rgba(0, 0, 0, 0)', 0.78),
    pageTheme.getCssColorThemeSignal('rgba(0, 0, 0, 0)', 0.58),
    { theme: 'light', confidence: 0.62, weight: 1.05 }
  ];
  assert.strictEqual(
    pageTheme.resolvePageThemeSignals(signals),
    'light',
    'explicit light mode and a mostly light viewport should beat a dark brand theme-color'
  );
}

function testSearchPanelFusesThemeColorAndVisualSignals() {
  const searchPanelSource = fs.readFileSync(path.join(__dirname, '../src/overlay/search-panel.js'), 'utf8');
  const themeColorSignalIndex = searchPanelSource.indexOf('getThemeSignalFromRgb(themeColorRgb');
  const visualSignalIndex = searchPanelSource.indexOf('const visualSignal = detectPageVisualThemeSignal();');
  const fusedThemeIndex = searchPanelSource.indexOf('const fusedTheme = resolvePageThemeSignals');
  const themeColorIndex = searchPanelSource.indexOf("const themeColor = getHeadMetaContent('theme-color').trim();");
  const bodyBackgroundIndex = searchPanelSource.indexOf('const bodyStyle = body ? window.getComputedStyle(body) : null;');
  assert.ok(themeColorSignalIndex > 0, 'search-panel should convert theme-color into a weighted signal');
  assert.ok(visualSignalIndex > 0, 'search-panel should convert visual sampling into a weighted signal');
  assert.ok(fusedThemeIndex > 0, 'search-panel should fuse theme-color and visual sampling signals');
  assert.ok(
    themeColorIndex < fusedThemeIndex && visualSignalIndex < fusedThemeIndex,
    'theme-color and visual sampling should both be gathered before resolving the final theme'
  );
  assert.ok(
    fusedThemeIndex < bodyBackgroundIndex,
    'fused signal resolution should run before the legacy body/html background fallback'
  );
  assert.ok(
    !searchPanelSource.includes('strongThemeColorTheme'),
    'theme-color should not hard-prioritize over visual sampling'
  );
}

function testSearchPanelDoesNotShortCircuitExplicitThemeHints() {
  const searchPanelSource = fs.readFileSync(path.join(__dirname, '../src/overlay/search-panel.js'), 'utf8');
  const candidateThemeIndex = searchPanelSource.indexOf('const candidateTheme = getPageThemeCandidateElements');
  const fusedThemeIndex = searchPanelSource.indexOf('const fusedTheme = resolvePageThemeSignals');
  assert.ok(
    candidateThemeIndex > 0 && candidateThemeIndex < fusedThemeIndex,
    'explicit class/attribute theme hints should be gathered before signal fusion'
  );
  assert.ok(
    searchPanelSource.includes('getThemeSignalFromTheme(candidateTheme'),
    'explicit class/attribute theme hints should become weighted signals'
  );
  assert.ok(
    searchPanelSource.includes('getThemeSignalFromSchemeValue(colorSchemeMeta'),
    'color-scheme meta hints should become weighted signals'
  );
  assert.ok(
    searchPanelSource.includes('getThemeSignalFromSchemeValue(schemeValue'),
    'computed color-scheme hints should become weighted signals'
  );
  assert.ok(
    !searchPanelSource.includes('if (candidateTheme) {\n        return candidateTheme;\n      }'),
    'explicit class/attribute hints should not short-circuit darker visual signals'
  );
  assert.ok(
    !searchPanelSource.includes("if (schemeValue.includes('light') && !schemeValue.includes('dark')) {\n        return 'light';\n      }"),
    'computed color-scheme should not short-circuit darker visual signals'
  );
}

function testSearchPanelAvoidsBusinessClassNameThemeMatches() {
  const searchPanelSource = fs.readFileSync(path.join(__dirname, '../src/overlay/search-panel.js'), 'utf8');
  assert.ok(
    searchPanelSource.includes('function getThemeClassTokenTheme(token)'),
    'class theme detection should use per-token semantic classification'
  );
  assert.ok(
    !searchPanelSource.includes('(^|[\\s_-])(light|lightmode|light-theme|theme-light|day)([\\s_-]|$)'),
    'class theme detection should not treat business names like light-rays as light theme'
  );
  assert.ok(
    !searchPanelSource.includes('(^|[\\s_-])(dark|darkmode|dark-theme|theme-dark|night)([\\s_-]|$)'),
    'class theme detection should not treat business names like dark-veil as dark theme'
  );
}

function testSearchPanelAppliesInitialSystemThemeBeforeAppend() {
  const searchPanelSource = fs.readFileSync(path.join(__dirname, '../src/overlay/search-panel.js'), 'utf8');
  const initialThemeIndex = searchPanelSource.indexOf('applyOverlayThemeVariables(overlay, overlayThemeMode);');
  const themeTokensIndex = searchPanelSource.indexOf('const overlayThemeTokens = {');
  const appendIndex = searchPanelSource.indexOf('overlayMountParent.appendChild(overlayHost);');
  assert.ok(initialThemeIndex > 0, 'search-panel should apply a synchronous initial system theme');
  assert.ok(
    initialThemeIndex > themeTokensIndex,
    'initial system theme should run after overlay theme tokens are initialized'
  );
  assert.ok(
    initialThemeIndex < appendIndex,
    'initial system theme should be applied before the overlay host is appended'
  );
}

function testSearchPanelExcludesInputExtensionsBeforeMountAndFocus() {
  const searchPanelSource = fs.readFileSync(path.join(__dirname, '../src/overlay/search-panel.js'), 'utf8');
  const isolationFunctionIndex = searchPanelSource.indexOf(
    'function applyOverlayInputExtensionIsolation(input)'
  );
  const inputCreatedIndex = searchPanelSource.indexOf('let searchInput = inputParts.input;');
  const isolationCallIndex = searchPanelSource.indexOf(
    'applyOverlayInputExtensionIsolation(searchInput);'
  );
  const inputMountIndex = searchPanelSource.indexOf('overlay.appendChild(inputContainer);');
  const focusFunctionIndex = searchPanelSource.indexOf(
    'function focusOverlayInputForReveal()'
  );
  const focusIndex = searchPanelSource.indexOf(
    'focusOverlayInputForReveal();',
    focusFunctionIndex
  );
  const requiredAttributes = {
    'data-1p-ignore': 'true',
    'data-op-ignore': 'true',
    'data-lpignore': 'true',
    'data-bwignore': 'true',
    'data-form-type': 'other',
    'data-gramm': 'false',
    'data-lt-active': 'false',
    spellcheck: 'false',
    writingsuggestions: 'false'
  };
  assert.ok(isolationFunctionIndex > 0, 'search-panel should define input-extension isolation');
  Object.entries(requiredAttributes).forEach(([name, value]) => {
    assert.ok(
      searchPanelSource.includes(`'${name}': '${value}'`),
      `search-panel should isolate its input with ${name}=${value}`
    );
  });
  assert.ok(inputCreatedIndex > 0, 'search-panel should create the search input');
  assert.ok(
    isolationCallIndex > inputCreatedIndex,
    'search-panel should isolate its search input after creation'
  );
  assert.ok(
    isolationCallIndex < inputMountIndex &&
      inputMountIndex < focusFunctionIndex &&
      focusFunctionIndex < focusIndex,
    'input-extension exclusion should be applied before the input is mounted and reveal-owned focus runs'
  );
  assert.ok(
    !searchPanelSource.includes(
      'setTimeout(() => searchInput.focus({ preventScroll: true }), 100);'
    ),
    'overlay focus should follow the reveal transaction instead of an unrelated fixed timer'
  );
}

testVisualThemeUsesVisibleDarkSurfaces();
testVisualThemeReturnsNullForAmbiguousSurfaces();
testVisualThemeUsesLightTextWhenBackgroundIsTransparent();
testVisualThemeIgnoresLumnoOverlayElements();
testVisualThemeSamplesOverlayFootprint();
testTransparentCssColorsDoNotBecomeDarkThemeSignals();
testWappalyzerLikeLightPageSignalsResolveLight();
testSearchPanelFusesThemeColorAndVisualSignals();
testSearchPanelDoesNotShortCircuitExplicitThemeHints();
testSearchPanelAvoidsBusinessClassNameThemeMatches();
testSearchPanelAppliesInitialSystemThemeBeforeAppend();
testSearchPanelExcludesInputExtensionsBeforeMountAndFocus();

console.log('overlay page theme tests passed');
