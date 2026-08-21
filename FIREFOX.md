# Lumno Firefox / Zen port

This fork adds Gecko support so Lumno can run in **Firefox** and **Zen Browser**.

Upstream (`kubai087/lumno-extension`) is Chromium-only. Loading the Chrome zip with CRX Installer on Zen is why **Open command bar** and **Tab switcher** shortcuts did nothing.

## Why 0.9.56 still had dead shortcuts

The overlay is ~1.3MB across ~30 files. Chrome injects it with `executeScript` when you press the shortcut. 0.9.55/56 tried to keep doing that on Firefox, one file at a time, with a 1.5s timeout on every chrome API.

That is the opposite of what Gecko can do:

1. The MV3 event page is asleep. Waking it parses ~850KB of background JS (`background.js` + `pinyin-pro.js`).
2. `executeScript` of `overlay-islands.js` (272KB) + `search-panel.js` (330KB) then exceeds the 1.5s timeout.
3. The timeout is treated as inject failure. Firefox skips the new-tab fallback, so **nothing appears**.

Page hotkeys also had to `sendMessage` into that sleeping event page. If the 6×80ms retry ran out before the event page finished booting, both Alt+K and Alt+Q were silent.

0.9.57 **reverts that inject-and-timeout path**. The Firefox zip registers the overlay and tab switcher as `http(s)` content scripts. Alt+K calls the in-page toggle immediately. The background is only asked for tab data after the panel is visible. `executeScript` remains a fallback if a tab has no content script yet.

## Why 0.9.55 had dead shortcuts

0.9.55 made the page listener wait for `chrome.commands`, then hydrated the tab with `tabs.get`. On Firefox those callbacks often never fire, so **both** the command path and the page path did nothing.

0.9.56 ran the page hotkey immediately, but still depended on event-page `executeScript`.

## Why 0.9.54 still opened the homepage / flashed a tab

1. Firefox `commands.onCommand` often passes a tab **without `url`**. Tab Switcher then decided the page could not host the overlay and **switched to the Lumno new-tab page** (the plugin homepage).
2. Firefox historically accepts **one file per `executeScript`**. Injecting several files at once failed, and a duplicate page hotkey toggled the command bar closed. Failed injects could still create a Lumno tab that recovery immediately closed.

## Why 0.9.53 opened the homepage / flashed a tab

1. Tab Switcher injected `codex-debug-surface.js`, which is stripped from the Firefox zip. `executeScript` failed and Lumno opened its new-tab page as a fallback.
2. Firefox fires **both** `commands.onCommand` and the page-level listener. The command bar is a toggle, so the second event closed it.

## Why 0.9.52 still had dead shortcuts

Firefox MV3 uses `background.scripts` as a **window event page**. That context has **no `importScripts`**. The 0.9.52 zip only listed `background.js`, so all helper modules failed to load and `chrome.commands.onCommand` never became a working command handler. Content-script fallbacks then waited on a dead background and still listened for `Ctrl+Shift+K`, which Firefox swallows for the Web Console.

## Default shortcuts on Firefox / Zen

| Action | Firefox / Zen | Chromium (unchanged in upstream) |
| --- | --- | --- |
| Open command bar | `Alt+K` | `Ctrl+Shift+K` |
| Prefill current URL | `Alt+L` | `Ctrl+Shift+L` |
| Copy current URL | `Alt+Shift+C` | `Ctrl+Shift+C` |
| Tab switcher | `Alt+Q` | `Alt+Q` |
| Toolbar icon | Opens command bar | Document PiP picker |

If a shortcut still collides with Zen’s own keyboard settings, remap it:

1. Open `about:addons`
2. Click the gear → **Manage Extension Shortcuts**
3. Assign Lumno commands to keys Zen does not use

On Zen you can also check **Settings → Keyboard Shortcuts** for conflicts.

## Install on Zen / Firefox (required)

Do **not** use the Chrome Web Store zip or CRX Installer.

**Unload the old Lumno first** (`about:addons` → Remove), then load 0.9.57.

### Temporary (easiest, unsigned)

1. Download `lumno-firefox-v0.9.57.zip` from this repo’s Releases, or run `npm run package:firefox` and use `dist/lumno-firefox-v0.9.57.zip`.
2. Unzip the archive.
3. Open `about:debugging#/runtime/this-firefox`
4. **Load Temporary Add-on…**
5. Select the unzipped `manifest.json`
6. Open a normal `https://` page (not `about:`), **refresh that page once**, then press `Alt+K`. Toolbar icon is the fallback.

Temporary add-ons are removed when the browser restarts.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → set `xpinstall.signatures.required` to `false` (Firefox Release may ignore this).
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip.

Zen is more permissive than Firefox Release; if the zip still will not stay installed, use the temporary method or sign it on [addons.mozilla.org](https://addons.mozilla.org).

## What works vs still Chromium-only

Works:

- Command bar overlay on http(s) pages
- Keyboard shortcuts (`Alt+K` / `Alt+Q`) plus in-page fallback
- Toolbar button → command bar
- Tab switcher
- New tab override
- Bookmarks / history / top sites / open tabs search
- Settings / onboarding
- Default search via `browser.search.search`

Limited or unavailable on Gecko:

- Chrome `_favicon` / `chrome://favicon2` pipeline (falls back to `tab.favIconUrl` and public favicon URLs)
- Document Picture-in-Picture web clip (Chromium API)
- Some `tabGroups` features on Firefox < 137
- `chrome.storage.sync` account sync behaves differently without Chrome identity

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
npm test
npm run package:firefox
```

Load the unzipped `dist` package (or the repo root) via `about:debugging`.
