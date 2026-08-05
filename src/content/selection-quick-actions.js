(function() {
  'use strict';

  if (window._x_extension_selection_quick_actions_2026_unique_) {
    return;
  }
  window._x_extension_selection_quick_actions_2026_unique_ = true;

  const INTENT = globalThis.LumnoSelectionIntent || {};
  const ACTION_ICON_LIBRARY = globalThis.LumnoSelectionActionIcons || {};
  const BUTTERFLY = globalThis.LumnoSelectionButterfly || {};
  if (typeof INTENT.classifySelection !== 'function') {
    return;
  }

  const ENABLED_STORAGE_KEY = '_x_extension_selection_quick_actions_enabled_2026_unique_';
  const ICON_SET_STORAGE_KEY = '_x_extension_selection_quick_actions_icon_set_2026_unique_';
  const TRIGGER_STYLE_STORAGE_KEY = '_x_extension_selection_quick_actions_trigger_style_2026_unique_';
  const LANGUAGE_STORAGE_KEY = '_x_extension_language_2024_unique_';
  const HOST_ID = '_x_extension_selection_quick_actions_host_2026_unique_';
  const DEVELOPMENT_EXTENSION_ID = 'kkcjcneagmlhpeaafngjdlpcfjakejgb';
  const RUNTIME_REVISION = 'selection-butterfly-v6';
  const RUNTIME_VERSION = 6;
  const RUNTIME_ID = chrome && chrome.runtime && chrome.runtime.id
    ? String(chrome.runtime.id)
    : '';
  const RUNTIME_PRIORITY = RUNTIME_ID === DEVELOPMENT_EXTENSION_ID ? 2 : 1;
  const HIGH_DELAY_MS = 300;
  const MEDIUM_DELAY_MS = 380;
  const SELECTION_CHANGE_DELAY_MS = 80;
  const SELECTION_GESTURE_TIMEOUT_MS = 1600;
  const DOT_DISMISS_MS = 2200;
  const CHIP_DISMISS_MS = 3600;
  const providerStorageRuntime = globalThis.LumnoSettings &&
    typeof globalThis.LumnoSettings.createProviderStorageRuntime === 'function'
    ? globalThis.LumnoSettings.createProviderStorageRuntime(chrome)
    : null;
  const storageArea = providerStorageRuntime
    ? providerStorageRuntime.area
    : (chrome && chrome.storage && chrome.storage.sync
        ? chrome.storage.sync
        : (chrome && chrome.storage ? chrome.storage.local : null));
  const storageAreaName = providerStorageRuntime ? providerStorageRuntime.name : (storageArea && storageArea === (chrome && chrome.storage ? chrome.storage.sync : null)
    ? 'sync'
    : 'local');

  let enabled = false;
  let iconSet = 'remix';
  let triggerStyle = 'lumno';
  let triggerStyleSource = 'default';
  let languageMode = 'system';
  let localeMessages = null;
  let showTimer = null;
  let dismissTimer = null;
  let selectionChangeTimer = null;
  let gestureResetTimer = null;
  let requestSequence = 0;
  let pointerDownState = null;
  let selectionGestureActive = false;
  let currentCandidate = null;
  let host = null;
  let shadow = null;
  let surface = null;
  let mainButton = null;
  let selectionLogo = null;
  let selectionButterfly = null;
  let mainLabel = null;
  let moreButton = null;
  let menu = null;
  let status = null;
  let ownershipObserver = null;

  const ACTION_COPY = Object.freeze({
    ask: ['selection_quick_action_ask', 'Ask AI'],
    translate: ['selection_quick_action_translate', 'Translate'],
    explain: ['selection_quick_action_explain', 'Explain'],
    summarize: ['selection_quick_action_summarize', 'Summarize'],
    search: ['selection_quick_action_search', 'Research'],
    calculate: ['selection_quick_action_calculate', 'Convert']
  });
  const ACTION_ICONS = Object.freeze({
    ask: 'ri-sparkling-2-line',
    translate: 'ri-translate-2',
    explain: 'ri-lightbulb-line',
    summarize: 'ri-file-list-3-line',
    search: 'ri-search-line',
    calculate: 'ri-calculator-line'
  });
  const MORE_ICON = Object.freeze({
    viewBox: '0 0 24 24',
    body: '<path fill="currentColor" d="m7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6z"/>'
  });
  const FALLBACK_BUTTERFLY_REST_PATH = 'M4.3248 17.7823C1.22382 14.6398 -0.116749 10.2475 0.824858 6.7097C1.02033 5.97529 1.95363 5.98287 2.27212 6.67289L4.16024 10.7637C4.38415 11.2488 4.50011 11.7767 4.50011 12.311L4.50011 16L6.24277 16C7.66705 16 9.01155 16.6576 9.88596 17.7819L11.0831 19.3211C11.5044 19.8627 11.2076 20.6668 10.5235 20.7201C8.63849 20.8671 6.85452 20.3459 4.3248 17.7823Z';
  const FALLBACK_BUTTERFLY_FLUTTER_PATH = 'M4.32468 17.7823C-1.04106 11.6456 2.30784 4.56298 5.14393 1.13518C5.48929 0.717757 6.11849 0.734355 6.47527 1.14207L10.4328 5.66451C11.4105 6.78177 11.6239 8.37593 10.9745 9.71102L8.61264 14.567L11.5238 13.9636C13.2202 13.612 14.9706 14.24 16.0565 15.5899L18.7241 18.9056C19.0394 19.2975 18.9857 19.8717 18.5688 20.1531C15.6258 22.1399 9.6385 23.8596 4.32468 17.7823Z';
  const FALLBACK_BUTTERFLY = Object.freeze({
    back: Object.freeze({ begin: '120ms' }),
    dValues: `${FALLBACK_BUTTERFLY_FLUTTER_PATH};${FALLBACK_BUTTERFLY_REST_PATH};${FALLBACK_BUTTERFLY_FLUTTER_PATH}`,
    fill: '#79C3F2',
    front: Object.freeze({}),
    keySplines: '0.42 0 0.58 1;0.42 0 0.58 1',
    keyTimes: '0;0.5;1',
    restPath: FALLBACK_BUTTERFLY_REST_PATH,
    transformValues: '-1.5 5.5 15.5;0 5.5 15.5;-1.5 5.5 15.5',
    viewBox: '0 0 23 25',
    duration: '2800ms'
  });

  function normalizeIconSet(value) {
    if (globalThis.LumnoSettings &&
        typeof globalThis.LumnoSettings.normalizeSelectionQuickActionsIconSet === 'function') {
      return globalThis.LumnoSettings.normalizeSelectionQuickActionsIconSet(value);
    }
    return String(value || '').trim().toLowerCase() === 'hugeicons' ? 'hugeicons' : 'remix';
  }

  function normalizeTriggerStyle(value) {
    if (globalThis.LumnoSettings &&
        typeof globalThis.LumnoSettings.normalizeSelectionQuickActionsTriggerStyle === 'function') {
      return globalThis.LumnoSettings.normalizeSelectionQuickActionsTriggerStyle(value);
    }
    return String(value || '').trim().toLowerCase() === 'butterfly' ? 'butterfly' : 'lumno';
  }

  function createInlineIcon(definition, className) {
    if (!definition || !definition.body) {
      return null;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(...String(className).split(/\s+/).filter(Boolean));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('viewBox', definition.viewBox || '0 0 24 24');
    svg.innerHTML = definition.body;
    return svg;
  }

  function getButterflyDefinition() {
    const definition = BUTTERFLY;
    return definition && definition.restPath && definition.dValues
      ? definition
      : FALLBACK_BUTTERFLY;
  }

  function createButterflyWing(definition, className, material, transformMotion) {
    if (!definition || !material) {
      return null;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(...String(className).split(/\s+/).filter(Boolean));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('viewBox', definition.viewBox || '0 0 23 25');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('lumno-selection-butterfly-path');
    path.setAttribute('d', definition.restPath);
    path.setAttribute('fill', definition.fill || '#79C3F2');
    path.setAttribute('opacity', '0.2');

    const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    animate.setAttribute('attributeName', 'd');
    if (material.begin) {
      animate.setAttribute('begin', material.begin);
    }
    animate.setAttribute('calcMode', 'spline');
    animate.setAttribute('dur', definition.duration || '2800ms');
    animate.setAttribute('keySplines', definition.keySplines || '0.42 0 0.58 1;0.42 0 0.58 1');
    animate.setAttribute('keyTimes', definition.keyTimes || '0;0.5;1');
    animate.setAttribute('repeatCount', 'indefinite');
    animate.setAttribute('values', definition.dValues);
    path.appendChild(animate);

    if (transformMotion) {
      const transform = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
      transform.setAttribute('attributeName', 'transform');
      transform.setAttribute('calcMode', 'spline');
      transform.setAttribute('dur', definition.duration || '2800ms');
      transform.setAttribute('keySplines', definition.keySplines || '0.42 0 0.58 1;0.42 0 0.58 1');
      transform.setAttribute('keyTimes', definition.keyTimes || '0;0.5;1');
      transform.setAttribute('repeatCount', 'indefinite');
      transform.setAttribute('type', 'rotate');
      transform.setAttribute('values', definition.transformValues || '0 5.5 15.5');
      path.appendChild(transform);
    }

    svg.appendChild(path);
    return svg;
  }

  function createButterflyStage() {
    const definition = getButterflyDefinition();
    if (!definition) {
      return null;
    }
    const stage = document.createElement('span');
    stage.className = 'lumno-selection-butterfly-stage';
    stage.setAttribute('aria-hidden', 'true');
    const back = createButterflyWing(
      definition,
      'lumno-selection-butterfly lumno-selection-butterfly-wing lumno-selection-butterfly-wing-back',
      definition.back,
      false
    );
    const front = createButterflyWing(
      definition,
      'lumno-selection-butterfly lumno-selection-butterfly-wing lumno-selection-butterfly-wing-front',
      definition.front,
      true
    );
    if (!back || !front) {
      return null;
    }
    stage.append(back, front);
    stage.hidden = true;
    return stage;
  }

  function buildActionIcon(action) {
    const iconSetDefinitions = ACTION_ICON_LIBRARY[iconSet] && ACTION_ICON_LIBRARY[iconSet].ask
      ? ACTION_ICON_LIBRARY[iconSet]
      : ACTION_ICON_LIBRARY.remix;
    const definition = iconSetDefinitions && iconSetDefinitions[action];
    const inlineIcon = createInlineIcon(definition, 'lumno-selection-action-icon');
    if (inlineIcon) {
      return inlineIcon;
    }
    const fallback = document.createElement('i');
    fallback.className = `ri-icon ${ACTION_ICONS[action] || ACTION_ICONS.ask}`;
    fallback.setAttribute('aria-hidden', 'true');
    return fallback;
  }

  function getMessage(key, fallback) {
    if (localeMessages && localeMessages[key] && localeMessages[key].message) {
      return localeMessages[key].message;
    }
    try {
      const value = chrome.i18n && chrome.i18n.getMessage
        ? chrome.i18n.getMessage(key)
        : '';
      return value || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function normalizeLocale(value) {
    const raw = String(value || '').replace(/_/g, '-').toLowerCase();
    if (raw.startsWith('zh-tw') || raw.startsWith('zh-hk') || raw.includes('hant')) {
      return 'zh-TW';
    }
    if (raw.startsWith('zh')) {
      return 'zh-CN';
    }
    if (raw.startsWith('ja')) {
      return 'ja';
    }
    return 'en';
  }

  function getCurrentLocale() {
    if (languageMode && languageMode !== 'system') {
      return normalizeLocale(languageMode);
    }
    try {
      if (chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
        return normalizeLocale(chrome.i18n.getUILanguage());
      }
    } catch (e) {
      // Fall through to navigator language.
    }
    return normalizeLocale(navigator.language || 'en');
  }

  function refreshLocaleMessages() {
    if (!chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      return;
    }
    chrome.runtime.sendMessage({ action: 'getLocaleMessages', locale: getCurrentLocale() }, (response) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        return;
      }
      localeMessages = response && response.messages ? response.messages : null;
      if (menu && !menu.hidden && currentCandidate) {
        renderMenu();
      }
    });
  }

  function getActionLabel(action) {
    const copy = ACTION_COPY[action] || ACTION_COPY.ask;
    return getMessage(copy[0], copy[1]);
  }

  function clearTimers() {
    if (showTimer) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    if (dismissTimer) {
      window.clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    if (selectionChangeTimer) {
      window.clearTimeout(selectionChangeTimer);
      selectionChangeTimer = null;
    }
  }

  function hideSurface(options) {
    clearTimers();
    currentCandidate = null;
    requestSequence += 1;
    if (!host) {
      return;
    }
    host.dataset.visible = 'false';
    if (!options || options.immediate !== false) {
      host.hidden = true;
    } else {
      window.setTimeout(() => {
        if (host && host.dataset.visible !== 'true') {
          host.hidden = true;
        }
      }, 160);
    }
  }

  function getRuntimeClaim(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE || element.id !== HOST_ID) {
      return null;
    }
    return {
      id: String(element.dataset.runtimeId || ''),
      priority: Number.parseInt(element.dataset.runtimePriority || '0', 10) || 0,
      version: Number.parseInt(element.dataset.runtimeVersion || '0', 10) || 0
    };
  }

  function compareRuntimeClaim(element) {
    const claim = getRuntimeClaim(element);
    if (!claim) {
      return -1;
    }
    if (claim.version !== RUNTIME_VERSION) {
      return claim.version - RUNTIME_VERSION;
    }
    if (claim.priority !== RUNTIME_PRIORITY) {
      return claim.priority - RUNTIME_PRIORITY;
    }
    return claim.id.localeCompare(RUNTIME_ID);
  }

  function clearOwnedSurface() {
    if (host && host.isConnected) {
      host.remove();
    }
    host = null;
    shadow = null;
    surface = null;
    mainButton = null;
    selectionLogo = null;
    selectionButterfly = null;
    mainLabel = null;
    moreButton = null;
    menu = null;
    status = null;
    currentCandidate = null;
  }

  function reconcileSurfaceOwnership() {
    if (!enabled) {
      return true;
    }
    const candidates = Array.from(document.querySelectorAll(`[id="${HOST_ID}"]`));
    const strongerClaim = candidates.find((candidate) => (
      candidate !== host && compareRuntimeClaim(candidate) > 0
    ));
    if (strongerClaim) {
      clearOwnedSurface();
      return false;
    }
    candidates.forEach((candidate) => {
      if (candidate !== host) {
        candidate.remove();
      }
    });
    return true;
  }

  function mutationContainsSelectionHost(mutation) {
    return Array.from(mutation.addedNodes || []).some((node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }
      if (node.id === HOST_ID) {
        return true;
      }
      return typeof node.querySelector === 'function' && Boolean(node.querySelector(`[id="${HOST_ID}"]`));
    });
  }

  function setOwnershipMonitoring(active) {
    if (!active) {
      if (ownershipObserver) {
        ownershipObserver.disconnect();
        ownershipObserver = null;
      }
      return;
    }
    reconcileSurfaceOwnership();
    if (ownershipObserver || typeof MutationObserver !== 'function') {
      return;
    }
    ownershipObserver = new MutationObserver((mutations) => {
      if (mutations.some(mutationContainsSelectionHost)) {
        reconcileSurfaceOwnership();
      }
    });
    ownershipObserver.observe(document.documentElement || document, {
      childList: true,
      subtree: true
    });
  }

  function getActiveStorageAreaName() {
    return providerStorageRuntime
      ? providerStorageRuntime.getActiveAreaName()
      : storageAreaName;
  }

  function updateRuntimeDebugState() {
    if (!host) {
      return;
    }
    host.dataset.runtimeRevision = RUNTIME_REVISION;
    host.dataset.runtimeVersion = String(RUNTIME_VERSION);
    host.dataset.runtimeId = RUNTIME_ID;
    host.dataset.runtimePriority = String(RUNTIME_PRIORITY);
    host.dataset.storageArea = getActiveStorageAreaName() || '';
    host.dataset.triggerStyle = triggerStyle;
    host.dataset.triggerStyleSource = triggerStyleSource;
  }

  function isEditableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    return Boolean(element.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], .monaco-editor, .CodeMirror'
    ));
  }

  function isInsideCode(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    return Boolean(element.closest('code, pre, samp, kbd, .highlight, .syntax-highlight'));
  }

  function isSensitiveElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    return Boolean(element.closest(
      'input[type="password"], [autocomplete="current-password"], [autocomplete="new-password"], [autocomplete^="cc-"], [data-sensitive="true"]'
    ));
  }

  function getRangeElement(range) {
    const node = range && range.commonAncestorContainer;
    if (!node) {
      return null;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      return node;
    }
    if (node.parentElement) {
      return node.parentElement;
    }
    const root = typeof node.getRootNode === 'function' ? node.getRootNode() : null;
    return root && root.host && root.host.nodeType === Node.ELEMENT_NODE
      ? root.host
      : null;
  }

  function getUsableClientRects(range) {
    if (!range || typeof range.getClientRects !== 'function') {
      return [];
    }
    return Array.from(range.getClientRects()).filter((item) => (
      item && Number.isFinite(item.left) && Number.isFinite(item.right) &&
      Number.isFinite(item.top) && Number.isFinite(item.bottom) &&
      item.width > 0 && item.height > 0
    ));
  }

  function getRangeRect(range) {
    if (!range) {
      return null;
    }
    const clientRects = getUsableClientRects(range);
    let rect = range.getBoundingClientRect();
    if ((!rect || rect.width <= 0 || rect.height <= 0) && clientRects.length > 0) {
      rect = clientRects[clientRects.length - 1];
    }
    if (!rect || !Number.isFinite(rect.left) || !Number.isFinite(rect.bottom)) {
      return null;
    }
    const inlineRect = clientRects.length > 0
      ? clientRects[clientRects.length - 1]
      : rect;
    return {
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      inline: {
        bottom: inlineRect.bottom,
        left: inlineRect.left,
        right: inlineRect.right,
        top: inlineRect.top,
        height: inlineRect.height
      }
    };
  }

  function isSelectionStillCurrent(candidate) {
    if (!candidate || !window.getSelection) {
      return false;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount <= 0) {
      return false;
    }
    return INTENT.normalizeText(selection.toString()) === candidate.classification.text;
  }

  function getSelectionSnapshot() {
    if (!window.getSelection) {
      return {
        anchorNode: null,
        anchorOffset: 0,
        focusNode: null,
        focusOffset: 0,
        text: ''
      };
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount <= 0) {
      return {
        anchorNode: null,
        anchorOffset: 0,
        focusNode: null,
        focusOffset: 0,
        text: ''
      };
    }
    return {
      anchorNode: selection.anchorNode,
      anchorOffset: selection.anchorOffset,
      focusNode: selection.focusNode,
      focusOffset: selection.focusOffset,
      text: INTENT.normalizeText(selection.toString())
    };
  }

  function isSameSelection(left, right) {
    if (!left || !right) {
      return false;
    }
    return left.text === right.text &&
      left.anchorNode === right.anchorNode &&
      left.anchorOffset === right.anchorOffset &&
      left.focusNode === right.focusNode &&
      left.focusOffset === right.focusOffset;
  }

  function ensureSurface() {
    if (host && host.isConnected) {
      updateRuntimeDebugState();
      return true;
    }
    if (!reconcileSurfaceOwnership()) {
      return false;
    }
    host = document.createElement('div');
    host.id = HOST_ID;
    host.hidden = true;
    host.dataset.visible = 'false';
    updateRuntimeDebugState();
    shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        display: block;
        color-scheme: light dark;
        font-family: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      :host([hidden]) { display: none; }
      .lumno-selection-surface {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border: 1px solid light-dark(rgba(15, 23, 42, 0.12), rgba(255, 255, 255, 0.16));
        border-radius: 12px;
        background: light-dark(rgba(255, 255, 255, 0.97), rgba(24, 24, 27, 0.97));
        color: light-dark(#172033, #f4f4f5);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        opacity: 0;
        transform: translateY(-3px) scale(0.96);
        transition: opacity 140ms ease, transform 160ms ease;
        box-sizing: border-box;
      }
      .lumno-selection-surface[data-icon-only="true"] {
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
      }
      :host([data-visible="true"]) .lumno-selection-surface {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      button {
        appearance: none;
        border: 0;
        margin: 0;
        padding: 0 9px;
        min-height: 30px;
        border-radius: 9px;
        background: transparent;
        color: inherit;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font: 500 12px/1 "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }
      button:hover, button:focus-visible {
        background: light-dark(rgba(37, 99, 235, 0.09), rgba(96, 165, 250, 0.14));
        outline: none;
      }
      button:focus-visible {
        box-shadow: inset 0 0 0 2px light-dark(rgba(37, 99, 235, 0.55), rgba(96, 165, 250, 0.65));
      }
      button:disabled { opacity: 0.56; cursor: default; }
      .lumno-selection-main[data-icon-only="true"] {
        width: 36px;
        min-height: 36px;
        padding: 0;
        border-radius: 9px;
        background: rgba(250, 250, 250, 0.76);
        -webkit-backdrop-filter: blur(10px) saturate(150%);
        backdrop-filter: blur(10px) saturate(150%);
        filter: blur(8px);
        opacity: 0;
        transform: translateY(3px) scale(0.86);
        transition: background 120ms ease, backdrop-filter 120ms ease,
          filter 240ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .lumno-selection-main[data-icon-only="true"] .lumno-selection-label { display: none; }
      .lumno-selection-logo { width: 17px; height: 17px; display: block; }
      .lumno-selection-main[data-icon-only="true"] .lumno-selection-logo {
        width: 22px;
        height: 22px;
        filter: brightness(0.28) contrast(1.18);
        opacity: 0.9;
      }
      .lumno-selection-logo[hidden],
      .lumno-selection-butterfly-stage[hidden],
      .lumno-selection-butterfly[hidden] {
        display: none;
      }
      .lumno-selection-butterfly-stage {
        position: relative;
        width: 34px;
        height: 38px;
        flex: 0 0 auto;
        display: block;
        overflow: visible;
        transform: rotate(-4deg);
        transform-origin: 24% 77%;
      }
      .lumno-selection-butterfly {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        overflow: visible;
      }
      .lumno-selection-butterfly-wing {
        transform-origin: 24% 77%;
      }
      .lumno-selection-butterfly-wing-back {
        opacity: 0.22;
        transform: translate(0.6px, 0.2px) rotate(12deg) scale(0.97);
        filter: blur(0.1px);
      }
      .lumno-selection-butterfly-wing-front {
        opacity: 0.34;
        transform: translate(-0.2px, 0.1px) rotate(-8deg) scale(1.01);
      }
      .lumno-selection-butterfly-path {
        opacity: 1;
      }
      .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main {
        transition: background 120ms ease, backdrop-filter 120ms ease,
          filter 240ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 180ms ease, transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main:hover {
        background: rgba(255, 255, 255, 0.94);
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        backdrop-filter: blur(10px) saturate(140%);
      }
      .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main:focus-visible {
        background: rgba(255, 255, 255, 0.94);
        box-shadow: none;
      }
      :host([data-selection-mark="butterfly"]) .lumno-selection-main[data-icon-only="true"],
      :host([data-selection-mark="butterfly"]) .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main:hover,
      :host([data-selection-mark="butterfly"]) .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main:focus-visible {
        background: transparent;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
      }
      :host([data-visible="true"]) .lumno-selection-main[data-icon-only="true"] {
        filter: blur(0);
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      .lumno-selection-more { width: 26px; padding: 0; }
      .lumno-selection-menu {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .lumno-selection-menu[hidden], .lumno-selection-more[hidden], .lumno-selection-main[hidden] { display: none; }
      .lumno-selection-action-icon {
        width: 15px;
        height: 15px;
        flex: 0 0 auto;
        display: block;
        color: currentColor;
      }
      .lumno-selection-more-icon {
        width: 16px;
        height: 16px;
        display: block;
        color: currentColor;
      }
      .lumno-selection-status {
        padding: 0 8px;
        font: 500 12px/1 "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        white-space: nowrap;
      }
      .lumno-selection-status[hidden] { display: none; }
      @media (prefers-reduced-motion: reduce) {
        .lumno-selection-surface,
        .lumno-selection-main[data-icon-only="true"] {
          transition: none;
        }
        .lumno-selection-main[data-icon-only="true"] {
          filter: none;
        }
        .lumno-selection-butterfly path > animate,
        .lumno-selection-butterfly path > animateTransform {
          display: none;
        }
      }
    `;
    shadow.appendChild(style);

    surface = document.createElement('div');
    surface.className = 'lumno-selection-surface';
    surface.setAttribute('role', 'group');

    mainButton = document.createElement('button');
    mainButton.type = 'button';
    mainButton.className = 'lumno-selection-main';
    const logo = document.createElement('img');
    logo.className = 'lumno-selection-logo';
    logo.alt = '';
    logo.src = chrome.runtime.getURL('assets/images/lumno.png');
    selectionLogo = logo;
    selectionButterfly = createButterflyStage();
    mainLabel = document.createElement('span');
    mainLabel.className = 'lumno-selection-label';
    mainButton.append(logo);
    if (selectionButterfly) {
      mainButton.append(selectionButterfly);
    }
    mainButton.append(mainLabel);

    moreButton = document.createElement('button');
    moreButton.type = 'button';
    moreButton.className = 'lumno-selection-more';
    const moreIcon = createInlineIcon(MORE_ICON, 'lumno-selection-more-icon');
    if (moreIcon) {
      moreButton.appendChild(moreIcon);
    }
    moreButton.setAttribute('aria-haspopup', 'menu');

    menu = document.createElement('div');
    menu.className = 'lumno-selection-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'menu');

    status = document.createElement('span');
    status.className = 'lumno-selection-status';
    status.hidden = true;
    status.setAttribute('role', 'status');

    surface.append(mainButton, moreButton, menu, status);
    shadow.appendChild(surface);
    (document.documentElement || document.body).appendChild(host);

    surface.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    surface.addEventListener('pointerenter', () => {
      if (dismissTimer) {
        window.clearTimeout(dismissTimer);
        dismissTimer = null;
      }
    });
    surface.addEventListener('pointerleave', () => {
      if (currentCandidate) {
        scheduleDismiss(currentCandidate.mode === 'high' ? CHIP_DISMISS_MS : DOT_DISMISS_MS);
      }
    });
    mainButton.addEventListener('click', () => {
      if (!currentCandidate) {
        return;
      }
      if (currentCandidate.mode === 'medium') {
        renderMenu();
        return;
      }
      sendSelectionAction(currentCandidate.classification.action);
    });
    moreButton.addEventListener('click', renderMenu);
    return true;
  }

  function positionSurface(rect, placement) {
    if (!host || !surface || !rect) {
      return;
    }
    const isInline = placement === 'inline' && rect.inline;
    host.style.left = '8px';
    host.style.top = '8px';
    window.requestAnimationFrame(() => {
      if (!host || host.hidden) {
        return;
      }
      const bounds = surface.getBoundingClientRect();
      const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 0);
      const viewportHeight = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 0);
      if (isInline) {
        const anchor = rect.inline;
        const gap = 5;
        let left = anchor.right + gap;
        const topOffset = Math.max(8, Math.min(16, bounds.height * 0.7));
        let top = anchor.top - topOffset;
        const fitsRight = left + bounds.width <= viewportWidth - 8;
        if (!fitsRight) {
          const leftCandidate = anchor.left - bounds.width - gap;
          if (leftCandidate >= 8) {
            left = leftCandidate;
          } else {
            left = Math.min(
              viewportWidth - bounds.width - 8,
              Math.max(8, anchor.right - bounds.width)
            );
            top = anchor.bottom + gap;
          }
        }
        top = Math.min(
          viewportHeight - bounds.height - 8,
          Math.max(8, top)
        );
        host.style.left = `${Math.round(left)}px`;
        host.style.top = `${Math.round(top)}px`;
        return;
      }
      const left = Math.min(
        viewportWidth - bounds.width - 8,
        Math.max(8, rect.right - Math.min(32, bounds.width / 2))
      );
      const fitsBelow = rect.bottom + bounds.height + 10 <= viewportHeight;
      const top = fitsBelow
        ? rect.bottom + 8
        : Math.max(8, rect.top - bounds.height - 8);
      host.style.left = `${Math.round(left)}px`;
      host.style.top = `${Math.round(top)}px`;
    });
  }

  function updateSelectionMark(mode) {
    const showButterfly = Boolean(selectionButterfly) &&
      triggerStyle === 'butterfly';
    if (selectionLogo) {
      selectionLogo.hidden = showButterfly;
      if (!showButterfly) {
        selectionLogo.src = chrome.runtime.getURL(mode === 'medium'
          ? 'assets/images/lumno-selection-mark.png'
          : 'assets/images/lumno.png');
      }
    }
    if (selectionButterfly) {
      selectionButterfly.hidden = !showButterfly;
    }
    if (host) {
      host.dataset.selectionMark = showButterfly ? 'butterfly' : 'lumno';
      updateRuntimeDebugState();
    }
  }

  function scheduleDismiss(delay) {
    if (dismissTimer) {
      window.clearTimeout(dismissTimer);
    }
    dismissTimer = window.setTimeout(() => hideSurface({ immediate: false }), delay);
  }

  function renderCandidate(candidate, mode) {
    if (!ensureSurface()) {
      return;
    }
    currentCandidate = { ...candidate, mode };
    const action = candidate.classification.action;
    const label = getActionLabel(action);
    host.hidden = false;
    host.dataset.iconSet = iconSet;
    host.dataset.visible = 'false';
    surface.dataset.iconOnly = mode === 'medium' ? 'true' : 'false';
    updateSelectionMark(mode);
    mainButton.hidden = false;
    mainButton.disabled = false;
    mainButton.dataset.iconOnly = mode === 'medium' ? 'true' : 'false';
    mainButton.setAttribute('aria-label', mode === 'medium'
      ? getMessage('selection_quick_action_open_menu', '使用 Lumno 处理所选文字')
      : label);
    mainLabel.textContent = label;
    moreButton.hidden = mode !== 'high';
    moreButton.disabled = false;
    moreButton.setAttribute('aria-label', getMessage('selection_quick_action_more', '更多操作'));
    moreButton.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    menu.replaceChildren();
    status.hidden = true;
    status.textContent = '';
    positionSurface(candidate.rect, mode === 'medium' ? 'inline' : 'panel');
    const renderedCandidate = currentCandidate;
    window.requestAnimationFrame(() => {
      if (host && currentCandidate === renderedCandidate) {
        host.dataset.visible = 'true';
      }
    });
    scheduleDismiss(mode === 'high' ? CHIP_DISMISS_MS : DOT_DISMISS_MS);
  }

  function buildMenuAction(action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.dataset.intent = action;
    const icon = buildActionIcon(action);
    const label = document.createElement('span');
    label.textContent = getActionLabel(action);
    button.append(icon, label);
    button.addEventListener('click', () => sendSelectionAction(action));
    return button;
  }

  function renderMenu() {
    if (!currentCandidate || !host) {
      return;
    }
    const primary = currentCandidate.classification.action;
    const actions = [primary];
    if (primary !== 'ask') {
      actions.push('ask');
    }
    if (primary !== 'search') {
      actions.push('search');
    }
    surface.dataset.iconOnly = 'false';
    mainButton.hidden = true;
    moreButton.hidden = true;
    moreButton.setAttribute('aria-expanded', 'true');
    menu.replaceChildren(...actions.slice(0, 3).map(buildMenuAction));
    host.dataset.iconSet = iconSet;
    menu.hidden = false;
    status.hidden = true;
    positionSurface(currentCandidate.rect, 'panel');
    scheduleDismiss(CHIP_DISMISS_MS);
  }

  function renderSendingStatus() {
    if (!host || !currentCandidate) {
      return;
    }
    surface.dataset.iconOnly = 'false';
    mainButton.hidden = true;
    moreButton.hidden = true;
    menu.hidden = true;
    status.textContent = getMessage('selection_quick_action_sending', '正在后台打开…');
    status.hidden = false;
    positionSurface(currentCandidate.rect, 'panel');
  }

  function renderFailureStatus() {
    ensureSurface();
    if (!host) {
      return;
    }
    surface.dataset.iconOnly = 'false';
    host.hidden = false;
    host.dataset.visible = 'true';
    mainButton.hidden = true;
    moreButton.hidden = true;
    menu.hidden = true;
    status.textContent = getMessage('selection_quick_action_failed', '发送失败，请重试');
    status.hidden = false;
    scheduleDismiss(2200);
  }

  function sendSelectionAction(action) {
    const candidate = currentCandidate;
    if (!candidate || !isSelectionStillCurrent(candidate)) {
      hideSurface();
      return;
    }
    renderSendingStatus();
    try {
      chrome.runtime.sendMessage({
        action: 'runSelectionQuickAction',
        intent: action,
        locale: getCurrentLocale(),
        text: candidate.classification.text
      }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          renderFailureStatus();
          return;
        }
        if (!response || response.ok === false) {
          renderFailureStatus();
        }
      });
      window.setTimeout(() => hideSurface({ immediate: false }), 900);
    } catch (e) {
      renderFailureStatus();
    }
  }

  function buildCandidate(selection) {
    if (!selection || selection.isCollapsed || selection.rangeCount <= 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    const element = getRangeElement(range);
    const rect = getRangeRect(range);
    if (!element || !rect || host && element === host) {
      return null;
    }
    const classification = INTENT.classifySelection(selection.toString(), {
      editable: isEditableElement(element),
      insideCode: isInsideCode(element),
      pageLanguage: document.documentElement && document.documentElement.lang,
      sensitive: isSensitiveElement(element),
      uiLanguage: getCurrentLocale()
    });
    if (classification.suppressed || classification.triggerable !== true) {
      return null;
    }
    return {
      classification,
      rect
    };
  }

  function evaluateSelection() {
    hideSurface();
    if (!enabled || !window.getSelection) {
      return;
    }
    const candidate = buildCandidate(window.getSelection());
    if (!candidate) {
      return;
    }
    const sequence = ++requestSequence;
    currentCandidate = candidate;
    const initialHigh = candidate.classification.confidence === 'high';
    showTimer = window.setTimeout(() => {
      showTimer = null;
      if (sequence !== requestSequence || !enabled || !isSelectionStillCurrent(candidate)) {
        return;
      }
      if (initialHigh) {
        renderCandidate(candidate, 'high');
        return;
      }
      renderCandidate(candidate, 'medium');
    }, initialHigh ? HIGH_DELAY_MS : MEDIUM_DELAY_MS);
  }

  function resetSelectionGesture() {
    selectionGestureActive = false;
    if (gestureResetTimer) {
      window.clearTimeout(gestureResetTimer);
      gestureResetTimer = null;
    }
  }

  function scheduleSelectionGestureReset() {
    if (gestureResetTimer) {
      window.clearTimeout(gestureResetTimer);
    }
    gestureResetTimer = window.setTimeout(() => {
      gestureResetTimer = null;
      if (pointerDownState) {
        scheduleSelectionGestureReset();
        return;
      }
      selectionGestureActive = false;
    }, SELECTION_GESTURE_TIMEOUT_MS);
  }

  function armSelectionGesture() {
    selectionGestureActive = true;
    scheduleSelectionGestureReset();
  }

  function cancelSelectionGesture() {
    pointerDownState = null;
    resetSelectionGesture();
    hideSurface();
  }

  function scheduleSelectionChangeEvaluation() {
    if (!enabled || !selectionGestureActive || pointerDownState) {
      return;
    }
    if (selectionChangeTimer) {
      window.clearTimeout(selectionChangeTimer);
    }
    selectionChangeTimer = window.setTimeout(() => {
      selectionChangeTimer = null;
      if (!enabled || !selectionGestureActive || pointerDownState || currentCandidate) {
        return;
      }
      const selection = getSelectionSnapshot();
      if (!selection.text) {
        return;
      }
      evaluateSelection();
    }, SELECTION_CHANGE_DELAY_MS);
  }

  function handlePointerUp(event) {
    const pointerDown = pointerDownState;
    pointerDownState = null;
    if (event.button !== 0 || !enabled ||
        event.isPrimary === false ||
        !pointerDown ||
        (pointerDown.pointerId != null && event.pointerId != null && pointerDown.pointerId !== event.pointerId) ||
        (host && event.composedPath && event.composedPath().includes(host))) {
      return;
    }
    armSelectionGesture();
    const selection = getSelectionSnapshot();
    const selectionChanged = !isSameSelection(pointerDown.selection, selection);
    const isMultiClick = Number(event.detail) >= 2;
    if (!selection.text) {
      scheduleSelectionChangeEvaluation();
      return;
    }
    if (!selectionChanged && !isMultiClick) {
      return;
    }
    window.setTimeout(() => {
      if (enabled && selectionGestureActive) {
        evaluateSelection();
      }
    }, 0);
  }

  function handlePointerDown(event) {
    pointerDownState = null;
    if (event.button !== 0 || !enabled ||
        event.isPrimary === false ||
        (host && event.composedPath && event.composedPath().includes(host))) {
      return;
    }
    pointerDownState = {
      pointerId: event.pointerId,
      selection: getSelectionSnapshot()
    };
    hideSurface();
    armSelectionGesture();
  }

  function handleSelectionChange() {
    if (!window.getSelection) {
      return;
    }
    const selection = window.getSelection();
    const text = selection && !selection.isCollapsed && selection.rangeCount > 0
      ? INTENT.normalizeText(selection.toString())
      : '';
    if (currentCandidate && text !== currentCandidate.classification.text) {
      hideSurface();
    }
    if (!text || !enabled || !selectionGestureActive || pointerDownState || currentCandidate) {
      return;
    }
    scheduleSelectionChangeEvaluation();
  }

  function handlePointerCancel() {
    const pointerDown = pointerDownState;
    pointerDownState = null;
    const selection = getSelectionSnapshot();
    if (enabled && selectionGestureActive && selection.text &&
        (!pointerDown || !isSameSelection(pointerDown.selection, selection))) {
      scheduleSelectionChangeEvaluation();
    }
  }

  function handleSelectStart(event) {
    if (!enabled || (host && event.composedPath && event.composedPath().includes(host))) {
      return;
    }
    armSelectionGesture();
  }

  function handleWindowBlur() {
    cancelSelectionGesture();
  }

  function hydrateSettings() {
    if (!storageArea || typeof storageArea.get !== 'function') {
      return;
    }
    storageArea.get([
      ENABLED_STORAGE_KEY,
      ICON_SET_STORAGE_KEY,
      TRIGGER_STYLE_STORAGE_KEY,
      LANGUAGE_STORAGE_KEY
    ], (result) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        return;
      }
      enabled = Boolean(result && result[ENABLED_STORAGE_KEY] === true);
      iconSet = normalizeIconSet(result && result[ICON_SET_STORAGE_KEY]);
      triggerStyle = normalizeTriggerStyle(result && result[TRIGGER_STYLE_STORAGE_KEY]);
      triggerStyleSource = `hydrate:${getActiveStorageAreaName() || 'unknown'}`;
      languageMode = result && result[LANGUAGE_STORAGE_KEY]
        ? String(result[LANGUAGE_STORAGE_KEY])
        : 'system';
      refreshLocaleMessages();
      if (!enabled) {
        cancelSelectionGesture();
        clearOwnedSurface();
      }
      setOwnershipMonitoring(enabled);
      if (currentCandidate && host && !host.hidden) {
        updateSelectionMark(currentCandidate.mode);
      } else {
        updateRuntimeDebugState();
      }
    });
  }

  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('pointercancel', handlePointerCancel, true);
  document.addEventListener('selectstart', handleSelectStart, true);
  document.addEventListener('selectionchange', handleSelectionChange, true);
  document.addEventListener('copy', cancelSelectionGesture, true);
  document.addEventListener('scroll', cancelSelectionGesture, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      cancelSelectionGesture();
      return;
    }
    if (event.shiftKey || ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'a')) {
      armSelectionGesture();
    }
  }, true);
  window.addEventListener('blur', handleWindowBlur, true);

  if (chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      const isPrimaryArea = providerStorageRuntime
        ? providerStorageRuntime.isActiveAreaName(areaName)
        : areaName === storageAreaName;
      if (!isPrimaryArea) {
        return;
      }
      if (isPrimaryArea && changes[ENABLED_STORAGE_KEY]) {
        enabled = changes[ENABLED_STORAGE_KEY].newValue === true;
        setOwnershipMonitoring(enabled);
        if (!enabled) {
          cancelSelectionGesture();
          clearOwnedSurface();
        }
      }
      if (isPrimaryArea && changes[ICON_SET_STORAGE_KEY]) {
        iconSet = normalizeIconSet(changes[ICON_SET_STORAGE_KEY].newValue);
        if (menu && !menu.hidden && currentCandidate) {
          renderMenu();
        }
      }
      if (changes[TRIGGER_STYLE_STORAGE_KEY]) {
        triggerStyle = normalizeTriggerStyle(changes[TRIGGER_STYLE_STORAGE_KEY].newValue);
        triggerStyleSource = `change:${areaName || 'unknown'}`;
        if (currentCandidate && host && !host.hidden) {
          updateSelectionMark(currentCandidate.mode);
        } else {
          updateRuntimeDebugState();
        }
      }
      if (changes[LANGUAGE_STORAGE_KEY]) {
        hydrateSettings();
      }
    });
  }

  hydrateSettings();
})();
