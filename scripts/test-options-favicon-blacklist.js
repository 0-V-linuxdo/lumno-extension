const assert = require('assert');
const fs = require('fs');
const path = require('path');
const blacklistUtils = require('../src/shared/blacklist-utils.js');
const settingsUtils = require('../src/shared/settings.js');

const repoRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const optionsHtml = read('src/options/options.html');
const optionsJs = read('src/options/options.js');
const manifest = JSON.parse(read('manifest.json'));
const packageJson = JSON.parse(read('package.json'));
const localeNames = ['en', 'ja', 'zh_CN', 'zh_TW'];
const locales = localeNames.map((name) => JSON.parse(read(`_locales/${name}/messages.json`)));

assert.strictEqual(
  packageJson.scripts['test:options-favicon-blacklist'],
  'node scripts/test-options-favicon-blacklist.js'
);

[
  '_x_extension_favicon_blacklist_editor_2026_unique_',
  '_x_extension_favicon_blacklist_list_2026_unique_',
  '_x_extension_favicon_blacklist_form_2026_unique_',
  '_x_extension_favicon_blacklist_clear_2026_unique_',
  '_x_extension_favicon_blacklist_expand_2026_unique_',
  '_x_extension_favicon_blacklist_match_suffix_2026_unique_',
  '_x_extension_favicon_blacklist_match_exact_2026_unique_',
  '_x_extension_favicon_blacklist_match_prefix_2026_unique_',
  'data-i18n="favicon_blacklist_section_desc"'
].forEach((snippet) => assert.ok(optionsHtml.includes(snippet), `missing restored favicon exclusion UI: ${snippet}`));
assert.match(
  optionsHtml,
  /id="_x_extension_favicon_blacklist_match_suffix_2026_unique_"[^>]*checked/,
  'suffix (site and subdomains) should be the default rule type'
);
const generalContentStart = optionsHtml.indexOf('data-content="general"');
const blacklistContentStart = optionsHtml.indexOf('data-content="blacklist"');
const labsContentStart = optionsHtml.indexOf('data-content="labs"');
assert.ok(generalContentStart >= 0 && blacklistContentStart > generalContentStart && labsContentStart > blacklistContentStart);
const generalContent = optionsHtml.slice(generalContentStart, blacklistContentStart);
const blacklistContent = optionsHtml.slice(blacklistContentStart, labsContentStart);
assert.ok(
  !generalContent.includes('_x_extension_favicon_enhanced_fetch_toggle_2026_unique_'),
  'favicon request controls should no longer appear in General settings'
);
assert.ok(
  blacklistContent.includes('_x_extension_favicon_enhanced_fetch_toggle_2026_unique_'),
  'favicon request controls should live on the Blacklist page'
);
assert.match(
  blacklistContent,
  /data-i18n="blacklist_group_custom"[\s\S]*?data-i18n="settings_favicon_enhanced_fetch_title"[\s\S]*?id="_x_extension_favicon_blacklist_editor_2026_unique_"/,
  'the favicon section should follow global blocking and keep the editor under its global switch'
);
assert.match(
  blacklistContent,
  /class="_x_extension_shortcut_group_title_2024_unique_ _x_extension_section_title_2024_unique_" data-i18n="settings_favicon_enhanced_fetch_title"/,
  'the favicon section title should share the same hierarchy as Global blocking'
);
assert.ok(
  blacklistContent.includes('data-i18n="favicon_blacklist_section_desc">按网站排除</p>'),
  'the site exclusion row should keep only its secondary label'
);
assert.ok(!optionsHtml.includes('data-i18n="favicon_blacklist_section_title"'), 'the old nested title should be removed');
assert.ok(
  optionsHtml.includes('若遇到本地网络访问权限提示，可关闭此功能。关闭后仅使用浏览器缓存、Lumno 内置或通用图标。'),
  'fallback HTML should describe the problem state before explaining strict mode'
);
assert.ok(
  optionsHtml.includes('data-i18n="blacklist_section_desc">添加需要从搜索结果和新标签页中隐藏的网址。</p>'),
  'global blocking copy should stay concise'
);
assert.match(
  optionsHtml,
  /#_x_extension_favicon_blacklist_editor_2026_unique_\s*\{[^}]*margin-top:\s*12px;/,
  'the per-site exclusion row should have extra separation from the global favicon setting'
);

assert.match(optionsJs, /const FAVICON_REQUEST_BLACKLIST_STORAGE_KEY = '_x_extension_favicon_request_blacklist_2026_unique_';/);
assert.match(optionsJs, /function loadFaviconRequestBlacklistItems\(\)/, 'legacy rules should load automatically');
assert.match(optionsJs, /function saveFaviconRequestBlacklistItems\(items\)/, 'rules should persist');
assert.match(optionsJs, /function renderFaviconRequestBlacklistList\(\)/, 'saved rules should render');
assert.match(optionsJs, /faviconBlacklistAddButton\.addEventListener\('click'/, 'add should be interactive');
assert.match(optionsJs, /faviconRequestBlacklistItems\.filter[\s\S]*?renderFaviconRequestBlacklistList/, 'remove should persist and rerender');
assert.match(optionsJs, /saveFaviconRequestBlacklistItems\(\[\]\)/, 'clear should persist an empty list');
assert.match(optionsJs, /changes\[FAVICON_REQUEST_BLACKLIST_STORAGE_KEY\][\s\S]*?renderFaviconRequestBlacklistList/, 'storage changes should refresh the editor');
assert.match(optionsJs, /SYNC_KEYS = \[[\s\S]*?FAVICON_REQUEST_BLACKLIST_STORAGE_KEY/, 'sync export/import should include exclusions');
assert.match(optionsJs, /function setFaviconBlacklistEditorEnabled\(enabled\)[\s\S]*?aria-disabled[\s\S]*?\.inert = !editable/, 'global off should make the editor inert and aria-disabled');
assert.match(optionsJs, /faviconEnhancedFetchToggle\.addEventListener\('change'[\s\S]*?setFaviconBlacklistEditorEnabled\(next\)/, 'toggle changes should refresh editor interactivity');
assert.match(optionsJs, /loadFaviconRequestBlacklistItems\(\)\.then[\s\S]*?faviconRequestBlacklistItems = items/, 'legacy rules should appear at startup');

const requiredLocaleKeys = [
  'settings_favicon_enhanced_fetch_desc',
  'favicon_blacklist_section_desc',
  'favicon_blacklist_add',
  'favicon_blacklist_removed_toast',
  'favicon_blacklist_clear',
  'confirm_clear_favicon_blacklist'
];
locales.forEach((messages, index) => {
  requiredLocaleKeys.forEach((key) => {
    assert.ok(messages[key] && messages[key].message, `${localeNames[index]} missing ${key}`);
  });
});
assert.ok(locales[0].settings_favicon_enhanced_fetch_desc.message.startsWith('If you see a local network access prompt'));
assert.strictEqual(locales[0].favicon_blacklist_section_desc.message, 'Exclude by website');
assert.ok(locales[2].settings_favicon_enhanced_fetch_desc.message.startsWith('若遇到本地网络访问权限提示'));
assert.strictEqual(locales[2].favicon_blacklist_section_desc.message, '按网站排除');

const accessibleResources = manifest.web_accessible_resources.flatMap((entry) => entry.resources || []);
assert.ok(accessibleResources.includes('src/shared/cursor-tooltip.css'), 'cursor tooltip CSS should be web accessible');

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `missing function ${name}`);
  return extractBraceBlock(source, start);
}

function extractBraceBlock(source, start) {
  const openBrace = source.indexOf('{', start);
  assert.notStrictEqual(openBrace, -1, `missing opening brace after ${start}`);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated block after ${start}`);
}

function extractIfBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, `missing handler block ${marker}`);
  return extractBraceBlock(source, start);
}

function createClassList(element) {
  const values = new Set();
  return {
    add(...names) {
      names.forEach((name) => values.add(name));
      element.className = Array.from(values).join(' ');
    },
    remove(...names) {
      names.forEach((name) => values.delete(name));
      element.className = Array.from(values).join(' ');
    },
    contains(name) {
      return values.has(name);
    },
    toggle(name, force) {
      const enabled = typeof force === 'boolean' ? force : !values.has(name);
      if (enabled) values.add(name);
      else values.delete(name);
      element.className = Array.from(values).join(' ');
      return enabled;
    }
  };
}

function createFakeElement(tagName) {
  const listeners = new Map();
  const attributes = new Map();
  let html = '';
  const element = {
    tagName: String(tagName || 'div').toUpperCase(),
    parentNode: null,
    children: [],
    style: {},
    className: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    inert: false,
    focused: false,
    appendChild(child) {
      if (child.parentNode) {
        const oldIndex = child.parentNode.children.indexOf(child);
        if (oldIndex >= 0) child.parentNode.children.splice(oldIndex, 1);
      }
      child.parentNode = element;
      element.children.push(child);
      return child;
    },
    insertBefore(child, reference) {
      if (child.parentNode) {
        const oldIndex = child.parentNode.children.indexOf(child);
        if (oldIndex >= 0) child.parentNode.children.splice(oldIndex, 1);
      }
      const index = element.children.indexOf(reference);
      child.parentNode = element;
      element.children.splice(index >= 0 ? index : element.children.length, 0, child);
      return child;
    },
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
    },
    getAttribute(name) {
      return attributes.has(String(name)) ? attributes.get(String(name)) : null;
    },
    removeAttribute(name) {
      attributes.delete(String(name));
    },
    addEventListener(type, listener) {
      const key = String(type);
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(listener);
    },
    dispatchEvent(event) {
      const currentEvent = event || {};
      currentEvent.type = currentEvent.type || '';
      currentEvent.target = currentEvent.target || element;
      currentEvent.preventDefault = currentEvent.preventDefault || (() => {});
      currentEvent.stopPropagation = currentEvent.stopPropagation || (() => {});
      (listeners.get(currentEvent.type) || []).slice().forEach((listener) => listener(currentEvent));
      return true;
    },
    click() {
      return element.dispatchEvent({ type: 'click' });
    },
    focus() {
      element.focused = true;
    },
    closest() {
      return null;
    }
  };
  element.classList = createClassList(element);
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return html;
    },
    set(value) {
      html = String(value || '');
      if (!html) {
        element.children.forEach((child) => {
          child.parentNode = null;
        });
        element.children = [];
      }
    }
  });
  return element;
}

function createOptionsBehaviorHarness(initialRules) {
  const storageKey = '_x_extension_favicon_request_blacklist_2026_unique_';
  const enhancedKey = '_x_extension_favicon_enhanced_fetch_enabled_2026_unique_';
  const data = {
    [storageKey]: initialRules,
    [enhancedKey]: true
  };
  const writes = [];
  const storageArea = {
    get(keys, callback) {
      const result = {};
      (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(data, key)) result[key] = data[key];
      });
      callback(result);
    },
    set(items, callback) {
      Object.assign(data, items || {});
      writes.push(items || {});
      if (callback) callback();
    }
  };
  const document = {
    createElement: createFakeElement
  };
  const elements = {
    editor: createFakeElement('div'),
    list: createFakeElement('div'),
    form: createFakeElement('div'),
    formTrigger: createFakeElement('button'),
    clearButton: createFakeElement('button'),
    urlLabel: createFakeElement('span'),
    urlPrefix: createFakeElement('span'),
    urlInput: createFakeElement('input'),
    exactInput: createFakeElement('input'),
    prefixInput: createFakeElement('input'),
    suffixInput: createFakeElement('input'),
    exactWrap: createFakeElement('label'),
    prefixWrap: createFakeElement('label'),
    suffixWrap: createFakeElement('label'),
    addButton: createFakeElement('button'),
    cancelButton: createFakeElement('button'),
    error: createFakeElement('div'),
    enhancedToggle: createFakeElement('input')
  };
  elements.suffixInput.checked = true;
  elements.enhancedToggle.checked = true;
  const clearParent = createFakeElement('div');
  clearParent.appendChild(elements.clearButton);

  const functionNames = [
    'normalizeBlacklistMatchModes',
    'normalizeBlacklistPattern',
    'normalizeFaviconRequestBlacklistItems',
    'normalizeFaviconEnhancedFetchEnabled',
    'buildBlacklistItemKey',
    'getMessage',
    'setFaviconBlacklistError',
    'getFaviconBlacklistMatchModesFromForm',
    'getBlacklistInputConfig',
    'applyBlacklistInputPresentationToElements',
    'updateFaviconBlacklistInputPresentation',
    'syncBlacklistModeSelection',
    'syncFaviconBlacklistMatchModeAvailability',
    'setFaviconBlacklistFormExpanded',
    'resetFaviconBlacklistForm',
    'setFaviconBlacklistEditorEnabled',
    'getBlacklistMatchBadgeConfig',
    'formatBlacklistPatternForDisplay',
    'setInlineError',
    'buildBlacklistRuleDraft',
    'closeActivePopconfirm',
    'initializePopconfirmWrap',
    'createPopconfirmWrap',
    'destroyPopconfirmControllersWithin',
    'attachPopconfirm',
    'loadFaviconRequestBlacklistItems',
    'saveFaviconRequestBlacklistItems',
    'renderFaviconRequestBlacklistList'
  ];
  const functionSource = functionNames.map((name) => extractFunctionSource(optionsJs, name)).join('\n\n');
  const addHandlerStart = optionsJs.indexOf('  if (faviconBlacklistAddButton) {');
  const addHandlerEnd = optionsJs.indexOf('  if (bookmarkCountSelect) {', addHandlerStart);
  assert.ok(addHandlerStart >= 0 && addHandlerEnd > addHandlerStart, 'missing favicon add handler range');
  const addHandlerSource = optionsJs.slice(addHandlerStart, addHandlerEnd);
  const toggleHandlerSource = extractIfBlock(optionsJs, '  if (faviconEnhancedFetchToggle) {');
  const clearHandlerSource = extractIfBlock(optionsJs, '  if (faviconBlacklistClearButton) {');
  const startupSource = extractIfBlock(optionsJs, '  if (faviconBlacklistList) {');
  const enhancedStorageChangeSource = extractIfBlock(
    optionsJs,
    '    if (changes[FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY] && faviconEnhancedFetchToggle) {'
  );
  const listStorageChangeSource = extractIfBlock(
    optionsJs,
    '    if (changes[FAVICON_REQUEST_BLACKLIST_STORAGE_KEY]) {'
  );

  const factory = new Function('deps', `
    const document = deps.document;
    const storageArea = deps.storageArea;
    const BLACKLIST_UTILS = deps.BLACKLIST_UTILS;
    const SETTINGS = deps.SETTINGS;
    const FAVICON_REQUEST_BLACKLIST_STORAGE_KEY = deps.storageKey;
    const FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY = deps.enhancedKey;
    const SECONDARY_BUTTON_CLASS_NAME = 'secondary';
    const chrome = { i18n: { getMessage: () => '' } };
    const currentMessages = {};
    const currentLanguageMode = 'system';
    const faviconBlacklistEditor = deps.elements.editor;
    const faviconBlacklistList = deps.elements.list;
    const faviconBlacklistForm = deps.elements.form;
    const faviconBlacklistFormTrigger = deps.elements.formTrigger;
    const faviconBlacklistClearButton = deps.elements.clearButton;
    const faviconBlacklistUrlLabel = deps.elements.urlLabel;
    const faviconBlacklistUrlPrefix = deps.elements.urlPrefix;
    const faviconBlacklistUrlInput = deps.elements.urlInput;
    const faviconBlacklistMatchExactInput = deps.elements.exactInput;
    const faviconBlacklistMatchPrefixInput = deps.elements.prefixInput;
    const faviconBlacklistMatchSuffixInput = deps.elements.suffixInput;
    const faviconBlacklistMatchExactWrap = deps.elements.exactWrap;
    const faviconBlacklistMatchPrefixWrap = deps.elements.prefixWrap;
    const faviconBlacklistMatchSuffixWrap = deps.elements.suffixWrap;
    const faviconBlacklistAddButton = deps.elements.addButton;
    const faviconBlacklistCancelButton = deps.elements.cancelButton;
    const faviconBlacklistError = deps.elements.error;
    const faviconEnhancedFetchToggle = deps.elements.enhancedToggle;
    let faviconRequestBlacklistItems = [];
    let faviconBlacklistFormExpanded = false;
    let activePopconfirm = null;
    const getRiSvg = () => '<svg></svg>';
    const showToast = deps.showToast;

    ${functionSource}
    ${addHandlerSource}
    ${toggleHandlerSource}
    ${clearHandlerSource}
    ${startupSource}

    function applyEnhancedStorageChange(rawValue) {
      const changes = { [FAVICON_ENHANCED_FETCH_ENABLED_STORAGE_KEY]: { newValue: rawValue } };
      ${enhancedStorageChangeSource}
    }

    function applyListStorageChange(newValue) {
      const changes = { [FAVICON_REQUEST_BLACKLIST_STORAGE_KEY]: { newValue } };
      ${listStorageChangeSource}
    }

    return {
      applyEnhancedStorageChange,
      applyListStorageChange,
      getItems: () => faviconRequestBlacklistItems.slice(),
      confirmClear: () => {
        faviconBlacklistClearButton.click();
        const wrap = faviconBlacklistClearButton.parentNode;
        const popconfirm = wrap.children[1];
        const actions = popconfirm.children[1];
        actions.children[1].click();
      }
    };
  `);

  const toasts = [];
  const api = factory({
    document,
    storageArea,
    BLACKLIST_UTILS: blacklistUtils,
    SETTINGS: settingsUtils,
    storageKey,
    enhancedKey,
    elements,
    showToast(message, isError) {
      toasts.push({ message, isError });
    }
  });
  return { api, data, writes, elements, storageKey, enhancedKey, toasts };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function testOptionsFaviconBlacklistBehavior() {
  const legacyRule = { pattern: 'foo.example.com/private', matchModes: ['prefix'] };
  const harness = createOptionsBehaviorHarness([legacyRule]);
  await flushPromises();

  assert.deepStrictEqual(harness.api.getItems(), [legacyRule], 'persisted legacy rules should load into editor state');
  assert.strictEqual(harness.elements.list.children.length, 1, 'persisted legacy rules should render on startup');
  assert.strictEqual(
    harness.elements.list.children[0].children[0].children[0].children[0].children[1].textContent,
    'http(s)://foo.example.com/private',
    'legacy prefix rules should retain their display semantics'
  );

  harness.elements.formTrigger.click();
  harness.elements.urlInput.value = 'bar.example.com';
  harness.elements.addButton.click();
  await flushPromises();
  assert.deepStrictEqual(
    harness.data[harness.storageKey],
    [
      { pattern: 'bar.example.com', matchModes: ['suffix'] },
      legacyRule
    ],
    'add handler should persist a suffix rule without dropping legacy rules'
  );
  assert.strictEqual(harness.elements.list.children.length, 2, 'add handler should rerender the saved list');

  const firstRemoveWrap = harness.elements.list.children[0].children[0].children[1];
  const firstRemoveButton = firstRemoveWrap.children[0];
  firstRemoveButton.click();
  const firstRemoveActions = firstRemoveWrap.children[1].children[1];
  firstRemoveActions.children[1].click();
  await flushPromises();
  assert.deepStrictEqual(harness.data[harness.storageKey], [legacyRule], 'remove handler should persist the remaining rule');
  assert.strictEqual(harness.elements.list.children.length, 1, 'remove handler should rerender the remaining rule');

  harness.elements.enhancedToggle.checked = false;
  harness.elements.enhancedToggle.dispatchEvent({ type: 'change' });
  assert.strictEqual(harness.data[harness.enhancedKey], false, 'global toggle handler should persist OFF');
  assert.strictEqual(harness.elements.editor.inert, true, 'global OFF should make the editor inert');
  assert.strictEqual(harness.elements.editor.getAttribute('aria-disabled'), 'true', 'global OFF should expose aria-disabled');

  harness.api.applyEnhancedStorageChange(true);
  assert.strictEqual(harness.elements.editor.inert, false, 'external global ON changes should restore editor interaction');
  assert.strictEqual(harness.elements.editor.getAttribute('aria-disabled'), 'false');
  harness.api.applyEnhancedStorageChange(false);
  assert.strictEqual(harness.elements.editor.inert, true, 'external global OFF changes should make the editor inert');
  assert.strictEqual(harness.elements.editor.getAttribute('aria-disabled'), 'true');
  harness.api.applyEnhancedStorageChange(true);
  harness.api.applyListStorageChange([legacyRule]);
  assert.strictEqual(harness.elements.list.children.length, 1, 'external list storage changes should rerender saved rules');

  harness.api.confirmClear();
  await flushPromises();
  assert.deepStrictEqual(harness.data[harness.storageKey], [], 'clear confirmation should persist an empty rule list');
  assert.strictEqual(harness.elements.list.children.length, 0, 'clear confirmation should empty the rendered list');
}

testOptionsFaviconBlacklistBehavior()
  .then(() => console.log('options favicon blacklist tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
