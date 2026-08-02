const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('src/options/options.html', 'utf8');
const runtime = fs.readFileSync('src/options/options.js', 'utf8');
const controller = fs.readFileSync('src/background/cloud-account-controller.js', 'utf8');
const transport = fs.readFileSync('src/background/supabase-transport.js', 'utf8');

function run() {
  [
    '_x_extension_cloud_web_signin_2026_unique_',
    '_x_extension_cloud_analytics_toggle_2026_unique_',
    '_x_extension_cloud_delete_2026_unique_'
  ].forEach((id) => assert(html.includes(`id="${id}"`), `${id} should exist`));

  assert.match(html, /data-tab="account"/);
  assert.match(html, /data-content="account"/);
  assert.match(
    runtime,
    /SETTINGS_TAB_KEYS\s*=\s*Object\.freeze\(\[\s*'general',\s*'account',/,
    'account should be accepted as a settings route'
  );
  assert.match(
    runtime,
    /key:\s*'account',[\s\S]*?labelKey:\s*'settings_tab_account'/,
    'React navigation should render the account tab'
  );
  assert.match(html, /浏览历史、当前网页、网页标题、标签页内容、搜索词、书签内容和 Cookie/);
  assert.match(html, /cloud_analytics_toggle_2026_unique_" type="checkbox"[^>]* disabled/);
  assert.match(html, /cloud_status_2026_unique_"[\s\S]*role="status" aria-live="polite"/);
  assert.match(html, /cloud_analytics_toggle_2026_unique_" type="checkbox" aria-describedby="_x_extension_cloud_analytics_desc_2026_unique_" disabled/);
  assert.match(html, /cloud_sync_now_2026_unique_[\s\S]*ri-refresh-line/);
  assert.match(html, /推荐使用 Google 或 GitHub/);
  assert.match(html, /邮箱验证码作为内测入口/);
  assert.match(runtime, /action: 'cloudSignInWithWeb'/);
  assert.doesNotMatch(runtime, /action: 'cloudRequestOtp'/);
  assert.doesNotMatch(runtime, /action: 'cloudVerifyOtp'/);
  assert.match(runtime, /action: 'cloudSetAnalyticsConsent', consented/);
  assert.match(runtime, /cloudSignedIn\.setAttribute\('data-sync-state', syncState\)/);
  assert.match(runtime, /cloudAnalyticsCard\.setAttribute\('data-enabled'/);
  assert.match(
    runtime,
    /String\(sync\.state \|\| ''\) === 'error'[\s\S]*String\(sync\.lastError \|\| ''\)\.trim\(\)/,
    'sync errors should expose the stored diagnostic in the account card'
  );
  assert.match(
    runtime,
    /applyI18n\(\);\s*if \(currentCloudAccountStatus\) \{\s*renderCloudAccountStatus\(currentCloudAccountStatus\);/,
    'late locale loading should not overwrite the rendered cloud connection state'
  );
  assert.match(html, /href="https:\/\/lumno\.kubai\.design\/account\/"/,
    'account deletion should be delegated to the authenticated web portal');
  assert.match(html, /href="https:\/\/lumno\.kubai\.design\/privacy\/"/,
    'the account screen should link to the full privacy policy');
  assert.doesNotMatch(runtime, /cloudDeleteAccount/);
  assert.doesNotMatch(controller, /cloudDeleteAccount/);
  assert.doesNotMatch(transport, /async function deleteAccount/,
    'the extension transport must not retain direct account deletion authority');

  console.log('cloud account UI tests passed');
}

run();
