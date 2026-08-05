# Selection Toolbar v14 Design QA

## Comparison target

- Source visual: `/var/folders/gg/xnc31wr97vz9fwdhwlc17jvc0000gn/T/codex-clipboard-db4cc33a-5d20-41ed-b250-615134a033a4.png`.
- Runtime preview: `http://127.0.0.1:8766/.tmp/selection-entry-inner.html`.
- Runtime identity: `selection-toolbar-v14`, version `14`.

The source image was used for the shell proportions, separator rhythm, neutral action backgrounds and soft gray material. The implementation retains the previously approved 38 px compact height while adding a dedicated leading Lumno control.

## Geometry and material

- Expanded surface: 38 px total height, 13 px radius and 3 px padding on all four sides.
- Smooth corners: `corner-shape: superellipse(1.25)` when supported, matching Overlay.
- Leading Lumno control: the same 18 x 18 px entry enlarges into a 30 x 30 px first Toolbar item.
- Actions: three neutral 30 px buttons with 8 px horizontal padding, 9 px radius, 5 px icon-label gap, 12 px/500 labels and 16 px Remix icons.
- Separators: 1 x 18 px. Every separator keeps 3 px clearance from both neighboring hover backgrounds.
- Light surface: `rgba(244, 245, 247, 0.94)`.
- Dark surface: `rgba(26, 27, 31, 0.96)`.
- Inner illumination: two broad static radial gradients replace a large animated blur layer. This increases diffusion without adding per-frame filter repaint work.

## Motion

- Shell growth: 230 ms, left-to-right `clip-path` reveal with `cubic-bezier(0.22, 1, 0.36, 1)`.
- Shared Lumno control: 220 ms transform from the compact entry bounds into the first 30 px slot.
- Labels: each label reveals from its own clipping mask over 280 ms with a 65 ms delay, so text finishes after the shell.
- CSS fallback preserves the same staged structure when Web Animations is unavailable.
- All active animations are interruptible and their temporary `will-change` hints are removed after 360 ms.
- `prefers-reduced-motion: reduce` bypasses the choreography.
- The old blur-to-sharp entry loading effect was removed; the entry now uses a short opacity and scale rise.

## Dynamic contrast

- The entry inspects the selected element's composited ancestor backgrounds once when it appears.
- Light, dark and mixed treatments are selected without `mix-blend-mode: difference` or continuous pixel sampling.
- Dark local surfaces receive a restrained translucent charcoal backing and softened light mark.
- The same resolved tone controls the expanded material, preventing a bright Toolbar flash on dark webpages.
- Complex image backgrounds fall back to a neutral dual-edge treatment.

## Interaction and accessibility

- The inferred action remains first among exactly three Remix actions.
- Opening focus stays on the neutral Toolbar container; no action is highlighted by default.
- The leading Lumno item has its own hover/focus treatment.
- Clicking the enlarged Lumno item sends `openOptionsPage` with `hash: 'labs'`; the background route now preserves that hash.
- Existing selection intent, clickable-element eligibility, text-control support and sensitive-field rejection remain unchanged.

## Browser QA

- Light page: 38 px surface, 3 px padding, 13 px radius, `superellipse(1.25)`, 30 x 30 px leading item and three expected labels rendered.
- Leading-item Hover: `rgba(15, 23, 42, 0.067)` background appeared without a nested border.
- Dark page entry: `entryContrast=dark`, 18 x 18 px entry, `rgba(19, 22, 28, 0.32)` backing.
- Dark expanded surface: `rgba(26, 27, 31, 0.96)` background, off-white foreground and dark color scheme.
- Direct entry click expanded the same DOM control from 18 x 18 px to 30 x 30 px.
- No relevant console errors or warnings were observed.

## Verification

- TDD RED: the v13 implementation failed the new geometry, routing, motion and contrast assertions.
- TDD GREEN: selection DOM and integration tests passed after implementation.
- `npm test`: build passed; all 114 legacy test files passed; all 45 React test files / 229 tests passed.
- `scripts/test-performance-stability.js` passed as part of the full suite.
- `git diff --check` passed.

## Open questions

- None for this scoped revision.

final result: passed
