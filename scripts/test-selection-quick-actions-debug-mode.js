const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const selectionIntent = require('../src/shared/selection-intent.js');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
  const locales = Object.fromEntries(localeNames.map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, 'utf8'))
  ]));
  const requiredDebugKeys = [
    'selection_debug_decision_title',
    'selection_debug_status_show',
    'selection_debug_status_hide',
    'selection_debug_sort_title',
    'selection_debug_primary_meta',
    'selection_debug_sort_primary_cause',
    'selection_debug_sort_fallback_cause',
    'selection_debug_sort_footer'
  ];
  localeNames.forEach((locale) => {
    requiredDebugKeys.forEach((key) => {
      assert(locales[locale][key] && locales[locale][key].message,
        `${locale} should define ${key}`);
    });
  });
  assert.strictEqual(locales.en.selection_debug_decision_title.message, 'Selection decision');
  assert.strictEqual(locales.ja.selection_debug_decision_title.message, '選択判定');

  const dom = new JSDOM(`<!doctype html><html lang="zh-CN"><body>
    <p id="term">React</p>
    <p id="generic">了解更多</p>
    <input id="password" type="password" value="secret token">
  </body></html>`, {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'https://example.com/article'
  });
  const { window } = dom;
  window.LumnoSelectionIntent = selectionIntent;
  window.Range.prototype.getBoundingClientRect = function() {
    return { bottom: 44, height: 18, left: 20, right: 120, top: 26, width: 100 };
  };
  window.Range.prototype.getClientRects = function() {
    return [{ bottom: 44, height: 18, left: 20, right: 120, top: 26, width: 100 }];
  };
  window.HTMLElement.prototype.getBoundingClientRect = function() {
    return { bottom: 44, height: 18, left: 20, right: 120, top: 26, width: 100 };
  };
  window.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  window.matchMedia = () => ({ matches: false });

  const shadowRoots = new Map();
  const attachShadow = window.Element.prototype.attachShadow;
  window.Element.prototype.attachShadow = function(options) {
    const root = attachShadow.call(this, { ...options, mode: 'open' });
    shadowRoots.set(this.id, root);
    return root;
  };

  const syncStorageValues = {
    _x_extension_selection_quick_actions_enabled_2026_unique_: true,
    _x_extension_language_2024_unique_: 'zh-CN'
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
      sendMessage(message, callback) {
        if (!callback) return;
        callback(message.action === 'getLocaleMessages'
          ? { messages: locales.zh_CN }
          : { ok: true });
      }
    },
    storage: {
      local: {
        get(_keys, callback) { callback({}); },
        set(_payload, callback) { if (callback) callback(); }
      },
      onChanged: { addListener() {} },
      sync: {
        get(_keys, callback) { callback({ ...syncStorageValues }); }
      }
    }
  };

  window.eval(fs.readFileSync('src/shared/settings.js', 'utf8'));
  window.eval(fs.readFileSync('src/shared/selection-action-icons.js', 'utf8'));
  const contentSource = fs.readFileSync('src/content/selection-quick-actions.js', 'utf8')
    .replace(/const SELECTION_DEBUG_MODE = (?:false|true);/, 'const SELECTION_DEBUG_MODE = true;');
  window.eval(contentSource);
  await wait(0);

  const selection = window.getSelection();
  async function select(element, settleMs = 20) {
    element.dispatchEvent(new window.MouseEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 30
    }));
    const range = window.document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(new window.MouseEvent('pointerup', {
      bubbles: true,
      button: 0,
      clientX: 110,
      clientY: 42
    }));
    await wait(settleMs);
  }

  const term = window.document.getElementById('term');
  await select(term);
  const debugHostId = '_x_extension_selection_quick_actions_debug_host_2026_unique_';
  const debugHost = window.document.getElementById(debugHostId);
  const debugShadow = shadowRoots.get(debugHostId);
  assert(debugHost && debugShadow, 'debug mode should create an isolated fixed diagnostic bubble');
  assert.strictEqual(debugHost.style.display, 'block');
  assert.strictEqual(debugHost.style.left, '12px');
  assert.strictEqual(debugHost.style.bottom, '12px');
  assert.strictEqual(debugHost.style.top, 'auto');
  assert.match(debugShadow.textContent, /划词判定/);
  assert.match(debugShadow.textContent, /显示/);
  assert.match(debugShadow.textContent, /有意义的短词或术语/);
  assert.match(debugShadow.textContent, /首选：解释/);

  await wait(360);
  const toolbarHostId = '_x_extension_selection_quick_actions_host_2026_unique_';
  const toolbarShadow = shadowRoots.get(toolbarHostId);
  assert(toolbarShadow, 'a triggerable selection should still render the production entry');
  toolbarShadow.querySelector('.lumno-selection-main').click();
  await wait(20);
  assert.match(debugShadow.textContent, /菜单排序/);
  assert.deepStrictEqual(
    Array.from(debugShadow.querySelectorAll('.lumno-selection-debug-action')).map((item) => item.textContent),
    ['解释', '调研', '翻译'],
    'the debug bubble should mirror the real fixed fallback ordering'
  );
  assert.match(debugShadow.textContent, /首项取意图得分最高者/);
  assert.match(debugShadow.textContent, /通用备选/);

  const generic = window.document.getElementById('generic');
  await select(generic);
  assert.match(debugShadow.textContent, /不显示/);
  assert.match(debugShadow.textContent, /通用界面文案/);

  const password = window.document.getElementById('password');
  const valueDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  let passwordValueReads = 0;
  Object.defineProperty(password, 'value', {
    configurable: true,
    get() {
      passwordValueReads += 1;
      return valueDescriptor.get.call(this);
    },
    set(value) {
      valueDescriptor.set.call(this, value);
    }
  });
  selection.removeAllRanges();
  password.setSelectionRange(0, 6);
  password.dispatchEvent(new window.MouseEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 20,
    clientY: 30
  }));
  password.dispatchEvent(new window.MouseEvent('pointerup', {
    bubbles: true,
    button: 0,
    clientX: 110,
    clientY: 42
  }));
  await wait(20);
  assert.match(debugShadow.textContent, /敏感字段/);
  assert.match(debugShadow.textContent, /未读取内容/);
  assert.strictEqual(passwordValueReads, 0,
    'debug diagnostics must explain sensitive suppression without reading the field value');

  console.log('selection quick actions debug mode tests passed');
})();
