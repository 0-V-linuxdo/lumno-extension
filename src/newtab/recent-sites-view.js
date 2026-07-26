(function(root) {
  'use strict';

  function noop() {}

  function getOption(options, key, fallback) {
    if (options && Object.prototype.hasOwnProperty.call(options, key)) {
      return options[key];
    }
    return fallback;
  }

  function getFunction(options, key, fallback) {
    const value = getOption(options, key, fallback || noop);
    return typeof value === 'function' ? value : (fallback || noop);
  }

  function getRecentSitesSignature(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }
    return items.map((item, index) => {
      const url = item && item.url ? String(item.url) : '';
      const title = item && item.title ? String(item.title) : '';
      const siteName = item && item.siteName ? String(item.siteName) : '';
      const lastVisitTime = item && item.lastVisitTime ? String(item.lastVisitTime) : '';
      const visitCount = item && item.visitCount ? String(item.visitCount) : '';
      return `${index}::${url}::${title}::${siteName}::${lastVisitTime}::${visitCount}`;
    }).join('\n');
  }

  function createRecentSitesView(options) {
    const documentObj = getOption(options, 'documentObj', root.document);
    const windowObj = getOption(options, 'windowObj', root.window);
    const grid = getOption(options, 'grid', null);
    const cards = Array.isArray(getOption(options, 'cards', null))
      ? getOption(options, 'cards', null)
      : [];
    const t = getFunction(options, 't', function(key, fallback) {
      return fallback || key || '';
    });
    const formatMessage = getFunction(options, 'formatMessage', function(key, fallback, values) {
      let text = fallback || key || '';
      Object.keys(values || {}).forEach((name) => {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), values[name]);
      });
      return text;
    });
    const sanitizeDisplayText = getFunction(options, 'sanitizeDisplayText', function(value) {
      return String(value || '');
    });
    const getOwnExtensionPageDisplay = getFunction(options, 'getOwnExtensionPageDisplay', function() {
      return null;
    });
    const getHostFromUrl = getFunction(options, 'getHostFromUrl', function() {
      return '';
    });
    const getCanonicalPageUrlForFavicon = getFunction(options, 'getCanonicalPageUrlForFavicon', function(url) {
      return url || '';
    });
    const getBrowserPageFaviconUrl = getFunction(options, 'getBrowserPageFaviconUrl', function() {
      return '';
    });
    const getSiteDisplayName = getFunction(options, 'getSiteDisplayName', function(host, title) {
      return title || host || '';
    });
    const getUrlDisplay = getFunction(options, 'getUrlDisplay', function(url) {
      return url || '';
    });
    const getRiSvg = getFunction(options, 'getRiSvg', function() {
      return '';
    });
    const attachFaviconWithFallbacks = getFunction(options, 'attachFaviconWithFallbacks');
    const getImmediateThemeForSuggestion = getFunction(options, 'getImmediateThemeForSuggestion', function() {
      return null;
    });
    const queueThemeForTarget = getFunction(options, 'queueThemeForTarget');
    const applyCardTheme = getFunction(options, 'applyCardTheme');
    const getCurrentRecentCount = getFunction(options, 'getCurrentRecentCount', function() {
      return 4;
    });
    const isPinned = getFunction(options, 'isPinned', function() {
      return false;
    });
    const getPinnedCount = getFunction(options, 'getPinnedCount', function() {
      return 0;
    });
    const getMaxPinnedCount = getFunction(options, 'getMaxPinnedCount', function() {
      return 3;
    });
    const canDismiss = getFunction(options, 'canDismiss', function() {
      return true;
    });
    const getDismissTooltip = getFunction(options, 'getDismissTooltip', function() {
      return '';
    });
    const updatePinButton = getFunction(options, 'updatePinButton');
    const updateDismissButton = getFunction(options, 'updateDismissButton');
    const showToast = getFunction(options, 'showToast');
    const showTopActionTooltip = getFunction(options, 'showTopActionTooltip');
    const hideTopActionTooltip = getFunction(options, 'hideTopActionTooltip');
    const navigateToUrl = getFunction(options, 'navigateToUrl');
    const openUrl = getFunction(options, 'openUrl', function(url) {
      navigateToUrl(url);
    });
    const bindCursorTooltip = getFunction(options, 'bindCursorTooltip');
    const hideCursorTooltip = getFunction(options, 'hideCursorTooltip');
    const togglePinned = getFunction(options, 'togglePinned', function() {
      return Promise.resolve(null);
    });
    const hideTemporarily = getFunction(options, 'hideTemporarily', function() {
      return Promise.resolve(null);
    });

    function clear() {
      hideTopActionTooltip();
      hideCursorTooltip();
      cards.forEach((card) => {
        if (card && typeof card._xDisposeRecentCard === 'function') {
          card._xDisposeRecentCard();
        }
      });
      if (grid) {
        grid.innerHTML = '';
      }
      cards.length = 0;
    }

    function shouldOpenUrlInBackground(event) {
      return Boolean(event && (event.metaKey || event.ctrlKey || Number(event.button) === 1));
    }

    function isRecentTitleTruncated(titleElement) {
      if (!titleElement) {
        return false;
      }
      const scrollWidth = Number(titleElement.scrollWidth);
      const clientWidth = Number(titleElement.clientWidth);
      const scrollHeight = Number(titleElement.scrollHeight);
      const clientHeight = Number(titleElement.clientHeight);
      const hasHorizontalOverflow = Number.isFinite(scrollWidth) &&
        Number.isFinite(clientWidth) &&
        clientWidth > 0 &&
        scrollWidth > clientWidth + 1;
      const hasVerticalOverflow = Number.isFinite(scrollHeight) &&
        Number.isFinite(clientHeight) &&
        clientHeight > 0 &&
        scrollHeight > clientHeight + 1;
      return hasHorizontalOverflow || hasVerticalOverflow;
    }

    function buildCard(item, index) {
      if (!item || !item.url || !documentObj) {
        return null;
      }
      const ownExtensionDisplay = getOwnExtensionPageDisplay(item.url, item.title);
      const faviconPageUrl = getCanonicalPageUrlForFavicon(item.url) || item.url;
      const canonicalHost = getHostFromUrl(faviconPageUrl);
      const host = ownExtensionDisplay ? 'lumno.kubai.design' : (canonicalHost || item.host || getHostFromUrl(item.url) || '');
      const siteName = ownExtensionDisplay ? ownExtensionDisplay.siteName : getSiteDisplayName(host, item.title);
      const titleText = ownExtensionDisplay
        ? ownExtensionDisplay.titleText
        : (item.title || siteName || item.url);
      const eagerCount = getCurrentRecentCount();
      const shouldEager = index < eagerCount;
      const card = documentObj.createElement('div');
      card.className = 'x-nt-recent-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', formatMessage('open_prefix', '打开 {title}', {
        title: titleText
      }));
      card._xHost = host;
      const themeSuggestion = { type: 'history', url: faviconPageUrl, title: item.title || '' };
      const immediateTheme = getImmediateThemeForSuggestion(themeSuggestion);
      card._xTheme = immediateTheme;
      applyCardTheme(card, immediateTheme, host);
      queueThemeForTarget(card, themeSuggestion, (theme) => {
        if (card.isConnected) {
          card._xTheme = theme || card._xTheme;
          applyCardTheme(card, theme, host);
        }
      }, { priority: shouldEager ? 0 : 2 });

      const inner = documentObj.createElement('div');
      inner.className = 'x-nt-recent-inner';
      const header = documentObj.createElement('div');
      header.className = 'x-nt-recent-header';
      const faviconImage = documentObj.createElement('img');
      faviconImage.className = 'x-nt-recent-favicon';
      faviconImage.alt = siteName || t('site_icon_alt', '站点');
      faviconImage.width = 25;
      faviconImage.height = 25;
      faviconImage.decoding = 'async';
      faviconImage.loading = shouldEager ? 'eager' : 'lazy';
      if (shouldEager) {
        faviconImage.fetchPriority = 'high';
      }
      attachFaviconWithFallbacks(faviconImage, faviconPageUrl, host, {
        primaryUrl: getBrowserPageFaviconUrl(faviconPageUrl)
      });
      const name = documentObj.createElement('div');
      name.className = 'x-nt-recent-name';
      name.textContent = siteName;
      name.title = siteName;
      const dismissButton = documentObj.createElement('button');
      dismissButton.type = 'button';
      dismissButton.className = 'x-nt-recent-dismiss';
      updateDismissButton(dismissButton, item);
      card._xDismissButton = dismissButton;
      header.appendChild(faviconImage);
      header.appendChild(name);
      header.appendChild(dismissButton);

      const title = documentObj.createElement('div');
      title.className = 'x-nt-recent-title';
      const safeTitleText = sanitizeDisplayText(titleText);
      title.textContent = safeTitleText;

      const urlLine = documentObj.createElement('div');
      urlLine.className = 'x-nt-recent-url';
      urlLine.title = item.url;
      const urlText = documentObj.createElement('span');
      urlText.className = 'x-nt-recent-url-text';
      urlText.textContent = ownExtensionDisplay ? ownExtensionDisplay.urlText : getUrlDisplay(item.url);

      const actionLine = documentObj.createElement('div');
      actionLine.className = 'x-nt-recent-action';
      const actionText = documentObj.createElement('span');
      actionText.textContent = t('action_go_current_tab', '前往');
      actionLine.appendChild(actionText);
      const actionIcon = documentObj.createElement('span');
      actionIcon.innerHTML = getRiSvg('ri-arrow-right-line', 'ri-size-12');
      actionLine.appendChild(actionIcon);
      card._xActionText = actionText;
      card._xTitleText = safeTitleText;
      card.setAttribute('data-cursor-tooltip', safeTitleText);

      const pinButton = documentObj.createElement('button');
      pinButton.type = 'button';
      pinButton.className = 'x-nt-recent-pin';
      const pinned = isPinned(item);
      updatePinButton(pinButton, pinned, !pinned && getPinnedCount() >= getMaxPinnedCount());
      card._xPinButton = pinButton;
      urlLine.appendChild(actionLine);
      urlLine.appendChild(urlText);
      urlLine.appendChild(pinButton);

      inner.appendChild(header);
      inner.appendChild(title);
      card.appendChild(inner);
      card.appendChild(urlLine);

      let isCardPointerActive = false;
      let hasNavigateAttempted = false;
      let isTooltipSuppressedAfterActivation = false;
      let suppressClickAfterPointerNavigation = false;
      let rollbackTimerId = null;
      let hoverUnlockTimerId = null;
      let navigationSignalCleanup = null;
      let isHoverLocked = false;
      const rollbackClassName = 'x-nt-recent-card--rollback';
      const ROLLBACK_ANIMATION_MS = 220;
      const HOVER_REENABLE_DELAY_MS = 1000;
      const clearRollbackTimer = () => {
        if (rollbackTimerId !== null && windowObj) {
          windowObj.clearTimeout(rollbackTimerId);
          rollbackTimerId = null;
        }
      };
      const clearHoverUnlockTimer = () => {
        if (hoverUnlockTimerId !== null && windowObj) {
          windowObj.clearTimeout(hoverUnlockTimerId);
          hoverUnlockTimerId = null;
        }
      };
      const lockHoverAfterRollback = () => {
        clearHoverUnlockTimer();
        isHoverLocked = true;
        card.classList.add(rollbackClassName);
        hoverUnlockTimerId = windowObj.setTimeout(() => {
          hoverUnlockTimerId = null;
          isHoverLocked = false;
          card.classList.remove(rollbackClassName);
        }, ROLLBACK_ANIMATION_MS + HOVER_REENABLE_DELAY_MS);
      };
      const clearNavigationSignals = () => {
        if (typeof navigationSignalCleanup !== 'function') {
          return;
        }
        const cleanup = navigationSignalCleanup;
        navigationSignalCleanup = null;
        cleanup();
      };
      const markNavigationSuccess = () => {
        clearRollbackTimer();
        clearHoverUnlockTimer();
        clearNavigationSignals();
      };
      const bindNavigationSignals = () => {
        clearNavigationSignals();
        if (!documentObj || typeof documentObj.addEventListener !== 'function' ||
            !windowObj || typeof windowObj.addEventListener !== 'function') {
          return;
        }
        let active = true;
        const finishNavigation = () => {
          if (!active) {
            return;
          }
          markNavigationSuccess();
        };
        const onVisibilityChange = () => {
          if (documentObj.visibilityState === 'hidden') {
            finishNavigation();
          }
        };
        navigationSignalCleanup = () => {
          if (!active) {
            return;
          }
          active = false;
          if (typeof documentObj.removeEventListener === 'function') {
            documentObj.removeEventListener('visibilitychange', onVisibilityChange);
          }
          if (typeof windowObj.removeEventListener === 'function') {
            windowObj.removeEventListener('pagehide', finishNavigation);
          }
        };
        documentObj.addEventListener('visibilitychange', onVisibilityChange);
        windowObj.addEventListener('pagehide', finishNavigation, { once: true });
      };
      const scheduleRollbackIfPending = () => {
        clearRollbackTimer();
        rollbackTimerId = windowObj.setTimeout(() => {
          rollbackTimerId = null;
          if (documentObj.visibilityState === 'hidden') {
            return;
          }
          lockHoverAfterRollback();
          hasNavigateAttempted = false;
          clearNavigationSignals();
        }, 180);
      };
      const resetBackgroundOpenGuard = () => {
        if (!windowObj || typeof windowObj.setTimeout !== 'function') {
          hasNavigateAttempted = false;
          return;
        }
        windowObj.setTimeout(() => {
          hasNavigateAttempted = false;
        }, 0);
      };
      const navigateFromCard = (event) => {
        isTooltipSuppressedAfterActivation = true;
        hideTopActionTooltip();
        hideCursorTooltip();
        if (hasNavigateAttempted) {
          return;
        }
        hasNavigateAttempted = true;
        if (!isHoverLocked) {
          card.classList.remove(rollbackClassName);
        }
        const openInBackgroundTab = shouldOpenUrlInBackground(event);
        if (!openInBackgroundTab) {
          bindNavigationSignals();
        }
        openUrl(item.url, { openInBackgroundTab });
        if (openInBackgroundTab) {
          resetBackgroundOpenGuard();
          return;
        }
        scheduleRollbackIfPending();
      };
      const swallowPinEvent = (event) => {
        if (!event) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      };
      card.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
          return;
        }
        isCardPointerActive = true;
        if (typeof card.setPointerCapture === 'function') {
          try {
            card.setPointerCapture(event.pointerId);
          } catch (error) {
            // Ignore capture errors and keep pointer flow fallback.
          }
        }
        suppressClickAfterPointerNavigation = true;
        navigateFromCard(event);
      });
      card.addEventListener('pointercancel', () => {
        isCardPointerActive = false;
        hideTopActionTooltip();
      });
      card.addEventListener('pointerup', (event) => {
        if (event.button !== 0 || !isCardPointerActive) {
          return;
        }
        isCardPointerActive = false;
      });
      card.addEventListener('pointerleave', () => {
        hideTopActionTooltip();
        hideCursorTooltip();
        isTooltipSuppressedAfterActivation = false;
        if (!hasNavigateAttempted && !isHoverLocked) {
          card.classList.remove(rollbackClassName);
        }
      });
      bindCursorTooltip(card, () => card._xTitleText || safeTitleText, {
        maxWidth: 460,
        shouldShow: () => !isTooltipSuppressedAfterActivation && isRecentTitleTruncated(title)
      });
      card.addEventListener('blur', () => {
        isTooltipSuppressedAfterActivation = false;
      });
      card.addEventListener('click', (event) => {
        if (suppressClickAfterPointerNavigation) {
          suppressClickAfterPointerNavigation = false;
          event.preventDefault();
          return;
        }
        navigateFromCard(event);
      });
      card.addEventListener('auxclick', (event) => {
        if (!event || Number(event.button) !== 1) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        navigateFromCard(event);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateFromCard(event);
        }
      });
      pinButton.addEventListener('pointerdown', swallowPinEvent);
      pinButton.addEventListener('click', (event) => {
        swallowPinEvent(event);
        if (!pinned && getPinnedCount() >= getMaxPinnedCount()) {
          showToast(t('recent_pin_limit_toast', '最多只能置顶 3 个卡片'), false);
          updatePinButton(pinButton, false, true);
          return;
        }
        togglePinned(item).then((result) => {
          if (!result || !card.isConnected) {
            return;
          }
          if (result.limitReached) {
            showToast(t('recent_pin_limit_toast', '最多只能置顶 3 个卡片'), false);
          }
          updatePinButton(
            pinButton,
            Boolean(result.pinned),
            Boolean(!result.pinned && result.limitReached)
          );
        });
      });
      pinButton.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        swallowPinEvent(event);
        pinButton.click();
      });
      const showPinTooltip = () => {
        const label = pinButton.getAttribute('data-tooltip') || pinButton.getAttribute('aria-label') || '';
        if (label) {
          showTopActionTooltip(pinButton, label);
        }
      };
      pinButton.addEventListener('mouseenter', showPinTooltip);
      pinButton.addEventListener('pointerleave', hideTopActionTooltip);
      pinButton.addEventListener('pointercancel', hideTopActionTooltip);
      pinButton.addEventListener('mouseleave', hideTopActionTooltip);
      pinButton.addEventListener('focus', showPinTooltip);
      pinButton.addEventListener('blur', hideTopActionTooltip);
      dismissButton.addEventListener('pointerdown', swallowPinEvent);
      dismissButton.addEventListener('click', (event) => {
        swallowPinEvent(event);
        if (!canDismiss()) {
          return;
        }
        hideTopActionTooltip();
        hideTemporarily(item).then((result) => {
          if (!result || !result.hidden) {
            return;
          }
          showToast(
            result.wasPinned
              ? t('recent_dismiss_pinned_toast', '已取消置顶并从最近访问移除，再次访问后会重新出现')
              : t('recent_dismiss_toast', '已从最近访问移除，再次访问后会重新出现'),
            false
          );
        });
      });
      dismissButton.addEventListener('keydown', (event) => {
        if (!canDismiss()) {
          return;
        }
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        swallowPinEvent(event);
        dismissButton.click();
      });
      dismissButton.addEventListener('mouseenter', () => {
        if (!canDismiss()) {
          return;
        }
        const label = getDismissTooltip(item);
        updateDismissButton(dismissButton, item);
        showTopActionTooltip(dismissButton, label);
      });
      dismissButton.addEventListener('pointerleave', hideTopActionTooltip);
      dismissButton.addEventListener('pointercancel', hideTopActionTooltip);
      dismissButton.addEventListener('mouseleave', hideTopActionTooltip);
      dismissButton.addEventListener('focus', () => {
        if (!canDismiss()) {
          return;
        }
        const label = getDismissTooltip(item);
        updateDismissButton(dismissButton, item);
        showTopActionTooltip(dismissButton, label);
      });
      dismissButton.addEventListener('blur', hideTopActionTooltip);
      card._xDisposeRecentCard = () => {
        clearRollbackTimer();
        clearHoverUnlockTimer();
        clearNavigationSignals();
      };

      return card;
    }

    function render(items, state) {
      const normalizedItems = Array.isArray(items) ? items : [];
      const previousSignature = state && typeof state.signature === 'string' ? state.signature : '';
      const nextSignature = getRecentSitesSignature(normalizedItems);
      if (nextSignature === previousSignature) {
        return {
          changed: false,
          count: normalizedItems.length,
          signature: nextSignature
        };
      }
      clear();
      const fragment = grid && documentObj &&
          typeof documentObj.createDocumentFragment === 'function'
        ? documentObj.createDocumentFragment()
        : null;
      const renderTarget = fragment || grid;
      normalizedItems.forEach((item, index) => {
        const card = buildCard(item, index);
        if (card && renderTarget) {
          cards.push(card);
          renderTarget.appendChild(card);
        }
      });
      if (fragment && grid) {
        grid.appendChild(fragment);
      }
      return {
        changed: true,
        count: normalizedItems.length,
        signature: nextSignature
      };
    }

    return {
      buildCard,
      clear,
      render,
      getSignature: getRecentSitesSignature,
      getCards: function() {
        return cards;
      }
    };
  }

  root.LumnoNewtabRecentSitesView = {
    createRecentSitesView,
    getRecentSitesSignature
  };
})(globalThis);
