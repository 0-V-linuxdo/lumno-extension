# Selection Toolbar v13 Design QA

## Comparison Target

- Source visual truth: `/var/folders/gg/xnc31wr97vz9fwdhwlc17jvc0000gn/T/codex-clipboard-a7edde3f-fe4d-4390-86f2-8344baaa9f5a.png`
- Source pixels: 858 x 294.
- Browser viewport: 1200 x 620 CSS px, device scale factor 1.
- Light neutral implementation: `/Users/kevinrzxu/.codex/visualizations/2026/08/04/019fca91-ef32-71d0-b12f-5be82340a7db/selection-toolbar-v13-light.png` (325 x 98 px focused clip).
- Light hover implementation: `/Users/kevinrzxu/.codex/visualizations/2026/08/04/019fca91-ef32-71d0-b12f-5be82340a7db/selection-toolbar-v13-hover.png` (325 x 98 px focused clip).
- Dark neutral implementation: `/Users/kevinrzxu/.codex/visualizations/2026/08/04/019fca91-ef32-71d0-b12f-5be82340a7db/selection-toolbar-v13-dark.png` (325 x 98 px focused clip).
- Animation start: `/Users/kevinrzxu/.codex/visualizations/2026/08/04/019fca91-ef32-71d0-b12f-5be82340a7db/selection-toolbar-v13-animation-start.png` (420 x 130 px focused clip).
- Animation end: `/Users/kevinrzxu/.codex/visualizations/2026/08/04/019fca91-ef32-71d0-b12f-5be82340a7db/selection-toolbar-v13-animation-end.png` (420 x 130 px focused clip).
- Combined comparison: `/Users/kevinrzxu/.codex/visualizations/2026/08/04/019fca91-ef32-71d0-b12f-5be82340a7db/selection-toolbar-v13-comparison.png` (1185 x 971 px).

The focused implementation clips were captured at 1 CSS px to 1 image px. The source screenshot has an unknown page viewport, so page chrome was excluded from fidelity judgment; the Toolbar region, interaction state, density and approved component measurements were compared directly.

## States And Measurements

- Runtime: `selection-toolbar-v13`, version `13`.
- Expanded surface: 264.57 x 38 CSS px in the preview content, with 13 px radius and 3 px padding.
- Actions: three neutral buttons in `translate, ask, search` order for the selected foreign term.
- Action geometry: 32 px height, 8 px horizontal padding, 9 px radius, 5 px icon-label gap, 12 px/500 labels and 16 px Remix icons.
- Dividers: 1 x 18 px.
- Light material: `rgba(244, 245, 247, 0.94)` with 0.34 edge inset and 0.55 / 10 px broad inset glow.
- Dark material: `rgba(26, 27, 31, 0.96)` with 0.04 edge inset and 0.10 / 10 px broad inset glow.
- Motion: Web Animations path detected in Chrome. The start/end visual capture used a 0.1x QA-only playback wrapper so the compressed FLIP state could be photographed; production options remain 180 ms with `cubic-bezier(0.22, 1, 0.36, 1)`.

## Full-view Comparison Evidence

- The source and all implementation states were opened together in one comparison input. The combined sheet confirms the intended hierarchy: selected text remains primary, the compact Toolbar stays secondary, and the surface does not reflow page content.
- The implementation is intentionally smaller than the source reference because the approved revision reduces the Toolbar to 38 px total height. Its three-part structure, separators, rounded gray material and hover tile remain faithful to the reference direction.
- Light and dark surfaces remain readable against their page backgrounds without clipping, inversion artifacts or a highlighted first action.

## Focused Region Comparison Evidence

- The source's Ask hover state was compared directly with `selection-toolbar-v13-hover.png`. The implementation preserves the single neutral hover tile and avoids nested borders or a competing focus highlight.
- The neutral light and dark captures show all action backgrounds as transparent while focus remains on the Toolbar container.
- The animation start/end captures show one coordinated surface transforming from the compact entry bounds into the final Toolbar. No per-action stagger, bounce, width animation, height animation, filter animation or shadow animation is present.

## Findings

- No actionable P0, P1 or P2 issue remains.
- Fonts and typography: the approved 12 px/500 label scale is crisp and single-line. English preview labels come from the local harness fallback; product localization keys and action content are unchanged.
- Spacing and layout rhythm: measured 38 px height, 13 px radius, 3 px shell padding, 32 px actions, 5 px icon-label gaps and 18 px dividers match the approved compact spec.
- Colors and visual tokens: both themes use the requested broader, softer two-layer inner illumination. The light surface stays cool gray rather than pure white; the dark surface uses independently tuned charcoal and off-white foreground values.
- Image quality and asset fidelity: no new raster art was required for the Toolbar. The entry continues using the existing Lumno butterfly mark, and all three actions use the bundled Remix definitions as requested.
- Copy and content: exactly three existing actions remain, ordered by inferred intent first. No extra labels or disclosure controls were introduced.
- Icons: 16 px Remix icons share one optical scale. Ask AI uses the approved simple single-sparkle icon.
- Interaction and accessibility: the Toolbar has `role="toolbar"`, receives neutral container focus, preserves button hover/focus-visible feedback, cancels entrance motion on dismissal, and bypasses motion under `prefers-reduced-motion: reduce`.
- Selection behavior: selectable text in buttons, links, role-buttons, custom clickable nodes, contenteditable regions, inputs and textareas reaches intent evaluation. Password, payment and explicitly sensitive fields remain blocked before their values are read.
- Responsiveness: the existing viewport collision logic remains active; the focused browser capture showed no clipping or overlap.
- Console: the preview's `qaError` remained empty. Chrome logged no Lumno preview errors; observed warnings belonged to an unrelated AutoConsent extension.

## Patches Made Since The Previous QA Pass

- Replaced the 48 px v12 Toolbar with the approved 38 px v13 geometry.
- Replaced the crisp single inset highlight with a faint edge plus a broader 10 px blurred inner glow.
- Added interruptible 180 ms FLIP motion using transform and opacity, plus a matching CSS fallback when Web Animations is unavailable.
- Added immutable pointer-up selection snapshots so clickable elements may collapse the live selection without losing the Lumno candidate.
- Added text-control acquisition through `selectionStart` / `selectionEnd` while preserving password, payment and explicit-sensitive exclusions.
- Kept the opening focus neutral and retained exactly three Remix actions in intent-derived order.

## Verification

- `npm test`: passed; all 114 legacy test files and all 45 React test files / 229 React tests passed.
- Focused selection tests: classifier, DOM behavior and integration contracts passed.
- Browser QA: light, dark, hover, animation start and animation end states captured at runtime v13.
- Production motion timing: automated assertions require 180 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, opacity 0.76 to 1 and transform/opacity-only keyframes.

## Open Questions

- None for this scoped revision.

## Follow-up Polish

- No remaining P3 item is required for handoff.

final result: passed
