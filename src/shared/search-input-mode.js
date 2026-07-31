(function(root) {
  if (root.LumnoSearchInputMode && typeof root.LumnoSearchInputMode.createInputModeController === 'function') {
    return;
  }

  const INPUT_FONT_STACK = "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const DEFAULT_ACCENT_RGB = [59, 130, 246];
  const DEFAULT_PREFIX_GAP = 8;
  const DEFAULT_PREFIX_TRANSITION = 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease';
  const MODE_MENU_LINE_ICON_PATHS = Object.freeze({
    bookmark: ['M18 7v14l-6-4l-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4'],
    browser: ['M4 8h16M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm4-2v4'],
    history: ['M12 8v4l2 2', 'M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5'],
    star: ['m12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z']
  });

  function getModeMenuLineIconPaths(iconName) {
    return Object.prototype.hasOwnProperty.call(
      MODE_MENU_LINE_ICON_PATHS,
      iconName
    ) ? MODE_MENU_LINE_ICON_PATHS[iconName] : null;
  }

  function noopTranslate(element) {
    return element;
  }

  function getDocument(options) {
    return options.document || root.document;
  }

  function getWindow(options) {
    return options.windowObj || root.window || root;
  }

  function priorityFor(useImportantStyles) {
    return useImportantStyles ? 'important' : '';
  }

  function declaration(property, value, useImportantStyles) {
    return `      ${property}: ${value}${useImportantStyles ? ' !important' : ''};`;
  }

  function cssText(pairs, useImportantStyles) {
    return `\n${pairs.map((pair) => declaration(pair[0], pair[1], useImportantStyles)).join('\n')}\n    `;
  }

  function setStyle(element, property, value, useImportantStyles) {
    if (!element || !element.style) {
      return;
    }
    element.style.setProperty(property, value, priorityFor(useImportantStyles));
  }

  function isElementVisible(element) {
    if (!element) {
      return false;
    }
    if (typeof element.getAttribute === 'function') {
      const visibleState = element.getAttribute('data-visible');
      if (visibleState === 'true') {
        return true;
      }
      if (visibleState === 'false') {
        return false;
      }
    }
    return Boolean(
      element.style &&
      element.style.getPropertyValue('display') !== 'none'
    );
  }

  function defaultRgbToCss(rgb) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  function defaultParseCssColor(color) {
    if (!color || typeof color !== 'string') {
      return null;
    }
    const trimmed = color.trim().toLowerCase();
    if (trimmed.startsWith('#')) {
      const hex = trimmed.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return [r, g, b].every((value) => Number.isFinite(value)) ? [r, g, b] : null;
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [r, g, b].every((value) => Number.isFinite(value)) ? [r, g, b] : null;
      }
      return null;
    }
    const rgbMatch = trimmed.match(/^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/);
    if (!rgbMatch) {
      return null;
    }
    const rgb = [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
    return rgb.every((value) => Number.isFinite(value)) ? rgb : null;
  }

  function mixRgb(source, target, targetWeight) {
    const weight = Math.min(1, Math.max(0, Number(targetWeight) || 0));
    return [0, 1, 2].map((index) => {
      const sourceValue = Number(source && source[index]);
      const targetValue = Number(target && target[index]);
      const from = Number.isFinite(sourceValue) ? sourceValue : DEFAULT_ACCENT_RGB[index];
      const to = Number.isFinite(targetValue) ? targetValue : from;
      return Math.round(from + ((to - from) * weight));
    });
  }

  function getRelativeLuminance(rgb) {
    const channels = [0, 1, 2].map((index) => {
      const value = Math.min(255, Math.max(0, Number(rgb && rgb[index]) || 0)) / 255;
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  }

  function getReadableTextColor(backgroundRgb) {
    const darkText = [17, 24, 39];
    const lightText = [248, 250, 252];
    const backgroundLuminance = getRelativeLuminance(backgroundRgb);
    const darkLuminance = getRelativeLuminance(darkText);
    const lightLuminance = getRelativeLuminance(lightText);
    const darkContrast = (Math.max(backgroundLuminance, darkLuminance) + 0.05) /
      (Math.min(backgroundLuminance, darkLuminance) + 0.05);
    const lightContrast = (Math.max(backgroundLuminance, lightLuminance) + 0.05) /
      (Math.min(backgroundLuminance, lightLuminance) + 0.05);
    return darkContrast >= lightContrast ? '#111827' : '#F8FAFC';
  }

  function createInputModeController(parts, options) {
    const config = options || {};
    const doc = getDocument(config);
    const win = getWindow(config);
    if (!doc || !parts || !parts.container || !parts.input) {
      throw new Error('createInputModeController requires input parts');
    }

    const input = parts.input;
    const container = parts.container;
    const surface = config.surface === 'overlay' ? 'overlay' : 'newtab';
    const useImportantStyles = Boolean(config.useImportantStyles);
    const applyNoTranslate = typeof config.applyNoTranslate === 'function'
      ? config.applyNoTranslate
      : noopTranslate;
    const setInputStyle = typeof config.setInputStyle === 'function'
      ? config.setInputStyle
      : (target, property, value) => setStyle(target, property, value, useImportantStyles);
    const formatMessage = typeof config.formatMessage === 'function'
      ? config.formatMessage
      : (key, fallback, values) => String(fallback || '').replace(/\{([^}]+)\}/g, (match, token) => {
        return values && Object.prototype.hasOwnProperty.call(values, token)
          ? String(values[token])
          : match;
      });
    const getThemeForMode = typeof config.getThemeForMode === 'function'
      ? config.getThemeForMode
      : (theme) => theme || config.defaultTheme || {};
    const getSiteSearchPrefixText = typeof config.getSiteSearchPrefixText === 'function'
      ? config.getSiteSearchPrefixText
      : (provider) => provider && (provider.name || provider.key) ? (provider.name || provider.key) : '';
    const getSiteSearchDisplayName = typeof config.getSiteSearchDisplayName === 'function'
      ? config.getSiteSearchDisplayName
      : getSiteSearchPrefixText;
    const getProviderIcon = typeof config.getProviderIcon === 'function'
      ? config.getProviderIcon
      : () => '';
    const getProviderThemeHost = typeof config.getProviderThemeHost === 'function'
      ? config.getProviderThemeHost
      : () => '';
    const getThemeForProvider = typeof config.getThemeForProvider === 'function'
      ? config.getThemeForProvider
      : null;
    const isAiSiteSearchProvider = typeof config.isAiSiteSearchProvider === 'function'
      ? config.isAiSiteSearchProvider
      : () => false;
    const attachFaviconData = typeof config.attachFaviconData === 'function'
      ? config.attachFaviconData
      : null;
    const attachProviderIcon = typeof config.attachProviderIcon === 'function'
      ? config.attachProviderIcon
      : null;
    const preferDirectProviderIcons = config.preferDirectProviderIcons === true;
    const isDarkMode = typeof config.isDarkMode === 'function'
      ? config.isDarkMode
      : () => false;
    const parseCssColor = typeof config.parseCssColor === 'function'
      ? config.parseCssColor
      : defaultParseCssColor;
    const rgbToCss = typeof config.rgbToCss === 'function'
      ? config.rgbToCss
      : defaultRgbToCss;
    const defaultTheme = config.defaultTheme || {};
    const menuSurface = root.LumnoMenuSurface || (
      typeof globalThis !== 'undefined' ? globalThis.LumnoMenuSurface : null
    ) || {};
    const menuSurfaceClass = menuSurface.className || '_x_extension_menu_surface_2024_unique_';
    const cursorTooltipApi = root.LumnoCursorTooltip || (
      typeof globalThis !== 'undefined' ? globalThis.LumnoCursorTooltip : null
    ) || {};
    const defaultAccentColor = Array.isArray(config.defaultAccentColor)
      ? config.defaultAccentColor
      : DEFAULT_ACCENT_RGB;
    const prefixGap = Number.isFinite(Number(config.prefixGap))
      ? Number(config.prefixGap)
      : DEFAULT_PREFIX_GAP;
    const rightReserveBase = Number.isFinite(Number(config.rightReserveBase))
      ? Number(config.rightReserveBase)
      : (surface === 'overlay' ? 92 : 64);
    const rightAnchorOffset = Number.isFinite(Number(config.rightAnchorOffset))
      ? Number(config.rightAnchorOffset)
      : (surface === 'overlay' ? 86 : 52);
    const configuredBaseInputPaddingLeft = Number.isFinite(Number(config.baseInputPaddingLeft))
      ? Number(config.baseInputPaddingLeft)
      : null;
    const prefixTransition = config.prefixTransition || DEFAULT_PREFIX_TRANSITION;
    const defaultPlaceholder = Object.prototype.hasOwnProperty.call(config, 'defaultPlaceholder')
      ? config.defaultPlaceholder
      : input.placeholder;
    const getDefaultPlaceholder = typeof config.getDefaultPlaceholder === 'function'
      ? config.getDefaultPlaceholder
      : () => defaultPlaceholder;
    const defaultCaretColor = Object.prototype.hasOwnProperty.call(config, 'defaultCaretColor')
      ? config.defaultCaretColor
      : (input.style.caretColor || 'var(--x-ext-input-caret, #7DB7FF)');
    const prefixId = config.prefixId || (surface === 'overlay'
      ? '_x_extension_site_search_prefix_2024_unique_'
      : '_x_extension_newtab_site_search_prefix_2024_unique_');
    const tabHintId = config.tabHintId || (surface === 'overlay'
      ? '_x_extension_site_search_tab_hint_2026_unique_'
      : '_x_extension_newtab_site_search_tab_hint_2026_unique_');
    const vars = surface === 'overlay'
      ? {
        tagBg: 'var(--x-ov-tag-bg, #F3F4F6)',
        tagText: 'var(--x-ov-tag-text, #6B7280)',
        panelBorder: 'var(--x-ov-border, rgba(0, 0, 0, 0.08))',
        panelBg: 'var(--x-ov-mode-menu-bg, #FFFFFF)',
        panelText: 'var(--x-ov-text, #111827)',
        panelShadow: 'var(--x-ov-shadow, 0 16px 40px rgba(15, 23, 42, 0.13))',
        panelRadius: 'var(--x-ov-panel-radius, 28px)',
        panelGap: '14px'
      }
      : {
        tagBg: 'var(--x-nt-tag-bg, #F3F4F6)',
        tagText: 'var(--x-nt-tag-text, #6B7280)',
        panelBorder: 'var(--x-nt-panel-border, rgba(0, 0, 0, 0.08))',
        panelBg: 'var(--x-nt-mode-menu-bg, #FFFFFF)',
        panelText: 'var(--x-nt-text, #111827)',
        panelShadow: 'var(--x-nt-panel-shadow-focus, 0 16px 40px rgba(15, 23, 42, 0.13))',
        panelRadius: 'var(--x-nt-search-shell-radius, 32px)',
        panelGap: '18px'
      };

    let baseInputPaddingLeft = null;
    let inputModePrefixAnimation = null;
    let inputModePrefixAnimationFrame = null;
    let inputModePrefixAnimationTimer = 0;
    let inputModePrefixContentRevision = 0;
    let layoutResizeObserver = null;
    let modeMenuOpen = false;
    let modeMenuPending = false;
    let modeMenuRequestId = 0;
    let destroyed = false;
    const providedModeMenuCursorTooltipController =
      config.modeMenuCursorTooltipController || config.modeMenuTooltipController || null;
    const modeMenuCursorTooltipController = providedModeMenuCursorTooltipController || (
      typeof cursorTooltipApi.createController === 'function'
        ? cursorTooltipApi.createController({
          documentObj: doc,
          windowObj: win,
          appendTo: doc && doc.body,
          id: `${prefixId}-label-cursor-tooltip`,
          maxWidth: 320,
          offsetX: 14,
          offsetY: 16
        })
        : null
    );
    const ownsModeMenuCursorTooltipController = Boolean(
      modeMenuCursorTooltipController && !providedModeMenuCursorTooltipController
    );

    const createSvgElement = (tagName) => typeof doc.createElementNS === 'function'
      ? doc.createElementNS('http://www.w3.org/2000/svg', tagName)
      : doc.createElement(tagName);
    const siteSearchPrefix = applyNoTranslate(parts.modePrefix);
    const siteSearchPrefixGlyph = parts.modePrefixGlyph || doc.createElement('i');
    const siteSearchPrefixLineIcon = createSvgElement('svg');
    const siteSearchPrefixIcon = parts.modePrefixIcon;
    const siteSearchPrefixText = applyNoTranslate(parts.modePrefixText);
    const siteSearchPrefixCurrent = applyNoTranslate(
      parts.modePrefixCurrent || doc.createElement('span')
    );
    const siteSearchPrefixChevron = parts.modePrefixChevron || doc.createElement('i');
    const modeMenuWasProvided = Boolean(parts.modeMenu);
    const modeMenu = applyNoTranslate(parts.modeMenu || doc.createElement('div'));
    const siteSearchTabHint = applyNoTranslate(parts.modeTabHint);
    const siteSearchTabHintKey = applyNoTranslate(parts.modeTabHintKey);
    const siteSearchTabHintText = applyNoTranslate(parts.modeTabHintText);
    if (!siteSearchPrefix || !siteSearchPrefixIcon || !siteSearchPrefixText ||
        !siteSearchTabHint || !siteSearchTabHintKey || !siteSearchTabHintText) {
      throw new Error('createInputModeController requires React input mode parts');
    }
    siteSearchPrefix.id = prefixId;
    siteSearchPrefix.className = 'x-lumno-search-input-mode__prefix';
    siteSearchPrefix.setAttribute('type', 'button');
    siteSearchPrefix.setAttribute('aria-haspopup', 'menu');
    siteSearchPrefix.setAttribute('aria-expanded', 'false');
    siteSearchPrefix.setAttribute('aria-controls', `${prefixId}-menu`);
    siteSearchPrefix.setAttribute('data-menu-open', 'false');
    if (!siteSearchPrefixGlyph.parentNode) {
      if (typeof siteSearchPrefix.insertBefore === 'function') {
        siteSearchPrefix.insertBefore(siteSearchPrefixGlyph, siteSearchPrefixText);
      } else {
        siteSearchPrefix.appendChild(siteSearchPrefixGlyph);
      }
    }
    siteSearchPrefixLineIcon.setAttribute('aria-hidden', 'true');
    siteSearchPrefixLineIcon.setAttribute('class', 'x-lumno-search-input-mode__prefix-line-icon');
    siteSearchPrefixLineIcon.setAttribute('data-search-input-mode-line-icon', '');
    siteSearchPrefixLineIcon.style.cssText = cssText([
      ['display', 'none'],
      ['width', '16px'],
      ['height', '16px'],
      ['flex', '0 0 16px']
    ], useImportantStyles);
    if (!siteSearchPrefixLineIcon.parentNode) {
      if (typeof siteSearchPrefix.insertBefore === 'function') {
        siteSearchPrefix.insertBefore(siteSearchPrefixLineIcon, siteSearchPrefixText);
      } else {
        siteSearchPrefix.appendChild(siteSearchPrefixLineIcon);
      }
    }
    if (!siteSearchPrefixChevron.parentNode) {
      siteSearchPrefix.appendChild(siteSearchPrefixChevron);
    }
    if (!siteSearchPrefixCurrent.parentNode) {
      if (typeof siteSearchPrefix.insertBefore === 'function') {
        siteSearchPrefix.insertBefore(siteSearchPrefixCurrent, siteSearchPrefixChevron);
      } else {
        siteSearchPrefix.appendChild(siteSearchPrefixCurrent);
      }
    }
    siteSearchPrefixCurrent.setAttribute('aria-hidden', 'true');
    siteSearchPrefixCurrent.setAttribute('data-search-input-mode-current', '');
    siteSearchPrefixGlyph.setAttribute('aria-hidden', 'true');
    siteSearchPrefixChevron.setAttribute('aria-hidden', 'true');
    siteSearchPrefixChevron.className = 'ri-icon ri-size-16 ri-arrow-down-s-line';
    siteSearchPrefix.style.cssText = cssText([
      ['all', 'unset'],
      ['position', 'absolute'],
      ['top', '50%'],
      ['transform', 'translateY(-50%)'],
      ['transform-origin', 'left center'],
      ['left', '50px'],
      ['display', 'none'],
      ['align-items', 'center'],
      ['justify-content', 'center'],
      ['gap', '6px'],
      ['max-width', 'min(220px, 48%)'],
      ['min-width', '0'],
      ['box-sizing', 'border-box'],
      ['height', '26px'],
      ['padding', '0 8px'],
      ['white-space', 'nowrap'],
      ['overflow', 'hidden'],
      ['text-overflow', 'ellipsis'],
      ['font-size', '13px'],
      ['font-family', INPUT_FONT_STACK],
      ['font-weight', '700'],
      ['line-height', '1'],
      ['letter-spacing', '0'],
      ['color', '#F8FAFC'],
      ['background', '#3B82F6'],
      ['border', '1px solid transparent'],
      ['border-radius', '9px'],
      ['box-shadow', '0 5px 14px rgba(15, 23, 42, 0.08)'],
      ['opacity', '1'],
      ['transition', prefixTransition],
      ['will-change', 'auto'],
      ['cursor', 'pointer'],
      ['pointer-events', 'auto'],
      ['z-index', '1'],
      ['user-select', 'none']
    ], useImportantStyles);
    modeMenu.id = `${prefixId}-menu`;
    modeMenu.className = `x-lumno-search-input-mode__menu ${menuSurfaceClass}`;
    if (typeof menuSurface.apply === 'function') {
      menuSurface.apply(modeMenu);
    }
    modeMenu.setAttribute('data-surface', surface);
    modeMenu.setAttribute('role', 'menu');
    modeMenu.setAttribute('aria-labelledby', prefixId);
    modeMenu.hidden = true;
    const modeMenuEdgeOffset = surface === 'newtab' ? '-6px' : '-1px';
    const modeMenuStyles = [
      ['position', 'absolute'],
      ['left', modeMenuEdgeOffset],
      ['right', modeMenuEdgeOffset],
      ['top', `calc(100% + ${vars.panelGap})`],
      ['width', 'auto'],
      ['max-height', 'min(360px, 62vh)'],
      ['overflow-x', 'hidden'],
      ['overflow-y', 'auto'],
      ['padding', '16px'],
      ['border', `1px solid ${vars.panelBorder}`],
      ['border-radius', vars.panelRadius],
      ['background', vars.panelBg],
      ['box-shadow', vars.panelShadow],
      ['box-sizing', 'border-box'],
      ['font-family', INPUT_FONT_STACK],
      ['font-size', '13px'],
      ['color', vars.panelText],
      ['z-index', '40'],
      ['--x-lumno-search-mode-menu-lift', '0px'],
      ['--x-extension-menu-surface-closed-transform', 'translateY(calc(var(--x-lumno-search-mode-menu-lift, 0px) - 6px)) scale(0.96, 0.86)'],
      ['--x-extension-menu-surface-open-transform', 'translateY(var(--x-lumno-search-mode-menu-lift, 0px)) scale(1, 1)'],
      ['overscroll-behavior', 'contain']
    ];
    modeMenu.style.cssText = '';
    modeMenuStyles.forEach((pair) => {
      setStyle(modeMenu, pair[0], pair[1], useImportantStyles);
    });
    if (!modeMenu.parentNode) {
      container.appendChild(modeMenu);
    }
    siteSearchTabHint.id = tabHintId;
    siteSearchTabHint.className = 'x-lumno-search-input-mode__tab-hint';
    siteSearchTabHint.setAttribute('aria-hidden', 'true');
    siteSearchTabHintKey.textContent = '';
    siteSearchTabHintText.textContent = '';
    siteSearchTabHint.style.cssText = cssText([
      ['all', 'unset'],
      ['position', 'absolute'],
      ['right', `${rightAnchorOffset}px`],
      ['top', '50%'],
      ['transform', 'translateY(-50%)'],
      ['display', 'none'],
      ['align-items', 'center'],
      ['justify-content', 'center'],
      ['gap', '7px'],
      ['max-width', 'min(300px, 52%)'],
      ['min-width', '0'],
      ['height', '28px'],
      ['padding', '0'],
      ['border', 'none'],
      ['background', 'transparent'],
      ['color', vars.tagText],
      ['box-sizing', 'border-box'],
      ['font-size', '13px'],
      ['font-family', INPUT_FONT_STACK],
      ['font-weight', '700'],
      ['line-height', '18px'],
      ['letter-spacing', '0'],
      ['white-space', 'nowrap'],
      ['pointer-events', 'none'],
      ['user-select', 'none'],
      ['z-index', '1']
    ], useImportantStyles);
    function shouldReduceInputModeMotion() {
      return Boolean(
        win &&
        typeof win.matchMedia === 'function' &&
        win.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function getBuiltInSurfaceColor() {
      return surface === 'overlay'
        ? 'var(--x-ov-text, #111827)'
        : 'var(--x-nt-text, #111827)';
    }

    function getInputModePrefixVisual(theme, visualOptions) {
      const lineIconName = visualOptions && visualOptions.menuIconName
        ? String(visualOptions.menuIconName).trim()
        : '';
      if (getModeMenuLineIconPaths(lineIconName)) {
        const surfaceColor = getBuiltInSurfaceColor();
        const isDark = Boolean(isDarkMode());
        return {
          accentColor: surfaceColor,
          background: `color-mix(in srgb, ${surfaceColor} ${isDark ? 14 : 9}%, transparent)`,
          border: `1px solid color-mix(in srgb, ${surfaceColor} ${isDark ? 28 : 18}%, transparent)`,
          shadow: `0 5px 14px rgba(15, 23, 42, ${isDark ? 0.2 : 0.075})`,
          color: surfaceColor,
          caretColor: surfaceColor
        };
      }
      const resolvedTheme = theme ? getThemeForMode(theme) : defaultTheme;
      const accentRgb = (resolvedTheme && (resolvedTheme.accentRgb || parseCssColor(resolvedTheme.accent))) ||
        defaultAccentColor;
      const isDark = Boolean(isDarkMode());
      const mutedAccentRgb = mixRgb(
        accentRgb,
        isDark ? [148, 163, 184] : [71, 85, 105],
        isDark ? 0.54 : 0.58
      );
      return {
        accentColor: rgbToCss(mutedAccentRgb),
        background: `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${isDark ? 0.14 : 0.075})`,
        border: `1px solid rgba(${mutedAccentRgb[0]}, ${mutedAccentRgb[1]}, ${mutedAccentRgb[2]}, ${isDark ? 0.28 : 0.18})`,
        shadow: `0 5px 14px rgba(15, 23, 42, ${isDark ? 0.2 : 0.075})`,
        color: isDark ? '#F8FAFC' : '#1E293B',
        caretColor: resolvedTheme && resolvedTheme.placeholderText
          ? resolvedTheme.placeholderText
          : rgbToCss(accentRgb)
      };
    }

    function applyInputModePrefixVisual(theme, visualOptions) {
      const visual = getInputModePrefixVisual(theme, visualOptions);
      setStyle(container, '--x-lumno-search-mode-accent', visual.accentColor, useImportantStyles);
      setStyle(container, '--x-lumno-search-mode-selected-bg', visual.background, useImportantStyles);
      setStyle(siteSearchPrefix, 'background', visual.background, useImportantStyles);
      setStyle(siteSearchPrefix, 'border', visual.border, useImportantStyles);
      setStyle(siteSearchPrefix, 'box-shadow', visual.shadow, useImportantStyles);
      setStyle(siteSearchPrefix, 'color', visual.color, useImportantStyles);
      setStyle(siteSearchPrefix, '--x-lumno-search-mode-accent', visual.accentColor, useImportantStyles);
      setStyle(siteSearchPrefixLineIcon, 'color', visual.accentColor, useImportantStyles);
      setStyle(siteSearchPrefixChevron, 'color', visual.accentColor, useImportantStyles);
      setStyle(siteSearchPrefixCurrent, 'color', visual.accentColor, useImportantStyles);
      return visual;
    }

    function updateInputRightPadding() {
      if (!input) {
        return;
      }
      let totalReserve = rightReserveBase;
      const badgeElement = getModeBadgeElement();
      if (isElementVisible(badgeElement)) {
        const badgeWidth = Math.ceil(badgeElement.getBoundingClientRect().width || 0);
        totalReserve = Math.max(totalReserve, rightAnchorOffset + badgeWidth + 12);
      }
      if (isElementVisible(siteSearchTabHint)) {
        const hintWidth = Math.ceil(siteSearchTabHint.getBoundingClientRect().width || 0);
        totalReserve = Math.max(totalReserve, rightAnchorOffset + hintWidth + 12);
      }
      setInputStyle(input, 'padding-right', `${totalReserve}px`);
    }

    function getModeBadgeElement() {
      return typeof config.getModeBadgeElement === 'function'
        ? config.getModeBadgeElement()
        : config.modeBadgeElement;
    }

    function getBaseInputPaddingLeft() {
      if (baseInputPaddingLeft === null) {
        const computed = parseFloat(win.getComputedStyle(input).paddingLeft);
        baseInputPaddingLeft = Number.isFinite(computed) && computed > 0
          ? computed
          : (configuredBaseInputPaddingLeft || 50);
      }
      return baseInputPaddingLeft;
    }

    function updatePrefixLayout() {
      const basePadding = getBaseInputPaddingLeft();
      setStyle(siteSearchPrefix, 'left', `${basePadding}px`, useImportantStyles);
      if (!isElementVisible(siteSearchPrefix)) {
        setInputStyle(input, 'padding-left', `${basePadding}px`);
        return;
      }
      const prefixWidth = Math.ceil(siteSearchPrefix.offsetWidth || siteSearchPrefix.getBoundingClientRect().width || 0);
      const paddedLeft = Math.max(basePadding + prefixWidth + prefixGap, basePadding);
      setInputStyle(input, 'padding-left', `${paddedLeft}px`);
    }

    function updateLayout() {
      if (destroyed) {
        return;
      }
      updateInputRightPadding();
      updatePrefixLayout();
    }

    function setInputModePrefixContent(prefixText, contentOptions) {
      const contentRevision = ++inputModePrefixContentRevision;
      const iconUrl = contentOptions && contentOptions.iconUrl ? String(contentOptions.iconUrl || '').trim() : '';
      const iconClass = contentOptions && contentOptions.iconClass
        ? String(contentOptions.iconClass).trim()
        : (contentOptions && contentOptions.isAi ? 'ri-search-ai-line' : 'ri-search-line');
      const lineIconName = contentOptions && contentOptions.menuIconName
        ? String(contentOptions.menuIconName).trim()
        : '';
      const hasBuiltInLineIcon = renderModeLineIconSvg(
        siteSearchPrefixLineIcon,
        lineIconName,
        '2'
      );
      if (hasBuiltInLineIcon) {
        setStyle(siteSearchPrefixLineIcon, 'display', 'inline-flex', useImportantStyles);
        setStyle(siteSearchPrefixGlyph, 'display', 'none', useImportantStyles);
        setStyle(siteSearchPrefixIcon, 'display', 'none', useImportantStyles);
        siteSearchPrefixIcon.removeAttribute('src');
      } else {
        setStyle(siteSearchPrefixLineIcon, 'display', 'none', useImportantStyles);
        siteSearchPrefixGlyph.className = `ri-icon ri-size-16 ${iconClass}`;
        setStyle(siteSearchPrefixGlyph, 'display', 'inline-flex', useImportantStyles);
        setStyle(siteSearchPrefixGlyph, 'flex', '0 0 auto', useImportantStyles);
      }
      if (!hasBuiltInLineIcon && iconUrl) {
        const icon = siteSearchPrefixIcon;
        icon.alt = '';
        icon.decoding = 'async';
        icon.referrerPolicy = 'no-referrer';
        icon.style.cssText = cssText([
          ['all', 'unset'],
          ['width', '15px'],
          ['height', '15px'],
          ['border-radius', '2px'],
          ['clip-path', 'inset(0 round 2px)'],
          ['overflow', 'hidden'],
          ['object-fit', 'contain'],
          ['flex', '0 0 auto'],
          ['display', 'block']
        ], useImportantStyles);
        setStyle(siteSearchPrefixGlyph, 'display', 'none', useImportantStyles);
        const removeUnavailableIcon = () => {
          if (contentRevision !== inputModePrefixContentRevision) {
            return;
          }
          removeProviderIconRuntimeFallbacks(siteSearchPrefix);
          setStyle(icon, 'display', 'none', useImportantStyles);
          icon.removeAttribute('src');
          setStyle(siteSearchPrefixGlyph, 'display', 'inline-flex', useImportantStyles);
          updatePrefixLayout();
        };
        const iconHost = contentOptions && contentOptions.iconHost ? String(contentOptions.iconHost || '').trim() : '';
        let handledByProviderIconRuntime = false;
        if (attachProviderIcon && !preferDirectProviderIcons) {
          try {
            handledByProviderIconRuntime = attachProviderIcon(icon, {
              iconHost,
              iconUrl,
              onIconUnavailable: removeUnavailableIcon,
              prefixText,
              provider: contentOptions && contentOptions.provider ? contentOptions.provider : null
            }) === true;
          } catch (e) {
            handledByProviderIconRuntime = false;
          }
        }
        if (!handledByProviderIconRuntime) {
          icon.addEventListener('error', removeUnavailableIcon, { once: true });
          icon.src = iconUrl;
          if (attachFaviconData && !iconUrl.startsWith('data:')) {
            attachFaviconData(icon, iconUrl, iconHost);
          }
        }
      } else if (!hasBuiltInLineIcon) {
        setStyle(siteSearchPrefixIcon, 'display', 'none', useImportantStyles);
        siteSearchPrefixIcon.removeAttribute('src');
      }
      const text = siteSearchPrefixText;
      text.textContent = prefixText;
      text.style.cssText = cssText([
        ['all', 'unset'],
        ['display', 'block'],
        ['min-width', '0'],
        ['overflow', 'hidden'],
        ['text-overflow', 'ellipsis'],
        ['white-space', 'nowrap'],
        ['line-height', '18px']
      ], useImportantStyles);
      siteSearchPrefixCurrent.textContent = formatMessage(
        'search_scope_current',
        '当前'
      );
      siteSearchPrefixCurrent.style.cssText = cssText([
        ['all', 'unset'],
        ['display', 'inline-flex'],
        ['align-items', 'center'],
        ['font-size', '10px'],
        ['font-weight', '600'],
        ['line-height', '18px'],
        ['letter-spacing', '0.04em'],
        ['white-space', 'nowrap'],
        ['overflow', 'visible'],
        ['flex', '0 0 auto']
      ], useImportantStyles);
      siteSearchPrefix.setAttribute(
        'data-mode-id',
        contentOptions && contentOptions.modeId ? String(contentOptions.modeId) : ''
      );
      siteSearchPrefix.setAttribute('aria-label', formatMessage(
        'search_scope_switcher_label',
        '搜索范围：{scope}。选择即可切换',
        { scope: prefixText }
      ));
      setStyle(siteSearchPrefixChevron, 'display', 'inline-flex', useImportantStyles);
      setStyle(siteSearchPrefixChevron, 'flex', '0 0 auto', useImportantStyles);
    }

    function cancelInputModePrefixAnimation() {
      if (inputModePrefixAnimation) {
        const animation = inputModePrefixAnimation;
        inputModePrefixAnimation = null;
        if (typeof animation.cancel === 'function') {
          animation.cancel();
        }
      }
      if (inputModePrefixAnimationFrame !== null && win && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(inputModePrefixAnimationFrame);
        inputModePrefixAnimationFrame = null;
      }
      if (inputModePrefixAnimationTimer && win && typeof win.clearTimeout === 'function') {
        win.clearTimeout(inputModePrefixAnimationTimer);
        inputModePrefixAnimationTimer = 0;
      }
      if (siteSearchPrefix && siteSearchPrefix.style) {
        if (typeof siteSearchPrefix.style.removeProperty === 'function') {
          siteSearchPrefix.style.removeProperty('width');
        } else {
          siteSearchPrefix.style.width = '';
        }
      }
    }

    function restoreInputModePrefixAnimatedState() {
      if (siteSearchPrefix && siteSearchPrefix.style) {
        if (typeof siteSearchPrefix.style.removeProperty === 'function') {
          siteSearchPrefix.style.removeProperty('width');
        } else {
          siteSearchPrefix.style.width = '';
        }
      }
      setStyle(siteSearchPrefix, 'opacity', '1', useImportantStyles);
      setStyle(siteSearchPrefix, 'transform', 'translateY(-50%) translateX(0) scale(1)', useImportantStyles);
      setStyle(siteSearchPrefix, 'transition', prefixTransition, useImportantStyles);
      setStyle(siteSearchPrefix, 'will-change', 'auto', useImportantStyles);
    }

    function setInputModePrefixRestState(restOptions) {
      cancelInputModePrefixAnimation();
      const transitionEnabled = !restOptions || restOptions.transition !== false;
      setStyle(siteSearchPrefix, 'opacity', '1', useImportantStyles);
      setStyle(siteSearchPrefix, 'transform', 'translateY(-50%) translateX(0) scale(1)', useImportantStyles);
      setStyle(siteSearchPrefix, 'transition', transitionEnabled ? prefixTransition : 'none', useImportantStyles);
      setStyle(siteSearchPrefix, 'will-change', 'auto', useImportantStyles);
    }

    function playInputModePrefixEnterAnimation() {
      cancelInputModePrefixAnimation();
      if (shouldReduceInputModeMotion()) {
        setInputModePrefixRestState();
        return;
      }
      const keyframes = [
        {
          opacity: 0.42,
          transform: 'translateY(-50%) translateX(0) scale(0.86)'
        },
        {
          offset: 0.72,
          opacity: 1,
          transform: 'translateY(-50%) translateX(0) scale(1.045)'
        },
        {
          opacity: 1,
          transform: 'translateY(-50%) translateX(0) scale(1)'
        }
      ];
      setStyle(siteSearchPrefix, 'will-change', 'transform, opacity', useImportantStyles);
      if (typeof siteSearchPrefix.animate === 'function') {
        const animation = siteSearchPrefix.animate(keyframes, {
          duration: 290,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });
        inputModePrefixAnimation = animation;
        animation.onfinish = () => {
          if (inputModePrefixAnimation !== animation) {
            return;
          }
          inputModePrefixAnimation = null;
          restoreInputModePrefixAnimatedState();
        };
        animation.oncancel = () => {
          if (inputModePrefixAnimation === animation) {
            inputModePrefixAnimation = null;
          }
        };
        return;
      }
      setStyle(siteSearchPrefix, 'transition', 'none', useImportantStyles);
      setStyle(siteSearchPrefix, 'opacity', '0', useImportantStyles);
      setStyle(siteSearchPrefix, 'transform', keyframes[0].transform, useImportantStyles);
      inputModePrefixAnimationFrame = win.requestAnimationFrame(() => {
        inputModePrefixAnimationFrame = win.requestAnimationFrame(() => {
          inputModePrefixAnimationFrame = null;
          setStyle(siteSearchPrefix, 'transition', prefixTransition, useImportantStyles);
          setStyle(siteSearchPrefix, 'opacity', '1', useImportantStyles);
          setStyle(siteSearchPrefix, 'transform', keyframes[2].transform, useImportantStyles);
          inputModePrefixAnimationTimer = win.setTimeout(() => {
            inputModePrefixAnimationTimer = 0;
            restoreInputModePrefixAnimatedState();
          }, 300);
        });
      });
    }

    function playInputModePrefixResizeAnimation(fromWidth, toWidth) {
      cancelInputModePrefixAnimation();
      const startWidth = Math.max(0, Number(fromWidth) || 0);
      const endWidth = Math.max(0, Number(toWidth) || 0);
      if (shouldReduceInputModeMotion() || startWidth <= 0 || endWidth <= 0 ||
          Math.abs(startWidth - endWidth) < 1 || endWidth > startWidth) {
        setInputModePrefixRestState();
        return;
      }
      const keyframes = [
        { width: `${startWidth}px` },
        { width: `${endWidth}px` }
      ];
      setStyle(siteSearchPrefix, 'will-change', 'width', useImportantStyles);
      if (typeof siteSearchPrefix.animate === 'function') {
        const animation = siteSearchPrefix.animate(keyframes, {
          duration: 220,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
        });
        inputModePrefixAnimation = animation;
        animation.onfinish = () => {
          if (inputModePrefixAnimation !== animation) {
            return;
          }
          inputModePrefixAnimation = null;
          restoreInputModePrefixAnimatedState();
        };
        animation.oncancel = () => {
          if (inputModePrefixAnimation === animation) {
            inputModePrefixAnimation = null;
          }
        };
        return;
      }
      setStyle(siteSearchPrefix, 'transition', 'none', useImportantStyles);
      setStyle(siteSearchPrefix, 'width', `${startWidth}px`, useImportantStyles);
      inputModePrefixAnimationFrame = win.requestAnimationFrame(() => {
        inputModePrefixAnimationFrame = null;
        setStyle(
          siteSearchPrefix,
          'transition',
          'width 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          useImportantStyles
        );
        setStyle(siteSearchPrefix, 'width', `${endWidth}px`, useImportantStyles);
        inputModePrefixAnimationTimer = win.setTimeout(() => {
          inputModePrefixAnimationTimer = 0;
          restoreInputModePrefixAnimatedState();
        }, 230);
      });
    }

    function setPrefixText(prefixText, theme, prefixOptions) {
      const nextOptions = prefixOptions || {};
      const shouldAnimate = Boolean(nextOptions.animate);
      const nextModeId = nextOptions.modeId ? String(nextOptions.modeId) : '';
      const previousModeId = String(siteSearchPrefix.getAttribute('data-mode-id') || '');
      const isSameMode = previousModeId === nextModeId;
      const isRepeatedMode = Boolean(previousModeId && isSameMode);
      const shouldAnimateResize = Boolean(
        shouldAnimate &&
        previousModeId &&
        !isSameMode &&
        isElementVisible(siteSearchPrefix)
      );
      if (shouldAnimateResize) {
        cancelInputModePrefixAnimation();
      }
      const previousWidth = shouldAnimateResize
        ? Number(siteSearchPrefix.getBoundingClientRect().width) || 0
        : 0;
      const shouldPreserveAnimation = !shouldAnimate && isSameMode && Boolean(
        inputModePrefixAnimation ||
        inputModePrefixAnimationFrame !== null ||
        inputModePrefixAnimationTimer
      );
      if (!shouldAnimate && !shouldPreserveAnimation) {
        setStyle(siteSearchPrefix, 'transition', 'none', useImportantStyles);
      }
      setInputModePrefixContent(prefixText, nextOptions);
      const visual = applyInputModePrefixVisual(theme, nextOptions);
      setStyle(siteSearchPrefix, 'display', 'inline-flex', useImportantStyles);
      const nextWidth = shouldAnimateResize
        ? Number(siteSearchPrefix.getBoundingClientRect().width) || 0
        : 0;
      if (!shouldAnimate && !shouldPreserveAnimation) {
        setInputModePrefixRestState({ transition: false });
      }
      input.placeholder = '';
      setInputStyle(input, 'caret-color', visual.caretColor);
      updatePrefixLayout();
      if (shouldAnimate && !isRepeatedMode) {
        if (shouldAnimateResize) {
          playInputModePrefixResizeAnimation(previousWidth, nextWidth);
        } else {
          playInputModePrefixEnterAnimation();
        }
      }
    }

    function setProviderPrefix(provider, theme, providerOptions) {
      const isAi = isAiSiteSearchProvider(provider);
      const nextOptions = {
        ...(providerOptions || {}),
        iconUrl: getProviderIcon(provider),
        iconHost: getProviderThemeHost(provider),
        iconClass: isAi ? 'ri-search-ai-line' : 'ri-global-line',
        modeId: `provider:${provider && (provider.key || provider.name) ? (provider.key || provider.name) : ''}`,
        provider,
        isAi
      };
      setPrefixText(getSiteSearchPrefixText(provider), theme, nextOptions);
    }

    function clearProviderPrefix() {
      inputModePrefixContentRevision += 1;
      siteSearchPrefixText.textContent = '';
      setStyle(siteSearchPrefixIcon, 'display', 'none', useImportantStyles);
      siteSearchPrefixIcon.removeAttribute('src');
      setStyle(siteSearchPrefixGlyph, 'display', 'none', useImportantStyles);
      setStyle(siteSearchPrefixLineIcon, 'display', 'none', useImportantStyles);
      setStyle(siteSearchPrefixChevron, 'display', 'none', useImportantStyles);
      setInputModePrefixRestState({ transition: false });
      setStyle(siteSearchPrefix, 'display', 'none', useImportantStyles);
      closeModeMenu(false);
      input.placeholder = getDefaultPlaceholder();
      setInputStyle(input, 'caret-color', defaultCaretColor);
      updatePrefixLayout();
    }

    function removeProviderIconRuntimeFallbacks(parent) {
      if (!parent || typeof parent.querySelectorAll !== 'function') {
        return;
      }
      parent.querySelectorAll(
        '._x_extension_favicon_fallback_2024_unique_, ' +
        '._x_extension_overlay_favicon_fallback_2026_unique_, ' +
        '.x-nt-favicon-fallback, ' +
        '.x-ov-suggestion-favicon-fallback'
      ).forEach((node) => node.remove());
    }

    function renderTabHint(provider) {
      const site = getSiteSearchDisplayName(provider);
      const explicitLabel = provider && provider.tabHintLabel
        ? String(provider.tabHintLabel).trim()
        : '';
      const label = explicitLabel ||
        formatMessage('site_search_tab_hint', '使用 {site} 搜索', { site });
      const keyLabel = siteSearchTabHintKey;
      keyLabel.textContent = 'Tab';
      keyLabel.style.cssText = cssText([
        ['all', 'unset'],
        ['display', 'inline-flex'],
        ['align-items', 'center'],
        ['justify-content', 'center'],
        ['min-width', '32px'],
        ['height', '22px'],
        ['padding', '0 6px'],
        ['border-radius', '7px'],
        ['border', `1px solid ${vars.panelBorder}`],
        ['background', vars.tagBg],
        ['color', vars.tagText],
        ['box-sizing', 'border-box'],
        ['font-size', '11px'],
        ['font-family', 'inherit'],
        ['font-weight', '700'],
        ['line-height', '14px'],
        ['letter-spacing', '0'],
        ['white-space', 'nowrap'],
        ['flex', '0 0 auto']
      ], useImportantStyles);
      const textLabel = siteSearchTabHintText;
      textLabel.textContent = label;
      textLabel.style.cssText = cssText([
        ['all', 'unset'],
        ['display', 'inline-block'],
        ['min-width', '0'],
        ['max-width', '220px'],
        ['overflow', 'hidden'],
        ['text-overflow', 'ellipsis'],
        ['white-space', 'nowrap'],
        ['color', vars.tagText],
        ['font-size', '13px'],
        ['font-family', 'inherit'],
        ['font-weight', '400'],
        ['line-height', '18px'],
        ['letter-spacing', '0'],
        ['flex', '1 1 auto']
      ], useImportantStyles);
      if (provider) {
        siteSearchTabHint.setAttribute('title', label);
      } else {
        siteSearchTabHint.removeAttribute('title');
      }
    }

    function setTabHintVisible(visible, provider) {
      if (!visible) {
        setStyle(siteSearchTabHint, 'display', 'none', useImportantStyles);
        siteSearchTabHint.removeAttribute('title');
        updateInputRightPadding();
        return;
      }
      if (typeof config.isTabHintSuppressed === 'function' && config.isTabHintSuppressed()) {
        return;
      }
      renderTabHint(provider);
      setStyle(siteSearchTabHint, 'display', 'inline-flex', useImportantStyles);
      updateInputRightPadding();
    }

    function clearModeMenuContents() {
      if (modeMenuCursorTooltipController &&
          typeof modeMenuCursorTooltipController.hide === 'function') {
        modeMenuCursorTooltipController.hide();
      }
      while (modeMenu.firstChild) {
        modeMenu.removeChild(modeMenu.firstChild);
      }
    }

    function applyModeMenuIconTheme(wrap, theme) {
      if (!wrap) {
        return;
      }
      const resolvedTheme = theme ? getThemeForMode(theme) : defaultTheme;
      const accentRgb = resolvedTheme && (
        resolvedTheme.accentRgb || parseCssColor(resolvedTheme.accent)
      ) || defaultAccentColor;
      const backgroundRgb = mixRgb(
        accentRgb,
        isDarkMode() ? [22, 22, 22] : [255, 255, 255],
        isDarkMode() ? 0.72 : 0.82
      );
      setStyle(
        wrap,
        '--x-lumno-search-mode-icon-bg',
        rgbToCss(backgroundRgb),
        useImportantStyles
      );
      setStyle(
        wrap,
        '--x-lumno-search-mode-icon-color',
        getReadableTextColor(backgroundRgb),
        useImportantStyles
      );
    }

    function applyModeMenuBuiltInIconTheme(wrap) {
      const surfaceColor = getBuiltInSurfaceColor();
      setStyle(
        wrap,
        '--x-lumno-search-mode-icon-bg',
        `color-mix(in srgb, ${surfaceColor} ${isDarkMode() ? 14 : 9}%, transparent)`,
        useImportantStyles
      );
      setStyle(
        wrap,
        '--x-lumno-search-mode-icon-color',
        surfaceColor,
        useImportantStyles
      );
    }

    function renderModeLineIconSvg(svg, lineIconName, strokeWidth) {
      const lineIconPaths = getModeMenuLineIconPaths(lineIconName);
      if (!svg || !lineIconPaths) {
        return false;
      }
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      svg.setAttribute('data-icon-name', lineIconName);
      svg.setAttribute('fill', 'none');
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('stroke-width', strokeWidth || '1.65');
      svg.setAttribute('viewBox', '0 0 24 24');
      lineIconPaths.forEach((pathData) => {
        const path = createSvgElement('path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
      });
      return true;
    }

    function createModeMenuGlyph(item) {
      const lineIconName = item.menuIconName ? String(item.menuIconName).trim() : '';
      const svg = createSvgElement('svg');
      if (renderModeLineIconSvg(svg, lineIconName, '1.65')) {
        svg.classList.add('x-lumno-search-input-mode__menu-line-icon');
        return svg;
      }
      const glyph = doc.createElement('i');
      glyph.className = `ri-icon ri-size-24 ${item.iconClass || (item.isAi ? 'ri-search-ai-line' : 'ri-search-line')}`;
      return glyph;
    }

    function setModeMenuGlyphHidden(glyph, hidden) {
      if (hidden) {
        glyph.setAttribute('hidden', '');
        return;
      }
      glyph.removeAttribute('hidden');
    }

    function createModeMenuIcon(item) {
      const lineIconName = item.menuIconName ? String(item.menuIconName).trim() : '';
      const isBuiltInLineIcon = Boolean(getModeMenuLineIconPaths(lineIconName));
      const wrap = doc.createElement('span');
      wrap.className = 'x-lumno-search-input-mode__menu-icon';
      wrap.setAttribute('aria-hidden', 'true');
      wrap.setAttribute('data-icon-state', 'fallback');
      if (isBuiltInLineIcon) {
        wrap.setAttribute('data-icon-kind', 'builtin');
      }
      const faviconMask = doc.createElement('span');
      faviconMask.className = 'x-lumno-search-input-mode__menu-favicon-mask';
      const glyph = createModeMenuGlyph(item);
      faviconMask.appendChild(glyph);
      wrap.appendChild(faviconMask);
      if (isBuiltInLineIcon) {
        applyModeMenuBuiltInIconTheme(wrap);
      } else {
        applyModeMenuIconTheme(wrap, item.theme || defaultTheme);
      }
      if (item.provider && getThemeForProvider) {
        Promise.resolve(getThemeForProvider(item.provider)).then((theme) => {
          if (!destroyed && wrap.isConnected && theme) {
            applyModeMenuIconTheme(wrap, theme);
          }
        }).catch(() => {});
      }
      const iconUrl = item.iconUrl ? String(item.iconUrl).trim() : '';
      if (iconUrl) {
        const image = doc.createElement('img');
        image.alt = '';
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
        const showFallback = () => {
          wrap.setAttribute('data-icon-state', 'fallback');
          removeProviderIconRuntimeFallbacks(wrap);
          image.remove();
          setModeMenuGlyphHidden(glyph, false);
        };
        image.addEventListener('load', () => {
          wrap.setAttribute('data-icon-state', 'resolved');
          removeProviderIconRuntimeFallbacks(wrap);
          setModeMenuGlyphHidden(glyph, true);
        }, { once: true });
        faviconMask.appendChild(image);
        const provider = item.provider || null;
        const iconHost = provider ? String(getProviderThemeHost(provider) || '').trim() : '';
        let handledByProviderIconRuntime = false;
        if (attachProviderIcon && provider && !preferDirectProviderIcons) {
          try {
            handledByProviderIconRuntime = attachProviderIcon(image, {
              iconHost,
              iconUrl,
              onIconUnavailable: showFallback,
              prefixText: String(item.label || ''),
              provider
            }) === true;
          } catch (e) {
            handledByProviderIconRuntime = false;
          }
        }
        if (!handledByProviderIconRuntime) {
          image.addEventListener('error', showFallback, { once: true });
          image.src = iconUrl;
          if (attachFaviconData && !iconUrl.startsWith('data:')) {
            attachFaviconData(image, iconUrl, iconHost);
          }
        }
      }
      return wrap;
    }

    function createModeMenuLabel(labelText) {
      const text = String(labelText || '');
      const label = doc.createElement('span');
      label.className = 'x-lumno-search-input-mode__menu-label';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = text;
      return label;
    }

    function bindModeMenuLabelTooltip(button, label, labelText) {
      if (!modeMenuCursorTooltipController ||
          typeof modeMenuCursorTooltipController.bind !== 'function') {
        return;
      }
      const updateTruncatedState = () => {
        const isTruncated = typeof cursorTooltipApi.isElementTextTruncated === 'function'
          ? cursorTooltipApi.isElementTextTruncated(label)
          : Number(label.clientWidth) > 0 &&
            Number(label.scrollWidth) > Number(label.clientWidth);
        button.setAttribute('data-label-truncated', isTruncated ? 'true' : 'false');
        return isTruncated;
      };
      modeMenuCursorTooltipController.bind(button, () => String(labelText || ''), {
        maxWidth: 320,
        shouldShow: updateTruncatedState,
        deferHideVisibility: true,
        preserveVisibleOnTargetSwitch: true,
        handoffRoot: modeMenu
      });
    }

    function getModeMenuButtons() {
      return Array.from(modeMenu.querySelectorAll('[role="menuitemradio"]'));
    }

    function focusModeMenuButton(index) {
      const buttons = getModeMenuButtons();
      if (buttons.length === 0) {
        return;
      }
      const normalizedIndex = ((index % buttons.length) + buttons.length) % buttons.length;
      buttons.forEach((button, buttonIndex) => {
        button.tabIndex = buttonIndex === normalizedIndex ? 0 : -1;
      });
      buttons[normalizedIndex].focus({ preventScroll: true });
    }

    function syncModeMenuSelection(modeId) {
      const selectedModeId = String(modeId || '');
      let matched = false;
      getModeMenuButtons().forEach((button) => {
        const isSelected = Boolean(
          selectedModeId && String(button.dataset.modeId || '') === selectedModeId
        );
        button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        matched = matched || isSelected;
      });
      return matched;
    }

    function selectModeMenuItem(item) {
      let result = null;
      if (typeof config.onModeMenuSelect === 'function') {
        result = config.onModeMenuSelect(item);
      }
      const syncSelectedMode = () => {
        if (!destroyed && modeMenuOpen && !modeMenu.hidden) {
          const selectedModeId = item && item.id ? String(item.id) : '';
          if (!syncModeMenuSelection(selectedModeId)) {
            refreshModeMenu(selectedModeId);
          }
        }
      };
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).then(syncSelectedMode, syncSelectedMode);
        return;
      }
      syncSelectedMode();
    }

    function renderModeMenu(items) {
      clearModeMenuContents();
      const normalizedItems = Array.isArray(items)
        ? items.filter((item) => item && item.id && item.label)
        : [];
      let previousGroup = '';
      normalizedItems.forEach((item) => {
        const group = item.group ? String(item.group) : '';
        if (group && group !== previousGroup) {
          const groupLabel = doc.createElement('div');
          groupLabel.className = 'x-lumno-search-input-mode__menu-group';
          groupLabel.setAttribute('aria-hidden', 'true');
          groupLabel.setAttribute('role', 'presentation');
          groupLabel.textContent = group;
          modeMenu.appendChild(groupLabel);
          previousGroup = group;
        }
        const button = doc.createElement('button');
        button.className = 'x-lumno-search-input-mode__menu-item';
        button.type = 'button';
        button.tabIndex = -1;
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', item.active ? 'true' : 'false');
        button.setAttribute('aria-label', String(item.label));
        button.setAttribute('data-label-truncated', 'false');
        button.dataset.modeId = String(item.id);
        button.appendChild(createModeMenuIcon(item));
        const label = createModeMenuLabel(item.label);
        button.appendChild(label);
        bindModeMenuLabelTooltip(button, label, item.label);
        const check = doc.createElement('i');
        check.className = 'x-lumno-search-input-mode__menu-check ri-icon ri-size-16 ri-check-line';
        check.setAttribute('aria-hidden', 'true');
        button.appendChild(check);
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectModeMenuItem(item);
        });
        modeMenu.appendChild(button);
      });
      return normalizedItems;
    }

    function syncModeMenuQueryLift() {
      const hasQuery = Boolean(String(input.value || '').trim());
      modeMenu.setAttribute('data-has-query', hasQuery ? 'true' : 'false');
      setStyle(
        modeMenu,
        '--x-lumno-search-mode-menu-lift',
        hasQuery ? '-8px' : '0px',
        useImportantStyles
      );
    }

    function requestModeMenuFrame(callback) {
      if (win && typeof win.requestAnimationFrame === 'function') {
        return win.requestAnimationFrame(callback);
      }
      if (win && typeof win.setTimeout === 'function') {
        return win.setTimeout(callback, 0);
      }
      callback();
      return 0;
    }

    function revealModeMenuSurface() {
      const guardedFrame = (callback) => requestModeMenuFrame(() => {
        if (modeMenuOpen && !modeMenu.hidden) {
          callback();
        }
      });
      if (typeof menuSurface.open === 'function') {
        menuSurface.open(modeMenu, { requestAnimationFrame: guardedFrame });
        return;
      }
      modeMenu.setAttribute('data-open', 'false');
      guardedFrame(() => modeMenu.setAttribute('data-open', 'true'));
    }

    function concealModeMenuSurface() {
      if (typeof menuSurface.close === 'function') {
        menuSurface.close(modeMenu);
        return;
      }
      modeMenu.setAttribute('data-open', 'false');
    }

    function openModeMenu(focusTarget) {
      if (destroyed || typeof config.getModeMenuItems !== 'function') {
        return false;
      }
      const requestId = ++modeMenuRequestId;
      modeMenuPending = true;
      const finishOpen = (items) => {
        if (destroyed || requestId !== modeMenuRequestId) {
          return false;
        }
        modeMenuPending = false;
        const normalizedItems = renderModeMenu(items);
        if (normalizedItems.length === 0) {
          return false;
        }
        modeMenuOpen = true;
        syncModeMenuQueryLift();
        modeMenu.hidden = false;
        revealModeMenuSurface();
        container.setAttribute('data-mode-menu-open', 'true');
        siteSearchPrefix.setAttribute('aria-expanded', 'true');
        setStyle(siteSearchPrefix, 'z-index', '41', useImportantStyles);
        siteSearchPrefix.setAttribute('data-menu-open', 'true');
        const activeIndex = normalizedItems.findIndex((item) => item.active);
        const targetIndex = focusTarget === 'last'
          ? normalizedItems.length - 1
          : (activeIndex >= 0 ? activeIndex : 0);
        if (focusTarget !== 'none') {
          focusModeMenuButton(targetIndex);
        }
        return true;
      };
      const items = config.getModeMenuItems();
      if (items && typeof items.then === 'function') {
        modeMenu.setAttribute('aria-busy', 'true');
        return items.then((resolvedItems) => {
          if (requestId !== modeMenuRequestId) {
            return false;
          }
          modeMenu.removeAttribute('aria-busy');
          return finishOpen(resolvedItems);
        }, () => {
          if (requestId === modeMenuRequestId) {
            modeMenuPending = false;
            modeMenu.removeAttribute('aria-busy');
          }
          return false;
        });
      }
      return finishOpen(items);
    }

    function refreshModeMenu(preferredModeId) {
      if (destroyed || !modeMenuOpen || modeMenu.hidden ||
          typeof config.getModeMenuItems !== 'function') {
        return false;
      }
      const focusRoot = typeof modeMenu.getRootNode === 'function'
        ? modeMenu.getRootNode()
        : doc;
      const activeElement = focusRoot && focusRoot.activeElement
        ? focusRoot.activeElement
        : doc.activeElement;
      const focusedButton = activeElement &&
        typeof activeElement.getAttribute === 'function' &&
        activeElement.getAttribute('role') === 'menuitemradio'
        ? activeElement
        : null;
      const focusedModeId = preferredModeId
        ? String(preferredModeId)
        : (focusedButton ? String(focusedButton.dataset.modeId || '') : '');
      const requestId = ++modeMenuRequestId;
      modeMenuPending = true;
      const finishRefresh = (items) => {
        if (destroyed || requestId !== modeMenuRequestId || !modeMenuOpen || modeMenu.hidden) {
          return false;
        }
        modeMenuPending = false;
        modeMenu.removeAttribute('aria-busy');
        const normalizedItems = renderModeMenu(items);
        syncModeMenuQueryLift();
        if (normalizedItems.length === 0) {
          closeModeMenu(false);
          return false;
        }
        if (focusedModeId) {
          const buttons = getModeMenuButtons();
          const nextFocusedIndex = buttons.findIndex((button) => (
            String(button.dataset.modeId || '') === focusedModeId
          ));
          if (nextFocusedIndex >= 0) {
            focusModeMenuButton(nextFocusedIndex);
          }
        }
        return true;
      };
      const items = config.getModeMenuItems();
      if (items && typeof items.then === 'function') {
        modeMenu.setAttribute('aria-busy', 'true');
        return items.then(finishRefresh, () => {
          if (requestId === modeMenuRequestId) {
            modeMenuPending = false;
            modeMenu.removeAttribute('aria-busy');
          }
          return false;
        });
      }
      return finishRefresh(items);
    }

    function closeModeMenu(restoreFocus) {
      if (!modeMenuOpen && !modeMenuPending && modeMenu.hidden) {
        return false;
      }
      modeMenuRequestId += 1;
      modeMenuPending = false;
      modeMenu.removeAttribute('aria-busy');
      if (modeMenuCursorTooltipController &&
          typeof modeMenuCursorTooltipController.hide === 'function') {
        modeMenuCursorTooltipController.hide();
      }
      modeMenuOpen = false;
      concealModeMenuSurface();
      modeMenu.hidden = true;
      container.removeAttribute('data-mode-menu-open');
      siteSearchPrefix.setAttribute('aria-expanded', 'false');
      setStyle(siteSearchPrefix, 'z-index', '1', useImportantStyles);
      siteSearchPrefix.setAttribute('data-menu-open', 'false');
      if (restoreFocus && typeof siteSearchPrefix.focus === 'function') {
        siteSearchPrefix.focus({ preventScroll: true });
      }
      return true;
    }

    function handlePrefixClick(event) {
      event.preventDefault();
      event.stopPropagation();
      if (modeMenuOpen || modeMenuPending) {
        closeModeMenu(true);
      } else {
        openModeMenu('none');
      }
    }

    function handlePrefixKeydown(event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openModeMenu(event.key === 'ArrowUp' ? 'last' : 'active');
      } else if (event.key === 'Escape' && modeMenuOpen) {
        event.preventDefault();
        closeModeMenu(true);
      }
    }

    function handleMenuKeydown(event) {
      const buttons = getModeMenuButtons();
      const currentIndex = buttons.indexOf(doc.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModeMenu(true);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight' ||
          event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        focusModeMenuButton(currentIndex + (
          event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
        ));
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        focusModeMenuButton(event.key === 'Home' ? 0 : buttons.length - 1);
      } else if (event.key === 'Tab') {
        closeModeMenu(false);
      }
    }

    function handleDocumentPointerDown(event) {
      const eventPath = event && typeof event.composedPath === 'function'
        ? event.composedPath()
        : [];
      const isInsideModeContainer = container.contains(event.target) ||
        eventPath.includes(container) ||
        eventPath.includes(modeMenu) ||
        eventPath.includes(siteSearchPrefix);
      if (!modeMenuOpen || isInsideModeContainer) {
        return;
      }
      closeModeMenu(false);
    }

    siteSearchPrefix.addEventListener('click', handlePrefixClick);
    siteSearchPrefix.addEventListener('keydown', handlePrefixKeydown);
    input.addEventListener('input', syncModeMenuQueryLift);
    modeMenu.addEventListener('keydown', handleMenuKeydown);
    if (doc && typeof doc.addEventListener === 'function') {
      doc.addEventListener('pointerdown', handleDocumentPointerDown, true);
    }

    function onResize() {
      updateLayout();
    }

    if (win && typeof win.ResizeObserver === 'function') {
      layoutResizeObserver = new win.ResizeObserver(updateLayout);
      layoutResizeObserver.observe(siteSearchPrefix);
      layoutResizeObserver.observe(siteSearchTabHint);
      const badgeElement = getModeBadgeElement();
      if (badgeElement) {
        layoutResizeObserver.observe(badgeElement);
      }
    }

    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('resize', onResize);
    }

    function destroy() {
      destroyed = true;
      modeMenuRequestId += 1;
      modeMenuPending = false;
      cancelInputModePrefixAnimation();
      if (win && typeof win.removeEventListener === 'function') {
        win.removeEventListener('resize', onResize);
      }
      if (layoutResizeObserver) {
        layoutResizeObserver.disconnect();
        layoutResizeObserver = null;
      }
      if (typeof siteSearchPrefix.removeEventListener === 'function') {
        siteSearchPrefix.removeEventListener('click', handlePrefixClick);
        siteSearchPrefix.removeEventListener('keydown', handlePrefixKeydown);
      }
      if (typeof modeMenu.removeEventListener === 'function') {
        modeMenu.removeEventListener('keydown', handleMenuKeydown);
      }
      if (typeof input.removeEventListener === 'function') {
        input.removeEventListener('input', syncModeMenuQueryLift);
      }
      if (doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      }
      clearProviderPrefix();
      setTabHintVisible(false);
      if (ownsModeMenuCursorTooltipController &&
          typeof modeMenuCursorTooltipController.destroy === 'function') {
        modeMenuCursorTooltipController.destroy();
      } else if (modeMenuCursorTooltipController &&
          typeof modeMenuCursorTooltipController.hide === 'function') {
        modeMenuCursorTooltipController.hide();
      }
      if (!modeMenuWasProvided) {
        modeMenu.remove();
      }
    }

    return Object.freeze({
      prefixElement: siteSearchPrefix,
      tabHintElement: siteSearchTabHint,
      setProviderPrefix,
      setPrefixText,
      clearProviderPrefix,
      closeModeMenu,
      menuElement: modeMenu,
      openModeMenu,
      refreshModeMenu,
      setTabHintVisible,
      updateLayout,
      destroy
    });
  }

  root.LumnoSearchInputMode = Object.freeze({
    createInputModeController
  });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
