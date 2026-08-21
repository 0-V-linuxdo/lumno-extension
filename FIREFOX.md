# Lumno Firefox / Zen — 0.9.51-firefox-v1.3.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why v1.2.0 still had dead shortcuts

v1.2.0 preloaded the overlay and re-injected already-open `http(s)` tabs, but the MV2 polyfill called `tabs.executeScript` with `src/...` (no leading `/`).

On Firefox, that path is resolved against the **current page URL**, not the extension. Dynamic inject always failed. If `chrome.commands` had already bound Alt+K / Alt+Q, the page never saw the keydown either — complete silence.

v1.3.0:

1. `tabs.executeScript` files are rewritten to `/src/...` (extension root).
2. Static `content_scripts` were already correct; they still cover refreshed / newly opened https pages.
3. Already-open tabs now get a working dynamic inject instead of a page-relative 404.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0–v1.2.0).

1. Download `lumno-0.9.51-firefox-v1.3.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:`). Refresh is optional.
5. Press **Alt+K** (command bar) or **Alt+Q** (tab switcher). Toolbar icon is the same as Alt+K.

Temporary add-ons disappear when the browser restarts.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → `xpinstall.signatures.required` = `false`
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip

## Shortcuts

| Action | Firefox / Zen | Chromium 0.9.51 |
| --- | --- | --- |
| Open command bar | `Alt+K` | `Ctrl+Shift+K` |
| Prefill current URL | `Alt+L` | `Ctrl+Shift+L` |
| Copy current URL | `Alt+Shift+C` | `Ctrl+Shift+C` |
| Tab switcher | `Alt+Q` | `Alt+Q` |
| Toolbar icon | Command bar | Document PiP |

Zen does **not** bind Alt+K or Alt+Q by default (`Ctrl+K` is search, `Alt+Ctrl+Q` is workspace).

## If a shortcut still does nothing

1. Do not test on `about:` pages.
2. Click the toolbar icon. If that opens the command bar, the page can host it — check `about:addons` → gear → **Manage Extension Shortcuts**.
3. If a dark toast appears at the bottom, refresh the https page once.
4. Unload every older Lumno, then load only v1.3.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
