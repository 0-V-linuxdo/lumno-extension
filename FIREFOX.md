# Lumno Firefox / Zen — 0.9.51-firefox-v1.1.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why v1.0.0 still had dead shortcuts

v1.0.0 was Manifest V2 (so host access is granted on load), but the command bar was still injected with `scripting.executeScript`. Firefox 101+ already exposes that API. The MV2 polyfill then **did nothing**, the 30-file inject failed, and Alt+K / Alt+Q had no fallback.

v1.1.0:

1. Always replaces `scripting.executeScript` with MV2 `tabs.executeScript` (one file at a time).
2. Preloads the command bar and Tab Switcher as `http(s)` content scripts.
3. Alt+K opens the overlay **in the page**. Toolbar / `chrome.commands` send a message to that same page.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0).

1. Download `lumno-0.9.51-firefox-v1.1.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:`) and **refresh once**.
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
2. Refresh the https page after loading the add-on.
3. Click the toolbar icon.
4. `about:addons` → gear → **Manage Extension Shortcuts**.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
