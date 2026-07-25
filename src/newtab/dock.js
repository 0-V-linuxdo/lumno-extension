(function(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoNewtabDock = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  const IDS = Object.freeze({
    bottomDock: '_x_extension_newtab_bottom_dock_2024_unique_',
    scroller: '_x_extension_newtab_bottom_dock_scroller_2024_unique_',
    sectionSafeCorridor: '_x_extension_newtab_section_safe_corridor_2026_unique_'
  });

  const DEFAULT_LAYOUT_CONSTANTS = Object.freeze({
    bottomDockTopReservePx: 240,
    compactDockViewportMaxHeightPx: 800,
    compactDockSearchGapPx: 30,
    compactDockShortcutGapPx: 8,
    compactDockMinTopReservePx: 168
  });

  function createElement(documentObj, tagName) {
    if (!documentObj || typeof documentObj.createElement !== 'function') {
      throw new Error('LumnoNewtabDock requires a document with createElement().');
    }
    return documentObj.createElement(tagName);
  }

  function appendIfPresent(parent, child) {
    if (parent && child && typeof parent.appendChild === 'function') {
      parent.appendChild(child);
    }
  }

  function createBottomDockRuntime(options) {
    const config = options || {};
    const documentObj = config.documentObj || (root && root.document);
    const windowObj = config.windowObj || (root && root.window) || root;
    const layoutRuntime = config.layoutRuntime || (root && root.LumnoNewtabLayout) || {};
    if (!layoutRuntime || typeof layoutRuntime.createLayoutController !== 'function') {
      throw new Error('LumnoNewtabDock requires LumnoNewtabLayout.createLayoutController().');
    }

    const bottomDock = createElement(documentObj, 'div');
    bottomDock.id = IDS.bottomDock;
    const scroller = createElement(documentObj, 'div');
    scroller.id = IDS.scroller;
    const sectionSafeCorridor = createElement(documentObj, 'div');
    sectionSafeCorridor.id = IDS.sectionSafeCorridor;

    const layoutController = layoutRuntime.createLayoutController({
      documentObj,
      windowObj,
      root: config.root,
      searchLayer: config.searchLayer,
      inputParts: config.inputParts,
      wordmarkContainer: config.wordmarkContainer,
      shortcutSection: config.shortcutSection,
      bottomDock,
      bookmarkSection: config.bookmarkSection,
      recentSection: config.recentSection,
      sectionSafeCorridor,
      suggestionsContainer: config.suggestionsContainer,
      suggestionsSurface: config.suggestionsSurface,
      suggestionsOutline: config.suggestionsOutline,
      getTopInsetPx: config.getTopInsetPx,
      constants: {
        ...DEFAULT_LAYOUT_CONSTANTS,
        ...(config.constants || {})
      }
    });

    const runtime = {
      element: bottomDock,
      scroller,
      sectionSafeCorridor,
      layoutController,
      appendSections() {
        appendIfPresent(scroller, config.bookmarkSection);
        appendIfPresent(scroller, sectionSafeCorridor);
        appendIfPresent(scroller, config.recentSection);
        return runtime;
      },
      mount(parent) {
        runtime.appendSections();
        appendIfPresent(bottomDock, scroller);
        appendIfPresent(parent || (documentObj && documentObj.body), bottomDock);
        return runtime;
      },
      onScroll(listener, options) {
        if (scroller && typeof scroller.addEventListener === 'function') {
          scroller.addEventListener('scroll', listener, options);
        }
        return runtime;
      },
      updateLayout(callbacks) {
        if (layoutController && typeof layoutController.updateBottomDockLayout === 'function') {
          layoutController.updateBottomDockLayout(callbacks);
        }
      }
    };

    return runtime;
  }

  return {
    IDS,
    DEFAULT_LAYOUT_CONSTANTS,
    createBottomDockRuntime
  };
});
