# Lumno Firefox / Zen — 0.9.51-firefox-v1.8.0

This is a **clean rewrite** from upstream **0.9.51**. Chrome source stays 0.9.51. It is not a patch on 0.9.52–0.9.59.

## Why the command-bar search field jumped up in Nightly

v1.7.0 restored restricted-page fallbacks. On **Firefox Nightly 156** the overlay search placeholder and caret sat at the top of the 56px row; **Zen 1.21** (Firefox 154) stayed vertically centered. Switching UI language did not change it.

The overlay input is `all: unset` + `height: 56px` + **zero vertical padding**. Firefox 156 (Bug 2055599) moved UA centering to `align-content`, which `all: unset` removes (Bug 2064376). Zen 154 still centers inside the form control, so the same CSS looked fine.

v1.8.0 puts `align-content: center` back after `all: unset`. Zen is unchanged; Nightly matches Zen.

## Why v1.6.0 stayed silent on restricted pages

v1.6.0 made Alt+K / Alt+Q work on normal `https://` pages. On `about:` / privileged UI it stayed silent, unlike Chrome.

Content scripts **cannot** inject into privileged pages (`about:debugging`, `about:addons`, reader view, view-source, PDF viewer, extension pages). Chrome still reacts by opening Lumno’s own new-tab page (`lumno-newtab.html?focus=1`) or hopping Tab Switcher onto another hostable tab.

The Firefox port had turned that fallback into a **Gecko no-op** (to stop an earlier “flash to the add-on homepage”), and `isOwnExtensionPageUrl` compared the `moz-extension://` UUID host to the gecko id, so own pages were treated as foreign.

v1.7.0:

1. Restores `openNewtabFallback` / `openBrowserNewtabFallback` on Gecko. Restricted-page Alt+K opens Lumno newtab with the command bar focused.
2. Restricted-page Alt+Q hops to a hostable `http(s)` tab when one exists; otherwise it opens Lumno newtab. Own `moz-extension://` pages are recognized via `runtime.getURL('')` and can host the switcher themselves.
3. Overlay still **cannot** draw on `about:` — the new tab / hop **is** the Chrome-like reaction.

## Install on Zen / Firefox

Do **not** use the Chrome zip or CRX Installer. Unload any old Lumno first (including v1.0.0–v1.7.0).

1. Download `lumno-0.9.51-firefox-v1.8.0.zip` and unzip it.
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

| Action | Firefox / Zen | Chromium 0.9.51 |
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
4. Unload every older Lumno, then load only v1.8.0.

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
node scripts/test-gecko-runtime.js
node scripts/test-firefox-manifest.js
node scripts/test-package-firefox.js
```
