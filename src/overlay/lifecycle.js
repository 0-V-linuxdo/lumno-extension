(function(root, factory) {
  const api = factory();
  root.LumnoOverlayLifecycle = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function createFrameTracker(win) {
    const targetWindow = win || window;
    let enterRafA = null;
    let enterRafB = null;

    function clear() {
      if (enterRafA !== null) {
        targetWindow.cancelAnimationFrame(enterRafA);
        enterRafA = null;
      }
      if (enterRafB !== null) {
        targetWindow.cancelAnimationFrame(enterRafB);
        enterRafB = null;
      }
    }

    function runEnterAnimation(element, applyVisibleState) {
      clear();
      if (!element || typeof applyVisibleState !== 'function') {
        return;
      }
      enterRafA = targetWindow.requestAnimationFrame(() => {
        enterRafA = null;
        enterRafB = targetWindow.requestAnimationFrame(() => {
          enterRafB = null;
          if (!element.isConnected) {
            return;
          }
          applyVisibleState();
        });
      });
    }

    return Object.freeze({
      clear,
      runEnterAnimation
    });
  }

  function createViewportSizeSync(win, config) {
    const targetWindow = win || window;
    const settings = config && typeof config === 'object' ? config : {};
    let resizeHandler = null;
    let visualViewportTarget = null;
    let baseDevicePixelRatio = null;
    let baseTopPx = null;
    let initialTabZoomFactor = 1;

    function getSizePreset() {
      if (typeof settings.getSizePreset === 'function') {
        return settings.getSizePreset() || {};
      }
      return { width: 760, maxHeightVh: 75, uiScale: 1 };
    }

    function getRequestedTabZoomFactor() {
      const raw = typeof settings.getRequestedTabZoomFactor === 'function'
        ? settings.getRequestedTabZoomFactor()
        : 1;
      return Number.isFinite(Number(raw)) && Number(raw) > 0 ? Number(raw) : 1;
    }

    function getVisualViewportScale(visualViewport) {
      const raw = visualViewport && Number.isFinite(Number(visualViewport.scale))
        ? Number(visualViewport.scale)
        : 1;
      return raw > 0 ? raw : 1;
    }

    function getVisualViewportOffset(visualViewport, key) {
      const raw = visualViewport && Number.isFinite(Number(visualViewport[key]))
        ? Number(visualViewport[key])
        : 0;
      return raw > 0 ? raw : 0;
    }

    function shouldIgnoreTabZoomCompensation() {
      return typeof settings.shouldIgnoreTabZoomCompensation === 'function'
        ? Boolean(settings.shouldIgnoreTabZoomCompensation())
        : false;
    }

    function getViewportSize() {
      const doc = targetWindow.document;
      const visualViewport = targetWindow.visualViewport;
      const viewportWidth = visualViewport && Number.isFinite(visualViewport.width) && visualViewport.width > 0
        ? visualViewport.width
        : (targetWindow.innerWidth || doc.documentElement.clientWidth || 0);
      const viewportHeight = visualViewport && Number.isFinite(visualViewport.height) && visualViewport.height > 0
        ? visualViewport.height
        : (targetWindow.innerHeight || doc.documentElement.clientHeight || 0);
      const visualViewportScale = getVisualViewportScale(visualViewport);
      return {
        viewportWidth: viewportWidth * visualViewportScale,
        viewportHeight: viewportHeight * visualViewportScale,
        visualViewportScale,
        visualViewportOffsetLeft: getVisualViewportOffset(visualViewport, 'offsetLeft'),
        visualViewportOffsetTop: getVisualViewportOffset(visualViewport, 'offsetTop')
      };
    }

    function apply(overlayElement) {
      if (!overlayElement || !overlayElement.isConnected) {
        return;
      }
      const sizePreset = getSizePreset();
      const viewport = getViewportSize();
      const currentDpr = Number.isFinite(targetWindow.devicePixelRatio) && targetWindow.devicePixelRatio > 0
        ? targetWindow.devicePixelRatio
        : 1;
      const baseDpr = Number.isFinite(baseDevicePixelRatio) && baseDevicePixelRatio > 0
        ? baseDevicePixelRatio
        : currentDpr;
      const dprScaleDelta = currentDpr / baseDpr;
      const tabZoomFactor = Number.isFinite(initialTabZoomFactor) && initialTabZoomFactor > 0
        ? initialTabZoomFactor
        : 1;
      const visualViewportScale = Number.isFinite(viewport.visualViewportScale) && viewport.visualViewportScale > 0
        ? viewport.visualViewportScale
        : 1;
      const layoutZoomScale = tabZoomFactor * dprScaleDelta;
      const zoomScale = layoutZoomScale * visualViewportScale;
      const safeZoomScale = Math.max(0.5, Math.min(3, zoomScale));
      const safeVisualViewportScale = Math.max(0.5, Math.min(3, visualViewportScale));
      const presetUiScale = Number.isFinite(sizePreset.uiScale) && sizePreset.uiScale > 0
        ? sizePreset.uiScale
        : 1;
      const finalOverlayZoom = (1 / safeZoomScale) * presetUiScale;
      const safeFinalOverlayZoom = Math.max(0.35, Math.min(4, finalOverlayZoom));
      const maxWidth = Math.max(280, viewport.viewportWidth - 24);
      // Fixed-position anchors already use zoom-adjusted CSS viewport coordinates.
      // Tab zoom only belongs in the visual scale compensation above.
      const baseLeft = viewport.viewportWidth * 0.5;
      const compensatedLeft = viewport.visualViewportOffsetLeft +
        (baseLeft / safeVisualViewportScale);
      const baseTop = Number.isFinite(baseTopPx) && baseTopPx > 0
        ? baseTopPx
        : (viewport.viewportHeight * 0.2);
      const compensatedTop = viewport.visualViewportOffsetTop +
        (baseTop / safeVisualViewportScale);
      const topPx = Math.max(16, Math.min(compensatedTop, Math.max(16, viewport.viewportHeight - 120)));
      const leftPx = Math.max(16, Math.min(compensatedLeft, Math.max(16, viewport.viewportWidth - 16)));
      overlayElement.style.setProperty('width', `${sizePreset.width}px`, 'important');
      overlayElement.style.setProperty('max-width', `${maxWidth}px`, 'important');
      overlayElement.style.setProperty('max-height', `${sizePreset.maxHeightVh}vh`, 'important');
      overlayElement.style.setProperty('top', `${topPx}px`, 'important');
      overlayElement.style.setProperty('left', `${leftPx}px`, 'important');
      overlayElement.style.setProperty('--x-ov-visible-scale', `${safeFinalOverlayZoom}`, 'important');
      if (typeof overlayElement.style.removeProperty === 'function') {
        overlayElement.style.removeProperty('zoom');
      }
    }

    function stop() {
      if (!resizeHandler) {
        baseDevicePixelRatio = null;
        baseTopPx = null;
        initialTabZoomFactor = 1;
        return;
      }
      targetWindow.removeEventListener('resize', resizeHandler);
      if (visualViewportTarget && typeof visualViewportTarget.removeEventListener === 'function') {
        visualViewportTarget.removeEventListener('resize', resizeHandler);
        visualViewportTarget.removeEventListener('scroll', resizeHandler);
      }
      resizeHandler = null;
      visualViewportTarget = null;
      baseDevicePixelRatio = null;
      baseTopPx = null;
      initialTabZoomFactor = 1;
    }

    function start(overlayElement) {
      stop();
      if (!overlayElement) {
        return;
      }
      baseDevicePixelRatio = Number.isFinite(targetWindow.devicePixelRatio) && targetWindow.devicePixelRatio > 0
        ? targetWindow.devicePixelRatio
        : 1;
      initialTabZoomFactor = shouldIgnoreTabZoomCompensation() ? 1 : getRequestedTabZoomFactor();
      const viewport = getViewportSize();
      const visualViewport = targetWindow.visualViewport;
      baseTopPx = viewport.viewportHeight * 0.2;
      resizeHandler = () => {
        apply(overlayElement);
      };
      targetWindow.addEventListener('resize', resizeHandler);
      if (visualViewport && typeof visualViewport.addEventListener === 'function') {
        visualViewport.addEventListener('resize', resizeHandler);
        visualViewport.addEventListener('scroll', resizeHandler);
        visualViewportTarget = visualViewport;
      }
      apply(overlayElement);
    }

    return Object.freeze({
      apply,
      start,
      stop
    });
  }

  function createAntiTranslateGuard(win, deps) {
    const targetWindow = win || window;
    const helpers = deps && typeof deps === 'object' ? deps : {};
    const applyNoTranslate = typeof helpers.applyNoTranslate === 'function'
      ? helpers.applyNoTranslate
      : (node) => node;
    const applyNoTranslateDeep = typeof helpers.applyNoTranslateDeep === 'function'
      ? helpers.applyNoTranslateDeep
      : (node) => node;
    const restoreProtectedNode = typeof helpers.restoreProtectedNode === 'function'
      ? helpers.restoreProtectedNode
      : () => false;
    const restoreProtectedAncestors = typeof helpers.restoreProtectedAncestors === 'function'
      ? helpers.restoreProtectedAncestors
      : () => false;
    const MutationObserverCtor = targetWindow.MutationObserver;
    const NodeCtor = targetWindow.Node;
    const GUARD_WINDOW_MS = 1500;
    const MAX_MUTATIONS_PER_WINDOW = 120;
    const MAX_CALLBACKS_PER_WINDOW = 12;
    const BACKOFF_MS = 900;
    const SCROLL_PAUSE_MS = 180;

    let observer = null;
    let state = null;
    let scrollPauseResumeTimer = null;

    function observeRoot(root) {
      if (!observer || !root || !root.isConnected) {
        return;
      }
      observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    function restoreProtectedSubtree(root) {
      if (!root || !NodeCtor || root.nodeType !== NodeCtor.ELEMENT_NODE) {
        return;
      }
      const nodes = [root];
      if (typeof root.querySelectorAll === 'function') {
        root.querySelectorAll('*').forEach((node) => {
          nodes.push(node);
        });
      }
      nodes.forEach((node) => {
        restoreProtectedNode(node);
      });
    }

    function stop() {
      if (scrollPauseResumeTimer !== null) {
        targetWindow.clearTimeout(scrollPauseResumeTimer);
        scrollPauseResumeTimer = null;
      }
      if (state && state.flushTimer) {
        targetWindow.clearTimeout(state.flushTimer);
      }
      if (state && state.resumeTimer) {
        targetWindow.clearTimeout(state.resumeTimer);
      }
      state = null;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }

    function pauseForScroll() {
      const activeState = state;
      if (!activeState || activeState.paused) {
        return;
      }
      activeState.paused = true;
      if (activeState.flushTimer) {
        targetWindow.clearTimeout(activeState.flushTimer);
        activeState.flushTimer = null;
      }
      if (observer) {
        observer.disconnect();
      }
      if (scrollPauseResumeTimer !== null) {
        targetWindow.clearTimeout(scrollPauseResumeTimer);
      }
      scrollPauseResumeTimer = targetWindow.setTimeout(() => {
        scrollPauseResumeTimer = null;
        const currentState = state;
        if (!currentState || currentState !== activeState || currentState.resumeTimer) {
          return;
        }
        if (!activeState.root || !activeState.root.isConnected) {
          return;
        }
        activeState.guardWindowStartedAt = 0;
        activeState.mutationCountInWindow = 0;
        activeState.callbackCountInWindow = 0;
        activeState.pendingProtectedNodes.clear();
        activeState.pendingNoTranslateRoots.clear();
        activeState.paused = false;
        observeRoot(activeState.root);
      }, SCROLL_PAUSE_MS);
    }

    function backoff(reason, detail) {
      const activeState = state;
      if (!activeState || activeState.paused) {
        return;
      }
      activeState.paused = true;
      if (activeState.flushTimer) {
        targetWindow.clearTimeout(activeState.flushTimer);
        activeState.flushTimer = null;
      }
      if (observer) {
        observer.disconnect();
      }
      activeState.pendingProtectedNodes.clear();
      activeState.pendingNoTranslateRoots.clear();
      if (activeState.resumeTimer) {
        targetWindow.clearTimeout(activeState.resumeTimer);
      }
      activeState.resumeTimer = targetWindow.setTimeout(() => {
        const currentState = state;
        if (!currentState || currentState !== activeState) {
          return;
        }
        activeState.resumeTimer = null;
        if (!activeState.root || !activeState.root.isConnected) {
          return;
        }
        applyNoTranslateDeep(activeState.root);
        restoreProtectedSubtree(activeState.root);
        activeState.guardWindowStartedAt = 0;
        activeState.mutationCountInWindow = 0;
        activeState.callbackCountInWindow = 0;
        activeState.paused = false;
        observeRoot(activeState.root);
      }, BACKOFF_MS);
      try {
        targetWindow.console.warn('[Lumno] Backing off overlay anti-translate observer to avoid DOM churn', {
          reason: reason || 'unknown',
          detail: detail || null
        });
      } catch (error) {
        // Ignore console serialization failures.
      }
    }

    function start(root) {
      stop();
      if (!root || typeof MutationObserverCtor !== 'function') {
        return;
      }
      let isRestoring = false;
      state = {
        root,
        flushTimer: null,
        pendingProtectedNodes: new Set(),
        pendingNoTranslateRoots: new Set(),
        guardWindowStartedAt: 0,
        mutationCountInWindow: 0,
        callbackCountInWindow: 0,
        paused: false,
        resumeTimer: null
      };
      observer = new MutationObserverCtor((mutations) => {
        const activeState = state;
        if (isRestoring || !activeState || activeState.paused) {
          return;
        }
        const now = Date.now();
        if (!activeState.guardWindowStartedAt || now - activeState.guardWindowStartedAt > GUARD_WINDOW_MS) {
          activeState.guardWindowStartedAt = now;
          activeState.mutationCountInWindow = 0;
          activeState.callbackCountInWindow = 0;
        }
        activeState.mutationCountInWindow += mutations.length;
        activeState.callbackCountInWindow += 1;
        if (activeState.mutationCountInWindow > MAX_MUTATIONS_PER_WINDOW ||
            activeState.callbackCountInWindow > MAX_CALLBACKS_PER_WINDOW) {
          backoff('mutation-budget-exceeded', {
            mutationCountInWindow: activeState.mutationCountInWindow,
            callbackCountInWindow: activeState.callbackCountInWindow
          });
          return;
        }
        mutations.forEach((mutation) => {
          if (mutation.target) {
            const restored = restoreProtectedAncestors(mutation.target, root);
            if (!restored && mutation.target.nodeType === NodeCtor.ELEMENT_NODE) {
              activeState.pendingNoTranslateRoots.add(mutation.target);
            }
          }
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === NodeCtor.ELEMENT_NODE) {
              activeState.pendingNoTranslateRoots.add(node);
            }
            let current = node && node.nodeType === NodeCtor.ELEMENT_NODE
              ? node
              : node && node.parentElement
                ? node.parentElement
                : null;
            while (current) {
              if (typeof current._xProtectedRender === 'function') {
                activeState.pendingProtectedNodes.add(current);
                break;
              }
              if (current === root) {
                break;
              }
              current = current.parentElement;
            }
          });
        });
        if (activeState.pendingProtectedNodes.size <= 0 && activeState.pendingNoTranslateRoots.size <= 0) {
          return;
        }
        if (activeState.flushTimer) {
          return;
        }
        activeState.flushTimer = targetWindow.setTimeout(() => {
          const currentState = state;
          if (!currentState || currentState !== activeState || currentState.paused) {
            return;
          }
          activeState.flushTimer = null;
          const noTranslateRoots = Array.from(activeState.pendingNoTranslateRoots);
          const protectedNodes = Array.from(activeState.pendingProtectedNodes);
          activeState.pendingNoTranslateRoots.clear();
          activeState.pendingProtectedNodes.clear();
          isRestoring = true;
          if (observer) {
            observer.disconnect();
          }
          noTranslateRoots.forEach((node) => {
            applyNoTranslateDeep(node);
          });
          protectedNodes.forEach((node) => {
            restoreProtectedNode(node);
          });
          isRestoring = false;
          observeRoot(root);
        }, 0);
      });
      observeRoot(root);
    }

    return Object.freeze({
      pauseForScroll,
      start,
      stop
    });
  }

  return Object.freeze({
    createAntiTranslateGuard,
    createFrameTracker,
    createViewportSizeSync
  });
});
