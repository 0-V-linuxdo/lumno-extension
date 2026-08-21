# Lumno Firefox / Zen — 0.9.51-firefox-v1.0.0

This is a **clean rewrite** from upstream **0.9.51**. It is not another patch on 0.9.52–0.9.59.

Those builds stayed on Manifest V3. On Firefox, temporary add-ons loaded via `about:debugging` **do not grant `host_permissions`**. Content scripts never enter `https` pages, and `scripting.executeScript` fails with *Missing host permission for the tab*. Shortcuts then do nothing.

Firefox still supports Manifest V2, and Mozilla has no plan to remove it. **This package is MV2**, so `<all_urls>` is granted on load, content scripts inject, and the background page stays alive.

## What 0.9.51-firefox-v1.0.0 changes (only this)

| Chrome 0.9.51 | Firefox package |
| --- | --- |
| Manifest V3 service worker | Manifest V2 persistent background |
| `Ctrl+Shift+K` (DevTools Web Console on Firefox) | `Alt+K` |
| `Ctrl+Shift+L` / `Ctrl+Shift+C` | `Alt+L` / `Alt+Shift+C` |
| `Alt+Q` | `Alt+Q` |
| Toolbar → Document PiP | Toolbar → command bar |
| Host permission is `host_permissions` (not granted for temp MV3) | `<all_urls>` in `permissions` (granted on load) |

Zen does **not** bind Alt+K or Alt+Q by default (`Ctrl+K` is search, `Alt+Ctrl+Q` is workspace).

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first.

1. Download `lumno-0.9.51-firefox-v1.0.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:`).
5. Press **Alt+K** (command bar) or **Alt+Q** (tab switcher). Toolbar icon is the same as Alt+K.

Temporary add-ons disappear when the browser restarts. After load, already-open https tabs receive the page listeners automatically — you do not need a grant page.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → `xpinstall.signatures.required` = `false`
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip

## If a shortcut still does nothing

1. Do not test on `about:` pages.
2. Click the toolbar icon.
3. `about:addons` → gear → **Manage Extension Shortcuts**.
4. Zen Settings → Keyboard Shortcuts: make sure Alt+K / Alt+Q are not remapped to something else.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
