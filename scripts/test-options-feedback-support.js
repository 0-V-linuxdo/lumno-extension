const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const optionsHtml = fs.readFileSync(
  path.join(repoRoot, 'src/options/options.html'),
  'utf8'
);
const optionsJs = fs.readFileSync(
  path.join(repoRoot, 'src/options/options.js'),
  'utf8'
);
const feedbackReact = fs.readFileSync(
  path.join(repoRoot, 'react-src/options/feedback-support.tsx'),
  'utf8'
);
const locales = ['zh_CN', 'zh_TW', 'ja', 'en'];

const feedbackHostIndex = optionsHtml.indexOf(
  'id="_x_extension_feedback_support_2026_unique_"'
);
const globalSettingsIndex = optionsHtml.indexOf(
  'data-i18n="settings_global_section_title"'
);

assert.notStrictEqual(
  feedbackHostIndex,
  -1,
  'general settings should include the feedback support React host'
);
assert.ok(
  feedbackHostIndex < globalSettingsIndex,
  'feedback support should appear above global settings'
);
assert.match(
  optionsHtml,
  /_x_extension_feedback_support_links_2026_unique_[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
  'feedback support should keep all four link labels readable in a two-column grid'
);
assert.match(
  feedbackReact,
  /<a[\s\S]*?href=\{item\.href\}[\s\S]*?target="_blank"/,
  'feedback entries should render as direct external links'
);
assert.match(
  feedbackReact,
  /item\.iconClass[\s\S]*?<span data-i18n=\{item\.labelKey\}>\{item\.label\}<\/span>[\s\S]*?ri-external-link-line/,
  'every feedback entry should show an icon, visible text, and link indicator'
);

assert.match(
  optionsJs,
  /const LUMNO_COMMUNITY_LINKS_URL = `\$\{LUMNO_WEB_ORIGIN\}\/community-links\.json`;/,
  'Options should reuse the remote community links source'
);
assert.match(
  optionsJs,
  /'zh-CN': 'wechat',[\s\S]*?'zh-TW': 'discord',[\s\S]*?ja: 'discord',[\s\S]*?en: 'discord'/,
  'Options should preserve the simplified-Chinese WeChat and other-language Discord mapping'
);
assert.match(
  optionsJs,
  /href: communityIsWechat \? links\.wechatQr : links\.discord/,
  'the community link should resolve directly to the WeChat QR image or Discord'
);

locales.forEach((locale) => {
  const messages = JSON.parse(fs.readFileSync(
    path.join(repoRoot, `_locales/${locale}/messages.json`),
    'utf8'
  ));
  assert.ok(
    messages.settings_feedback_support_section_title &&
      messages.settings_feedback_support_section_title.message,
    `${locale} should localize the feedback support heading`
  );
  [
    'newtab_feedback_x_label',
    'newtab_feedback_github_issue_label',
    'newtab_feedback_chrome_review_label',
    'newtab_feedback_wechat_label',
    'newtab_feedback_discord_label'
  ].forEach((key) => {
    assert.ok(messages[key] && messages[key].message, `${locale} should provide ${key}`);
  });
});

console.log('options feedback support tests passed');
