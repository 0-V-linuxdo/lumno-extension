const assert = require('assert');
const fs = require('fs');
const path = require('path');

const overlaySiteFixes = require('../src/overlay/site-fixes.js');

const repoRoot = path.resolve(__dirname, '..');

function createStyle() {
  const values = new Map();
  return {
    getPropertyValue(name) {
      return values.get(name) || '';
    },
    removeProperty(name) {
      values.delete(name);
    },
    setProperty(name, value, priority) {
      values.set(name, priority ? `${value} !${priority}` : value);
    }
  };
}

function createOverlay() {
  const attributes = new Map();
  return {
    style: createStyle(),
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

function createStylesheet(id, loaded) {
  const listeners = new Map();
  const link = {
    dataset: {},
    id,
    rel: 'stylesheet',
    sheet: loaded ? {} : null,
    addEventListener(type, listener) {
      const callbacks = listeners.get(type) || [];
      callbacks.push(listener);
      listeners.set(type, callbacks);
    },
    getAttribute(name) {
      if (name === 'rel') {
        return this.rel;
      }
      return null;
    },
    removeEventListener(type, listener) {
      const callbacks = listeners.get(type) || [];
      listeners.set(type, callbacks.filter((callback) => callback !== listener));
    },
    dispatch(type) {
      (listeners.get(type) || []).slice().forEach((listener) => listener());
    }
  };
  return link;
}

function createStyleRoot(links) {
  const byId = new Map(links.map((link) => [link.id, link]));
  return {
    getElementById(id) {
      return byId.get(id) || null;
    }
  };
}

function createWindow(hostname) {
  let nextFrameId = 0;
  const frameCallbacks = new Map();
  return {
    location: { hostname },
    clearTimeout,
    cancelAnimationFrame(frameId) {
      frameCallbacks.delete(frameId);
    },
    requestAnimationFrame(callback) {
      nextFrameId += 1;
      frameCallbacks.set(nextFrameId, callback);
      return nextFrameId;
    },
    runNextAnimationFrame() {
      const nextEntry = frameCallbacks.entries().next();
      if (nextEntry.done) {
        return false;
      }
      const [frameId, callback] = nextEntry.value;
      frameCallbacks.delete(frameId);
      callback(Date.now());
      return true;
    },
    setTimeout
  };
}

async function testOrdinarySitesWaitForCriticalOverlayStyles() {
  const inputStyle = createStylesheet(
    overlaySiteFixes.OVERLAY_STYLE_IDS.input,
    false
  );
  const suggestionsStyle = createStylesheet(
    overlaySiteFixes.OVERLAY_STYLE_IDS.suggestions,
    false
  );
  const overlay = createOverlay();
  const win = createWindow('github.com');
  const gate = overlaySiteFixes.createOverlayRevealGate(
    win,
    {
      overlay,
      styleRoot: createStyleRoot([inputStyle, suggestionsStyle]),
      maxWaitMs: 100
    }
  );

  assert.strictEqual(gate.active, true, 'critical style gating should apply to every site');
  assert.strictEqual(
    overlay.style.getPropertyValue('visibility'),
    'hidden !important',
    'the overlay should remain hidden while native input and button styles could paint'
  );
  assert.strictEqual(
    overlay.getAttribute('data-lumno-site-fix-reveal'),
    overlaySiteFixes.OVERLAY_STYLE_REVEAL_POLICY.id
  );

  let settled = false;
  const ready = gate.waitUntilReady().then((result) => {
    settled = true;
    return result;
  });
  await Promise.resolve();
  assert.strictEqual(settled, false, 'the reveal should wait while styles are still loading');

  inputStyle.sheet = {};
  inputStyle.dispatch('load');
  await Promise.resolve();
  assert.strictEqual(settled, false, 'all critical styles must be ready before reveal');

  suggestionsStyle.sheet = {};
  suggestionsStyle.dispatch('load');
  const result = await ready;
  assert.deepStrictEqual(result, {
    ok: true,
    reason: 'loaded',
    fixId: overlaySiteFixes.OVERLAY_STYLE_REVEAL_POLICY.id
  });
  assert.strictEqual(
    win.runNextAnimationFrame(),
    false,
    'the style gate should not add frames before the entry animation'
  );

  gate.release();
  assert.strictEqual(overlay.style.getPropertyValue('visibility'), '');
  assert.strictEqual(overlay.hasAttribute('data-lumno-site-fix-reveal'), false);
}

async function testAlreadyLoadedStylesDoNotDelayReveal() {
  const inputStyle = createStylesheet(
    overlaySiteFixes.OVERLAY_STYLE_IDS.input,
    true
  );
  const suggestionsStyle = createStylesheet(
    overlaySiteFixes.OVERLAY_STYLE_IDS.suggestions,
    true
  );
  const win = createWindow('example.com');
  const overlay = createOverlay();
  const gate = overlaySiteFixes.createOverlayRevealGate(
    win,
    {
      overlay,
      styleRoot: createStyleRoot([inputStyle, suggestionsStyle])
    }
  );

  const result = await gate.waitUntilReady();
  assert.strictEqual(
    win.runNextAnimationFrame(),
    false,
    'cached styles should not add frames before the entry animation'
  );
  assert.strictEqual(
    overlay.style.getPropertyValue('visibility'),
    'hidden !important'
  );
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.reason, 'already-loaded');
}

function testBootstrapDisablesRightButtonTransitions() {
  const overlayShellSource = fs.readFileSync(
    path.join(repoRoot, 'react-src/overlay/shell.tsx'),
    'utf8'
  );
  const searchInputCss = fs.readFileSync(
    path.join(repoRoot, 'src/shared/search-input.css'),
    'utf8'
  );
  const suggestionsCss = fs.readFileSync(
    path.join(repoRoot, 'src/overlay/suggestions-view.css'),
    'utf8'
  );

  assert.match(
    searchInputCss,
    /#_x_extension_overlay_2024_unique_\[data-lumno-site-fix-reveal\]\s+\.x-lumno-search-input__right-icon\s*\{\s*transition:\s*none\s*!important;/,
    'the settings button must not transition from the native ButtonFace during reveal'
  );
  assert.match(
    suggestionsCss,
    /#_x_extension_overlay_2024_unique_\[data-lumno-site-fix-reveal\]\s+\.x-ov-close-other-tabs\s*\{\s*transition:\s*none\s*!important;/,
    'the close-tabs button must not transition from the native ButtonFace during reveal'
  );
  assert.match(
    overlayShellSource,
    /:where\(#_x_extension_overlay_2024_unique_\)\s+:where\(\.x-ov-suggestion-switch-button\)\s*\{[\s\S]*?background:\s*var\(--x-ov-suggestion-action-button-bg,\s*transparent\);[\s\S]*?border-radius:\s*6px;[\s\S]*?font:\s*inherit;[\s\S]*?font-size:\s*12px;[\s\S]*?height:\s*var\(--x-ov-suggestion-action-height,\s*26px\);/,
    'switch actions must keep their themed pill shape and 12px type before their deferred stylesheet loads'
  );
  assert.doesNotMatch(
    overlayShellSource,
    /#_x_extension_overlay_2024_unique_\s+\.x-ov-suggestion-switch-button/,
    'the bootstrap fallback must stay lower-specificity than the complete suggestion stylesheet'
  );
}

Promise.resolve()
  .then(testOrdinarySitesWaitForCriticalOverlayStyles)
  .then(testAlreadyLoadedStylesDoNotDelayReveal)
  .then(testBootstrapDisablesRightButtonTransitions)
  .then(() => {
    console.log('Overlay critical style reveal tests passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
