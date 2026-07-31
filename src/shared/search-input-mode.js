(function(root) {
  const SEARCH_INPUT_MODE_RUNTIME_VERSION = '2026-07-31-scope-filter-v9';
  if (root.LumnoSearchInputMode &&
      root.LumnoSearchInputMode.runtimeVersion === SEARCH_INPUT_MODE_RUNTIME_VERSION &&
      typeof root.LumnoSearchInputMode.createInputModeController === 'function') {
    return;
  }

  const INPUT_FONT_STACK = "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const DEFAULT_ACCENT_RGB = [59, 130, 246];
  const DEFAULT_PREFIX_GAP = 8;
  const DEFAULT_MODE_MENU_DOUBLE_TAB_DURATION = 700;
  const DEFAULT_MODE_TAG_REMOVAL_CONFIRMATION_DURATION = 2200;
  const DEFAULT_MODE_MENU_VIEWPORT_BOTTOM_INSET = 24;
  const DEFAULT_PREFIX_ICON_FADE_DURATION = 100;
  const DEFAULT_PREFIX_RESIZE_DURATION = 160;
  const DEFAULT_PREFIX_RESIZE_EASING = 'linear';
  const DEFAULT_PREFIX_TRANSITION = 'background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease';
  const MODE_MENU_LINE_ICON_PATHS = Object.freeze({
    bookmark: ['M18 7v14l-6-4l-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4'],
    browser: ['M4 8h16M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm4-2v4'],
    history: ['M12 8v4l2 2', 'M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5'],
    star: ['m12 17.75l-6.172 3.245l1.179-6.873l-5-4.867l6.9-1l3.086-6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z']
  });
  const MODE_MENU_PINYIN_FALLBACKS = Object.freeze({
    书: 'shu',
    信: 'xin',
    元: 'yuan',
    众: 'zhong',
    包: 'bao',
    千: 'qian',
    历: 'li',
    号: 'hao',
    天: 'tian',
    常: 'chang',
    已: 'yi',
    开: 'kai',
    微: 'wei',
    打: 'da',
    搜: 'sou',
    掘: 'jue',
    标: 'biao',
    淘: 'tao',
    猫: 'mao',
    用: 'yong',
    百: 'bai',
    知: 'zhi',
    签: 'qian',
    索: 'suo',
    维: 'wei',
    翻: 'fan',
    豆: 'dou',
    金: 'jin',
    问: 'wen',
    页: 'ye',
    度: 'du',
    乎: 'hu',
    瓣: 'ban',
    公: 'gong',
    基: 'ji',
    科: 'ke',
    史: 'shi'
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
    const shortcutDisplayApi = root.LumnoShortcutDisplay || (
      typeof globalThis !== 'undefined' ? globalThis.LumnoShortcutDisplay : null
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
    let inputModePrefixIconAnimation = null;
    let inputModePrefixIconAnimationElement = null;
    let inputModePrefixPendingText = '';
    let layoutResizeObserver = null;
    let modeMenuOpen = false;
    let modeMenuPending = false;
    let modeMenuRequestId = 0;
    let modeMenuFilterQuery = '';
    let renderedModeMenuEntries = [];
    let renderedModeMenuGroups = [];
    let modeMenuEmptyState = null;
    let modeMenuDoubleTabPending = false;
    let modeMenuDoubleTabTimer = 0;
    let modeTagRemovalConfirmationPending = false;
    let modeTagRemovalConfirmationTimer = 0;
    let destroyed = false;

    function getModeMenuPlaceholder() {
      return formatMessage(
        'search_scope_panel_placeholder',
        'Search specific site content...'
      );
    }

    function getModeActivePlaceholder() {
      return formatMessage(
        'search_scope_active_placeholder',
        'Search within this scope; press Tab again to open the scope panel...'
      );
    }

    function hasVisibleModePrefix() {
      return siteSearchPrefix.style.getPropertyValue('display') !== 'none';
    }

    function syncInputPlaceholder() {
      if (modeMenuOpen && !modeMenu.hidden) {
        input.placeholder = getModeMenuPlaceholder();
        return;
      }
      input.placeholder = hasVisibleModePrefix()
        ? getModeActivePlaceholder()
        : getDefaultPlaceholder();
    }

    function getModeMenuPinyinApi() {
      return root.pinyinPro || (
        typeof globalThis !== 'undefined' ? globalThis.pinyinPro : null
      );
    }
    function ensureModeMenuPinyinRuntime() {
      const existingApi = getModeMenuPinyinApi();
      if (existingApi && typeof existingApi.pinyin === 'function') {
        return null;
      }
      if (typeof config.loadPinyinRuntime === 'function') {
        return Promise.resolve(config.loadPinyinRuntime()).catch(() => null);
      }
      const chromeApi = root.chrome || (
        typeof globalThis !== 'undefined' ? globalThis.chrome : null
      );
      if (!chromeApi || !chromeApi.runtime ||
          typeof chromeApi.runtime.getURL !== 'function') {
        return null;
      }
      try {
        return import(chromeApi.runtime.getURL('assets/vendor/pinyin-pro.js'))
          .then(() => getModeMenuPinyinApi())
          .catch(() => null);
      } catch (error) {
        return null;
      }
    }
    const modeMenuPinyinRuntimeReady = ensureModeMenuPinyinRuntime();
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
      ['justify-content', 'flex-start'],
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
    setStyle(siteSearchPrefix, 'justify-content', 'flex-start', useImportantStyles);
    modeMenu.id = `${prefixId}-menu`;
    modeMenu.className = `x-lumno-search-input-mode__menu ${menuSurfaceClass}`;
    if (typeof menuSurface.apply === 'function') {
      menuSurface.apply(modeMenu);
    }
    modeMenu.setAttribute('data-surface', surface);
    modeMenu.setAttribute('data-filtered', 'false');
    modeMenu.setAttribute('data-search-active', 'false');
    modeMenu.setAttribute('role', 'menu');
    modeMenu.setAttribute('aria-labelledby', prefixId);
    modeMenu.tabIndex = -1;
    modeMenu.hidden = true;
    const modeMenuEdgeOffset = surface === 'newtab' ? '-6px' : '-1px';
    const modeMenuStyles = [
      ['position', 'absolute'],
      ['left', modeMenuEdgeOffset],
      ['right', modeMenuEdgeOffset],
      ['top', `calc(100% + ${vars.panelGap})`],
      ['width', 'auto'],
      ['max-height', 'min(360px, 62vh, var(--x-lumno-search-mode-menu-viewport-max-height, 360px))'],
      ['overflow', 'hidden'],
      ['padding', '0'],
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
      ['--x-lumno-search-mode-menu-result-offset', '0px'],
      ['--x-extension-menu-surface-closed-transform', 'translateY(calc(var(--x-lumno-search-mode-menu-result-offset, 0px) + var(--x-lumno-search-mode-menu-lift, 0px) - 6px)) scale(0.96, 0.86)'],
      ['--x-extension-menu-surface-open-transform', 'translateY(calc(var(--x-lumno-search-mode-menu-result-offset, 0px) + var(--x-lumno-search-mode-menu-lift, 0px))) scale(1, 1)'],
      ['overscroll-behavior', 'contain']
    ];
    modeMenu.style.cssText = '';
    modeMenuStyles.forEach((pair) => {
      setStyle(modeMenu, pair[0], pair[1], useImportantStyles);
    });
    if (!modeMenu.parentNode) {
      container.appendChild(modeMenu);
    }
    let modeMenuContent = typeof modeMenu.querySelector === 'function'
      ? modeMenu.querySelector('[data-search-input-mode-menu-content]')
      : null;
    let modeMenuFooter = typeof modeMenu.querySelector === 'function'
      ? modeMenu.querySelector('[data-search-input-mode-menu-footer]')
      : null;
    if (!modeMenuContent || !modeMenuFooter) {
      while (modeMenu.firstChild) {
        modeMenu.removeChild(modeMenu.firstChild);
      }
      modeMenuContent = applyNoTranslate(doc.createElement('div'));
      modeMenuContent.className = 'x-lumno-search-input-mode__menu-content';
      modeMenuContent.setAttribute('data-search-input-mode-menu-content', '');
      modeMenuContent.setAttribute('role', 'presentation');
      modeMenuFooter = applyNoTranslate(doc.createElement('div'));
      modeMenuFooter.className = 'x-lumno-search-input-mode__menu-footer';
      modeMenuFooter.setAttribute('data-search-input-mode-menu-footer', '');
      modeMenuFooter.setAttribute('role', 'presentation');
      modeMenuFooter.setAttribute('aria-hidden', 'true');
      modeMenu.appendChild(modeMenuContent);
      modeMenu.appendChild(modeMenuFooter);
    }
    let modeMenuFooterKey = typeof modeMenuFooter.querySelector === 'function'
      ? modeMenuFooter.querySelector('[data-search-input-mode-menu-footer-key]')
      : null;
    let modeMenuFooterText = typeof modeMenuFooter.querySelector === 'function'
      ? modeMenuFooter.querySelector('[data-search-input-mode-menu-footer-text]')
      : null;
    let modeMenuFooterFilterText = typeof modeMenuFooter.querySelector === 'function'
      ? modeMenuFooter.querySelector('[data-search-input-mode-menu-footer-filter-text]')
      : null;
    if (!modeMenuFooterKey || !modeMenuFooterText || !modeMenuFooterFilterText) {
      while (modeMenuFooter.firstChild) {
        modeMenuFooter.removeChild(modeMenuFooter.firstChild);
      }
      modeMenuFooterFilterText = applyNoTranslate(doc.createElement('span'));
      modeMenuFooterFilterText.className =
        'x-lumno-search-input-mode__menu-footer-filter-text';
      modeMenuFooterFilterText.setAttribute(
        'data-search-input-mode-menu-footer-filter-text',
        ''
      );
      modeMenuFooterKey = applyNoTranslate(doc.createElement('span'));
      modeMenuFooterKey.className = 'x-lumno-search-input-mode__menu-footer-key';
      modeMenuFooterKey.setAttribute(
        'data-search-input-mode-menu-footer-key',
        ''
      );
      modeMenuFooterText = applyNoTranslate(doc.createElement('span'));
      modeMenuFooterText.className = 'x-lumno-search-input-mode__menu-footer-text';
      modeMenuFooterText.setAttribute(
        'data-search-input-mode-menu-footer-text',
        ''
      );
      modeMenuFooter.appendChild(modeMenuFooterFilterText);
      modeMenuFooter.appendChild(modeMenuFooterKey);
      modeMenuFooter.appendChild(modeMenuFooterText);
    }
    const legacyModeMenuFooterDivider = typeof modeMenuFooter.querySelector === 'function'
      ? modeMenuFooter.querySelector('.x-lumno-search-input-mode__menu-footer-divider')
      : null;
    if (legacyModeMenuFooterDivider) {
      legacyModeMenuFooterDivider.remove();
    }
    modeMenuFooter.appendChild(modeMenuFooterFilterText);
    modeMenuFooter.appendChild(modeMenuFooterKey);
    modeMenuFooter.appendChild(modeMenuFooterText);
    function renderModeMenuFilterQuery(query) {
      const queryToken = '\uF8FFLUMNO_MODE_MENU_QUERY\uF8FF';
      const localizedQuery = formatMessage(
        'search_scope_menu_filter_query',
        'Search: {query}',
        { query: queryToken }
      );
      const queryIndex = localizedQuery.indexOf(queryToken);
      if (queryIndex < 0) {
        modeMenuFooterFilterText.textContent = formatMessage(
          'search_scope_menu_filter_query',
          'Search: {query}',
          { query }
        );
        return;
      }
      while (modeMenuFooterFilterText.firstChild) {
        modeMenuFooterFilterText.removeChild(modeMenuFooterFilterText.firstChild);
      }
      if (queryIndex > 0) {
        modeMenuFooterFilterText.appendChild(
          doc.createTextNode(localizedQuery.slice(0, queryIndex))
        );
      }
      const queryMark = doc.createElement('mark');
      queryMark.className = 'x-lumno-search-input-mode__menu-match';
      queryMark.textContent = query;
      modeMenuFooterFilterText.appendChild(queryMark);
      const queryEnd = queryIndex + queryToken.length;
      if (queryEnd < localizedQuery.length) {
        modeMenuFooterFilterText.appendChild(
          doc.createTextNode(localizedQuery.slice(queryEnd))
        );
      }
    }
    function refreshModeMenuFilterText() {
      if (modeMenuFilterQuery) {
        renderModeMenuFilterQuery(modeMenuFilterQuery);
      } else {
        modeMenuFooterFilterText.textContent = formatMessage(
          'search_scope_menu_filter_hint',
          'Click the panel, then type English or pinyin to filter'
        );
      }
    }
    function refreshModeMenuLanguage() {
      modeMenuFooterKey.textContent =
        typeof shortcutDisplayApi.formatShortcutReference === 'function'
          ? shortcutDisplayApi.formatShortcutReference('Tab Tab', {
            navigatorLike: config.navigatorLike || (win && win.navigator)
          })
          : 'Tab Tab';
      modeMenuFooterText.textContent = formatMessage(
        'search_scope_menu_shortcut_hint',
        'Quickly open this panel'
      );
      refreshModeMenuFilterText();
      syncInputPlaceholder();
    }
    refreshModeMenuLanguage();
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

    function updateModeMenuFooterAlignment() {
      if (modeMenu.hidden || !modeMenuFooter || !modeMenuContent) {
        return;
      }
      const firstIcon = modeMenuContent.querySelector(
        '.x-lumno-search-input-mode__menu-icon'
      );
      if (!firstIcon || Number(firstIcon.offsetWidth) <= 0) {
        return;
      }
      const menuRect = modeMenu.getBoundingClientRect();
      const iconRect = firstIcon.getBoundingClientRect();
      const footerRect = modeMenuFooter.getBoundingClientRect();
      const menuLayoutWidth = Number(modeMenu.offsetWidth) || menuRect.width;
      const scaleX = menuLayoutWidth > 0 ? menuRect.width / menuLayoutWidth : 1;
      if (!Number.isFinite(scaleX) || scaleX <= 0) {
        return;
      }
      const inlineStart = Math.max(0, (iconRect.left - footerRect.left) / scaleX);
      setStyle(
        modeMenuFooter,
        '--x-lumno-search-mode-footer-inline-start',
        `${Math.round(inlineStart * 100) / 100}px`,
        useImportantStyles
      );
    }

    function updateLayout() {
      if (destroyed) {
        return;
      }
      updateInputRightPadding();
      updatePrefixLayout();
      updateModeMenuFooterAlignment();
      if (modeMenuOpen && !modeMenu.hidden) {
        notifyModeMenuLayoutChange();
      }
    }

    function setInputModePrefixIdentity(prefixText, contentOptions) {
      siteSearchPrefix.setAttribute(
        'data-mode-id',
        contentOptions && contentOptions.modeId ? String(contentOptions.modeId) : ''
      );
      siteSearchPrefix.setAttribute('aria-label', formatMessage(
        'search_scope_switcher_label',
        '搜索范围：{scope}。选择即可切换',
        { scope: prefixText }
      ));
    }

    function cancelInputModePrefixIconAnimation() {
      if (inputModePrefixIconAnimation &&
          typeof inputModePrefixIconAnimation.cancel === 'function') {
        inputModePrefixIconAnimation.cancel();
      }
      inputModePrefixIconAnimation = null;
      if (inputModePrefixIconAnimationElement) {
        setStyle(
          inputModePrefixIconAnimationElement,
          'opacity',
          '1',
          useImportantStyles
        );
      }
      inputModePrefixIconAnimationElement = null;
    }

    function playInputModePrefixIconFade(animateIcon) {
      cancelInputModePrefixIconAnimation();
      const activeIcon = [
        siteSearchPrefixLineIcon,
        siteSearchPrefixIcon,
        siteSearchPrefixGlyph
      ].find((element) => isElementVisible(element));
      if (!activeIcon) {
        return;
      }
      setStyle(activeIcon, 'opacity', '1', useImportantStyles);
      setStyle(activeIcon, 'transform', 'none', useImportantStyles);
      if (!animateIcon || shouldReduceInputModeMotion() ||
          typeof activeIcon.animate !== 'function') {
        return;
      }
      const animation = activeIcon.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], {
        duration: DEFAULT_PREFIX_ICON_FADE_DURATION,
        easing: 'ease-out'
      });
      inputModePrefixIconAnimation = animation;
      inputModePrefixIconAnimationElement = activeIcon;
      animation.onfinish = () => {
        if (inputModePrefixIconAnimation !== animation) {
          return;
        }
        inputModePrefixIconAnimation = null;
        inputModePrefixIconAnimationElement = null;
        setStyle(activeIcon, 'opacity', '1', useImportantStyles);
      };
      animation.oncancel = () => {
        if (inputModePrefixIconAnimation === animation) {
          inputModePrefixIconAnimation = null;
          inputModePrefixIconAnimationElement = null;
        }
      };
    }

    function measureInputModePrefixWidthForText(prefixText) {
      const previousText = String(siteSearchPrefixText.textContent || '');
      siteSearchPrefixText.textContent = String(prefixText || '');
      const width = Number(siteSearchPrefix.getBoundingClientRect().width) || 0;
      siteSearchPrefixText.textContent = previousText;
      return width;
    }

    function setInputModePrefixContent(prefixText, contentOptions) {
      const preserveIconAnimation = Boolean(
        contentOptions && contentOptions.preserveIconAnimation
      );
      if (!preserveIconAnimation) {
        cancelInputModePrefixIconAnimation();
      }
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
          ['width', '16px'],
          ['height', '16px'],
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
      setStyle(siteSearchPrefixIcon, 'transition', 'none', useImportantStyles);
      setStyle(siteSearchPrefixGlyph, 'transition', 'none', useImportantStyles);
      setStyle(siteSearchPrefixLineIcon, 'transition', 'none', useImportantStyles);
      const text = siteSearchPrefixText;
      text.textContent = prefixText;
      text.style.cssText = cssText([
        ['all', 'unset'],
        ['display', 'block'],
        ['flex', '1 1 auto'],
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
        ['display', modeMenuOpen && !modeMenu.hidden ? 'inline-flex' : 'none'],
        ['align-items', 'center'],
        ['font-size', '10px'],
        ['font-weight', '600'],
        ['line-height', '18px'],
        ['letter-spacing', '0.04em'],
        ['white-space', 'nowrap'],
        ['overflow', 'visible'],
        ['flex', '0 0 auto']
      ], useImportantStyles);
      setInputModePrefixIdentity(prefixText, contentOptions);
      setStyle(siteSearchPrefixChevron, 'display', 'inline-flex', useImportantStyles);
      setStyle(siteSearchPrefixChevron, 'flex', '0 0 auto', useImportantStyles);
      if (!preserveIconAnimation) {
        playInputModePrefixIconFade(Boolean(
          contentOptions && contentOptions.animateIcon
        ));
      }
    }

    function cancelInputModePrefixAnimation(cancelOptions) {
      if (!cancelOptions || cancelOptions.preservePendingText !== true) {
        inputModePrefixPendingText = '';
      }
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
      setInputModePrefixRestState();
    }

    function playInputModePrefixResizeAnimation(fromWidth, toWidth, resizeOptions) {
      const options = resizeOptions || {};
      const onFinish = typeof options.onFinish === 'function'
        ? options.onFinish
        : null;
      cancelInputModePrefixAnimation({
        preservePendingText: options.preservePendingText === true
      });
      const startWidth = Math.max(0, Number(fromWidth) || 0);
      const endWidth = Math.max(0, Number(toWidth) || 0);
      if (shouldReduceInputModeMotion() || startWidth <= 0 || endWidth <= 0 ||
          Math.abs(startWidth - endWidth) < 1) {
        if (onFinish) {
          onFinish();
        }
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
          duration: DEFAULT_PREFIX_RESIZE_DURATION,
          easing: DEFAULT_PREFIX_RESIZE_EASING
        });
        inputModePrefixAnimation = animation;
        animation.onfinish = () => {
          if (inputModePrefixAnimation !== animation) {
            return;
          }
          inputModePrefixAnimation = null;
          setStyle(siteSearchPrefix, 'width', `${endWidth}px`, useImportantStyles);
          if (onFinish) {
            onFinish();
          }
          restoreInputModePrefixAnimatedState();
        };
        animation.oncancel = () => {
          if (inputModePrefixAnimation === animation) {
            inputModePrefixAnimation = null;
          }
        };
        return;
      }
      setStyle(siteSearchPrefix, 'transition', prefixTransition, useImportantStyles);
      setStyle(siteSearchPrefix, 'width', `${startWidth}px`, useImportantStyles);
      inputModePrefixAnimationFrame = win.requestAnimationFrame(() => {
        inputModePrefixAnimationFrame = null;
        setStyle(
          siteSearchPrefix,
          'transition',
          `width ${DEFAULT_PREFIX_RESIZE_DURATION}ms ${DEFAULT_PREFIX_RESIZE_EASING}, ${prefixTransition}`,
          useImportantStyles
        );
        setStyle(siteSearchPrefix, 'width', `${endWidth}px`, useImportantStyles);
        inputModePrefixAnimationTimer = win.setTimeout(() => {
          inputModePrefixAnimationTimer = 0;
          if (onFinish) {
            onFinish();
          }
          restoreInputModePrefixAnimatedState();
        }, DEFAULT_PREFIX_RESIZE_DURATION + 10);
      });
    }

    function setInputModePrefixMenuOpen(open) {
      const nextOpen = Boolean(open);
      const wasOpen = siteSearchPrefix.getAttribute('data-menu-open') === 'true';
      if (wasOpen === nextOpen) {
        setStyle(
          siteSearchPrefixCurrent,
          'display',
          nextOpen ? 'inline-flex' : 'none',
          useImportantStyles
        );
        return;
      }
      const shouldAnimate = isElementVisible(siteSearchPrefix);
      if (shouldAnimate) {
        cancelInputModePrefixAnimation();
      }
      const previousWidth = shouldAnimate
        ? Number(siteSearchPrefix.getBoundingClientRect().width) || 0
        : 0;
      siteSearchPrefix.setAttribute('data-menu-open', nextOpen ? 'true' : 'false');
      setStyle(
        siteSearchPrefixCurrent,
        'display',
        nextOpen ? 'inline-flex' : 'none',
        useImportantStyles
      );
      const nextWidth = shouldAnimate
        ? Number(siteSearchPrefix.getBoundingClientRect().width) || 0
        : 0;
      updatePrefixLayout();
      if (shouldAnimate) {
        playInputModePrefixResizeAnimation(previousWidth, nextWidth);
      }
    }

    function resetModeTagRemovalConfirmation() {
      const wasPending = modeTagRemovalConfirmationPending;
      if (modeTagRemovalConfirmationTimer && win &&
          typeof win.clearTimeout === 'function') {
        win.clearTimeout(modeTagRemovalConfirmationTimer);
      }
      modeTagRemovalConfirmationTimer = 0;
      modeTagRemovalConfirmationPending = false;
      if (wasPending &&
          typeof config.onModeTagRemovalConfirmationReset === 'function') {
        config.onModeTagRemovalConfirmationReset();
      }
      return wasPending;
    }

    function resetModeMenuDoubleTab() {
      const wasPending = modeMenuDoubleTabPending;
      if (modeMenuDoubleTabTimer && win &&
          typeof win.clearTimeout === 'function') {
        win.clearTimeout(modeMenuDoubleTabTimer);
      }
      modeMenuDoubleTabTimer = 0;
      modeMenuDoubleTabPending = false;
      return wasPending;
    }

    function shouldOpenModeMenuOnDoubleTab(event) {
      if (destroyed || !event || event.key !== 'Tab' || event.defaultPrevented) {
        return false;
      }
      const hasModifier = Boolean(
        event.shiftKey || event.metaKey || event.ctrlKey || event.altKey
      );
      const hasInput = String(input.value || '') !== '';
      const hasModeTag = Boolean(
        String(siteSearchPrefix.getAttribute('data-mode-id') || '')
      );
      if (hasModifier || hasInput || hasModeTag || modeMenuOpen || modeMenuPending) {
        resetModeMenuDoubleTab();
        return false;
      }
      if (event.repeat) {
        if (modeMenuDoubleTabPending && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        return false;
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (modeMenuDoubleTabPending) {
        resetModeMenuDoubleTab();
        return true;
      }
      modeMenuDoubleTabPending = true;
      const configuredDuration = Number(config.modeMenuDoubleTabDuration);
      const duration = Number.isFinite(configuredDuration)
        ? Math.max(0, configuredDuration)
        : DEFAULT_MODE_MENU_DOUBLE_TAB_DURATION;
      if (win && typeof win.setTimeout === 'function' && duration > 0) {
        modeMenuDoubleTabTimer = win.setTimeout(() => {
          modeMenuDoubleTabTimer = 0;
          resetModeMenuDoubleTab();
        }, duration);
      }
      return false;
    }

    function shouldCompleteModeMenuDoubleTab(event) {
      if (destroyed || !modeMenuDoubleTabPending || !event ||
          event.key !== 'Tab' || event.defaultPrevented) {
        return false;
      }
      const hasModifier = Boolean(
        event.shiftKey || event.metaKey || event.ctrlKey || event.altKey
      );
      const hasInput = String(input.value || '') !== '';
      if (hasModifier || hasInput || modeMenuOpen || modeMenuPending) {
        resetModeMenuDoubleTab();
        return false;
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event.repeat) {
        return false;
      }
      resetModeMenuDoubleTab();
      return true;
    }

    function shouldContainModeMenuTab(event) {
      if (destroyed || !event || event.key !== 'Tab' || event.defaultPrevented ||
          (!modeMenuOpen && !modeMenuPending)) {
        return false;
      }
      const hasModifier = Boolean(
        event.shiftKey || event.metaKey || event.ctrlKey || event.altKey
      );
      if (hasModifier) {
        return false;
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      resetModeMenuDoubleTab();
      return true;
    }

    function shouldOpenModeMenuForActiveModeOnTab(event) {
      if (destroyed || !event || event.key !== 'Tab' || event.defaultPrevented) {
        return false;
      }
      const hasModifier = Boolean(
        event.shiftKey || event.metaKey || event.ctrlKey || event.altKey
      );
      const hasModeTag = Boolean(
        String(siteSearchPrefix.getAttribute('data-mode-id') || '')
      );
      if (hasModifier || event.repeat ||
          modeMenuOpen || modeMenuPending) {
        resetModeMenuDoubleTab();
        return false;
      }
      if (!hasModeTag) {
        return false;
      }
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      resetModeMenuDoubleTab();
      return true;
    }

    function shouldRemoveModeTagOnBackspace(event) {
      if (destroyed || String(input.value || '') !== '') {
        resetModeTagRemovalConfirmation();
        return false;
      }
      if (!modeMenuOpen || modeMenu.hidden) {
        resetModeTagRemovalConfirmation();
        return true;
      }
      if (event && event.repeat) {
        return false;
      }
      if (modeTagRemovalConfirmationPending) {
        resetModeTagRemovalConfirmation();
        return true;
      }
      modeTagRemovalConfirmationPending = true;
      const configuredDuration = Number(
        config.modeTagRemovalConfirmationDuration
      );
      const duration = Number.isFinite(configuredDuration)
        ? Math.max(0, configuredDuration)
        : DEFAULT_MODE_TAG_REMOVAL_CONFIRMATION_DURATION;
      if (win && typeof win.setTimeout === 'function' && duration > 0) {
        modeTagRemovalConfirmationTimer = win.setTimeout(() => {
          modeTagRemovalConfirmationTimer = 0;
          resetModeTagRemovalConfirmation();
        }, duration);
      }
      if (typeof config.onModeTagRemovalConfirmation === 'function') {
        config.onModeTagRemovalConfirmation({ duration });
      }
      return false;
    }

    function setPrefixText(prefixText, theme, prefixOptions) {
      const nextOptions = prefixOptions || {};
      const nextPrefixText = String(prefixText || '');
      const shouldAnimate = Boolean(nextOptions.animate);
      const nextModeId = nextOptions.modeId ? String(nextOptions.modeId) : '';
      const previousModeId = String(siteSearchPrefix.getAttribute('data-mode-id') || '');
      const previousPrefixText = String(siteSearchPrefixText.textContent || '');
      if (previousModeId !== nextModeId || previousPrefixText !== nextPrefixText) {
        if (!nextOptions.preserveModeMenuDoubleTab) {
          resetModeMenuDoubleTab();
        }
        resetModeTagRemovalConfirmation();
      }
      const isSameMode = previousModeId === nextModeId;
      const isRepeatedMode = Boolean(previousModeId && isSameMode);
      const shouldAnimateResize = Boolean(
        shouldAnimate &&
        previousModeId &&
        !isSameMode &&
        isElementVisible(siteSearchPrefix)
      );
      const hasActivePrefixAnimation = Boolean(
        inputModePrefixAnimation ||
        inputModePrefixAnimationFrame !== null ||
        inputModePrefixAnimationTimer
      );
      const shouldWaitForPendingText = Boolean(
        !shouldAnimate &&
        isSameMode &&
        hasActivePrefixAnimation &&
        inputModePrefixPendingText === nextPrefixText
      );
      if (shouldAnimateResize) {
        cancelInputModePrefixAnimation();
      }
      const previousWidth = shouldAnimateResize
        ? Number(siteSearchPrefix.getBoundingClientRect().width) || 0
        : 0;
      const shouldPreserveAnimation = !shouldAnimate && isSameMode && Boolean(
        hasActivePrefixAnimation
      );
      if (shouldAnimateResize) {
        setStyle(siteSearchPrefix, 'transition', prefixTransition, useImportantStyles);
      } else if (!shouldAnimate && !shouldPreserveAnimation) {
        setStyle(siteSearchPrefix, 'transition', 'none', useImportantStyles);
      }
      setInputModePrefixIdentity(nextPrefixText, nextOptions);
      const visual = applyInputModePrefixVisual(theme, nextOptions);
      setStyle(siteSearchPrefix, 'display', 'inline-flex', useImportantStyles);
      if (shouldWaitForPendingText) {
        syncInputPlaceholder();
        setInputStyle(input, 'caret-color', visual.caretColor);
        updatePrefixLayout();
        return;
      }
      const contentOptions = {
        ...nextOptions,
        animateIcon: shouldAnimate && !isRepeatedMode,
        preserveIconAnimation: !shouldAnimate && isSameMode
      };
      if (shouldAnimateResize) {
        const targetWidth = measureInputModePrefixWidthForText(nextPrefixText);
        if (targetWidth > previousWidth + 0.5) {
          inputModePrefixPendingText = nextPrefixText;
          syncInputPlaceholder();
          setInputStyle(input, 'caret-color', visual.caretColor);
          updatePrefixLayout();
          playInputModePrefixResizeAnimation(previousWidth, targetWidth, {
            preservePendingText: true,
            onFinish: () => {
              if (inputModePrefixPendingText !== nextPrefixText) {
                return;
              }
              inputModePrefixPendingText = '';
              setInputModePrefixContent(nextPrefixText, contentOptions);
              updatePrefixLayout();
            }
          });
          return;
        }
      }
      setInputModePrefixContent(nextPrefixText, contentOptions);
      const nextWidth = shouldAnimateResize
        ? Number(siteSearchPrefix.getBoundingClientRect().width) || 0
        : 0;
      if (!shouldAnimate && !shouldPreserveAnimation) {
        setInputModePrefixRestState({ transition: false });
      }
      syncInputPlaceholder();
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
      resetModeMenuDoubleTab();
      resetModeTagRemovalConfirmation();
      cancelInputModePrefixIconAnimation();
      inputModePrefixContentRevision += 1;
      siteSearchPrefixText.textContent = '';
      siteSearchPrefix.removeAttribute('data-mode-id');
      siteSearchPrefix.removeAttribute('aria-label');
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
      while (modeMenuContent.firstChild) {
        modeMenuContent.removeChild(modeMenuContent.firstChild);
      }
    }

    function applyModeMenuIconTheme(wrap, menuItem, theme) {
      if (!wrap) {
        return;
      }
      const resolvedTheme = theme ? getThemeForMode(theme) : defaultTheme;
      const resolvedAccentRgb = resolvedTheme && (
        resolvedTheme.accentRgb || parseCssColor(resolvedTheme.accent)
      ) || defaultAccentColor;
      const accentRgb = mixRgb(resolvedAccentRgb, resolvedAccentRgb, 0);
      const darkMode = Boolean(isDarkMode());
      const backgroundRgb = mixRgb(
        accentRgb,
        darkMode ? [22, 22, 22] : [255, 255, 255],
        darkMode ? 0.72 : 0.82
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
      if (menuItem) {
        setStyle(
          menuItem,
          '--x-lumno-search-mode-item-theme-bg',
          `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${darkMode ? 0.14 : 0.075})`,
          useImportantStyles
        );
      }
    }

    function applyModeMenuBuiltInIconTheme(wrap, menuItem) {
      const surfaceColor = getBuiltInSurfaceColor();
      const background = `color-mix(in srgb, ${surfaceColor} ${isDarkMode() ? 14 : 9}%, transparent)`;
      setStyle(
        wrap,
        '--x-lumno-search-mode-icon-bg',
        background,
        useImportantStyles
      );
      setStyle(
        wrap,
        '--x-lumno-search-mode-icon-color',
        surfaceColor,
        useImportantStyles
      );
      if (menuItem) {
        setStyle(
          menuItem,
          '--x-lumno-search-mode-item-theme-bg',
          background,
          useImportantStyles
        );
      }
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

    function createModeMenuIcon(item, menuItem) {
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
        applyModeMenuBuiltInIconTheme(wrap, menuItem);
      } else {
        applyModeMenuIconTheme(wrap, menuItem, item.theme || defaultTheme);
      }
      if (item.provider && getThemeForProvider) {
        Promise.resolve(getThemeForProvider(item.provider)).then((theme) => {
          if (!destroyed && wrap.isConnected && theme) {
            applyModeMenuIconTheme(wrap, menuItem, theme);
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

    function normalizeModeMenuSearchText(value) {
      return Array.from(
        String(value || '').normalize('NFKD').toLowerCase()
      ).filter((character) => !/[\u0300-\u036f]/.test(character))
        .filter((character) => /[a-z0-9\u3400-\u9fff]/.test(character))
        .join('');
    }

    function appendModeMenuSearchSequence(sequence, characterMap, value, range) {
      const normalized = normalizeModeMenuSearchText(value);
      Array.from(normalized).forEach((character) => {
        sequence.push(character);
        characterMap.push(range);
      });
    }

    function getModeMenuPinyinSyllable(character) {
      if (!/[\u3400-\u9fff]/.test(character)) {
        return normalizeModeMenuSearchText(character);
      }
      const pinyinApi = getModeMenuPinyinApi();
      if (!pinyinApi || typeof pinyinApi.pinyin !== 'function') {
        return MODE_MENU_PINYIN_FALLBACKS[character] || '';
      }
      try {
        const result = pinyinApi.pinyin(character, {
          toneType: 'none',
          type: 'array',
          nonZh: 'removed',
          v: false
        });
        return normalizeModeMenuSearchText(
          Array.isArray(result) ? result.join('') : result
        ) || MODE_MENU_PINYIN_FALLBACKS[character] || '';
      } catch (error) {
        return MODE_MENU_PINYIN_FALLBACKS[character] || '';
      }
    }

    function buildModeMenuSearchIndex(item) {
      const labelText = String(item && item.label ? item.label : '');
      const labelSequence = [];
      const labelMap = [];
      const pinyinSequence = [];
      const pinyinMap = [];
      const initialSequence = [];
      const initialMap = [];
      let sourceOffset = 0;
      Array.from(labelText).forEach((character) => {
        const start = sourceOffset;
        sourceOffset += character.length;
        const range = Object.freeze({ start, end: sourceOffset });
        appendModeMenuSearchSequence(
          labelSequence,
          labelMap,
          character,
          range
        );
        const syllable = getModeMenuPinyinSyllable(character);
        appendModeMenuSearchSequence(
          pinyinSequence,
          pinyinMap,
          syllable,
          range
        );
        if (syllable) {
          appendModeMenuSearchSequence(
            initialSequence,
            initialMap,
            syllable.charAt(0),
            range
          );
        }
      });
      const provider = item && item.provider ? item.provider : null;
      const searchTerms = []
        .concat(Array.isArray(item && item.searchTerms) ? item.searchTerms : [])
        .concat(provider ? [provider.key, provider.name] : [])
        .concat(provider && Array.isArray(provider.aliases) ? provider.aliases : [])
        .map(normalizeModeMenuSearchText)
        .filter(Boolean);
      return Object.freeze({
        label: labelSequence.join(''),
        labelMap,
        pinyin: pinyinSequence.join(''),
        pinyinMap,
        initials: initialSequence.join(''),
        initialMap,
        searchTerms
      });
    }

    function getModeMenuSearchRange(sequence, characterMap, query) {
      const startIndex = sequence.indexOf(query);
      if (startIndex < 0 || !characterMap[startIndex]) {
        return null;
      }
      const lastRange = characterMap[startIndex + query.length - 1];
      if (!lastRange) {
        return null;
      }
      return {
        start: characterMap[startIndex].start,
        end: lastRange.end
      };
    }

    function getModeMenuItemMatch(entry, normalizedQuery) {
      if (!normalizedQuery) {
        return { matched: true, ranges: [] };
      }
      const index = entry.searchIndex;
      const directRange = getModeMenuSearchRange(
        index.label,
        index.labelMap,
        normalizedQuery
      );
      if (directRange) {
        return { matched: true, ranges: [directRange] };
      }
      const pinyinRange = getModeMenuSearchRange(
        index.pinyin,
        index.pinyinMap,
        normalizedQuery
      );
      if (pinyinRange) {
        return { matched: true, ranges: [pinyinRange] };
      }
      const initialsRange = normalizedQuery.length >= 2
        ? getModeMenuSearchRange(
          index.initials,
          index.initialMap,
          normalizedQuery
        )
        : null;
      if (initialsRange) {
        return { matched: true, ranges: [initialsRange] };
      }
      const matchedSearchTerm = index.searchTerms.some((term) => (
        term.includes(normalizedQuery)
      ));
      if (matchedSearchTerm) {
        return {
          matched: true,
          ranges: entry.labelText ? [{ start: 0, end: entry.labelText.length }] : []
        };
      }
      return { matched: false, ranges: [] };
    }

    function renderModeMenuLabelMatch(label, labelText, ranges) {
      while (label.firstChild) {
        label.removeChild(label.firstChild);
      }
      const normalizedRanges = (Array.isArray(ranges) ? ranges : [])
        .map((range) => ({
          start: Math.max(0, Number(range && range.start) || 0),
          end: Math.min(labelText.length, Number(range && range.end) || 0)
        }))
        .filter((range) => range.end > range.start)
        .sort((left, right) => left.start - right.start);
      if (normalizedRanges.length === 0) {
        label.textContent = labelText;
        return;
      }
      let offset = 0;
      normalizedRanges.forEach((range) => {
        if (range.start > offset) {
          label.appendChild(doc.createTextNode(labelText.slice(offset, range.start)));
        }
        const mark = doc.createElement('mark');
        mark.className = 'x-lumno-search-input-mode__menu-match';
        mark.textContent = labelText.slice(range.start, range.end);
        label.appendChild(mark);
        offset = range.end;
      });
      if (offset < labelText.length) {
        label.appendChild(doc.createTextNode(labelText.slice(offset)));
      }
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
      return Array.from(modeMenu.querySelectorAll('[role="menuitemradio"]'))
        .filter((button) => !button.hidden);
    }

    function getModeMenuActiveElement() {
      const rootNode = typeof modeMenu.getRootNode === 'function'
        ? modeMenu.getRootNode()
        : doc;
      return rootNode && rootNode.activeElement
        ? rootNode.activeElement
        : doc.activeElement;
    }

    function setModeMenuSearchActive(active) {
      modeMenu.setAttribute('data-search-active', active ? 'true' : 'false');
    }

    function focusModeMenuSearch() {
      if (destroyed || !modeMenuOpen || modeMenu.hidden) {
        return false;
      }
      getModeMenuButtons().forEach((button) => {
        button.tabIndex = -1;
      });
      setModeMenuSearchActive(true);
      modeMenu.focus({ preventScroll: true });
      return true;
    }

    function focusModeInput() {
      if (destroyed || !input || typeof input.focus !== 'function') {
        return false;
      }
      setModeMenuSearchActive(false);
      input.focus({ preventScroll: true });
      return true;
    }

    function shouldHandleModeMenuKeyEvent(event) {
      if (destroyed || !modeMenuOpen || modeMenu.hidden) {
        return false;
      }
      const activeElement = getModeMenuActiveElement();
      const eventTarget = event && event.target;
      return Boolean(
        activeElement === modeMenu || modeMenu.contains(activeElement) ||
        eventTarget === modeMenu || modeMenu.contains(eventTarget)
      );
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
          focusModeInput();
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
      renderedModeMenuEntries = [];
      renderedModeMenuGroups = [];
      modeMenuEmptyState = null;
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
          modeMenuContent.appendChild(groupLabel);
          renderedModeMenuGroups.push({
            element: groupLabel,
            group,
            visibleCount: 0
          });
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
        button.appendChild(createModeMenuIcon(item, button));
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
        modeMenuContent.appendChild(button);
        renderedModeMenuEntries.push({
          button,
          group,
          item,
          label,
          labelText: String(item.label),
          searchIndex: buildModeMenuSearchIndex(item)
        });
      });
      modeMenuEmptyState = applyNoTranslate(doc.createElement('div'));
      modeMenuEmptyState.className = 'x-lumno-search-input-mode__menu-empty';
      modeMenuEmptyState.setAttribute('data-i18n', 'overlay_empty_result');
      modeMenuEmptyState.setAttribute('role', 'status');
      modeMenuEmptyState.textContent = formatMessage(
        'overlay_empty_result',
        'No matching results'
      );
      modeMenuEmptyState.hidden = true;
      modeMenuContent.appendChild(modeMenuEmptyState);
      applyModeMenuFilter(modeMenuFilterQuery, { preserveScroll: true });
      return normalizedItems;
    }

    function applyModeMenuFilter(query, filterOptions) {
      modeMenuFilterQuery = String(query || '');
      refreshModeMenuFilterText();
      const normalizedQuery = normalizeModeMenuSearchText(modeMenuFilterQuery);
      modeMenu.setAttribute('data-filtered', normalizedQuery ? 'true' : 'false');
      renderedModeMenuGroups.forEach((group) => {
        group.visibleCount = 0;
      });
      let visibleCount = 0;
      renderedModeMenuEntries.forEach((entry) => {
        const match = getModeMenuItemMatch(entry, normalizedQuery);
        entry.button.hidden = !match.matched;
        entry.button.tabIndex = -1;
        renderModeMenuLabelMatch(
          entry.label,
          entry.labelText,
          match.ranges
        );
        if (!match.matched) {
          return;
        }
        visibleCount += 1;
        const groupRecord = renderedModeMenuGroups.find((group) => (
          group.group === entry.group
        ));
        if (groupRecord) {
          groupRecord.visibleCount += 1;
        }
      });
      renderedModeMenuGroups.forEach((group) => {
        group.element.hidden = group.visibleCount === 0;
      });
      if (modeMenuEmptyState) {
        modeMenuEmptyState.hidden = visibleCount > 0;
      }
      if (!filterOptions || filterOptions.preserveScroll !== true) {
        modeMenuContent.scrollTop = 0;
      }
      updateModeMenuFooterAlignment();
      notifyModeMenuLayoutChange();
      return visibleCount;
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

    function handleModeInput(event) {
      resetModeMenuDoubleTab();
      resetModeTagRemovalConfirmation();
      syncModeMenuQueryLift(event);
    }

    function handleModeInputKeydown(event) {
      if (event && event.key !== 'Tab') {
        resetModeMenuDoubleTab();
      }
      if (event && event.key !== 'Backspace' &&
          !event.metaKey && !event.ctrlKey && !event.altKey) {
        resetModeTagRemovalConfirmation();
      }
    }

    function handleModeInputBlur() {
      resetModeMenuDoubleTab();
    }

    function handleModeInputFocus() {
      setModeMenuSearchActive(false);
    }

    function setModeMenuResultOffset(offset) {
      const numericOffset = Number(offset);
      const nextOffset = Number.isFinite(numericOffset)
        ? Math.max(0, numericOffset)
        : 0;
      setStyle(
        modeMenu,
        '--x-lumno-search-mode-menu-result-offset',
        `${nextOffset}px`,
        useImportantStyles
      );
    }

    function fitModeMenuWithinViewport(options) {
      const fitOptions = options || {};
      const viewportMaxHeightProperty =
        '--x-lumno-search-mode-menu-viewport-max-height';
      if (destroyed || modeMenu.hidden || !modeMenuOpen) {
        modeMenu.style.removeProperty(viewportMaxHeightProperty);
        return null;
      }
      const containerRect = container.getBoundingClientRect();
      const containerLayoutHeight = Math.max(
        0,
        Number(container.offsetHeight) || Number(containerRect.height) || 0
      );
      const renderedContainerHeight = Math.max(
        0,
        Number(containerRect.height) || containerLayoutHeight
      );
      const scaleY = containerLayoutHeight > 0
        ? renderedContainerHeight / containerLayoutHeight
        : 1;
      if (!Number.isFinite(scaleY) || scaleY <= 0) {
        return null;
      }
      const visualViewport = win && win.visualViewport;
      const configuredViewportBottom = Number(fitOptions.viewportBottom);
      const viewportBottom = Number.isFinite(configuredViewportBottom)
        ? configuredViewportBottom
        : (visualViewport && Number.isFinite(Number(visualViewport.height))
          ? Math.max(0, Number(visualViewport.offsetTop) || 0) +
            Math.max(0, Number(visualViewport.height) || 0)
          : Math.max(
            0,
            Number(win && win.innerHeight) ||
              Number(doc && doc.documentElement && doc.documentElement.clientHeight) ||
              0
          ));
      const configuredBottomInset = Number(fitOptions.bottomInset);
      const bottomInset = Number.isFinite(configuredBottomInset)
        ? Math.max(0, configuredBottomInset)
        : DEFAULT_MODE_MENU_VIEWPORT_BOTTOM_INSET;
      const menuGap = Math.max(
        0,
        (Number(modeMenu.offsetTop) || containerLayoutHeight) -
          containerLayoutHeight
      );
      const availableLayoutHeight = Math.max(
        0,
        ((viewportBottom - bottomInset - Number(containerRect.bottom || 0)) /
          scaleY) - menuGap
      );
      setStyle(
        modeMenu,
        viewportMaxHeightProperty,
        `${Math.floor(availableLayoutHeight)}px`,
        useImportantStyles
      );
      const menuLayoutHeight = Math.max(
        0,
        Number(modeMenu.offsetHeight) ||
          (Number(modeMenu.getBoundingClientRect().height) || 0) / scaleY
      );
      return Math.max(
        0,
        Math.floor(availableLayoutHeight - menuLayoutHeight)
      );
    }

    function notifyModeMenuLayoutChange() {
      if (typeof config.onModeMenuLayoutChange === 'function') {
        config.onModeMenuLayoutChange({
          menuElement: modeMenu,
          open: Boolean(modeMenuOpen && !modeMenu.hidden)
        });
      }
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
      refreshModeMenuLanguage();
      resetModeMenuDoubleTab();
      resetModeTagRemovalConfirmation();
      const requestId = ++modeMenuRequestId;
      modeMenuPending = true;
      const finishOpen = (items) => {
        if (destroyed || requestId !== modeMenuRequestId) {
          return false;
        }
        modeMenuPending = false;
        modeMenuFilterQuery = '';
        const normalizedItems = renderModeMenu(items);
        if (normalizedItems.length === 0) {
          return false;
        }
        modeMenuOpen = true;
        syncModeMenuQueryLift();
        modeMenu.hidden = false;
        syncInputPlaceholder();
        updateModeMenuFooterAlignment();
        revealModeMenuSurface();
        container.setAttribute('data-mode-menu-open', 'true');
        siteSearchPrefix.setAttribute('aria-expanded', 'true');
        setStyle(siteSearchPrefix, 'z-index', '41', useImportantStyles);
        setInputModePrefixMenuOpen(true);
        notifyModeMenuLayoutChange();
        const activeIndex = normalizedItems.findIndex((item) => item.active);
        const targetIndex = focusTarget === 'last'
          ? normalizedItems.length - 1
          : (activeIndex >= 0 ? activeIndex : 0);
        if (focusTarget === 'none') {
          focusModeMenuSearch();
        } else {
          focusModeMenuButton(targetIndex);
        }
        return true;
      };
      const items = config.getModeMenuItems();
      if ((items && typeof items.then === 'function') ||
          (modeMenuPinyinRuntimeReady &&
            typeof modeMenuPinyinRuntimeReady.then === 'function')) {
        modeMenu.setAttribute('aria-busy', 'true');
        return Promise.all([
          Promise.resolve(items),
          Promise.resolve(modeMenuPinyinRuntimeReady)
        ]).then(([resolvedItems]) => {
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
        updateModeMenuFooterAlignment();
        notifyModeMenuLayoutChange();
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
      resetModeMenuDoubleTab();
      resetModeTagRemovalConfirmation();
      modeMenu.removeAttribute('aria-busy');
      if (modeMenuCursorTooltipController &&
          typeof modeMenuCursorTooltipController.hide === 'function') {
        modeMenuCursorTooltipController.hide();
      }
      modeMenuOpen = false;
      modeMenuFilterQuery = '';
      setModeMenuSearchActive(false);
      concealModeMenuSurface();
      modeMenu.hidden = true;
      syncInputPlaceholder();
      container.removeAttribute('data-mode-menu-open');
      siteSearchPrefix.setAttribute('aria-expanded', 'false');
      setStyle(siteSearchPrefix, 'z-index', '1', useImportantStyles);
      setInputModePrefixMenuOpen(false);
      notifyModeMenuLayoutChange();
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
      const currentIndex = buttons.indexOf(getModeMenuActiveElement());
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (modeMenuFilterQuery) {
          applyModeMenuFilter('');
          focusModeMenuSearch();
        } else {
          closeModeMenu(true);
        }
      } else if (event.key === 'Backspace' && !event.metaKey &&
          !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        const queryCharacters = Array.from(modeMenuFilterQuery);
        queryCharacters.pop();
        applyModeMenuFilter(queryCharacters.join(''));
        focusModeMenuSearch();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight' ||
          event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        const movesForward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
        const nextIndex = currentIndex < 0
          ? (movesForward ? 0 : buttons.length - 1)
          : currentIndex + (movesForward ? 1 : -1);
        focusModeMenuButton(nextIndex);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        focusModeMenuButton(event.key === 'Home' ? 0 : buttons.length - 1);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        focusModeMenuSearch();
      } else if (!event.isComposing && !event.repeat &&
          !event.metaKey && !event.ctrlKey && !event.altKey &&
          typeof event.key === 'string' && event.key.length === 1 &&
          /[a-z0-9\u3400-\u9fff\s]/i.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        applyModeMenuFilter(modeMenuFilterQuery + event.key);
        focusModeMenuSearch();
      }
    }

    function handleModeMenuPointerDown(event) {
      if (!modeMenuOpen || modeMenu.hidden) {
        return;
      }
      setModeMenuSearchActive(true);
      const target = event && event.target;
      const button = target && typeof target.closest === 'function'
        ? target.closest('[role="menuitemradio"]')
        : null;
      if (button) {
        return;
      }
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      focusModeMenuSearch();
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
    input.addEventListener('input', handleModeInput);
    input.addEventListener('keydown', handleModeInputKeydown);
    input.addEventListener('blur', handleModeInputBlur);
    input.addEventListener('focus', handleModeInputFocus);
    modeMenu.addEventListener('keydown', handleMenuKeydown);
    modeMenu.addEventListener('pointerdown', handleModeMenuPointerDown);
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
      layoutResizeObserver.observe(modeMenuContent);
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
      resetModeMenuDoubleTab();
      resetModeTagRemovalConfirmation();
      cancelInputModePrefixAnimation();
      cancelInputModePrefixIconAnimation();
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
        modeMenu.removeEventListener('pointerdown', handleModeMenuPointerDown);
      }
      if (typeof input.removeEventListener === 'function') {
        input.removeEventListener('input', handleModeInput);
        input.removeEventListener('keydown', handleModeInputKeydown);
        input.removeEventListener('blur', handleModeInputBlur);
        input.removeEventListener('focus', handleModeInputFocus);
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
      fitModeMenuWithinViewport,
      menuElement: modeMenu,
      getModeMenuFilterQuery: () => modeMenuFilterQuery,
      openModeMenu,
      refreshModeMenuLanguage,
      refreshModeMenu,
      resetModeMenuDoubleTab,
      resetModeTagRemovalConfirmation,
      setModeMenuResultOffset,
      setTabHintVisible,
      shouldCompleteModeMenuDoubleTab,
      shouldContainModeMenuTab,
      shouldHandleModeMenuKeyEvent,
      shouldOpenModeMenuForActiveModeOnTab,
      shouldOpenModeMenuOnDoubleTab,
      shouldRemoveModeTagOnBackspace,
      updateLayout,
      destroy
    });
  }

  root.LumnoSearchInputMode = Object.freeze({
    runtimeVersion: SEARCH_INPUT_MODE_RUNTIME_VERSION,
    createInputModeController
  });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
