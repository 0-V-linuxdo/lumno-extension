# Compact Selection Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 38 px animated selection Toolbar with a broader blurred inner glow and let every genuine non-sensitive text selection reach the existing intent classifier, including clickable and editable DOM.

**Architecture:** Keep the injected runtime in `src/content/selection-quick-actions.js`, but separate selection acquisition into DOM Range and text-control snapshot helpers. Candidates become immutable pointer-up/keyboard snapshots so a clickable element may collapse the live selection without invalidating the pending Toolbar; new gestures still supersede stale snapshots. Toolbar motion uses a transform/opacity FLIP animation and preserves the existing intent ordering, neutral opening focus, theme behavior, and reduced-motion policy.

**Tech Stack:** Chrome MV3 content script, vanilla DOM/Selection APIs, CSS `light-dark()`, Web Animations API, Node `assert` + JSDOM regression scripts, in-app browser visual QA.

---

## File Map

- Modify `src/shared/selection-intent.js`: stop treating ordinary editable context as a hard suppression signal; keep sensitive, URL, email, length, and low-intent policy unchanged.
- Modify `src/content/selection-quick-actions.js`: unified selection snapshots, candidate lifetime, compact visual tokens, dual inset glow, FLIP entrance, reduced-motion and cancellation.
- Modify `scripts/test-selection-intent.js`: classifier contract for editable versus sensitive text.
- Modify `scripts/test-selection-quick-actions-dom.js`: real DOM behavior for clickable/contenteditable/text-control selections, stale candidate replacement, compact geometry, glow, animation and neutral focus.
- Modify `scripts/test-selection-quick-actions-integration.js`: static integration contracts for runtime revision, snapshot helpers, sensitive exclusions, compact tokens and animation policy.
- Modify `design-qa.md`: final source/implementation comparison and `passed` result.

### Task 1: Let Editable Text Reach Intent Classification

**Files:**
- Modify: `scripts/test-selection-intent.js`
- Modify: `src/shared/selection-intent.js:214-290`

- [ ] **Step 1: Write the failing classifier test**

Replace the existing editable suppression assertion with explicit editable and sensitive contracts:

```js
{
  const result = classify('selected text', { editable: true, uiLanguage: 'en' });
  assert.strictEqual(result.suppressed, false);
  assert.strictEqual(result.triggerable, true);
}

assert.strictEqual(
  classify('secret token', { sensitive: true, uiLanguage: 'en' }).suppressed,
  true
);
```

- [ ] **Step 2: Run the classifier test and verify RED**

Run:

```bash
node scripts/test-selection-intent.js
```

Expected: FAIL because `settings.editable === true` still contributes to `suppressed`.

- [ ] **Step 3: Remove editable-only suppression**

Change the suppression expression to:

```js
const suppressed = !text ||
  length < MIN_SELECTION_LENGTH ||
  length > MAX_SELECTION_LENGTH ||
  urlLike ||
  emailLike ||
  settings.sensitive === true;
```

Do not change `genericUiLike`, scoring, confidence, or `triggerable` logic.

- [ ] **Step 4: Run the classifier test and verify GREEN**

Run:

```bash
node scripts/test-selection-intent.js
```

Expected: `selection intent tests passed`.

### Task 2: Capture Unified Selection Snapshots

**Files:**
- Modify: `scripts/test-selection-quick-actions-dom.js`
- Modify: `scripts/test-selection-quick-actions-integration.js`
- Modify: `src/content/selection-quick-actions.js:300-425,879-1045`

- [ ] **Step 1: Add failing DOM fixtures and behavior assertions**

Add fixtures for a selectable button, link, role-button, contenteditable, text input, textarea, password input and payment field. For each eligible fixture, create a deliberate selection and assert that the same Lumno mark appears after intent evaluation. Use meaningful text such as `React components` or `Why is this unavailable?` so the existing classifier is triggerable.

For a button fixture, add a click listener that immediately calls `window.getSelection().removeAllRanges()` after pointer-up. Assert that the captured candidate still renders. For password/payment fixtures, assert that the host remains hidden.

Add a replacement assertion: after one captured candidate exists, make a new non-empty selection and assert that the Toolbar actions use the new candidate's inferred order rather than the stale one.

- [ ] **Step 2: Add failing integration contracts**

Require the following source-level contracts:

```js
assert(contentSource.includes("sourceKind: 'text-control'"));
assert(contentSource.includes('element.selectionStart'));
assert(contentSource.includes('element.selectionEnd'));
assert(contentSource.includes('function buildCandidateFromSnapshot(snapshot)'));
assert(contentSource.includes('function getUnifiedSelectionSnapshot'));
assert(!/suppressed[\s\S]*settings\.editable\s*===\s*true/.test(intentSource));
assert(contentSource.includes("input[type=\"password\"]"));
assert(contentSource.includes('[autocomplete^="cc-"]'));
```

Read `src/shared/selection-intent.js` into `intentSource` at the top of the integration test.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node scripts/test-selection-quick-actions-dom.js
node scripts/test-selection-quick-actions-integration.js
```

Expected: both fail because text controls are absent and pointer-up evaluation still rereads the live Selection asynchronously.

- [ ] **Step 4: Implement text-control snapshots**

Add helpers with these contracts:

```js
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email']);

function isTextControl(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
  if (element.tagName === 'TEXTAREA') return true;
  return element.tagName === 'INPUT' && TEXT_INPUT_TYPES.has(
    String(element.type || 'text').toLowerCase()
  );
}

function getTextControlSelectionSnapshot(element, point) {
  if (!isTextControl(element)) return null;
  const start = Number(element.selectionStart);
  const end = Number(element.selectionEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null;
  const text = INTENT.normalizeText(String(element.value || '').slice(start, end));
  if (!text) return null;
  const bounds = element.getBoundingClientRect();
  const x = point && Number.isFinite(point.clientX)
    ? Math.min(bounds.right, Math.max(bounds.left, point.clientX))
    : bounds.right;
  return {
    sourceKind: 'text-control',
    element,
    text,
    rect: {
      bottom: bounds.bottom,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      inline: {
        bottom: bounds.bottom,
        height: bounds.height,
        left: x,
        right: x,
        top: bounds.top
      }
    }
  };
}
```

Password and payment fields are intentionally omitted from `TEXT_INPUT_TYPES`; `isSensitiveElement` remains the final safety check.

- [ ] **Step 5: Implement DOM and unified snapshots**

Create a DOM snapshot from the current Range and unify both sources:

```js
function getDomSelectionSnapshot() {
  if (!window.getSelection) return null;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount <= 0) return null;
  const range = selection.getRangeAt(0);
  const element = getRangeElement(range);
  const rect = getRangeRect(range);
  const text = INTENT.normalizeText(selection.toString());
  if (!element || !rect || !text) return null;
  return { sourceKind: 'dom', element, text, rect };
}

function getUnifiedSelectionSnapshot(target, point) {
  const targetElement = target && target.nodeType === Node.ELEMENT_NODE
    ? target
    : (target && target.parentElement ? target.parentElement : null);
  const control = targetElement && targetElement.closest
    ? targetElement.closest('input, textarea')
    : null;
  return getTextControlSelectionSnapshot(control || document.activeElement, point) ||
    getDomSelectionSnapshot();
}
```

Retain the existing positional Range helpers. Replace the old node/offset-only snapshot use with `{ sourceKind, element, text, rect }` plus source-specific start/end or anchor/focus identity fields needed by `isSameSelection`.

- [ ] **Step 6: Build and schedule candidates from immutable snapshots**

Replace `buildCandidate(selection)` with:

```js
function buildCandidateFromSnapshot(snapshot) {
  if (!snapshot || !snapshot.element || !snapshot.rect || !snapshot.text) return null;
  if (host && (snapshot.element === host || host.contains(snapshot.element))) return null;
  const classification = INTENT.classifySelection(snapshot.text, {
    editable: isEditableElement(snapshot.element),
    insideCode: isInsideCode(snapshot.element),
    pageLanguage: document.documentElement && document.documentElement.lang,
    sensitive: isSensitiveElement(snapshot.element),
    uiLanguage: getCurrentLocale()
  });
  if (classification.suppressed || classification.triggerable !== true) return null;
  return { classification, rect: snapshot.rect, sourceKind: snapshot.sourceKind };
}
```

Change `evaluateSelection(snapshot)` so pointer-up passes the already captured snapshot. Set `currentCandidate` immediately before the page click may clear selection. A candidate remains current when the live selection is empty; a new non-empty selection with different text hides it. Every new pointer-down, copy, scroll, Escape or window blur still calls the existing cancellation path.

Do not call `preventDefault()` or stop the page's click event.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
node scripts/test-selection-intent.js
node scripts/test-selection-quick-actions-dom.js
node scripts/test-selection-quick-actions-integration.js
```

Expected: all three scripts pass.

### Task 3: Compact Toolbar Geometry And Broader Glow

**Files:**
- Modify: `scripts/test-selection-quick-actions-dom.js`
- Modify: `scripts/test-selection-quick-actions-integration.js`
- Modify: `src/content/selection-quick-actions.js:460-605`

- [ ] **Step 1: Write failing compact-token assertions**

Replace the v12 geometry assertions with exact v13 targets:

```js
assert(/padding:\s*3px[\s\S]*?border-radius:\s*13px/.test(selectionStyles));
assert(/padding:\s*0 8px[\s\S]*?min-height:\s*32px[\s\S]*?border-radius:\s*9px[\s\S]*?gap:\s*5px[\s\S]*?font:\s*500 12px/.test(selectionStyles));
assert(/\.lumno-selection-action-icon\s*\{[\s\S]*?width:\s*16px[\s\S]*?height:\s*16px/.test(selectionStyles));
assert(/button \+ button::before[\s\S]*?height:\s*18px/.test(selectionStyles));
assert(/inset 0 1px 0 light-dark\(rgba\(255, 255, 255, 0\.34\), rgba\(255, 255, 255, 0\.04\)\)[\s\S]*?inset 0 2px 10px light-dark\(rgba\(255, 255, 255, 0\.55\), rgba\(255, 255, 255, 0\.1\)\)/.test(selectionStyles));
```

Update runtime assertions to `selection-toolbar-v13` and version 13.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node scripts/test-selection-quick-actions-dom.js
node scripts/test-selection-quick-actions-integration.js
```

Expected: fail on the existing 48 px/38 px/18 px geometry and v12 runtime.

- [ ] **Step 3: Apply the compact CSS and glow**

Use these exact values in `.lumno-selection-surface`, `button`, divider and icon rules:

```css
.lumno-selection-surface {
  padding: 3px;
  border-radius: 13px;
  box-shadow:
    inset 0 1px 0 light-dark(rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.04)),
    inset 0 2px 10px light-dark(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.1)),
    0 8px 24px light-dark(rgba(15, 23, 42, 0.14), rgba(0, 0, 0, 0.38)),
    0 2px 6px light-dark(rgba(15, 23, 42, 0.08), rgba(0, 0, 0, 0.24));
}

button {
  padding: 0 8px;
  min-height: 32px;
  border-radius: 9px;
  gap: 5px;
  font: 500 12px/1.2 "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Set action icons to 16 px, divider height to 18 px, and runtime revision/version to v13/13. Do not change the 18 px butterfly entry or its expanded pointer target.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node scripts/test-selection-quick-actions-dom.js
node scripts/test-selection-quick-actions-integration.js
```

Expected: both scripts pass.

### Task 4: Animate Butterfly-To-Toolbar Expansion

**Files:**
- Modify: `scripts/test-selection-quick-actions-dom.js`
- Modify: `scripts/test-selection-quick-actions-integration.js`
- Modify: `src/content/selection-quick-actions.js:40-70,130-165,650-825`

- [ ] **Step 1: Add failing animation assertions**

Stub `Element.prototype.animate` in the DOM test and record keyframes/options. After clicking the butterfly, assert:

```js
assert.strictEqual(toolbarAnimations.length, 1);
assert.strictEqual(toolbarAnimations[0].options.duration, 180);
assert.strictEqual(toolbarAnimations[0].options.easing, 'cubic-bezier(0.22, 1, 0.36, 1)');
assert.deepStrictEqual(
  toolbarAnimations[0].keyframes.map((frame) => frame.opacity),
  [0.76, 1]
);
assert.match(toolbarAnimations[0].keyframes[0].transform, /translate\(.+px, .+px\) scale\(.+, .+\)/);
```

Add an integration assertion for `prefers-reduced-motion: reduce`, `surface.animate`, transform/opacity-only keyframes, duration 180 and cancellation from `hideSurface`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node scripts/test-selection-quick-actions-dom.js
node scripts/test-selection-quick-actions-integration.js
```

Expected: fail because Toolbar opening currently swaps content without a dedicated animation.

- [ ] **Step 3: Implement cancellable FLIP animation**

Add `toolbarEntranceAnimation`, `prefersReducedMotion()`, `cancelToolbarEntranceAnimation()` and:

```js
function animateToolbarEntrance(originRect) {
  if (!surface || !originRect || typeof surface.animate !== 'function' || prefersReducedMotion()) return;
  window.requestAnimationFrame(() => {
    if (!surface || !menu || menu.hidden || !host || host.hidden) return;
    const destinationRect = surface.getBoundingClientRect();
    if (destinationRect.width <= 0 || destinationRect.height <= 0) return;
    const originX = originRect.left + originRect.width / 2;
    const originY = originRect.top + originRect.height / 2;
    const destinationX = destinationRect.left + destinationRect.width / 2;
    const destinationY = destinationRect.top + destinationRect.height / 2;
    const scaleX = Math.max(0.12, Math.min(1, originRect.width / destinationRect.width));
    const scaleY = Math.max(0.12, Math.min(1, originRect.height / destinationRect.height));
    const transformOrigin = originX <= destinationX ? 'left center' : 'right center';
    cancelToolbarEntranceAnimation();
    toolbarEntranceAnimation = surface.animate([
      {
        opacity: 0.76,
        transform: `translate(${originX - destinationX}px, ${originY - destinationY}px) scale(${scaleX}, ${scaleY})`,
        transformOrigin
      },
      { opacity: 1, transform: 'translate(0px, 0px) scale(1, 1)', transformOrigin }
    ], {
      duration: 180,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    });
  });
}
```

In `renderMenu`, measure `const originRect = surface.getBoundingClientRect()` before changing `data-icon-only`, render and position the Toolbar, then call `animateToolbarEntrance(originRect)`. Call `cancelToolbarEntranceAnimation()` from `hideSurface`, `clearOwnedSurface`, and before rendering a new candidate.

Do not animate width, height, left, top, filter, or box-shadow.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node scripts/test-selection-quick-actions-dom.js
node scripts/test-selection-quick-actions-integration.js
```

Expected: both scripts pass and reduced-motion tests record no entrance animation.

### Task 5: Full Regression And Visual QA

**Files:**
- Modify: `design-qa.md`

- [ ] **Step 1: Run all automated checks**

Run:

```bash
npm test
git diff --check
```

Expected: 114 legacy test files pass, 45 React test files / 229 tests pass, and `git diff --check` exits 0.

- [ ] **Step 2: Capture browser evidence**

Use the existing local preview harness at:

```text
http://127.0.0.1:8766/.tmp/selection-entry-inner.html
```

Capture these focused artifacts in light and dark mode:

```text
selection-toolbar-v13-light.png
selection-toolbar-v13-dark.png
selection-toolbar-v13-hover.png
selection-toolbar-v13-animation-start.png
selection-toolbar-v13-animation-end.png
```

Inspect computed values and require: runtime v13, 38 px surface height, 13 px radius, 16 px icons, neutral opening buttons, two inset glow layers, and no console errors.

- [ ] **Step 3: Compare the source and implementation together**

Open the user's reference screenshot plus the new light, dark and animation captures in the same comparison input. Treat any oversized geometry, crisp/narrow glow, clipped motion, first-action highlight, or dark-theme inversion as P2 and fix before handoff.

- [ ] **Step 4: Update the QA record**

Update `design-qa.md` with exact source path, implementation paths, viewport, states, focused comparison evidence, measured values, patches, and test results. End with exactly:

```text
final result: passed
```

- [ ] **Step 5: Commit the scoped implementation**

Stage only the selection implementation, its tests, plan/spec documentation and QA record:

```bash
git add src/content/selection-quick-actions.js src/shared/selection-intent.js scripts/test-selection-intent.js scripts/test-selection-quick-actions-dom.js scripts/test-selection-quick-actions-integration.js docs/superpowers/plans/2026-08-05-compact-selection-toolbar.md design-qa.md
git commit -m "feat: compact and broaden selection toolbar"
```

Verify the commit does not include unrelated New Tab, overlay, locale, settings, or background files.
