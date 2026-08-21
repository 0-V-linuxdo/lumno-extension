# Lumno Firefox / Zen — 0.9.51-firefox-v1.4.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why v1.3.0 still jumped / stayed silent

v1.3.0 fixed `tabs.executeScript` paths (`/src/...`). That was not enough:

1. `isOwnExtensionPageUrl` only accepted `chrome-extension:`. Firefox add-on pages are `moz-extension://…`. Alt+Q then picked another tab that *could* host the switcher and **activated it** — jump from the add-on page.
2. On https, if `tabs.sendMessage` missed, the fallback re-injected switcher files on top of the static content scripts. A redeclaration error aborted the toggle, so https stayed silent.
3. Failure toasts used `executeScript` only, which also fails on restricted pages.

v1.4.0:

1. Own-page detection includes `moz-extension:`.
2. Gecko **never** focuses another tab to host the switcher.
3. Open path: `sendMessage` → in-page toggle → inject files only if the helper is missing.
4. Toasts go through the content-script bridge first.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0–v1.3.0).

1. Download `lumno-0.9.51-firefox-v1.4.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:` and not the add-on page). Refresh is optional.
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

1. Do not test on `about:` or the add-on (`moz-extension://`) page.
2. Click the toolbar icon. If that opens the command bar, the page can host it — check `about:addons` → gear → **Manage Extension Shortcuts**.
3. If a dark toast appears at the bottom, you are on a restricted page or the overlay is not loaded; open/refresh an https page.
4. Unload every older Lumno, then load only v1.4.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
