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
  /cursor:\s*grab;/,
  'draggable bookmark cards should use a grab cursor'
);
assertStableHoverTarget(newtabHtml, '.x-nt-recent-card:hover');
assert.match(
  getRule(newtabHtml, '.x-nt-recent-card'),
  /cursor:\s*pointer;/,
  'recent cards should use a pointer while clickable'
);
assert.doesNotMatch(
  newtabHtml,
  /--x-nt-dock-recent-card-hover-transform\s*:/,
  'recent-card layouts should not retain a hit-box transform override'
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
  newtabHtml,
  /#_x_extension_newtab_root_2024_unique_ button \.ri-icon,[\s\S]*?cursor:\s*inherit;[\s\S]*?pointer-events:\s*none;/,
  'new-tab decorative icons should not create nested cursor hit targets'
);
assert.match(
  optionsHtml,
  /button \.ri-icon,[\s\S]*?cursor:\s*inherit;[\s\S]*?pointer-events:\s*none;/,
  'options decorative icons should not create nested cursor hit targets'
);

process.stdout.write('Interaction cursor stability tests passed.\n');
