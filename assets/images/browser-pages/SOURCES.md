# Built-in browser-page icons

These SVGs are Gecko-only stand-ins for Chrome's `_favicon` / `chrome://favicon2`
APIs, which Firefox does not expose to extensions (see Mozilla Bug 1315616).
Chromium builds still use those APIs and do not read this directory at runtime.

Marks follow Remix Icon (Apache-2.0), already vendored at `assets/remixicon/`.
Fill uses `currentColor` plus `prefers-color-scheme` so the icons stay visible
on both light and dark new-tab cards when loaded as `<img>`.
