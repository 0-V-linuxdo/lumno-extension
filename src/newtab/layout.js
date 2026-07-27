(function() {
  function resolveElement(value) {
    if (typeof value === 'function') {
      return value();
    }
    return value || null;
  }

  function getOptionNumber(options, key, fallback) {
    const value = Number(options && options[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function getFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getGridContentWidthForColumns(columnCount, columnWidth, gap) {
    const columns = Math.max(1, Math.floor(getFiniteNumber(columnCount, 1)));
    const trackWidth = Math.max(1, getFiniteNumber(columnWidth, 1));
    const gapWidth = Math.max(0, getFiniteNumber(gap, 0));
    return Math.ceil((columns * trackWidth) + (Math.max(0, columns - 1) * gapWidth));
  }

  function getResponsiveContentWidth(options) {
    const config = options || {};
    const viewportWidth = Math.max(0, getFiniteNumber(config.viewportWidth, 0));
    const viewportRatio = Math.max(0, getFiniteNumber(config.viewportRatio, 0.96));
    const contentMaxWidth = Math.max(
      0,
      getFiniteNumber(config.contentMaxWidth, viewportWidth * viewportRatio)
    );
    return Math.max(0, Math.min(Math.floor(viewportWidth * viewportRatio), contentMaxWidth));
  }

  function getAdaptiveGridColumnCount(options) {
    const config = options || {};
    const viewportWidth = Math.max(0, getFiniteNumber(config.viewportWidth, 0));
    const mobileBreakpointPx = Math.max(0, getFiniteNumber(config.mobileBreakpointPx, 0));
    if (mobileBreakpointPx > 0 && viewportWidth <= mobileBreakpointPx) {
      return Math.max(1, Math.floor(getFiniteNumber(config.mobileColumns, 1)));
    }
    const compactBreakpointPx = Math.max(0, getFiniteNumber(config.compactBreakpointPx, 0));
    if (compactBreakpointPx > 0 && viewportWidth <= compactBreakpointPx) {
      return Math.max(1, Math.floor(getFiniteNumber(config.compactColumns, 1)));
    }
    const minColumns = Math.max(1, Math.floor(getFiniteNumber(config.minColumns, 1)));
    const maxColumns = Math.max(minColumns, Math.floor(getFiniteNumber(config.maxColumns, minColumns)));
    const targetColumnWidth = Math.max(1, getFiniteNumber(config.targetColumnWidth, 1));
    const gap = Math.max(0, getFiniteNumber(config.gap, 0));
    const containerWidth = getResponsiveContentWidth(config);
    const idealColumns = Math.floor((containerWidth + gap) / (targetColumnWidth + gap));
    return Math.max(minColumns, Math.min(maxColumns, idealColumns || minColumns));
  }

  function createLayoutController(options) {
    options = options || {};
    const documentObj = options && options.documentObj ? options.documentObj : document;
    const windowObj = options && options.windowObj ? options.windowObj : window;
    const constants = (options && options.constants) || {};
    const minTopPx = getOptionNumber(constants, 'minTopPx', 28);
    const minBottomPx = getOptionNumber(constants, 'minBottomPx', 20);
    const upshiftRatio = getOptionNumber(constants, 'upshiftRatio', 0.06);
    const upshiftMinPx = getOptionNumber(constants, 'upshiftMinPx', 24);
    const upshiftMaxPx = getOptionNumber(constants, 'upshiftMaxPx', 80);
    const contentSectionsExtraUpshiftPx = getOptionNumber(constants, 'contentSectionsExtraUpshiftPx', 20);
    const emptySectionsExtraUpshiftPx = getOptionNumber(constants, 'emptySectionsExtraUpshiftPx', 96);
    const narrowViewportMinWidthPx = getOptionNumber(constants, 'narrowViewportMinWidthPx', 0);
    const narrowViewportMaxWidthPx = getOptionNumber(constants, 'narrowViewportMaxWidthPx', 0);
    const narrowTopInsetPx = getOptionNumber(constants, 'narrowTopInsetPx', 0);
    const shortViewportMaxHeightPx = getOptionNumber(constants, 'shortViewportMaxHeightPx', 0);
    const shortMinTopPx = getOptionNumber(constants, 'shortMinTopPx', minTopPx);
    const occupiedTopUpshiftMaxPx = getOptionNumber(constants, 'occupiedTopUpshiftMaxPx', 36);
    const bottomDockTopReservePx = getOptionNumber(constants, 'bottomDockTopReservePx', 240);
    const compactDockViewportMaxHeightPx = getOptionNumber(constants, 'compactDockViewportMaxHeightPx', 0);
    const compactDockSearchGapPx = getOptionNumber(constants, 'compactDockSearchGapPx', 32);
    const compactDockShortcutGapPx = getOptionNumber(constants, 'compactDockShortcutGapPx', 8);
    const compactDockMinTopReservePx = getOptionNumber(constants, 'compactDockMinTopReservePx', 168);
    const mobileFlowBreakpointPx = getOptionNumber(constants, 'mobileFlowBreakpointPx', 0);
    const suggestionsBottomInsetPx = getOptionNumber(constants, 'suggestionsBottomInsetPx', 14);
    const suggestionsResizeDurationMs = getOptionNumber(constants, 'suggestionsResizeDurationMs', 180);
    const suggestionsResizeEasing = typeof constants.suggestionsResizeEasing === 'string' &&
      constants.suggestionsResizeEasing.trim()
      ? constants.suggestionsResizeEasing.trim()
      : 'cubic-bezier(0.22, 1, 0.36, 1)';
    const visibleAttribute = 'data-visible';
    const suggestionsOpenAttribute = 'data-nt-suggestions-open';
    let suggestionsResizeAnimationFrame = 0;
    let suggestionsResizeAnimationTimer = 0;
    let suggestionsResizeTransitionEndHandler = null;
    let suggestionsResizeTargetHeight = 0;
    let dockDensityPromotionLock = null;
    const getTopInsetPx = typeof options.getTopInsetPx === 'function'
      ? options.getTopInsetPx
      : function() {
        return 0;
      };

    function getRoot() {
      return resolveElement(options.root);
    }

    function getSearchLayer() {
      return resolveElement(options.searchLayer);
    }

    function getInputParts() {
      return resolveElement(options.inputParts);
    }

    function getWordmarkContainer() {
      return resolveElement(options.wordmarkContainer);
    }

    function getBottomDock() {
      return resolveElement(options.bottomDock);
    }

    function getShortcutSection() {
      return resolveElement(options.shortcutSection);
    }

    function getBookmarkSection() {
      return resolveElement(options.bookmarkSection);
    }

    function getRecentSection() {
      return resolveElement(options.recentSection);
    }

    function getSectionSafeCorridor() {
      return resolveElement(options.sectionSafeCorridor);
    }

    function getSuggestionsContainer() {
      return resolveElement(options.suggestionsContainer);
    }

    function getSuggestionsSurface() {
      return resolveElement(options.suggestionsSurface);
    }

    function getSuggestionsOutline() {
      return resolveElement(options.suggestionsOutline);
    }

    function isMobileFlowViewport() {
      const viewportWidth = Math.max(0, windowObj.innerWidth || 0);
      return mobileFlowBreakpointPx > 0 && viewportWidth <= mobileFlowBreakpointPx;
    }

    function setBooleanAttribute(element, name, value) {
      if (!element || typeof element.setAttribute !== 'function') {
        return;
      }
      element.setAttribute(name, value ? 'true' : 'false');
    }

    function setSuggestionsOpenState(open) {
      const body = documentObj && documentObj.body;
      setBooleanAttribute(body, suggestionsOpenAttribute, Boolean(open));
    }

    function setPixelStyle(element, property, value) {
      if (!element || !element.style) {
        return;
      }
      element.style.setProperty(property, `${Math.round(value)}px`);
    }

    function setFixedFrame(element, frame) {
      if (!element || !frame) {
        return;
      }
      setPixelStyle(element, 'left', frame.left);
      setPixelStyle(element, 'top', frame.top);
      setPixelStyle(element, 'width', frame.width);
      setPixelStyle(element, 'height', frame.height);
    }

    function getRenderedHeight(element) {
      if (!element) {
        return 0;
      }
      const rect = typeof element.getBoundingClientRect === 'function'
        ? element.getBoundingClientRect()
        : null;
      const rectHeight = Math.max(0, Number(rect && rect.height) || 0);
      if (rectHeight > 0) {
        return rectHeight;
      }
      const inlineHeight = element.style
        ? Number.parseFloat(element.style.getPropertyValue('height'))
        : 0;
      return Math.max(0, Number.isFinite(inlineHeight) ? inlineHeight : 0);
    }

    function prefersReducedMotion() {
      return Boolean(
        windowObj &&
        typeof windowObj.matchMedia === 'function' &&
        windowObj.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function updateSuggestionsSurfaceFrame() {
      const suggestionsContainer = getSuggestionsContainer();
      const inputParts = getInputParts();
      if (!suggestionsContainer || !inputParts || !inputParts.container) {
        return;
      }
      const searchLayer = getSearchLayer();
      const root = getRoot();
      const suggestionsSurface = getSuggestionsSurface();
      const suggestionsOutline = getSuggestionsOutline();
      if (!suggestionsSurface && !suggestionsOutline) {
        return;
      }
      const anchor = searchLayer || inputParts.container;
      const anchorRect = anchor.getBoundingClientRect();
      const rootRect = root ? root.getBoundingClientRect() : anchorRect;
      const suggestionsRect = suggestionsContainer.getBoundingClientRect();
      const surfaceBottom = Math.max(rootRect.bottom, suggestionsRect.bottom);
      const surfaceFrame = {
        left: rootRect.left,
        top: rootRect.top,
        width: Math.max(0, rootRect.width),
        height: Math.max(0, surfaceBottom - rootRect.top)
      };
      setFixedFrame(suggestionsSurface, surfaceFrame);
      setFixedFrame(suggestionsOutline, surfaceFrame);
    }

    function cancelSuggestionsResizeAnimation(syncLayout) {
      const suggestionsContainer = getSuggestionsContainer();
      if (suggestionsResizeAnimationFrame &&
          typeof windowObj.cancelAnimationFrame === 'function') {
        windowObj.cancelAnimationFrame(suggestionsResizeAnimationFrame);
      }
      suggestionsResizeAnimationFrame = 0;
      if (suggestionsResizeAnimationTimer) {
        windowObj.clearTimeout(suggestionsResizeAnimationTimer);
        suggestionsResizeAnimationTimer = 0;
      }
      if (suggestionsContainer && suggestionsResizeTransitionEndHandler) {
        suggestionsContainer.removeEventListener(
          'transitionend',
          suggestionsResizeTransitionEndHandler
        );
      }
      suggestionsResizeTransitionEndHandler = null;
      suggestionsResizeTargetHeight = 0;
      if (suggestionsContainer && suggestionsContainer.style) {
        suggestionsContainer.style.removeProperty('height');
        suggestionsContainer.style.removeProperty('overflow');
        suggestionsContainer.style.removeProperty('transition');
        suggestionsContainer.removeAttribute('data-resizing');
      }
      if (syncLayout !== false) {
        updateSuggestionsFloatingLayout();
      }
    }

    function captureSuggestionsResizeState() {
      const suggestionsContainer = getSuggestionsContainer();
      if (!suggestionsContainer ||
          suggestionsContainer.getAttribute(visibleAttribute) !== 'true') {
        return null;
      }
      const height = getRenderedHeight(suggestionsContainer);
      cancelSuggestionsResizeAnimation(false);
      return height > 0 ? { height } : null;
    }

    function syncSuggestionsSurfaceDuringResize() {
      if (!suggestionsResizeTargetHeight) {
        return;
      }
      updateSuggestionsSurfaceFrame();
      suggestionsResizeAnimationFrame = windowObj.requestAnimationFrame(
        syncSuggestionsSurfaceDuringResize
      );
    }

    function animateSuggestionsResize(previousState) {
      const suggestionsContainer = getSuggestionsContainer();
      const fromHeight = Math.max(
        0,
        Number(previousState && previousState.height) || 0
      );
      if (!suggestionsContainer || !fromHeight ||
          suggestionsContainer.getAttribute(visibleAttribute) !== 'true') {
        return false;
      }
      updateSuggestionsFloatingLayout();
      const toHeight = getRenderedHeight(suggestionsContainer);
      if (prefersReducedMotion() ||
          suggestionsResizeDurationMs <= 0 ||
          Math.abs(toHeight - fromHeight) <= 1) {
        cancelSuggestionsResizeAnimation();
        return false;
      }
      cancelSuggestionsResizeAnimation(false);
      suggestionsResizeTargetHeight = toHeight;
      suggestionsContainer.setAttribute('data-resizing', 'true');
      suggestionsContainer.style.setProperty('height', `${fromHeight}px`, 'important');
      suggestionsContainer.style.setProperty('overflow', 'hidden', 'important');
      suggestionsContainer.style.setProperty('transition', 'none', 'important');
      updateSuggestionsSurfaceFrame();
      void suggestionsContainer.offsetHeight;
      suggestionsResizeAnimationFrame = windowObj.requestAnimationFrame(() => {
        suggestionsResizeAnimationFrame = 0;
        suggestionsContainer.style.setProperty(
          'transition',
          `height ${suggestionsResizeDurationMs}ms ${suggestionsResizeEasing}`,
          'important'
        );
        suggestionsContainer.style.setProperty('height', `${toHeight}px`, 'important');
        updateSuggestionsSurfaceFrame();
        suggestionsResizeAnimationFrame = windowObj.requestAnimationFrame(
          syncSuggestionsSurfaceDuringResize
        );
      });
      suggestionsResizeTransitionEndHandler = (event) => {
        if (event && (
          (event.target && event.target !== suggestionsContainer) ||
          (event.propertyName && event.propertyName !== 'height')
        )) {
          return;
        }
        cancelSuggestionsResizeAnimation();
      };
      suggestionsContainer.addEventListener(
        'transitionend',
        suggestionsResizeTransitionEndHandler
      );
      suggestionsResizeAnimationTimer = windowObj.setTimeout(() => {
        cancelSuggestionsResizeAnimation();
      }, suggestionsResizeDurationMs + 80);
      return true;
    }

    function applyWidthMode(config) {
      const rawSearchMax = Number(config && config.searchMaxWidth);
      const searchMax = Number.isFinite(rawSearchMax) ? Math.max(1, rawSearchMax) : 720;
      const contentMax = Math.max(1040, Number((config && config.contentMaxWidth) || 1040));
      if (documentObj && documentObj.documentElement) {
        documentObj.documentElement.style.setProperty('--x-nt-search-max-width', `${searchMax}px`);
        documentObj.documentElement.style.setProperty('--x-nt-content-max-width', `${contentMax}px`);
      }
    }

    function getElementOuterHeight(element) {
      if (!element) {
        return 0;
      }
      const style = windowObj.getComputedStyle(element);
      if (!style || style.display === 'none') {
        return 0;
      }
      if (element.getAttribute && element.getAttribute('data-visible') === 'false') {
        return 0;
      }
      const rect = element.getBoundingClientRect();
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      const targetHeight = element.getAttribute && element.getAttribute('data-visible') === 'true'
        ? Math.max(rect.height, Number(element.scrollHeight) || 0)
        : rect.height;
      return Math.max(0, targetHeight + marginTop + marginBottom);
    }

    function isSectionVisible(section) {
      if (!section) {
        return false;
      }
      const visibleAttr = typeof section.getAttribute === 'function'
        ? section.getAttribute(visibleAttribute)
        : '';
      if (visibleAttr === 'true') {
        return true;
      }
      if (visibleAttr === 'false') {
        return false;
      }
      return section.style.getPropertyValue('display') !== 'none';
    }

    function getDockDensityRank(density) {
      if (density === 'tiny') {
        return 2;
      }
      if (density === 'compact') {
        return 1;
      }
      return 0;
    }

    function getDockDensityLayoutContext(
      shortcutSection,
      shortcutVisible,
      bottomDockTopReserve
    ) {
      const viewportWidth = Math.max(0, windowObj.innerWidth || 0);
      const viewportHeight = Math.max(0, windowObj.innerHeight || 0);
      const topReserve = Math.round(Math.max(0, Number(bottomDockTopReserve) || 0));
      if (!shortcutVisible || !shortcutSection) {
        return `${viewportWidth}:${viewportHeight}:${topReserve}:hidden`;
      }
      const shortcutRect = shortcutSection.getBoundingClientRect();
      const sectionWidth = Math.round(Math.max(0, Number(shortcutRect && shortcutRect.width) || 0));
      let tileCount = -1;
      if (typeof shortcutSection.querySelectorAll === 'function') {
        tileCount = shortcutSection.querySelectorAll('.x-nt-shortcut-tile').length;
      }
      return `${viewportWidth}:${viewportHeight}:${topReserve}:${sectionWidth}:${tileCount}`;
    }

    function getCssPixelValue(style, property) {
      if (!style || !property) {
        return 0;
      }
      const value = Number.parseFloat(style.getPropertyValue(property));
      return Number.isFinite(value) ? value : 0;
    }

    function getVerticalFrameHeight(element, options) {
      if (!element) {
        return 0;
      }
      const style = windowObj.getComputedStyle(element);
      if (!style || style.display === 'none') {
        return 0;
      }
      const includeMargin = Boolean(options && options.includeMargin);
      const boxFrame =
        getCssPixelValue(style, 'padding-top') +
        getCssPixelValue(style, 'padding-bottom') +
        getCssPixelValue(style, 'border-top-width') +
        getCssPixelValue(style, 'border-bottom-width');
      if (!includeMargin) {
        return boxFrame;
      }
      return boxFrame +
        getCssPixelValue(style, 'margin-top') +
        getCssPixelValue(style, 'margin-bottom');
    }

    function getElementMinHeight(element) {
      if (!element) {
        return 0;
      }
      const style = windowObj.getComputedStyle(element);
      if (!style || style.display === 'none') {
        return 0;
      }
      return getCssPixelValue(style, 'min-height');
    }

    function getSearchEntryBlockHeight() {
      const root = getRoot();
      const inputParts = getInputParts();
      const searchLayer = getSearchLayer();
      const rootFrameHeight = getVerticalFrameHeight(root);
      const rootMinHeight = getElementMinHeight(root);
      const inputHeight = inputParts && inputParts.container
        ? Math.max(0, Number(inputParts.container.getBoundingClientRect().height) || 0)
        : 44;
      const searchLayerFrameHeight = getVerticalFrameHeight(searchLayer, { includeMargin: true });
      const searchLayerMinHeight = getElementMinHeight(searchLayer);
      const searchLayerBaseHeight = Math.max(
        searchLayerMinHeight,
        inputHeight + searchLayerFrameHeight
      );
      return Math.max(55, rootMinHeight, rootFrameHeight + searchLayerBaseHeight);
    }

    function getCurrentBodyPaddingTop(body) {
      if (!body || !body.style) {
        return null;
      }
      const rawValue = body.style.getPropertyValue('padding-top');
      const value = Number.parseFloat(rawValue);
      return Number.isFinite(value) ? Math.round(value) : null;
    }

    function updateSearchEntryLayout(layoutOptions) {
      const body = documentObj && documentObj.body;
      const root = getRoot();
      if (!body || !root) {
        return;
      }
      if (isMobileFlowViewport()) {
        body.style.removeProperty('padding-top');
        return;
      }
      const viewportHeight = Math.max(0, windowObj.innerHeight || 0);
      if (viewportHeight <= 0) {
        return;
      }
      const bottomDock = getBottomDock();
      const bottomDockVisible = Boolean(
        bottomDock &&
        bottomDock.style.getPropertyValue('display') !== 'none'
      );
      let occupiedBottomHeight = 0;
      if (bottomDockVisible && bottomDock) {
        const dockRect = bottomDock.getBoundingClientRect();
        occupiedBottomHeight = Math.max(0, Number(dockRect && dockRect.height) || 0);
      }
      const occupiedTopHeight = Math.max(0, Number(getTopInsetPx()) || 0);
      const centeringHeight = Math.max(
        0,
        viewportHeight - occupiedBottomHeight
      );
      const wordmarkOuterHeight = getElementOuterHeight(getWordmarkContainer());
      const searchBlockHeight = wordmarkOuterHeight + getSearchEntryBlockHeight();
      const bookmarkSection = getBookmarkSection();
      const recentSection = getRecentSection();
      const bookmarkVisible = isSectionVisible(bookmarkSection);
      const recentVisible = isSectionVisible(recentSection);
      const viewportWidth = Math.max(0, windowObj.innerWidth || 0);
      const minimumTopGap = shortViewportMaxHeightPx > 0 && viewportHeight <= shortViewportMaxHeightPx
        ? Math.max(minTopPx, shortMinTopPx)
        : minTopPx;
      const extraUpshift = (!bookmarkVisible && !recentVisible)
        ? emptySectionsExtraUpshiftPx
        : contentSectionsExtraUpshiftPx;
      const upwardOffset = Math.min(
        upshiftMaxPx,
        Math.max(upshiftMinPx, centeringHeight * upshiftRatio)
      ) + extraUpshift;
      const occupiedTopUpshift = Math.min(
        occupiedTopHeight,
        Math.max(0, occupiedTopUpshiftMaxPx)
      );
      const effectiveMinTopPx = occupiedTopHeight + minimumTopGap;
      const maxTop = Math.max(
        effectiveMinTopPx,
        centeringHeight - searchBlockHeight - minBottomPx
      );
      let targetTop =
        ((centeringHeight - searchBlockHeight) / 2) -
        upwardOffset -
        occupiedTopUpshift;
      if (!Number.isFinite(targetTop)) {
        targetTop = effectiveMinTopPx;
      }
      if (narrowTopInsetPx > 0 && narrowViewportMaxWidthPx > 0) {
        if (viewportWidth > narrowViewportMinWidthPx && viewportWidth <= narrowViewportMaxWidthPx) {
          targetTop += narrowTopInsetPx;
        }
      }
      targetTop = Math.max(effectiveMinTopPx, Math.min(maxTop, targetTop));
      const nextTop = Math.round(targetTop);
      if (layoutOptions && layoutOptions.preserveCurrentTop && getCurrentBodyPaddingTop(body) !== null) {
        return;
      }
      if (body.style.getPropertyValue('padding-top') === `${nextTop}px`) {
        return;
      }
      body.style.setProperty('padding-top', `${nextTop}px`, 'important');
    }

    function updateBottomDockLayout(callbacks) {
      const body = documentObj && documentObj.body;
      const bookmarkSection = getBookmarkSection();
      const recentSection = getRecentSection();
      const bottomDock = getBottomDock();
      const sectionSafeCorridor = getSectionSafeCorridor();
      if (!body || !bookmarkSection || !recentSection || !bottomDock || !sectionSafeCorridor) {
        return;
      }
      const viewportHeight = Math.max(0, windowObj.innerHeight || 0);
      const mobileFlow = isMobileFlowViewport();
      let bottomDockTopReserve = bottomDockTopReservePx;
      if (compactDockViewportMaxHeightPx > 0 && viewportHeight <= compactDockViewportMaxHeightPx) {
        const root = getRoot();
        const rootRect = root ? root.getBoundingClientRect() : null;
        const rootBottom = rootRect ? Number(rootRect.bottom) || 0 : 0;
        let compactTopReserve = compactDockMinTopReservePx;
        if (rootBottom > 0) {
          compactTopReserve = Math.max(compactTopReserve, Math.ceil(rootBottom + compactDockSearchGapPx));
        }
        const shortcutSection = getShortcutSection();
        if (isSectionVisible(shortcutSection)) {
          const shortcutRect = shortcutSection.getBoundingClientRect();
          const shortcutBottom = shortcutRect ? Number(shortcutRect.bottom) || 0 : 0;
          if (shortcutBottom > 0) {
            compactTopReserve = Math.max(compactTopReserve, Math.ceil(shortcutBottom + compactDockShortcutGapPx));
          }
        }
        bottomDockTopReserve = compactTopReserve;
      }
      const bottomDockMaxHeight = Math.max(0, viewportHeight - bottomDockTopReserve);
      const bookmarkVisible = isSectionVisible(bookmarkSection);
      const recentVisible = isSectionVisible(recentSection);
      if (!recentVisible && callbacks && typeof callbacks.onRecentHidden === 'function') {
        callbacks.onRecentHidden();
      }
      body.classList.remove('x-nt-stack-layout');
      body.classList.add('x-nt-bottom-layout');
      body.classList.toggle('x-nt-mobile-flow', mobileFlow);
      body.classList.toggle('x-nt-no-bookmarks', !bookmarkVisible);
      bottomDock.setAttribute('data-layout', mobileFlow ? 'flow' : 'fixed');
      const previousDockDensity = typeof bottomDock.getAttribute === 'function'
        ? bottomDock.getAttribute('data-density')
        : '';
      const shortcutSection = getShortcutSection();
      const shortcutVisible = isSectionVisible(shortcutSection);
      const densityLayoutContext = getDockDensityLayoutContext(
        shortcutSection,
        shortcutVisible,
        bottomDockTopReserve
      );
      if (callbacks && callbacks.releaseDockDensityLock) {
        dockDensityPromotionLock = null;
      }
      if (dockDensityPromotionLock &&
          dockDensityPromotionLock.context !== densityLayoutContext) {
        dockDensityPromotionLock = null;
      }
      let dockDensity = mobileFlow
        ? 'mobile'
        : bottomDockMaxHeight <= 260
          ? 'tiny'
          : bottomDockMaxHeight <= 360
            ? 'compact'
            : 'default';
      const isDensityPromotion = !mobileFlow &&
        previousDockDensity &&
        getDockDensityRank(dockDensity) < getDockDensityRank(previousDockDensity);
      const shouldKeepCompactedDensity = isDensityPromotion && (
        Boolean(callbacks && callbacks.stabilizeDockDensity) ||
        Boolean(
          dockDensityPromotionLock &&
          dockDensityPromotionLock.context === densityLayoutContext &&
          dockDensityPromotionLock.density === previousDockDensity
        )
      );
      if (shouldKeepCompactedDensity) {
        dockDensity = previousDockDensity;
        dockDensityPromotionLock = {
          context: densityLayoutContext,
          density: previousDockDensity
        };
      } else if (dockDensity !== previousDockDensity) {
        dockDensityPromotionLock = null;
      }
      body.setAttribute('data-nt-bottom-dock-density', dockDensity);
      bottomDock.setAttribute('data-density', dockDensity);
      sectionSafeCorridor.style.setProperty('display', (bookmarkVisible && recentVisible) ? 'block' : 'none', 'important');
      if (mobileFlow) {
        bottomDock.style.removeProperty('max-height');
      } else {
        bottomDock.style.setProperty('max-height', `${bottomDockMaxHeight}px`, 'important');
      }
      bottomDock.style.setProperty('display', (bookmarkVisible || recentVisible) ? 'flex' : 'none', 'important');
      updateSearchEntryLayout({
        preserveCurrentTop: Boolean(callbacks && callbacks.preserveSearchEntryLayout)
      });
      updateSuggestionsFloatingLayout();
      if (previousDockDensity !== dockDensity && typeof windowObj.requestAnimationFrame === 'function') {
        windowObj.requestAnimationFrame(() => {
          updateBottomDockLayout({
            preserveSearchEntryLayout: true,
            stabilizeDockDensity: true
          });
        });
      }
    }

    function setSuggestionsVisible(visible) {
      const shouldShow = Boolean(visible);
      const suggestionsContainer = getSuggestionsContainer();
      const suggestionsSurface = getSuggestionsSurface();
      const suggestionsOutline = getSuggestionsOutline();
      if (!suggestionsContainer) {
        return;
      }
      setSuggestionsOpenState(shouldShow);
      if (!shouldShow) {
        cancelSuggestionsResizeAnimation(false);
      }
      if (shouldShow) {
        updateSuggestionsFloatingLayout();
      }
      setBooleanAttribute(suggestionsContainer, visibleAttribute, shouldShow);
      setBooleanAttribute(suggestionsSurface, visibleAttribute, shouldShow);
      setBooleanAttribute(suggestionsOutline, visibleAttribute, shouldShow);
      if (shouldShow) {
        if (typeof windowObj.requestAnimationFrame === 'function') {
          windowObj.requestAnimationFrame(updateSuggestionsFloatingLayout);
        } else {
          windowObj.setTimeout(updateSuggestionsFloatingLayout, 0);
        }
      }
    }

    function updateSuggestionsFloatingLayout() {
      const suggestionsContainer = getSuggestionsContainer();
      const inputParts = getInputParts();
      if (!suggestionsContainer || !inputParts || !inputParts.container) {
        return;
      }
      const searchLayer = getSearchLayer();
      const anchor = searchLayer || inputParts.container;
      const anchorRect = anchor.getBoundingClientRect();
      const visualViewport = windowObj.visualViewport;
      const viewportBottom = visualViewport && Number.isFinite(visualViewport.height)
        ? visualViewport.offsetTop + visualViewport.height
        : Math.max(0, windowObj.innerHeight || 0);
      const dropdownTopViewport = anchorRect.bottom - 1;
      const left = Math.round(anchorRect.left);
      const top = Math.round(dropdownTopViewport);
      const width = Math.max(0, Math.round(anchorRect.width));
      const availableWithoutInset = Math.max(0, viewportBottom - dropdownTopViewport);
      const available = Math.max(0, availableWithoutInset - suggestionsBottomInsetPx);
      const availableFitHeight = Math.ceil(availableWithoutInset);
      const contentHeight = Math.ceil(Math.max(0, Number(suggestionsContainer.scrollHeight) || 0));
      const maxHeight = contentHeight > 0 && contentHeight <= availableFitHeight
        ? contentHeight
        : Math.floor(available);
      setPixelStyle(suggestionsContainer, 'left', left);
      setPixelStyle(suggestionsContainer, 'top', top);
      setPixelStyle(suggestionsContainer, 'width', width);
      setPixelStyle(suggestionsContainer, 'max-height', maxHeight);
      updateSuggestionsSurfaceFrame();
    }

    return {
      applyWidthMode,
      updateBottomDockLayout,
      updateSearchEntryLayout,
      setSuggestionsVisible,
      updateSuggestionsFloatingLayout,
      captureSuggestionsResizeState,
      animateSuggestionsResize
    };
  }

  globalThis.LumnoNewtabLayout = {
    createLayoutController,
    getAdaptiveGridColumnCount,
    getGridContentWidthForColumns,
    getResponsiveContentWidth
  };
})();
