# Lumno Firefox / Zen — 0.9.51-firefox-v1.6.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why v1.5.0 still toasted / stayed silent

v1.5.0 skipped redeclaration and used reason-specific toasts. On a normal https page, Alt+Q still showed “overlay is not loaded” and Alt+K still did nothing.

Firefox content scripts use a `globalThis` that is **not** the same object as `window`. Overlay modules (including the React islands bundle) assign APIs to `globalThis`. Search-panel and tab-switcher read `window.Lumno*`, so the React view looked missing. The command-bar bridge then reported success after calling toggle even when the UI never opened.

v1.6.0:

1. Dual-writes overlay-islands APIs onto `window`.
2. Mirrors `Lumno*` / `_x_extension_*` from `globalThis` to `window` after islands load, and again at toggle time.
3. Command-bar bridge returns failure unless the overlay actually opened.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0–v1.5.0).

1. Download `lumno-0.9.51-firefox-v1.6.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:` and not the add-on page). **Refresh once** after loading the add-on.
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

1. Confirm the address bar is `https://…`.
2. Refresh that tab once after loading the add-on.
3. Click the toolbar icon. If that opens the command bar, check **Manage Extension Shortcuts**.
4. Unload every older Lumno, then load only v1.6.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
