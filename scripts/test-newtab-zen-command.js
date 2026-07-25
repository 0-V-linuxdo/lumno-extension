const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
const newtabHtml = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
const suggestionsViewJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/suggestions-view.js'), 'utf8');

function assertMatches(source, pattern, message) {
  assert.ok(pattern.test(source), message);
}

assertMatches(
  newtabJs,
  /function isZenCommand\(input\) \{[\s\S]*?raw === '\/zen'[\s\S]*?raw\.startsWith\('\/zen '\);[\s\S]*?\}/,
  'New Tab should recognize the /zen command'
);

assertMatches(
  newtabJs,
  /function buildZenSuggestion\(\) \{[\s\S]*?type: 'zenSwitch'[\s\S]*?nextEnabled: !zenModeEnabled/,
  '/zen should render an action that reflects the next Zen state'
);

assertMatches(
  newtabJs,
  /function setContentSectionVisible\(section, visible\) \{[\s\S]*?data-content-visible[\s\S]*?visible && !zenModeEnabled/,
  'Zen mode should preserve each content section configuration while hiding it'
);

assertMatches(
  newtabJs,
  /function applyNewtabWordmarkVisibility\(\) \{[\s\S]*?newtabWordmarkVisible && !zenModeEnabled/,
  'Zen mode should hide the configured New Tab logo without changing its preference'
);

assertMatches(
  newtabJs,
  /if \((?:!localSearchScopeState && )?isZenCommand\(query\)\) \{[\s\S]*?setZenModeEnabled\(!zenModeEnabled\);/,
  'pressing Enter on /zen should toggle Zen mode'
);

assertMatches(
  newtabJs,
  /if \(suggestion\.type === 'zenSwitch'\) \{[\s\S]*?setZenModeEnabled\(suggestion\.nextEnabled\);/,
  'clicking the rendered Zen suggestion should toggle Zen mode'
);

assertMatches(
  newtabJs,
  /Promise\.all\(\[[\s\S]*?bootstrapInitialNewtabFavicon\(\),[\s\S]*?loadZenMode\(\),[\s\S]*?\]\)\.then/,
  'New Tab should restore Zen mode before marking the page ready'
);

assertMatches(
  newtabJs,
  /function syncSearchSurfaceDuringWordmarkTransition\(shouldAnimate\) \{[\s\S]*?requestAnimationFrame\(syncLayout\)/,
  'Zen transitions should keep the search input shell and suggestions surface aligned'
);

assertMatches(
  newtabJs,
  /const suggestionsOpen = Boolean\([\s\S]*?data-nt-suggestions-open[\s\S]*?const shouldAnimate = Boolean\([\s\S]*?!suggestionsOpen[\s\S]*?shouldAnimate \? WORDMARK_VISIBILITY_TRANSITION_CSS : 'none'/,
  'Zen should update atomically instead of moving the search shell while suggestions are open'
);

assertMatches(
  suggestionsViewJs,
  /suggestion\.type === 'modeSwitch' \|\| suggestion\.type === 'zenSwitch'/,
  'Zen suggestions should use the same branded command icon treatment as mode suggestions'
);

assertMatches(
  newtabHtml,
  /body\[data-zen-mode="true"\] \.x-nt-wallpaper-control,[\s\S]*?\.x-nt-feedback-control/,
  'Zen mode should hide New Tab chrome outside the search experience'
);

['en', 'zh_CN', 'zh_TW', 'ja'].forEach((locale) => {
  const messages = JSON.parse(fs.readFileSync(
    path.join(repoRoot, '_locales', locale, 'messages.json'),
    'utf8'
  ));
  ['zen_badge_on', 'zen_badge_off', 'zen_enable_title', 'zen_disable_title'].forEach((key) => {
    assert.ok(messages[key] && messages[key].message, `${locale} should define ${key}`);
  });
});

console.log('newtab zen command tests passed');
