(function(root, factory) {
  const api = factory();
  root.LumnoOverlayShell = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function isCornerShapeSupported(doc, shape) {
    const win = doc && doc.defaultView ? doc.defaultView : (typeof window !== 'undefined' ? window : null);
    return Boolean(
      win &&
      win.CSS &&
      typeof win.CSS.supports === 'function' &&
      win.CSS.supports('corner-shape', shape)
    );
  }

  function applyCornerShapeIfSupported(element, shape, priority) {
    if (!element || !element.style || !isCornerShapeSupported(element.ownerDocument, shape)) {
      return;
    }
    element.style.setProperty('corner-shape', shape, priority || '');
  }

  function createOverlayElement(doc, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const overlay = doc.createElement('div');
    const width = Number(settings.width) || 760;
    const maxHeightVh = Number(settings.maxHeightVh) || 75;

    overlay.id = settings.id || '_x_extension_overlay_2024_unique_';
    overlay.style.cssText = `
      all: unset !important;
      position: fixed !important;
      top: 20vh !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(10px) scale(var(--x-ov-visible-scale, 1)) scale(0.985) !important;
      transform-origin: top center !important;
      width: ${width}px !important;
      max-width: calc(100vw - 24px) !important;
      max-height: ${maxHeightVh}vh !important;
      --x-ov-panel-radius: 32px;
      background: var(--x-ov-bg, rgba(255, 255, 255, 0.95)) !important;
      backdrop-filter: blur(var(--x-ov-blur, 24px)) saturate(var(--x-ov-saturate, 165%)) !important;
      -webkit-backdrop-filter: blur(var(--x-ov-blur, 24px)) saturate(var(--x-ov-saturate, 165%)) !important;
      border: 1px solid var(--x-ov-border, rgba(0, 0, 0, 0.08)) !important;
      border-radius: var(--x-ov-panel-radius) !important;
      box-shadow: var(--x-ov-shadow, 0 17px 120px 0 rgba(0, 0, 0, 0.05), 0 32px 44.5px 0 rgba(0, 0, 0, 0.10), 0 80px 120px 0 rgba(0, 0, 0, 0.15)) !important;
      z-index: 2147483647 !important;
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      pointer-events: auto !important;
      contain: layout style !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1 !important;
      text-decoration: none !important;
      list-style: none !important;
      outline: none !important;
      color: var(--x-ov-text, #111827) !important;
      font-size: 16px !important;
      font-style: normal !important;
      font-variant: normal !important;
      font-weight: 400 !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      text-transform: none !important;
      text-shadow: none !important;
      vertical-align: baseline !important;
      opacity: 0 !important;
      filter: blur(6px) !important;
      will-change: transform, opacity, filter !important;
      transition: transform 340ms cubic-bezier(0.2, 1, 0.36, 1), opacity 220ms ease, filter 300ms ease !important;
    `;
    applyCornerShapeIfSupported(overlay, 'superellipse(1.25)', 'important');

    return overlay;
  }

  function findById(rootNode, id) {
    if (!rootNode || !id) {
      return null;
    }
    if (typeof rootNode.getElementById === 'function') {
      return rootNode.getElementById(id);
    }
    if (typeof rootNode.querySelector === 'function') {
      return rootNode.querySelector(`#${id}`);
    }
    return null;
  }

  function appendStylesheet(doc, rootNode, id, href) {
    if (!doc || !rootNode || !id || !href || findById(rootNode, id)) {
      return;
    }
    const link = doc.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    rootNode.appendChild(link);
  }

  function appendOverlayStyleNodes(doc, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const styleRoot = settings.root || (doc && doc.head ? doc.head : null);
    if (!styleRoot) {
      return;
    }

    appendStylesheet(doc, styleRoot, '_x_extension_open_sans_shadow_css_2026_unique_', settings.openSansCssUrl);
    appendStylesheet(doc, styleRoot, '_x_extension_remixicon_shadow_css_2026_unique_', settings.remixIconCssUrl);
    appendStylesheet(doc, styleRoot, '_x_extension_input_component_style_2026_unique_', settings.searchInputCssUrl);
    appendStylesheet(doc, styleRoot, '_x_extension_feature_hints_style_2026_unique_', settings.featureHintsCssUrl);
    appendStylesheet(doc, styleRoot, '_x_extension_tooltip_component_style_2026_unique_', settings.tooltipCssUrl);
    appendStylesheet(doc, styleRoot, '_x_extension_cursor_tooltip_component_style_2026_unique_', settings.cursorTooltipCssUrl);
    appendStylesheet(doc, styleRoot, '_x_extension_overlay_suggestions_style_2026_unique_', settings.overlaySuggestionsCssUrl);

    if (findById(styleRoot, '_x_extension_scrollbar_style_2024_unique_') ||
        findById(styleRoot, '_x_extension_overlay_theme_style_2024_unique_')) {
      return;
    }

    const scrollbarStyle = doc.createElement('style');
    scrollbarStyle.id = '_x_extension_scrollbar_style_2024_unique_';
    scrollbarStyle.textContent = `
      #_x_extension_overlay_2024_unique_ *::-webkit-scrollbar {
        display: none;
      }
      #_x_extension_overlay_2024_unique_ * {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    styleRoot.appendChild(scrollbarStyle);

    const overlayThemeStyle = doc.createElement('style');
    overlayThemeStyle.id = '_x_extension_overlay_theme_style_2024_unique_';
    overlayThemeStyle.textContent = `
      #_x_extension_overlay_2024_unique_ .ri-icon {
        width: var(--ri-size, 16px);
        height: var(--ri-size, 16px);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        font-size: var(--ri-size, 16px);
        flex-shrink: 0;
        font-style: normal;
        font-variant: normal;
        text-transform: none;
      }
      #_x_extension_overlay_2024_unique_ button .ri-icon,
      #_x_extension_overlay_2024_unique_ [role="button"] .ri-icon,
      #_x_extension_overlay_2024_unique_ a .ri-icon {
        cursor: inherit;
        pointer-events: none;
      }
      #_x_extension_overlay_2024_unique_ .ri-icon::before {
        font-style: normal;
        font-variant: normal;
        text-transform: none;
      }
      #_x_extension_overlay_2024_unique_ .ri-size-8 { --ri-size: 8px; }
      #_x_extension_overlay_2024_unique_ .ri-size-12 { --ri-size: 12px; }
      #_x_extension_overlay_2024_unique_ .ri-size-16 { --ri-size: 16px; }
      #_x_extension_overlay_2024_unique_ .ri-size-20 { --ri-size: 20px; }
      #_x_extension_overlay_2024_unique_ .ri-size-24 { --ri-size: 24px; }
      #_x_extension_search_input_2024_unique_ {
        text-align: left;
      }
      #_x_extension_search_input_2024_unique_::placeholder {
        color: var(--x-ov-placeholder, #9CA3AF);
        opacity: 0.68;
        text-align: left;
      }
      #_x_extension_search_input_2024_unique_::-webkit-input-placeholder {
        color: var(--x-ov-placeholder, #9CA3AF);
        opacity: 0.68;
      }
      #_x_extension_search_input_2024_unique_::selection {
        background: #CFE8FF;
        color: #1E3A8A;
      }
    `;
    styleRoot.appendChild(overlayThemeStyle);
  }

  function createOverlayHost(doc, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const host = doc.createElement('div');
    host.id = settings.hostId || '_x_extension_overlay_host_2026_unique_';
    host.setAttribute('data-lumno-overlay-host', 'true');
    host.style.cssText = `
      all: initial !important;
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      overflow: visible !important;
      transform: none !important;
      filter: none !important;
      clip: auto !important;
      clip-path: none !important;
      mask: none !important;
      -webkit-mask: none !important;
      content-visibility: visible !important;
      isolation: isolate !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      contain: layout style paint !important;
      background: transparent !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      box-sizing: border-box !important;
      color: initial !important;
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      font-size: 16px !important;
      font-style: normal !important;
      font-variant: normal !important;
      font-weight: 400 !important;
      letter-spacing: normal !important;
      line-height: 1 !important;
      text-align: initial !important;
      text-decoration: none !important;
      text-shadow: none !important;
      text-transform: none !important;
      word-spacing: normal !important;
    `;
    return host;
  }

  function createOverlayMount(doc, options) {
    const settings = options && typeof options === 'object' ? options : {};
    if (!doc || typeof doc.createElement !== 'function') {
      return null;
    }
    const host = createOverlayHost(doc, settings);
    if (typeof host.attachShadow !== 'function') {
      const panel = createOverlayElement(doc, settings);
      return {
        host: panel,
        panel,
        root: null
      };
    }
    const shadowRoot = host.attachShadow({ mode: 'open' });
    appendOverlayStyleNodes(doc, {
      root: shadowRoot,
      openSansCssUrl: settings.openSansCssUrl,
      remixIconCssUrl: settings.remixIconCssUrl,
      searchInputCssUrl: settings.searchInputCssUrl,
      featureHintsCssUrl: settings.featureHintsCssUrl,
      tooltipCssUrl: settings.tooltipCssUrl,
      cursorTooltipCssUrl: settings.cursorTooltipCssUrl,
      overlaySuggestionsCssUrl: settings.overlaySuggestionsCssUrl
    });
    const panel = createOverlayElement(doc, settings);
    panel.setAttribute('data-lumno-overlay-panel', 'true');
    panel._lumnoOverlayHost = host;
    panel._lumnoOverlayRoot = shadowRoot;
    host._lumnoOverlayPanel = panel;
    shadowRoot.appendChild(panel);
    return {
      host,
      panel,
      root: shadowRoot
    };
  }

  function findOverlayPanel(doc, options) {
    const settings = options && typeof options === 'object' ? options : {};
    const panelId = settings.id || '_x_extension_overlay_2024_unique_';
    const hostId = settings.hostId || '_x_extension_overlay_host_2026_unique_';
    const host = doc && typeof doc.getElementById === 'function'
      ? doc.getElementById(hostId)
      : null;
    if (host && host.shadowRoot) {
      return findById(host.shadowRoot, panelId) || host._lumnoOverlayPanel || host;
    }
    return doc && typeof doc.getElementById === 'function'
      ? doc.getElementById(panelId)
      : null;
  }

  return Object.freeze({
    appendOverlayStyleNodes,
    createOverlayElement,
    createOverlayMount,
    findOverlayPanel
  });
});
