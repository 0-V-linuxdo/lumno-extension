const assert = require('assert');
const fs = require('fs');

const optionsHtml = fs.readFileSync('src/options/options.html', 'utf8');
const onboardingHtml = fs.readFileSync('src/onboarding/onboarding.html', 'utf8');
const optionReactSources = [
  'react-src/options/blacklist-list.tsx',
  'react-src/options/settings-forms.tsx',
  'react-src/options/site-search-list.tsx'
].map((file) => fs.readFileSync(file, 'utf8'));

function cssRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

function assertCircularInfoButton(rule, label) {
  assert.match(rule, /width:\s*20px;/, `${label} should be 20px wide`);
  assert.match(rule, /height:\s*20px;/, `${label} should be 20px tall`);
  assert.match(rule, /border-radius:\s*999px;/, `${label} should use a circular hit area`);
  assert.match(rule, /color:\s*rgba\(107,\s*114,\s*128,\s*0\.74\);/, `${label} should use the shared info color`);
}

assertCircularInfoButton(
  cssRule(onboardingHtml, '.interaction-info-button'),
  'onboarding info button'
);
assertCircularInfoButton(
  cssRule(optionsHtml, '._x_extension_shortcut_hint_2024_unique_'),
  'options form info button'
);
assertCircularInfoButton(
  cssRule(optionsHtml, '._x_extension_bookmark_count_hint_2026_unique_'),
  'options bookmark info button'
);

for (const [source, selector, label] of [
  [onboardingHtml, '.interaction-info-button:hover', 'onboarding info hover'],
  [optionsHtml, '._x_extension_shortcut_hint_2024_unique_:hover', 'options form info hover']
]) {
  assert.match(
    cssRule(source, selector),
    /background:\s*rgba\(37,\s*99,\s*235,\s*0\.1\);/,
    `${label} should use the shared blue background`
  );
}

assert.match(
  optionsHtml,
  /_x_extension_bookmark_count_hint_2026_unique_:hover,[\s\S]*?background:\s*rgba\(37,\s*99,\s*235,\s*0\.1\);/,
  'options bookmark info hover should use the shared blue background'
);

for (const source of optionReactSources) {
  const hintBlocks = source.match(/className="[^"]*_x_extension_shortcut_hint_2024_unique_[^"]*"[\s\S]*?<\/span>/g) || [];
  assert.ok(hintBlocks.length > 0, 'expected an options info hint in each React source');
  hintBlocks.forEach((block) => {
    assert.match(block, /ri-information-line/, 'options info hints should use the information icon');
    assert.doesNotMatch(block, /ri-question-line/, 'options info hints should not use the question icon');
  });
}

console.log('info affordance consistency tests passed');
