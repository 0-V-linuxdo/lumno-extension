# Built-in browser-page icons

These SVGs are shown on Gecko when Chrome's `_favicon` / `chrome://favicon2` APIs
are missing, and when `tab.favIconUrl` is a privileged `chrome://mozapps/...`
path that moz-extension pages cannot load (Bug 1792254 / 1462948).

Artwork is Remix Icon (Apache 2.0), already vendored by Lumno, with opaque
`fill` colors instead of `currentColor` so they stay visible as `<img>` on
dark Tab Switcher cards. Light `#5f6368` / dark `#e8eaed` follow
`prefers-color-scheme`.

Do not reconstruct these URLs from `runtime.id`. Gecko's add-on id
(`lumno@…`) is not the `moz-extension://` hostname; always use
`runtime.getURL(path)` as-is.
