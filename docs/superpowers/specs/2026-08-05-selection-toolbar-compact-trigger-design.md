# Compact Selection Toolbar And Broader Selection Eligibility

## Context

Lumno's selection entry already decides whether a text selection is useful before showing the butterfly mark. The expanded Toolbar is visually too large relative to selected page text, its current inner highlight is too crisp and narrow, and the Toolbar appears without a transition from the butterfly entry. Selection acquisition also relies too heavily on the live DOM Selection, so selectable text inside clickable controls can disappear before evaluation, while text controls are currently suppressed as editable.

## Goals

- Reduce the expanded Toolbar's visual footprint without changing its three actions or intent-derived ordering.
- Make the material's inner glow broader and softer in light and dark themes.
- Animate the butterfly-to-Toolbar transition with purposeful, interruptible motion.
- Let every genuine, non-sensitive text selection participate in the existing intent classifier, regardless of whether its DOM node is clickable or editable.
- Preserve the existing low-intent suppression: eligibility for evaluation does not guarantee that the mark appears.

## Non-goals

- Do not add actions, change labels, change the Remix icon set, or change intent ranking.
- Do not show the mark for collapsed selections, programmatic empty selections, generic UI boilerplate, or low-confidence text.
- Do not intercept or cancel the page's own click behavior.
- Do not read password, payment, or explicitly sensitive content.

## Toolbar Geometry

The compact Toolbar uses these target dimensions:

- Surface height: 38 px total.
- Surface padding: 3 px.
- Surface radius: 13 px.
- Action height: 32 px.
- Action horizontal padding: 8 px.
- Action radius: 9 px.
- Icon: 16 x 16 px.
- Label: 12 px, weight 500, line-height 1.2.
- Icon-label gap: 5 px.
- Divider: 1 x 18 px.

The surface remains content-sized and keeps the current viewport collision logic. The three actions remain ordered as inferred intent first, then the existing fallback order, with no action pre-highlighted when the Toolbar opens.

## Material And Inner Glow

Keep the current cool-gray translucent light surface and independently tuned elevated charcoal dark surface. Replace the single crisp inset highlight with two layers:

- Edge definition: `inset 0 1px 0`, with 0.34 white opacity in light mode and 0.04 in dark mode.
- Broad glow: `inset 0 2px 10px`, with 0.55 white opacity in light mode and 0.10 in dark mode.

The broad layer creates the requested larger, blurrier inner illumination. The edge layer stays deliberately faint so the border remains readable without looking embossed. Existing theme-aware outer elevation remains unchanged.

## Toolbar Motion

Opening uses a FLIP-style transform from the butterfly entry bounds to the final Toolbar bounds:

1. Measure the compact entry before replacing its contents.
2. Render and position the Toolbar at its final collision-safe location.
3. Animate translation and scale from the entry bounds to the final bounds, while opacity moves from 0.76 to 1.

Motion parameters:

- Duration: 180 ms.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Properties: transform and opacity only.
- Transform origin: the entry-side edge nearest the selected text.
- Exit: retain the existing short dismissal, capped at 120–160 ms.
- Interruption: a new selection, Escape, copy, scroll, or dismissal cancels the running animation.
- Reduced motion: skip FLIP and opacity interpolation under `prefers-reduced-motion: reduce`.

Toolbar actions animate as one surface; there is no per-item stagger or bounce.

## Unified Selection Acquisition

Selection source must not be inferred from clickability. A `button`, link, `[role="button"]`, custom clickable element, or any other DOM node is eligible whenever the browser exposes genuine selected text.

### DOM Range selections

Use the existing Range path for ordinary text nodes, clickable elements, code, and `contenteditable`. The common ancestor's tag or role does not exclude the candidate. Preserve the final usable client rect as the preferred inline anchor.

### Text controls

For text-capable `input` and `textarea` elements, read `selectionStart` and `selectionEnd` from the active control. A non-empty interval becomes a candidate even though `window.getSelection()` is empty. Use the pointer-up endpoint as the preferred anchor; for keyboard-created selections, fall back to the control's bounding rect.

Inputs that do not expose a textual selection interval, including checkbox, radio, button, range, color, file, and submit controls, produce no text-control candidate. A native `select` value is not treated as a text selection unless the browser exposes an actual DOM Range selection in its rendered content.

### Snapshot lifetime

Capture the candidate synchronously when the selection gesture completes, before the page's subsequent click handler can collapse the live selection. The immutable snapshot contains normalized text, source kind, sensitivity result, and anchor rect.

The snapshot remains valid until the first of:

- a new pointer-down or selection gesture;
- a new non-empty selection replacing it;
- copy, scroll, Escape, window blur, or navigation;
- the existing dismissal timeout.

An empty selection produced immediately by the selected clickable element's own click does not invalidate the captured candidate. Lumno does not prevent that click; navigation naturally unloads the content runtime, while same-page actions leave the snapshot available for classification and Toolbar actions.

## Safety And Intent Evaluation

Only sensitivity is a hard DOM-level exclusion:

- `input[type="password"]`;
- current/new password autocomplete fields;
- payment autocomplete fields such as `cc-*`;
- `[data-sensitive="true"]` and existing equivalent sensitive markers.

Ordinary `input`, `textarea`, and `contenteditable` selections are no longer suppressed merely because they are editable. Every eligible snapshot then passes through the unchanged intent classifier. URLs, email addresses, generic UI phrases, low-value statements, and low-confidence terms therefore remain quiet according to current classifier policy.

## State And Focus

- The butterfly entry remains the only pre-Toolbar affordance.
- Opening the Toolbar keeps focus on the neutral Toolbar container, so the inferred first action is not highlighted.
- Pointer hover and button `focus-visible` continue to provide action-level feedback.
- A new selection or dismissal removes the Toolbar and cancels motion before another candidate is rendered.

## Testing And QA

Automated regression coverage must include:

- 38 px surface geometry and all compact action tokens.
- Broader two-layer light and dark inset glow.
- 180 ms transform/opacity entrance and reduced-motion bypass.
- Selectable text in `button`, link, `[role="button"]`, and custom clickable nodes reaches intent evaluation.
- `contenteditable`, ordinary `input`, and `textarea` selections reach intent evaluation.
- Password, payment, and explicitly sensitive selections remain suppressed.
- A pointer-up snapshot survives an immediate click-driven collapse of the live selection.
- A new selection supersedes the snapshot and stale actions cannot run.
- Generic low-intent UI copy still does not show the mark.
- The Toolbar opens with three neutral actions and keeps the current intent-derived ordering.

Browser QA must compare the supplied reference with light and dark compact Toolbar captures, verify the measured 38 px height, inspect the expanded inner glow, and record the start and end states of the entrance animation. The final `design-qa.md` result must be `passed` before handoff.

## Rollout Diagnostics

Bump the selection runtime revision so a reloaded development extension can be distinguished from the current `selection-toolbar-v12` runtime. The implementation should use the next revision consistently in source and tests.
