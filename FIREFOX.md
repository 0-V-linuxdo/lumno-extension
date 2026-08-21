# Lumno Firefox / Zen port

This fork starts from upstream **0.9.51** (Chromium-only) and adds a Gecko package for Firefox and Zen.

Do **not** install the Chrome zip with CRX Installer.

## Why every 0.9.52–0.9.57 build looked dead

Mozilla’s own docs:

1. **Temporary add-ons skip the install permission prompt.**  
   `about:debugging` does not grant `host_permissions`. Without that grant, content scripts never enter `https` pages and `scripting.executeScript` fails with *Missing host permission for the tab*. Both Alt+K and Alt+Q then do nothing.  
   See [Temporary installation in Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) and the MV3 host-permission notes in the [Manifest V3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/).

2. **`commands.onCommand` often passes a tab with no `url`.**  
   Lumno treats an empty URL as restricted (`about:` / missing). The overlay never injects. 0.9.53 then opened the new-tab homepage as a fallback; later builds skipped that fallback, so the shortcut went silent.

3. **`Ctrl+Shift+K` is Firefox DevTools (Web Console).**  
   0.9.51’s Chrome default cannot fire on Gecko. This fork uses `Alt+K` via `_execute_action` (same as clicking the toolbar, which also grants `activeTab`).

Zen does **not** bind Alt+K or Alt+Q by default (`Ctrl+K` is search, `Alt+Ctrl+Q` is workspace).

## Default shortcuts on Firefox / Zen

| Action | Firefox / Zen | Chromium (0.9.51) |
| --- | --- | --- |
| Open command bar | `Alt+K` (toolbar command) | `Ctrl+Shift+K` |
| Prefill current URL | `Alt+L` | `Ctrl+Shift+L` |
| Copy current URL | `Alt+Shift+C` | `Ctrl+Shift+C` |
| Tab switcher | `Alt+Q` | `Alt+Q` |
| Toolbar icon | Opens command bar | Document PiP picker |

## Install on Zen / Firefox (required)

**Unload the old Lumno first** (`about:addons` → Remove), then load 0.9.58.

### Temporary (easiest, unsigned)

1. Download `lumno-firefox-v0.9.58.zip` from Releases, or run `npm run package:firefox`.
2. Unzip.
3. Open `about:debugging#/runtime/this-firefox`
4. **Load Temporary Add-on…** → unzipped `manifest.json`
5. **Grant site access** (this is the step that was missing):
   - Click the Lumno toolbar icon once, or
   - Open the “允许访问网站” page if it appears and press the button, or
   - `about:addons` → Lumno → **权限** → enable **访问您在所有网站的数据**
6. Open a normal `https://` page, **refresh once**, press `Alt+K` / `Alt+Q`.

Temporary add-ons are removed when the browser restarts.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → `xpinstall.signatures.required` = `false`
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip
3. Confirm host access in the install prompt or the Permissions tab

## If shortcuts still do nothing

1. `about:addons` → Lumno → Permissions → “Access your data for all websites” must be **on**
2. Do not test on `about:` pages
3. Click the toolbar icon — that is the same command as Alt+K
4. `about:addons` → gear → **Manage Extension Shortcuts**

## What works vs still Chromium-only

Works: command bar and tab switcher on http(s) after host access is granted, toolbar button, new tab override, bookmarks/history/top sites, settings.

Limited: Chrome `_favicon`, Document PiP, `tabGroups` on Firefox < 137.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
npm test
npm run package:firefox
```
