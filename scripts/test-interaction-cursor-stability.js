const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const newtabHtml = read('src/newtab/newtab.html');
const optionsHtml = read('src/options/options.html');
const tooltipCss = read('src/shared/tooltip.css');
const cursorTooltipCss = read('src/shared/cursor-tooltip.css');
const featureHintsCss = read('src/shared/feature-hints.css');
const overlaySuggestionsCss = read('src/overlay/suggestions-view.css');
const searchInputCss = read('src/shared/search-input.css');
const shortcutDialogCss = read('src/newtab/shortcut-dialog.css');

function getRule(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Expected CSS rule for ${selector}`);
  return match[1];
}

function assertStableHoverTarget(source, selector) {
  const declarations = getRule(source, selector);
  assert.match(
    declarations,
    /transform:\s*none;/,
    `${selector} should keep its hit box stationary while hovered`
  );
  assert.doesNotMatch(
    declarations,
    /transform:\s*(?:var\([^;]*(?:translate|rotate)|[^;]*(?:translate|rotate))/,
    `${selector} should not move or rotate its own hit box while hovered`
  );
}

assertStableHoverTarget(
  newtabHtml,
  '.x-nt-bookmark-card.x-nt-bookmark-card--hover'
);
assert.match(
  getRule(newtabHtml, '.x-nt-bookmark-card'),
  /cursor:\s*pointer;/,
  'bookmark cards should use a pointer while clickable'
);
assert.match(
  getRule(newtabHtml, '.x-nt-bookmark-card[data-bookmark-draggable="true"]'),
  /cursor:\s*pointer;/,
  'clickable draggable bookmark cards should use a pointer while idle'
);
assert.match(
  getRule(newtabHtml, '.x-nt-bookmark-cascade-item[data-bookmark-draggable="true"]'),
  /cursor:\s*pointer;/,
  'clickable draggable cascade items should use a pointer while idle'
);
assert.match(
  getRule(newtabHtml, '.x-nt-shortcut-tile[data-shortcut-draggable="true"]'),
  /cursor:\s*pointer;/,
  'clickable draggable shortcut tiles should use a pointer while idle'
);
assert.match(
  getRule(
    newtabHtml,
    '.x-nt-shortcuts-grid[data-shortcut-dragging="true"] .x-nt-shortcut-tile'
  ),
  /cursor:\s*grabbing;/,
  'shortcut tiles should use a grabbing cursor during drag sessions'
);
assert.match(
  getRule(
    newtabHtml,
    '.x-nt-bookmark-cascade-menu[data-drag-mode="true"] .x-nt-bookmark-cascade-item,\n      .x-nt-bookmark-cascade-item[data-bookmark-dragging="true"]'
  ),
  /cursor:\s*grabbing;/,
  'cascade items should use a grabbing cursor during drag sessions'
);
assert.match(
  getRule(
    newtabHtml,
    '#_x_extension_newtab_bookmarks_grid_2024_unique_[data-bookmark-dragging="true"] .x-nt-bookmark-card'
  ),
  /cursor:\s*grabbing;/,
  'bookmark cards should use a grabbing cursor during drag sessions'
);
assert.match(
  getRule(newtabHtml, '.x-nt-recent-card:hover'),
  /transform:\s*var\(--x-nt-dock-recent-card-hover-transform,\s*rotate\(-3deg\)\s+scale\(1\.01,\s*1\.005\)\);/,
  'recent cards should restore the density-aware hover rotation and scale'
);
assert.match(
  getRule(newtabHtml, '.x-nt-recent-card'),
  /cursor:\s*pointer;/,
  'recent cards should use a pointer while clickable'
);
assert.match(
  getRule(newtabHtml, '#_x_extension_newtab_bottom_dock_2024_unique_'),
  /--x-nt-dock-recent-card-hover-transform:\s*rotate\(-3deg\)\s+scale\(1\.01,\s*1\.005\);/,
  'default recent cards should use the full hover rotation'
);
assert.match(
  getRule(
    newtabHtml,
    '#_x_extension_newtab_bottom_dock_2024_unique_[data-density="compact"]'
  ),
  /--x-nt-dock-recent-card-hover-transform:\s*rotate\(-1\.5deg\)\s+scale\(1\.006\);/,
  'compact recent cards should use the reduced hover rotation'
);
assert.match(
  getRule(
    newtabHtml,
    '#_x_extension_newtab_bottom_dock_2024_unique_[data-density="tiny"]'
  ),
  /--x-nt-dock-recent-card-hover-transform:\s*scale\(1\.004\);/,
  'tiny recent cards should keep the subtle hover scale without rotation'
);
assertStableHoverTarget(newtabHtml, '.x-nt-feedback-action:hover');
assertStableHoverTarget(
  newtabHtml,
  '.x-nt-suggestion-action-button[data-visible="true"]:hover'
);
assertStableHoverTarget(featureHintsCss, '.x-lumno-feature-hint__link:hover');

assert.doesNotMatch(
  tooltipCss,
  /\._x_extension_tooltip_host_(?:2026|2024)_unique_\[data-tooltip\][^{]*\{[^}]*cursor\s*:/,
  'shared tooltips should not declare a cursor for their owning control'
);
assert.doesNotMatch(
  cursorTooltipCss,
  /\._x_extension_cursor_tooltip_host_2026_unique_\[data-cursor-tooltip\][^{]*\{[^}]*cursor\s*:/,
  'cursor-following tooltips should preserve pointer, grab, and disabled cursors'
);
assert.doesNotMatch(
  optionsHtml,
  /\._x_extension_tooltip_host_(?:2026|2024)_unique_\[data-tooltip\][^{]*\{[^}]*cursor\s*:/,
  'options tooltip compatibility styles should not override cursor semantics'
);

assert.match(
  getRule(optionsHtml, '._x_extension_shortcut_hint_2024_unique_'),
  /cursor:\s*help;/,
  'hover-only help affordances should use the help cursor'
);
assert.match(
  getRule(optionsHtml, '[role="img"][data-tooltip]'),
  /cursor:\s*help;/,
  'static tooltip-only status and hint elements should use the help cursor'
);
assert.match(
  getRule(newtabHtml, '.x-nt-appearance-info-button'),
  /cursor:\s*help;/,
  'new-tab hover-only information buttons should use the help cursor'
);
assert.match(
  getRule(
    newtabHtml,
    '.x-nt-bookmarks-pager-btn:disabled,\n      .x-nt-bookmarks-pager-btn[aria-disabled="true"]'
  ),
  /cursor:\s*not-allowed;/,
  'unavailable pager actions should use the not-allowed cursor'
);
assert.match(
  getRule(newtabHtml, '.x-nt-feedback-detail-action:disabled'),
  /cursor:\s*progress;/,
  'locally loading actions should use the progress cursor'
);
assert.match(
  getRule(newtabHtml, '.x-nt-wallpaper-tile[data-loading="true"]'),
  /cursor:\s*progress;/,
  'loading wallpaper tiles should use the progress cursor'
);
assert.match(
  getRule(shortcutDialogCss, '.x-lumno-action-button:disabled'),
  /cursor:\s*not-allowed;/,
  'disabled dialog actions should use the not-allowed cursor by default'
);

assert.match(
  newtabHtml,
  /#_x_extension_newtab_root_2024_unique_ button \.ri-icon,[\s\S]*?cursor:\s*inherit;[\s\S]*?pointer-events:\s*none;/,
  'new-tab decorative icons should not create nested cursor hit targets'
);
assert.match(
  optionsHtml,
  /button \.ri-icon,[\s\S]*?cursor:\s*inherit;[\s\S]*?pointer-events:\s*none;/,
  'options decorative icons should not create nested cursor hit targets'
);
assert.match(
  getRule(searchInputCss, '.x-lumno-search-input__right-icon *'),
  /cursor:\s*inherit;[\s\S]*pointer-events:\s*none;|pointer-events:\s*none;[\s\S]*cursor:\s*inherit;/,
  'search-input icons should inherit their owning button cursor'
);
assert.match(
  getRule(
    overlaySuggestionsCss,
    ':is(#_x_extension_overlay_2024_unique_, #_x_extension_onboarding_overlay_demo_2026_unique_) .x-ov-close-other-tabs .ri-icon'
  ),
  /cursor:\s*inherit;[\s\S]*pointer-events:\s*none;|pointer-events:\s*none;[\s\S]*cursor:\s*inherit;/,
  'overlay action icons should inherit their owning button cursor'
);
assert.match(
  newtabHtml,
  /#_x_extension_newtab_root_2024_unique_ button:not\(:disabled\),[\s\S]*?\[role="button"\]:not\(\[aria-disabled="true"\]\)\s*\{[\s\S]*?cursor:\s*pointer;/,
  'the new-tab pointer baseline should exclude disabled controls'
);

process.stdout.write('Interaction cursor stability tests passed.\n');
