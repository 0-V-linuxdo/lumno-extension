const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  getSurfaceColorTokens,
  normalizeSurfaceColor,
  createBookmarksTopbar
} = require('../src/newtab/bookmarks-topbar.js');

function createFakeElement(tagName) {
  const children = [];
  const attributes = new Map();
  const listeners = new Map();
  const styleProperties = new Map();
  const element = {
    tagName: String(tagName || '').toUpperCase(),
    children,
    parentNode: null,
    className: '',
    id: '',
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
    style: {
      setProperty(name, value) {
        styleProperties.set(String(name), String(value));
      },
      removeProperty(name) {
        styleProperties.delete(String(name));
      },
      getPropertyValue(name) {
        return styleProperties.get(String(name)) || '';
      }
    },
    get nextSibling() {
      if (!element.parentNode) {
        return null;
      }
      const siblings = element.parentNode.children;
      return siblings[siblings.indexOf(element) + 1] || null;
    },
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
    },
    getAttribute(name) {
      return attributes.get(String(name)) || null;
    },
    removeAttribute(name) {
      attributes.delete(String(name));
    },
    appendChild(child) {
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = element;
      children.push(child);
      return child;
    },
    insertBefore(child, reference) {
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      const index = children.indexOf(reference);
      child.parentNode = element;
      if (index < 0) {
        children.push(child);
      } else {
        children.splice(index, 0, child);
      }
      return child;
    },
    removeChild(child) {
      const index = children.indexOf(child);
      if (index >= 0) {
        children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    },
    addEventListener(type, listener) {
      listeners.set(String(type), [...(listeners.get(String(type)) || []), listener]);
    },
    dispatch(type, values) {
      const event = { type, ...(values || {}) };
      (listeners.get(type) || []).forEach((listener) => listener(event));
      return event;
    },
    getBoundingClientRect() {
      return { left: 0, right: 100, top: 0, bottom: 34, width: 100, height: 34 };
    }
  };
  return element;
}

const documentObj = {
  body: createFakeElement('body'),
  createElement: createFakeElement
};
const section = createFakeElement('section');
const header = createFakeElement('header');
const grid = createFakeElement('div');
section.appendChild(header);
section.appendChild(grid);
const titleWrap = createFakeElement('div');
const heading = createFakeElement('span');
const modeControl = createFakeElement('button');
const breadcrumb = createFakeElement('div');
titleWrap.appendChild(heading);
titleWrap.appendChild(modeControl);
titleWrap.appendChild(breadcrumb);
const pager = createFakeElement('div');
const previousButton = createFakeElement('button');
const nextButton = createFakeElement('button');
const managerButton = createFakeElement('button');
pager.appendChild(previousButton);
pager.appendChild(nextButton);
pager.appendChild(managerButton);
const visibilityEvents = [];

const topbar = createBookmarksTopbar({
  documentObj,
  grid,
  modeControl,
  managerButton,
  ariaLabel: '顶部书签栏',
  onVisibilityChange: (visible, detail) => {
    visibilityEvents.push({ visible, height: detail.height });
  }
});
topbar.mount(documentObj.body);
assert.strictEqual(topbar.element.parentNode, documentObj.body);
assert.strictEqual(topbar.activate(), true);
assert.strictEqual(grid.parentNode, topbar.itemsHost);
assert.deepStrictEqual(topbar.actions.children, [modeControl, managerButton]);
assert.strictEqual(topbar.setVisible(true), true);
assert.strictEqual(topbar.element.getAttribute('data-visible'), 'true');
assert.deepStrictEqual(visibilityEvents, [{ visible: true, height: 36 }]);
assert.strictEqual(normalizeSurfaceColor('#EdF4Fe'), '#edf4fe');
assert.strictEqual(normalizeSurfaceColor('#abc'), '#aabbcc');
assert.strictEqual(normalizeSurfaceColor('not-a-color'), '');
assert.deepStrictEqual(getSurfaceColorTokens('#edf4fe'), {
  surfaceColor: '#edf4fe',
  ink: '#111827',
  actionHover: 'rgba(15, 23, 42, 0.065)',
  itemHover: 'rgba(15, 23, 42, 0.065)',
  folderHover: 'rgba(37, 99, 235, 0.075)'
});
assert.strictEqual(
  getSurfaceColorTokens('#111827').ink,
  '#f8fafc',
  'dark sampled surfaces should automatically switch to light text'
);
assert.strictEqual(topbar.setSurfaceColor('#edf4fe'), '#edf4fe');
assert.strictEqual(topbar.element.getAttribute('data-custom-surface'), 'true');
assert.strictEqual(
  topbar.element.style.getPropertyValue('--x-nt-bookmarks-topbar-surface'),
  '#edf4fe'
);
assert.strictEqual(
  topbar.element.style.getPropertyValue('--x-nt-bookmarks-topbar-terminal-surface'),
  '#edf4fe'
);
assert.strictEqual(topbar.setSurfaceColor(''), '');
assert.strictEqual(topbar.element.getAttribute('data-custom-surface'), null);
assert.strictEqual(
  topbar.element.style.getPropertyValue('--x-nt-bookmarks-topbar-surface'),
  ''
);

topbar.viewport.scrollWidth = 500;
topbar.viewport.clientWidth = 100;
assert.strictEqual(topbar.syncOverflowFade(), true);
assert.strictEqual(topbar.edgeFade.getAttribute('data-visible'), 'true');
let wheelPrevented = false;
topbar.viewport.dispatch('wheel', {
  deltaX: 0,
  deltaY: 24,
  preventDefault() {
    wheelPrevented = true;
  }
});
assert.strictEqual(wheelPrevented, true);
assert.strictEqual(topbar.viewport.scrollLeft, 24);
assert.ok(topbar.autoScroll(98, 18) > 0);
topbar.viewport.scrollLeft = 400;
topbar.viewport.dispatch('scroll');
assert.strictEqual(topbar.edgeFade.getAttribute('data-visible'), 'false');

assert.strictEqual(topbar.deactivate(), true);
assert.deepStrictEqual(section.children, [header, grid]);
assert.deepStrictEqual(titleWrap.children, [heading, modeControl, breadcrumb]);
assert.deepStrictEqual(pager.children, [previousButton, nextButton, managerButton]);
assert.strictEqual(topbar.element.getAttribute('data-visible'), 'false');
assert.deepStrictEqual(
  visibilityEvents,
  [
    { visible: true, height: 36 },
    { visible: false, height: 36 }
  ],
  'topbar should report occupied viewport changes to its host'
);

const repoRoot = path.resolve(__dirname, '..');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const newtabHtml = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const bookmarksViewJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/bookmarks-view.js'), 'utf8');
assert.ok(
  newtabHtml.includes('<script src="bookmarks-topbar.js"></script>'),
  'new tab should load the atomic topbar surface before its entrypoint'
);
assert.ok(
  newtabJs.indexOf('const NEWTAB_BOOKMARKS_TOPBAR =') >= 0 &&
    newtabJs.indexOf('const BOOKMARK_TOPBAR_HEIGHT_PX =') >
      newtabJs.indexOf('const NEWTAB_BOOKMARKS_TOPBAR ='),
  'topbar constants must not read the topbar module before it is initialized'
);
assert.ok(
  newtabJs.includes("value: 'top'") &&
    newtabJs.includes("currentBookmarkViewMode === 'list' || isBookmarkTopbarMode()"),
  'top mode should be selectable and use the shared multi-level cascade behavior'
);
assert.ok(
  newtabHtml.includes('.x-nt-bookmarks-topbar') &&
    newtabHtml.includes('flex-flow: row nowrap;') &&
    newtabHtml.includes('overflow-x: auto;') &&
    newtabHtml.includes('.x-nt-bookmarks-topbar-edge-fade[data-visible="true"]') &&
    newtabHtml.includes('.x-nt-bookmarks-topbar-edge-fade::before') &&
    newtabHtml.includes('height: 36px;') &&
    newtabHtml.includes('width: 32px;'),
  'top mode should render every root bookmark in one horizontally accessible row'
);
assert.ok(
  newtabHtml.includes('body[data-bookmark-view-mode="top"] .x-nt-bookmarks-topbar') &&
    newtabHtml.includes('background: transparent;') &&
    newtabHtml.includes('border: none;'),
  'top mode should use borderless neutral actions instead of wallpaper-sampled fills'
);
assert.ok(
  newtabHtml.includes('--x-nt-bookmarks-topbar-terminal-surface:') &&
    newtabHtml.includes('--x-nt-bookmarks-topbar-action-bg: transparent;') &&
    newtabHtml.includes('--x-nt-bookmarks-topbar-action-hover:') &&
    newtabHtml.includes('.x-nt-bookmarks-topbar-edge-fade[data-visible="true"]') &&
    newtabHtml.includes('+ .x-nt-bookmarks-topbar-actions') &&
    newtabHtml.includes('background: var(--x-nt-bookmarks-topbar-terminal-surface);') &&
    newtabHtml.includes('background: var(--x-nt-bookmarks-topbar-action-bg);') &&
    newtabHtml.includes('background: var(--x-nt-bookmarks-topbar-action-hover) !important;'),
  'topbar fade, trailing action surface, and both action hovers should share surface tokens'
);
assert.ok(
  /body\[data-bookmark-view-mode="top"\][\s\S]*?\.x-nt-section-mode-select \._x_extension_select_trigger_2024_unique_:hover,[\s\S]*?\.x-nt-bookmarks-pager-btn:hover:not\(\[aria-disabled="true"\]\)[\s\S]*?background:\s*var\(--x-nt-bookmarks-topbar-action-hover\)\s*!important;/.test(newtabHtml),
  'topbar mode trigger and bookmark manager button should force the same hover background'
);
assert.ok(
  /\.x-nt-bookmarks-topbar-actions\s*\{[\s\S]*?gap:\s*4px;/.test(newtabHtml) &&
    /\.x-nt-bookmarks-topbar \.x-nt-section-mode-select\s*\{[\s\S]*?width:\s*28px;[\s\S]*?flex:\s*0 0 28px;/.test(newtabHtml),
  'topbar action controls should use equal 28px footprints with a consistent 4px gap'
);
assert.ok(
  bookmarksViewJs.includes("state && state.viewMode === 'top'") &&
    bookmarksViewJs.includes('!isFolder && !isTopbarMode') &&
    bookmarksViewJs.includes('typeof documentObj.createDocumentFragment'),
  'top mode should skip hidden card chrome and batch DOM insertion during loading'
);
assert.ok(
  newtabJs.includes('bookmarkTopbarRuntime.autoScroll(pointerX, pointerY)') &&
    newtabJs.includes('bookmarksRuntime.runControlledMutation'),
  'top mode should retain drag reorder and controlled persistence'
);
assert.ok(
  newtabJs.includes('new window.EyeDropper().open()') &&
    newtabJs.includes('BOOKMARK_TOPBAR_SURFACE_COLOR_STORAGE_KEY') &&
    newtabJs.includes('bookmarkTopbarRuntime.setSurfaceColor'),
  'topbar color sampling should use the atomic surface API and sync its selected color'
);
assert.ok(
  newtabHtml.includes('body[data-nt-top-occupied="true"]') &&
    newtabHtml.includes('--x-nt-top-occupied-inset: 36px;') &&
    newtabHtml.includes('calc(var(--x-nt-top-occupied-inset, 0px) + var(--x-nt-top-floating-gap, 12px))') &&
    newtabJs.includes('onVisibilityChange: setNewtabTopOccupied'),
  'topbar visibility should define a shared safe top inset for floating newtab UI'
);
assert.ok(
  newtabJs.includes('const BOOKMARK_CASCADE_TOPBAR_GAP_PX = 4;') &&
    newtabJs.includes('getViewportTopPadding: getBookmarkCascadeViewportTopPaddingPx'),
  'topbar cascade menus should use their compact 4px safe gap without changing other floating UI'
);
assert.ok(
  newtabJs.includes('const initialBookmarkViewModeReadyPromise = new Promise') &&
    /Promise\.all\(\[[\s\S]*initialBookmarkViewModeReadyPromise[\s\S]*\]\)\.then/.test(newtabJs),
  'new tab must wait for the saved bookmark mode before revealing its content'
);

console.log('New tab bookmarks topbar tests passed.');
