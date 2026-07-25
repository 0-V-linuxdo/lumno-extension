const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const bookmarksViewJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/bookmarks-view.js'), 'utf8');
const newtabHtml = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const cascadeMenuJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/bookmark-cascade-menu.js'), 'utf8');
const optionsJs = fs.readFileSync(path.join(repoRoot, 'src/options/options.js'), 'utf8');
const optionsHtml = fs.readFileSync(path.join(repoRoot, 'src/options/options.html'), 'utf8');
const zhCnMessages = JSON.parse(fs.readFileSync(path.join(repoRoot, '_locales/zh_CN/messages.json'), 'utf8'));
const customSelectJsPath = path.join(repoRoot, 'src/shared/custom-select.js');
const customSelectCssPath = path.join(repoRoot, 'src/shared/custom-select.css');
const menuSurfaceJsPath = path.join(repoRoot, 'src/shared/menu-surface.js');
const menuSurfaceCssPath = path.join(repoRoot, 'src/shared/menu-surface.css');

function assertContains(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, message);
}

function getCssRuleBody(source, selector) {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} should exist`);
  const braceStart = source.indexOf('{', start);
  const braceEnd = source.indexOf('\n      }', braceStart);
  assert.ok(braceStart >= 0 && braceEnd >= 0, `${selector} should have a parseable body`);
  return source.slice(braceStart + 1, braceEnd);
}

function getFunctionSource(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} should exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') {
      depth += 1;
    } else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  assert.fail(`${name} should have a complete body`);
}

assert.ok(fs.existsSync(customSelectJsPath), 'custom select behavior should live in a shared JS module');
assert.ok(fs.existsSync(customSelectCssPath), 'custom select styling should live in a shared CSS module');
assert.ok(fs.existsSync(menuSurfaceJsPath), 'shared menu surface behavior should live in a shared JS module');
assert.ok(fs.existsSync(menuSurfaceCssPath), 'shared menu surface styling should live in a shared CSS module');

const customSelectJs = fs.readFileSync(customSelectJsPath, 'utf8');
const customSelectCss = fs.readFileSync(customSelectCssPath, 'utf8');
const menuSurfaceJs = fs.readFileSync(menuSurfaceJsPath, 'utf8');
const menuSurfaceCss = fs.readFileSync(menuSurfaceCssPath, 'utf8');
const compensatedCornerShapePattern = 'superellipse\\(1\\.25\\)';

assertContains(
  customSelectJs,
  'LumnoCustomSelect',
  'shared custom select module should expose a LumnoCustomSelect runtime'
);
assertContains(
  customSelectJs,
  'createController',
  'shared custom select runtime should create independent page controllers'
);
assertContains(
  customSelectJs,
  'createSelect',
  'shared custom select runtime should support dynamically created selects'
);
assertContains(
  customSelectJs,
  'triggerIconClass',
  'shared custom select runtime should support custom trigger icons'
);
assertContains(
  customSelectJs,
  "data-icon-only",
  'shared custom select runtime should support icon-only triggers'
);
assertContains(
  customSelectJs,
  'setMenuTitle',
  'shared custom select runtime should update menu titles'
);
assertContains(
  customSelectJs,
  'menuMinWidth',
  'shared custom select runtime should accept content menu minimum width'
);
assertContains(
  customSelectJs,
  'menuMaxWidth',
  'shared custom select runtime should accept content menu maximum width'
);
assertContains(
  customSelectJs,
  'data-menu-min-width',
  'shared custom select runtime should store menu minimum width on the wrapper'
);
assertContains(
  customSelectJs,
  'data-menu-max-width',
  'shared custom select runtime should store menu maximum width on the wrapper'
);
assertContains(
  customSelectCss,
  '._x_extension_select_trigger_2024_unique_',
  'shared custom select CSS should own the select trigger styles'
);
assertContains(
  customSelectCss,
  '._x_extension_select_menu_2024_unique_',
  'shared custom select CSS should own the select menu styles'
);
assertContains(
  customSelectCss,
  '._x_extension_select_menu_title_2024_unique_',
  'shared custom select CSS should style menu titles'
);
assertContains(
  customSelectCss,
  '._x_extension_select_wrap_auto_2024_unique_ ._x_extension_select_menu_2024_unique_[data-menu-surface-width="content"]',
  'auto custom select menus should let content-width mode override trigger-width sizing'
);
assertContains(
  customSelectCss,
  'width: max-content;',
  'auto custom select content-width menus should size to their option content instead of the trigger'
);
assertContains(
  customSelectCss,
  '[data-icon-only="true"]',
  'shared custom select CSS should style icon-only triggers'
);
assert.match(
  customSelectCss,
  new RegExp(`@supports\\s*\\(\\s*corner-shape:\\s*${compensatedCornerShapePattern}\\s*\\)\\s*\\{`),
  'shared custom select CSS should gate smooth dropdown corners behind @supports'
);
assert.match(
  customSelectCss,
  new RegExp(`\\._x_extension_select_menu_2024_unique_[\\s\\S]*?\\{[\\s\\S]*?corner-shape:\\s*${compensatedCornerShapePattern};`),
  'shared custom select menu should use the same compensated corner shape as search'
);
assert.match(
  customSelectCss,
  new RegExp(`\\._x_extension_select_option_2024_unique_[\\s\\S]*?\\{[\\s\\S]*?corner-shape:\\s*${compensatedCornerShapePattern};`),
  'shared custom select options should use the same compensated corner shape as search'
);
assertContains(
  menuSurfaceJs,
  'LumnoMenuSurface',
  'shared menu surface module should expose a LumnoMenuSurface runtime'
);
assertContains(
  menuSurfaceJs,
  'applyContentWidth',
  'shared menu surface runtime should own content width behavior'
);
assertContains(
  menuSurfaceJs,
  'requestAnimationFrame',
  'shared menu surface runtime should defer open state for transitions'
);
assertContains(
  menuSurfaceCss,
  '._x_extension_menu_surface_2024_unique_',
  'shared menu surface CSS should own the reusable menu surface class'
);
assertContains(
  menuSurfaceCss,
  '[data-menu-surface-width="content"]',
  'shared menu surface CSS should own content-width sizing'
);
assertContains(
  menuSurfaceCss,
  'transition: opacity 170ms ease, transform 360ms cubic-bezier(0.2, 1.45, 0.35, 1);',
  'shared menu surface CSS should own the select-style opening animation'
);
assertContains(
  customSelectJs,
  'MENU_SURFACE_CLASS',
  'custom select should attach the shared menu surface class to its menu'
);
assertContains(
  customSelectJs,
  'LumnoMenuSurface.applyContentWidth',
  'custom select content mode should use the shared menu surface width helper'
);

function createFakeElement(tagName, ownerDocument) {
  const children = [];
  const attributes = new Map();
  const classes = new Set();
  const properties = new Map();
  const listeners = new Map();
  let classNameValue = '';
  const element = {
    tagName: String(tagName || '').toUpperCase(),
    nodeType: 1,
    children,
    childNodes: children,
    ownerDocument,
    parentNode: null,
    textContent: '',
    value: '',
    selectedIndex: 0,
    get firstChild() {
      return children[0] || null;
    },
    get options() {
      return element.tagName === 'SELECT' ? children : undefined;
    },
    classList: {
      add: (...names) => {
        names.forEach((name) => {
          String(name || '').split(/\s+/).filter(Boolean).forEach((part) => classes.add(part));
        });
        classNameValue = Array.from(classes).join(' ');
      },
      contains: (name) => classes.has(name)
    },
    get className() {
      return classNameValue;
    },
    set className(value) {
      classNameValue = String(value || '');
      classes.clear();
      classNameValue.split(/\s+/).filter(Boolean).forEach((part) => classes.add(part));
    },
    style: {
      left: '',
      right: '',
      minWidth: '',
      width: '',
      maxWidth: '',
      setProperty: (name, value) => properties.set(name, String(value)),
      removeProperty: (name) => properties.delete(name),
      getPropertyValue: (name) => properties.get(name) || ''
    },
    appendChild(child) {
      child.parentNode = element;
      child.ownerDocument = ownerDocument;
      children.push(child);
      return child;
    },
    removeChild(child) {
      const index = children.indexOf(child);
      assert.ok(index >= 0, 'fake element should only remove existing children');
      children.splice(index, 1);
      child.parentNode = null;
      return child;
    },
    insertBefore(child, reference) {
      child.parentNode = element;
      child.ownerDocument = ownerDocument;
      const index = children.indexOf(reference);
      if (index < 0) {
        children.push(child);
      } else {
        children.splice(index, 0, child);
      }
      return child;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || '';
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    addEventListener(type, listener) {
      listeners.set(String(type), [...(listeners.get(String(type)) || []), listener]);
    },
    dispatchEvent(event) {
      const nextEvent = event || {};
      (listeners.get(String(nextEvent.type || '')) || []).forEach((listener) => {
        listener(nextEvent);
      });
      return true;
    },
    click() {
      element.dispatchEvent({ type: 'click', target: element });
    },
    contains(target) {
      if (target === element) {
        return true;
      }
      return children.some((child) => child.contains && child.contains(target));
    },
    querySelector(selector) {
      return element.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const matches = [];
      const isClassSelector = String(selector || '').startsWith('.');
      const className = isClassSelector ? String(selector).slice(1) : '';
      const tag = isClassSelector ? '' : String(selector || '').toUpperCase();
      function visit(node) {
        const matched = isClassSelector
          ? node.classList && node.classList.contains(className)
          : node.tagName === tag;
        if (matched) {
          matches.push(node);
        }
        (node.children || []).forEach(visit);
      }
      children.forEach(visit);
      return matches;
    },
    getBoundingClientRect() {
      return { width: 180, height: 36, left: 0, right: 180, top: 0, bottom: 36 };
    }
  };
  return element;
}

function createFakeDocument() {
  const fakeDocument = {
    body: null,
    createElement(tagName) {
      return createFakeElement(tagName, fakeDocument);
    },
    createRange() {
      return {
        selectNodeContents() {},
        getBoundingClientRect: () => ({ width: 0 }),
        detach() {}
      };
    },
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  fakeDocument.body = createFakeElement('body', fakeDocument);
  return fakeDocument;
}

globalThis.LumnoMenuSurface = require(menuSurfaceJsPath);
require(customSelectJsPath);

const fakeDocument = createFakeDocument();
const customSelectController = globalThis.LumnoCustomSelect.createController({
  documentObj: fakeDocument,
  windowObj: {
    requestAnimationFrame: (callback) => callback(),
    getComputedStyle: () => ({
      paddingLeft: '0',
      paddingRight: '0',
      borderLeftWidth: '0',
      borderRightWidth: '0'
    })
  }
});
const wrapper = createFakeElement('div', fakeDocument);
wrapper.classList.add(
  '_x_extension_select_wrap_2024_unique_',
  '_x_extension_custom_select_2024_unique_',
  '_x_extension_select_wrap_auto_2024_unique_',
  '_x_extension_select_align_right_2024_unique_'
);
const select = createFakeElement('select', fakeDocument);
select.classList.add('_x_extension_select_2024_unique_');
const firstOption = createFakeElement('option', fakeDocument);
firstOption.value = 'first';
firstOption.textContent = 'First';
const secondOption = createFakeElement('option', fakeDocument);
secondOption.value = 'second';
secondOption.textContent = 'Second';
select.appendChild(firstOption);
select.appendChild(secondOption);
select.value = 'first';
const trigger = createFakeElement('button', fakeDocument);
trigger.classList.add('_x_extension_select_trigger_2024_unique_');
const menu = createFakeElement('div', fakeDocument);
menu.classList.add('_x_extension_select_menu_2024_unique_');
wrapper.appendChild(select);
wrapper.appendChild(trigger);
wrapper.appendChild(menu);

customSelectController.refresh([wrapper]);

assert.ok(
  menu.classList.contains('_x_extension_menu_surface_2024_unique_'),
  'refreshing a static custom select should attach the shared surface class so the menu stays hidden until opened'
);
assert.strictEqual(
  wrapper.getAttribute('data-open'),
  '',
  'refreshing a static custom select should not mark the menu open'
);

const portalSelect = customSelectController.createSelect({
  id: '_x_extension_portal_select_test_2026_unique_',
  menuPortal: true,
  menuPortalZIndex: 10020,
  menuPortalOffset: 8,
  menuAlign: 'left',
  menuWidth: 'content',
  menuMinWidth: 120,
  options: [
    { value: 'folder', label: 'Folder' },
    { value: 'list', label: 'List' }
  ],
  value: 'folder'
});
fakeDocument.body.appendChild(portalSelect.wrapper);
portalSelect.trigger.getBoundingClientRect = () => ({
  left: 48,
  right: 72,
  top: 64,
  bottom: 88,
  width: 24,
  height: 24
});
customSelectController.setOpen(portalSelect.wrapper, true);
assert.strictEqual(
  portalSelect.menu.parentNode,
  fakeDocument.body,
  'portal custom select menus should move to document.body while open so they escape local stacking contexts'
);
assert.strictEqual(
  portalSelect.menu.style.getPropertyValue('position'),
  'fixed',
  'portal custom select menus should be fixed-positioned to the trigger viewport rect'
);
assert.strictEqual(
  portalSelect.menu.style.getPropertyValue('z-index'),
  '10020',
  'portal custom select menus should accept an explicit z-index above the newtab search stack'
);
assert.strictEqual(
  portalSelect.menu.style.getPropertyValue('left'),
  '48px',
  'left-aligned portal custom select menus should align to the trigger left edge'
);
assert.strictEqual(
  portalSelect.menu.style.getPropertyValue('top'),
  '96px',
  'portal custom select menus should preserve the section menu vertical gap below the trigger'
);
customSelectController.setOpen(portalSelect.wrapper, false);
assert.strictEqual(
  portalSelect.menu.parentNode,
  portalSelect.wrapper,
  'closing a portal custom select should restore the menu to its wrapper'
);

const insetSelectController = globalThis.LumnoCustomSelect.createController({
  documentObj: fakeDocument,
  windowObj: {
    requestAnimationFrame: (callback) => callback(),
    getComputedStyle: () => ({
      paddingLeft: '0',
      paddingRight: '0',
      borderLeftWidth: '0',
      borderRightWidth: '0'
    })
  },
  getViewportTopInset: () => 48
});
const insetPortalSelect = insetSelectController.createSelect({
  menuPortal: true,
  menuPortalOffset: 0,
  options: [{ value: 'top', label: 'Top bookmarks bar' }],
  value: 'top'
});
fakeDocument.body.appendChild(insetPortalSelect.wrapper);
insetPortalSelect.trigger.getBoundingClientRect = () => ({
  left: 48,
  right: 72,
  top: 0,
  bottom: 24,
  width: 24,
  height: 24
});
insetSelectController.setOpen(insetPortalSelect.wrapper, true);
assert.strictEqual(
  insetPortalSelect.menu.style.getPropertyValue('top'),
  '48px',
  'portal custom select menus should stay below an occupied top surface'
);
insetSelectController.setOpen(insetPortalSelect.wrapper, false);

const selectActions = [];
const actionSelect = customSelectController.createSelect({
  options: [
    { value: 'top', label: 'Top bookmarks bar' },
    {
      value: '__pick_color__',
      label: 'Pick browser toolbar color…',
      action: 'pick-color',
      iconClass: 'ri-dropper-line',
      dividerBefore: true
    }
  ],
  value: 'top',
  onAction: (detail) => selectActions.push(detail.action)
});
const actionItem = actionSelect.menu.querySelectorAll(
  '._x_extension_select_option_2024_unique_'
).find((item) => item.getAttribute('data-action') === 'pick-color');
assert.ok(actionItem, 'custom select should render action options');
assert.strictEqual(
  actionItem.getAttribute('data-divider-before'),
  'true',
  'custom select actions should support a visual divider'
);
assert.strictEqual(
  actionItem.getAttribute('aria-selected'),
  'false',
  'custom select actions should never appear as the selected display mode'
);
assert.ok(
  actionItem.querySelector('._x_extension_select_option_icon_2026_unique_'),
  'custom select actions should support an icon'
);
actionItem.click();
assert.strictEqual(actionSelect.select.value, 'top', 'an action should not replace the selected value');
assert.deepStrictEqual(selectActions, ['pick-color'], 'an action should invoke its dedicated handler');

assertContains(
  customSelectCss,
  '._x_extension_select_option_2024_unique_[data-divider-before="true"]',
  'shared custom select CSS should style action dividers'
);
assertContains(
  customSelectCss,
  '._x_extension_select_option_icon_2026_unique_',
  'shared custom select CSS should style action icons'
);

assertContains(
  optionsHtml,
  '<link rel="stylesheet" href="../shared/menu-surface.css" />',
  'options should load the shared menu surface stylesheet'
);
assertBefore(
  optionsHtml,
  '<link rel="stylesheet" href="../shared/menu-surface.css" />',
  '<link rel="stylesheet" href="../shared/custom-select.css" />',
  'options should load menu surface CSS before custom select CSS'
);
assertContains(
  optionsHtml,
  '<link rel="stylesheet" href="../shared/custom-select.css" />',
  'options should load the shared custom select stylesheet'
);
assertContains(
  optionsHtml,
  '<script src="../shared/menu-surface.js"></script>',
  'options should load the shared menu surface behavior before custom-select.js'
);
assertBefore(
  optionsHtml,
  '<script src="../shared/menu-surface.js"></script>',
  '<script src="../shared/custom-select.js"></script>',
  'options should load menu surface behavior before custom select behavior'
);
assertContains(
  optionsHtml,
  '<script src="../shared/custom-select.js"></script>',
  'options should load the shared custom select behavior before options.js'
);
assertContains(
  newtabHtml,
  '<link rel="stylesheet" href="../shared/menu-surface.css" />',
  'new tab should load the shared menu surface stylesheet'
);
assertBefore(
  newtabHtml,
  '<link rel="stylesheet" href="../shared/menu-surface.css" />',
  '<link rel="stylesheet" href="../shared/custom-select.css" />',
  'new tab should load menu surface CSS before custom select CSS'
);
assertContains(
  newtabHtml,
  '<link rel="stylesheet" href="../shared/custom-select.css" />',
  'new tab should load the shared custom select stylesheet'
);
assertContains(
  newtabHtml,
  '<script src="../shared/menu-surface.js"></script>',
  'new tab should load the shared menu surface behavior before custom-select.js'
);
assertBefore(
  newtabHtml,
  '<script src="../shared/menu-surface.js"></script>',
  '<script src="../shared/custom-select.js"></script>',
  'new tab should load menu surface behavior before custom select behavior'
);
assertContains(
  newtabHtml,
  '<script src="../shared/custom-select.js"></script>',
  'new tab should load the shared custom select behavior before newtab.js'
);
assertContains(
  newtabHtml,
  '<script src="bookmark-cascade-position.js"></script>',
  'new tab should load bookmark cascade positioning before newtab.js'
);

assertContains(
  optionsJs,
  'LumnoCustomSelect.createController',
  'options should initialize custom selects through the shared component runtime'
);
assert.ok(
  !optionsJs.includes('function buildCustomSelectMenu'),
  'options should no longer keep a private copy of the custom select menu builder'
);

assertContains(
  newtabJs,
  "const BOOKMARK_VIEW_MODE_STORAGE_KEY = '_x_extension_bookmark_view_mode_2026_unique_';",
  'new tab should persist the bookmark section display mode'
);
assertContains(
  newtabJs,
  'function persistBookmarkViewMode(value)',
  'bookmark display mode writes should use one explicit persistence path'
);
{
  const createShouldRepair = new Function(
    `${getFunctionSource(newtabJs, 'shouldRepairBookmarkViewModeStorageValue')}
    return shouldRepairBookmarkViewModeStorageValue;`
  );
  const shouldRepairBookmarkViewModeStorageValue = createShouldRepair();
  assert.strictEqual(
    shouldRepairBookmarkViewModeStorageValue(undefined, 'folder'),
    false,
    'a missing synced mode should remain an implicit default instead of writing folder back'
  );
  assert.strictEqual(
    shouldRepairBookmarkViewModeStorageValue('invalid', 'folder'),
    true,
    'an explicitly invalid synced mode should still be normalized'
  );
  assert.strictEqual(
    shouldRepairBookmarkViewModeStorageValue('top', 'top'),
    false,
    'a valid synced mode should not trigger a redundant write'
  );
}
assertContains(
  newtabJs,
  '? chrome.storage.sync',
  'bookmark display mode should prefer Chrome sync storage across devices'
);
{
  const syncWrites = [];
  const localWrites = [];
  const createPersist = new Function(
    'chrome',
    'storageArea',
    'BOOKMARK_VIEW_MODE_STORAGE_KEY',
    'normalizeBookmarkViewMode',
    `${getFunctionSource(newtabJs, 'persistBookmarkViewMode')}
    return persistBookmarkViewMode;`
  );
  const persistBookmarkViewMode = createPersist(
    {
      storage: {
        sync: {
          set(payload) {
            syncWrites.push(payload);
          }
        }
      }
    },
    {
      set(payload) {
        localWrites.push(payload);
      }
    },
    '_x_extension_bookmark_view_mode_2026_unique_',
    (value) => (value === 'list' || value === 'top' ? value : 'folder')
  );
  assert.strictEqual(persistBookmarkViewMode('top'), true);
  assert.deepStrictEqual(syncWrites, [{
    _x_extension_bookmark_view_mode_2026_unique_: 'top'
  }]);
  assert.deepStrictEqual(localWrites, []);
}
{
  const createBookmarkViewModeHarness = new Function(`
    let currentBookmarkViewMode = 'folder';
    let bookmarkViewModeRevision = 0;
    let bookmarkLoadedOnce = false;
    let bookmarkCurrentFolderId = '1';
    const bookmarkRootFolderId = '1';
    let bookmarkCurrentPage = 0;
    let bookmarkRenderSignature = '';
    const calls = {
      close: 0,
      update: 0,
      persist: [],
      dirty: 0,
      loads: []
    };
    function normalizeBookmarkViewMode(value) {
      return value === 'list' || value === 'top' ? value : 'folder';
    }
    function closeBookmarkCascadeMenu() {
      calls.close += 1;
    }
    function updateBookmarkModeMenu() {
      calls.update += 1;
    }
    function persistBookmarkViewMode(mode) {
      calls.persist.push(mode);
    }
    function markBookmarkDataDirty() {
      calls.dirty += 1;
    }
    function loadBookmarks(options) {
      calls.loads.push(options);
    }
    ${getFunctionSource(newtabJs, 'applyBookmarkViewMode')}
    return {
      applyBookmarkViewMode,
      getState() {
        return {
          mode: currentBookmarkViewMode,
          revision: bookmarkViewModeRevision,
          calls
        };
      }
    };
  `);
  const harness = createBookmarkViewModeHarness();
  const hydrationRevision = harness.getState().revision;
  const localResult = harness.applyBookmarkViewMode('top', {
    persist: true,
    force: true
  });
  assert.strictEqual(localResult.applied, true);
  assert.strictEqual(harness.getState().mode, 'top');
  assert.strictEqual(harness.getState().revision, 1);
  assert.deepStrictEqual(harness.getState().calls.persist, ['top']);

  const staleHydrationResult = harness.applyBookmarkViewMode('folder', {
    expectedRevision: hydrationRevision,
    ensureLoaded: true
  });
  assert.strictEqual(staleHydrationResult.applied, false);
  assert.strictEqual(harness.getState().mode, 'top');
  assert.strictEqual(harness.getState().revision, 1);

  const freshSyncResult = harness.applyBookmarkViewMode('folder', {
    force: true
  });
  assert.strictEqual(freshSyncResult.applied, true);
  assert.strictEqual(freshSyncResult.changed, true);
  assert.strictEqual(harness.getState().mode, 'folder');
  assert.strictEqual(harness.getState().revision, 2);
}
assertContains(
  newtabJs,
  'const expectedRevision = bookmarkViewModeRevision;',
  'bookmark mode hydration should reject reads that predate a local mode selection'
);
assertContains(
  newtabJs,
  'applyInitialBookmarkViewModeValue(stored, \'primary\', expectedRevision);',
  'bookmark mode hydration should apply the revision captured before its async read'
);
assertContains(
  newtabJs,
  'LumnoCustomSelect.createController',
  'new tab should initialize section mode dropdowns through the shared component runtime'
);
assertContains(
  newtabJs,
  'createSectionModeSelect',
  'new tab section mode controls should be built as shared custom selects'
);
assertContains(
  newtabJs,
  'iconOnly: true',
  'new tab section mode controls should render as icon buttons'
);
assertContains(
  newtabJs,
  'element: bookmarkModeMenu && bookmarkModeMenu.control',
  'bookmark section mode icon should be sampled as its own wallpaper adaptive target'
);
assertContains(
  newtabJs,
  'disabled: isBookmarkTopbarMode()',
  'top bookmark mode should opt its mode button out of wallpaper adaptive sampling'
);
assertContains(
  newtabJs,
  'element: recentModeMenu && recentModeMenu.control',
  'recent section mode icon should be sampled as its own wallpaper adaptive target'
);
assertContains(
  newtabHtml,
  '.x-nt-section-mode-select[data-wallpaper-icon-bg="true"] ._x_extension_select_trigger_2024_unique_',
  'section mode icon buttons should use the wallpaper adaptive solid icon treatment directly'
);
assertContains(
  newtabJs,
  "triggerIconClass: 'ri-more-line'",
  'new tab section mode controls should use remix more-line'
);
assertContains(
  newtabJs,
  'menuTitle: title',
  'new tab section mode menus should render the display mode title inside the menu'
);
assertContains(
  newtabJs,
  'SECTION_MODE_MENU_MIN_WIDTH_PX',
  'new tab should define one shared minimum width for both section mode menus'
);
assertContains(
  newtabJs,
  'SECTION_MODE_MENU_MAX_WIDTH_PX',
  'new tab should define one shared maximum width for both section mode menus'
);
assertContains(
  newtabJs,
  'menuMinWidth: SECTION_MODE_MENU_MIN_WIDTH_PX',
  'new tab section mode menus should use the shared minimum width'
);
assertContains(
  newtabJs,
  'menuMaxWidth: SECTION_MODE_MENU_MAX_WIDTH_PX',
  'new tab section mode menus should use the shared maximum width'
);
assertContains(
  newtabJs,
  'SECTION_MODE_MENU_PORTAL_Z_INDEX',
  'new tab should define a shared z-index for portaled section mode menus'
);
assertContains(
  newtabJs,
  'menuPortal: true',
  'new tab section mode menus should render through a body portal to escape bottom-dock and wallpaper stacking contexts'
);
assertContains(
  newtabJs,
  'menuPortalZIndex: SECTION_MODE_MENU_PORTAL_Z_INDEX',
  'new tab section mode menus should use the shared portal z-index'
);
assertContains(
  newtabJs,
  'menuPortalOffset: SECTION_MODE_MENU_PORTAL_OFFSET_PX',
  'new tab section mode menus should keep the same visual gap when portaled'
);
assert.ok(
  !newtabJs.includes('createSectionModeMenu'),
  'new tab should no longer keep a private section mode menu builder'
);
assertContains(
  newtabJs,
  "menuTitleKey: 'display_mode_title'",
  'display mode selects should include an accessible title'
);
assertContains(
  newtabJs,
  "value: 'folder'",
  'bookmark menu should include the multi-layer folder view option'
);
assertContains(
  newtabJs,
  "value: 'list'",
  'bookmark menu should include the multi-level list view option'
);
assertContains(
  newtabJs,
  "value: 'top'",
  'bookmark menu should include the top bookmarks bar option'
);
assertContains(
  newtabJs,
  "setRecentMode(nextMode);",
  'recent section menu should switch the existing latest/most mode'
);
assertContains(
  newtabJs,
  "menuMode: currentBookmarkViewMode === 'list'",
  'bookmark list mode should render folder cards as menu launchers'
);

assertContains(
  bookmarksViewJs,
  'openFolderMenu',
  'bookmark cards should accept a folder menu opener callback'
);
assertContains(
  bookmarksViewJs,
  "card.setAttribute('aria-haspopup', 'menu')",
  'bookmark folders in menu mode should expose menu semantics'
);
assertContains(
  bookmarksViewJs,
  'openFolderMenu(item, card);',
  'bookmark folders in list mode should open a folder menu instead of navigating'
);

assertContains(
  newtabJs,
  'openBookmarkCascadeMenu',
  'new tab should open Chrome-like cascading bookmark menus'
);
assertContains(
  cascadeMenuJs,
  'renderBookmarkCascadeMenuLevel',
  'cascade menu runtime should render nested bookmark menu levels'
);
assertContains(
  newtabJs,
  'closeBookmarkCascadeMenu',
  'new tab should close cascading bookmark menus'
);
assertContains(
  newtabJs,
  'LumnoNewtabBookmarkCascadePosition',
  'new tab should use the shared cascade positioning runtime'
);
assertContains(
  cascadeMenuJs,
  'placeRootCascadeMenu',
  'cascade menu runtime should dynamically place the first cascade menu'
);
assertContains(
  cascadeMenuJs,
  'placeCascadeSubmenu',
  'cascade menu runtime should dynamically place nested cascade menus'
);
assertContains(
  cascadeMenuJs,
  'const BOOKMARK_CASCADE_MENU_MIN_WIDTH_PX = 210;',
  'bookmark cascade should define one shared minimum width constant'
);
assertContains(
  cascadeMenuJs,
  'const BOOKMARK_CASCADE_MENU_MAX_WIDTH_PX = 260;',
  'bookmark cascade should define one shared maximum width constant'
);
assertContains(
  cascadeMenuJs,
  'const BOOKMARK_CASCADE_SUBMENU_GAP_PX = -8;',
  'bookmark cascade submenus should overlap the previous level slightly'
);
assertContains(
  cascadeMenuJs,
  'spacing: BOOKMARK_CASCADE_SUBMENU_GAP_PX',
  'bookmark cascade nested levels should use the submenu gap constant'
);
assertContains(
  cascadeMenuJs,
  'function applyBookmarkCascadeLevelSurface',
  'bookmark cascade levels should apply the shared menu surface primitive'
);
assertContains(
  cascadeMenuJs,
  'menuSurface.applyContentWidth',
  'bookmark cascade levels should use the shared content width helper'
);
assertContains(
  cascadeMenuJs,
  'menuSurface.open',
  'bookmark cascade levels should use the shared open animation helper'
);
assert.ok(
  !cascadeMenuJs.includes("bookmarkCascadeMenu.setAttribute('data-open', 'true');"),
  'bookmark cascade wrapper should not force child menu surfaces open before their deferred transition'
);
assertContains(
  newtabHtml,
  '.x-nt-section-mode-select',
  'new tab should only keep small layout overrides for the shared section mode selects'
);
assert.ok(
  !newtabHtml.includes('.x-nt-section-mode-select ._x_extension_select_menu_2024_unique_ {\n        min-width:'),
  'new tab should not hard-code the section mode menu minimum width in page CSS'
);
assert.ok(
  !newtabHtml.includes('.x-nt-section-mode-menu'),
  'new tab should not keep a private section mode menu surface'
);
assert.ok(
  !newtabHtml.includes('.x-nt-section-mode-option'),
  'new tab should not keep private section mode option styles'
);
assertContains(
  newtabJs,
  'getBookmarkViewModeOptions',
  'bookmark display mode menu should build its mode and color actions together'
);
assertContains(
  newtabJs,
  'BOOKMARK_TOPBAR_PICK_COLOR_ACTION',
  'bookmark display mode menu should expose the browser toolbar color picker action'
);
assertContains(
  getFunctionSource(newtabJs, 'getBookmarkViewModeOptions'),
  'if (!isBookmarkTopbarMode())',
  'bookmark topbar color actions should only appear while top mode is active'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-menu',
  'new tab should style the root bookmark cascading menu'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-submenu',
  'new tab should style nested bookmark submenus'
);
assertContains(
  cascadeMenuJs,
  'x-nt-bookmark-cascade-title',
  'bookmark cascade runtime should render folder titles inside menu levels'
);
assertContains(
  cascadeMenuJs,
  'x-nt-bookmark-cascade-content',
  'bookmark cascade runtime should render menu rows inside a clipped scroll layer'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-title',
  'new tab should style bookmark cascade folder titles'
);
const bookmarkCascadeTitleCss = getCssRuleBody(newtabHtml, '.x-nt-bookmark-cascade-title');
assertContains(
  bookmarkCascadeTitleCss,
  'flex: 0 0 auto;',
  'bookmark cascade titles should not shrink inside scrollable cascade levels'
);
const bookmarkCascadeItemCss = getCssRuleBody(newtabHtml, '.x-nt-bookmark-cascade-item');
assertContains(
  bookmarkCascadeItemCss,
  'flex: 0 0 auto;',
  'bookmark cascade rows should not shrink inside scrollable cascade levels'
);
const bookmarkCascadeLevelCss = getCssRuleBody(newtabHtml, '.x-nt-bookmark-cascade-level');
assertContains(
  bookmarkCascadeLevelCss,
  'overflow: hidden;',
  'bookmark cascade levels should clip the internal scrollbar to the rounded panel'
);
const bookmarkCascadeContentCss = getCssRuleBody(newtabHtml, '.x-nt-bookmark-cascade-content');
assertContains(
  bookmarkCascadeContentCss,
  'display: flex;',
  'bookmark cascade scroll content should lay out rows as a controlled vertical stack'
);
assertContains(
  bookmarkCascadeContentCss,
  'flex-direction: column;',
  'bookmark cascade scroll content should stack menu rows vertically'
);
assertContains(
  bookmarkCascadeContentCss,
  'row-gap: 4px;',
  'bookmark cascade menu rows should keep visible vertical spacing'
);
assertContains(
  bookmarkCascadeContentCss,
  'overflow-y: auto;',
  'bookmark cascade scroll content should own native vertical scrolling'
);
assertContains(
  bookmarkCascadeContentCss,
  'scrollbar-gutter: auto;',
  'bookmark cascade scroll content should only reserve scrollbar space when scrolling is needed'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-content::-webkit-scrollbar-button:vertical:start:decrement',
  'bookmark cascade scrollbar should reserve a transparent top spacer'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-content::-webkit-scrollbar-button:vertical:end:increment',
  'bookmark cascade scrollbar should reserve a transparent bottom spacer'
);
assertContains(
  bookmarkCascadeLevelCss,
  '--x-extension-menu-surface-closed-transform: translate3d(var(--x-nt-bookmark-cascade-closed-x), var(--x-nt-bookmark-cascade-closed-y), 0) scale(var(--x-nt-bookmark-cascade-closed-scale-x), var(--x-nt-bookmark-cascade-closed-scale-y));',
  'bookmark cascade levels should own an origin-aware closed transform instead of inheriting the shared vertical dropdown motion'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-level[data-vertical="above"][data-horizontal="left"]',
  'bookmark cascade root menus opening above a folder should grow from the bottom-left edge'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-level[data-vertical="above"][data-horizontal="right"]',
  'bookmark cascade root menus opening above a folder should grow from the bottom-right edge'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-level[data-side="right"]',
  'bookmark cascade submenus opening to the right should grow horizontally from their parent item'
);
assertContains(
  newtabHtml,
  '.x-nt-bookmark-cascade-level[data-side="left"]',
  'bookmark cascade submenus opening to the left should grow horizontally from their parent item'
);
assertContains(
  newtabHtml,
  '--x-nt-bookmark-cascade-closed-x: -8px;',
  'right-opening bookmark cascade submenus should enter from the parent item side'
);
assertContains(
  newtabHtml,
  '--x-nt-bookmark-cascade-closed-x: 8px;',
  'left-opening bookmark cascade submenus should enter from the parent item side'
);
assert.ok(
  !newtabHtml.includes('min-width: 210px;'),
  'bookmark cascade width should not be hard-coded in page CSS'
);
assert.ok(
  !newtabHtml.includes('max-width: min(260px, calc(100vw - 24px));'),
  'bookmark cascade max width should come from the shared content width helper'
);
assert.ok(
  !newtabHtml.includes('.x-nt-bookmark-card--list'),
  'bookmark list mode should not use flattened list-card styling'
);

assert.strictEqual(zhCnMessages.display_mode_title.message, '显示模式');
assert.strictEqual(zhCnMessages.bookmark_view_mode_folder.message, '多层文件夹视图');
assert.strictEqual(zhCnMessages.bookmark_view_mode_list.message, '多级列表视图');
assert.strictEqual(zhCnMessages.bookmark_view_mode_top.message, '顶部书签栏');

console.log('newtab section mode menu tests passed');
