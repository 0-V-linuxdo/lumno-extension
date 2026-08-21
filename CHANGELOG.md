Tags: Release

## Firefox port (0.9.54)

- Firefox 的 `moz-extension://UUID/` 不等于 gecko id，导致扩展自己的新标签页不被识别。
- Tab Switcher 不再注入 zip 里已删除的 `codex-debug-surface.js`，失败时也不再打开 Lumno 主页。
- 命令栏不再被 `commands` + 页面热键各触发一次（开了又关），失败时不再闪一下新标签再关掉。
- Overlay / Tab Switcher 脚本在 Gecko 上分批注入。

- Firefox own-page detection now uses `runtime.getURL('')` so `moz-extension://UUID/` matches.
- Tab Switcher no longer injects the packaged-out debug surface, and no longer opens the Lumno homepage on inject failure.
- Command bar no longer double-fires (commands + page hotkey toggling it closed) or flashes a fallback tab.
- Overlay/switcher scripts inject in batches on Gecko.

## Firefox port (0.9.53)

- Firefox 事件页没有 `importScripts`。`background.scripts` 现在按顺序加载全部后台模块，Chrome 仍走 `service_worker`。
- 源清单默认快捷键改为 `Alt+K` / `Alt+Q`，避免 Firefox 开发者工具吞掉 `Ctrl+Shift+K/C`。
- 页面级监听在后台未就绪时立刻使用 Gecko 默认键；工具栏按钮在 Firefox/Zen 上打开命令栏。
- 设置页的快捷键入口改为 `about:addons` / `commands.openShortcutSettings()`。
- 搜索回退到 `browser.search.search`。新增 gecko / firefox-manifest / package-firefox 回归测试。

- Firefox event pages have no `importScripts`. `background.scripts` now loads every helper; Chrome still uses `service_worker`.
- Source-manifest shortcuts are now `Alt+K` / `Alt+Q` so Firefox DevTools cannot swallow them.
- Page listeners seed Gecko defaults immediately; the toolbar button opens the command bar on Firefox/Zen.
- Shortcut settings open `about:addons`. Search falls back to `browser.search.search`.
- Added gecko shortcut, Firefox manifest, and Firefox package regression tests.

## Firefox port (0.9.52)


- 增加 Firefox / Zen / Gecko 适配：`browser_specific_settings.gecko`、MV3 `background.scripts` + `service_worker` 双声明。
- 修复在 Firefox/Zen 上「打开命令栏」「Tab Switcher」快捷键无响应：Chrome 默认 `Ctrl+Shift+K/C` 与 Firefox 开发者工具冲突，安装后自动改绑到 `Alt+K` / `Alt+Q` 等不冲突组合，并补页面级快捷键回退。
- 修复 Gecko 上 `importScripts(moz-extension://…)` 可能失败导致 background 无法启动的问题。
- 识别 `about:newtab` / `moz-extension:` / AMO，新增 `npm run package:firefox` 生成可在 about:debugging 加载的 zip。

- Added Firefox / Zen / Gecko support: gecko id, dual MV3 background (`scripts` + `service_worker`).
- Fixed command-bar and tab-switcher shortcuts doing nothing on Firefox/Zen: Chrome defaults `Ctrl+Shift+K/C` collide with Firefox DevTools. Gecko now rebinds empty/conflicting commands (Alt+K / Alt+Q) and adds a page-level fallback.
- Fixed background startup on Gecko when `importScripts` rejects absolute `moz-extension://` URLs.
- Recognize `about:newtab` / `moz-extension:` / AMO. Added `npm run package:firefox`.

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
