const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sharedSearchInputCss = fs.readFileSync(
  path.join(repoRoot, 'src/shared/search-input.css'),
  'utf8'
);
const newtabHtml = fs.readFileSync(
  path.join(repoRoot, 'src/newtab/newtab.html'),
  'utf8'
);
const overlaySource = fs.readFileSync(
  path.join(repoRoot, 'src/overlay/search-panel.js'),
  'utf8'
);
const overlayShellSource = fs.readFileSync(
  path.join(repoRoot, 'react-src/overlay/shell.tsx'),
  'utf8'
);
const onboardingHtml = fs.readFileSync(
  path.join(repoRoot, 'src/onboarding/onboarding.html'),
  'utf8'
);

assert.ok(
  sharedSearchInputCss.includes('--x-lumno-search-shell-border-light: rgba(0, 0, 0, 0.14);') &&
    sharedSearchInputCss.includes('--x-lumno-search-shell-border-dark: rgba(255, 255, 255, 0.16);'),
  'shared search input CSS should own the light and dark shell border colors'
);

assert.match(
  newtabHtml,
  /:root\s*\{[\s\S]*?--x-nt-search-shell-border:\s*var\(\s*--x-lumno-search-shell-border-light,\s*rgba\(0, 0, 0, 0\.14\)\s*\);/,
  'light New Tab should map its search shell to the shared 14% border token'
);
assert.match(
  newtabHtml,
  /body\[data-theme="dark"\]\s*\{[\s\S]*?--x-nt-search-shell-border:\s*var\(\s*--x-lumno-search-shell-border-dark,\s*rgba\(255, 255, 255, 0\.16\)\s*\);/,
  'dark New Tab should map its search shell to the shared 16% border token'
);
assert.match(
  newtabHtml,
  /#_x_extension_newtab_root_2024_unique_\s*\{[\s\S]*?border:\s*var\(--x-nt-search-shell-border-width, 1px\) solid var\(--x-nt-search-shell-border\);/,
  'the resting New Tab search shell should consume the dedicated shared-border alias'
);
assert.match(
  newtabHtml,
  /#_x_extension_newtab_suggestions_outline_2026_unique_\s*\{[\s\S]*?border:\s*1px solid var\(--x-nt-search-shell-border\);/,
  'the expanded New Tab search outline should keep the same shared border token'
);
assert.match(
  newtabHtml,
  /--x-nt-panel-border:\s*rgba\(0, 0, 0, 0\.08\);[\s\S]*?body\[data-theme="dark"\][\s\S]*?--x-nt-panel-border:\s*rgba\(255, 255, 255, 0\.08\);/,
  'unrelated New Tab panels should retain their existing lighter border token'
);

assert.ok(
  overlaySource.includes("border: 'var(--x-lumno-search-shell-border-light, rgba(0, 0, 0, 0.14))'") &&
    overlaySource.includes("border: 'var(--x-lumno-search-shell-border-dark, rgba(255, 255, 255, 0.16))'"),
  'overlay theme selection should consume the same shared border palette'
);
assert.ok(
  overlayShellSource.includes(
    'border: 1px solid var(--x-ov-border, var(--x-lumno-search-shell-border-light, rgba(0, 0, 0, 0.14)))'
  ),
  'overlay shell fallback should resolve through the shared light border token'
);
assert.ok(
  onboardingHtml.includes(
    '--x-ov-border: var(--x-lumno-search-shell-border-light, rgba(0, 0, 0, 0.14));'
  ),
  'onboarding overlay preview should resolve through the shared light border token'
);

console.log('search shell border token tests passed');
