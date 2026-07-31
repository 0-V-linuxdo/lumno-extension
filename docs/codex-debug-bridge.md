# Codex debug bridge

Lumno's unpacked development build exposes a versioned cross-extension debugging API so a future Codex browser-extension adapter can inspect and operate Lumno UI without navigating directly to a protected `chrome-extension://` URL.

The bridge covers:

- the canonical New Tab and its fallback redirect;
- Options and Onboarding;
- the search overlay, tab switcher, and document-PiP picker injected into ordinary pages.

It is development-only. The source manifest's fixed key keeps the unpacked Lumno ID stable as `kkcjcneagmlhpeaafngjdlpcfjakejgb`. Only the official stable and beta Codex browser-extension IDs are accepted. Store packaging removes both the Lumno development key and `externally_connectable`, and the runtime bridge refuses to start without them.

## Protocol

Send a one-time message from the Codex extension to the Lumno development extension:

```js
const LUMNO_DEVELOPMENT_ID = 'kkcjcneagmlhpeaafngjdlpcfjakejgb';

const response = await chrome.runtime.sendMessage(LUMNO_DEVELOPMENT_ID, {
  channel: 'lumno.codex.debug',
  version: 1,
  requestId: crypto.randomUUID(),
  method: 'surfaces.list'
});
```

Every response repeats `channel`, `version`, and `requestId`, then returns either `{ ok: true, result }` or `{ ok: false, error }`.

Available methods:

| Method | Purpose |
| --- | --- |
| `bridge.describe` | Return protocol capabilities and development status. |
| `surfaces.list` | List live surfaces with `surfaceId`, `type`, `tabId`, `frameId`, URL, title, and readiness. |
| `surface.snapshot` | Return sanitized, bounded markup/text plus page, viewport, and focus state. |
| `surface.query` | Query a CSS selector and return bounded element descriptors. |
| `surface.action` | Run an allowlisted DOM action. |
| `surface.waitFor` | Wait up to three seconds for `attached`, `detached`, or `visible`. |
| `surface.logs` | Read captured warnings, errors, and unhandled runtime failures. |

Surface methods accept a target such as `{ surfaceId }` or `{ tabId, frameId, type }`. If the target is missing or matches multiple surfaces, the bridge returns a structured `surface_not_found` or `surface_ambiguous` error.

```js
const snapshot = await chrome.runtime.sendMessage(LUMNO_DEVELOPMENT_ID, {
  channel: 'lumno.codex.debug',
  version: 1,
  requestId: crypto.randomUUID(),
  method: 'surface.snapshot',
  target: { tabId: activeTab.id, type: 'newtab' },
  params: { selector: 'body' }
});
```

The `surface.action` allowlist is `click`, `focus`, `scrollIntoView`, `fill`, `setChecked`, `selectOption`, and `key`. It intentionally does not expose arbitrary JavaScript evaluation.

```js
await chrome.runtime.sendMessage(LUMNO_DEVELOPMENT_ID, {
  channel: 'lumno.codex.debug',
  version: 1,
  requestId: crypto.randomUUID(),
  method: 'surface.action',
  target: { surfaceId },
  params: {
    action: 'fill',
    selector: '#_x_extension_search_input_2024_unique_',
    value: 'Lumno'
  }
});
```

## Adapter notes

The Codex adapter should first call `surfaces.list`, select the surface for its active browser tab, then map its normal snapshot/query/action operations onto this protocol. Screenshot capture remains the Codex extension's responsibility; Lumno only supplies structured DOM and runtime evidence.

Run `npm run test:codex-debug` after changing the protocol, page wiring, development allowlist, or store packaging boundary.
