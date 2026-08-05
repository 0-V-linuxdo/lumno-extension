const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('src/options/options.html', 'utf8');
const runtime = fs.readFileSync('src/options/options.js', 'utf8');
const controller = fs.readFileSync('src/background/cloud-account-controller.js', 'utf8');
const transport = fs.readFileSync('src/background/supabase-transport.js', 'utf8');

function run() {
  [
    '_x_extension_cloud_web_signin_2026_unique_',
    '_x_extension_cloud_signin_status_2026_unique_',
    '_x_extension_cloud_last_signin_hint_2026_unique_',
    '_x_extension_cloud_consent_mask_2026_unique_',
    '_x_extension_cloud_consent_last_signin_hint_2026_unique_',
    '_x_extension_cloud_consent_continue_2026_unique_',
    '_x_extension_cloud_delete_2026_unique_'
  ].forEach((id) => assert(html.includes(`id="${id}"`), `${id} should exist`));

  assert.match(html, /data-tab="account"/);
  assert.match(html, /data-content="account"/);
  assert.match(
    html,
    /\._x_extension_cloud_stack_2026_unique_\s*\{[\s\S]*?padding-inline:\s*14px;/,
    'account content should use the same horizontal inset as standard settings rows'
  );
  assert.match(
    html,
    /\._x_extension_cloud_intro_2026_unique_\s*\{[\s\S]*?padding:\s*8px 0 2px;/,
    'account title should use the same vertical inset as standard settings rows'
  );
  assert.match(
    html,
    /data-method="account"[\s\S]*?id="_x_extension_cloud_web_signin_2026_unique_"/,
    'the account sign-in action should live inside the Lumno account method card'
  );
  assert.match(
    html,
    /class="_x_extension_cloud_method_surface_2026_unique_"[\s\S]*?class="_x_extension_cloud_method_grid_2026_unique_ _x_extension_cloud_method_compare_card_2026_unique_"[\s\S]*?data-method="browser"[\s\S]*?data-method="account"/,
    'the two sync methods should share one search-source style comparison card'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_surface_2026_unique_\s*\{[\s\S]*?margin-top:\s*10px;[\s\S]*?padding:\s*16px;[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*var\(--settings-panel-radius\);[\s\S]*?background:\s*url\("\.\.\/\.\.\/assets\/images\/frame-1102\.jpg"\)[\s\S]*?box-shadow:\s*none;/,
    'the method cards should sit inside a padded image-backed rounded surface'
  );
  assert.match(
    html,
    /#_x_extension_settings_panel_2024_unique_\s*\{[\s\S]*?--settings-panel-radius:\s*22px;/,
    'the settings panel should expose one shared corner-radius token'
  );
  assert.match(html, /data-i18n="cloud_sync_method_browser_title">浏览器内置同步</,
    'the browser method should use the built-in browser sync title');
  assert.match(html, /data-i18n="cloud_account_section_title">同步方式</,
    'the account heading should label the sync method section');
  assert.match(html, /\._x_extension_account_sync_row_2026_unique_\s*\{[\s\S]*?flex-wrap:\s*wrap;/,
    'the browser sync row should wrap as a whole when translations need more room');
  assert.match(html, /\._x_extension_account_sync_row_2026_unique_\s+\._x_extension_sync_status_2024_unique_\s*\{[\s\S]*?white-space:\s*nowrap;/,
    'the browser sync status chip should not wrap its label');
  assert.match(html, /\._x_extension_account_sync_row_2026_unique_\s+\._x_extension_sync_buttons_2024_unique_\s*\{[\s\S]*?flex-wrap:\s*nowrap;/,
    'the browser sync buttons should stay together on their row');
  assert.doesNotMatch(
    html,
    /cloud_sync_method_browser_current|_x_extension_cloud_current_tag_2026_unique_/,
    'the browser method should not show a current-status tag'
  );
  assert.match(
    html,
    /data-i18n="cloud_sync_method_account_title">Lumno 账号同步<[\s\S]*?class="_x_extension_shortcut_badge_2024_unique_ _x_extension_lab_beta_badge_2026_unique_ _x_extension_cloud_account_beta_tag_2026_unique_">Beta</,
    'the Lumno account sync method should be marked as beta'
  );
  assert.match(html, /\._x_extension_cloud_method_extension_icon_2026_unique_\s*\{[\s\S]*?width:\s*30px;[\s\S]*?height:\s*30px;/,
    'the Lumno extension icon should be slightly larger');
  assert.match(html, /\._x_extension_cloud_account_beta_tag_2026_unique_\s*\{[\s\S]*?padding:\s*3px 8px;[\s\S]*?font-size:\s*12px;/,
    'the account beta badge should be slightly larger');
  const browserMethodMarkup = html.match(/<article class="_x_extension_cloud_method_pane_2026_unique_" data-method="browser">([\s\S]*?)<\/article>/)?.[1] || '';
  assert.strictEqual(
    (browserMethodMarkup.match(/ri-close-line/g) || []).length,
    2,
    'browser sync limitations should keep X-related icons for unsupported items'
  );
  assert.doesNotMatch(browserMethodMarkup, /ri-window-line/,
    'the browser sync title should not show a leading icon');
  assert.match(html, /\._x_extension_cloud_method_pane_2026_unique_\[data-method="browser"\]\s+\._x_extension_shortcut_item_title_2024_unique_\s*\{[\s\S]*?font-weight:\s*550;/,
    'the browser sync title should use a slightly lighter weight');
  assert.match(browserMethodMarkup, /ri-check-line[\s\S]*cloud_sync_method_browser_limit_scope/,
    'browser sync availability should use a check icon');
  assert.doesNotMatch(browserMethodMarkup, /ri-user-unfollow-line|ri-global-off-line|ri-image-line/);
  assert.match(html, /ri-global-line/);
  assert.match(html, /ri-shield-check-line/);
  assert.match(html, /data-i18n="cloud_sync_method_account_benefit_security">不含浏览器隐私数据</);
  assert.match(html, /data-i18n="cloud_sync_method_account_benefit_restore">同步壁纸和快捷方式图标</);
  assert.match(html, /_x_extension_cloud_method_info_button_2026_unique_[\s\S]*ri-information-line/,
    'the data security benefit should expose the onboarding-style info button');
  assert.match(html, /data-i18n-tooltip="cloud_sync_method_account_benefit_security_tooltip"/,
    'the data security info button should use a localized tooltip');
  assert.match(html, /\._x_extension_cloud_method_info_button_2026_unique_\s*\{[\s\S]*?width:\s*20px;[\s\S]*?height:\s*20px;[\s\S]*?border-radius:\s*999px;/,
    'the data security info button should match the onboarding circular info treatment');
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\[data-method="browser"\]\s*\{[\s\S]*?border-radius:\s*16px\s+0\s+0\s+16px;/,
    'the browser pane should not round its right edge'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\[data-method="browser"\]\s*\{[\s\S]*?margin:\s*8px 0 8px 8px;/,
    'the browser pane should reserve a left inset matching its vertical breathing room'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\s*\{[\s\S]*?min-height:\s*330px;/,
    'both method panes should use a taller shared minimum height'
  );
  assert.match(
    html,
    /class="_x_extension_cloud_method_title_icon_2026_unique_"[\s\S]*?class="_x_extension_cloud_method_extension_icon_2026_unique_"[\s\S]*?assets\/images\/lumno\.png/,
    'the account method should use the Lumno extension icon'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_extension_icon_2026_unique_\s*\{[\s\S]*?transform:\s*rotate\(-8deg\);[\s\S]*?filter:\s*\n\s*drop-shadow\(0 1px 1px rgba\(66, 183, 255, 0\.1\)\)[\s\S]*?drop-shadow\(-2px 3px 2px rgba\(66, 183, 255, 0\.09\)\)[\s\S]*?drop-shadow\(-4px 8px 2\.5px rgba\(66, 183, 255, 0\.05\)\)[\s\S]*?drop-shadow\(-7px 14px 3px rgba\(66, 183, 255, 0\.01\)\)/,
    'the Lumno extension icon should match the homepage layered blue shadow'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_compare_card_2026_unique_\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*0\.9fr\)\s+minmax\(0,\s*1\.1fr\);/,
    'the Lumno account pane should have the wider share of the comparison card'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_compare_card_2026_unique_\s*\{[\s\S]*?--cloud-method-pane-padding:\s*24px;/,
    'both method panes should share one four-sided inner padding token'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\s*\{[\s\S]*?padding:\s*var\(--cloud-method-pane-padding\);/,
    'both method panes should consume the shared inner padding token'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\s*>\s*\._x_extension_shortcut_item_header_2024_unique_,[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/,
    'both method text regions should share one full-width horizontal frame'
  );
  assert.match(html, /\._x_extension_cloud_method_pane_2026_unique_\s*>\s*\._x_extension_shortcut_item_header_2024_unique_\s*\{[\s\S]*?min-height:\s*108px;[\s\S]*?align-items:\s*flex-start;/,
    'both method titles should reserve the same height before the small copy starts');
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\[data-method="browser"\]\s*>\s*\._x_extension_shortcut_item_header_2024_unique_,[\s\S]*?transform:\s*translateY\(-7px\);/,
    'the browser text region should compensate for its visual inset and align vertically with the account region'
  );
  assert.match(
    html,
    /\._x_extension_cloud_method_pane_2026_unique_\s+\._x_extension_shortcut_item_title_2024_unique_\s*\{[\s\S]*?font-size:\s*20px;[\s\S]*?font-weight:\s*600;/,
    'method card titles should use the larger emphasized title style'
  );
  assert.match(html, /\._x_extension_cloud_method_compare_card_2026_unique_\s*\{[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/,
    'the comparison wrapper should not draw its own border or shadow');
  assert.match(html, /\._x_extension_cloud_method_pane_2026_unique_\[data-method="browser"\]\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*color-mix\(in srgb, #cbd5e1 20%, transparent\);[\s\S]*?backdrop-filter:\s*grayscale\(1\) blur\(4px\);/,
    'the browser pane should use a translucent gray layer with grayscale blur and no outline');
  assert.match(html, /\._x_extension_cloud_method_pane_2026_unique_\[data-method="account"\]\s*\{[\s\S]*?margin-left:\s*-10px;[\s\S]*?box-shadow:/,
    'the account pane should overlap the browser pane as a raised card');
  assert.match(html, /id="_x_extension_cloud_web_signin_2026_unique_" class="_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_cloud_method_signin_2026_unique_"/,
    'the account sign-in action should use the default primary button style and method-card positioning hook');
  assert.match(html, /class="_x_extension_cloud_method_signin_row_2026_unique_"[\s\S]*?id="_x_extension_cloud_web_signin_2026_unique_"[\s\S]*?_x_extension_cloud_signin_support_2026_unique_[\s\S]*?googleg_standard_color_128dp\.png[\s\S]*?ri-github-fill/,
    'the sign-in action should show the Google G and GitHub provider avatars beside it');
  assert.match(html, /\._x_extension_cloud_method_signin_row_2026_unique_\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?gap:\s*12px;/,
    'the provider support hint should follow the sign-in button');
  assert.match(html, /\._x_extension_cloud_provider_avatar_2026_unique_\s*\{[\s\S]*?width:\s*22px;[\s\S]*?height:\s*22px;[\s\S]*?border-radius:\s*999px;/,
    'provider icons should use circular avatar styling');
  assert.match(html, /\._x_extension_cloud_provider_avatar_2026_unique_\s*\+\s*\._x_extension_cloud_provider_avatar_2026_unique_\s*\{[\s\S]*?margin-left:\s*-6px;/,
    'provider avatars should overlap like the shared avatar group');
  assert.match(html, /\._x_extension_cloud_provider_avatar_image_2026_unique_\s*\{[\s\S]*?width:\s*16px;[\s\S]*?height:\s*16px;[\s\S]*?object-fit:\s*contain;/,
    'the Google G asset should use the same visual size as the GitHub glyph');
  assert.match(html, /\._x_extension_cloud_provider_avatar_2026_unique_ \.ri-icon\s*\{[\s\S]*?font-size:\s*16px;/,
    'the GitHub glyph should use the same visual size as the Google G asset');
  assert.match(html, /\._x_extension_cloud_method_signin_2026_unique_\s*\{[\s\S]*?align-self:\s*flex-start;[\s\S]*?margin-top:\s*auto;/,
    'the account sign-in action should sit at the bottom-left of its pane');
  assert.doesNotMatch(html, /id="_x_extension_cloud_web_signin_2026_unique_"[^>]*_x_extension_cloud_action_2026_unique_/,
    'the account sign-in action should not receive cloud-specific button overrides');
  assert.match(html, /_x_extension_cloud_divider_2026_unique_[\s\S]*_x_extension_setting_divider_2024_unique_/,
    'the account divider should reuse the shared divider component');
  assert.match(html, /\._x_extension_cloud_stack_2026_unique_\s*>\s*\._x_extension_cloud_divider_2026_unique_\s*\{[\s\S]*?width:\s*100%;[\s\S]*?margin-inline:\s*0;/,
    'the account divider wrapper should use the full comparison card track width');
  assert.match(html, /\._x_extension_cloud_stack_2026_unique_\s*>\s*\._x_extension_cloud_divider_2026_unique_\s*>\s*\._x_extension_setting_divider_2024_unique_\s*\{[\s\S]*?width:\s*100%;[\s\S]*?margin-inline:\s*0;/,
    'the account divider line should remove the shared inset and fill its wrapper');
  assert.match(
    html,
    /\._x_extension_settings_content_2024_unique_\s*\{[\s\S]*?padding-bottom:\s*var\(--settings-content-edge-space\);/,
    'all settings tabs should reserve a shared bottom edge space'
  );
  const accountMethodGridIndex = html.indexOf('class="_x_extension_cloud_method_surface_2026_unique_"');
  const browserSyncRowIndex = html.indexOf('data-i18n="settings_sync_title"');
  const accountDividerIndex = html.indexOf('_x_extension_cloud_divider_2026_unique_', browserSyncRowIndex);
  const accountHeadingIndex = html.indexOf('data-i18n="cloud_account_section_title"');
  assert.ok(
    browserSyncRowIndex < accountMethodGridIndex,
    'browser built-in sync should appear above the method cards'
  );
  assert.ok(
    accountDividerIndex > browserSyncRowIndex && accountDividerIndex < accountMethodGridIndex,
    'the shared divider should sit between browser sync controls and method comparison'
  );
  assert.ok(
    accountHeadingIndex > accountDividerIndex && accountHeadingIndex < accountMethodGridIndex,
    'the account heading should sit above the method card surface'
  );
  assert.doesNotMatch(
    html,
    /id="_x_extension_cloud_signed_out_2026_unique_"/,
    'the separate signed-out cloud card should not remain below the method cards'
  );
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
  assert.doesNotMatch(html, /cloud_analytics_toggle_2026_unique_/,
    'usage analytics should not have a separate post-login switch');
  assert.doesNotMatch(html, /id="_x_extension_cloud_status_2026_unique_"/,
    'the top-right cloud login status indicator should be removed');
  assert.doesNotMatch(runtime, /cloudStatus/,
    'the removed cloud login status indicator should not be rendered by runtime code');
  assert.match(
    html,
    /id="_x_extension_cloud_consent_mask_2026_unique_" class="_x_extension_confirm_mask_2024_unique_ _x_extension_cloud_consent_mask_2026_unique_"[\s\S]*id="_x_extension_cloud_consent_dialog_2026_unique_"[\s\S]*class="_x_extension_confirm_dialog_2024_unique_ _x_extension_cloud_consent_dialog_2026_unique_"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/,
    'the account consent dialog should reuse the existing confirm modal shell'
  );
  assert.match(
    html,
    /\._x_extension_confirm_mask_2024_unique_:\s*not\(\[data-show="true"\]\)\s+\._x_extension_confirm_dialog_2024_unique_/,
    'the shared modal shell should provide the consent dialog transition state'
  );
  assert.match(
    html,
    /\._x_extension_cloud_consent_dialog_2026_unique_\s*\{[\s\S]*?border-radius:\s*27px;[\s\S]*?transform:\s*translate3d\([\s\S]*?var\(--x-extension-cloud-consent-enter-x, 0px\)/,
    'the consent dialog should match the shortcut dialog radius and use a trigger-aware transform'
  );
  assert.match(
    html,
    /\._x_extension_cloud_consent_actions_2026_unique_ button\s*\{[\s\S]*?border-radius:\s*999px\s*!important;/,
    'consent actions should use the same pill radius as shortcut dialog buttons'
  );
  assert.match(
    runtime,
    /const confirmDialog = confirmMask\s*\?\s*confirmMask\.querySelector\(/,
    'the legacy confirm controller should resolve its dialog inside its own existing modal shell'
  );
  assert.doesNotMatch(html, /cloud_conflict_|_x_extension_cloud_conflict_/,
    'automatic conflict resolution should not expose a conflict popup or action in the options page');
  assert.doesNotMatch(runtime, /cloudConflict|cloudGetConflicts|cloudResolveConflict/,
    'the options runtime should not load or manage conflicts interactively');
  assert.match(controller, /autoResolveConflicts/,
    'the account controller should normalize existing conflicts automatically');
  assert.match(html, /data-i18n="cloud_consent_account_isolation">请始终使用原登录方式/,
    'the pre-auth disclosure should explain that different-email accounts stay isolated');
  assert.match(html, /账号和数据暂不支持关联或合并；相同已验证邮箱可能被识别为同一账号/,
    'the account policy should disclose both isolation and Supabase same-email behavior');
  assert.match(runtime, /cloud_last_signin_hint/,
    'the account UI should localize the last-used provider hint');
  assert.match(runtime, /renderCloudLastSigninHint\(value\.lastSignInProvider, configured && !signedIn\)/,
    'the account UI should render the persisted last-used provider while signed out');
  assert.match(html, /产品使用统计[\s\S]*与账号关联[\s\S]*最多保留 24 个月/,
    'the pre-auth surface should disclose account linkage and retention');
  assert.match(html, /cloud_sync_now_2026_unique_[\s\S]*ri-refresh-line/);
  assert.match(html, /data-i18n="cloud_consent_analytics"/);
  assert.match(html, /data-i18n="cloud_consent_media_review"/,
    'cloud consent should disclose compression and automated media safety checks');
  assert.match(runtime, /cloudWebSigninButton\.addEventListener\('click',[\s\S]*openCloudConsentDialog\(\)/,
    'the account action must open the local disclosure before OAuth');
  assert.match(runtime, /function setCloudConsentEnterDirection\(sourceElement, dialog\)/,
    'the consent dialog should calculate its enter direction from the trigger position');
  assert.match(runtime, /setCloudConsentEnterDirection\(cloudConsentReturnFocus \|\| cloudWebSigninButton, cloudConsentDialog\)/,
    'the consent dialog should set its trigger-aware direction before animating open');
  assert.match(runtime, /cloudConsentContinueButton\.addEventListener\('click', startCloudWebSignIn\)/);
  assert.match(runtime, /action: 'cloudSignInWithWeb',[\s\S]*consentVersion: CLOUD_COMBINED_CONSENT_VERSION/);
  assert.match(
    html,
    /id="_x_extension_cloud_signin_status_2026_unique_"[\s\S]*role="status"[\s\S]*aria-live="polite"/,
    'web sign-in should expose a live inline status below the account action'
  );
  assert.match(
    runtime,
    /CLOUD_WEB_SIGNIN_PENDING_KEY[\s\S]*sessionStorage\.setItem\(CLOUD_WEB_SIGNIN_PENDING_KEY/,
    'the options page should persist an in-progress web sign-in across its own reload'
  );
  assert.match(
    runtime,
    /catch\(async \(error\) => \{[\s\S]*action: 'cloudGetStatus'[\s\S]*isCloudAccountSignedIn\(recoveredStatus\)[\s\S]*completeCloudWebSignin\(recoveredStatus, \{ initializationFailed: true \}\)/,
    'a broken callback should recover an authenticated account instead of reporting sign-in failure'
  );
  assert.match(
    runtime,
    /window\.addEventListener\('focus',[\s\S]*recoverCloudWebSignin\(\{ returned: true \}\)/,
    'returning from web auth should re-check the durable account state'
  );
  assert.match(
    runtime,
    /function scheduleCloudSigninRecovery\(\)[\s\S]*recoverCloudWebSignin\(\{ returned: true \}\)/,
    'the return check should retry while account initialization is still settling'
  );
  assert.match(runtime, /cloud_signin_status_sync_retry/,
    'post-auth sync failures should be shown as a retrying sync state, not a failed login');
  assert.match(runtime, /cloud_signin_status_finishing/,
    'a returned account should remain pending until its initial sync state settles');
  assert.doesNotMatch(runtime, /action: 'cloudRequestOtp'/);
  assert.doesNotMatch(runtime, /action: 'cloudVerifyOtp'/);
  assert.doesNotMatch(runtime, /cloudSetAnalyticsConsent/);
  assert.match(runtime, /cloudSignedIn\.setAttribute\('data-sync-state', syncState\)/);
  assert.match(controller, /acceptCombinedCloudConsent\(\)/);
  assert.match(controller, /cloud_consent_required/);
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
  assert.doesNotMatch(runtime, /cloudDeleteAccount/);
  assert.doesNotMatch(controller, /cloudDeleteAccount/);
  assert.doesNotMatch(controller, /requestOtp|verifyOtp/);
  assert.doesNotMatch(`${runtime}\n${controller}\n${transport}`, /linkIdentity|unlinkIdentity|cloudLinkIdentity/,
    'the extension must not expose account linking while identities are intentionally isolated');
  assert.doesNotMatch(transport, /requestOtp|verifyOtp|\/auth\/v1\/otp|\/auth\/v1\/verify/);
  assert.doesNotMatch(transport, /async function deleteAccount/,
    'the extension transport must not retain direct account deletion authority');

  console.log('cloud account UI tests passed');
}

run();
