(function(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoFeatureHints = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  const NAVIGATION_DISPOSITION = root && root.LumnoNavigationDisposition
    ? root.LumnoNavigationDisposition
    : {};
  const FEATURE_HINTS = Object.freeze({
    NEWTAB_WALLPAPER: Object.freeze({
      id: 'newtab-wallpaper',
      introducedIn: '0.9.9',
      surface: 'newtab',
      placement: 'bottom-right wallpaper control',
      className: 'x-lumno-feature-hint--newtab-wallpaper',
      arrowSide: 'right',
      arrowAlign: 'center',
      widthMode: 'content',
      dismissStorage: 'sync',
      rememberOnFirstShow: true,
      roundedArrowTip: true,
      badgeIcon: 'ri-asterisk',
      badgeKey: 'newtab_wallpaper_feature_hint_badge',
      badgeFallback: 'New',
      textKey: 'newtab_wallpaper_feature_hint_text',
      textFallback: 'New Tab now supports changing wallpaper!',
      closeLabelKey: 'newtab_wallpaper_feature_hint_close',
      closeLabelFallback: 'Dismiss wallpaper tip'
    }),
    NEWTAB_AI_QUICK_JUMP: Object.freeze({
      id: 'newtab-ai-quick-jump',
      introducedIn: '0.9.9',
      surface: 'newtab',
      placement: 'below search input',
      className: 'x-lumno-feature-hint--newtab-ai-quick-jump',
      arrowSide: 'top',
      arrowAlign: 'center',
      widthMode: 'container',
      alignMode: 'auto',
      dismissStorage: 'sync',
      rememberOnFirstShow: true,
      roundedArrowTip: true,
      badgeIcon: 'ri-asterisk',
      badgeKey: 'newtab_ai_quick_jump_feature_hint_badge',
      badgeFallback: 'New',
      textKey: 'newtab_ai_quick_jump_feature_hint_text',
      textFallback: 'Jump to popular AI sites with your prompt in one click. Try typing "gemini" and pressing Tab.',
      linkKey: 'newtab_ai_quick_jump_feature_hint_link',
      linkFallback: 'Support list',
      closeLabelKey: 'newtab_ai_quick_jump_feature_hint_close',
      closeLabelFallback: 'Dismiss AI quick jump tip'
    }),
    NEWTAB_TAB_SWITCHER: Object.freeze({
      id: 'newtab-tab-switcher',
      introducedIn: '0.9.13',
      surface: 'newtab',
      placement: 'newtab settings icon',
      className: 'x-lumno-feature-hint--newtab-tab-switcher',
      arrowSide: 'top',
      arrowAlign: 'end',
      widthMode: 'fixed',
      alignMode: 'auto',
      dismissStorage: 'sync',
      rememberOnFirstShow: true,
      roundedArrowTip: true,
      badgeIcon: 'ri-asterisk',
      badgeKey: 'newtab_tab_switcher_feature_hint_badge',
      badgeFallback: 'New',
      textKey: 'newtab_tab_switcher_feature_hint_text',
      textFallback: 'Press Alt+Q to open the tab switcher and jump through recent tabs without reaching for the mouse.',
      closeLabelKey: 'newtab_tab_switcher_feature_hint_close',
      closeLabelFallback: 'Dismiss tab switcher tip'
    })
  });

  const FEATURE_HINT_ARROW_SIDES = Object.freeze({
    top: true,
    right: true,
    bottom: true,
    left: true
  });

  const FEATURE_HINT_ARROW_ALIGNS = Object.freeze({
    start: true,
    center: true,
    end: true
  });

  const FEATURE_HINT_DISMISS_STORAGE_TYPES = Object.freeze({
    none: true,
    session: true,
    local: true,
    sync: true
  });

  const FEATURE_HINT_WIDTH_MODES = Object.freeze({
    fixed: true,
    container: true,
    content: true
  });

  const FEATURE_HINT_ALIGN_MODES = Object.freeze({
    center: true,
    start: true,
    auto: true
  });

  const FEATURE_HINT_SESSION_DISMISS_PREFIX = '_x_lumno_feature_hint_session_dismissed_2026_';
  const FEATURE_HINT_LOCAL_DISMISS_PREFIX = '_x_lumno_feature_hint_local_dismissed_2026_';
  const FEATURE_HINT_SYNC_DISMISS_PREFIX = '_x_lumno_feature_hint_sync_dismissed_2026_';

  const FEATURE_HINTS_BY_ID = Object.freeze(Object.keys(FEATURE_HINTS).reduce((map, key) => {
    const hint = FEATURE_HINTS[key];
    map[hint.id] = hint;
    return map;
  }, {}));

  function getMessage(t, key, fallback) {
    return typeof t === 'function' ? t(key, fallback) : (fallback || '');
  }

  function getDefaultRiSvg(id, sizeClass) {
    const size = sizeClass || 'ri-size-16';
    return '<i class="ri-icon ' + size + ' ' + id + '" aria-hidden="true"></i>';
  }

  function getDomIdPart(id) {
    return String(id || 'feature-hint').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'feature_hint';
  }

  function normalizeFeatureHintValue(value, allowedValues, fallback) {
    const normalized = String(value || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(allowedValues, normalized) ? normalized : fallback;
  }

  function normalizeArrowSide(value) {
    return normalizeFeatureHintValue(value, FEATURE_HINT_ARROW_SIDES, 'bottom');
  }

  function normalizeArrowAlign(value) {
    return normalizeFeatureHintValue(value, FEATURE_HINT_ARROW_ALIGNS, 'center');
  }

  function normalizeDismissStorage(value) {
    return normalizeFeatureHintValue(value, FEATURE_HINT_DISMISS_STORAGE_TYPES, 'none');
  }

  function normalizeWidthMode(value) {
    return normalizeFeatureHintValue(value, FEATURE_HINT_WIDTH_MODES, 'fixed');
  }

  function normalizeAlignMode(value) {
    return normalizeFeatureHintValue(value, FEATURE_HINT_ALIGN_MODES, 'center');
  }

  function getFeatureHintStorageId(definition) {
    const hint = getFeatureHint(definition);
    const idPart = getDomIdPart(hint ? hint.id : '');
    const versionPart = getDomIdPart(hint && hint.introducedIn ? hint.introducedIn : 'unversioned');
    return `${idPart}_${versionPart}`;
  }

  function getFeatureHintDismissKey(definition, storageType) {
    const normalizedStorageType = normalizeDismissStorage(storageType);
    const prefix = normalizedStorageType === 'sync'
      ? FEATURE_HINT_SYNC_DISMISS_PREFIX
      : (normalizedStorageType === 'local'
        ? FEATURE_HINT_LOCAL_DISMISS_PREFIX
        : FEATURE_HINT_SESSION_DISMISS_PREFIX);
    return prefix + getFeatureHintStorageId(definition);
  }

  function getFeatureHintSessionDismissKey(definition) {
    return getFeatureHintDismissKey(definition, 'session');
  }

  function getFeatureHintLocalDismissKey(definition) {
    return getFeatureHintDismissKey(definition, 'local');
  }

  function getFeatureHintSyncDismissKey(definition) {
    return getFeatureHintDismissKey(definition, 'sync');
  }

  function getLegacyLocalDismissKeyForSyncKey(key) {
    const rawKey = String(key || '');
    if (!rawKey.startsWith(FEATURE_HINT_SYNC_DISMISS_PREFIX)) {
      return '';
    }
    return FEATURE_HINT_LOCAL_DISMISS_PREFIX + rawKey.slice(FEATURE_HINT_SYNC_DISMISS_PREFIX.length);
  }

  function getDismissStorageArea(chromeApi, storageType) {
    if (!chromeApi || !chromeApi.storage) {
      return null;
    }
    if (storageType === 'sync') {
      return chromeApi.storage.sync || chromeApi.storage.local || null;
    }
    if (storageType === 'local') {
      return chromeApi.storage.local || null;
    }
    if (storageType === 'session') {
      return chromeApi.storage.session || null;
    }
    return null;
  }

  function getStoredDismissedFromArea(chromeApi, storageArea, key) {
    if (!storageArea || typeof storageArea.get !== 'function') {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      try {
        storageArea.get([key], (result) => {
          const runtimeError = chromeApi && chromeApi.runtime
            ? chromeApi.runtime.lastError
            : null;
          resolve(!runtimeError && Boolean(result && result[key]));
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function getStoredDismissed(chromeApi, key, storageType) {
    const storageArea = getDismissStorageArea(chromeApi, storageType);
    return getStoredDismissedFromArea(chromeApi, storageArea, key).then((isDismissed) => {
      if (isDismissed || storageType !== 'sync') {
        return isDismissed;
      }
      const localArea = chromeApi && chromeApi.storage ? chromeApi.storage.local : null;
      const legacyLocalKey = getLegacyLocalDismissKeyForSyncKey(key);
      if (!localArea || !legacyLocalKey) {
        return false;
      }
      return getStoredDismissedFromArea(chromeApi, localArea, legacyLocalKey).then((legacyDismissed) => {
        if (legacyDismissed) {
          setStoredDismissed(chromeApi, key, storageType);
        }
        return legacyDismissed;
      });
    });
  }

  function setStoredDismissed(chromeApi, key, storageType) {
    const storageArea = getDismissStorageArea(chromeApi, storageType);
    if (!storageArea || typeof storageArea.set !== 'function') {
      return;
    }
    try {
      storageArea.set({ [key]: true }, () => {});
    } catch (e) {
      // Storage errors should not block the visible in-page dismissal.
    }
  }

  function getFeatureHint(definition) {
    if (!definition) {
      return null;
    }
    if (typeof definition === 'string') {
      return FEATURE_HINTS_BY_ID[definition] || FEATURE_HINTS[definition] || null;
    }
    return definition;
  }

  function createFeatureHint(options) {
    const config = options || {};
    const documentObj = config.documentObj || (typeof document !== 'undefined' ? document : null);
    const definition = getFeatureHint(config.definition || config.id || config.hint);
    const featureHintView = root && root.LumnoFeatureHintView;
    if (!definition || !documentObj || !featureHintView ||
        typeof featureHintView.createFeatureHintView !== 'function') {
      return null;
    }
    const t = typeof config.t === 'function' ? config.t : null;
    const getRiSvg = typeof config.getRiSvg === 'function' ? config.getRiSvg : getDefaultRiSvg;
    const idPart = getDomIdPart(definition.id);
    const arrowSide = normalizeArrowSide(config.arrowSide || definition.arrowSide);
    const arrowAlign = normalizeArrowAlign(config.arrowAlign || definition.arrowAlign);
    const dismissStorage = normalizeDismissStorage(config.dismissStorage || definition.dismissStorage);
    const widthMode = normalizeWidthMode(config.widthMode || definition.widthMode);
    const alignMode = normalizeAlignMode(config.alignMode || definition.alignMode);
    const chromeApi = config.chromeApi || (typeof chrome !== 'undefined' ? chrome : null);
    const dismissKey = config.dismissKey ||
      (dismissStorage === 'sync'
        ? (config.syncDismissKey || getFeatureHintSyncDismissKey(definition))
        : (dismissStorage === 'local'
          ? (config.localDismissKey || getFeatureHintLocalDismissKey(definition))
          : (config.sessionDismissKey || getFeatureHintSessionDismissKey(definition))));
    const windowObj = config.windowObj || (documentObj && documentObj.defaultView) ||
      (typeof window !== 'undefined' ? window : null);
    const rememberOnFirstShow = typeof config.rememberOnFirstShow === 'boolean'
      ? config.rememberOnFirstShow
      : Boolean(definition.rememberOnFirstShow);
    const roundedArrowTip = typeof config.roundedArrowTip === 'boolean'
      ? config.roundedArrowTip
      : Boolean(definition.roundedArrowTip);
    const hasLink = Boolean(
      config.onLinkClick ||
      config.linkUrl ||
      definition.linkKey ||
      definition.linkFallback
    );
    let dismissed = Boolean(config.initiallyDismissed);
    let requestedVisible = config.initiallyVisible !== false;
    let dismissStateLoaded = dismissStorage === 'none';
    let firstShowRemembered = false;
    const badgeIconText = String(definition.badgeIconText || '').trim();
    const activateLink = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof config.onLinkClick === 'function') {
        config.onLinkClick(event, definition);
        return;
      }
      const linkUrl = typeof config.getLinkUrl === 'function'
        ? config.getLinkUrl(definition)
        : (config.linkUrl || definition.linkUrl || '');
      const targetWindow = config.windowObj || (typeof window !== 'undefined' ? window : null);
      if (!linkUrl || !targetWindow) {
        return;
      }
      if (config.linkTarget === '_blank' && typeof targetWindow.open === 'function') {
        targetWindow.open(linkUrl, '_blank', 'noopener');
        return;
      }
      if (targetWindow.location && typeof targetWindow.location.assign === 'function') {
        targetWindow.location.assign(linkUrl);
      }
    };
    let controller = null;
    const viewController = featureHintView.createFeatureHintView({
      documentObj,
      model: {
        alignMode,
        arrowAlign,
        arrowSide,
        badgeIconHtml: definition.badgeIcon
          ? getRiSvg(definition.badgeIcon, 'ri-size-10')
          : '',
        badgeIconText,
        className: definition.className || '',
        dismissStorage,
        elementId: config.elementId || `_x_lumno_feature_hint_${idPart}_2026_unique_`,
        hasLink,
        hintId: definition.id,
        placement: definition.placement || '',
        roundedArrowTip,
        surface: definition.surface || '',
        textId: config.textId || `_x_lumno_feature_hint_${idPart}_text_2026_unique_`,
        version: definition.introducedIn || '',
        widthMode
      },
      labels: {
        badge: '',
        close: '',
        link: '',
        text: ''
      },
      onDismiss() {
        if (controller) {
          controller.dismiss();
        }
      },
      onLinkClick: activateLink
    });
    if (!viewController) {
      return null;
    }
    const element = viewController.element;
    const arrowTip = viewController.arrowTip;
    const text = viewController.text;
    const badge = viewController.badge;
    const linkButton = viewController.linkButton;
    const closeButton = viewController.closeButton;
    element.setAttribute('data-dismissed', dismissed ? 'true' : 'false');

    let alignUpdateFrame = 0;

    function getCssNumber(style, property) {
      const value = Number.parseFloat(style && style.getPropertyValue(property));
      return Number.isFinite(value) ? value : 0;
    }

    function updateContentAlignment() {
      alignUpdateFrame = 0;
      if (alignMode !== 'auto' || !windowObj || typeof windowObj.getComputedStyle !== 'function') {
        return;
      }
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }
      const elementStyle = windowObj.getComputedStyle(element);
      const textStyle = windowObj.getComputedStyle(text);
      const contentHeight = rect.height -
        getCssNumber(elementStyle, 'padding-top') -
        getCssNumber(elementStyle, 'padding-bottom') -
        getCssNumber(elementStyle, 'border-top-width') -
        getCssNumber(elementStyle, 'border-bottom-width');
      const textRect = text.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();
      const linkRect = hasLink ? linkButton.getBoundingClientRect() : { height: 0 };
      const lineHeight = getCssNumber(textStyle, 'line-height') ||
        ((getCssNumber(textStyle, 'font-size') || 12) * 1.45);
      const maxChildHeight = Math.max(textRect.height, badgeRect.height, linkRect.height);
      const textWrapped = textRect.height > lineHeight * 1.35;
      const rowWrapped = contentHeight > maxChildHeight + 6;
      element.setAttribute('data-multiline', (textWrapped || rowWrapped) ? 'true' : 'false');
    }

    function scheduleContentAlignmentUpdate() {
      if (alignMode !== 'auto') {
        return;
      }
      if (!windowObj || typeof windowObj.requestAnimationFrame !== 'function') {
        updateContentAlignment();
        return;
      }
      if (alignUpdateFrame) {
        return;
      }
      alignUpdateFrame = windowObj.requestAnimationFrame(updateContentAlignment);
    }

    let alignResizeObserver = null;
    if (alignMode === 'auto' && windowObj && typeof windowObj.ResizeObserver === 'function') {
      alignResizeObserver = new windowObj.ResizeObserver(scheduleContentAlignmentUpdate);
      alignResizeObserver.observe(element);
      alignResizeObserver.observe(text);
      if (hasLink) {
        alignResizeObserver.observe(linkButton);
      }
    }

    function setElementInert(inert) {
      try {
        if ('inert' in element) {
          element.inert = Boolean(inert);
        }
      } catch (e) {
        // Some DOM test doubles expose readonly properties; inert is only a progressive enhancement.
      }
    }

    function blurFocusedChildIfNeeded() {
      const activeElement = documentObj && documentObj.activeElement ? documentObj.activeElement : null;
      if (!activeElement || typeof activeElement.blur !== 'function') {
        return;
      }
      if (activeElement === element ||
          (typeof element.contains === 'function' && element.contains(activeElement))) {
        activeElement.blur();
      }
    }

    function disconnectAlignmentObserver() {
      if (!alignResizeObserver || typeof alignResizeObserver.disconnect !== 'function') {
        return;
      }
      alignResizeObserver.disconnect();
      alignResizeObserver = null;
    }

    function syncVisibility() {
      const nextVisible = Boolean(requestedVisible) && !dismissed && dismissStateLoaded;
      element.setAttribute('data-visible', nextVisible ? 'true' : 'false');
      element.setAttribute('aria-hidden', nextVisible ? 'false' : 'true');
      setElementInert(!nextVisible);
      if (nextVisible) {
        if (rememberOnFirstShow && !firstShowRemembered && dismissStorage !== 'none') {
          firstShowRemembered = true;
          setStoredDismissed(chromeApi, dismissKey, dismissStorage);
        }
        scheduleContentAlignmentUpdate();
      } else {
        blurFocusedChildIfNeeded();
        if (dismissed) {
          disconnectAlignmentObserver();
        }
      }
    }

    controller = {
      definition,
      element,
      textId: text.id,
      destroy() {
        disconnectAlignmentObserver();
        if (alignUpdateFrame && windowObj && typeof windowObj.cancelAnimationFrame === 'function') {
          windowObj.cancelAnimationFrame(alignUpdateFrame);
          alignUpdateFrame = 0;
        }
        viewController.destroy();
      },
      dismiss() {
        if (dismissed) {
          return;
        }
        dismissed = true;
        element.setAttribute('data-dismissed', 'true');
        if (dismissStorage !== 'none') {
          setStoredDismissed(chromeApi, dismissKey, dismissStorage);
        }
        syncVisibility();
        if (typeof config.onDismiss === 'function') {
          config.onDismiss(definition);
        }
      },
      isDismissed() {
        return dismissed;
      },
      setVisible(visible) {
        requestedVisible = Boolean(visible);
        syncVisibility();
      },
      updateLanguage() {
        const badgeLabel = getMessage(t, definition.badgeKey, definition.badgeFallback);
        const textLabel = getMessage(t, definition.textKey, definition.textFallback);
        const closeLabel = getMessage(t, definition.closeLabelKey, definition.closeLabelFallback);
        let linkLabel = '';
        if (hasLink) {
          linkLabel = getMessage(t, config.linkKey || definition.linkKey, config.linkFallback || definition.linkFallback);
        }
        viewController.updateLabels({
          badge: badgeLabel,
          close: closeLabel,
          link: linkLabel,
          text: textLabel
        });
        scheduleContentAlignmentUpdate();
      }
    };

    controller.updateLanguage();
    syncVisibility();
    if (dismissStorage !== 'none') {
      getStoredDismissed(chromeApi, dismissKey, dismissStorage).then((isDismissed) => {
        dismissStateLoaded = true;
        if (isDismissed && !dismissed) {
          dismissed = true;
          element.setAttribute('data-dismissed', 'true');
        }
        syncVisibility();
      });
    }
    return controller;
  }

  return Object.freeze({
    FEATURE_HINTS,
    getFeatureHint,
    normalizeArrowSide,
    normalizeArrowAlign,
    normalizeDismissStorage,
    normalizeWidthMode,
    normalizeAlignMode,
    getFeatureHintSessionDismissKey,
    getFeatureHintLocalDismissKey,
    getFeatureHintSyncDismissKey,
    listFeatureHints() {
      return Object.keys(FEATURE_HINTS).map((key) => FEATURE_HINTS[key]);
    },
    createFeatureHint
  });
});
