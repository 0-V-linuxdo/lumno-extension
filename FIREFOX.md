# Lumno Firefox / Zen — 0.9.51-firefox-v1.5.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why v1.4.0 still toasted / stayed silent

v1.4.0 stopped Alt+Q from jumping to another tab, but:

1. One toast covered every Tab Switcher failure, including https inject failure — it always said “use a normal https page”.
2. Dynamic inject re-ran files already loaded by `content_scripts` (`settings.js`, `gecko-runtime.js`, …). Firefox **redeclaration** aborted the rest of the list, so `search-panel.js` / `tab-switcher.js` never ran.
3. The command bar had no toast on restricted pages, and some inject failures were gated by the loading-record — Alt+K looked completely dead.

v1.5.0:

1. Sequential inject **skips** redeclaration / already-declared errors and continues.
2. After a failed inject, still try the in-page toggle.
3. Toasts are **reason-specific** (restricted page vs overlay not loaded vs inject failed).
4. Command bar **always** toasts on Gecko failure, including `about:` / add-on pages.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0–v1.4.0).

1. Download `lumno-0.9.51-firefox-v1.5.0.zip` and unzip it.
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
4. Read the toast: restricted page vs “overlay is not loaded” vs inject failed.
5. Unload every older Lumno, then load only v1.5.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
