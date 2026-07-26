(function() {
  const MODEL = globalThis.LumnoOnboardingContent || {};
  const NAVIGATION_DISPOSITION = globalThis.LumnoNavigationDisposition || {};
  if (typeof MODEL.getOnboardingBlueprint !== 'function') {
    return;
  }

  const LANGUAGE_STORAGE_KEY = '_x_extension_language_2024_unique_';
  const SHOW_SEARCH_COMMAND_NAME = 'show-search';
  const ONBOARDING_SEARCH_OVERLAY_COMMAND_ACTION = 'triggerOnboardingSearchOverlayFromCommand';
  const SHORTCUT_PLACEHOLDER = '{shortcut}';
  const TITLE_CYCLE_INTERVAL_MS = 1900;
  const TITLE_CYCLE_FIRST_DELAY_MS = 520;
  const TEXT_SWAP_FALLBACK_DURATION_MS = 200;
  const SITE_SEARCH_OPTIONS_PAGE_PATH = 'src/options/options.html#shortcuts';
  const FOCUSED_NEWTAB_RELATIVE_PAGE_PATH = '../newtab/lumno-newtab.html?focus=1';
  const LUMNO_CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/lumno-%E8%81%9A%E7%84%A6%E6%90%9C%E7%B4%A2%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/nggfkkbmogmadfoikakkfegkoilfcfao?utm_source=item-share-cb';
  const ACTION_MESSAGE_BY_ID = Object.freeze({
    openShortcuts: 'openExtensionShortcutsPage',
    openExtensionDetails: 'openExtensionDetailsPage',
    openNewtab: 'openNewTab',
    openOptions: 'openOptionsPage',
    openSiteSearchOptions: 'openSiteSearchOptionsPage'
  });
  const BROWSER_AVATAR_CLASS_BY_ID = Object.freeze({
    chrome: 'browser-avatar--chrome',
    edge: 'browser-avatar--edge',
    dia: 'browser-avatar--dia',
    comet: 'browser-avatar--comet'
  });
  let runtimeCopy = typeof MODEL.getOnboardingRuntimeCopy === 'function'
    ? MODEL.getOnboardingRuntimeCopy('en')
    : Object.freeze({});
  const LUMNO_WEB_WORDMARK_SRC = '../../assets/images/lumno-web-textlogo.svg';
  const LUMNO_WEB_BUTTERFLY_REST_PATH = 'M4.3248 17.7823C1.22382 14.6398 -0.116749 10.2475 0.824858 6.7097C1.02033 5.97529 1.95363 5.98287 2.27212 6.67289L4.16024 10.7637C4.38415 11.2488 4.50011 11.7767 4.50011 12.311L4.50011 16L6.24277 16C7.66705 16 9.01155 16.6576 9.88596 17.7819L11.0831 19.3211C11.5044 19.8627 11.2076 20.6668 10.5235 20.7201C8.63849 20.8671 6.85452 20.3459 4.3248 17.7823Z';
  const LUMNO_WEB_BUTTERFLY_FLUTTER_PATH = 'M4.32468 17.7823C-1.04106 11.6456 2.30784 4.56298 5.14393 1.13518C5.48929 0.717757 6.11849 0.734355 6.47527 1.14207L10.4328 5.66451C11.4105 6.78177 11.6239 8.37593 10.9745 9.71102L8.61264 14.567L11.5238 13.9636C13.2202 13.612 14.9706 14.24 16.0565 15.5899L18.7241 18.9056C19.0394 19.2975 18.9857 19.8717 18.5688 20.1531C15.6258 22.1399 9.6385 23.8596 4.32468 17.7823Z';
  const LUMNO_WEB_BUTTERFLY_D_VALUES = `${LUMNO_WEB_BUTTERFLY_FLUTTER_PATH};${LUMNO_WEB_BUTTERFLY_REST_PATH};${LUMNO_WEB_BUTTERFLY_FLUTTER_PATH}`;
  const ONBOARDING_OVERLAY_DEMO_PANEL_ID = '_x_extension_onboarding_overlay_demo_2026_unique_';
  const LUMNO_OVERLAY_HOVER_LEAD_MS = 1040;
  const LUMNO_OVERLAY_HOVER_START_MS = 4240 - LUMNO_OVERLAY_HOVER_LEAD_MS;
  const LUMNO_OVERLAY_HOVER_STEP_MS = 1600;
  const LUMNO_OVERLAY_HOVER_WRAP_STEP_MS = 1600;
  const NEWTAB_PREVIEW_HOVER_START_MS = 1500;
  const NEWTAB_PREVIEW_HOVER_HOLD_MS = 1200;
  const NEWTAB_PREVIEW_HOVER_MOVE_MS = 520;
  const NEWTAB_PREVIEW_HOVER_SETTLE_MS = 1140;
  const HOMEPAGE_PIP_ART_SRC = '../../assets/images/onboarding-auto-pip.svg';
  const NEWTAB_FILTERS_ART_SRC = '../../assets/images/onboarding-newtab-filters.webp';
  const ONBOARDING_FRAME_WIDTH = 1240;
  const ONBOARDING_FRAME_HEIGHT = 680;
  const VISUAL_CANVAS_WIDTH = 704;
  const VISUAL_CANVAS_HEIGHT = 680;

  function getRuntimeSection(name) {
    const copy = runtimeCopy || {};
    const section = copy && copy[name];
    return section && typeof section === 'object' ? section : {};
  }

  function getRuntimeMiscText(key, fallback) {
    const misc = getRuntimeSection('misc');
    const value = misc && misc[key];
    const text = String(value || '').trim();
    return text || fallback || '';
  }

  function formatRuntimeTemplate(template, values) {
    const source = String(template || '');
    const map = values || {};
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(map, key) ? String(map[key]) : match
    ));
  }

  function resolveRuntimeUrl(value) {
    const url = String(value || '').trim();
    return url === 'chromeWebStore' ? LUMNO_CHROME_WEB_STORE_URL : url;
  }

  function getRuntimeArray(sectionName, key) {
    const section = getRuntimeSection(sectionName);
    const value = key ? section[key] : section;
    return Array.isArray(value) ? value : [];
  }

  function getLumnoOverlayQuery() {
    const section = getRuntimeSection('lumnoOverlay');
    return String(section.query || 'extension');
  }

  function getLumnoOverlayResults() {
    return getRuntimeArray('lumnoOverlay', 'results');
  }

  function getNewtabPreviewCopy() {
    return getRuntimeSection('newtabPreview');
  }

  function getNewtabPreviewQuery() {
    return String(getNewtabPreviewCopy().query || '');
  }

  function getNewtabPreviewBookmarks() {
    return getRuntimeArray('newtabPreview', 'bookmarks');
  }

  function getNewtabPreviewRecentSites() {
    return getRuntimeArray('newtabPreview', 'recentSites').map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }
      return Object.assign({}, item, { url: resolveRuntimeUrl(item.url) });
    });
  }

  function getNewtabPreviewSectionTitle(key, fallback) {
    const sections = getNewtabPreviewCopy().sections || {};
    return String(sections[key] || fallback || '');
  }

  function getSiteSearchDemoCases() {
    return getRuntimeArray('siteSearchDemo', 'cases');
  }

  function getFeatureCards() {
    return getRuntimeArray('featureCards');
  }

  function getFeatureAwards() {
    return getRuntimeArray('featureAwards');
  }

  function getNewtabPreviewFaviconUrl(url) {
    const value = String(url || '').trim();
    return value
      ? `https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=${encodeURIComponent(value)}&size=64`
      : '';
  }

  function getNewtabPreviewFolderSvg(idSuffix) {
    const suffix = String(idSuffix || 'preview').replace(/[^a-zA-Z0-9_-]/g, '_');
    const lowerGradientId = `x-nt-preview-folder-lower-${suffix}`;
    const upperGradientId = `x-nt-preview-folder-upper-${suffix}`;
    return [
      '<svg viewBox="0 0 31 29" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
      '<g data-folder-layer="lower">',
      `<path d="M7.24 2C6.082 2 5.503 2 5.064 2.232C4.71 2.42 4.42 2.71 4.232 3.064C4 3.503 4 4.082 4 5.24V19.76C4 20.918 4 21.497 4.232 21.936C4.42 22.29 4.71 22.58 5.064 22.768C5.503 23 6.082 23 7.24 23H23.76C24.918 23 25.497 23 25.936 22.768C26.29 22.58 26.58 22.29 26.768 21.936C27 21.497 27 20.918 27 19.76V8.24C27 7.082 27 6.503 26.768 6.064C26.58 5.71 26.29 5.42 25.936 5.232C25.497 5 24.918 5 23.76 5H16.287C15.767 5 15.507 5 15.263 4.938C15.065 4.887 14.875 4.806 14.701 4.698C14.488 4.565 14.308 4.377 13.948 4.002L12.986 2.998C12.626 2.623 12.446 2.435 12.233 2.302C12.059 2.194 11.869 2.113 11.671 2.062C11.427 2 11.167 2 10.647 2H7.24Z" fill="url(#${lowerGradientId})"/>`,
      '<path d="M7.24 2.5H10.647C11.192 2.5 11.379 2.504 11.547 2.547C11.696 2.585 11.838 2.645 11.969 2.727C12.116 2.818 12.248 2.95 12.625 3.344L13.587 4.348C13.929 4.705 14.158 4.949 14.438 5.123C14.655 5.258 14.892 5.359 15.14 5.422C15.458 5.503 15.792 5.5 16.287 5.5H23.76C24.347 5.5 24.757 5.5 25.075 5.527C25.388 5.554 25.567 5.603 25.702 5.675C25.968 5.815 26.185 6.032 26.325 6.298C26.397 6.433 26.446 6.612 26.473 6.925C26.5 7.243 26.5 7.653 26.5 8.24V19.76C26.5 20.347 26.5 20.757 26.473 21.075C26.446 21.388 26.397 21.567 26.325 21.702C26.185 21.968 25.968 22.185 25.702 22.325C25.567 22.397 25.388 22.446 25.075 22.473C24.757 22.5 24.347 22.5 23.76 22.5H7.24C6.653 22.5 6.243 22.5 5.925 22.473C5.612 22.446 5.433 22.397 5.298 22.325C5.032 22.185 4.815 21.968 4.675 21.702C4.603 21.567 4.554 21.388 4.527 21.075C4.5 20.757 4.5 20.347 4.5 19.76V5.24C4.5 4.653 4.5 4.243 4.527 3.925C4.554 3.612 4.603 3.433 4.675 3.298C4.815 3.032 5.032 2.815 5.298 2.675C5.433 2.603 5.612 2.554 5.925 2.527C6.243 2.5 6.653 2.5 7.24 2.5Z" stroke="#5393FF"/>',
      '</g>',
      '<g data-folder-layer="file">',
      '<path d="M7 10C7 9.448 7.448 9 8 9H23C23.552 9 24 9.448 24 10V17C24 17.552 23.552 18 23 18H8C7.448 18 7 17.552 7 17V10Z" fill="white"/>',
      '<path d="M13 11H18" stroke="#DDE8FB" stroke-linecap="round"/>',
      '</g>',
      '<g data-folder-layer="upper">',
      `<path d="M7.24 5C6.082 5 5.503 5 5.064 5.232C4.71 5.42 4.42 5.71 4.232 6.064C4 6.503 4 7.082 4 8.24V19.76C4 20.918 4 21.497 4.232 21.936C4.42 22.29 4.71 22.58 5.064 22.768C5.503 23 6.082 23 7.24 23H23.76C24.918 23 25.497 23 25.936 22.768C26.29 22.58 26.58 22.29 26.768 21.936C27 21.497 27 20.918 27 19.76V8.24C27 7.082 27 6.503 26.768 6.064C26.58 5.71 26.29 5.42 25.936 5.232C25.497 5 24.918 5 23.76 5H7.24Z" fill="url(#${upperGradientId})"/>`,
      '<path d="M7.24 5.5H23.76C24.347 5.5 24.757 5.5 25.075 5.527C25.388 5.554 25.567 5.603 25.702 5.675C25.968 5.815 26.185 6.032 26.325 6.298C26.397 6.433 26.446 6.612 26.473 6.925C26.5 7.243 26.5 7.653 26.5 8.24V19.76C26.5 20.347 26.5 20.757 26.473 21.075C26.446 21.388 26.397 21.567 26.325 21.702C26.185 21.968 25.968 22.185 25.702 22.325C25.567 22.397 25.388 22.446 25.075 22.473C24.757 22.5 24.347 22.5 23.76 22.5H7.24C6.653 22.5 6.243 22.5 5.925 22.473C5.612 22.446 5.433 22.397 5.298 22.325C5.032 22.185 4.815 21.968 4.675 21.702C4.603 21.567 4.554 21.388 4.527 21.075C4.5 20.757 4.5 20.347 4.5 19.76V8.24C4.5 7.653 4.5 7.243 4.527 6.925C4.554 6.612 4.603 6.433 4.675 6.298C4.815 6.032 5.032 5.815 5.298 5.675C5.433 5.603 5.612 5.554 5.925 5.527C6.243 5.5 6.653 5.5 7.24 5.5Z" stroke="#5393FF"/>',
      '</g>',
      '<defs>',
      `<linearGradient id="${lowerGradientId}" x1="15.5" y1="2" x2="15.5" y2="23" gradientUnits="userSpaceOnUse">`,
      '<stop stop-color="#93BBFF"/><stop offset="0.884515" stop-color="#81B0FF"/><stop offset="0.884615" stop-color="#4389FF"/><stop offset="1" stop-color="#97BEFF"/>',
      '</linearGradient>',
      `<linearGradient id="${upperGradientId}" x1="15.5" y1="2" x2="15.5" y2="23" gradientUnits="userSpaceOnUse">`,
      '<stop stop-color="#CCDFFF"/><stop offset="0.884515" stop-color="#B2CEFF"/><stop offset="0.884615" stop-color="#89B5FF"/><stop offset="1" stop-color="#97BEFF"/>',
      '</linearGradient>',
      '</defs>',
      '</svg>'
    ].join('');
  }

  function mixNewtabPreviewColor(color, target, amount) {
    return [
      Math.round(color[0] + (target[0] - color[0]) * amount),
      Math.round(color[1] + (target[1] - color[1]) * amount),
      Math.round(color[2] + (target[2] - color[2]) * amount)
    ];
  }

  function newtabPreviewRgbToCss(rgb) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function newtabPreviewRgbToCssAlpha(rgb, alpha) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  function newtabPreviewRgbToCssParts(rgb) {
    return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
  }

  function getNewtabPreviewAccentRgb(item) {
    return item && Array.isArray(item.accentRgb) && item.accentRgb.length === 3
      ? item.accentRgb
      : [59, 130, 246];
  }

  function applyNewtabPreviewRecentTheme(card, item) {
    const accentRgb = getNewtabPreviewAccentRgb(item);
    const accentEmphasis = mixNewtabPreviewColor(accentRgb, [0, 0, 0], 0.18);
    const base = mixNewtabPreviewColor(accentRgb, [255, 255, 255], 0.82);
    const border = mixNewtabPreviewColor(base, [0, 0, 0], 0.1);
    const innerTint = mixNewtabPreviewColor(accentRgb, [255, 255, 255], 0.82);
    card.style.setProperty('--x-nt-recent-card-color', newtabPreviewRgbToCss(base));
    card.style.setProperty('--x-nt-recent-card-border-color', newtabPreviewRgbToCss(border));
    card.style.setProperty('--x-nt-recent-inner-tint-rgb', newtabPreviewRgbToCssParts(innerTint));
    card.style.setProperty('--x-nt-recent-accent-color', newtabPreviewRgbToCss(accentEmphasis));
    card.style.setProperty('--x-nt-recent-accent-soft', newtabPreviewRgbToCssAlpha(accentRgb, 0.12));
    card.style.setProperty('--x-nt-recent-accent-border', newtabPreviewRgbToCssAlpha(accentRgb, 0.18));
  }

  function applyNewtabPreviewBookmarkTheme(card, item) {
    if (!item || item.type === 'folder') {
      card.style.setProperty('--x-nt-bookmark-shadow-rgb', '86, 138, 220');
      return;
    }
    const accentRgb = getNewtabPreviewAccentRgb(item);
    const base = mixNewtabPreviewColor(accentRgb, [255, 255, 255], 0.94);
    const border = mixNewtabPreviewColor(base, [0, 0, 0], 0.07);
    const icon = mixNewtabPreviewColor(accentRgb, [255, 255, 255], 0.96);
    const hover = mixNewtabPreviewColor(accentRgb, [255, 255, 255], 0.9);
    const shadow = mixNewtabPreviewColor(accentRgb, [138, 146, 160], 0.46);
    card.style.setProperty('--x-nt-bookmark-card-color', newtabPreviewRgbToCss(base));
    card.style.setProperty('--x-nt-bookmark-card-hover-color', newtabPreviewRgbToCssAlpha(hover, 0.86));
    card.style.setProperty('--x-nt-bookmark-card-border-color', newtabPreviewRgbToCss(border));
    card.style.setProperty('--x-nt-bookmark-icon-color', newtabPreviewRgbToCss(icon));
    card.style.setProperty('--x-nt-bookmark-shadow-rgb', newtabPreviewRgbToCssParts(shadow));
  }

  const params = new URLSearchParams(window.location.search || '');
  const root = document.querySelector('[data-onboarding-shell]');
  const versionText = document.getElementById('onboarding-version-text');
  const copyPanel = document.getElementById('onboarding-copy-panel');
  const eyebrow = document.getElementById('onboarding-eyebrow');
  const title = document.getElementById('onboarding-title');
  const body = document.getElementById('onboarding-body');
  const bodyPrefix = document.getElementById('onboarding-body-prefix');
  const shortcutLabel = document.getElementById('onboarding-shortcut-label');
  const bodySuffix = document.getElementById('onboarding-body-suffix');
  const bodyNote = document.getElementById('onboarding-body-note');
  const pageStrip = document.getElementById('onboarding-page-strip');
  const interactionSlots = document.getElementById('onboarding-interaction-slots');
  const visualSlot = document.getElementById('onboarding-visual-slot');
  const visualPanel = document.getElementById('onboarding-visual-panel');
  const visualCanvas = document.getElementById('onboarding-visual-canvas');
  const visualStage = document.getElementById('onboarding-visual-stage');
  const cursorLayer = document.getElementById('onboarding-cursor-layer');
  const copyActions = document.querySelector('.onboarding-copy-actions');
  const primaryActionButton = document.querySelector('.onboarding-action-button--primary');
  const secondaryActionButton = document.querySelector('.onboarding-action-button--secondary');
  const ghostActionButton = document.querySelector('.onboarding-action-button--ghost');
  const onboardingPageStripApi = globalThis.LumnoOnboardingPageStrip || {};
  const onboardingActionsApi = globalThis.LumnoOnboardingActions || {};
  const onboardingInteractionsApi = globalThis.LumnoOnboardingInteractions || {};
  const pageStripController = pageStrip &&
      typeof onboardingPageStripApi.createPageStripController === 'function'
    ? onboardingPageStripApi.createPageStripController(pageStrip, {
      onNavigate(slideIndex) {
        dispatch({ type: 'GOTO', index: slideIndex });
      }
    })
    : null;
  const copyActionsController = copyActions &&
      typeof onboardingActionsApi.createActionButtonsController === 'function'
    ? onboardingActionsApi.createActionButtonsController(copyActions, {
      onAction(actionId, event) {
        runExtensionAction(actionId, event);
      },
      onShowTooltip(button) {
        showActionButtonTooltip(button);
      },
      onHideTooltip() {
        hideActionButtonTooltip();
      }
    })
    : null;
  const interactionSlotsController = interactionSlots &&
      typeof onboardingInteractionsApi.createInteractionsController === 'function'
    ? onboardingInteractionsApi.createInteractionsController(interactionSlots, {
      onAction(actionId, event) {
        runExtensionAction(actionId, event);
      },
      onToggleAccordion(accordionId) {
        toggleInteractionAccordion(accordionId);
      },
      onShowInfoTooltip(target, infoTooltip, browserAvatars) {
        showOnboardingInfoTooltip(target, infoTooltip, browserAvatars);
      },
      onHideInfoTooltip() {
        hideOnboardingInfoTooltip();
      }
    })
    : null;
  let blueprint = null;
  let state = null;
  let currentShortcutValue = getDefaultShortcutValue();
  let currentShortcutLabel = getDefaultShortcutLabel();
  let titleCycleInterval = 0;
  let titleCycleFirstTimeout = 0;
  let titleCycleSwapTimeout = 0;
  let titleFitFrame = 0;
  let copySwapTimeout = 0;
  let visualScaleFrame = 0;
  let titleCycleIndex = 0;
  let expandedInteractionAccordionId = '';
  let overlayHoverStartTimeout = 0;
  let overlayHoverStepTimeout = 0;
  let overlayHoverIndex = 0;
  let newtabPreviewHoverStartTimeout = 0;
  let newtabPreviewHoverStepTimeout = 0;
  let newtabPreviewHoverStepIndex = 0;
  let visualResizeObserver = null;
  const onboardingInfoTooltipController = globalThis.LumnoTooltip &&
      typeof globalThis.LumnoTooltip.createController === 'function'
    ? globalThis.LumnoTooltip.createController({
      id: '_x_extension_onboarding_info_tooltip_2026_unique_',
      className: 'onboarding-info-tooltip',
      maxWidth: 360
    })
    : null;
  const actionTooltipController = globalThis.LumnoTooltip &&
      typeof globalThis.LumnoTooltip.createController === 'function'
    ? globalThis.LumnoTooltip.createController({
      id: '_x_extension_onboarding_action_tooltip_2026_unique_',
      className: 'onboarding-info-tooltip',
      maxWidth: 360
    })
    : null;

  function getChromeApi() {
    return typeof chrome !== 'undefined' ? chrome : null;
  }

  function syncOnboardingSlideParam(index) {
    if (!window.history || typeof window.history.replaceState !== 'function' || !window.location || !window.location.href) {
      return;
    }
    const numericIndex = Number(index);
    const safeIndex = Number.isFinite(numericIndex) ? Math.max(0, Math.floor(numericIndex)) : 0;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('slide', String(safeIndex));
      const nextUrl = url.toString();
      if (nextUrl === window.location.href) {
        return;
      }
      window.history.replaceState(window.history.state, '', nextUrl);
    } catch (error) {
      // Ignore URL sync failures; onboarding state should still render normally.
    }
  }

  function buildRuntimePageUrl(path) {
    const value = String(path || '').trim();
    if (!value) {
      return '';
    }
    const chromeApi = getChromeApi();
    const hashIndex = value.indexOf('#');
    const pagePath = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    const hash = hashIndex >= 0 ? value.slice(hashIndex + 1) : '';
    const baseUrl = chromeApi &&
        chromeApi.runtime &&
        typeof chromeApi.runtime.getURL === 'function'
      ? chromeApi.runtime.getURL(pagePath)
      : pagePath;
    return hash ? `${baseUrl}#${hash}` : baseUrl;
  }

  function navigateOnboardingToNewtab() {
    const chromeApi = getChromeApi();
    const routes = globalThis.LumnoExtensionRoutes;
    let url = '';
    if (routes && typeof routes.buildLumnoNewtabUrl === 'function') {
      url = routes.buildLumnoNewtabUrl(chromeApi, { focus: true });
    }
    if (!url && chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getURL === 'function') {
      url = chromeApi.runtime.getURL('src/newtab/lumno-newtab.html?focus=1');
    }
    if (!url && typeof window !== 'undefined' && window.location) {
      try {
        url = new URL(FOCUSED_NEWTAB_RELATIVE_PAGE_PATH, window.location.href).toString();
      } catch (error) {
        url = FOCUSED_NEWTAB_RELATIVE_PAGE_PATH;
      }
    }
    if (!url || typeof window === 'undefined' || !window.location) {
      return false;
    }
    try {
      if (typeof window.location.assign === 'function') {
        window.location.assign(url);
        return true;
      }
      window.location.href = url;
      return true;
    } catch (error) {
      return false;
    }
  }

  function openExtensionPageTab(path, eventOrDisposition) {
    const url = buildRuntimePageUrl(path);
    if (!url) {
      return false;
    }
    const chromeApi = getChromeApi();
    const disposition = typeof eventOrDisposition === 'string'
      ? eventOrDisposition
      : getOpenDisposition(eventOrDisposition, 'newTab');
    if (chromeApi && chromeApi.tabs && typeof chromeApi.tabs.create === 'function') {
      try {
        chromeApi.tabs.create({ url, active: disposition !== 'backgroundTab' });
        return true;
      } catch (error) {
        // Fall through to window.open when the tabs API is unavailable.
      }
    }
    if (typeof window.open === 'function') {
      window.open(url, '_blank', 'noopener');
      return true;
    }
    return false;
  }

  function openSiteSearchOptionsFallback(eventOrDisposition) {
    return openExtensionPageTab(SITE_SEARCH_OPTIONS_PAGE_PATH, eventOrDisposition);
  }

  function getOpenDisposition(event, fallback) {
    if (typeof event === 'string') {
      return event === 'backgroundTab' ? 'backgroundTab' : (fallback || event || 'newTab');
    }
    if (typeof NAVIGATION_DISPOSITION.getDisposition === 'function') {
      return NAVIGATION_DISPOSITION.getDisposition(event, fallback);
    }
    return event && (event.metaKey || event.ctrlKey || Number(event.button) === 1)
      ? 'backgroundTab'
      : (fallback || 'newTab');
  }

  function openExternalTab(url, eventOrDisposition) {
    const targetUrl = String(url || '').trim();
    if (!targetUrl) {
      return false;
    }
    const chromeApi = getChromeApi();
    const disposition = typeof eventOrDisposition === 'string'
      ? eventOrDisposition
      : getOpenDisposition(eventOrDisposition, 'newTab');
    if (chromeApi && chromeApi.runtime && typeof chromeApi.runtime.sendMessage === 'function') {
      try {
        chromeApi.runtime.sendMessage({ action: 'createTab', url: targetUrl, disposition }, (response) => {
          const lastError = chromeApi.runtime && chromeApi.runtime.lastError;
          if (!lastError && response && response.ok !== false) {
            return;
          }
          if (typeof window.open === 'function') {
            window.open(targetUrl, '_blank', 'noopener');
          }
        });
        return true;
      } catch (error) {
        // Fall through to window.open when extension messaging is unavailable.
      }
    }
    if (typeof window.open === 'function') {
      window.open(targetUrl, '_blank', 'noopener');
      return true;
    }
    return false;
  }

  function setText(element, value) {
    if (!element) {
      return;
    }
    const text = String(value || '');
    element.textContent = text;
    element.dataset.empty = text ? 'false' : 'true';
  }

  function getCssTimeMs(value, fallback) {
    const raw = String(value || '').trim();
    if (!raw) {
      return fallback;
    }
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return raw.endsWith('s') && !raw.endsWith('ms') ? numeric * 1000 : numeric;
  }

  function getTextSwapDurationMs() {
    if (typeof getComputedStyle !== 'function' || !document.documentElement) {
      return TEXT_SWAP_FALLBACK_DURATION_MS;
    }
    return getCssTimeMs(
      getComputedStyle(document.documentElement).getPropertyValue('--text-swap-dur'),
      TEXT_SWAP_FALLBACK_DURATION_MS
    );
  }

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isMacPlatform() {
    return /Mac|iPhone|iPad|iPod/i.test(String(navigator.platform || ''));
  }

  function getDefaultShortcutValue() {
    return isMacPlatform() ? 'Command+Shift+K' : 'Ctrl+Shift+K';
  }

  function getDefaultShortcutLabel() {
    return formatShortcutForDisplay(getDefaultShortcutValue()) || getDefaultShortcutValue();
  }

  function normalizeShortcutValue(value) {
    return String(value || '').trim().replace(/\s*\+\s*/g, '+');
  }

  function getShortcutDisplayTokens(shortcut) {
    if (typeof MODEL.getShortcutDisplayTokens === 'function') {
      return MODEL.getShortcutDisplayTokens(shortcut, { preferSymbols: isMacPlatform() });
    }
    const value = normalizeShortcutValue(shortcut);
    if (!value) {
      return [];
    }
    const parts = value.split('+').filter(Boolean);
    if (parts.length === 0) {
      return [];
    }
    const shouldUseSymbols = isMacPlatform() || parts.some((part) => /^(?:Command|Cmd|Meta)$/i.test(part));
    const keyToken = parts.pop();
    const tokens = [];
    parts.forEach((token) => {
      const lower = token.toLowerCase();
      if (!shouldUseSymbols) {
        tokens.push(lower === 'command' || lower === 'cmd' || lower === 'meta' ? 'Cmd' : token);
        return;
      }
      if (lower === 'command' || lower === 'cmd' || lower === 'meta') {
        tokens.push('⌘');
      } else if (lower === 'shift') {
        tokens.push('⇧');
      } else if (lower === 'ctrl' || lower === 'control' || lower === 'macctrl') {
        tokens.push('⌃');
      } else if (lower === 'alt' || lower === 'option') {
        tokens.push('⌥');
      }
    });
    const keyMapMac = {
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Enter: '↩',
      Return: '↩',
      Escape: '⎋',
      Esc: '⎋',
      Tab: '⇥',
      Space: 'Space',
      Spacebar: 'Space',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Semicolon: ';',
      Quote: '\'',
      Minus: '-',
      Plus: '+',
      Backslash: '\\',
      Backquote: '`',
      BracketLeft: '[',
      BracketRight: ']'
    };
    const keyMapDefault = {
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Escape: 'Esc',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Semicolon: ';',
      Quote: '\'',
      Minus: '-',
      Plus: '+',
      Backslash: '\\',
      Backquote: '`',
      BracketLeft: '[',
      BracketRight: ']'
    };
    const keyLabel = shouldUseSymbols
      ? (keyMapMac[keyToken] || keyToken)
      : (keyMapDefault[keyToken] || keyToken);
    tokens.push(keyLabel);
    return tokens.map((token) => {
      const text = String(token || '');
      return text.length > 1 ? text.toUpperCase() : text;
    });
  }

  function formatShortcutForDisplay(shortcut) {
    if (typeof MODEL.formatShortcutForDisplay === 'function') {
      return MODEL.formatShortcutForDisplay(shortcut, { preferSymbols: isMacPlatform() });
    }
    const tokens = getShortcutDisplayTokens(shortcut);
    if (tokens.length === 0) {
      return '';
    }
    const value = normalizeShortcutValue(shortcut);
    const shouldUseSymbols = isMacPlatform() || value.split('+').some((part) => /^(?:Command|Cmd|Meta)$/i.test(part));
    return tokens.join(shouldUseSymbols ? '' : '+');
  }

  function loadCurrentShortcut(callback) {
    const chromeApi = getChromeApi();
    const fallback = getDefaultShortcutValue();
    if (!chromeApi || !chromeApi.commands || typeof chromeApi.commands.getAll !== 'function') {
      callback(fallback);
      return;
    }
    try {
      chromeApi.commands.getAll((commands) => {
        if (chromeApi.runtime && chromeApi.runtime.lastError) {
          callback(fallback);
          return;
        }
        const items = Array.isArray(commands) ? commands : [];
        const command = items.find((item) => item && item.name === SHOW_SEARCH_COMMAND_NAME);
        const shortcut = command && typeof command.shortcut === 'string'
          ? command.shortcut
          : '';
        callback(shortcut || fallback);
      });
    } catch (error) {
      callback(fallback);
    }
  }

  function shortcutHotkeyMatchesEvent(shortcut, event) {
    if (typeof MODEL.shortcutHotkeyMatchesEvent === 'function') {
      return MODEL.shortcutHotkeyMatchesEvent(shortcut, event);
    }
    return false;
  }

  function isEditableTarget(target) {
    const element = target && target.nodeType === 1
      ? target
      : (target && target.parentElement ? target.parentElement : null);
    if (!element || !element.closest) {
      return false;
    }
    return Boolean(element.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  }

  function updateCurrentShortcut(shortcut, shouldRender) {
    const value = shortcut || getDefaultShortcutValue();
    const nextShortcutLabel = formatShortcutForDisplay(value) || getDefaultShortcutLabel();
    const changed = value !== currentShortcutValue || nextShortcutLabel !== currentShortcutLabel;
    currentShortcutValue = value;
    currentShortcutLabel = nextShortcutLabel;
    if (changed && shouldRender && blueprint && state) {
      render();
    }
  }

  function refreshCurrentShortcut(shouldRender) {
    loadCurrentShortcut((shortcut) => {
      updateCurrentShortcut(shortcut, shouldRender);
    });
  }

  function getCurrentOnboardingTab(callback) {
    const chromeApi = getChromeApi();
    const done = typeof callback === 'function' ? callback : () => {};
    if (!chromeApi || !chromeApi.tabs || typeof chromeApi.tabs.getCurrent !== 'function') {
      done(null);
      return;
    }
    try {
      chromeApi.tabs.getCurrent((tab) => {
        if (chromeApi.runtime && chromeApi.runtime.lastError) {
          done(null);
          return;
        }
        done(tab || null);
      });
    } catch (error) {
      done(null);
    }
  }

  function getOnboardingTabZoomFactor(tabId, callback) {
    const chromeApi = getChromeApi();
    const done = typeof callback === 'function' ? callback : () => {};
    if (!chromeApi || !chromeApi.tabs || typeof chromeApi.tabs.getZoom !== 'function' || typeof tabId !== 'number') {
      done(1);
      return;
    }
    try {
      chromeApi.tabs.getZoom(tabId, (zoomFactor) => {
        if (chromeApi.runtime && chromeApi.runtime.lastError) {
          done(1);
          return;
        }
        const zoom = Number(zoomFactor);
        done(Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
      });
    } catch (error) {
      done(1);
    }
  }

  function getOnboardingOverlayTabs(currentTabId, callback) {
    const chromeApi = getChromeApi();
    const done = typeof callback === 'function' ? callback : () => {};
    if (!chromeApi || !chromeApi.runtime || typeof chromeApi.runtime.sendMessage !== 'function') {
      done([], currentTabId);
      return;
    }
    const request = { action: 'getTabsForOverlay' };
    if (typeof currentTabId === 'number') {
      request.currentTabId = currentTabId;
    }
    try {
      chromeApi.runtime.sendMessage(request, (response) => {
        if (chromeApi.runtime && chromeApi.runtime.lastError) {
          done([], currentTabId);
          return;
        }
        const tabs = response && Array.isArray(response.tabs) ? response.tabs : [];
        const responseCurrentTabId = response && typeof response.currentTabId === 'number'
          ? response.currentTabId
          : currentTabId;
        done(tabs, responseCurrentTabId);
      });
    } catch (error) {
      done([], currentTabId);
    }
  }

  function triggerOnboardingSearchOverlay() {
    const toggleOverlay = window._x_extension_toggleSearchOverlay_2026_unique_;
    if (typeof toggleOverlay !== 'function') {
      return;
    }
    getCurrentOnboardingTab((tab) => {
      const currentTabId = tab && typeof tab.id === 'number' ? tab.id : null;
      getOnboardingTabZoomFactor(currentTabId, (tabZoomFactor) => {
        getOnboardingOverlayTabs(currentTabId, (tabs, responseCurrentTabId) => {
          toggleOverlay(tabs, {
            tabZoomFactor,
            currentTabId: typeof responseCurrentTabId === 'number' ? responseCurrentTabId : currentTabId,
            currentTabUrl: window.location && window.location.href ? window.location.href : ''
          });
        });
      });
    });
  }

  function handleOnboardingCommandMessage(request, sender, sendResponse) {
    if (!request || request.action !== ONBOARDING_SEARCH_OVERLAY_COMMAND_ACTION) {
      return false;
    }
    const requestedTabId = Number.isFinite(Number(request.tabId)) ? Number(request.tabId) : null;
    getCurrentOnboardingTab((tab) => {
      const currentTabId = tab && typeof tab.id === 'number' ? tab.id : null;
      if (typeof requestedTabId === 'number' && typeof currentTabId === 'number' && currentTabId !== requestedTabId) {
        if (typeof sendResponse === 'function') {
          sendResponse({ ok: false, reason: 'tab-mismatch' });
        }
        return;
      }
      triggerOnboardingSearchOverlay();
      if (typeof sendResponse === 'function') {
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  function getRuntimeLocale(callback) {
    const chromeApi = getChromeApi();
    const fromParam = params.get('locale') || params.get('lang') || '';
    if (fromParam) {
      callback(MODEL.normalizeLocale(fromParam));
      return;
    }
    if (!chromeApi || !chromeApi.storage) {
      callback(MODEL.normalizeLocale(getBrowserLocale()));
      return;
    }
    const storageArea = chromeApi.storage.sync || chromeApi.storage.local;
    if (!storageArea || typeof storageArea.get !== 'function') {
      callback(MODEL.normalizeLocale(getBrowserLocale()));
      return;
    }
    try {
      storageArea.get([LANGUAGE_STORAGE_KEY], (result) => {
        const runtimeError = chromeApi.runtime ? chromeApi.runtime.lastError : null;
        const stored = !runtimeError && result ? result[LANGUAGE_STORAGE_KEY] : '';
        const locale = stored && stored !== 'system'
          ? stored
          : getBrowserLocale();
        callback(MODEL.normalizeLocale(locale));
      });
    } catch (e) {
      callback(MODEL.normalizeLocale(getBrowserLocale()));
    }
  }

  function getBrowserLocale() {
    const chromeApi = getChromeApi();
    if (chromeApi && chromeApi.i18n && typeof chromeApi.i18n.getUILanguage === 'function') {
      try {
        return chromeApi.i18n.getUILanguage() || navigator.language || 'en';
      } catch (error) {
        return navigator.language || 'en';
      }
    }
    return navigator.language || 'en';
  }

  function updateVersionChip() {
    const chromeApi = getChromeApi();
    const versionFromParams = (params.get('version') || '').trim();
    const manifestVersion = chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getManifest === 'function'
      ? String((chromeApi.runtime.getManifest() || {}).version || '').trim()
      : '';
    const version = versionFromParams || (manifestVersion ? `v${manifestVersion}` : '');
    if (!versionText) {
      return;
    }
    versionText.textContent = version || '';
    const chip = versionText.closest('.version-chip');
    if (chip) {
      chip.hidden = !version;
    }
  }

  function createIcon(className) {
    const icon = document.createElement('i');
    icon.className = `ri-icon ${className || 'ri-arrow-right-line'}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  }

  function escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function createSkeletonLine(className) {
    const line = document.createElement('span');
    line.className = className;
    line.setAttribute('aria-hidden', 'true');
    return line;
  }

  function createBrowserAvatar(browser) {
    const id = String(browser && browser.id || '').trim().toLowerCase();
    const name = String(browser && browser.name || '').trim();
    const src = String(browser && browser.src || '').trim();
    const avatar = document.createElement('span');
    avatar.className = `browser-avatar ${BROWSER_AVATAR_CLASS_BY_ID[id] || 'browser-avatar--fallback'}`;
    avatar.setAttribute('aria-hidden', 'true');
    if (name) {
      avatar.title = name;
    }
    if (src) {
      const image = document.createElement('img');
      image.className = 'browser-avatar-image';
      image.src = src;
      image.alt = '';
      image.decoding = 'async';
      image.setAttribute('aria-hidden', 'true');
      image.addEventListener('error', () => {
        avatar.textContent = (name || id || '?').slice(0, 1).toUpperCase();
      });
      avatar.appendChild(image);
      return avatar;
    }
    avatar.textContent = (name || id || '?').slice(0, 1).toUpperCase();
    return avatar;
  }

  function createBrowserAvatarGroup(browsers) {
    const items = Array.isArray(browsers) ? browsers : [];
    const names = items.map((browser) => browser && browser.name).filter(Boolean);
    const group = document.createElement('span');
    group.className = 'browser-avatar-group';
    group.setAttribute('role', 'img');
    const separator = getRuntimeMiscText('browserNameSeparator', ', ');
    const suffix = getRuntimeMiscText('browserAvatarSuffix', 'and more');
    group.setAttribute('aria-label', names.length > 0 ? `${names.join(separator)} ${suffix}`.trim() : '');
    items.forEach((browser) => {
      group.appendChild(createBrowserAvatar(browser));
    });
    const ellipsis = document.createElement('span');
    ellipsis.className = 'browser-avatar-ellipsis';
    ellipsis.setAttribute('aria-hidden', 'true');
    ellipsis.textContent = '…';
    group.appendChild(ellipsis);
    return group;
  }

  function createInteractionRowIcon(iconClass) {
    const className = String(iconClass || '').trim();
    if (!className) {
      return null;
    }
    const iconSlot = document.createElement('span');
    iconSlot.className = 'interaction-row-icon';
    iconSlot.appendChild(createIcon(className));
    return iconSlot;
  }

  function getBrowserTooltipText(browserAvatars) {
    const browsers = browserAvatars && Array.isArray(browserAvatars.browsers)
      ? browserAvatars.browsers
      : [];
    return browsers.map((browser) => browser && browser.name).filter(Boolean)
      .join(getRuntimeMiscText('browserNameSeparator', ', '));
  }

  function renderBrowserAvatarTooltip(element, browserAvatars) {
    if (!element) {
      return;
    }
    element.classList.add('onboarding-browser-tooltip');
    element.replaceChildren(createBrowserAvatarGroup(browserAvatars.browsers));
  }

  function positionBrowserAvatarTooltip(element, target) {
    if (!element || !target || typeof target.getBoundingClientRect !== 'function') {
      return;
    }
    element.style.setProperty('max-width', '220px');
    element.style.setProperty('width', 'max-content');
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = element.getBoundingClientRect();
    const margin = 8;
    const spacing = 8;
    let left = targetRect.right + spacing;
    let top = targetRect.top + ((targetRect.height - tooltipRect.height) / 2);
    if (left + tooltipRect.width > window.innerWidth - margin) {
      left = targetRect.left - tooltipRect.width - spacing;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
    element.style.setProperty('left', `${Math.round(left)}px`);
    element.style.setProperty('top', `${Math.round(top)}px`);
  }

  function renderInfoTooltipContent(element, infoTooltip, browserAvatars, text) {
    if (!element) {
      return;
    }
    if (infoTooltip && infoTooltip.type === 'browser-avatars' && browserAvatars) {
      renderBrowserAvatarTooltip(element, browserAvatars);
      return;
    }
    element.classList.remove('onboarding-browser-tooltip');
    if (globalThis.LumnoTooltip && typeof globalThis.LumnoTooltip.renderText === 'function') {
      globalThis.LumnoTooltip.renderText(element, text);
    }
  }

  function showOnboardingInfoTooltip(button, infoTooltip, browserAvatars) {
    const text = String(infoTooltip && infoTooltip.text || getBrowserTooltipText(browserAvatars) || '').trim();
    if (!onboardingInfoTooltipController || !button || !text) {
      return;
    }
    const options = {
      placement: 'top',
      maxWidth: 360,
      spacing: infoTooltip && infoTooltip.type === 'browser-avatars' ? 24 : 8
    };
    const element = onboardingInfoTooltipController.show(button, text, options);
    renderInfoTooltipContent(element, infoTooltip, browserAvatars, text);
    if (infoTooltip && infoTooltip.type === 'browser-avatars') {
      positionBrowserAvatarTooltip(element, button);
    } else if (globalThis.LumnoTooltip && typeof globalThis.LumnoTooltip.position === 'function') {
      globalThis.LumnoTooltip.position(element, button, options);
    }
  }

  function hideOnboardingInfoTooltip() {
    if (!onboardingInfoTooltipController) {
      return;
    }
    onboardingInfoTooltipController.hide();
  }

  function getActionButtonTooltipMaxWidth(button) {
    const value = Number.parseInt(button && button.dataset && button.dataset.tooltipMaxWidth || '', 10);
    return Number.isFinite(value) && value > 0 ? value : 360;
  }

  function showActionButtonTooltip(button) {
    const text = String(button && button.dataset && button.dataset.tooltip || '').trim();
    if (!actionTooltipController || !button || !text) {
      return;
    }
    const maxWidth = getActionButtonTooltipMaxWidth(button);
    actionTooltipController.show(button, text, {
      placement: 'top',
      maxWidth,
      spacing: 8
    });
  }

  function hideActionButtonTooltip() {
    if (!actionTooltipController) {
      return;
    }
    actionTooltipController.hide();
  }

  function bindActionButtonTooltip(button) {
    if (!button || button.dataset.tooltipBound === 'true') {
      return;
    }
    button.dataset.tooltipBound = 'true';
    button.addEventListener('mouseenter', () => showActionButtonTooltip(button));
    button.addEventListener('mouseleave', hideActionButtonTooltip);
    button.addEventListener('focus', () => showActionButtonTooltip(button));
    button.addEventListener('blur', hideActionButtonTooltip);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideActionButtonTooltip();
        button.blur();
      }
    });
  }

  function createInteractionInfoButton(infoTooltip, browserAvatars) {
    const text = String(infoTooltip && infoTooltip.text || getBrowserTooltipText(browserAvatars) || '').trim();
    const button = document.createElement('button');
    button.className = 'interaction-info-button';
    button.type = 'button';
    button.dataset.tooltip = text;
    if (infoTooltip && infoTooltip.type) {
      button.dataset.tooltipType = infoTooltip.type;
    }
    button.setAttribute('aria-label', String(infoTooltip && infoTooltip.label || getRuntimeMiscText('infoLabel', 'Info')));
    button.appendChild(createIcon(String(infoTooltip && infoTooltip.icon || 'ri-information-line')));
    const showTooltip = () => showOnboardingInfoTooltip(button, infoTooltip, browserAvatars);
    button.addEventListener('mouseenter', showTooltip);
    button.addEventListener('mouseleave', hideOnboardingInfoTooltip);
    button.addEventListener('focus', showTooltip);
    button.addEventListener('blur', hideOnboardingInfoTooltip);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showTooltip();
    });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideOnboardingInfoTooltip();
        button.blur();
      }
    });
    return button;
  }

  function createInteractionLinkButton(linkButton) {
    const href = String(linkButton && linkButton.href || '').trim();
    const label = String(linkButton && linkButton.label || 'GitHub repo').trim() || 'GitHub repo';
    const tooltip = String(linkButton && linkButton.tooltip || label).trim() || label;
    const link = document.createElement('a');
    link.className = 'interaction-info-button interaction-link-button';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.dataset.tooltip = tooltip;
    link.setAttribute('aria-label', label);
    link.appendChild(createIcon(String(linkButton && linkButton.icon || 'ri-github-fill')));
    const tooltipModel = { text: tooltip };
    const showTooltip = () => showOnboardingInfoTooltip(link, tooltipModel, null);
    link.addEventListener('mouseenter', showTooltip);
    link.addEventListener('mouseleave', hideOnboardingInfoTooltip);
    link.addEventListener('focus', showTooltip);
    link.addEventListener('blur', hideOnboardingInfoTooltip);
    link.addEventListener('click', hideOnboardingInfoTooltip);
    link.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideOnboardingInfoTooltip();
        link.blur();
      }
    });
    return link;
  }

  function createInteractionLabel(slot) {
    const label = document.createElement('span');
    label.className = 'interaction-label';
    label.textContent = slot.label;
    return label;
  }

  function getInteractionAccordionId(slot) {
    return String(slot && (slot.accordionId || slot.id) || '').trim();
  }

  function isInteractionAccordionExpanded(slot) {
    const accordionId = getInteractionAccordionId(slot);
    if (!slot || !slot.accordion || !accordionId) {
      return false;
    }
    if (expandedInteractionAccordionId) {
      return accordionId === expandedInteractionAccordionId;
    }
    return slot.accordion.expandedByDefault === true;
  }

  function createInteractionAccordionChevron(accordion) {
    const chevron = document.createElement('span');
    chevron.className = 'interaction-accordion-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.appendChild(createIcon(String(accordion && accordion.icon || 'ri-arrow-left-s-line')));
    return chevron;
  }

  function createInteractionAccordionTrigger(slot) {
    const trigger = document.createElement('button');
    const isExpanded = isInteractionAccordionExpanded(slot);
    trigger.className = 'interaction-accordion-trigger';
    trigger.type = 'button';
    trigger.dataset.action = slot.actionId;
    trigger.dataset.accordionId = getInteractionAccordionId(slot);
    trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    trigger.setAttribute('aria-controls', `${slot.id}-accordion`);
    trigger.id = `${slot.id}-accordion-trigger`;
    trigger.appendChild(createInteractionLabel(slot));
    trigger.appendChild(createInteractionAccordionChevron(slot.accordion));
    return trigger;
  }

  function appendLinkedText(target, text, links) {
    const sourceText = String(text || '');
    if (!target) {
      return;
    }
    const linkItems = (Array.isArray(links) ? links : [])
      .map((link) => {
        const label = String(link && link.label || '').trim();
        const href = String(link && link.href || '').trim();
        const actionId = String(link && link.actionId || '').trim();
        const index = label ? sourceText.indexOf(label) : -1;
        if (!label || !href || index < 0) {
          return null;
        }
        return { label, href, actionId, index };
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
    let cursor = 0;
    linkItems.forEach(({ label, href, actionId, index }) => {
      if (index < cursor) {
        return;
      }
      if (index > cursor) {
        target.appendChild(document.createTextNode(sourceText.slice(cursor, index)));
      }
      const anchor = document.createElement('a');
      anchor.className = 'interaction-accordion-link';
      anchor.href = href;
      if (actionId) {
        anchor.dataset.action = actionId;
      }
      anchor.textContent = label;
      target.appendChild(anchor);
      cursor = index + label.length;
    });
    if (cursor < sourceText.length) {
      target.appendChild(document.createTextNode(sourceText.slice(cursor)));
    }
  }

  function createInteractionAccordionPanel(slot, isExpanded) {
    const text = String(slot && slot.accordion && slot.accordion.text || '').trim();
    if (!text) {
      return null;
    }
    const panel = document.createElement('span');
    panel.id = `${slot.id}-accordion`;
    panel.className = 'interaction-accordion-panel';
    panel.dataset.open = isExpanded ? 'true' : 'false';
    panel.setAttribute('aria-labelledby', `${slot.id}-accordion-trigger`);

    const textNode = document.createElement('span');
    textNode.className = 'interaction-accordion-text t-panel-slide';
    textNode.dataset.open = isExpanded ? 'true' : 'false';
    textNode.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
    appendLinkedText(textNode, text, slot.accordion.links);

    panel.appendChild(textNode);
    return panel;
  }

  function updateInteractionAccordionRows() {
    if (!interactionSlots) {
      return;
    }
    if (interactionSlotsController) {
      interactionSlotsController.setExpandedAccordionId(
        expandedInteractionAccordionId
      );
      return;
    }
    interactionSlots
      .querySelectorAll('.interaction-slot--accordion[data-accordion-id]')
      .forEach((item) => {
        const expanded = item.dataset.accordionId === expandedInteractionAccordionId ? 'true' : 'false';
        item.dataset.expanded = expanded;
        const trigger = item.querySelector('.interaction-accordion-trigger');
        if (trigger) {
          trigger.setAttribute('aria-expanded', expanded);
        }
        const panel = item.querySelector('.interaction-accordion-panel');
        if (panel) {
          panel.dataset.open = expanded;
        }
        const textNode = item.querySelector('.interaction-accordion-text');
        if (textNode) {
          textNode.dataset.open = expanded;
          textNode.setAttribute('aria-hidden', expanded === 'true' ? 'false' : 'true');
        }
      });
  }

  function toggleInteractionAccordion(accordionId) {
    const id = String(accordionId || '').trim();
    if (!id) {
      return;
    }
    expandedInteractionAccordionId = expandedInteractionAccordionId === id ? '' : id;
    updateInteractionAccordionRows();
  }

  function createInteractionSlot(slot) {
    const hasAction = Boolean(slot.actionId);
    const hasInfoTooltip = Boolean(slot.infoTooltip && (slot.infoTooltip.text || slot.infoTooltip.type));
    const hasLinkButton = Boolean(slot.linkButton && slot.linkButton.href);
    const hasAccordion = Boolean(slot.accordion && slot.accordion.text);
    const hasInlineAffordance = hasInfoTooltip || hasLinkButton;
    const accordionId = getInteractionAccordionId(slot);
    const isAccordionExpanded = hasAccordion && isInteractionAccordionExpanded(slot);
    const itemHasAction = hasAction && !hasAccordion;
    const item = document.createElement(itemHasAction ? 'button' : 'div');
    item.className = `interaction-slot${itemHasAction ? '' : ' interaction-slot--static'}`;
    if (itemHasAction) {
      item.type = 'button';
      item.dataset.action = slot.actionId;
    }
    item.dataset.interactionKind = slot.kind;
    if (hasAccordion) {
      item.classList.add('interaction-slot--accordion');
      item.dataset.accordionId = accordionId;
      item.dataset.expanded = isAccordionExpanded ? 'true' : 'false';
    }
    if (hasInlineAffordance) {
      item.classList.add('interaction-slot--with-info');
    }

    const copy = document.createElement('span');
    copy.className = 'interaction-copy';
    if (hasInlineAffordance) {
      copy.classList.add('interaction-copy--with-info');
    }
    if (slot.label && hasAccordion) {
      copy.appendChild(createInteractionAccordionTrigger(slot));
    } else if (slot.label) {
      copy.appendChild(createInteractionLabel(slot));
    } else {
      copy.appendChild(createSkeletonLine('skeleton-line skeleton-line--label'));
      copy.appendChild(createSkeletonLine('skeleton-line skeleton-line--meta'));
    }
    if (hasInfoTooltip) {
      copy.appendChild(createInteractionInfoButton(slot.infoTooltip, slot.browserAvatars));
    }
    if (hasLinkButton) {
      copy.appendChild(createInteractionLinkButton(slot.linkButton));
    }

    const icon = createInteractionRowIcon(slot.icon);
    if (icon) {
      item.appendChild(icon);
    }
    item.appendChild(copy);
    const accordionPanel = createInteractionAccordionPanel(slot, isAccordionExpanded);
    if (accordionPanel) {
      item.appendChild(accordionPanel);
    }
    return item;
  }

  function renderInteractions(slide) {
    if (!interactionSlots) {
      return;
    }
    hideOnboardingInfoTooltip();
    const hasAccordion = slide.left.interactionSlots.some((slot) => slot.accordion && slot.accordion.text);
    interactionSlots.dataset.accordion = hasAccordion ? 'true' : 'false';
    if (interactionSlotsController) {
      interactionSlotsController.render({
        slots: slide.left.interactionSlots,
        expandedAccordionId: expandedInteractionAccordionId
      });
      return;
    }
    interactionSlots.textContent = '';
    slide.left.interactionSlots.forEach((slot) => {
      interactionSlots.appendChild(createInteractionSlot(slot));
    });
  }

  function createSurfaceRail() {
    const rail = document.createElement('div');
    rail.className = 'surface-rail';
    for (let index = 0; index < 3; index += 1) {
      rail.appendChild(createSkeletonLine('surface-rail-dot'));
    }
    return rail;
  }

  function createSurfacePanel(className, rows) {
    const panel = document.createElement('div');
    panel.className = className;
    for (let index = 0; index < rows; index += 1) {
      panel.appendChild(createSkeletonLine(`surface-row surface-row--${index + 1}`));
    }
    return panel;
  }

  function createGenericVisualSurface() {
    const surface = document.createElement('div');
    surface.className = 'visual-surface';

    const chromeBar = document.createElement('div');
    chromeBar.className = 'surface-chrome';
    chromeBar.appendChild(createSurfaceRail());
    chromeBar.appendChild(createSkeletonLine('surface-address'));

    const bodyGrid = document.createElement('div');
    bodyGrid.className = 'surface-body';
    bodyGrid.appendChild(createSurfacePanel('surface-panel', 4));
    bodyGrid.appendChild(createSurfacePanel('surface-panel', 3));

    surface.appendChild(chromeBar);
    surface.appendChild(bodyGrid);
    return surface;
  }

  function createSuggestionInlineIcon(iconName, tone) {
    const icon = document.createElement('span');
    icon.className = 'x-ov-suggestion-inline-icon';
    if (tone) {
      icon.dataset.tone = tone;
    }
    icon.appendChild(createIcon(iconName));
    return icon;
  }

  function createLumnoOverlayFavicon(result) {
    if (result && (result.type === 'newtab' || result.type === 'googleSuggest')) {
      return createSuggestionInlineIcon('ri-search-line', 'subtext');
    }
    if (result && result.type === 'browserPage') {
      return createSuggestionInlineIcon('ri-link');
    }
    if (result && result.type === 'commandNewTab') {
      return createSuggestionInlineIcon('ri-add-line', 'subtext');
    }
    if (result && result.type === 'commandSettings') {
      return createSuggestionInlineIcon('ri-settings-3-line', 'subtext');
    }
    const src = String(result && result.favicon || '').trim();
    if (!src) {
      return createSuggestionInlineIcon('ri-link');
    }
    const image = document.createElement('img');
    image.className = 'x-ov-suggestion-favicon';
    image.src = src;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      if (image.parentNode) {
        const iconSlot = image.parentElement;
        if (iconSlot) {
          iconSlot.dataset.favicon = 'false';
        }
        image.parentNode.replaceChild(createSuggestionInlineIcon('ri-link'), image);
      }
    });
    return image;
  }

  function appendHighlightedQueryText(target, text, query) {
    const value = String(text || '');
    const needle = String(query || '').trim();
    if (!target || !needle) {
      if (target) {
        target.textContent = value;
      }
      return;
    }
    const parts = value.split(new RegExp(`(${escapeRegExp(needle)})`, 'gi'));
    parts.forEach((part) => {
      if (!part) {
        return;
      }
      if (part.toLowerCase() === needle.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.style.background = 'var(--x-ext-mark-bg, #CFE8FF)';
        mark.style.color = 'var(--x-ext-mark-text, #1E3A8A)';
        mark.style.padding = '0 1px';
        mark.style.borderRadius = '2px';
        mark.style.lineHeight = 'inherit';
        mark.textContent = part;
        target.appendChild(mark);
        return;
      }
      target.appendChild(document.createTextNode(part));
    });
  }

  function getTypingCharacters(text) {
    return Array.from(String(text || ''));
  }

  function appendOnboardingTypingCharacters(target, text, durationMs) {
    if (!target) {
      return;
    }
    target.textContent = '';
    const characters = getTypingCharacters(text);
    const stepMs = Number(durationMs) / Math.max(1, characters.length);
    characters.forEach((character, index) => {
      const span = document.createElement('span');
      span.className = 'onboarding-typing-char';
      span.style.setProperty('--typing-char-delay', `${Math.round((index + 1) * stepMs)}ms`);
      span.textContent = character;
      target.appendChild(span);
    });
  }

  function createLumnoOverlaySourceTag(result) {
    const sourceTag = document.createElement('span');
    sourceTag.className = 'x-ov-suggestion-source-tag';
    sourceTag.dataset.visible = result.sourceTag ? 'true' : 'false';
    sourceTag.textContent = result.sourceTag || '';
    if (result.sourceTagKind === 'bookmark') {
      sourceTag.style.setProperty('--x-ov-suggestion-source-tag-bg', 'var(--x-ov-bookmark-tag-bg, #FEF3C7)');
      sourceTag.style.setProperty('--x-ov-suggestion-source-tag-text', 'var(--x-ov-bookmark-tag-text, #D97706)');
    }
    return sourceTag;
  }

  function createLumnoOverlayActionTag(labelText, keyLabel) {
    const tag = document.createElement('span');
    tag.className = 'x-ov-action-tag';

    const label = document.createElement('span');
    label.className = 'x-ov-action-tag__label';
    label.textContent = labelText || getRuntimeMiscText('openLabel', 'Open');

    const keycap = document.createElement('span');
    keycap.className = 'x-ov-action-tag__key';
    keycap.textContent = keyLabel || 'Enter';

    tag.appendChild(label);
    tag.appendChild(keycap);
    return tag;
  }

  function appendInlineLabelWithIcon(container, labelText, iconClass) {
    const label = document.createElement('span');
    label.className = 'x-ov-inline-label';
    label.textContent = labelText || getRuntimeMiscText('openLabel', 'Open');

    const icon = document.createElement('span');
    icon.className = 'x-ov-inline-icon';
    icon.appendChild(createIcon(iconClass || 'ri-arrow-right-line ri-size-12'));

    container.appendChild(label);
    container.appendChild(icon);
  }

  function createLumnoOverlayResult(result, index, total) {
    const item = document.createElement('div');
    item.className = 'x-ov-suggestion-item lumno-overlay-result';
    item.dataset.active = result.active ? 'true' : 'false';
    item.dataset.type = result.type || '';
    item.dataset.last = index === total - 1 ? 'true' : 'false';
    item.dataset.demoIndex = String(index);
    item.dataset.hasActionTags = result.actionTagLabel ? 'true' : 'false';
    item.dataset.historyDeletable = result.historyDeletable ? 'true' : 'false';
    item.style.setProperty('--result-index', String(index));

    const leftSide = document.createElement('div');
    leftSide.className = 'x-ov-suggestion-left';
    leftSide.dataset.motion = 'true';

    const iconNode = createLumnoOverlayFavicon(result);
    const iconSlot = document.createElement('span');
    iconSlot.className = 'x-ov-suggestion-icon-slot';
    iconSlot.dataset.favicon = iconNode.tagName === 'IMG' ? 'true' : 'false';
    iconSlot.dataset.emphasis = result.active ? 'true' : 'false';
    iconSlot.appendChild(iconNode);

    const textWrapper = document.createElement('div');
    textWrapper.className = 'x-ov-suggestion-text';

    const titleNode = document.createElement('span');
    titleNode.className = 'x-ov-suggestion-title';
    appendHighlightedQueryText(titleNode, result.title, getLumnoOverlayQuery());
    textWrapper.appendChild(titleNode);

    if (result.detail) {
      const detailNode = document.createElement('span');
      detailNode.className = result.type === 'bookmark'
        ? 'x-ov-suggestion-bookmark-path'
        : 'x-ov-suggestion-url-line';
      detailNode.textContent = result.detail || '';
      textWrapper.appendChild(detailNode);
    }

    const sourceTag = createLumnoOverlaySourceTag(result);
    if (result.sourceTag) {
      textWrapper.appendChild(sourceTag);
    }

    leftSide.appendChild(iconSlot);
    leftSide.appendChild(textWrapper);

    const rightSide = document.createElement('div');
    rightSide.className = 'x-ov-suggestion-right';
    rightSide.setAttribute('data-action-column', 'true');

    const actionTags = document.createElement('div');
    actionTags.className = 'x-ov-suggestion-action-tags';
    actionTags.dataset.visible = result.active && result.actionTagLabel ? 'true' : 'false';
    if (result.actionTagLabel) {
      actionTags.appendChild(createLumnoOverlayActionTag(result.actionTagLabel, result.actionTagKey));
    }

    const visitButton = document.createElement('button');
    visitButton.type = 'button';
    visitButton.className = 'x-ov-suggestion-action-button x-ov-suggestion-visit-button';
    visitButton.dataset.visible = result.active && result.actionTagLabel ? 'false' : 'true';
    appendInlineLabelWithIcon(visitButton, result.visitButtonLabel, 'ri-arrow-right-line ri-size-12');

    let historyDeleteSlot = null;
    if (result.historyDeletable) {
      historyDeleteSlot = document.createElement('div');
      historyDeleteSlot.className = 'x-ov-history-delete-slot';
      historyDeleteSlot.dataset.visible = 'false';
      const historyDeleteButton = document.createElement('button');
      historyDeleteButton.type = 'button';
      historyDeleteButton.className = 'x-ov-history-delete-button';
      historyDeleteButton.dataset.visible = 'false';
      historyDeleteButton.setAttribute('aria-label', getRuntimeMiscText('removeHistoryLabel', 'Remove history item'));
      historyDeleteButton.appendChild(createIcon('ri-delete-bin-6-line'));
      historyDeleteSlot.appendChild(historyDeleteButton);
    }

    rightSide.appendChild(actionTags);
    rightSide.appendChild(visitButton);
    if (historyDeleteSlot) {
      rightSide.appendChild(historyDeleteSlot);
    }

    item.appendChild(leftSide);
    item.appendChild(rightSide);
    return item;
  }

  function createLumnoOverlaySurface() {
    const panel = document.createElement('div');
    panel.id = ONBOARDING_OVERLAY_DEMO_PANEL_ID;
    panel.className = 'lumno-overlay-panel';
    panel.setAttribute('aria-label', 'Lumno overlay demo');

    const inputRoot = document.createElement('div');
    inputRoot.className = 'x-lumno-search-input x-lumno-search-input__container';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'x-lumno-search-input__icon';
    searchIcon.appendChild(createIcon('ri-search-line ri-size-16'));

    const query = document.createElement('div');
    query.className = 'x-lumno-search-input__field lumno-overlay-query';
    query.setAttribute('role', 'searchbox');
    query.setAttribute('aria-label', 'Search Lumno demo');

    const queryText = document.createElement('span');
    queryText.className = 'lumno-overlay-query-text';
    appendOnboardingTypingCharacters(queryText, getLumnoOverlayQuery(), 1040);
    query.appendChild(queryText);

    const caret = document.createElement('span');
    caret.className = 'lumno-overlay-query-caret';
    caret.setAttribute('aria-hidden', 'true');
    query.appendChild(caret);

    const modeBadge = document.createElement('div');
    modeBadge.className = 'x-lumno-search-input-mode__badge';
    modeBadge.dataset.surface = 'overlay';
    modeBadge.dataset.visible = 'false';

    const rightIcon = document.createElement('button');
    rightIcon.type = 'button';
    rightIcon.className = 'x-lumno-search-input__right-icon';
    rightIcon.setAttribute('aria-label', getRuntimeMiscText('settingsLabel', 'Settings'));
    rightIcon.appendChild(createIcon('ri-settings-line ri-size-16'));

    const divider = document.createElement('span');
    divider.className = 'x-lumno-search-input__divider';

    inputRoot.appendChild(searchIcon);
    inputRoot.appendChild(query);
    inputRoot.appendChild(divider);
    inputRoot.appendChild(rightIcon);
    inputRoot.appendChild(modeBadge);

    const results = document.createElement('div');
    results.className = 'x-ov-suggestions-container lumno-overlay-results';
    const overlayResults = getLumnoOverlayResults();
    overlayResults.forEach((result, index) => {
      results.appendChild(createLumnoOverlayResult(result, index, overlayResults.length));
    });

    panel.appendChild(inputRoot);
    panel.appendChild(results);
    setLumnoOverlayDemoActiveIndex(panel, -1);
    return panel;
  }

  function setLumnoOverlayDemoActiveIndex(container, activeIndex) {
    if (!container) {
      return;
    }
    const results = Array.from(container.querySelectorAll('.lumno-overlay-result'));
    results.forEach((item, index) => {
      const isActive = index === activeIndex;
      const hasActionTags = item.dataset.hasActionTags === 'true';
      item.dataset.active = isActive ? 'true' : 'false';

      const iconSlot = item.querySelector('.x-ov-suggestion-icon-slot');
      if (iconSlot) {
        iconSlot.dataset.emphasis = isActive ? 'true' : 'false';
      }

      const actionTags = item.querySelector('.x-ov-suggestion-action-tags');
      if (actionTags) {
        actionTags.dataset.visible = isActive && hasActionTags ? 'true' : 'false';
      }

      const visitButton = item.querySelector('.x-ov-suggestion-visit-button');
      if (visitButton) {
        visitButton.dataset.visible = isActive && hasActionTags ? 'false' : 'true';
      }

      const historyDeleteSlot = item.querySelector('.x-ov-history-delete-slot');
      const historyDeleteButton = item.querySelector('.x-ov-history-delete-button');
      if (historyDeleteSlot) {
        historyDeleteSlot.dataset.visible = 'false';
      }
      if (historyDeleteButton) {
        historyDeleteButton.dataset.visible = 'false';
      }
    });
  }

  function stopLumnoOverlayHoverLoop() {
    if (overlayHoverStartTimeout) {
      window.clearTimeout(overlayHoverStartTimeout);
      overlayHoverStartTimeout = 0;
    }
    if (overlayHoverStepTimeout) {
      window.clearTimeout(overlayHoverStepTimeout);
      overlayHoverStepTimeout = 0;
    }
    overlayHoverIndex = 0;
  }

  function scheduleLumnoOverlayHoverStep(panel, resultCount, firstStepDelay) {
    if (!panel || resultCount <= 0) {
      return;
    }
    const isWrapping = overlayHoverIndex >= resultCount - 1;
    const hasFirstStepDelay = Number.isFinite(firstStepDelay) && firstStepDelay > 0;
    const stepDelay = hasFirstStepDelay
      ? firstStepDelay
      : isWrapping
      ? LUMNO_OVERLAY_HOVER_STEP_MS + LUMNO_OVERLAY_HOVER_WRAP_STEP_MS
      : LUMNO_OVERLAY_HOVER_STEP_MS;
    overlayHoverStepTimeout = window.setTimeout(() => {
      overlayHoverStepTimeout = 0;
      overlayHoverIndex = isWrapping ? 0 : overlayHoverIndex + 1;
      setLumnoOverlayDemoActiveIndex(panel, overlayHoverIndex);
      scheduleLumnoOverlayHoverStep(panel, resultCount);
    }, stepDelay);
  }

  function startLumnoOverlayHoverLoop(container) {
    stopLumnoOverlayHoverLoop();
    if (!container || prefersReducedMotion()) {
      setLumnoOverlayDemoActiveIndex(container, 0);
      return;
    }
    const panel = container.querySelector('.lumno-overlay-panel');
    const results = Array.from(container.querySelectorAll('.lumno-overlay-result'));
    if (!panel || results.length === 0) {
      return;
    }
    setLumnoOverlayDemoActiveIndex(panel, -1);
    overlayHoverStartTimeout = window.setTimeout(() => {
      overlayHoverStartTimeout = 0;
      overlayHoverIndex = 0;
      setLumnoOverlayDemoActiveIndex(panel, overlayHoverIndex);
      scheduleLumnoOverlayHoverStep(panel, results.length, LUMNO_OVERLAY_HOVER_STEP_MS + LUMNO_OVERLAY_HOVER_LEAD_MS);
    }, LUMNO_OVERLAY_HOVER_START_MS);
  }

  function setNewtabPreviewHoverState(container, targetKind) {
    const surface = container && container.querySelector
      ? container
      : null;
    if (!surface) {
      return;
    }
    const recentCards = Array.from(surface.querySelectorAll('.newtab-preview-section--recent .x-nt-recent-card'));
    const bookmarkCards = Array.from(surface.querySelectorAll('.newtab-preview-section--bookmarks .x-nt-bookmark-card--folder'));
    recentCards.forEach((card, index) => {
      card.classList.toggle('x-nt-recent-card--hover', targetKind === 'recent' && index === 0);
    });
    bookmarkCards.forEach((card, index) => {
      card.classList.toggle('x-nt-bookmark-card--hover', targetKind === 'bookmark' && index === 0);
    });
    surface.dataset.previewHover = targetKind || 'idle';
  }

  function stopNewtabPreviewHoverLoop(container) {
    if (newtabPreviewHoverStartTimeout) {
      window.clearTimeout(newtabPreviewHoverStartTimeout);
      newtabPreviewHoverStartTimeout = 0;
    }
    if (newtabPreviewHoverStepTimeout) {
      window.clearTimeout(newtabPreviewHoverStepTimeout);
      newtabPreviewHoverStepTimeout = 0;
    }
    newtabPreviewHoverStepIndex = 0;
    if (container) {
      setNewtabPreviewHoverState(container, '');
    }
  }

  function scheduleNewtabPreviewHoverStep(container) {
    if (!container || !container.isConnected) {
      return;
    }
    const steps = [
      { target: 'recent', duration: NEWTAB_PREVIEW_HOVER_HOLD_MS },
      { target: '', duration: NEWTAB_PREVIEW_HOVER_MOVE_MS },
      { target: 'bookmark', duration: NEWTAB_PREVIEW_HOVER_HOLD_MS },
      { target: '', duration: NEWTAB_PREVIEW_HOVER_SETTLE_MS }
    ];
    const step = steps[newtabPreviewHoverStepIndex % steps.length];
    setNewtabPreviewHoverState(container, step.target);
    newtabPreviewHoverStepIndex += 1;
    newtabPreviewHoverStepTimeout = window.setTimeout(() => {
      newtabPreviewHoverStepTimeout = 0;
      scheduleNewtabPreviewHoverStep(container);
    }, step.duration);
  }

  function startNewtabPreviewHoverLoop(container) {
    stopNewtabPreviewHoverLoop(container);
    if (!container || prefersReducedMotion()) {
      setNewtabPreviewHoverState(container, '');
      return;
    }
    newtabPreviewHoverStartTimeout = window.setTimeout(() => {
      newtabPreviewHoverStartTimeout = 0;
      newtabPreviewHoverStepIndex = 0;
      scheduleNewtabPreviewHoverStep(container);
    }, NEWTAB_PREVIEW_HOVER_START_MS);
  }

  function createBrowserPageSection(className, lineClasses) {
    const section = document.createElement('div');
    section.className = `browser-page-section ${className || ''}`.trim();
    (lineClasses || []).forEach((lineClass) => {
      section.appendChild(createSkeletonLine(`browser-page-line ${lineClass}`.trim()));
    });
    return section;
  }

  function createBrowserPageSkeleton() {
    const page = document.createElement('div');
    page.className = 'browser-page-skeleton';

    const main = document.createElement('div');
    main.className = 'browser-page-main';

    const hero = document.createElement('div');
    hero.className = 'browser-page-section browser-page-hero';
    hero.appendChild(createSkeletonLine('browser-page-title'));
    hero.appendChild(createSkeletonLine('browser-page-line browser-page-line--wide'));
    hero.appendChild(createSkeletonLine('browser-page-line browser-page-line--mid'));
    hero.appendChild(createSkeletonLine('browser-page-line browser-page-line--short'));

    const rows = document.createElement('div');
    rows.className = 'browser-page-section';
    for (let index = 0; index < 4; index += 1) {
      const row = document.createElement('span');
      row.className = 'browser-page-row';
      row.setAttribute('aria-hidden', 'true');
      rows.appendChild(row);
    }

    const sidebar = document.createElement('div');
    sidebar.className = 'browser-page-sidebar';
    sidebar.appendChild(createBrowserPageSection('', [
      'browser-page-line--wide',
      'browser-page-line--mid',
      'browser-page-line--short'
    ]));
    sidebar.appendChild(createBrowserPageSection('', [
      'browser-page-line--wide',
      'browser-page-line--mid'
    ]));

    main.appendChild(hero);
    main.appendChild(rows);
    page.appendChild(main);
    page.appendChild(sidebar);
    return page;
  }

  function createBrowserTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'browser-tabs';
    tabs.appendChild(createSkeletonLine('browser-tab'));
    tabs.appendChild(createSkeletonLine('browser-tab browser-tab--muted'));
    return tabs;
  }

  function createBrowserActions() {
    const actions = document.createElement('div');
    actions.className = 'browser-actions';
    for (let index = 0; index < 2; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'browser-action-dot';
      dot.setAttribute('aria-hidden', 'true');
      actions.appendChild(dot);
    }
    return actions;
  }

  function createBrowserBar() {
    const browserBar = document.createElement('div');
    browserBar.className = 'browser-bar';
    browserBar.appendChild(createSurfaceRail());
    browserBar.appendChild(createBrowserTabs());
    browserBar.appendChild(createSkeletonLine('browser-address'));
    browserBar.appendChild(createBrowserActions());
    return browserBar;
  }

  function createBrowserWindowClip(browserWindow) {
    const clip = document.createElement('div');
    clip.className = 'browser-window-clip';
    if (browserWindow) {
      clip.appendChild(browserWindow);
    }
    return clip;
  }

  function createBookmarkFocusSurface() {
    const rootNode = document.createElement('div');
    rootNode.className = 'bookmark-focus-ui';

    const browserWindow = document.createElement('div');
    browserWindow.className = 'browser-window';
    browserWindow.appendChild(createBrowserBar());
    browserWindow.appendChild(createBrowserPageSkeleton());

    rootNode.appendChild(createBrowserWindowClip(browserWindow));
    rootNode.appendChild(createLumnoOverlaySurface());
    startLumnoOverlayHoverLoop(rootNode);
    return rootNode;
  }

  function getSiteSearchDemoBrandAccentRgb(item) {
    return item && Array.isArray(item.brandAccentRgb) && item.brandAccentRgb.length === 3
      ? item.brandAccentRgb
      : (item && Array.isArray(item.accentRgb) && item.accentRgb.length === 3 ? item.accentRgb : [59, 130, 246]);
  }

  function getSiteSearchDemoLuminance(rgb) {
    if (!Array.isArray(rgb) || rgb.length !== 3) {
      return 0;
    }
    const channels = rgb.map((value) => {
      const channel = Number(value) / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function getSiteSearchDemoReadableTextColor(bgRgb) {
    const darkText = [17, 24, 39];
    const lightText = [248, 250, 252];
    const bgLum = getSiteSearchDemoLuminance(bgRgb);
    const darkLum = getSiteSearchDemoLuminance(darkText);
    const lightLum = getSiteSearchDemoLuminance(lightText);
    const contrastWithDark = (Math.max(bgLum, darkLum) + 0.05) / (Math.min(bgLum, darkLum) + 0.05);
    const contrastWithLight = (Math.max(bgLum, lightLum) + 0.05) / (Math.min(bgLum, lightLum) + 0.05);
    return contrastWithDark >= contrastWithLight ? '#111827' : '#F8FAFC';
  }

  function normalizeSiteSearchDemoAccentRgb(rgb) {
    const accentRgb = Array.isArray(rgb) && rgb.length === 3
      ? rgb
      : [59, 130, 246];
    const luminance = getSiteSearchDemoLuminance(accentRgb);
    if (luminance < 0.12) {
      return mixNewtabPreviewColor(accentRgb, [255, 255, 255], 0.55);
    }
    if (luminance > 0.9) {
      return mixNewtabPreviewColor(accentRgb, [0, 0, 0], 0.2);
    }
    return accentRgb;
  }

  function getSiteSearchDemoTheme(item) {
    const accentRgb = normalizeSiteSearchDemoAccentRgb(getSiteSearchDemoBrandAccentRgb(item));
    const base = [255, 255, 255];
    const markBg = mixNewtabPreviewColor(accentRgb, base, 0.78);
    const tagBg = mixNewtabPreviewColor(accentRgb, base, 0.74);
    const keyBg = mixNewtabPreviewColor(accentRgb, base, 0.9);
    return {
      accentRgb,
      highlightBg: mixNewtabPreviewColor(accentRgb, base, 0.86),
      highlightBorder: mixNewtabPreviewColor(accentRgb, base, 0.62),
      markBg,
      markText: getSiteSearchDemoReadableTextColor(markBg),
      tagBg,
      tagText: getSiteSearchDemoReadableTextColor(tagBg),
      tagBorder: mixNewtabPreviewColor(accentRgb, base, 0.58),
      keyBg,
      keyText: getSiteSearchDemoReadableTextColor(keyBg),
      keyBorder: mixNewtabPreviewColor(accentRgb, base, 0.18),
      buttonText: getSiteSearchDemoLuminance(accentRgb) > 0.8
        ? mixNewtabPreviewColor(accentRgb, [0, 0, 0], 0.6)
        : accentRgb,
      buttonBg: mixNewtabPreviewColor(accentRgb, base, 0.94),
      buttonBorder: mixNewtabPreviewColor(accentRgb, base, 0.7)
    };
  }

  function applySiteSearchDemoAccent(element, item) {
    const theme = getSiteSearchDemoTheme(item);
    const accentRgb = theme.accentRgb;
    element.style.setProperty('--site-search-demo-accent-rgb', newtabPreviewRgbToCssParts(accentRgb));
    element.style.setProperty('--site-search-demo-accent', newtabPreviewRgbToCss(accentRgb));
    element.style.setProperty('--site-search-demo-accent-soft', newtabPreviewRgbToCssAlpha(accentRgb, 0.1));
    element.style.setProperty('--site-search-demo-accent-border', newtabPreviewRgbToCssAlpha(accentRgb, 0.18));
    element.style.setProperty('--x-ov-suggestion-row-bg', newtabPreviewRgbToCss(theme.highlightBg));
    element.style.setProperty('--x-ov-suggestion-row-border', newtabPreviewRgbToCss(theme.highlightBorder));
    element.style.setProperty('--x-ext-mark-bg', newtabPreviewRgbToCss(theme.markBg));
    element.style.setProperty('--x-ext-mark-text', theme.markText);
    element.style.setProperty('--x-ext-tag-bg', newtabPreviewRgbToCss(theme.buttonBg));
    element.style.setProperty('--x-ext-tag-text', newtabPreviewRgbToCss(theme.buttonText));
    element.style.setProperty('--x-ext-tag-border', newtabPreviewRgbToCss(theme.buttonBorder));
    element.style.setProperty('--x-ov-suggestion-action-button-bg', newtabPreviewRgbToCss(theme.buttonBg));
    element.style.setProperty('--x-ov-suggestion-action-button-text', newtabPreviewRgbToCss(theme.buttonText));
    element.style.setProperty('--x-ov-suggestion-action-button-border', newtabPreviewRgbToCss(theme.buttonBorder));
    element.style.setProperty('--x-ext-key-bg', newtabPreviewRgbToCss(theme.keyBg));
    element.style.setProperty('--x-ext-key-text', theme.keyText);
    element.style.setProperty('--x-ext-key-border', newtabPreviewRgbToCss(theme.keyBorder));
  }

  function createSiteSearchDemoProviderIcon(item, className) {
    const iconSrc = String(item && item.favicon || '').trim();
    if (iconSrc) {
      const image = document.createElement('img');
      image.className = className;
      image.src = iconSrc;
      image.alt = '';
      image.decoding = 'async';
      image.loading = 'eager';
      image.referrerPolicy = 'no-referrer';
      image.draggable = false;
      image.addEventListener('error', () => {
        if (image.parentNode) {
          const fallback = document.createElement('span');
          fallback.className = className;
          fallback.appendChild(createIcon(item.iconClass || 'ri-link'));
          image.parentNode.replaceChild(fallback, image);
        }
      });
      return image;
    }
    const icon = document.createElement('span');
    icon.className = className;
    icon.appendChild(createIcon(item && item.iconClass || 'ri-search-line'));
    return icon;
  }

  function setSiteSearchDemoTypingWidth(element, text, fallbackWidth) {
    if (!element) {
      return;
    }
    const characters = getTypingCharacters(text);
    const hasWideCharacters = characters.some((character) => /[^\x00-\xff]/.test(character));
    const widthUnit = hasWideCharacters ? 'em' : 'ch';
    const width = String(fallbackWidth || '').trim() || `${Math.max(1, characters.length)}${widthUnit}`;
    element.style.setProperty('--typed-width', `calc(${width} + var(--typed-width-buffer, 0.65em))`);
    element.style.setProperty('--typing-steps', String(Math.max(1, characters.length)));
  }

  function createSiteSearchDemoTypedText(text, className, width, durationMs) {
    const token = document.createElement('span');
    token.className = `site-search-demo-query-token ${className || ''}`.trim();
    appendOnboardingTypingCharacters(token, text, durationMs);
    setSiteSearchDemoTypingWidth(token, text, width);
    return token;
  }

  function createSiteSearchDemoModePrefix(item) {
    const prefix = document.createElement('span');
    prefix.className = 'x-lumno-search-input-mode__prefix site-search-demo-mode-prefix';
    prefix.setAttribute('aria-hidden', 'true');

    if (item && item.kind === 'ai') {
      prefix.appendChild(createSiteSearchDemoProviderIcon(item, 'site-search-demo-mode-prefix__icon'));
    }
    const label = document.createElement('span');
    label.className = 'site-search-demo-mode-prefix__label';
    label.textContent = item.prefixLabel || item.modeLabel || '';

    prefix.appendChild(label);
    return prefix;
  }

  function createSiteSearchDemoTabHint(item) {
    const hint = document.createElement('span');
    hint.className = 'x-lumno-search-input-mode__tab-hint site-search-demo-tab-hint';
    hint.setAttribute('aria-hidden', 'true');

    const key = document.createElement('span');
    key.className = 'site-search-demo-tab-hint__key';
    key.textContent = 'Tab';

    const label = document.createElement('span');
    label.className = 'site-search-demo-tab-hint__label';
    label.textContent = formatRuntimeTemplate(
      String(getRuntimeSection('siteSearchDemo').tabHintTemplate || 'Search with {provider}'),
      { provider: item.modeLabel || item.label || '' }
    );

    hint.appendChild(key);
    hint.appendChild(label);
    return hint;
  }

  function createSiteSearchDemoInput(item) {
    const inputRoot = document.createElement('div');
    inputRoot.className = 'x-lumno-search-input x-lumno-search-input__container';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'x-lumno-search-input__icon';
    searchIcon.appendChild(createIcon('ri-search-line ri-size-16'));

    const query = document.createElement('div');
    query.className = 'x-lumno-search-input__field site-search-demo-query';
    query.setAttribute('role', 'searchbox');
    query.setAttribute('aria-label', `${item.label || ''} demo query`);

    const triggerText = createSiteSearchDemoTypedText(
      item.triggerQuery,
      'site-search-demo-query-token--trigger',
      null,
      760
    );
    const promptText = createSiteSearchDemoTypedText(
      item.promptQuery,
      'site-search-demo-query-token--prompt',
      item.promptWidth,
      900
    );
    const caret = document.createElement('span');
    caret.className = 'site-search-demo-query-caret';
    caret.setAttribute('aria-hidden', 'true');

    query.appendChild(triggerText);
    query.appendChild(promptText);
    query.appendChild(caret);

    const rightIcon = document.createElement('button');
    rightIcon.type = 'button';
    rightIcon.className = 'x-lumno-search-input__right-icon';
    rightIcon.tabIndex = -1;
    rightIcon.setAttribute('aria-label', getRuntimeMiscText('settingsLabel', 'Settings'));
    rightIcon.appendChild(createIcon('ri-settings-line ri-size-16'));

    const divider = document.createElement('span');
    divider.className = 'x-lumno-search-input__divider';

    inputRoot.appendChild(searchIcon);
    inputRoot.appendChild(query);
    inputRoot.appendChild(rightIcon);
    inputRoot.appendChild(divider);
    inputRoot.appendChild(createSiteSearchDemoModePrefix(item));
    inputRoot.appendChild(createSiteSearchDemoTabHint(item));
    return inputRoot;
  }

  function createSiteSearchDemoResult(item) {
    const result = document.createElement('div');
    result.className = 'x-ov-suggestion-item site-search-demo-result';
    result.dataset.active = 'true';
    result.dataset.type = item.kind || '';
    result.dataset.last = 'true';
    result.style.setProperty('--result-index', '0');

    const leftSide = document.createElement('div');
    leftSide.className = 'x-ov-suggestion-left';

    const iconSlot = document.createElement('span');
    iconSlot.className = 'x-ov-suggestion-icon-slot';
    iconSlot.appendChild(createSiteSearchDemoProviderIcon(item, 'x-ov-suggestion-favicon'));

    const textWrapper = document.createElement('div');
    textWrapper.className = 'x-ov-suggestion-text';

    const title = document.createElement('span');
    title.className = 'x-ov-suggestion-title';
    appendHighlightedQueryText(title, item.resultTitle, item.promptQuery);
    textWrapper.appendChild(title);

    if (item.resultDetail) {
      const detail = document.createElement('span');
      detail.className = 'x-ov-suggestion-url-line';
      detail.textContent = item.resultDetail || '';
      textWrapper.appendChild(detail);
    }

    if (item.resultTag) {
      const tag = document.createElement('span');
      tag.className = 'x-ov-suggestion-source-tag';
      tag.dataset.visible = 'true';
      tag.textContent = item.resultTag;
      textWrapper.appendChild(tag);
    }

    leftSide.appendChild(iconSlot);
    leftSide.appendChild(textWrapper);

    const rightSide = document.createElement('div');
    rightSide.className = 'x-ov-suggestion-right';
    rightSide.setAttribute('data-action-column', 'true');
    const visitButton = document.createElement('button');
    visitButton.type = 'button';
    visitButton.className = 'x-ov-suggestion-action-button x-ov-suggestion-visit-button';
    visitButton.dataset.visible = 'true';
    visitButton.tabIndex = -1;
    appendInlineLabelWithIcon(visitButton, item.actionLabel, 'ri-arrow-right-line ri-size-12');
    rightSide.appendChild(visitButton);

    result.appendChild(leftSide);
    result.appendChild(rightSide);
    return result;
  }

  function createSiteSearchDemoCase(item, index) {
    const card = document.createElement('section');
    card.className = 'site-search-demo-card';
    card.dataset.kind = item.kind || '';
    card.setAttribute('aria-label', item.label || item.modeLabel || 'Site search demo');
    card.style.setProperty('--case-delay', `${index * 760}ms`);
    applySiteSearchDemoAccent(card, item);

    const results = document.createElement('div');
    results.className = 'site-search-demo-results';
    results.appendChild(createSiteSearchDemoResult(item));

    card.appendChild(createSiteSearchDemoInput(item));
    card.appendChild(results);
    return card;
  }

  function createSiteSearchDemoSurface() {
    const surface = document.createElement('div');
    surface.className = 'site-search-demo-surface';
    surface.setAttribute('aria-label', getRuntimeMiscText('siteSearchDemoAriaLabel', 'Lumno site search demo'));

    const stack = document.createElement('div');
    stack.className = 'site-search-demo-stack';
    getSiteSearchDemoCases().forEach((item, index) => {
      stack.appendChild(createSiteSearchDemoCase(item, index));
    });

    surface.appendChild(stack);
    return surface;
  }

  function createDemoCursorSvg() {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', 'figma-cursor');
    svg.setAttribute('viewBox', '0 0 48 58');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const cursorPath = 'M8.5 6.5 L43.5 28.7 L29.3 33 L20.8 50 Z';

    const outline = document.createElementNS(namespace, 'path');
    outline.setAttribute('class', 'figma-cursor__outline');
    outline.setAttribute('d', cursorPath);
    outline.setAttribute('stroke-linejoin', 'round');
    outline.setAttribute('stroke-linecap', 'round');

    const fill = document.createElementNS(namespace, 'path');
    fill.setAttribute('class', 'figma-cursor__fill');
    fill.setAttribute('d', cursorPath);
    fill.setAttribute('stroke-linejoin', 'round');
    fill.setAttribute('stroke-linecap', 'round');
    fill.setAttribute('stroke-width', '2');
    fill.setAttribute('fill', '#303030');
    fill.setAttribute('stroke', '#303030');

    svg.appendChild(outline);
    svg.appendChild(fill);
    return svg;
  }

  function createLumnoWebButterflyWing(className, options) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('viewBox', '0 0 23 25');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('xmlns', namespace);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('class', 'logo-butterfly-path');
    path.setAttribute('opacity', '0.2');
    path.setAttribute('fill', '#79C3F2');
    path.setAttribute('d', LUMNO_WEB_BUTTERFLY_REST_PATH);

    const shapeMotion = document.createElementNS(namespace, 'animate');
    shapeMotion.setAttribute('attributeName', 'd');
    shapeMotion.setAttribute('dur', '2800ms');
    if (options && options.begin) {
      shapeMotion.setAttribute('begin', options.begin);
    }
    shapeMotion.setAttribute('repeatCount', 'indefinite');
    shapeMotion.setAttribute('calcMode', 'spline');
    shapeMotion.setAttribute('keyTimes', '0;0.5;1');
    shapeMotion.setAttribute('keySplines', '0.42 0 0.58 1;0.42 0 0.58 1');
    shapeMotion.setAttribute('values', LUMNO_WEB_BUTTERFLY_D_VALUES);
    path.appendChild(shapeMotion);

    if (options && options.transformMotion) {
      const transformMotion = document.createElementNS(namespace, 'animateTransform');
      transformMotion.setAttribute('attributeName', 'transform');
      transformMotion.setAttribute('type', 'rotate');
      transformMotion.setAttribute('dur', '2800ms');
      transformMotion.setAttribute('repeatCount', 'indefinite');
      transformMotion.setAttribute('calcMode', 'spline');
      transformMotion.setAttribute('keyTimes', '0;0.5;1');
      transformMotion.setAttribute('keySplines', '0.42 0 0.58 1;0.42 0 0.58 1');
      transformMotion.setAttribute('values', '-1.5 5.5 15.5;0 5.5 15.5;-1.5 5.5 15.5');
      path.appendChild(transformMotion);
    }

    svg.appendChild(path);
    return svg;
  }

  function createLumnoWebWordmarkSurface() {
    const surface = document.createElement('div');
    surface.className = 'lumno-web-wordmark-surface';
    surface.setAttribute('aria-label', 'Lumno');

    const wordmarkWrap = document.createElement('span');
    wordmarkWrap.className = 'logo-wordmark-wrap';
    wordmarkWrap.setAttribute('aria-hidden', 'true');

    const wordmark = document.createElement('img');
    wordmark.className = 'logo-wordmark mark-svg';
    wordmark.src = LUMNO_WEB_WORDMARK_SRC;
    wordmark.alt = '';
    wordmark.draggable = false;

    const butterflyStage = document.createElement('span');
    butterflyStage.className = 'logo-butterfly-stage';
    butterflyStage.setAttribute('aria-hidden', 'true');
    butterflyStage.appendChild(createLumnoWebButterflyWing(
      'logo-butterfly logo-butterfly-wing logo-butterfly-wing-back mark-svg',
      { begin: '120ms' }
    ));
    butterflyStage.appendChild(createLumnoWebButterflyWing(
      'logo-butterfly logo-butterfly-wing logo-butterfly-wing-front mark-svg',
      { transformMotion: true }
    ));

    const seoText = document.createElement('span');
    seoText.className = 'seo-wordmark-text';
    seoText.textContent = 'Lumno';

    wordmarkWrap.appendChild(wordmark);
    wordmarkWrap.appendChild(butterflyStage);
    surface.appendChild(wordmarkWrap);
    surface.appendChild(seoText);
    return surface;
  }

  function createNewtabPreviewWordmark() {
    const wordmark = document.createElement('div');
    wordmark.id = '_x_extension_newtab_wordmark_2026_unique_';
    wordmark.className = 'newtab-preview-wordmark';
    wordmark.dataset.enter = 'done';
    wordmark.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;

    const image = document.createElement('img');
    image.src = '../../assets/images/lumno-wordmark.svg';
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;

    button.appendChild(image);
    wordmark.appendChild(button);
    return wordmark;
  }

  function createNewtabPreviewSearchPanel() {
    const rootNode = document.createElement('div');
    rootNode.id = '_x_extension_newtab_root_2024_unique_';
    rootNode.className = 'newtab-preview-search-panel';

    const searchLayer = document.createElement('div');
    searchLayer.id = '_x_extension_newtab_search_layer_2024_unique_';
    searchLayer.className = 'newtab-preview-search-layer';

    const inputRoot = document.createElement('div');
    inputRoot.id = '_x_extension_newtab_input_container_2024_unique_';
    inputRoot.className = 'x-lumno-search-input x-lumno-search-input__container';

    const searchIcon = document.createElement('span');
    searchIcon.id = '_x_extension_newtab_search_icon_2024_unique_';
    searchIcon.className = 'x-lumno-search-input__icon';
    searchIcon.appendChild(createIcon('ri-search-line'));

    const field = document.createElement('input');
    field.id = '_x_extension_newtab_search_input_2024_unique_';
    field.className = 'x-lumno-search-input__field';
    field.type = 'text';
    field.value = getNewtabPreviewQuery();
    field.placeholder = getRuntimeMiscText('newtabSearchPlaceholder', 'Search or enter URL...');
    field.readOnly = true;
    field.tabIndex = -1;
    field.setAttribute('aria-label', getRuntimeMiscText('newtabSearchPreviewAriaLabel', 'Lumno new tab search preview'));

    const rightIcon = document.createElement('button');
    rightIcon.type = 'button';
    rightIcon.className = 'x-lumno-search-input__right-icon';
    rightIcon.setAttribute('aria-label', getRuntimeMiscText('settingsLabel', 'Settings'));
    rightIcon.tabIndex = -1;
    rightIcon.appendChild(createIcon('ri-settings-3-line'));

    const divider = document.createElement('span');
    divider.className = 'x-lumno-search-input__divider';
    divider.dataset.visible = 'false';

    const modeBadge = document.createElement('div');
    modeBadge.id = '_x_extension_newtab_mode_badge_2024_unique_';
    modeBadge.className = 'x-lumno-search-input-mode__badge';
    modeBadge.dataset.surface = 'newtab';
    modeBadge.dataset.visible = 'false';

    inputRoot.appendChild(searchIcon);
    inputRoot.appendChild(field);
    inputRoot.appendChild(rightIcon);
    inputRoot.appendChild(divider);
    inputRoot.appendChild(modeBadge);
    searchLayer.appendChild(inputRoot);
    rootNode.appendChild(searchLayer);
    return rootNode;
  }

  function createNewtabPreviewFaviconImage(className, item, fallbackIconClass) {
    if (item && item.type === 'folder') {
      const folderIcon = document.createElement('span');
      folderIcon.className = className;
      folderIcon.innerHTML = getNewtabPreviewFolderSvg(item.title);
      return folderIcon;
    }
    const source = String((item && item.iconSrc) || getNewtabPreviewFaviconUrl(item && item.url) || '').trim();
    if (source) {
      const image = document.createElement('img');
      image.className = className;
      image.src = source;
      image.alt = '';
      image.decoding = 'async';
      image.loading = 'eager';
      image.draggable = false;
      image.referrerPolicy = 'no-referrer';
      return image;
    }
    const icon = document.createElement('span');
    icon.className = `${className} newtab-preview-glyph-favicon`.trim();
    icon.appendChild(createIcon((item && item.iconClass) || fallbackIconClass || 'ri-link'));
    return icon;
  }

  function appendNewtabPreviewHighlightedText(target, text, query) {
    const value = String(text || '');
    const needle = String(query || '').trim();
    if (!target || !needle) {
      if (target) {
        target.textContent = value;
      }
      return;
    }
    const parts = value.split(new RegExp(`(${escapeRegExp(needle)})`, 'gi'));
    parts.forEach((part) => {
      if (!part) {
        return;
      }
      if (part.toLowerCase() === needle.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.className = 'x-nt-suggestion-mark';
        mark.textContent = part;
        target.appendChild(mark);
        return;
      }
      target.appendChild(document.createTextNode(part));
    });
  }

  function createNewtabPreviewSuggestionIcon(item, index) {
    const slot = document.createElement('span');
    slot.className = 'x-nt-suggestion-icon-slot';
    slot.dataset.favicon = item.iconSrc ? 'true' : 'false';
    slot.dataset.emphasis = item.active ? 'true' : 'false';

    if (item.iconSrc) {
      const image = document.createElement('img');
      image.id = `_x_extension_newtab_suggestion_icon_${index}_2024_unique_`;
      image.className = 'x-nt-suggestion-favicon';
      image.setAttribute('data-x-nt-suggestion-icon', '1');
      image.src = item.iconSrc;
      image.alt = '';
      image.decoding = 'async';
      image.loading = 'eager';
      image.draggable = false;
      slot.appendChild(image);
      return slot;
    }

    const inlineIcon = document.createElement('span');
    inlineIcon.className = 'x-nt-suggestion-inline-icon';
    inlineIcon.dataset.tone = 'subtext';
    inlineIcon.appendChild(createIcon(item.iconClass || 'ri-search-line'));
    slot.appendChild(inlineIcon);
    return slot;
  }

  function createNewtabPreviewActionTag(labelText, keyLabel) {
    const tag = document.createElement('span');
    tag.className = 'x-nt-suggestion-action-tag';

    const label = document.createElement('span');
    label.className = 'x-nt-suggestion-action-tag__label';
    label.textContent = labelText || getRuntimeMiscText('openLabel', 'Open');

    const key = document.createElement('span');
    key.className = 'x-nt-suggestion-action-tag__key';
    key.textContent = keyLabel || 'Enter';

    tag.appendChild(label);
    tag.appendChild(key);
    return tag;
  }

  function appendNewtabPreviewActionButtonLabel(button, labelText) {
    const label = document.createElement('span');
    label.className = 'x-nt-suggestion-action-button__label';
    label.textContent = labelText || getRuntimeMiscText('openLabel', 'Open');

    const icon = document.createElement('span');
    icon.className = 'x-nt-suggestion-action-button__icon';
    icon.appendChild(createIcon('ri-arrow-right-line'));

    button.appendChild(label);
    button.appendChild(icon);
  }

  function createNewtabPreviewSuggestion(item, index, total) {
    const suggestionItem = document.createElement('div');
    suggestionItem.id = `_x_extension_newtab_suggestion_item_${index}_2024_unique_`;
    suggestionItem.className = 'x-nt-suggestion-item';
    suggestionItem.dataset.last = index === total - 1 ? 'true' : 'false';
    suggestionItem.dataset.rowState = item.active ? 'active' : '';
    suggestionItem.dataset.historyDeleteVisible = item.historyDeletable ? 'true' : 'false';

    const leftSide = document.createElement('div');
    leftSide.className = 'x-nt-suggestion-left';
    leftSide.appendChild(createNewtabPreviewSuggestionIcon(item, index));

    const textWrapper = document.createElement('div');
    textWrapper.className = 'x-nt-suggestion-text';

    const title = document.createElement('span');
    title.className = 'x-nt-suggestion-title';
    appendNewtabPreviewHighlightedText(title, item.title, getNewtabPreviewQuery());
    textWrapper.appendChild(title);

    if (item.path) {
      const path = document.createElement('span');
      path.className = 'x-nt-suggestion-bookmark-path';
      path.textContent = item.path;
      textWrapper.appendChild(path);
    } else if (item.url) {
      const urlLine = document.createElement('span');
      urlLine.className = 'x-nt-suggestion-url-line';
      urlLine.textContent = item.url.replace(/^https?:\/\//, '');
      textWrapper.appendChild(urlLine);
    }

    if (item.tag) {
      const tag = document.createElement('span');
      tag.className = 'x-nt-suggestion-tag';
      tag.dataset.tagType = item.tagType || '';
      tag.textContent = item.tag;
      textWrapper.appendChild(tag);
    }

    leftSide.appendChild(textWrapper);

    const rightSide = document.createElement('div');
    rightSide.className = 'x-nt-suggestion-right';
    rightSide.setAttribute('data-action-column', 'true');

    const actionTags = document.createElement('div');
    actionTags.className = 'x-nt-suggestion-action-tags';
    actionTags.dataset.visible = item.active && item.actionLabel ? 'true' : 'false';
    if (item.actionLabel) {
      actionTags.appendChild(createNewtabPreviewActionTag(item.actionLabel, item.actionKey));
    }

    const visitButton = document.createElement('button');
    visitButton.type = 'button';
    visitButton.className = 'x-nt-suggestion-action-button x-nt-suggestion-visit-button';
    visitButton.tabIndex = -1;
    visitButton.dataset.visible = item.active && item.actionLabel ? 'false' : 'true';
    appendNewtabPreviewActionButtonLabel(visitButton, item.visitLabel || item.actionLabel);

    rightSide.appendChild(actionTags);
    rightSide.appendChild(visitButton);

    if (item.historyDeletable) {
      const deleteSlot = document.createElement('div');
      deleteSlot.className = 'x-nt-history-delete-slot';
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'x-nt-history-delete-button';
      deleteButton.tabIndex = -1;
      deleteButton.setAttribute('aria-label', getRuntimeMiscText('removeHistoryLabel', 'Remove history item'));
      deleteButton.appendChild(createIcon('ri-delete-bin-6-line'));
      deleteSlot.appendChild(deleteButton);
      rightSide.appendChild(deleteSlot);
    }

    suggestionItem.appendChild(leftSide);
    suggestionItem.appendChild(rightSide);
    return suggestionItem;
  }

  function createNewtabPreviewSuggestionsStack() {
    const stack = document.createElement('div');
    stack.className = 'newtab-preview-suggestions-stack';

    const surface = document.createElement('div');
    surface.id = '_x_extension_newtab_suggestions_surface_2026_unique_';
    surface.dataset.visible = 'false';

    const outline = document.createElement('div');
    outline.id = '_x_extension_newtab_suggestions_outline_2026_unique_';
    outline.dataset.visible = 'false';

    const container = document.createElement('div');
    container.id = '_x_extension_newtab_suggestions_container_2024_unique_';
    container.dataset.visible = 'false';

    stack.appendChild(surface);
    stack.appendChild(outline);
    stack.appendChild(container);
    return stack;
  }

  function createNewtabPreviewRecentCard(item) {
    const card = document.createElement('div');
    card.className = `x-nt-recent-card${item.alt ? ' x-nt-recent-card--alt' : ''}`;
    card.tabIndex = -1;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', formatRuntimeTemplate(
      getRuntimeMiscText('openItemAriaTemplate', 'Open {title}'),
      { title: item.title }
    ));
    applyNewtabPreviewRecentTheme(card, item);

    const inner = document.createElement('div');
    inner.className = 'x-nt-recent-inner';

    const header = document.createElement('div');
    header.className = 'x-nt-recent-header';
    header.appendChild(createNewtabPreviewFaviconImage('x-nt-recent-favicon', item, 'ri-global-line'));

    const name = document.createElement('div');
    name.className = 'x-nt-recent-name';
    name.textContent = item.siteName;
    header.appendChild(name);

    const dismissButton = document.createElement('button');
    dismissButton.type = 'button';
    dismissButton.className = 'x-nt-recent-dismiss';
    dismissButton.tabIndex = -1;
    dismissButton.appendChild(createIcon('ri-subtract-line'));
    header.appendChild(dismissButton);

    const title = document.createElement('span');
    title.className = 'x-nt-recent-title';
    title.textContent = item.title;

    inner.appendChild(header);
    inner.appendChild(title);

    const urlLine = document.createElement('div');
    urlLine.className = 'x-nt-recent-url';

    const actionLine = document.createElement('div');
    actionLine.className = 'x-nt-recent-action';
    const actionText = document.createElement('span');
    actionText.textContent = getRuntimeMiscText('goLabel', 'Visit');
    actionLine.appendChild(actionText);
    actionLine.appendChild(createIcon('ri-arrow-right-line'));

    const url = document.createElement('span');
    url.className = 'x-nt-recent-url-text';
    url.textContent = item.urlText;

    const pinButton = document.createElement('button');
    pinButton.type = 'button';
    pinButton.className = 'x-nt-recent-pin';
    pinButton.tabIndex = -1;
    pinButton.appendChild(createIcon('ri-pushpin-line'));

    urlLine.appendChild(actionLine);
    urlLine.appendChild(url);
    urlLine.appendChild(pinButton);

    card.appendChild(inner);
    card.appendChild(urlLine);
    return card;
  }

  function createNewtabPreviewBookmarkCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.tabIndex = -1;
    card.className = item.type === 'folder'
      ? 'x-nt-bookmark-card x-nt-bookmark-card--folder'
      : 'x-nt-bookmark-card';
    card.setAttribute('aria-label', formatRuntimeTemplate(
      getRuntimeMiscText('openItemAriaTemplate', 'Open {title}'),
      { title: item.title }
    ));
    card.title = item.title;
    card.setAttribute('data-cursor-tooltip', item.title);
    applyNewtabPreviewBookmarkTheme(card, item);

    const iconClassName = item.type === 'folder'
      ? 'x-nt-bookmark-icon x-nt-bookmark-icon--figma newtab-preview-folder-glyph'
      : 'x-nt-bookmark-icon';
    card.appendChild(createNewtabPreviewFaviconImage(iconClassName, item, 'ri-bookmark-3-line'));

    const title = document.createElement('span');
    title.className = 'x-nt-bookmark-title';
    title.textContent = item.title;
    card.appendChild(title);
    if (item.type === 'folder' && Array.isArray(item.previewUrls) && item.previewUrls.length > 0) {
      const previewWrap = document.createElement('span');
      previewWrap.className = 'x-nt-folder-preview';
      item.previewUrls.slice(0, 4).forEach((url, index) => {
        const previewFavicon = document.createElement('img');
        previewFavicon.className = 'x-nt-folder-preview-favicon';
        previewFavicon.src = getNewtabPreviewFaviconUrl(url);
        previewFavicon.alt = '';
        previewFavicon.decoding = 'async';
        previewFavicon.loading = 'eager';
        previewFavicon.setAttribute('aria-hidden', 'true');
        previewFavicon.style.setProperty('--x-nt-folder-favicon-rot', `${(index - 1.5) * 2}deg`);
        previewWrap.appendChild(previewFavicon);
      });
      card.appendChild(previewWrap);
    }
    return card;
  }

  function createNewtabPreviewSectionModeSelect(kind) {
    const label = kind === 'recent'
      ? getRuntimeMiscText('sectionModeRecentLabel', 'Recent display mode')
      : getRuntimeMiscText('sectionModeBookmarksLabel', 'Bookmarks display mode');
    const control = document.createElement('div');
    control.className = 'x-nt-section-mode-select _x_extension_select_wrap_2024_unique_';
    control.dataset.iconOnly = 'true';
    control.dataset.menuAlign = 'left';
    control.dataset.menuWidth = 'content';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.tabIndex = -1;
    trigger.className = '_x_extension_select_trigger_2024_unique_';
    trigger.setAttribute('aria-label', label);
    trigger.setAttribute('data-tooltip', label);

    const labelNode = document.createElement('span');
    labelNode.className = '_x_extension_select_label_2024_unique_';
    labelNode.textContent = label;
    const icon = document.createElement('span');
    icon.className = '_x_extension_select_icon_2024_unique_';
    icon.appendChild(createIcon('ri-more-line'));

    trigger.appendChild(labelNode);
    trigger.appendChild(icon);
    control.appendChild(trigger);
    return control;
  }

  function createNewtabPreviewPager(label, includeManager) {
    const pager = document.createElement('div');
    pager.className = 'x-nt-bookmarks-pager';
    const buttons = [
      ['ri-arrow-left-s-line', formatRuntimeTemplate(
        getRuntimeMiscText('previousLabelTemplate', '{label} previous'),
        { label }
      ), true],
      ['ri-arrow-right-s-line', formatRuntimeTemplate(
        getRuntimeMiscText('nextLabelTemplate', '{label} next'),
        { label }
      ), false]
    ];
    if (includeManager) {
      buttons.push(['ri-bookmark-line', getRuntimeMiscText('bookmarkManagerLabel', 'Open bookmark manager'), false]);
    }
    buttons.forEach(([iconClass, ariaLabel, disabled]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'x-nt-bookmarks-pager-btn';
      button.tabIndex = -1;
      button.setAttribute('aria-label', ariaLabel);
      button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      button.appendChild(createIcon(iconClass));
      pager.appendChild(button);
    });
    return pager;
  }

  function createNewtabPreviewSection(kind, titleText, items) {
    const section = document.createElement('section');
    section.id = kind === 'recent'
      ? '_x_extension_newtab_recent_sites_2024_unique_'
      : '_x_extension_newtab_bookmarks_2024_unique_';
    section.className = `newtab-preview-section newtab-preview-section--${kind}`;
    section.dataset.visible = 'true';

    const header = document.createElement('div');
    header.className = kind === 'recent' ? 'x-nt-recent-header-bar' : 'x-nt-bookmarks-header';

    if (kind === 'recent') {
      const title = document.createElement('span');
      title.className = 'x-nt-recent-heading';
      title.textContent = titleText;
      header.appendChild(title);
      header.appendChild(createNewtabPreviewSectionModeSelect('recent'));
    } else {
      const titleWrap = document.createElement('div');
      titleWrap.className = 'x-nt-bookmarks-title-wrap';
      const title = document.createElement('span');
      title.className = 'x-nt-bookmarks-heading';
      title.textContent = titleText;
      titleWrap.appendChild(title);
      titleWrap.appendChild(createNewtabPreviewSectionModeSelect('bookmarks'));
      const breadcrumb = document.createElement('div');
      breadcrumb.className = 'x-nt-bookmarks-breadcrumb';
      breadcrumb.style.setProperty('display', 'none');
      titleWrap.appendChild(breadcrumb);
      header.appendChild(titleWrap);
      header.appendChild(createNewtabPreviewPager(titleText, true));
    }

    const grid = document.createElement('div');
    grid.id = kind === 'recent'
      ? '_x_extension_newtab_recent_sites_grid_2024_unique_'
      : '_x_extension_newtab_bookmarks_grid_2024_unique_';
    grid.className = `newtab-preview-grid newtab-preview-grid--${kind}`;
    items.forEach((item) => {
      grid.appendChild(kind === 'recent'
        ? createNewtabPreviewRecentCard(item)
        : createNewtabPreviewBookmarkCard(item));
    });

    section.appendChild(header);
    section.appendChild(grid);
    return section;
  }

  function createNewtabPreviewControls() {
    const controls = document.createElement('div');
    controls.className = 'newtab-preview-controls';

    const debugControl = document.createElement('div');
    debugControl.className = 'x-nt-bookmark-cascade-debug-control';
    const debugButton = document.createElement('button');
    debugButton.type = 'button';
    debugButton.className = 'x-nt-bookmark-cascade-debug-button';
    debugButton.tabIndex = -1;
    debugButton.setAttribute('aria-label', getRuntimeMiscText('debugBookmarkCascadeLabel', 'Debug bookmark cascade'));
    debugButton.appendChild(createIcon('ri-bug-line'));
    debugControl.appendChild(debugButton);

    const feedbackControl = document.createElement('div');
    feedbackControl.className = 'x-nt-feedback-control';
    const feedbackButton = document.createElement('button');
    feedbackButton.type = 'button';
    feedbackButton.className = 'x-nt-feedback-button';
    feedbackButton.tabIndex = -1;
    feedbackButton.setAttribute('aria-label', getRuntimeMiscText('feedbackLabel', 'Feedback'));
    feedbackButton.appendChild(createIcon('ri-message-3-line'));
    feedbackControl.appendChild(feedbackButton);

    const wallpaperControl = document.createElement('div');
    wallpaperControl.className = 'x-nt-wallpaper-control';
    const wallpaperButton = document.createElement('button');
    wallpaperButton.type = 'button';
    wallpaperButton.className = 'x-nt-wallpaper-button';
    wallpaperButton.tabIndex = -1;
    wallpaperButton.dataset.active = 'false';
    wallpaperButton.setAttribute('aria-label', getRuntimeMiscText('wallpaperLabel', 'Wallpaper'));
    wallpaperButton.appendChild(createIcon('ri-image-edit-line'));
    wallpaperControl.appendChild(wallpaperButton);

    controls.appendChild(debugControl);
    controls.appendChild(feedbackControl);
    controls.appendChild(wallpaperControl);
    return controls;
  }

  function createNewtabPreviewViewport() {
    const viewport = document.createElement('div');
    viewport.className = 'newtab-preview-viewport x-nt-bottom-layout';
    viewport.dataset.ntReady = '1';
    viewport.dataset.ntSuggestionsOpen = 'false';
    viewport.dataset.wallpaperActive = 'false';

    const bottomDock = document.createElement('div');
    bottomDock.id = '_x_extension_newtab_bottom_dock_2024_unique_';
    bottomDock.className = 'newtab-preview-bottom-dock';
    const bottomDockScroller = document.createElement('div');
    bottomDockScroller.id = '_x_extension_newtab_bottom_dock_scroller_2024_unique_';
    const sectionSafeCorridor = document.createElement('div');
    sectionSafeCorridor.id = '_x_extension_newtab_section_safe_corridor_2026_unique_';
    bottomDockScroller.appendChild(createNewtabPreviewSection('bookmarks', getNewtabPreviewSectionTitle('bookmarks', 'Bookmarks'), getNewtabPreviewBookmarks()));
    bottomDockScroller.appendChild(sectionSafeCorridor);
    bottomDockScroller.appendChild(createNewtabPreviewSection('recent', getNewtabPreviewSectionTitle('recent', 'Recent'), getNewtabPreviewRecentSites()));
    bottomDock.appendChild(bottomDockScroller);

    viewport.appendChild(createNewtabPreviewWordmark());
    viewport.appendChild(createNewtabPreviewSearchPanel());
    viewport.appendChild(createNewtabPreviewSuggestionsStack());
    viewport.appendChild(bottomDock);
    return viewport;
  }

  function createNewtabPreviewSurface() {
    const surface = document.createElement('div');
    surface.className = 'newtab-preview-surface';
    surface.setAttribute('aria-label', getRuntimeMiscText('newtabPreviewAriaLabel', 'Lumno new tab preview'));

    const browserBackdrop = document.createElement('div');
    browserBackdrop.className = 'browser-window newtab-preview-browser-backdrop';
    browserBackdrop.appendChild(createBrowserBar());

    const backdropClip = createBrowserWindowClip(browserBackdrop);
    backdropClip.classList.add('newtab-preview-browser-backdrop-clip');

    const browserForeground = document.createElement('div');
    browserForeground.className = 'newtab-preview-browser-foreground';
    const page = document.createElement('div');
    page.className = 'newtab-preview-browser-page';
    page.appendChild(createNewtabPreviewViewport());
    browserForeground.appendChild(page);

    const foregroundClip = createBrowserWindowClip(browserForeground);
    foregroundClip.classList.add('newtab-preview-browser-foreground-clip');

    surface.appendChild(backdropClip);
    surface.appendChild(foregroundClip);
    return surface;
  }

  function getFeatureArtworkSize(item) {
    const size = item && item.artSize;
    const width = size && Number(size.width) > 0 ? Number(size.width) : 298;
    const height = size && Number(size.height) > 0 ? Number(size.height) : 120;
    return { width, height };
  }

  function createHomepagePipArtwork() {
    const art = document.createElement('div');
    art.className = 'feature-card__art feature-card__art--pip';
    art.dataset.art = 'homepage-pip';
    art.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.className = 'feature-card__art-image';
    image.src = HOMEPAGE_PIP_ART_SRC;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    image.draggable = false;

    art.appendChild(image);
    return art;
  }

  function createNewtabFiltersArtwork() {
    const art = document.createElement('div');
    art.className = 'feature-card__art feature-card__art--newtab';
    art.dataset.art = 'newtab-filters';
    art.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.className = 'feature-card__art-image';
    image.src = NEWTAB_FILTERS_ART_SRC;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'eager';
    image.draggable = false;

    art.appendChild(image);
    return art;
  }

  function createBlankFeatureArtwork(item) {
    const size = getFeatureArtworkSize(item);
    const art = document.createElement('div');
    art.className = 'feature-card__art feature-card__art--blank';
    art.dataset.art = 'blank';
    art.dataset.artWidth = String(size.width);
    art.dataset.artHeight = String(size.height);
    art.setAttribute('aria-hidden', 'true');
    return art;
  }

  function createFeatureCardArtwork(item) {
    if (item && item.art === 'homepage-pip') {
      return createHomepagePipArtwork();
    }
    if (item && item.art === 'newtab-filters') {
      return createNewtabFiltersArtwork();
    }
    return createBlankFeatureArtwork(item);
  }

  function createFeatureCard(item, index) {
    const titleText = String(item && item.title || '').trim();
    const bodyText = String(item && item.body || '').trim();
    const tone = String(item && item.tone || '').trim();

    const card = document.createElement('article');
    card.className = 'feature-card';
    card.style.setProperty('--feature-card-index', String(index || 0));
    card.style.setProperty('--feature-card-delay', `${260 + (index || 0) * 90}ms`);
    if (tone) {
      card.dataset.tone = tone;
    }
    if (titleText || bodyText) {
      card.setAttribute('aria-label', bodyText
        ? `${titleText}${getRuntimeMiscText('featureCardAriaJoiner', ', ')}${bodyText}`
        : titleText);
    }

    const copy = document.createElement('header');
    copy.className = 'feature-card__copy';

    const heading = document.createElement('h2');
    heading.className = 'feature-card__title';
    heading.textContent = titleText;

    const description = document.createElement('p');
    description.className = 'feature-card__body';
    description.textContent = bodyText;

    copy.appendChild(heading);
    copy.appendChild(description);
    card.appendChild(copy);
    card.appendChild(createFeatureCardArtwork(item));
    return card;
  }

  function createFeatureAwardWheat(side) {
    const wheat = document.createElement('span');
    wheat.className = `feature-award__wheat feature-award__wheat--${side || 'left'}`;
    wheat.setAttribute('aria-hidden', 'true');
    return wheat;
  }

  function createFeatureAward(item, index) {
    const award = document.createElement('section');
    award.className = 'feature-award';
    award.style.setProperty('--feature-award-index', String(index || 0));
    award.style.setProperty('--feature-award-delay', `${180 + (index || 0) * 80}ms`);

    const label = document.createElement('div');
    label.className = 'feature-award__label';
    (Array.isArray(item && item.lines) ? item.lines : []).forEach((line) => {
      const row = document.createElement('span');
      row.textContent = String(line || '');
      label.appendChild(row);
    });

    award.appendChild(createFeatureAwardWheat('left'));
    award.appendChild(label);
    award.appendChild(createFeatureAwardWheat('right'));
    return award;
  }

  function createFeatureAwards() {
    const awards = document.createElement('div');
    awards.className = 'feature-cards-surface__awards';
    awards.setAttribute('aria-label', getRuntimeMiscText('principlesAriaLabel', 'Lumno principles'));
    getFeatureAwards().forEach((item, index) => {
      awards.appendChild(createFeatureAward(item, index));
    });
    return awards;
  }

  function createFeatureCardsSurface() {
    const surface = document.createElement('div');
    surface.className = 'feature-cards-surface';
    surface.setAttribute('aria-label', getRuntimeMiscText('practicalFeaturesAriaLabel', 'Lumno practical features'));

    const stack = document.createElement('div');
    stack.className = 'feature-cards-surface__stack';
    getFeatureCards().forEach((item, index) => {
      stack.appendChild(createFeatureCard(item, index));
    });

    surface.appendChild(createFeatureAwards());
    surface.appendChild(stack);
    return surface;
  }

  function renderVisualSurface(slide) {
    if (!visualStage) {
      return;
    }
    stopLumnoOverlayHoverLoop();
    stopNewtabPreviewHoverLoop();
    visualStage.classList.remove('is-visual-exit');
    if (cursorLayer) {
      cursorLayer.classList.remove('is-visual-exit');
    }
    visualStage.textContent = '';
    visualStage.dataset.visualKind = slide.visual.kind;
    if (cursorLayer) {
      cursorLayer.textContent = '';
      cursorLayer.dataset.cursorEnabled = 'false';
      cursorLayer.dataset.cursorMode = '';
    }
    if (slide.visual.visible) {
      if (slide.visual.kind === 'bookmark-focus-surface') {
        visualStage.appendChild(createBookmarkFocusSurface());
      } else if (slide.visual.kind === 'lumno-web-wordmark-surface') {
        visualStage.appendChild(createLumnoWebWordmarkSurface());
      } else if (slide.visual.kind === 'newtab-preview-surface') {
        const surface = createNewtabPreviewSurface();
        visualStage.appendChild(surface);
        startNewtabPreviewHoverLoop(surface);
      } else if (slide.visual.kind === 'site-search-demo-surface') {
        visualStage.appendChild(createSiteSearchDemoSurface());
      } else if (slide.visual.kind === 'feature-cards-surface') {
        visualStage.appendChild(createFeatureCardsSurface());
      } else {
        visualStage.appendChild(createGenericVisualSurface());
      }
    }
    renderCursor(slide);
  }

  function prepareVisualExit(nextState) {
    if (!blueprint || !state || !nextState || !visualStage || prefersReducedMotion()) {
      return;
    }
    const currentSlide = MODEL.getSlideByIndex(blueprint, state.index);
    const nextSlide = MODEL.getSlideByIndex(blueprint, nextState.index);
    const shouldBlurOut =
      currentSlide &&
      nextSlide &&
      currentSlide.visual &&
      nextSlide.visual &&
      currentSlide.visual.kind === 'bookmark-focus-surface' &&
      nextSlide.visual.kind === 'lumno-web-wordmark-surface';
    if (!shouldBlurOut) {
      return;
    }
    visualStage.classList.add('is-visual-exit');
    if (cursorLayer) {
      cursorLayer.classList.add('is-visual-exit');
    }
  }

  function renderActionButton(button, action) {
    if (!button) {
      return false;
    }
    const normalizedAction = action || null;
    button.hidden = !normalizedAction;
    button.disabled = !normalizedAction;
    if (!normalizedAction) {
      button.removeAttribute('data-action');
      button.removeAttribute('aria-label');
      button.removeAttribute('data-tooltip');
      button.removeAttribute('data-tooltip-max-width');
      return false;
    }
    button.dataset.action = normalizedAction.actionId;
    button.setAttribute('aria-label', normalizedAction.label);
    const tooltip = String(normalizedAction.tooltip || '').trim();
    if (tooltip) {
      button.dataset.tooltip = tooltip;
    } else {
      button.removeAttribute('data-tooltip');
    }
    const tooltipMaxWidth = Number(normalizedAction.tooltipMaxWidth);
    if (Number.isFinite(tooltipMaxWidth) && tooltipMaxWidth > 0) {
      button.dataset.tooltipMaxWidth = String(tooltipMaxWidth);
    } else {
      button.removeAttribute('data-tooltip-max-width');
    }
    const labelNode = button.querySelector('span');
    if (labelNode) {
      labelNode.textContent = normalizedAction.label;
    }
    const icon = button.querySelector('.ri-icon');
    if (icon) {
      const iconClass = String(normalizedAction.icon || '').trim();
      icon.hidden = !iconClass;
      icon.className = `ri-icon ri-size-14 ${iconClass}`.trim();
    }
    return true;
  }

  function renderCopyActions(slide) {
    if (!copyActions) {
      return;
    }
    const actions = slide.actions || {};
    if (copyActionsController) {
      copyActionsController.render(actions);
      return;
    }
    const hasPrimary = renderActionButton(primaryActionButton, actions.primary);
    const hasSecondary = renderActionButton(secondaryActionButton, actions.secondary);
    const hasGhost = renderActionButton(ghostActionButton, actions.ghost);
    const visible = hasPrimary || hasSecondary || hasGhost;
    copyActions.hidden = !visible;
    copyActions.dataset.visible = visible ? 'true' : 'false';
  }

  function renderCursor(slide) {
    if (!cursorLayer) {
      return;
    }
    cursorLayer.textContent = '';
    cursorLayer.dataset.cursorEnabled = slide.cursor.enabled ? 'true' : 'false';
    cursorLayer.dataset.cursorMode = slide.cursor.enabled ? slide.id : '';
    const cursor = document.createElement('span');
    cursor.className = 'demo-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.appendChild(createDemoCursorSvg());
    cursorLayer.appendChild(cursor);
  }

  function renderBodyCopy(slide) {
    const value = String(slide.copy.body || '');
    if (!body) {
      return;
    }
    const note = String(slide.copy.note || '');
    body.dataset.empty = value || note ? 'false' : 'true';
    if (bodyNote) {
      bodyNote.textContent = String(slide.copy.note || '');
    }
    if (!bodyPrefix || !shortcutLabel || !bodySuffix) {
      setText(body, value.replace(SHORTCUT_PLACEHOLDER, currentShortcutLabel));
      return;
    }
    if (!value.includes(SHORTCUT_PLACEHOLDER)) {
      bodyPrefix.textContent = value;
      shortcutLabel.textContent = '';
      shortcutLabel.hidden = true;
      bodySuffix.textContent = '';
      return;
    }
    const parts = value.split(SHORTCUT_PLACEHOLDER);
    bodyPrefix.textContent = parts[0] || '';
    renderShortcutLabel();
    bodySuffix.textContent = parts.slice(1).join(SHORTCUT_PLACEHOLDER);
  }

  function renderShortcutLabel() {
    if (!shortcutLabel) {
      return;
    }
    shortcutLabel.textContent = '';
    shortcutLabel.hidden = !currentShortcutLabel;
    if (!currentShortcutLabel) {
      shortcutLabel.removeAttribute('aria-label');
      return;
    }
    const tokens = getShortcutDisplayTokens(currentShortcutValue);
    const labels = tokens.length > 0 ? tokens : [currentShortcutLabel];
    shortcutLabel.setAttribute('aria-label', normalizeShortcutValue(currentShortcutValue) || currentShortcutLabel);
    labels.forEach((label) => {
      const keycap = document.createElement('span');
      keycap.className = 'shortcut-keycap';
      const text = String(label || '');
      if (text.length > 1) {
        const minWidth = Math.max(24, Math.round(text.length * 7.5 + 14));
        keycap.style.minWidth = `${minWidth}px`;
      }
      keycap.textContent = text;
      shortcutLabel.appendChild(keycap);
    });
  }

  function renderPageStrip() {
    if (!pageStrip || !blueprint || !state) {
      return;
    }
    const wasPageStripHidden = pageStrip.hidden;
    pageStrip.hidden = state.index <= 0;
    pageStrip.dataset.entering = wasPageStripHidden && !pageStrip.hidden ? 'true' : 'false';
    const pageCount = Math.max(1, blueprint.slides.length - 1);
    const currentPageIndex = Math.max(0, state.index - 1);
    pageStrip.style.setProperty('--page-strip-count', String(pageCount));
    pageStrip.setAttribute('aria-label', formatRuntimeTemplate(
      getRuntimeMiscText('pageStripAriaTemplate', 'Onboarding navigation, page {current} of {total}'),
      { current: currentPageIndex + 1, total: pageCount }
    ));
    if (pageStripController) {
      pageStripController.render({
        pageCount,
        currentPageIndex,
        hidden: pageStrip.hidden,
        entering: pageStrip.dataset.entering === 'true',
        ariaLabel: pageStrip.getAttribute('aria-label') || '',
        segmentAriaLabels: Array.from({ length: pageCount }, (_, pageIndex) => (
          formatRuntimeTemplate(
            getRuntimeMiscText('pageSegmentAriaTemplate', 'Page {page}'),
            { page: pageIndex + 1 }
          )
        ))
      });
      return;
    }
    pageStrip.textContent = '';
    if (pageStrip.hidden) {
      return;
    }
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const slideIndex = pageIndex + 1;
      const segment = document.createElement('button');
      segment.className = 'page-strip-segment';
      segment.type = 'button';
      segment.dataset.active = pageIndex === currentPageIndex ? 'true' : 'false';
      segment.dataset.slideTarget = String(slideIndex);
      segment.style.setProperty('--page-strip-segment-index', String(pageIndex));
      segment.setAttribute('aria-label', formatRuntimeTemplate(
        getRuntimeMiscText('pageSegmentAriaTemplate', 'Page {page}'),
        { page: pageIndex + 1 }
      ));
      if (pageIndex === currentPageIndex) {
        segment.setAttribute('aria-current', 'step');
      }
      pageStrip.appendChild(segment);
    }
  }

  function stopTitleCycle() {
    if (titleCycleInterval) {
      window.clearInterval(titleCycleInterval);
      titleCycleInterval = 0;
    }
    if (titleCycleFirstTimeout) {
      window.clearTimeout(titleCycleFirstTimeout);
      titleCycleFirstTimeout = 0;
    }
    if (titleCycleSwapTimeout) {
      window.clearTimeout(titleCycleSwapTimeout);
      titleCycleSwapTimeout = 0;
    }
    titleCycleIndex = 0;
  }

  function getTitleFitLines() {
    if (!title) {
      return [];
    }
    const lines = Array.from(title.querySelectorAll('.title-line'));
    return lines.length > 0 ? lines : [title];
  }

  function updateTitleFitScale() {
    if (!title) {
      return;
    }
    title.style.setProperty('--title-fit-scale', '1');
    if (title.dataset.empty === 'true') {
      return;
    }
    const availableWidth = title.clientWidth;
    if (!availableWidth) {
      return;
    }
    const widestLine = getTitleFitLines().reduce((maxWidth, line) => {
      return Math.max(maxWidth, line.scrollWidth || line.getBoundingClientRect().width || 0);
    }, 0);
    if (!widestLine) {
      return;
    }
    const scale = Math.max(0.78, Math.min(1, availableWidth / widestLine));
    title.style.setProperty('--title-fit-scale', scale.toFixed(3));
  }

  function scheduleTitleFitUpdate() {
    if (!title || typeof window.requestAnimationFrame !== 'function') {
      updateTitleFitScale();
      return;
    }
    if (titleFitFrame) {
      window.cancelAnimationFrame(titleFitFrame);
    }
    titleFitFrame = window.requestAnimationFrame(() => {
      titleFitFrame = 0;
      updateTitleFitScale();
    });
  }

  function isFrameScaledOnboardingLayout() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1240px) and (min-width: 860px), (max-height: 760px) and (min-height: 560px) and (min-width: 860px)').matches;
  }

  function isStackedOnboardingLayout() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 859px), (max-height: 559px)').matches;
  }

  function resetStackedLayoutScroll() {
    if (!root || !isStackedOnboardingLayout()) {
      return;
    }
    root.scrollTop = 0;
    if (typeof window.requestAnimationFrame !== 'function') {
      return;
    }
    window.requestAnimationFrame(() => {
      if (!root || !isStackedOnboardingLayout()) {
        return;
      }
      root.scrollTop = 0;
    });
  }

  function updateOnboardingFrameScale() {
    if (!root) {
      return;
    }
    const shouldScaleFrame = isFrameScaledOnboardingLayout();
    const viewportWidth = window.innerWidth || root.clientWidth || ONBOARDING_FRAME_WIDTH;
    const viewportHeight = window.innerHeight || root.clientHeight || ONBOARDING_FRAME_HEIGHT;
    const scale = shouldScaleFrame
      ? Math.max(0.1, Math.min(1, viewportWidth / ONBOARDING_FRAME_WIDTH, viewportHeight / ONBOARDING_FRAME_HEIGHT))
      : 1;
    root.style.setProperty('--onboarding-frame-scale', scale.toFixed(3));
    root.style.setProperty('--onboarding-frame-rendered-width', `${(ONBOARDING_FRAME_WIDTH * scale).toFixed(2)}px`);
    root.style.setProperty('--onboarding-frame-rendered-height', `${(ONBOARDING_FRAME_HEIGHT * scale).toFixed(2)}px`);
  }

  function getCompactCopyContentHeight() {
    if (!copyPanel) {
      return 0;
    }
    const panelStyle = window.getComputedStyle(copyPanel);
    const paddingTop = parseFloat(panelStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(panelStyle.paddingBottom) || 0;
    const rowGap = parseFloat(panelStyle.rowGap || panelStyle.gap) || 0;
    const rows = [
      copyPanel.querySelector('.copy-block'),
      copyPanel.querySelector('.interaction-slots'),
      copyPanel.querySelector('.onboarding-copy-actions')
    ].filter((element) => {
      if (!element || element.hidden) {
        return false;
      }
      const elementStyle = window.getComputedStyle(element);
      return elementStyle.display !== 'none' && elementStyle.visibility !== 'hidden';
    });
    const rowsHeight = rows.reduce((sum, element) => (
      sum + element.getBoundingClientRect().height
    ), 0);
    return paddingTop + paddingBottom + rowsHeight + (Math.max(0, rows.length - 1) * rowGap);
  }

  function updateVisualCanvasScale() {
    if (!root || !visualSlot || !visualPanel || !visualCanvas) {
      return;
    }
    updateOnboardingFrameScale();
    const rect = visualSlot.getBoundingClientRect();
    const isCompactLayout = isStackedOnboardingLayout();
    const viewportWidth = window.innerWidth || root.clientWidth || VISUAL_CANVAS_WIDTH;
    const viewportHeight = window.innerHeight || root.clientHeight || VISUAL_CANVAS_HEIGHT;
    const availableWidth = isCompactLayout
      ? Math.min(viewportWidth, visualSlot.clientWidth || rect.width || viewportWidth)
      : (visualSlot.clientWidth || rect.width || 0);
    const compactVisualHeight = Math.max(0, viewportHeight - getCompactCopyContentHeight());
    const availableHeight = isCompactLayout
      ? compactVisualHeight
      : (visualSlot.clientHeight || rect.height || 0);
    if (!availableWidth || (!isCompactLayout && !availableHeight)) {
      return;
    }
    const scale = isCompactLayout
      ? Math.max(0.1, Math.min(availableWidth / VISUAL_CANVAS_WIDTH, availableHeight / VISUAL_CANVAS_HEIGHT))
      : Math.max(0.1, Math.min(1, availableWidth / VISUAL_CANVAS_WIDTH, availableHeight / VISUAL_CANVAS_HEIGHT));
    root.style.setProperty('--onboarding-visual-scale', scale.toFixed(3));
    root.style.setProperty('--onboarding-visual-rendered-width', `${(VISUAL_CANVAS_WIDTH * scale).toFixed(2)}px`);
    root.style.setProperty('--onboarding-visual-rendered-height', `${(VISUAL_CANVAS_HEIGHT * scale).toFixed(2)}px`);
  }

  function scheduleVisualCanvasScaleUpdate() {
    if (!visualCanvas || typeof window.requestAnimationFrame !== 'function') {
      updateVisualCanvasScale();
      return;
    }
    if (visualScaleFrame) {
      window.cancelAnimationFrame(visualScaleFrame);
    }
    visualScaleFrame = window.requestAnimationFrame(() => {
      visualScaleFrame = 0;
      updateVisualCanvasScale();
    });
  }

  function getTitleCycleItems(titleCycle) {
    return titleCycle && Array.isArray(titleCycle.items)
      ? titleCycle.items.filter((item) => item && item.label && item.tone)
      : [];
  }

  function setTitleCycleItem(rotator, item) {
    const textNode = rotator
      ? rotator.querySelector('[data-title-rotator-text]')
      : null;
    if (!rotator || !textNode || !item) {
      return;
    }
    setTitleCycleWidth(rotator, item.label);
    rotator.dataset.tone = item.tone;
    textNode.textContent = item.label;
    scheduleTitleFitUpdate();
  }

  function getTitleCycleMeasureNode(rotator) {
    if (!rotator) {
      return null;
    }
    let measureNode = rotator.querySelector('[data-title-rotator-measure]');
    if (measureNode) {
      return measureNode;
    }
    measureNode = document.createElement('span');
    measureNode.className = 'title-rotator__measure';
    measureNode.setAttribute('data-title-rotator-measure', '');
    measureNode.setAttribute('aria-hidden', 'true');
    rotator.appendChild(measureNode);
    return measureNode;
  }

  function measureTitleCycleWidth(rotator, label) {
    const measureNode = getTitleCycleMeasureNode(rotator);
    if (!rotator || !measureNode) {
      return 0;
    }
    measureNode.textContent = String(label || '');
    const style = getComputedStyle(rotator);
    const padding = (Number.parseFloat(style.paddingLeft) || 0) +
      (Number.parseFloat(style.paddingRight) || 0);
    return Math.ceil(measureNode.getBoundingClientRect().width + padding);
  }

  function setTitleCycleWidth(rotator, label) {
    const width = measureTitleCycleWidth(rotator, label);
    if (width > 0) {
      rotator.style.width = `${width}px`;
    }
  }

  function swapTitleCycleItem(rotator, item) {
    const textNode = rotator
      ? rotator.querySelector('[data-title-rotator-text]')
      : null;
    if (!rotator || !textNode || !item) {
      return;
    }
    if (prefersReducedMotion()) {
      setTitleCycleItem(rotator, item);
      return;
    }
    if (titleCycleSwapTimeout) {
      window.clearTimeout(titleCycleSwapTimeout);
      titleCycleSwapTimeout = 0;
    }
    setTitleCycleWidth(rotator, item.label);
    scheduleTitleFitUpdate();
    textNode.classList.add('is-exit');
    titleCycleSwapTimeout = window.setTimeout(() => {
      titleCycleSwapTimeout = 0;
      if (!rotator.isConnected || !textNode.isConnected) {
        return;
      }
      rotator.dataset.tone = item.tone;
      textNode.textContent = item.label;
      textNode.classList.remove('is-exit');
      textNode.classList.add('is-enter-start');
      void textNode.offsetHeight;
      textNode.classList.remove('is-enter-start');
      scheduleTitleFitUpdate();
    }, getTextSwapDurationMs());
  }

  function advanceTitleCycle(rotator, items) {
    if (!rotator || !rotator.isConnected || !Array.isArray(items) || items.length < 2) {
      return false;
    }
    titleCycleIndex = (titleCycleIndex + 1) % items.length;
    swapTitleCycleItem(rotator, items[titleCycleIndex]);
    return true;
  }

  function startTitleCycle(rotator, items) {
    stopTitleCycle();
    const safeItems = Array.isArray(items) ? items : [];
    if (!rotator || safeItems.length < 2 || prefersReducedMotion()) {
      return;
    }
    titleCycleIndex = 0;
    titleCycleFirstTimeout = window.setTimeout(() => {
      titleCycleFirstTimeout = 0;
      advanceTitleCycle(rotator, safeItems);
      titleCycleInterval = window.setInterval(() => {
        advanceTitleCycle(rotator, safeItems);
      }, TITLE_CYCLE_INTERVAL_MS);
    }, TITLE_CYCLE_FIRST_DELAY_MS);
  }

  function createTitleLogoMark(titleLogo) {
    if (!titleLogo || !titleLogo.src) {
      return null;
    }
    const logo = document.createElement('img');
    logo.className = 'title-logo-mark';
    logo.src = String(titleLogo.src || '');
    logo.alt = '';
    logo.decoding = 'async';
    logo.loading = 'eager';
    logo.setAttribute('aria-hidden', 'true');
    const label = String(titleLogo.label || '').trim();
    if (label) {
      logo.title = label;
    }
    return logo;
  }

  function appendTitleLine(text, titleLogo) {
    const span = document.createElement('span');
    const logo = createTitleLogoMark(titleLogo);
    span.className = logo ? 'title-line title-line--with-logo' : 'title-line';
    span.appendChild(document.createTextNode(String(text || '')));
    if (logo) {
      span.appendChild(logo);
    }
    title.appendChild(span);
  }

  function renderTitleCycleCopy(slide, lines) {
    const titleCycle = slide.copy.titleCycle || null;
    const items = getTitleCycleItems(titleCycle);
    if (items.length === 0) {
      return false;
    }
    title.setAttribute('aria-label', String(slide.copy.title || ''));

    const firstLine = document.createElement('span');
    firstLine.className = 'title-line title-line--rotating';
    firstLine.appendChild(document.createTextNode(String(titleCycle.prefix || '')));

    const rotator = document.createElement('span');
    rotator.className = 'title-rotator t-resize';
    rotator.dataset.tone = items[0].tone;
    rotator.setAttribute('aria-hidden', 'true');
    rotator.setAttribute('data-title-rotator', '');

    const textNode = document.createElement('span');
    textNode.className = 'title-rotator__text t-text-swap';
    textNode.setAttribute('data-title-rotator-text', '');
    textNode.textContent = items[0].label;
    rotator.appendChild(textNode);
    firstLine.appendChild(rotator);
    title.appendChild(firstLine);
    setTitleCycleWidth(rotator, items[0].label);

    const secondLine = String(lines[1] || '');
    if (secondLine) {
      const breakNode = document.createElement('br');
      breakNode.className = 'title-break';
      breakNode.setAttribute('aria-hidden', 'true');
      title.appendChild(breakNode);
      appendTitleLine(secondLine, slide.copy.titleLogo);
    }

    startTitleCycle(rotator, items);
    scheduleTitleFitUpdate();
    return true;
  }

  function renderTitleCopy(slide) {
    if (!title) {
      return;
    }
    stopTitleCycle();
    const text = String(slide.copy.title || '');
    const lines = Array.isArray(slide.copy.titleLines) ? slide.copy.titleLines : [];
    title.dataset.empty = text ? 'false' : 'true';
    title.textContent = '';
    title.removeAttribute('aria-label');
    if (lines.length > 0 && text) {
      title.setAttribute('aria-label', text);
    }
    if (renderTitleCycleCopy(slide, lines)) {
      return;
    }
    if (lines.length === 0) {
      title.textContent = text;
      scheduleTitleFitUpdate();
      return;
    }
    lines.forEach((line, index) => {
      if (index > 0) {
        const breakNode = document.createElement('br');
        breakNode.className = 'title-break';
        breakNode.setAttribute('aria-hidden', 'true');
        title.appendChild(breakNode);
      }
      appendTitleLine(String(line || ''), index === lines.length - 1 ? slide.copy.titleLogo : null);
    });
    scheduleTitleFitUpdate();
  }

  function render() {
    if (!blueprint || !state) {
      return;
    }
    const slide = MODEL.getSlideByIndex(blueprint, state.index);
    if (!slide || !root) {
      return;
    }
    root.dataset.activeSlide = slide.id;
    root.dataset.activeIndex = String(state.index);
    root.dataset.direction = state.direction;
    root.dataset.cursorReady = slide.cursor.enabled ? 'true' : 'false';
    root.dataset.visualVisible = slide.visual.visible ? 'true' : 'false';
    document.documentElement.lang = blueprint.htmlLang || 'en';
    document.title = `${blueprint.brand} Onboarding`;

    if (copyPanel) {
      copyPanel.dataset.slideId = slide.id;
    }
    renderPageStrip();
    setText(eyebrow, slide.copy.eyebrow);
    renderTitleCopy(slide);
    renderBodyCopy(slide);
    renderInteractions(slide);
    renderCopyActions(slide);
    renderVisualSurface(slide);
    scheduleVisualCanvasScaleUpdate();
  }

  function getCopySwapTargets() {
    return [title, body].filter(Boolean);
  }

  function clearCopySwapClasses() {
    getCopySwapTargets().forEach((element) => {
      element.classList.remove('t-copy-swap', 'is-exit', 'is-enter-start');
    });
  }

  function clearCursorTransitionStart() {
    if (!root) {
      return;
    }
    root.style.removeProperty('--onboarding-cursor-transition-left');
    root.style.removeProperty('--onboarding-cursor-transition-top');
    root.style.removeProperty('--onboarding-cursor-transition-transform');
  }

  function captureCursorTransitionStart(nextState) {
    if (!root || !blueprint || !state || !nextState || !cursorLayer) {
      clearCursorTransitionStart();
      return;
    }
    const currentSlide = MODEL.getSlideByIndex(blueprint, state.index);
    const nextSlide = MODEL.getSlideByIndex(blueprint, nextState.index);
    const shouldCapture =
      currentSlide &&
      nextSlide &&
      (
        (currentSlide.id === 'intro' && nextSlide.id === 'setup') ||
        (currentSlide.id === 'setup' && nextSlide.id === 'search') ||
        (currentSlide.id === 'search' && nextSlide.id === 'newtab') ||
        (currentSlide.id === 'newtab' && nextSlide.id === 'finish')
      ) &&
      nextState.direction === 'forward';
    if (!shouldCapture) {
      clearCursorTransitionStart();
      return;
    }
    const cursor = cursorLayer.querySelector('.demo-cursor');
    if (!cursor) {
      clearCursorTransitionStart();
      return;
    }
    const style = getComputedStyle(cursor);
    const leftPx = Number.parseFloat(style.left);
    const topPx = Number.parseFloat(style.top);
    const layerWidth = cursorLayer.clientWidth;
    const layerHeight = cursorLayer.clientHeight;
    if (!Number.isFinite(leftPx) || !Number.isFinite(topPx) || !layerWidth || !layerHeight) {
      clearCursorTransitionStart();
      return;
    }
    const left = (leftPx / layerWidth) * 100;
    const top = (topPx / layerHeight) * 100;
    const transform = String(style.transform || '').trim();
    root.style.setProperty('--onboarding-cursor-transition-left', `${Math.max(0, Math.min(100, left)).toFixed(2)}%`);
    root.style.setProperty('--onboarding-cursor-transition-top', `${Math.max(0, Math.min(100, top)).toFixed(2)}%`);
    if (transform && transform !== 'none') {
      root.style.setProperty('--onboarding-cursor-transition-transform', transform);
    } else {
      root.style.removeProperty('--onboarding-cursor-transition-transform');
    }
  }

  function commitState(nextState) {
    state = nextState;
    syncOnboardingSlideParam(state.index);
    render();
    resetStackedLayoutScroll();
  }

  function animateCopySwap(nextState) {
    if (copySwapTimeout) {
      window.clearTimeout(copySwapTimeout);
      copySwapTimeout = 0;
    }
    const targets = getCopySwapTargets();
    if (targets.length === 0 || prefersReducedMotion()) {
      clearCopySwapClasses();
      captureCursorTransitionStart(nextState);
      commitState(nextState);
      return;
    }
    prepareVisualExit(nextState);
    targets.forEach((element) => {
      element.classList.add('t-copy-swap');
      element.classList.remove('is-enter-start');
      element.classList.add('is-exit');
    });
    copySwapTimeout = window.setTimeout(() => {
      copySwapTimeout = 0;
      captureCursorTransitionStart(nextState);
      commitState(nextState);
      const nextTargets = getCopySwapTargets();
      nextTargets.forEach((element) => {
        element.classList.add('t-copy-swap', 'is-enter-start');
        element.classList.remove('is-exit');
      });
      nextTargets.forEach((element) => {
        void element.offsetHeight;
      });
      nextTargets.forEach((element) => {
        element.classList.remove('is-enter-start');
      });
    }, getTextSwapDurationMs());
  }

  function dispatch(action) {
    if (!state || !blueprint) {
      return;
    }
    const nextState = MODEL.reduceOnboardingState(state, action);
    if (nextState.index === state.index || nextState.direction === 'none') {
      commitState(nextState);
      return;
    }
    animateCopySwap(nextState);
  }

  function runExtensionAction(actionTarget, event) {
    const target = typeof actionTarget === 'string' ? null : actionTarget;
    const id = typeof actionTarget === 'string'
      ? String(actionTarget || '')
      : String(target && target.dataset && target.dataset.action || '');
    if (!id) {
      return;
    }
    const disposition = getOpenDisposition(event, 'newTab');
    if (id === 'next') {
      dispatch({ type: 'NEXT' });
      return;
    }
    if (id === 'prev') {
      dispatch({ type: 'PREV' });
      return;
    }
    if (id === 'toggleInteractionAccordion') {
      toggleInteractionAccordion(target && target.dataset && target.dataset.accordionId);
      return;
    }
    if (id === 'openChromeWebStore') {
      openExternalTab(LUMNO_CHROME_WEB_STORE_URL, disposition);
      return;
    }
    if (id === 'openNewtab') {
      if (disposition !== 'backgroundTab') {
        if (navigateOnboardingToNewtab()) {
          return;
        }
      }
    }

    const chromeApi = getChromeApi();
    const messageAction = ACTION_MESSAGE_BY_ID[id];
    if (!messageAction || !chromeApi || !chromeApi.runtime || typeof chromeApi.runtime.sendMessage !== 'function') {
      if (id === 'openSiteSearchOptions') {
        openSiteSearchOptionsFallback(disposition);
      }
      return;
    }
    try {
      chromeApi.runtime.sendMessage({
        action: messageAction,
        disposition
      }, (response) => {
        const lastError = chromeApi.runtime && chromeApi.runtime.lastError;
        if (id === 'openSiteSearchOptions' && (lastError || !response || response.ok === false)) {
          openSiteSearchOptionsFallback(disposition);
        }
      });
    } catch (error) {
      if (id === 'openSiteSearchOptions') {
        openSiteSearchOptionsFallback(disposition);
      }
    }
  }

  document.addEventListener('click', (event) => {
    const accordionLinkTarget = event.target && event.target.closest
      ? event.target.closest('.interaction-accordion-link[data-action]')
      : null;
    if (accordionLinkTarget) {
      event.preventDefault();
      runExtensionAction(accordionLinkTarget, event);
      return;
    }
    if (event.target && event.target.closest && event.target.closest('.interaction-accordion-panel')) {
      return;
    }
    const target = event.target && event.target.closest
      ? event.target.closest('[data-action], [data-slide-target]')
      : null;
    if (!target) {
      return;
    }
    event.preventDefault();
    if (target.dataset.slideTarget) {
      dispatch({ type: 'GOTO', index: Number(target.dataset.slideTarget) });
      return;
    }
    runExtensionAction(target, event);
  });

  document.addEventListener('auxclick', (event) => {
    if (!event || Number(event.button) !== 1) {
      return;
    }
    const target = event.target && event.target.closest
      ? event.target.closest('.interaction-accordion-link[data-action]')
      : null;
    if (!target) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    runExtensionAction(target, event);
  });

  document.addEventListener('keydown', (event) => {
    if (!event || event.defaultPrevented) {
      return;
    }
    if (shortcutHotkeyMatchesEvent(currentShortcutValue, event)) {
      if (isEditableTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      triggerOnboardingSearchOverlay();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      dispatch({ type: 'NEXT' });
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      dispatch({ type: 'PREV' });
    } else if (event.key === 'Home') {
      event.preventDefault();
      dispatch({ type: 'HOME' });
    } else if (event.key === 'End') {
      event.preventDefault();
      dispatch({ type: 'END' });
    }
  });

  const initialChromeApi = getChromeApi();
  if (initialChromeApi &&
      initialChromeApi.runtime &&
      initialChromeApi.runtime.onMessage &&
      typeof initialChromeApi.runtime.onMessage.addListener === 'function') {
    initialChromeApi.runtime.onMessage.addListener(handleOnboardingCommandMessage);
  }

  if (!copyActionsController) {
    [primaryActionButton, secondaryActionButton, ghostActionButton].forEach(bindActionButtonTooltip);
  }
  scheduleTitleFitUpdate();
  scheduleVisualCanvasScaleUpdate();
  window.addEventListener('resize', () => {
    scheduleTitleFitUpdate();
    scheduleVisualCanvasScaleUpdate();
  });
  if (visualSlot && typeof ResizeObserver === 'function') {
    visualResizeObserver = new ResizeObserver(scheduleVisualCanvasScaleUpdate);
    visualResizeObserver.observe(visualSlot);
  }

  getRuntimeLocale((locale) => {
    blueprint = MODEL.getOnboardingBlueprint(locale);
    runtimeCopy = blueprint.runtimeCopy || runtimeCopy;
    const requestedIndex = Number(params.get('slide') || 0);
    state = MODEL.createOnboardingState(blueprint.slides.length, requestedIndex);
    updateVersionChip();
    render();
    refreshCurrentShortcut(true);
  });

  window.addEventListener('focus', () => refreshCurrentShortcut(true), true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshCurrentShortcut(true);
    }
  }, true);
})();
