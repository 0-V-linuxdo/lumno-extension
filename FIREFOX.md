# Lumno Firefox / Zen port

This fork adds Gecko support so Lumno can run in **Firefox** and **Zen Browser**.

Upstream (`kubai087/lumno-extension`) is Chromium-only. Loading the Chrome zip with CRX Installer on Zen is why **Open command bar** and **Tab switcher** shortcuts did nothing:

1. Firefox/Zen already owns `Ctrl+Shift+K` (Web Console) and `Ctrl+Shift+C` (Inspector). Extension `commands` with those keys are registered but never fire.
2. A Chromium MV3 `background.service_worker` plus `importScripts(chrome.runtime.getURL(...))` often fails to boot on Gecko, so `chrome.commands.onCommand` never attaches.
3. There was no gecko id, so the add-on is not a real Firefox extension.

## Default shortcuts on Firefox / Zen

| Action | Firefox / Zen | Chromium (unchanged) |
| --- | --- | --- |
| Open command bar | `Alt+K` | `Ctrl+Shift+K` |
| Prefill current URL | `Alt+L` | `Ctrl+Shift+L` |
| Copy current URL | `Alt+Shift+C` | `Ctrl+Shift+C` |
| Tab switcher | `Alt+Q` | `Alt+Q` |

If a shortcut still collides with Zen’s own keyboard settings, remap it:

1. Open `about:addons`
2. Click the gear → **Manage Extension Shortcuts**
3. Assign Lumno commands to keys Zen does not use

On Zen you can also check **Settings → Keyboard Shortcuts** for conflicts.

## Install on Zen / Firefox (recommended)

Do **not** use the Chrome Web Store zip or CRX Installer for this build.

### Temporary (easiest, unsigned)

1. Download `lumno-firefox-v0.9.52.zip` from this repo’s Releases, or run `npm run package:firefox` and use `dist/lumno-firefox-v0.9.52.zip`.
2. Unzip the archive.
3. Open `about:debugging#/runtime/this-firefox`
4. **Load Temporary Add-on…**
5. Select the unzipped `manifest.json`

Temporary add-ons are removed when the browser restarts.

### Persistent unsigned (Zen / Firefox Developer / Nightly)

1. `about:config` → set `xpinstall.signatures.required` to `false` (Firefox Release may ignore this).
2. `about:addons` → gear → **Install Add-on From File…** → pick the zip.

Zen is more permissive than Firefox Release; if the zip still will not stay installed, use the temporary method or sign it on [addons.mozilla.org](https://addons.mozilla.org).

## What works vs still Chromium-only

Works (goal of this first port):

- Command bar overlay on http(s) pages
- Keyboard shortcuts (after gecko rebind / page fallback)
- Tab switcher
- New tab override
- Bookmarks / history / top sites / open tabs search
- Settings / onboarding

Limited or unavailable on Gecko:

- Chrome `_favicon` / `chrome://favicon2` pipeline (falls back to `tab.favIconUrl` and public favicon URLs)
- Document Picture-in-Picture web clip (Chromium API)
- Some `tabGroups` features on Firefox < 137
- `chrome.storage.sync` account sync behaves differently without Chrome identity

## Development

```bash
git clone https://github.com/0-V-linuxdo/lumno-extension.git
cd lumno-extension
git checkout firefox-port
npm run package:firefox
```

Load the unzipped `dist` package (or the repo root) via `about:debugging`.
