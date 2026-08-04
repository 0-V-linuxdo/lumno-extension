const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const selectionIntent = require('../src/shared/selection-intent.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const dom = new JSDOM('<!doctype html><html lang="zh-CN"><body><p id="copy">serendipity</p><p><span id="generic-context"><em id="generic">React</em> trailing text</span></p><p id="cjk">这是你需要的资料</p><article id="x-post"><div><span id="x-body">这是一条来自 X 的帖子，包含跨节点正文</span> <a href="https://t.co/example">https://t.co/example</a></div></article></body></html>', {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'https://example.com/article'
  });
  const { window } = dom;
  window.LumnoSelectionIntent = selectionIntent;
  window.Range.prototype.getBoundingClientRect = () => ({
    bottom: 44,
    height: 18,
    left: 20,
    right: 110,
    top: 26,
    width: 90
  });
  window.Range.prototype.getClientRects = function() {
    const node = this.commonAncestorContainer;
    const element = node.nodeType === window.Node.ELEMENT_NODE ? node : node.parentElement;
    if (element && element.id === 'generic') {
      return [{ bottom: 88, height: 18, left: 20, right: 70, top: 70, width: 50 }];
    }
    return [];
  };
  let selectionShadow = null;
  const storageChangeListeners = [];
  const localStorageValues = {
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: 'lumno'
  };
  const syncStorageValues = {
    _x_extension_selection_quick_actions_enabled_2026_unique_: true,
    _x_extension_selection_quick_actions_icon_set_2026_unique_: 'hugeicons',
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: 'butterfly'
  };
  const attachShadow = window.Element.prototype.attachShadow;
  window.Element.prototype.attachShadow = function(options) {
    selectionShadow = attachShadow.call(this, options);
    return selectionShadow;
  };
  window.chrome = {
    i18n: {
      getMessage() { return ''; },
      getUILanguage() { return 'zh-CN'; }
    },
    runtime: {
      id: 'kkcjcneagmlhpeaafngjdlpcfjakejgb',
      getURL(path) { return `chrome-extension://lumno/${path}`; },
      lastError: null,
      sendMessage(_message, callback) { callback({ ok: true }); }
    },
    storage: {
      local: {
        get(keys, callback) {
          const result = {};
          (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(localStorageValues, key)) {
              result[key] = localStorageValues[key];
            }
          });
          callback(result);
        },
        set(payload, callback) {
          Object.assign(localStorageValues, payload);
          if (callback) callback();
        }
      },
      onChanged: {
        addListener(listener) { storageChangeListeners.push(listener); }
      },
      sync: {
        get(_keys, callback) {
          callback({ ...syncStorageValues });
        }
      }
    }
  };

  const paragraph = window.document.getElementById('copy');
  const generic = window.document.getElementById('generic');
  const cjk = window.document.getElementById('cjk');
  const xPost = window.document.getElementById('x-post');
  window.eval(fs.readFileSync('src/shared/settings.js', 'utf8'));
  window.eval(fs.readFileSync('src/shared/selection-action-icons.js', 'utf8'));
  assert.strictEqual(
    window.LumnoSelectionButterfly,
    undefined,
    'the DOM regression should cover a missing shared butterfly module'
  );
  window.eval(fs.readFileSync('src/content/selection-quick-actions.js', 'utf8'));
  await wait(0);

  const legacyHost = window.document.createElement('div');
  legacyHost.id = '_x_extension_selection_quick_actions_host_2026_unique_';
  legacyHost.dataset.selectionMark = 'lumno';
  window.document.documentElement.appendChild(legacyHost);
  await wait(0);
  assert.strictEqual(
    legacyHost.isConnected,
    false,
    'the current runtime should remove a legacy selection host injected by another Lumno installation'
  );

  paragraph.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 40
  }));
  const range = window.document.createRange();
  range.selectNodeContents(paragraph);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  paragraph.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 100,
    clientY: 40
  }));

  await wait(460);
  const host = window.document.getElementById('_x_extension_selection_quick_actions_host_2026_unique_');
  assert(host, 'high-confidence selection should create the quick action host');
  assert.strictEqual(host.hidden, false);
  assert.strictEqual(host.dataset.visible, 'true');
  assert.strictEqual(host.dataset.iconSet, 'hugeicons');
  assert.strictEqual(host.dataset.selectionMark, 'butterfly', 'the selected butterfly style should replace the high-confidence entry icon too');
  assert.strictEqual(host.dataset.runtimeRevision, 'selection-butterfly-v6');
  assert.strictEqual(host.dataset.runtimeId, 'kkcjcneagmlhpeaafngjdlpcfjakejgb');
  assert.strictEqual(host.dataset.triggerStyle, 'butterfly');
  assert.strictEqual(host.dataset.triggerStyleSource, 'hydrate:local');
  assert.strictEqual(
    localStorageValues._x_extension_selection_quick_actions_trigger_style_2026_unique_,
    'butterfly',
    'an existing butterfly choice should replace a stale local Lumno mirror'
  );
  syncStorageValues._x_extension_selection_quick_actions_trigger_style_2026_unique_ = 'lumno';
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_language_2024_unique_: {
      oldValue: 'system',
      newValue: 'zh-CN'
    }
  }, 'sync'));
  await wait(0);
  assert.strictEqual(
    host.dataset.selectionMark,
    'butterfly',
    'rehydration should keep the local butterfly mirror when the active provider still contains a stale Lumno value'
  );
  assert.strictEqual(host.dataset.triggerStyleSource, 'hydrate:local');
  syncStorageValues._x_extension_selection_quick_actions_trigger_style_2026_unique_ = 'butterfly';
  assert.strictEqual(
    window.document.querySelectorAll('[id="_x_extension_selection_quick_actions_host_2026_unique_"]').length,
    1,
    'only one Lumno selection surface should remain when multiple extension builds inject the same page'
  );
  assert(selectionShadow, 'the selection surface should create a shadow root');
  const highLogo = selectionShadow.querySelector('.lumno-selection-logo');
  const highButterfly = selectionShadow.querySelector('.lumno-selection-butterfly-stage');
  assert(highLogo && highButterfly, 'the selection surface should contain both trigger visuals');
  assert.strictEqual(highLogo.hidden, true, 'the static Lumno logo should be hidden for the butterfly style');
  assert.strictEqual(highButterfly.hidden, false, 'the butterfly visual should be visible for the butterfly style');
  assert.strictEqual(highButterfly.querySelectorAll('svg').length, 2, 'the butterfly visual should contain both animated wings');
  assert.strictEqual(highButterfly.querySelectorAll('animate').length, 2, 'both butterfly wings should morph continuously');
  assert.strictEqual(highButterfly.querySelectorAll('animateTransform').length, 1, 'the front wing should include the tuned rotation loop');
  assert.strictEqual(
    highButterfly.querySelector('path').getAttribute('fill'),
    '#79C3F2',
    'the fallback butterfly should preserve the website material color'
  );

  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'butterfly',
      newValue: 'lumno'
    }
  }, 'sync'));
  assert.strictEqual(host.dataset.selectionMark, 'lumno', 'storage changes should update an already visible entry');
  assert.strictEqual(host.dataset.triggerStyleSource, 'change:sync');
  assert.strictEqual(
    localStorageValues._x_extension_selection_quick_actions_trigger_style_2026_unique_,
    'lumno',
    'provider changes should update the local runtime mirror'
  );
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'lumno',
      newValue: 'butterfly'
    }
  }, 'sync'));
  assert.strictEqual(host.dataset.selectionMark, 'butterfly', 'switching back should restore the animated butterfly immediately');

  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'butterfly',
      newValue: 'lumno'
    }
  }, 'local'));
  assert.strictEqual(
    host.dataset.selectionMark,
    'lumno',
    'a local runtime mirror update should win even while Chrome Sync is the primary provider'
  );
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'lumno',
      newValue: 'butterfly'
    }
  }, 'local'));
  assert.strictEqual(host.dataset.selectionMark, 'butterfly');

  const lateLegacyHost = window.document.createElement('div');
  lateLegacyHost.id = '_x_extension_selection_quick_actions_host_2026_unique_';
  lateLegacyHost.dataset.selectionMark = 'lumno';
  window.document.documentElement.appendChild(lateLegacyHost);
  await wait(0);
  assert.strictEqual(
    lateLegacyHost.isConnected,
    false,
    'a legacy host injected after the current surface should not cover the animated butterfly'
  );
  assert.strictEqual(
    window.document.querySelectorAll('[id="_x_extension_selection_quick_actions_host_2026_unique_"]').length,
    1
  );

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  assert.strictEqual(host.hidden, true, 'copy should dismiss the selection affordance');

  selection.removeAllRanges();
  generic.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 70
  }));
  const genericRange = window.document.createRange();
  genericRange.selectNodeContents(generic);
  selection.addRange(genericRange);
  generic.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 70,
    clientY: 70
  }));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a deliberate single-word selection should show the low-distraction entry');
  assert.strictEqual(host.dataset.selectionMark, 'butterfly', 'the selected butterfly style should render in the compact entry');
  assert.strictEqual(host.style.left, '75px', 'the entry should sit at the end of the selected text');
  assert.strictEqual(host.style.top, '62px', 'the entry should rise to the upper edge of the selected text');
  const selectionStyles = selectionShadow.querySelector('style').textContent;
  assert(selectionStyles.includes('width: 36px'), 'the compact trigger should use the enlarged 36px button');
  assert(selectionStyles.includes('width: 34px'), 'the butterfly stage should use the enlarged 34px art width');
  assert(
    /:host\(\[data-selection-mark="butterfly"\]\)[\s\S]*?background:\s*transparent[\s\S]*?backdrop-filter:\s*none/.test(selectionStyles),
    'the butterfly should float without a visible acrylic tile'
  );

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  selection.removeAllRanges();
  cjk.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 100
  }));
  const cjkRange = window.document.createRange();
  cjkRange.selectNodeContents(cjk);
  selection.addRange(cjkRange);
  cjk.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 110,
    clientY: 100
  }));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a deliberate Chinese short-sentence selection should show the entry');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  xPost.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 130
  }));
  xPost.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 120,
    clientY: 130
  }));
  const delayedXRange = window.document.createRange();
  delayedXRange.selectNodeContents(xPost);
  selection.addRange(delayedXRange);
  window.document.dispatchEvent(new window.Event('selectionchange'));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a selection that settles after pointerup should still trigger on X-like content');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  xPost.dispatchEvent(new window.Event('selectstart', { bubbles: true }));
  const selectStartXRange = window.document.createRange();
  selectStartXRange.selectNodeContents(xPost);
  selection.addRange(selectStartXRange);
  window.document.dispatchEvent(new window.Event('selectionchange'));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'selectstart should arm selection evaluation even when pointerup is absent');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  xPost.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 130
  }));
  const cancelledXRange = window.document.createRange();
  cancelledXRange.selectNodeContents(xPost);
  selection.addRange(cancelledXRange);
  xPost.dispatchEvent(new window.MouseEvent('pointercancel', {
    bubbles: true,
    button: 0,
    clientX: 120,
    clientY: 130
  }));
  await wait(520);
  assert.strictEqual(host.hidden, false, 'a pointercancel during X selection should not discard the selection trigger');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));

  selection.removeAllRanges();
  const staleRange = window.document.createRange();
  staleRange.selectNodeContents(paragraph);
  selection.addRange(staleRange);
  paragraph.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 70,
    clientY: 40
  }));
  await wait(520);
  assert.strictEqual(host.hidden, true, 'an existing selection without a new pointer gesture should not trigger');

  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_enabled_2026_unique_: {
      oldValue: true,
      newValue: false
    }
  }, 'sync'));
  assert.strictEqual(
    host.isConnected,
    false,
    'disabling this runtime should release its ownership instead of suppressing another Lumno installation'
  );

  dom.window.close();
  console.log('selection quick actions DOM tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
