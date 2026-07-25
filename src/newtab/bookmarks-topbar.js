(function(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoNewtabBookmarksTopbar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  const IDS = Object.freeze({
    topbar: '_x_extension_newtab_bookmarks_topbar_2026_unique_',
    viewport: '_x_extension_newtab_bookmarks_topbar_viewport_2026_unique_',
    items: '_x_extension_newtab_bookmarks_topbar_items_2026_unique_',
    edgeFade: '_x_extension_newtab_bookmarks_topbar_edge_fade_2026_unique_',
    actions: '_x_extension_newtab_bookmarks_topbar_actions_2026_unique_'
  });
  const HEIGHT_PX = 36;
  const SURFACE_STYLE_PROPERTIES = Object.freeze([
    '--x-nt-bookmarks-topbar-surface',
    '--x-nt-bookmarks-topbar-terminal-surface',
    '--x-nt-bookmarks-topbar-ink',
    '--x-nt-bookmarks-topbar-action-hover',
    '--x-nt-bookmarks-topbar-item-hover',
    '--x-nt-bookmarks-topbar-folder-hover'
  ]);

  function normalizeSurfaceColor(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(raw)) {
      return raw;
    }
    if (/^#[0-9a-f]{3}$/.test(raw)) {
      return `#${raw.slice(1).split('').map((part) => `${part}${part}`).join('')}`;
    }
    return '';
  }

  function getRelativeLuminance(color) {
    const normalized = normalizeSurfaceColor(color);
    if (!normalized) {
      return 1;
    }
    const channels = [1, 3, 5].map((index) => {
      const channel = Number.parseInt(normalized.slice(index, index + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return (channels[0] * 0.2126) + (channels[1] * 0.7152) + (channels[2] * 0.0722);
  }

  function getSurfaceColorTokens(value) {
    const surfaceColor = normalizeSurfaceColor(value);
    if (!surfaceColor) {
      return null;
    }
    const useDarkInk = getRelativeLuminance(surfaceColor) >= 0.2;
    return Object.freeze({
      surfaceColor,
      ink: useDarkInk ? '#111827' : '#f8fafc',
      actionHover: useDarkInk
        ? 'rgba(15, 23, 42, 0.065)'
        : 'rgba(255, 255, 255, 0.095)',
      itemHover: useDarkInk
        ? 'rgba(15, 23, 42, 0.065)'
        : 'rgba(255, 255, 255, 0.095)',
      folderHover: useDarkInk
        ? 'rgba(37, 99, 235, 0.075)'
        : 'rgba(96, 165, 250, 0.12)'
    });
  }

  function createElement(documentObj, tagName, className) {
    const element = documentObj.createElement(tagName);
    if (className) {
      element.className = className;
    }
    return element;
  }

  function rememberPlacement(element) {
    return element && element.parentNode
      ? {
        parent: element.parentNode,
        nextSibling: element.nextSibling
      }
      : null;
  }

  function restorePlacement(element, placement) {
    if (!element || !placement || !placement.parent) {
      return false;
    }
    const nextSibling = placement.nextSibling;
    if (nextSibling && nextSibling.parentNode === placement.parent) {
      placement.parent.insertBefore(element, nextSibling);
    } else {
      placement.parent.appendChild(element);
    }
    return true;
  }

  function createBookmarksTopbar(options) {
    const config = options && typeof options === 'object' ? options : {};
    const documentObj = config.documentObj || (root && root.document);
    const windowObj = config.windowObj || (root && root.window) || root;
    if (!documentObj || typeof documentObj.createElement !== 'function') {
      throw new Error('LumnoNewtabBookmarksTopbar requires a document.');
    }

    const element = createElement(documentObj, 'section', 'x-nt-bookmarks-topbar');
    element.id = IDS.topbar;
    element.setAttribute('aria-label', String(config.ariaLabel || 'Bookmarks'));
    element.setAttribute('data-visible', 'false');

    const viewport = createElement(documentObj, 'div', 'x-nt-bookmarks-topbar-viewport');
    viewport.id = IDS.viewport;
    const itemsHost = createElement(documentObj, 'div', 'x-nt-bookmarks-topbar-items');
    itemsHost.id = IDS.items;
    const edgeFade = createElement(documentObj, 'div', 'x-nt-bookmarks-topbar-edge-fade');
    edgeFade.id = IDS.edgeFade;
    edgeFade.setAttribute('data-visible', 'false');
    edgeFade.setAttribute('aria-hidden', 'true');
    const actions = createElement(documentObj, 'div', 'x-nt-bookmarks-topbar-actions');
    actions.id = IDS.actions;
    viewport.appendChild(itemsHost);
    element.appendChild(viewport);
    element.appendChild(edgeFade);
    element.appendChild(actions);

    const grid = config.grid || null;
    const modeControl = config.modeControl || null;
    const managerButton = config.managerButton || null;
    const onVisibilityChange = typeof config.onVisibilityChange === 'function'
      ? config.onVisibilityChange
      : null;
    const placements = {
      grid: rememberPlacement(grid),
      modeControl: rememberPlacement(modeControl),
      managerButton: rememberPlacement(managerButton)
    };
    let active = false;
    let visible = false;
    let overflowRight = false;
    let overflowSyncFrameId = 0;
    let destroyed = false;

    function setSurfaceColor(value) {
      const tokens = getSurfaceColorTokens(value);
      if (!element.style ||
          typeof element.style.setProperty !== 'function' ||
          typeof element.style.removeProperty !== 'function') {
        return tokens ? tokens.surfaceColor : '';
      }
      if (!tokens) {
        SURFACE_STYLE_PROPERTIES.forEach((propertyName) => {
          element.style.removeProperty(propertyName);
        });
        element.removeAttribute('data-custom-surface');
        return '';
      }
      element.style.setProperty('--x-nt-bookmarks-topbar-surface', tokens.surfaceColor);
      element.style.setProperty('--x-nt-bookmarks-topbar-terminal-surface', tokens.surfaceColor);
      element.style.setProperty('--x-nt-bookmarks-topbar-ink', tokens.ink);
      element.style.setProperty('--x-nt-bookmarks-topbar-action-hover', tokens.actionHover);
      element.style.setProperty('--x-nt-bookmarks-topbar-item-hover', tokens.itemHover);
      element.style.setProperty('--x-nt-bookmarks-topbar-folder-hover', tokens.folderHover);
      element.setAttribute('data-custom-surface', 'true');
      return tokens.surfaceColor;
    }

    function setOverflowFadeVisible(nextVisible) {
      const nextOverflowRight = nextVisible === true;
      if (overflowRight === nextOverflowRight) {
        return overflowRight;
      }
      overflowRight = nextOverflowRight;
      edgeFade.setAttribute('data-visible', overflowRight ? 'true' : 'false');
      return overflowRight;
    }

    function syncOverflowFade() {
      const scrollWidth = Number(viewport.scrollWidth) || 0;
      const clientWidth = Number(viewport.clientWidth) || 0;
      const scrollLeft = Math.max(0, Number(viewport.scrollLeft) || 0);
      const hasOverflowRight = active && visible && clientWidth > 0 &&
        scrollLeft + clientWidth < scrollWidth - 1;
      return setOverflowFadeVisible(hasOverflowRight);
    }

    function scheduleOverflowFadeSync() {
      if (destroyed || overflowSyncFrameId) {
        return;
      }
      if (!windowObj || typeof windowObj.requestAnimationFrame !== 'function') {
        syncOverflowFade();
        return;
      }
      overflowSyncFrameId = windowObj.requestAnimationFrame(() => {
        overflowSyncFrameId = 0;
        syncOverflowFade();
      });
    }

    function setVisible(nextVisible) {
      const previousVisible = visible;
      visible = nextVisible === true;
      element.setAttribute('data-visible', visible ? 'true' : 'false');
      if (visible) {
        scheduleOverflowFadeSync();
      } else {
        setOverflowFadeVisible(false);
      }
      if (onVisibilityChange && previousVisible !== visible) {
        onVisibilityChange(visible, {
          element,
          height: HEIGHT_PX
        });
      }
      return visible;
    }

    function activate() {
      if (active) {
        return false;
      }
      if (grid) {
        itemsHost.appendChild(grid);
      }
      if (modeControl) {
        actions.appendChild(modeControl);
      }
      if (managerButton) {
        actions.appendChild(managerButton);
      }
      active = true;
      element.setAttribute('data-active', 'true');
      scheduleOverflowFadeSync();
      return true;
    }

    function deactivate() {
      if (!active) {
        return false;
      }
      restorePlacement(grid, placements.grid);
      restorePlacement(modeControl, placements.modeControl);
      restorePlacement(managerButton, placements.managerButton);
      active = false;
      setVisible(false);
      element.setAttribute('data-active', 'false');
      return true;
    }

    function updateLanguage(ariaLabel) {
      element.setAttribute('aria-label', String(ariaLabel || 'Bookmarks'));
    }

    function autoScroll(pointerX, pointerY) {
      if (!active || !visible || !viewport ||
          typeof viewport.getBoundingClientRect !== 'function') {
        return 0;
      }
      const x = Number(pointerX);
      const y = Number(pointerY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return 0;
      }
      const rect = viewport.getBoundingClientRect();
      const edgeSize = Math.min(72, Math.max(36, rect.width * 0.1));
      if (y < rect.top || y > rect.bottom ||
          x < rect.left - edgeSize || x > rect.right + edgeSize) {
        return 0;
      }
      let direction = 0;
      let strength = 0;
      if (x < rect.left + edgeSize) {
        direction = -1;
        strength = 1 - Math.max(0, x - rect.left) / edgeSize;
      } else if (x > rect.right - edgeSize) {
        direction = 1;
        strength = 1 - Math.max(0, rect.right - x) / edgeSize;
      }
      if (!direction) {
        return 0;
      }
      const delta = direction * Math.max(4, Math.round(18 * Math.min(1, strength)));
      const previousScrollLeft = Number(viewport.scrollLeft) || 0;
      viewport.scrollLeft = previousScrollLeft + delta;
      scheduleOverflowFadeSync();
      return (Number(viewport.scrollLeft) || 0) - previousScrollLeft;
    }

    viewport.addEventListener('scroll', scheduleOverflowFadeSync, { passive: true });
    if (windowObj && typeof windowObj.addEventListener === 'function') {
      windowObj.addEventListener('resize', scheduleOverflowFadeSync);
    }
    viewport.addEventListener('wheel', (event) => {
      if (!active || !visible || !event) {
        return;
      }
      const horizontalDelta = Math.abs(Number(event.deltaX) || 0);
      const verticalDelta = Math.abs(Number(event.deltaY) || 0);
      const delta = horizontalDelta > verticalDelta ? Number(event.deltaX) : Number(event.deltaY);
      if (!delta || viewport.scrollWidth <= viewport.clientWidth) {
        return;
      }
      event.preventDefault();
      viewport.scrollLeft += delta;
      scheduleOverflowFadeSync();
    }, { passive: false });

    function mount(parent) {
      const target = parent || (documentObj && documentObj.body);
      if (target && element.parentNode !== target) {
        target.appendChild(element);
      }
      return runtime;
    }

    function destroy() {
      destroyed = true;
      if (overflowSyncFrameId && windowObj &&
          typeof windowObj.cancelAnimationFrame === 'function') {
        windowObj.cancelAnimationFrame(overflowSyncFrameId);
        overflowSyncFrameId = 0;
      }
      deactivate();
      if (windowObj && typeof windowObj.removeEventListener === 'function') {
        windowObj.removeEventListener('resize', scheduleOverflowFadeSync);
      }
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }

    const runtime = Object.freeze({
      element,
      viewport,
      itemsHost,
      edgeFade,
      actions,
      mount,
      activate,
      deactivate,
      setVisible,
      setSurfaceColor,
      updateLanguage,
      autoScroll,
      syncOverflowFade,
      isActive: () => active,
      isVisible: () => visible,
      destroy,
      windowObj
    });
    return runtime;
  }

  return Object.freeze({
    IDS,
    HEIGHT_PX,
    normalizeSurfaceColor,
    getSurfaceColorTokens,
    createBookmarksTopbar
  });
});
