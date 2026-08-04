Tags: Release

## Features

- 新增 Lumno 账号同步：通过 Google 或 GitHub 登录后，可跨浏览器同步配置、当前启用的明暗壁纸和快捷方式图标，并可在账号页查看状态、手动同步和管理云端数据。
- 新增划词快捷操作：根据所选内容动态提供问 AI、翻译、解释、总结、查资料和换算，并支持选择优先 Provider、操作图标以及 Lumno 蝴蝶入口。
- 扩充并重新整理站内搜索与 AI 搜索源，改善搜索范围切换、建议列表过渡、输入焦点和多语言界面。

## Bug Fixes

- 账号同步新增能力探测和版本兼容：旧服务会安全降级，新设置暂留本机，未知设置只隔离单项，不再拖垮整批同步或在全量刷新时误删本机配置。
- 退出登录现在只退出当前设备，本机设置继续生效；重新登录同一账号时会按服务器版本合并离线改动，并保留真实的多设备冲突供处理。
- 加强账号、上传媒体和删除流程的安全保护，包括 reCAPTCHA、注册/同步频控、私有媒体网关、删除二次授权，以及 Supabase 异常流量与错误告警。
- 修复划词入口定位、设置分段控件、搜索浮层高度与范围切换等交互细节，并加强快捷方式图标、壁纸恢复和账号隔离的稳定性。

---

## Features

- Added Lumno Account Sync: sign in with Google or GitHub to sync settings, active light/dark wallpapers, and shortcut icons across browsers, with status, manual sync, and cloud-data controls in Settings.
- Added Selection Quick Actions that adapt to selected content with Ask AI, Translate, Explain, Summarize, Research, and Convert actions, plus preferred provider, icon set, and Lumno Butterfly trigger choices.
- Expanded and reorganized site-search and AI-search providers, with smoother scope switching, suggestion transitions, input focus, and localized interfaces.

## Bug Fixes

- Added capability discovery and protocol compatibility for account sync: older servers degrade safely, new settings stay local until supported, unknown settings are isolated per item, and full refreshes no longer remove unsupported local settings.
- Sign-out now affects only the current device while local settings keep working; signing back into the same account reconciles offline edits against server versions and preserves real multi-device conflicts.
- Hardened account, media-upload, and deletion flows with reCAPTCHA, signup and sync rate limits, a private media gateway, deletion step-up authorization, and Supabase traffic/error alerts.
- Fixed Selection Quick Action positioning, Settings segmented controls, Command Bar height and scope transitions, and improved shortcut-icon, wallpaper-recovery, and account-isolation stability.
