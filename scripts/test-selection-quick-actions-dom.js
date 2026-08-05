const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const selectionIntent = require('../src/shared/selection-intent.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const dom = new JSDOM(`<!doctype html><html lang="zh-CN"><body>
    <p id="copy">serendipity</p>
    <p id="question">How should I structure this rollout?</p>
    <p><span id="generic-context"><em id="generic">React</em> trailing text</span></p>
    <p id="cjk">这是你需要的资料</p>
    <button id="selectable-button" type="button">Why is this unavailable?</button>
    <a id="selectable-link" href="#selected-link">React components</a>
    <span id="selectable-role-button" role="button" tabindex="0">React components</span>
    <span id="selectable-custom" tabindex="0">React components</span>
    <div id="selectable-editable" contenteditable="true">React components</div>
    <input id="selectable-input" type="text" value="React components">
    <textarea id="selectable-textarea">Why is this unavailable?</textarea>
    <input id="sensitive-password" type="password" value="secret token">
    <input id="sensitive-payment" type="text" autocomplete="cc-number" value="4111111111111111">
    <article id="x-post"><div><span id="x-body">为什么这条来自 X 的帖子无法加载？</span> <a href="https://t.co/example">https://t.co/example</a></div></article>
  </body></html>`, {
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
  window.HTMLElement.prototype.getBoundingClientRect = function() {
    return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 };
  };
  let reduceMotion = false;
  const toolbarAnimations = [];
  window.matchMedia = (query) => ({
    matches: reduceMotion && query === '(prefers-reduced-motion: reduce)',
    media: query
  });
  window.Element.prototype.animate = function(keyframes, options) {
    const record = {
      cancelled: false,
      keyframes,
      options,
      target: this
    };
    toolbarAnimations.push(record);
    return {
      cancel() {
        record.cancelled = true;
      }
    };
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
  const question = window.document.getElementById('question');
  const generic = window.document.getElementById('generic');
  const cjk = window.document.getElementById('cjk');
  const selectableButton = window.document.getElementById('selectable-button');
  const selectableLink = window.document.getElementById('selectable-link');
  const selectableRoleButton = window.document.getElementById('selectable-role-button');
  const selectableCustom = window.document.getElementById('selectable-custom');
  const selectableEditable = window.document.getElementById('selectable-editable');
  const selectableInput = window.document.getElementById('selectable-input');
  const selectableTextarea = window.document.getElementById('selectable-textarea');
  const sensitivePassword = window.document.getElementById('sensitive-password');
  const sensitivePayment = window.document.getElementById('sensitive-payment');
  const xPost = window.document.getElementById('x-post');
  const selection = window.getSelection();
  const inputValueDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  let sensitivePaymentValueReads = 0;
  Object.defineProperty(sensitivePayment, 'value', {
    configurable: true,
    get() {
      sensitivePaymentValueReads += 1;
      return inputValueDescriptor.get.call(this);
    },
    set(value) {
      inputValueDescriptor.set.call(this, value);
    }
  });
  let selectableButtonClicks = 0;
  selectableButton.addEventListener('click', () => {
    selectableButtonClicks += 1;
    selection.removeAllRanges();
  });
  selectableCustom.addEventListener('click', () => {});
  [selectableInput, selectableTextarea, sensitivePassword, sensitivePayment].forEach((element, index) => {
    element.getBoundingClientRect = () => ({
      bottom: 188 + index * 28,
      height: 24,
      left: 20,
      right: 240,
      top: 164 + index * 28,
      width: 220
    });
  });
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
  assert.strictEqual(host.dataset.iconSet, 'remix', 'obsolete icon-set storage should not change the toolbar renderer');
  assert.strictEqual(host.dataset.selectionMark, 'lumno', 'the entry should always use the fixed Lumno mark');
  assert.strictEqual(host.dataset.runtimeRevision, 'selection-toolbar-v13');
  assert.strictEqual(host.dataset.runtimeId, 'kkcjcneagmlhpeaafngjdlpcfjakejgb');
  assert.strictEqual(host.dataset.triggerStyle, undefined);
  assert.strictEqual(host.dataset.triggerStyleSource, undefined);
  assert.strictEqual(
    localStorageValues._x_extension_selection_quick_actions_trigger_style_2026_unique_,
    'lumno',
    'hydration should ignore an obsolete local entry-style mirror'
  );
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_language_2024_unique_: {
      oldValue: 'system',
      newValue: 'zh-CN'
    }
  }, 'sync'));
  await wait(0);
  assert.strictEqual(
    host.dataset.selectionMark,
    'lumno',
    'rehydration should keep the fixed Lumno mark'
  );
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'lumno',
      newValue: 'butterfly'
    }
  }, 'sync'));
  assert.strictEqual(
    window.document.querySelectorAll('[id="_x_extension_selection_quick_actions_host_2026_unique_"]').length,
    1,
    'only one Lumno selection surface should remain when multiple extension builds inject the same page'
  );
  assert(selectionShadow, 'the selection surface should create a shadow root');
  const highLogo = selectionShadow.querySelector('.lumno-selection-logo');
  const highButterfly = selectionShadow.querySelector('.lumno-selection-butterfly-stage');
  assert(highLogo, 'the selection surface should contain the Lumno mark');
  assert.strictEqual(highLogo.hidden, false, 'the fixed Lumno mark should remain visible');
  assert(highLogo.src.endsWith('/assets/images/lumno-selection-mark.png'),
    'every triggerable selection should use the compact butterfly mark');
  assert.strictEqual(highButterfly, null, 'the removed butterfly visual should not remain in the shadow DOM');
  assert.strictEqual(selectionShadow.querySelector('.lumno-selection-more'), null,
    'the compact entry should open the toolbar directly without a second disclosure button');
  const highEntry = selectionShadow.querySelector('.lumno-selection-main');
  const highSurface = selectionShadow.querySelector('.lumno-selection-surface');
  highSurface.getBoundingClientRect = function() {
    const iconOnly = this.dataset.iconOnly === 'true';
    return {
      bottom: iconOnly ? 84 : 104,
      height: iconOnly ? 18 : 38,
      left: iconOnly ? 112 : 120,
      right: iconOnly ? 130 : 360,
      top: 66,
      width: iconOnly ? 18 : 240
    };
  };
  assert.strictEqual(highEntry.getAttribute('aria-controls'), 'lumno-selection-toolbar');
  assert.strictEqual(highEntry.hasAttribute('aria-haspopup'), false,
    'the entry should not claim menu semantics for a toolbar');
  assert.strictEqual(highEntry.dataset.iconOnly, 'true',
    'high-confidence intent should not replace the compact butterfly with a direct-action chip');
  assert.strictEqual(highSurface.dataset.iconOnly, 'true');
  highEntry.click();
  await wait(30);
  const toolbar = selectionShadow.querySelector('.lumno-selection-toolbar');
  assert(toolbar, 'clicking the butterfly should open a toolbar');
  assert.strictEqual(toolbar.getAttribute('role'), 'toolbar');
  const translatedToolbarActions = Array.from(toolbar.querySelectorAll('[data-intent]'));
  assert.deepStrictEqual(
    translatedToolbarActions.map((button) => button.dataset.intent),
    ['translate', 'ask', 'search'],
    'the inferred intent should be first and the toolbar should render exactly three actions'
  );
  assert.strictEqual(toolbar.getAttribute('tabindex'), '-1',
    'the toolbar should be programmatically focusable without joining the page tab order');
  assert.strictEqual(selectionShadow.activeElement, toolbar,
    'opening the toolbar should focus its container without pre-highlighting the inferred first action');
  assert.notStrictEqual(selectionShadow.activeElement, translatedToolbarActions[0],
    'the first action should remain visually neutral until the user navigates to it');
  assert(translatedToolbarActions.every((button) => button.querySelector('.lumno-selection-action-icon > path')),
    'toolbar actions should use the filled Remix SVG definitions');
  assert.strictEqual(toolbarAnimations.length, 1, 'opening the toolbar should animate from the butterfly bounds');
  assert.strictEqual(toolbarAnimations[0].target, highSurface);
  assert.strictEqual(toolbarAnimations[0].options.duration, 180);
  assert.strictEqual(toolbarAnimations[0].options.easing, 'cubic-bezier(0.22, 1, 0.36, 1)');
  assert.deepStrictEqual(Array.from(toolbarAnimations[0].keyframes, (frame) => frame.opacity), [0.76, 1]);
  assert.match(
    toolbarAnimations[0].keyframes[0].transform,
    /translate\(.+px, .+px\) scale\(.+, .+\)/
  );
  assert.deepStrictEqual(
    Object.keys(toolbarAnimations[0].keyframes[0]).sort(),
    ['opacity', 'transform'],
    'the entrance should animate only compositor-friendly transform and opacity'
  );
  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  assert.strictEqual(toolbarAnimations[0].cancelled, true,
    'dismissing the selection surface should cancel an in-flight toolbar animation');
  delete highSurface.getBoundingClientRect;

  async function selectDomText(element, options = {}) {
    window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
    selection.removeAllRanges();
    element.dispatchEvent(new window.MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 150
    }));
    const elementRange = window.document.createRange();
    elementRange.selectNodeContents(element);
    selection.addRange(elementRange);
    element.dispatchEvent(new window.MouseEvent('pointerup', {
      bubbles: true,
      button: 0,
      clientX: 150,
      clientY: 150
    }));
    if (options.clickAfterPointerUp) {
      element.click();
    }
    await wait(460);
  }

  async function selectTextControl(element, start, end, beforePointerUp) {
    window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
    selection.removeAllRanges();
    element.focus();
    element.setSelectionRange(0, 0);
    element.dispatchEvent(new window.MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 36,
      clientY: 176
    }));
    element.setSelectionRange(start, end);
    if (beforePointerUp) {
      beforePointerUp();
    }
    element.dispatchEvent(new window.MouseEvent('pointerup', {
      bubbles: true,
      button: 0,
      clientX: 164,
      clientY: 176
    }));
    await wait(460);
  }

  await selectDomText(selectableButton, { clickAfterPointerUp: true });
  assert.strictEqual(selectableButtonClicks, 1, 'Lumno should not block the selected button click');
  assert.strictEqual(host.hidden, false,
    'a pointer-up snapshot should survive a button click that immediately collapses the live selection');
  selectionShadow.querySelector('.lumno-selection-main').click();
  assert.strictEqual(
    selectionShadow.querySelector('.lumno-selection-toolbar [data-intent]').dataset.intent,
    'ask',
    'the captured button question should retain its inferred action after the page clears the selection'
  );

  for (const [element, description] of [
    [selectableLink, 'link'],
    [selectableRoleButton, 'role button'],
    [selectableCustom, 'custom clickable node'],
    [selectableEditable, 'contenteditable region']
  ]) {
    await selectDomText(element);
    assert.strictEqual(host.hidden, false, `selected text inside a ${description} should reach intent evaluation`);
  }

  await selectTextControl(selectableInput, 0, selectableInput.value.length);
  assert.strictEqual(host.hidden, false, 'ordinary input selections should reach intent evaluation');
  selectionShadow.querySelector('.lumno-selection-main').click();
  assert.strictEqual(
    selectionShadow.querySelector('.lumno-selection-toolbar [data-intent]').dataset.intent,
    'translate',
    'a new input selection should replace the stale captured button candidate'
  );

  await selectTextControl(selectableTextarea, 0, selectableTextarea.value.length);
  assert.strictEqual(host.hidden, false, 'textarea selections should reach intent evaluation');
  selectableLink.focus();
  await selectDomText(selectableLink);
  highSurface.getBoundingClientRect = function() {
    const iconOnly = this.dataset.iconOnly === 'true';
    return {
      bottom: iconOnly ? 84 : 104,
      height: iconOnly ? 18 : 38,
      left: iconOnly ? 112 : 120,
      right: iconOnly ? 130 : 360,
      top: 66,
      width: iconOnly ? 18 : 240
    };
  };
  window.eval('delete Element.prototype.animate');
  assert.strictEqual(typeof highSurface.animate, 'undefined');
  const nativeFocus = window.HTMLElement.prototype.focus;
  window.HTMLElement.prototype.focus = function() {};
  selectionShadow.querySelector('.lumno-selection-main').click();
  assert.strictEqual(highSurface.dataset.iconOnly, 'false');
  assert.strictEqual(highSurface.getBoundingClientRect().width, 240);
  for (let attempt = 0; attempt < 20 && !highSurface.style.transition.includes('transform 180ms'); attempt += 1) {
    await wait(10);
  }
  assert.strictEqual(host.hidden, false);
  assert.strictEqual(host.dataset.visible, 'true');
  assert.strictEqual(highSurface.dataset.toolbarEntranceMode, 'fallback');
  assert.match(
    highSurface.style.transition,
    /transform 180ms cubic-bezier\(0\.22, 1, 0\.36, 1\), opacity 180ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/,
    'browsers without Web Animations should retain the same FLIP motion through a CSS fallback'
  );
  assert.strictEqual(highSurface.style.opacity, '1');
  window.HTMLElement.prototype.focus = nativeFocus;
  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  assert.strictEqual(highSurface.style.transition, '',
    'dismissing the CSS fallback should clear its temporary inline transition');
  delete highSurface.getBoundingClientRect;

  await selectDomText(selectableLink);
  reduceMotion = true;
  const animationCountBeforeReducedMotion = toolbarAnimations.length;
  selectionShadow.querySelector('.lumno-selection-main').click();
  await wait(30);
  assert.strictEqual(toolbarAnimations.length, animationCountBeforeReducedMotion,
    'prefers-reduced-motion should bypass the butterfly-to-toolbar animation');
  assert.strictEqual(highSurface.style.transition, '',
    'prefers-reduced-motion should bypass the CSS entrance fallback too');
  reduceMotion = false;

  await selectTextControl(sensitivePassword, 0, sensitivePassword.value.length);
  assert.strictEqual(host.hidden, true, 'password selections must remain suppressed');

  await selectTextControl(sensitivePayment, 0, 16, () => {
    sensitivePaymentValueReads = 0;
  });
  assert.strictEqual(host.hidden, true, 'payment autocomplete selections must remain suppressed');
  assert.strictEqual(sensitivePaymentValueReads, 0,
    'selection acquisition must reject payment fields before reading their value');

  window.document.dispatchEvent(new window.Event('copy', { bubbles: true }));
  selection.removeAllRanges();
  question.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 52
  }));
  const questionRange = window.document.createRange();
  questionRange.selectNodeContents(question);
  selection.addRange(questionRange);
  question.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 100,
    clientY: 52
  }));
  await wait(460);
  selectionShadow.querySelector('.lumno-selection-main').click();
  assert.deepStrictEqual(
    Array.from(selectionShadow.querySelectorAll('.lumno-selection-toolbar [data-intent]'))
      .map((button) => button.dataset.intent),
    ['ask', 'search', 'translate'],
    'an Ask-first toolbar should still contain three distinct actions'
  );

  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'butterfly',
      newValue: 'lumno'
    }
  }, 'sync'));
  assert.strictEqual(host.dataset.selectionMark, 'lumno', 'obsolete sync changes should not affect a visible entry');
  assert.strictEqual(
    localStorageValues._x_extension_selection_quick_actions_trigger_style_2026_unique_,
    'lumno',
    'obsolete sync changes should not update the local runtime mirror'
  );
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'lumno',
      newValue: 'butterfly'
    }
  }, 'sync'));
  assert.strictEqual(host.dataset.selectionMark, 'lumno', 'obsolete sync values should never restore the removed visual');

  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'butterfly',
      newValue: 'lumno'
    }
  }, 'local'));
  assert.strictEqual(
    host.dataset.selectionMark,
    'lumno',
    'obsolete local mirror updates should be ignored while Chrome Sync is primary'
  );
  storageChangeListeners.forEach((listener) => listener({
    _x_extension_selection_quick_actions_trigger_style_2026_unique_: {
      oldValue: 'lumno',
      newValue: 'butterfly'
    }
  }, 'local'));
  assert.strictEqual(host.dataset.selectionMark, 'lumno');

  const lateLegacyHost = window.document.createElement('div');
  lateLegacyHost.id = '_x_extension_selection_quick_actions_host_2026_unique_';
  lateLegacyHost.dataset.selectionMark = 'lumno';
  window.document.documentElement.appendChild(lateLegacyHost);
  await wait(0);
  assert.strictEqual(
    lateLegacyHost.isConnected,
    false,
    'a legacy host injected after the current surface should not cover the fixed Lumno entry'
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
  assert.strictEqual(host.dataset.selectionMark, 'lumno', 'the fixed Lumno mark should render in the compact entry');
  assert.strictEqual(host.style.left, '72px', 'the entry should sit tightly at the end of the selected text');
  assert.strictEqual(host.style.top, '66px', 'the entry should sit compactly at the upper-right of the selected text');
  const selectionStyles = selectionShadow.querySelector('style').textContent;
  assert(selectionStyles.includes('width: 18px'), 'the compact trigger should use the half-size 18px button');
  assert(selectionStyles.includes('width: 12px'), 'the compact trigger should use the 12px Lumno mark');
  assert(selectionStyles.includes('inset: -5px'), 'the smaller visual should retain an expanded pointer target');
  assert(
    /\.lumno-selection-surface\s*\{[\s\S]*?height:\s*38px[\s\S]*?padding:\s*3px[\s\S]*?border-radius:\s*13px[\s\S]*?background:\s*light-dark\(rgba\(244, 245, 247, 0\.94\), rgba\(26, 27, 31, 0\.96\)\)/.test(selectionStyles),
    'the expanded toolbar should use the approved compact 38px surface geometry'
  );
  assert(
    /\.lumno-selection-surface\s*\{[\s\S]*?border:\s*1px solid light-dark\(rgba\(15, 23, 42, 0\.12\), rgba\(255, 255, 255, 0\.13\)\)[\s\S]*?color:\s*light-dark\(#18181b, #e7e8eb\)/.test(selectionStyles),
    'light and dark toolbar materials should use independently tuned borders and foregrounds'
  );
  assert(
    /box-shadow:\s*inset 0 1px 0 light-dark\(rgba\(255, 255, 255, 0\.34\), rgba\(255, 255, 255, 0\.04\)\),[\s\S]*?inset 0 2px 10px light-dark\(rgba\(255, 255, 255, 0\.55\), rgba\(255, 255, 255, 0\.10\)\),[\s\S]*?0 8px 24px light-dark\(rgba\(15, 23, 42, 0\.14\), rgba\(0, 0, 0, 0\.38\)\)/.test(selectionStyles),
    'the toolbar should combine a soft edge with the approved broader blurred inner glow'
  );
  assert(
    /\.lumno-selection-surface\s*\{[\s\S]*?-webkit-backdrop-filter:\s*blur\(14px\) saturate\(130%\)[\s\S]*?backdrop-filter:\s*blur\(14px\) saturate\(130%\)/.test(selectionStyles),
    'the translucent toolbar material should softly blend with the page underneath'
  );
  assert(
    /button\s*\{[\s\S]*?padding:\s*0 8px[\s\S]*?min-height:\s*32px[\s\S]*?border-radius:\s*9px[\s\S]*?gap:\s*5px[\s\S]*?font:\s*500 12px/.test(selectionStyles),
    'toolbar actions should use the approved compact spacing and type scale'
  );
  assert(
    /button:focus-visible\s*\{[\s\S]*?box-shadow:\s*inset 0 0 0 1px/.test(selectionStyles),
    'keyboard focus should stay visible without creating a heavy nested pill'
  );
  assert(
    /\.lumno-selection-toolbar:hover button:focus-visible:not\(:hover\)[\s\S]*?background:\s*transparent[\s\S]*?box-shadow:\s*none/.test(selectionStyles),
    'pointer hover should suppress a competing programmatic focus highlight'
  );
  assert(
    /\.lumno-selection-toolbar:focus\s*\{[\s\S]*?outline:\s*none/.test(selectionStyles),
    'the neutral toolbar focus target should not add a second outline around the surface'
  );
  assert(
    /\.lumno-selection-toolbar button \+ button::before[\s\S]*?width:\s*1px[\s\S]*?height:\s*18px/.test(selectionStyles),
    'toolbar actions should be divided into distinct groups'
  );
  assert(
    /\.lumno-selection-action-icon\s*\{[\s\S]*?width:\s*16px[\s\S]*?height:\s*16px/.test(selectionStyles),
    'toolbar action icons should use the compact 16px scale'
  );
  assert(!selectionStyles.includes('lumno-selection-butterfly'),
    'the selection styles should not retain butterfly-only rules');

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
  assert.strictEqual(host.hidden, true, 'a generic Chinese statement should not show the selection entry');

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
