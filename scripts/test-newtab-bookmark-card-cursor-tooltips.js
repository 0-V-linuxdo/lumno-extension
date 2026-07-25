const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const bookmarksView = fs.readFileSync(path.join(repoRoot, 'src/newtab/bookmarks-view.js'), 'utf8');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const bookmarksRuntime = fs.readFileSync(
  path.join(repoRoot, 'src/newtab/bookmarks-runtime.js'),
  'utf8'
);

function assertContains(source, needle, message) {
  assert.ok(source.includes(needle), message);
}

assertContains(
  bookmarksView,
  "const bindCursorTooltip = getFunction(options, 'bindCursorTooltip');",
  'bookmark cards should receive a cursor-following tooltip binder'
);
assertContains(
  bookmarksView,
  "const shouldSuppressHover = getFunction(options, 'shouldSuppressHover'",
  'bookmark cards should accept a shared hover suppression hook for drag reorder'
);
assertContains(
  bookmarksView,
  "card.setAttribute('data-cursor-tooltip', titleText);",
  'bookmark cards should expose full titles through the cursor tooltip attribute'
);
assertContains(
  bookmarksView,
  "card.setAttribute('data-bookmark-parent-id', parentId);",
  'bookmark cards should expose their Chrome bookmark parent id for same-folder reordering'
);
assertContains(
  bookmarksView,
  "card.setAttribute('data-bookmark-index', Number.isFinite(itemIndex) ? String(itemIndex) : '');",
  'bookmark cards should expose their Chrome bookmark index for persistent reordering'
);
assertContains(
  bookmarksView,
  "card.addEventListener('dragstart', (event) => {",
  'bookmark cards should block native browser drag previews'
);
assertContains(
  bookmarksView,
  'function isBookmarkTitleTruncated(titleElement) {',
  'bookmark cards should have a local truncation detector for title text'
);
assertContains(
  bookmarksView,
  'return isBookmarkTitleTruncated(title);',
  'bookmark card cursor tooltips should only show for truncated titles'
);
assertContains(
  bookmarksView,
  "eventTarget.closest('.x-nt-bookmark-copy-action')",
  'bookmark card cursor tooltips should stay hidden over the copy action'
);
assert.ok(
  !bookmarksView.includes('getTagText: isFolder ? null : getBackgroundOpenTagText'),
  'bookmark URL cursor tooltips should not render an extra background-open badge'
);
assertContains(
  newtabJs,
  'const bookmarkCursorTooltipController = globalThis.LumnoCursorTooltip &&',
  'newtab should create a dedicated cursor-following tooltip controller for bookmarks'
);
assertContains(
  newtabJs,
  'function bindCursorTooltip(target, getText, options) {',
  'newtab should define a reusable cursor tooltip binding helper'
);
assertContains(
  newtabJs,
  'bindCursorTooltip,',
  'newtab should pass the cursor tooltip binder into the bookmark view'
);
assertContains(
  newtabJs,
  'hideCursorTooltip',
  'newtab should provide a way to hide the bookmark cursor tooltip when cards are cleared'
);
assertContains(
  newtabJs,
  'function handleBookmarkDragPointerDown(event) {',
  'newtab should track bookmark card pointer drags'
);
assertContains(
  newtabJs,
  "bookmarkGrid.addEventListener('pointerdown', handleBookmarkDragPointerDown, true);",
  'bookmark grid should capture pointer down before card hover handlers run'
);
assertContains(
  newtabJs,
  "document.addEventListener('pointermove', handleBookmarkDragPointerMove, true);",
  'active bookmark drags should keep tracking movement when card reordering releases pointer capture'
);
assertContains(
  newtabJs,
  "document.addEventListener('pointerup', handleBookmarkDragPointerUp, true);",
  'active bookmark drags should finish from the document pointer lifecycle'
);
assertContains(
  newtabJs,
  "document.addEventListener('pointercancel', handleBookmarkDragPointerCancel, true);",
  'active bookmark drags should cancel from the document pointer lifecycle'
);
assertContains(
  newtabJs,
  "document.removeEventListener('pointermove', handleBookmarkDragPointerMove, true);",
  'bookmark drag movement tracking should be removed after the drag ends'
);
assertContains(
  newtabJs,
  "document.removeEventListener('pointerup', handleBookmarkDragPointerUp, true);",
  'bookmark drag completion tracking should be removed after the drag ends'
);
assertContains(
  newtabJs,
  "document.removeEventListener('pointercancel', handleBookmarkDragPointerCancel, true);",
  'bookmark drag cancellation tracking should be removed after the drag ends'
);
assert.ok(
  !newtabJs.includes("bookmarkGrid.addEventListener('pointermove', handleBookmarkDragPointerMove"),
  'bookmark grid should only initiate bookmark drags instead of owning their pointer lifecycle'
);
assertContains(
  newtabJs,
  'function scheduleBookmarkDragMove(state, pointerX, pointerY) {',
  'bookmark drag movement should be coalesced through requestAnimationFrame'
);
assertContains(
  newtabJs,
  'function updateBookmarkDragLayoutCache(state) {',
  'bookmark drag reorder should cache layout measurements during a drag'
);
assertContains(
  newtabJs,
  'shouldSuppressHover: shouldSuppressBookmarkHover,',
  'bookmark cards and cascade menus should share the drag hover suppression hook'
);
assertContains(
  bookmarksRuntime,
  'bookmarksApi.move(id, moveDestination,',
  'bookmark reorder should persist through the Chrome bookmarks API'
);
assertContains(
  newtabJs,
  'function isBookmarkCursorTooltipSuppressed(target) {',
  'bookmark cursor tooltips should be suppressed during drag reorder'
);

console.log('newtab bookmark card cursor tooltip tests passed');
