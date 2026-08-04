Tags: Release

## Features

- 搜索浮层、新标签页、设置页和引导页完成 React 迁移，并移除旧 UI 渲染回退路径。
- 搜索范围菜单支持范围过滤、双 Tab 确认、退格返回和站内搜索图标展示；同时改善键盘、输入法和 Slash Command 交互。
- 新标签页新增四套壁纸：印象派果园、点彩湖畔、3D 天文台和山水竹桥。
- 为快捷方式加入高分辨率 favicon 解析、页面级 favicon 候选和本地缓存能力。
- 补充站内搜索源的本地图标资源，包括 PNG 图标，并记录图标来源说明。
- 新增 Codex 调试桥接能力，支持对扩展页面和交互表面进行受控检查与操作。
- 改进新标签页响应式布局，在窗口调整时复用已加载数据，并平滑移动搜索框、快捷方式、书签和最近访问区域。

## Bug Fixes

- 修复多个设置同时变化时 Outbox 读改写覆盖、首次并发同步生成多个设备 ID，以及重复发起设备注册的问题。
- 为 Google/GitHub 新账号加入数据库准入与滚动频控，并为设备注册、配置推送和拉取加入每账号分钟窗口及统一心跳节流。
- 登录页加入按需加载且由 Edge/数据库闭环验证的 reCAPTCHA v3；生产监控每五分钟检查 Supabase 健康、错误率、异常流量、注册/同步/媒体阈值和保留任务，并在状态变化时发送飞书与备用邮件告警。
- 退出登录改为只退出当前设备；本机设置继续工作，其他设备保持登录，重新登录同一账号时按服务器版本合并退出期间的本机改动并保留冲突。
- 修复页面级 favicon 被旧主机缓存覆盖的问题，并改进缓存并发写入、策略变更失效和快捷方式图标清理。
- 修复站内搜索 PNG 图标未被打包或未被声明为 web-accessible resource 的问题。
- 改进搜索范围前缀的切换动画、尺寸过渡和文字对比度，提升浅色与深色主题下的可读性。
- 修复新标签页调整窗口大小时最近访问区域闪烁或重复加载的问题。
- 统一提示、光标 tooltip、站内搜索图标和页面过渡的视觉表现，并补充相应的多语言文案。
- 加强 Manifest 资源、搜索范围、快捷方式 favicon、布局动画、调试桥接和商店打包内容的回归测试。

---

## Features

- Completed the React migration for the Command Bar, New Tab, Settings, and Onboarding pages, and removed the legacy UI renderer fallbacks.
- Search scope menus now support scope filtering, double-Tab confirmation, Backspace navigation, and site-search icons, with improved keyboard, IME, and Slash Command interactions.
- Added four New Tab wallpapers: Impressionist Orchard, Pointillist Lakeside, 3D Observatory, and Shanshui Bamboo Bridge.
- Added high-resolution favicon resolution, page-specific favicon candidates, and local caching for shortcuts.
- Added bundled local artwork for site-search providers, including PNG icons, with documented icon sources.
- Added a controlled Codex debugging bridge for inspecting and operating extension pages and interaction surfaces.
- Improved responsive New Tab layouts by reusing loaded data during window resizing and smoothly moving the search box, shortcuts, bookmarks, and recent-site sections.

## Bug Fixes

- Fixed Outbox read-modify-write loss during concurrent setting changes, first-run device ID splits, and duplicate in-flight device registration.
- Added database admission and rolling limits for new Google/GitHub accounts, plus per-account minute windows and shared heartbeat throttling for device registration, settings push, and pull RPCs.
- Added on-demand reCAPTCHA v3 with Edge/database verification, plus five-minute production monitoring for Supabase health, errors, traffic, signup/sync/media guardrails, and retention heartbeats with Feishu and backup email alerts.
- Changed sign-out to affect only the current device: local settings keep working, other devices stay signed in, and signing back into the same account reconciles offline edits against server versions without hiding conflicts.
- Fixed page-specific favicons being overridden by stale host-level caches, and improved concurrent cache writes, policy invalidation, and shortcut-icon cleanup.
- Fixed bundled site-search PNG icons not being packaged or declared as web-accessible resources.
- Improved scope-prefix transitions, size changes, and text contrast for better readability in light and dark themes.
- Fixed flashes and duplicate reloads in the Recent Sites section while resizing the New Tab window.
- Unified the visual treatment of toasts, cursor tooltips, site-search icons, and page transitions, and added the corresponding localized copy.
- Expanded regression coverage for manifest resources, search scopes, shortcut favicons, layout animations, the debugging bridge, and store packaging.
