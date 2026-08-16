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
| `surface.profileAction` | Run the same allowlisted action and report synchronous cost, presentation frames, and new long-task/Event Timing/CLS entries. |
| `surface.performance` | Return startup, responsiveness, resource, DOM-size, environment, and available JS-heap metrics. |
| `surface.performanceRecording` | Start, stop, inspect, or clear a bounded frame and responsiveness recording. |
| `surface.performancePanel` | Open, close, toggle, or inspect the development-only New Tab recorder panel. |
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

## New Tab performance sampling

The performance collector is created only after the development bridge allowlist succeeds. A store build does not install its `PerformanceObserver` or `MutationObserver` instances.

Read a bounded cold-start and responsiveness snapshot after opening a fresh New Tab:

```js
const metrics = await chrome.runtime.sendMessage(LUMNO_DEVELOPMENT_ID, {
  channel: 'lumno.codex.debug',
  version: 1,
  requestId: crypto.randomUUID(),
  method: 'surface.performance',
  target: { surfaceId },
  params: { maxEntries: 20 }
});
```

The result includes the New Tab ready marker and startup storage batching diagnostics; navigation, paint, LCP, and Lumno user timing; long tasks, Event Timing, layout shift, and observer support; slow resources with query strings and hashes removed; visible bookmark/shortcut/suggestion counts; and `performance.memory` values when Chromium exposes them. Pass `maxEntries: 0` for aggregates only or `clear: true` to clear transient long-task, event, and layout-shift samples after reading them.

Profile a real allowlisted interaction through two presentation frames:

```js
const interaction = await chrome.runtime.sendMessage(LUMNO_DEVELOPMENT_ID, {
  channel: 'lumno.codex.debug',
  version: 1,
  requestId: crypto.randomUUID(),
  method: 'surface.profileAction',
  target: { surfaceId },
  params: {
    action: 'click',
    selector: '.x-nt-wallpaper-button',
    frames: 2,
    timeoutMs: 750
  }
});
```

For strong development machines, run `npm run profile:newtab-data` as a repeatable CPU/data pressure companion. It profiles a 50,002-node bookmark tree, 50,000 history entries plus 5,000 tabs, and 10,000 same-task startup storage reads, then reports local p95 plus 4× and 6× CPU projections. These projections cover JavaScript data work only; layout, paint, compositing, and GPU behavior must come from the live surface probe.

On a development New Tab, press `Ctrl/⌘ + Alt + Shift + P` to open the recorder panel. Choose Search, Shortcuts, Bookmarks, Wallpaper, or Mixed flow and start a bounded 10, 15, or 30-second recording. The panel may be closed while recording so it does not cover the target controls. Reopen it with the same shortcut to review, copy, or download the sanitized JSON report.

The recorder samples frame intervals only while active and stops automatically at the selected deadline. Its report includes frame p95/max and 20/32/50ms counts, estimated dropped frames against an explicit 60Hz reference budget, long-task/Event Timing/CLS deltas, startup readiness and storage batching, DOM-node change, and available JS-heap change. Event Timing keeps the raw observer entries for diagnosis but also groups entries with the same input start, duration, and interaction id into `eventBursts`, so one pointer transition is not counted once per `pointerout`/`leave`/`over`/`enter` entry. Burst summaries distinguish maximum input delay, JavaScript processing span, and presentation delay; recording maxima stay exact even when the bounded entry list discards older detail rows. Each retained event includes a sanitized element/context marker; it never includes text, input values, tooltip content, URL query strings, or hashes. The panel has no transition, animation, filter, blur, or persistent layer promotion of its own.

## Adapter notes

The Codex adapter should first call `surfaces.list`, select the surface for its active browser tab, then map its normal snapshot/query/action operations onto this protocol. Screenshot capture remains the Codex extension's responsibility; Lumno only supplies structured DOM and runtime evidence.

Run `npm run test:codex-debug` after changing the protocol, page wiring, development allowlist, or store packaging boundary.
