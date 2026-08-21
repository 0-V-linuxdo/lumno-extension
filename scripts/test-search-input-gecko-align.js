const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(repoRoot, 'src/shared/search-input.css'), 'utf8');
const tsx = fs.readFileSync(path.join(repoRoot, 'react-src/shared/search-input.tsx'), 'utf8');
const overlay = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');

const fieldRule = css.match(/\.x-lumno-search-input__field\s*\{[\s\S]*?\n\}/);
assert.ok(fieldRule, 'search-input.css must define .x-lumno-search-input__field');

const fieldBlock = fieldRule[0];
const unsetAt = fieldBlock.indexOf('all: unset');
const alignAt = fieldBlock.indexOf('align-content: center');
assert.ok(unsetAt >= 0, 'overlay search field still uses all: unset');
assert.ok(
  alignAt > unsetAt,
  'align-content: center must come after all: unset so Gecko 156+ keeps UA-style centering'
);

const inputStyles = tsx.match(/input:\s*\{[\s\S]*?\n  \},/);
assert.ok(inputStyles, 'BASE_STYLES.input must exist');
const inlineUnset = inputStyles[0].indexOf("all: 'unset'");
const inlineAlign = inputStyles[0].indexOf("'align-content': 'center'");
assert.ok(inlineUnset >= 0, 'inline BASE_STYLES.input still uses all: unset');
assert.ok(
  inlineAlign > inlineUnset,
  'inline BASE_STYLES.input must restore align-content: center after all: unset'
);

assert.match(
  overlay,
  /'padding-top': '0'[\s\S]*?'padding-bottom': '0'/,
  'overlay still zeros vertical padding, so it depends on form-control centering'
);
assert.match(
  overlay,
  /height: '56px'/,
  'overlay search field is a fixed 56px box'
);
assert.match(
  overlay,
  /inputStyleOverrides: \{[\s\S]*?'align-content': 'center'/,
  'overlay input overrides must keep align-content: center after zeroing padding'
);

console.log('search-input Gecko 156 align-content contract ok');
