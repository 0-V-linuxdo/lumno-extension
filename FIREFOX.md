# Lumno Firefox / Zen port

This fork adds Gecko support so Lumno can run in **Firefox** and **Zen Browser**.

Upstream (`kubai087/lumno-extension`) is Chromium-only. Loading the Chrome zip with CRX Installer on Zen is why **Open command bar** and **Tab switcher** shortcuts did nothing.

## Why 0.9.52 still had dead shortcuts

Firefox MV3 uses `background.scripts` as a **window event page**. That context has **no `importScripts`**. The 0.9.52 zip only listed `background.js`, so all helper modules failed to load and `chrome.commands.onCommand` never became a working command handler. Content-script fallbacks then waited on a dead background and still listened for `Ctrl+Shift+K`, which Firefox swallows for the Web Console.

0.9.53 fixes that by:

1. Listing every background helper in `manifest.background.scripts` (Firefox loads them as classic window scripts).
2. Making `importScripts` a no-op on Gecko so the same `background.js` still works as a Chrome service worker.
3. Using Firefox-safe suggested keys in the source manifest (`Alt+K` / `Alt+Q`).
4. Seeding those keys in the page listener **immediately**, even if the background is still starting.
5. Making the toolbar icon open the command bar on Firefox / Zen.

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

**Unload the old Lumno first** (`about:addons` → Remove), then load 0.9.53.

### Temporary (easiest, unsigned)

1. Download `lumno-firefox-v0.9.53.zip` from this repo’s Releases, or run `npm run package:firefox` and use `dist/lumno-firefox-v0.9.53.zip`.
2. Unzip the archive.
3. Open `about:debugging#/runtime/this-firefox`
4. **Load Temporary Add-on…**
5. Select the unzipped `manifest.json`
6. Open a normal `https://` page (not `about:`), then press `Alt+K`. Toolbar icon is the fallback.

Temporary add-ons are removed when the browser restarts.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → set `xpinstall.signatures.required` to `false` (Firefox Release may ignore this).
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip.

Zen is more permissive than Firefox Release; if the zip still will not stay installed, use the temporary method or sign it on [addons.mozilla.org](https://addons.mozilla.org).

## What works vs still Chromium-only

Works:

- Command bar overlay on http(s) pages
- Keyboard shortcuts (`Alt+K` / `Alt+Q`) plus page-level fallback
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
