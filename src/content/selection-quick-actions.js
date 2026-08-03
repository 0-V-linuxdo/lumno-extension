(function() {
  'use strict';

  if (window._x_extension_selection_quick_actions_2026_unique_) {
    return;
  }
  window._x_extension_selection_quick_actions_2026_unique_ = true;

  const INTENT = globalThis.LumnoSelectionIntent || {};
  const ACTION_ICON_LIBRARY = globalThis.LumnoSelectionActionIcons || {};
  if (typeof INTENT.classifySelection !== 'function') {
    return;
  }

  const ENABLED_STORAGE_KEY = '_x_extension_selection_quick_actions_enabled_2026_unique_';
  const ICON_SET_STORAGE_KEY = '_x_extension_selection_quick_actions_icon_set_2026_unique_';
  const LANGUAGE_STORAGE_KEY = '_x_extension_language_2024_unique_';
  const LANGUAGE_MESSAGES_STORAGE_KEY = '_x_extension_language_messages_2024_unique_';
  const HOST_ID = '_x_extension_selection_quick_actions_host_2026_unique_';
  const HIGH_DELAY_MS = 300;
  const MEDIUM_DELAY_MS = 380;
  const POINTER_CONFIRM_DISTANCE_PX = 48;
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
  let languageMode = 'system';
  let localeMessages = null;
  let showTimer = null;
  let dismissTimer = null;
  let requestSequence = 0;
  let pointerPosition = { x: 0, y: 0 };
  let pointerDownState = null;
  let currentCandidate = null;
  let host = null;
  let shadow = null;
  let surface = null;
  let mainButton = null;
  let selectionLogo = null;
  let mainLabel = null;
  let moreButton = null;
  let menu = null;
  let status = null;

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

  function normalizeIconSet(value) {
    if (globalThis.LumnoSettings &&
        typeof globalThis.LumnoSettings.normalizeSelectionQuickActionsIconSet === 'function') {
      return globalThis.LumnoSettings.normalizeSelectionQuickActionsIconSet(value);
    }
    return String(value || '').trim().toLowerCase() === 'hugeicons' ? 'hugeicons' : 'remix';
  }

  function createInlineIcon(definition, className) {
    if (!definition || !definition.body) {
      return null;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('viewBox', definition.viewBox || '0 0 24 24');
    svg.innerHTML = definition.body;
    return svg;
  }

  function buildActionIcon(action) {
    const iconSetDefinitions = ACTION_ICON_LIBRARY[iconSet] || ACTION_ICON_LIBRARY.remix;
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
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  }

  function getRangeRect(range) {
    if (!range) {
      return null;
    }
    const clientRects = range.getClientRects
      ? Array.from(range.getClientRects()).filter((item) => (
        item && Number.isFinite(item.left) && Number.isFinite(item.right) &&
        Number.isFinite(item.top) && Number.isFinite(item.bottom) &&
        item.width > 0 && item.height > 0
      ))
      : [];
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

  function getPointerDistance(candidate) {
    const dx = Number(pointerPosition.x) - Number(candidate.pointerX);
    const dy = Number(pointerPosition.y) - Number(candidate.pointerY);
    return Math.sqrt((dx * dx) + (dy * dy));
  }

  function ensureSurface() {
    if (host && host.isConnected) {
      return;
    }
    host = document.createElement('div');
    host.id = HOST_ID;
    host.hidden = true;
    host.dataset.visible = 'false';
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
        width: 22px;
        min-height: 22px;
        padding: 0;
        border-radius: 7px;
      }
      .lumno-selection-main[data-icon-only="true"] .lumno-selection-label { display: none; }
      .lumno-selection-logo { width: 17px; height: 17px; display: block; }
      .lumno-selection-main[data-icon-only="true"] .lumno-selection-logo {
        width: 18px;
        height: 18px;
        filter: brightness(0) invert(1) contrast(1.12);
        mix-blend-mode: difference;
        opacity: 0.94;
      }
      .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main {
        transition: background 120ms ease, backdrop-filter 120ms ease;
      }
      .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main:hover {
        background: light-dark(rgba(245, 245, 246, 0.78), rgba(63, 63, 66, 0.74));
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        backdrop-filter: blur(10px) saturate(140%);
      }
      .lumno-selection-surface[data-icon-only="true"] .lumno-selection-main:focus-visible {
        background: light-dark(rgba(245, 245, 246, 0.78), rgba(63, 63, 66, 0.74));
        box-shadow: none;
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
        .lumno-selection-surface { transition: none; }
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
    mainLabel = document.createElement('span');
    mainLabel.className = 'lumno-selection-label';
    mainButton.append(logo, mainLabel);

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
        const gap = 4;
        let left = anchor.right + gap;
        let top = anchor.top + ((anchor.height - bounds.height) / 2);
        const fitsRight = left + bounds.width <= viewportWidth - 8;
        if (!fitsRight) {
          left = anchor.right - bounds.width;
          top = anchor.bottom + gap;
        }
        if (left < 8) {
          left = Math.max(8, anchor.left - bounds.width - gap);
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

  function scheduleDismiss(delay) {
    if (dismissTimer) {
      window.clearTimeout(dismissTimer);
    }
    dismissTimer = window.setTimeout(() => hideSurface({ immediate: false }), delay);
  }

  function renderCandidate(candidate, mode) {
    ensureSurface();
    currentCandidate = { ...candidate, mode };
    const action = candidate.classification.action;
    const label = getActionLabel(action);
    host.hidden = false;
    host.dataset.iconSet = iconSet;
    host.dataset.visible = 'false';
    surface.dataset.iconOnly = mode === 'medium' ? 'true' : 'false';
    if (selectionLogo) {
      selectionLogo.src = chrome.runtime.getURL(mode === 'medium'
        ? 'assets/images/lumno-selection-mark.png'
        : 'assets/images/lumno.png');
    }
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

  function buildCandidate(selection, pointerEvent) {
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
      pointerX: Number(pointerEvent && pointerEvent.clientX) || pointerPosition.x,
      pointerY: Number(pointerEvent && pointerEvent.clientY) || pointerPosition.y,
      rect
    };
  }

  function evaluateSelection(pointerEvent) {
    hideSurface();
    if (!enabled || !window.getSelection) {
      return;
    }
    const candidate = buildCandidate(window.getSelection(), pointerEvent);
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
      const behaviorConfirmed = getPointerDistance(candidate) <= POINTER_CONFIRM_DISTANCE_PX;
      if (!behaviorConfirmed) {
        return;
      }
      if (initialHigh) {
        renderCandidate(candidate, 'high');
        return;
      }
      renderCandidate(candidate, 'medium');
    }, initialHigh ? HIGH_DELAY_MS : MEDIUM_DELAY_MS);
  }

  function handlePointerUp(event) {
    const pointerDown = pointerDownState;
    pointerDownState = null;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (event.button !== 0 || !enabled ||
        event.isPrimary === false ||
        !pointerDown ||
        (pointerDown.pointerId != null && event.pointerId != null && pointerDown.pointerId !== event.pointerId) ||
        (host && event.composedPath && event.composedPath().includes(host))) {
      return;
    }
    const selection = getSelectionSnapshot();
    const selectionChanged = !isSameSelection(pointerDown.selection, selection);
    const isMultiClick = Number(event.detail) >= 2;
    if (!selection.text || (!selectionChanged && !isMultiClick)) {
      return;
    }
    window.setTimeout(() => evaluateSelection(event), 0);
  }

  function handlePointerMove(event) {
    pointerPosition = { x: event.clientX, y: event.clientY };
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
  }

  function handleSelectionChange() {
    if (!currentCandidate || !window.getSelection) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed ||
        INTENT.normalizeText(selection.toString()) !== currentCandidate.classification.text) {
      hideSurface();
    }
  }

  function handlePointerCancel() {
    pointerDownState = null;
  }

  function hydrateSettings() {
    if (!storageArea || typeof storageArea.get !== 'function') {
      return;
    }
    storageArea.get([
      ENABLED_STORAGE_KEY,
      ICON_SET_STORAGE_KEY,
      LANGUAGE_STORAGE_KEY,
      LANGUAGE_MESSAGES_STORAGE_KEY
    ], (result) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        return;
      }
      enabled = Boolean(result && result[ENABLED_STORAGE_KEY] === true);
      iconSet = normalizeIconSet(result && result[ICON_SET_STORAGE_KEY]);
      languageMode = result && result[LANGUAGE_STORAGE_KEY]
        ? String(result[LANGUAGE_STORAGE_KEY])
        : 'system';
      const payload = result && result[LANGUAGE_MESSAGES_STORAGE_KEY];
      localeMessages = payload && payload.messages ? payload.messages : null;
      if (!enabled) {
        hideSurface();
      }
    });
  }

  document.addEventListener('pointerup', handlePointerUp, true);
  document.addEventListener('pointermove', handlePointerMove, true);
  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('pointercancel', handlePointerCancel, true);
  document.addEventListener('selectionchange', handleSelectionChange, true);
  document.addEventListener('copy', hideSurface, true);
  document.addEventListener('scroll', hideSurface, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideSurface();
    }
  }, true);
  window.addEventListener('blur', handlePointerCancel, true);

  if (chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (providerStorageRuntime
        ? !providerStorageRuntime.isActiveAreaName(areaName)
        : areaName !== storageAreaName) {
        return;
      }
      if (changes[ENABLED_STORAGE_KEY]) {
        enabled = changes[ENABLED_STORAGE_KEY].newValue === true;
        if (!enabled) {
          hideSurface();
        }
      }
      if (changes[ICON_SET_STORAGE_KEY]) {
        iconSet = normalizeIconSet(changes[ICON_SET_STORAGE_KEY].newValue);
        if (menu && !menu.hidden && currentCandidate) {
          renderMenu();
        }
      }
      if (changes[LANGUAGE_STORAGE_KEY] || changes[LANGUAGE_MESSAGES_STORAGE_KEY]) {
        hydrateSettings();
      }
    });
  }

  hydrateSettings();
})();
