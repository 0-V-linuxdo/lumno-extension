Tags: Release

## 0.9.51-firefox-v1.0.0

Clean rewrite of the Firefox / Zen port from upstream **0.9.51**. This is not another patch on 0.9.52–0.9.59.

Those builds stayed on Manifest V3. Firefox does **not** grant `host_permissions` for temporary add-ons loaded via `about:debugging`, so content scripts never entered `https` pages and `scripting.executeScript` failed with *Missing host permission*. Shortcuts then did nothing.

This package is **Manifest V2**. Mozilla still supports MV2, and `<all_urls>` in `permissions` is granted on load.

- Firefox zip is MV2 with a persistent background page and `<all_urls>` host access.
- Default shortcuts: `Alt+K` command bar, `Alt+Q` tab switcher, `Alt+L` prefill current URL, `Alt+Shift+C` copy URL. (Firefox DevTools swallows Chrome's `Ctrl+Shift+K/C/I/J/L`.)
- Toolbar icon opens the command bar (Document PiP stays Chromium-only).
- Empty-url `onCommand` tabs still attempt overlay inject; Gecko never jumps to the new-tab homepage.
- Page-level Alt+K / Alt+Q backup, plus `commands.update` so temporary add-ons actually bind shortcuts.
- MV2 `tabs.executeScript` polyfill injects the overlay file list one file at a time.
- Chrome source remains upstream 0.9.51 Manifest V3. Product tag: `0.9.51-firefox-v1.0.0` (Firefox `manifest.version` is `1.0.0` because toolkit versions cannot contain hyphens).

Install from `lumno-0.9.51-firefox-v1.0.0.zip`. Do not use the Chrome zip or CRX Installer. See `FIREFOX.md`.

---

## Features

- 搜索浮层、新标签页、设置页和引导页完成 React 迁移，并移除旧 UI 渲染回退路径。
- 搜索范围菜单支持范围过滤、双 Tab 确认、退格返回和站内搜索图标展示；同时改善键盘、输入法和 Slash Command 交互。
- 新标签页新增四套壁纸：印象派果园、点彩湖畔、3D 天文台和山水竹桥。
- 为快捷方式加入高分辨率 favicon 解析、页面级 favicon 候选和本地缓存能力。
- 补充站内搜索源的本地图标资源，包括 PNG 图标，并记录图标来源说明。
- 新增 Codex 调试桥接能力，支持对扩展页面和交互表面进行受控检查与操作。
- 改进新标签页响应式布局，在窗口调整时复用已加载数据，并平滑移动搜索框、快捷方式、书签和最近访问区域。

## Bug Fixes

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

- Fixed page-specific favicons being overridden by stale host-level caches, and improved concurrent cache writes, policy invalidation, and shortcut-icon cleanup.
- Fixed bundled site-search PNG icons not being packaged or declared as web-accessible resources.
- Improved scope-prefix transitions, size changes, and text contrast for better readability in light and dark themes.
- Fixed flashes and duplicate reloads in the Recent Sites section while resizing the New Tab window.
- Unified the visual treatment of toasts, cursor tooltips, site-search icons, and page transitions, and added the corresponding localized copy.
- Expanded regression coverage for manifest resources, search scopes, shortcut favicons, layout animations, the debugging bridge, and store packaging.
