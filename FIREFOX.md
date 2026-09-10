# Lumno Firefox / Zen — 0.9.55-firefox-v1.2.0

This is a **clean rewrite** of the Gecko adapter on upstream **0.9.55**. Chrome source stays 0.9.55 Manifest V3. The installable Firefox zip is Manifest V2.

It is not a patch on the abandoned `v0.9.52-firefox`–`v0.9.59-firefox` MV3 tags. Temporary `about:debugging` installs do not grant MV3 `host_permissions`, so those builds stayed silent.

## What this version adds over 0.9.51-firefox-v1.8.0

Upstream 0.9.52–0.9.55, with the same Gecko layer:

- Search-first results, shortcut width, hide Feedback/Appearance
- Configurable New Tab shortcut layout (per row / size / gap)
- Aggregate search (`kg`-style triggers, 2–10 sources). Tab grouping is used when `tabs.group` exists (Firefox 138+ / Zen recent); otherwise the result tabs open ungrouped
- Glass Blur, Blocks, and CRT wallpaper effects
- Kagi (`kg` / `kagi`)
- Nightly 156 overlay search-field centering (`align-content: center` after `all: unset`)
- Restricted-page fallbacks from v1.7.0: Alt+K opens Lumno newtab; Alt+Q hops to a hostable https tab
- Built-in page icons (`about:addons`, `chrome://extensions`, …) as bundled `moz-extension://<install-uuid>/assets/images/browser-pages/*.svg`. Gecko has no `_favicon` / `chrome://favicon2`, and `tab.favIconUrl` `chrome://mozapps/…` cannot load in moz-extension pages. v1.1.0 reconstructed those URLs from `runtime.id` (`lumno@…`) which is **not** the UUID hostname; v1.2.0 uses `runtime.getURL('')` as-is.

## Restricted pages

Content scripts **cannot** inject into privileged pages (`about:debugging`, `about:addons`, reader view, view-source, PDF viewer, extension pages). Chrome still reacts by opening Lumno’s own new-tab page (`lumno-newtab.html?focus=1`) or hopping Tab Switcher onto another hostable tab.

1. Restricted-page Alt+K opens Lumno newtab with the command bar focused.
2. Restricted-page Alt+Q hops to a hostable `http(s)` tab when one exists; otherwise it opens Lumno newtab. Own `moz-extension://` pages are recognized via `runtime.getURL('')` and can host the switcher themselves.
3. Overlay still **cannot** draw on `about:` — the new tab / hop **is** the Chrome-like reaction.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including 0.9.51-firefox-v1.0.0–v1.8.0 and the 0.9.52–0.9.59 Firefox tags).

1. Download `lumno-0.9.55-firefox-v1.2.0.zip` and unzip it.
2. Open `about:debugging#/runtime/this-firefox`.
3. **Load Temporary Add-on…** → select the unzipped `manifest.json`.
4. Open a normal `https://` page (not `about:` and not the add-on page). **Refresh once** after loading the add-on.
5. Press **Alt+K** (command bar) or **Alt+Q** (tab switcher). Toolbar icon is the same as Alt+K.

On `about:addons` / `about:debugging`, Alt+K should open Lumno newtab; Alt+Q should switch to a normal https tab if you have one, otherwise Lumno newtab.

Temporary add-ons disappear when the browser restarts.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → `xpinstall.signatures.required` = `false`
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip

## Shortcuts

| Action | Firefox / Zen | Chromium 0.9.55 |
| --- | --- | --- |
| Open command bar | `Alt+K` | `Ctrl+Shift+K` |
| Prefill current URL | `Alt+L` | `Ctrl+Shift+L` |
| Copy current URL | `Alt+Shift+C` | `Ctrl+Shift+C` |
| Tab switcher | `Alt+Q` | `Alt+Q` |
| Toolbar icon | Command bar | Document PiP |

Zen does **not** bind Alt+K or Alt+Q by default (`Ctrl+K` is search, `Alt+Ctrl+Q` is workspace).

## If a shortcut still does nothing

1. Confirm the address bar is `https://…` for in-page overlay. Restricted pages open a new tab instead.
2. Refresh that tab once after loading the add-on.
3. Click the toolbar icon. If that opens the command bar, check **Manage Extension Shortcuts**.
4. Unload every older Lumno, then load only 0.9.55-firefox-v1.2.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-search-input-gecko-align.js
node scripts/test-package-firefox.js
```
