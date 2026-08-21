# Lumno Firefox / Zen — 0.9.51-firefox-v1.2.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why v1.1.0 still had dead shortcuts

v1.1.0 was Manifest V2 with the overlay preloaded as `http(s)` content scripts, but:

1. Static content scripts do **not** enter tabs that were already open when you Load Temporary Add-on. Alt+K / Alt+Q then fell through to `executeScript`.
2. Tab Switcher fallback still injected `codex-debug-surface.js`. One failed file aborts the sequential MV2 inject, so Alt+Q stayed silent.
3. Inject failures were swallowed (Gecko never opens the new-tab homepage).

v1.2.0:

1. On install, injects the overlay into **already-open** `http(s)` tabs. You no longer have to refresh first.
2. Gecko Tab Switcher inject never includes the debug surface.
3. Alt+Q opens in-page when the switcher is already loaded; background still supplies the tab list.
4. If inject still fails, a short page toast appears instead of silence.
5. `commands.getAll()` only binds **empty** shortcuts, so a user remap is kept.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0 / v1.1.0).

1. Download `lumno-0.9.51-firefox-v1.2.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:`). Refresh is optional in v1.2.0.
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
3. If a dark toast appears at the bottom, the page did not get the overlay. Refresh once.
4. Unload every older Lumno, then load only v1.2.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
