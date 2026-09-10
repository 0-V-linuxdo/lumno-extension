Tags: Release

## 0.9.55-firefox-v1.2.0

v1.1.0 mapped `chrome://` / `about:` pages to bundled icons, but Gecko's `runtime.id` (`lumno@…`) is **not** the `moz-extension://` hostname (a per-install UUID). Reconstructing `moz-extension://lumno@…/assets/…` produced unloadable URLs. Tab Switcher large preview cards have no remix placeholder, so `about:addons` painted as empty navy tiles.

v1.2.0 identifies the own origin from `runtime.getURL('')` hostname, never from `runtime.id`, rewrites privileged `chrome://mozapps/…` favicons at paint, and still never emits `_favicon` / `chrome://favicon2` on Gecko. Chromium `_favicon` is unchanged.

Install `lumno-0.9.55-firefox-v1.2.0.zip`. Unload v1.1.0 first. See `FIREFOX.md`.

## 0.9.55-firefox-v1.0.0

Firefox / Zen port rebased onto upstream **0.9.55**. Chrome source in this repo is 0.9.55 MV3. The Firefox zip is still Manifest V2, packed by `scripts/package-firefox.js`.

This is a new product line, not another 0.9.51-firefox-v1.x adapter bump. Do not install the abandoned `v0.9.52-firefox`–`v0.9.59-firefox` MV3 tags.

Carries forward the working Gecko layer from 0.9.51-firefox-v1.8.0: MV2 persistent background, `<all_urls>` on load, Alt+K / Alt+Q, `globalThis`→`window` overlay mirror, restricted-page newtab / host-hop fallback, Nightly 156 `align-content: center` after `all: unset`.

Absorbs upstream 0.9.52–0.9.55: search-first results, shortcut layout, aggregate search, Glass/Blocks/CRT wallpapers, Kagi (`kg` / `kagi`). Aggregate search tab grouping feature-detects `tabs.group` / `tabGroups.update` and opens ungrouped tabs when the API is missing. Firefox package still omits `tabGroups` so `strict_min_version` stays 109.0.

Install `lumno-0.9.55-firefox-v1.0.0.zip`. Unload every older Lumno first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.8.0

Still based on upstream **0.9.51**. On Firefox Nightly 156 the command-bar search field (placeholder + caret) sat at the top of the 56px row; Zen 1.21.15b (Firefox 154) looked normal. Language did not matter.

Firefox 156 (Bug 2055599) moved UA form-control centering to author-overridable `align-content`. The overlay input uses `all: unset` and then sets `height: 56px` with **zero vertical padding**, so Nightly drops that centering and the text/caret jump up (Bug 2064376). Zen 154 still centers in the form-control internals, which is why the same CSS looked fine there. New-tab search has 8px padding and is much less exposed.

v1.8.0 restores `align-content: center` after `all: unset` on `.x-lumno-search-input__field` and the React island `BASE_STYLES.input`. Safe on Zen 154 (ignored / no-op) and the actual fix on Nightly 156.

Install `lumno-0.9.51-firefox-v1.8.0.zip`. Unload v1.7.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.7.0

Still based on upstream **0.9.51**. v1.6.0 made https shortcuts work. On `about:` / privileged pages they stayed silent instead of Chrome’s new-tab / switch-tab fallback.

Firefox cannot inject content scripts into privileged UI. Chrome still calls `tabs.create` with Lumno’s own `lumno-newtab.html?focus=1` (allowed on Gecko) or hops Tab Switcher onto another hostable tab. The port had **no-op’d** those fallbacks, and own `moz-extension://` pages were missed because the host UUID is not the gecko id.

v1.7.0 restores the newtab fallbacks on Gecko, matches own pages via `runtime.getURL('')`, hops Alt+Q to a hostable tab when needed, and opens Lumno newtab when none exists.

Install `lumno-0.9.51-firefox-v1.7.0.zip`. Unload v1.6.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.6.0

Still based on upstream **0.9.51**. v1.5.0 made failure toasts honest, but Alt+Q still said “overlay is not loaded” on https and Alt+K stayed silent.

Firefox content scripts use a `globalThis` that is **not** `window`. Overlay modules (including `overlay-islands.js`) export to `globalThis`; search-panel / tab-switcher read `window.Lumno*`. The tab switcher then returned `react-view-unavailable`. The command-bar bridge always replied `{ok:true}` after calling toggle, so Alt+K looked dead.

v1.6.0 dual-writes APIs onto `window`, mirrors `globalThis` → `window` after islands load, and reports command-bar failure when the overlay does not open.

Install `lumno-0.9.51-firefox-v1.6.0.zip`. Unload v1.5.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.5.0

Still based on upstream **0.9.51**. v1.4.0 stopped Alt+Q from hopping tabs, but used one toast for every failure (“use a normal https page”). On https, re-injecting overlay files over scripts already loaded by `content_scripts` hit **redeclaration** and aborted `search-panel.js` / `tab-switcher.js`. The command bar also stayed silent: restricted pages and some inject failures never toasted.

v1.5.0 skips redeclaration during sequential inject, still tries the in-page toggle after a failed inject, toasts with a **reason-specific** message, and always toasts on Gecko command-bar failure (including restricted pages).

Install `lumno-0.9.51-firefox-v1.5.0.zip`. Unload v1.4.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.4.0

Still based on upstream **0.9.51**. v1.3.0 fixed inject file paths, but Alt+Q on a `moz-extension://` add-on page still **jumped to another tab**: `isOwnExtensionPageUrl` only matched `chrome-extension:`, so Firefox treated the add-on page as unhostable and called `focusWindowAndActivateTab` on a recent https tab. On https, re-injecting the switcher over already-loaded content scripts could abort the toggle.

v1.4.0 treats `moz-extension:` as an own page, never hops to another tab on Gecko, tries `tabs.sendMessage` then an in-page toggle before re-injecting files, and shows a toast instead of switching tabs.

Install `lumno-0.9.51-firefox-v1.4.0.zip`. Unload v1.3.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.3.0

Still based on upstream **0.9.51**. v1.2.0 preloaded and re-injected the overlay into already-open tabs, but the MV2 polyfill passed `src/...` files to `tabs.executeScript` **without a leading `/`**. Firefox resolves those relative to the **page URL**, so every dynamic inject failed. Bound `chrome.commands` then ate Alt+K / Alt+Q before the page listener, and both paths stayed silent.

v1.3.0 prefixes inject files with `/` so they resolve against the extension root. Static content scripts were already correct.

Install `lumno-0.9.51-firefox-v1.3.0.zip`. Unload v1.2.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.2.0

Still based on upstream **0.9.51**. v1.1.0 preloaded the overlay as content scripts, but already-open tabs never received them, Tab Switcher fallback still injected `codex-debug-surface.js` (one failure aborts sequential `tabs.executeScript`), and inject errors stayed silent.

v1.2.0 injects the overlay into open `http(s)` tabs on install, skips the debug surface on Gecko, opens Alt+Q in-page when the switcher is already loaded, shows a page toast on inject failure, and only `commands.update`s empty shortcuts.

Install `lumno-0.9.51-firefox-v1.2.0.zip`. Unload v1.1.0 first. See `FIREFOX.md`.

## 0.9.51-firefox-v1.1.0

Still based on upstream **0.9.51**. v1.0.0 was MV2 (host access granted) but still injected the command bar with `scripting.executeScript`. Firefox already exposes that API, so the polyfill skipped, the 30-file inject failed, and shortcuts did nothing.

v1.1.0 always overwrites `scripting.executeScript` with MV2 `tabs.executeScript`, preloads the command bar / Tab Switcher as `http(s)` content scripts, and opens Alt+K in-page.

Install `lumno-0.9.51-firefox-v1.1.0.zip`. Unload v1.0.0 first. See `FIREFOX.md`.

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

- 新增 Kagi 内置搜索引擎，支持通过 `kg` 或 `kagi` 触发搜索，并提供与现有搜索源一致的本地图标和浏览器默认搜索引擎识别。

## Bug Fixes

- 修复搜索范围面板中鼠标悬停会覆盖键盘焦点描边的问题，使用方向键浏览搜索源时始终保留清晰的当前项提示。
- 修复点击搜索源时原生焦点可能先滚动面板祖先的问题，避免指针选择造成搜索面板或页面位置跳动。
- 调整 New Tab 壁纸效果的销毁时机，不再通过 `beforeunload` 提前移除画布，使同页导航期间的已绘制效果保持稳定。

---

## Features

- Added Kagi as a built-in search engine with `kg` and `kagi` triggers, bundled local artwork, and default-browser search engine recognition consistent with the existing providers.

## Bug Fixes

- Fixed pointer hover overriding the keyboard focus border in the search-scope panel, so arrow-key navigation always retains a clear current-item indicator.
- Prevented native pointer focus from scrolling panel ancestors before a search source is selected, avoiding unexpected panel or page movement.
- Adjusted the New Tab wallpaper effect lifecycle so `beforeunload` no longer removes the canvas early, preserving the painted effect during same-tab navigation.
