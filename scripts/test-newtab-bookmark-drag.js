const assert = require('assert');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const {
  createPreview,
  createSession,
  getFloatingPreviewPosition,
  getGridInsertionTarget,
  isPointInsideElement,
  updateVisualPosition
} = require(path.join(repoRoot, 'src', 'newtab', 'bookmark-drag.js'));

function createClassList(names) {
  const values = new Set(names);
  return {
    contains(name) {
      return values.has(name);
    }
  };
}

function createCard(options) {
  const config = options && typeof options === 'object' ? options : {};
  const attributes = new Map([
    ['data-bookmark-index', String(config.index)]
  ]);
  return {
    _xBookmarkItem: config.item || null,
    _xTitleText: config.title || '',
    classList: createClassList(config.classNames || []),
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    }
  };
}

function createRect(left, top, width, height) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    centerY: top + (height / 2)
  };
}

const sourceItems = [{ id: 'folder' }, { id: 'link' }];
const sourcePageIds = ['folder', 'link'];
const folderCard = createCard({
  classNames: ['x-nt-bookmark-cascade-item--folder'],
  index: 3,
  title: 'Design'
});
const session = createSession({
  allItems: sourceItems,
  bookmarkId: 'folder',
  bookmarkItem: { id: 'folder', index: 3, title: 'Design', type: 'folder' },
  card: folderCard,
  event: { clientX: 120, clientY: 180, pointerId: 7 },
  pageCardIds: sourcePageIds,
  pageIndex: -1,
  parentId: '1',
  sourceKind: 'cascade'
});

assert.strictEqual(session.sourceKind, 'cascade');
assert.strictEqual(session.isFolder, true);
assert.strictEqual(session.originalIndex, 3);
assert.strictEqual(session.originalPageIndex, -1);
assert.strictEqual(session.startX, 120);
assert.strictEqual(session.pendingPointerY, 180);
assert.notStrictEqual(session.originalAllItems, sourceItems);
assert.notStrictEqual(session.originalPageCardIds, sourcePageIds);
sourceItems.push({ id: 'later' });
sourcePageIds.push('later');
assert.strictEqual(session.originalAllItems.length, 2);
assert.strictEqual(session.originalPageCardIds.length, 2);

const previewAttributes = new Map([
  ['data-active', 'true'],
  ['data-bookmark-context-menu-open', 'true'],
  ['data-bookmark-copy-action-visible', 'true'],
  ['data-hover-suppressed', 'true']
]);
const previewClasses = new Set([
  'x-nt-bookmark-cascade-item',
  'x-nt-bookmark-card--hover',
  'x-nt-bookmark-card--folder-expanded'
]);
const clonedPreviewActions = [
  {
    removed: false,
    remove() {
      this.removed = true;
    }
  }
];
const previewNode = {
  classList: {
    add(...names) {
      names.forEach((name) => previewClasses.add(name));
    },
    remove(...names) {
      names.forEach((name) => previewClasses.delete(name));
    }
  },
  querySelector() {
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.x-nt-bookmark-copy-action, .x-nt-bookmark-cascade-copy-trigger') {
      return clonedPreviewActions;
    }
    return [];
  },
  removeAttribute(name) {
    previewAttributes.delete(name);
  },
  setAttribute(name, value) {
    previewAttributes.set(name, String(value));
  },
  style: {}
};
const previewSourceCard = {
  cloneNode() {
    return previewNode;
  },
  getBoundingClientRect() {
    return createRect(120, 180, 240, 32);
  }
};
const documentBody = {
  children: [],
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
  }
};
const previewSession = {
  card: previewSourceCard,
  isFolder: false,
  sourceKind: 'cascade'
};
const cascadePreview = createPreview(previewSession, {
  documentObj: { body: documentBody }
});
assert.strictEqual(cascadePreview, previewNode);
assert.deepStrictEqual(
  documentBody.children,
  [previewNode],
  'a cascade drag preview should use an independent body-level fixed layer'
);
assert.strictEqual(previewClasses.has('x-nt-bookmark-cascade-drag-preview'), true);
assert.strictEqual(previewAttributes.get('data-bookmark-drag-preview'), 'true');
assert.strictEqual(previewAttributes.has('data-active'), false);
assert.strictEqual(previewAttributes.has('data-bookmark-context-menu-open'), false);
assert.strictEqual(previewAttributes.has('data-bookmark-copy-action-visible'), false);
assert.strictEqual(previewAttributes.has('data-hover-suppressed'), false);
assert.strictEqual(previewClasses.has('x-nt-bookmark-card--hover'), false);
assert.strictEqual(previewClasses.has('x-nt-bookmark-card--folder-expanded'), false);
assert.strictEqual(
  clonedPreviewActions.every((element) => element.removed),
  true,
  'drag previews should not clone copy controls from their source card'
);

assert.deepStrictEqual(
  getFloatingPreviewPosition({
    pointerX: 100,
    pointerY: 120,
    previewWidth: 200,
    previewHeight: 60,
    viewportWidth: 1000,
    viewportHeight: 800
  }),
  { left: 110, top: 130 },
  'the drag preview should stay one pointer gap away in open viewport space'
);
assert.deepStrictEqual(
  getFloatingPreviewPosition({
    pointerX: 990,
    pointerY: 790,
    previewWidth: 200,
    previewHeight: 60,
    viewportWidth: 1000,
    viewportHeight: 800
  }),
  { left: 780, top: 720 },
  'the drag preview should flip before crossing the right or bottom viewport edge'
);

const previewStyle = {};
const previewElement = {
  offsetHeight: 60,
  offsetWidth: 200,
  style: previewStyle
};
const previewState = {
  baseLeft: 100,
  baseTop: 100,
  card: {},
  dragPreviewElement: previewElement,
  dragPreviewOffsetX: 10,
  dragPreviewOffsetY: 8,
  grabOffsetX: 18,
  grabOffsetY: 16
};
assert.deepStrictEqual(
  updateVisualPosition(previewState, 990, 790, {
    windowObj: { innerHeight: 800, innerWidth: 1000 }
  }),
  { left: 780, top: 720 }
);
assert.strictEqual(previewStyle.left, '780px');
assert.strictEqual(previewStyle.top, '720px');
assert.strictEqual(previewStyle.transform, 'translate3d(0, 0, 0)');

const hitElement = {
  getBoundingClientRect() {
    return createRect(20, 30, 80, 40);
  }
};
assert.strictEqual(isPointInsideElement(hitElement, 20, 30), true);
assert.strictEqual(isPointInsideElement(hitElement, 101, 50), false);
assert.strictEqual(isPointInsideElement(hitElement, NaN, 50), false);

const gridRect = createRect(100, 100, 800, 80);
const gridElement = {
  getBoundingClientRect() {
    return gridRect;
  }
};
const firstCard = createCard({ index: 0, item: { index: 0 } });
const secondCard = createCard({ index: 1, item: { index: 1 } });
const layoutItems = [
  { card: firstCard, rect: createRect(112, 100, 188, 80) },
  { card: secondCard, rect: createRect(312, 100, 188, 80) }
];

const firstTarget = getGridInsertionTarget({
  columnGap: '12px',
  folderId: '1',
  gridElement,
  layoutItems,
  pageStartIndex: 0,
  pointerX: 100,
  pointerY: 140
});
assert.strictEqual(firstTarget.index, 0);
assert.strictEqual(firstTarget.markerOffsetPx, 6);
assert.strictEqual(firstTarget.isPageStartBoundary, true);

assert.strictEqual(
  getGridInsertionTarget({
    columnGap: '12px',
    folderId: '1',
    gridElement,
    layoutItems,
    pageStartIndex: 0,
    pointerX: 97,
    pointerY: 140
  }),
  null,
  'the pointer should stop targeting insertion after leaving the eight-pixel boundary zone'
);

const middleTarget = getGridInsertionTarget({
  columnGap: '12px',
  folderId: '1',
  gridElement,
  layoutItems,
  pageStartIndex: 0,
  pointerX: 306,
  pointerY: 140
});
assert.strictEqual(middleTarget.index, 1);
assert.strictEqual(middleTarget.markerOffsetPx, 206);
assert.strictEqual(middleTarget.markerPosition, 'before');

const emptyTarget = getGridInsertionTarget({
  folderId: 'empty',
  gridElement,
  layoutItems: [],
  pageStartIndex: 0,
  pointerX: 120,
  pointerY: 140
});
assert.strictEqual(emptyTarget.index, 0);
assert.strictEqual(emptyTarget.element, gridElement);
assert.strictEqual(emptyTarget.markerHeightPx, 64);

console.log('New tab bookmark drag runtime tests passed.');
