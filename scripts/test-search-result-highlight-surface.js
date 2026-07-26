const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const newtabHtml = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const overlayCss = fs.readFileSync(path.join(repoRoot, 'src/overlay/suggestions-view.css'), 'utf8');
const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
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

const newtabSuggestionBlock = getCssRuleBlock(newtabHtml, '.x-nt-suggestion-item');
const newtabActiveSuggestionBlock = getCssRuleBlock(
  newtabHtml,
  '.x-nt-suggestion-item[data-row-state="active"]'
);
const overlaySuggestionBlock = getCssRuleBlock(
  overlayCss,
  ':is(#_x_extension_overlay_2024_unique_, #_x_extension_onboarding_overlay_demo_2026_unique_) .x-ov-suggestion-item'
);
const overlayDarkActiveFaviconBlock = getCssRuleBlock(
  overlayCss,
  ':is(#_x_extension_overlay_2024_unique_[data-theme="dark"], #_x_extension_onboarding_overlay_demo_2026_unique_[data-theme="dark"]) .x-ov-suggestion-item[data-row-state="active"] .x-ov-suggestion-icon-slot[data-favicon="true"]'
);
const newtabDarkActiveFaviconBlock = getCssRuleBlock(
  newtabHtml,
  'body[data-theme="dark"] .x-nt-suggestion-item[data-row-state="active"] .x-nt-suggestion-icon-slot[data-favicon="true"]'
);

assert.match(
  newtabActiveSuggestionBlock,
  /background:\s*var\(--x-nt-suggestion-active-bg[\s\S]*?border-color:\s*var\(--x-nt-suggestion-active-border/,
  'newtab active suggestion rows should keep the existing background and border highlight'
);

assert.doesNotMatch(
  newtabActiveSuggestionBlock,
  /box-shadow:/,
  'newtab active suggestion rows should not add inner highlight or shadow'
);

assert.match(
  newtabSuggestionBlock,
  /transition:\s*background-color 0\.2s ease,\s*border-color 0\.2s ease;/,
  'newtab suggestion row transitions should not animate a removed shadow'
);

assert.match(
  overlaySuggestionBlock,
  /background:\s*var\(--x-ov-suggestion-row-bg[\s\S]*?border:\s*1px solid var\(--x-ov-suggestion-row-border/,
  'overlay suggestion rows should keep the existing background and border highlight'
);

assert.doesNotMatch(
  overlaySuggestionBlock,
  /box-shadow:/,
  'overlay suggestion rows should not expose an active-row shadow'
);

assert.match(
  overlaySuggestionBlock,
  /transition:\s*background-color 0\.2s ease,\s*border-color 0\.2s ease;/,
  'overlay suggestion row transitions should not animate a removed shadow'
);

assert.match(
  overlayDarkActiveFaviconBlock,
  /background-color:\s*#FFFFFF;/,
  'overlay dark active favicon slots should render on a white rounded rectangle'
);

assert.match(
  newtabDarkActiveFaviconBlock,
  /background-color:\s*#FFFFFF;/,
  'newtab dark active favicon slots should render on a white rounded rectangle'
);

assert.doesNotMatch(
  overlayCss + newtabHtml,
  /x-(?:ov|nt)-suggestion-item:last-child/,
  'suggestion list spacing should come from synchronized data-last state, not a last-child fallback'
);

assert.match(
  overlayJs,
  /function syncSuggestionLastState\(\)[\s\S]*?data-last[\s\S]*?index === suggestionItems\.length - 1 \? 'true' : 'false'/,
  'overlay append renders should resync which suggestion is the final row'
);

assert.match(
  suggestionsReact,
  /'--x-nt-suggestion-active-bg':\s*'--x-ov-suggestion-row-bg'[\s\S]*?'--x-nt-suggestion-active-border':\s*'--x-ov-suggestion-row-border'/,
  'the shared React view should map active background and border variables to Overlay tokens'
);

assert.match(
  suggestionsReact,
  /const highlight = options\.getHighlightColors\(theme\);[\s\S]*?'--x-nt-suggestion-active-bg'[\s\S]*?highlight\.bg[\s\S]*?'--x-nt-suggestion-active-border'[\s\S]*?highlight\.border/,
  'React Overlay active suggestions should apply only the shared background and border tokens'
);

assert.match(
  suggestionsReact,
  /item\.setAttribute\('data-row-state', 'active'\);/,
  'React active suggestions should expose row state for dark favicon styling'
);

assert.match(
  suggestionsReact,
  /item\.removeAttribute\('data-row-state'\);/,
  'React inactive suggestions should clear row state for dark favicon styling'
);

assert.match(
  suggestionsReact,
  /data-favicon=\{isFavicon \? 'true' : 'false'\}/,
  'React favicon slots should expose whether their child is a favicon'
);

assert.doesNotMatch(
  newtabJs + overlayJs,
  /getSuggestionActiveShadow|suggestion-active-shadow|suggestion-row-shadow|rgba\(255, 255, 255, 0\.40\)/,
  'search result highlight code should not keep the removed active shadow helpers or variables'
);

console.log('search result highlight surface tests passed');
