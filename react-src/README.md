# React migration

Lumno is migrating incrementally with React islands. Existing extension runtimes
remain in control of browser APIs, persistence, and cross-page coordination while
React replaces bounded UI surfaces behind their current public contracts.

## Guardrails

- Keep Manifest V3 scripts local; do not use a CDN, `eval`, or runtime compilation.
- Preserve the current global controller contract while an island is being proven.
- Load the legacy implementation first and let the compiled React island replace it.
- Keep background and content-script runtimes framework-free unless they gain a real UI.
- Reuse existing CSS classes and localization keys during behavior-preserving stages.
- Require TypeScript, component tests, legacy contract tests, and store-package checks.
- Give every entry a measured bundle budget before adding another dependency.

## Delivery stages

1. **Foundation and pilot — active**
   - Vite, TypeScript, Vitest, React, and React DOM.
   - `ShortcutDialog` as the first island, with its legacy implementation retained as
     an immediate fallback.
   - Recent Sites as the second island, sharing the same React runtime bundle and
     retaining the legacy `buildCard` compatibility path.
   - Bookmarks as the third island, preserving the card metadata used by drag,
     cascade-menu, theme, and localization runtimes while retaining the legacy
     `buildCard` and cache-cleanup compatibility paths.
   - Suggestions as the fourth island, preserving synchronous keyboard-selection,
     action-label, favicon, theme, tooltip, and history-delete contracts.
   - Shortcuts Grid as the fifth island, preserving dock hover, pointer reordering,
     favicon, custom-icon, tooltip, context-menu, and adaptive-tone metadata.
   - Toast as the sixth island, preserving synchronous message updates, error
     styling, auto-hide timers, and the existing controller contract.
   - Feedback Control as the seventh New Tab island. React owns its trigger,
     channel menu, WeChat detail, QR refresh state, focus restoration, and
     outside/Escape dismissal while the adapter keeps remote-link loading,
     navigation disposition, localization, and shared tooltip placement.
   - Select Menu as the shared React controller for bookmark/recent display
     modes and shortcut/bookmark context menus. It preserves the legacy
     controller contract, portal geometry, keyboard behavior, action rows, and
     native `change` bridge while allowing the browser adapter to retain data
     mutations and card-specific actions.
   - Options Popconfirm as the first Options leaf island, preserving the existing
     trigger wrapper, outside-click close behavior, localization hooks, and
     destructive-action callbacks across static controls and dynamic settings
     lists.
   - Options Shortcut Reference as a read-only list island, preserving grouped
     command metadata, platform-specific key labels, localization refreshes, and
     the existing browser command adapter.
   - Options Theme Picker as a controlled visual island, preserving the existing
     preview gallery and click feedback while leaving storage, system-theme
     listeners, and document theme application in the browser adapter.
   - Options Segmented Control as the shared controlled leaf for search-result
     priority, restricted-page behavior, recent-site ordering, New Tab width, and
     overlay size. React owns the buttons, indicator, labels, and accessibility
     state while the Options adapter keeps persistence and refresh side effects.
   - Options Settings Navigation as the controlled page-tab island, preserving
     hash routing, sticky layout, scroll resets, localized labels, and the sliding
     indicator while the adapter continues to own content visibility and data
     refreshes.
   - Options Blacklist Lists as controlled search-result and favicon-rule views,
     including row actions, inline editing, match-mode feedback, and confirmation
     states. URL normalization, persistence, and New Tab refresh notifications
     remain in the Options adapter.
   - Options Site Search Lists as three controlled custom, built-in search, and
     built-in AI provider views. React owns provider rows, inline editors, duplicate
     affordances, empty states, and confirmations while the adapter keeps provider
     normalization, persistence, localization mapping, and remote refreshes.
   - Options Settings Controls for the eleven persisted switch rows and the required
     search-result source checkbox group. React owns input state and interaction while
     the Options adapter keeps normalization, storage writes, and cross-page refreshes.
   - Options Select Controls for language, recent-site count, bookmark count, and
     bookmark columns. React owns menu state, keyboard-safe selection, and localized
     labels while legacy select references remain adapter-only event bridges.
   - Options Settings Forms for adding site-search providers and search/favicon
     blacklist rules. React owns expansion, drafts, query-token insertion, match-mode
     selection, validation feedback, and reset behavior; adapters persist validated data.
2. **Pilot hardening**
   - Exercise the unpacked extension in Chrome.
   - Add extension-level tests for shortcut add, edit, icon replacement, keyboard
     focus, localization refresh, and persistence failure.
   - Remove the fallback only after the React implementation has passed a release
     cycle.
3. **New Tab leaf views — hardening**
   - Shortcut Dialog, Shortcuts Grid, Recent Sites, Bookmarks, Suggestions, and Toast
     now share one local React runtime bundle while keeping their legacy
     implementations as fallbacks.
   - Keep data stores and browser adapters outside React and inject their results.
   - Avoid the recently changed wallpaper, theme, and layout paths until they settle.
4. **Full-page roots — active**
   - Onboarding copy, actions, interactions, cursor, navigation, and visual scenes
     now render through React controllers while the browser adapter remains outside.
   - Options starts with bounded Popconfirm and Toast leaves before extracting its
     storage and browser adapters.
   - Share typed UI primitives only after at least two islands need the same behavior.
5. **High-coupling surfaces**
   - Migrate New Tab orchestration and overlay search last.
   - Preserve hotkeys, IME handling, Picture-in-Picture ownership, and page-bridge
     boundaries with end-to-end tests before switching ownership to React.

Each stage has its own rollback point. A later stage should not start until the
current stage passes the default test, check, style audit, i18n audit, and store
package verification commands.
