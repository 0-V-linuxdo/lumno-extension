# New Tab input auto-focus info Design QA

## Evidence

- Source visual truth: `/var/folders/gg/xnc31wr97vz9fwdhwlc17jvc0000gn/T/codex-clipboard-0baefaee-04d3-4ada-a8fa-4ffe65178f0d.png`
- Browser-rendered implementation: `/tmp/lumno-input-auto-focus-info-implementation.png`
- Combined comparison: `/tmp/lumno-input-auto-focus-info-comparison.png`
- Browser viewport: 1280 x 720 CSS px
- Source pixels: 868 x 388 at approximately 2x density; normalized to 434 x 194
- Implementation pixels: 434 x 194 at 1x screenshot density
- State: light theme, Appearance panel open, Global scope, info control at rest; Tooltip hover was verified separately

The source and implementation use different persisted values (720 px/on versus 640 px/off). Those state differences are outside this scoped spacing and info-affordance change. The source red outline is an annotation, not product UI.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested change.
- The input auto-focus row now adds 8 px above the existing 14 px control gap, producing 22 px of separation from the search-width slider.
- The title and existing 14 px Remix information icon share a 4 px inline gap and remain vertically centered with the switch.
- Hover and keyboard focus display the requested Chinese Tooltip copy. The rendered Tooltip stayed within the 1280 px viewport and no relevant console errors or warnings were observed.

## Required fidelity surfaces

- Fonts and typography: existing New Tab font family, 13 px title sizing, weight, and line height are preserved.
- Spacing and layout rhythm: only the requested 8 px top margin and 4 px title-to-info gap were added; the More settings spacing is unchanged.
- Colors and visual tokens: the existing info-button foreground, hover background, focus outline, and light/dark tokens are reused.
- Image quality and asset fidelity: no raster assets were added; the established Remix `ri-information-line` icon is used.
- Copy and content: Simplified Chinese matches the user-supplied sentence exactly; English, Japanese, and Traditional Chinese locale keys are present.

## Interaction and browser checks

- Appearance panel opened successfully in the local browser-rendered New Tab.
- Info control exposed the accessible label `输入框自动聚焦说明`.
- Fresh pointer hover showed: `如倾向使用浏览器原生地址栏，可关闭该选项。关闭后地址栏中的插件 url 将不再显示`.
- Keyboard focus used the same Tooltip path.
- The existing switch remained interactive and retained its persisted setting behavior.
- Browser console: no relevant errors or warnings.

## Comparison history

- First comparison: no P0/P1/P2 mismatches in the requested spacing or info affordance, so no visual correction loop was needed.

## Follow-up polish

- A narrow-viewport browser recapture was attempted after the desktop pass, but the local preview server became unavailable when the execution sandbox changed. Existing viewport clamping and shared Tooltip behavior remain covered by the component contract; this is a residual visual test gap, not an identified layout defect.

final result: passed
