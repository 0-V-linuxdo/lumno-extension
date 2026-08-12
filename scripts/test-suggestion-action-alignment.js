const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const newtabHtml = fs.readFileSync(
  path.join(repoRoot, 'src/newtab/newtab.html'),
  'utf8'
);
const overlayCss = fs.readFileSync(
  path.join(repoRoot, 'src/overlay/suggestions-view.css'),
  'utf8'
);
const onboardingHtml = fs.readFileSync(
  path.join(repoRoot, 'src/onboarding/onboarding.html'),
  'utf8'
);
const suggestionsReact = fs.readFileSync(
  path.join(repoRoot, 'react-src/newtab/suggestions.tsx'),
  'utf8'
);

function getCssRuleBlock(source, selector) {
  const start = source.indexOf(`${selector} {`);
  assert.notStrictEqual(start, -1, `missing CSS rule: ${selector}`);
  const end = source.indexOf('}', start);
  assert.notStrictEqual(end, -1, `unterminated CSS rule: ${selector}`);
  return source.slice(start, end + 1);
}

const overlayScope =
  ':is(#_x_extension_overlay_2024_unique_, #_x_extension_onboarding_overlay_demo_2026_unique_)';

[
  {
    source: newtabHtml,
    right: '.x-nt-suggestion-right',
    actionTag: '.x-nt-suggestion-action-tag',
    utilitySlot: '.x-nt-suggestion-utility-slot',
    visibleUtilitySlot: '.x-nt-suggestion-utility-slot[data-visible="true"]',
    actionEndToken: '--x-nt-suggestion-action-icon-end',
    actionHeightToken: '--x-nt-suggestion-action-height',
    label: 'New Tab'
  },
  {
    source: overlayCss,
    right: `${overlayScope} .x-ov-suggestion-right`,
    actionTag: `${overlayScope} .x-ov-action-tag`,
    utilitySlot: `${overlayScope} .x-ov-suggestion-utility-slot`,
    visibleUtilitySlot: `${overlayScope} .x-ov-suggestion-utility-slot[data-visible="true"]`,
    actionEndToken: '--x-ov-suggestion-action-icon-end',
    actionHeightToken: '--x-ov-suggestion-action-height',
    label: 'Overlay'
  }
].forEach((surface) => {
  const rightBlock = getCssRuleBlock(surface.source, surface.right);
  const actionTagBlock = getCssRuleBlock(surface.source, surface.actionTag);
  const utilitySlotBlock = getCssRuleBlock(surface.source, surface.utilitySlot);
  const visibleUtilitySlotBlock = getCssRuleBlock(
    surface.source,
    surface.visibleUtilitySlot
  );

  assert.match(
    rightBlock,
    /gap:\s*0;/,
    `${surface.label} hidden utility slots must not leave a flex gap behind the visible action`
  );
  assert.match(
    utilitySlotBlock,
    /width:\s*0;/,
    `${surface.label} utility slots should stay collapsed before hover`
  );
  assert.match(
    utilitySlotBlock,
    /transition:[^;]*width[^;]*margin-left[^;]*opacity[^;]*;/,
    `${surface.label} utility slots should preserve their hover reveal transition`
  );
  assert.match(
    visibleUtilitySlotBlock,
    new RegExp(`width:\\s*var\\(${surface.actionHeightToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*26px\\);`),
    `${surface.label} visible utility slots should expand to the shared action height`
  );
  assert.match(
    visibleUtilitySlotBlock,
    /margin-left:\s*6px;/,
    `${surface.label} should add spacing only when a utility action is visible`
  );
  assert.match(
    actionTagBlock,
    new RegExp(`padding:\\s*0\\s+var\\(${surface.actionEndToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*7px\\)\\s+0\\s+8px;`),
    `${surface.label} Enter tags and arrow buttons should share the same visual end inset`
  );
});

const previewRightBlock = getCssRuleBlock(
  onboardingHtml,
  '.newtab-preview-viewport .x-nt-suggestion-right'
);
const previewActionTagBlock = getCssRuleBlock(
  onboardingHtml,
  '.newtab-preview-viewport .x-nt-suggestion-action-tag'
);
const previewVisibleUtilitySlotBlock = getCssRuleBlock(
  onboardingHtml,
  '.newtab-preview-viewport .x-nt-suggestion-utility-slot[data-visible="true"]'
);
const overlayDemoActionTagBlock = getCssRuleBlock(
  onboardingHtml,
  '.site-search-demo-result .x-ov-action-tag'
);

assert.match(previewRightBlock, /gap:\s*0;/);
assert.match(previewVisibleUtilitySlotBlock, /margin-left:\s*6px;/);
assert.match(
  previewActionTagBlock,
  /padding:\s*0 var\(--x-nt-suggestion-action-icon-end, 7px\) 0 8px;/
);
assert.match(
  overlayDemoActionTagBlock,
  /padding:\s*0 var\(--x-ov-suggestion-action-icon-end, 7px\) 0 8px;/
);

assert.match(
  suggestionsReact,
  /const visible = Boolean\(item\._xIsHovering\);[\s\S]*?slot\.setAttribute\('data-visible', visible \? 'true' : 'false'\);[\s\S]*?button\.setAttribute\('data-visible', visible \? 'true' : 'false'\);/,
  'shared React rows should continue revealing utility slots and buttons together on hover'
);

console.log('suggestion action alignment tests passed');
