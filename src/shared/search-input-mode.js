(function(root) {
  if (root.LumnoSearchInputMode && typeof root.LumnoSearchInputMode.createInputModeController === 'function') {
    return;
  }

  const INPUT_FONT_STACK = "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
  const DEFAULT_ACCENT_RGB = [59, 130, 246];
  const DEFAULT_PREFIX_GAP = 8;
  const DEFAULT_PREFIX_TRANSITION = 'opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 300ms cubic-bezier(0.22, 1, 0.36, 1), filter 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms ease, box-shadow 180ms ease';

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
    const isAiSiteSearchProvider = typeof config.isAiSiteSearchProvider === 'function'
      ? config.isAiSiteSearchProvider
      : () => false;
    const attachFaviconData = typeof config.attachFaviconData === 'function'
      ? config.attachFaviconData
      : null;
    const attachProviderIcon = typeof config.attachProviderIcon === 'function'
      ? config.attachProviderIcon
      : null;
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
        panelBorder: 'var(--x-ov-border, rgba(0, 0, 0, 0.08))'
      }
      : {
        tagBg: 'var(--x-nt-tag-bg, #F3F4F6)',
        tagText: 'var(--x-nt-tag-text, #6B7280)',
        panelBorder: 'var(--x-nt-panel-border, rgba(0, 0, 0, 0.08))'
      };

    let baseInputPaddingLeft = null;
    let inputModePrefixAnimationFrame = null;
    let layoutResizeObserver = null;
    let destroyed = false;

    const siteSearchPrefix = applyNoTranslate(doc.createElement('span'));
    siteSearchPrefix.id = prefixId;
    siteSearchPrefix.className = 'x-lumno-search-input-mode__prefix';
    siteSearchPrefix.style.cssText = cssText([
      ['all', 'unset'],
      ['position', 'absolute'],
      ['top', '50%'],
      ['transform', 'translateY(-50%)'],
      ['left', '50px'],
      ['display', 'none'],
      ['align-items', 'center'],
      ['justify-content', 'center'],
      ['gap', '6px'],
      ['max-width', 'min(220px, 48%)'],
      ['min-width', '0'],
      ['height', '26px'],
      ['padding', '0 10px'],
      ['white-space', 'nowrap'],
      ['overflow', 'hidden'],
      ['text-overflow', 'ellipsis'],
      ['box-sizing', 'border-box'],
      ['font-size', '13px'],
      ['font-family', INPUT_FONT_STACK],
      ['font-weight', '700'],
      ['line-height', '1'],
      ['letter-spacing', '0'],
      ['color', '#F8FAFC'],
      ['background', '#3B82F6'],
      ['border', '1px solid transparent'],
      ['border-radius', '9px'],
      ['box-shadow', '0 7px 16px rgba(59, 130, 246, 0.24)'],
      ['opacity', '1'],
      ['filter', 'blur(0px)'],
      ['transition', prefixTransition],
      ['will-change', 'transform, opacity, filter'],
      ['pointer-events', 'none'],
      ['z-index', '1'],
      ['user-select', 'none']
    ], useImportantStyles);
    container.appendChild(siteSearchPrefix);

    const siteSearchTabHint = applyNoTranslate(doc.createElement('span'));
    siteSearchTabHint.id = tabHintId;
    siteSearchTabHint.className = 'x-lumno-search-input-mode__tab-hint';
    siteSearchTabHint.setAttribute('aria-hidden', 'true');
    siteSearchTabHint.textContent = '';
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
    container.appendChild(siteSearchTabHint);

    function shouldReduceInputModeMotion() {
      return Boolean(
        win &&
        typeof win.matchMedia === 'function' &&
        win.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function getInputModePrefixVisual(theme, visualOptions) {
      const resolvedTheme = theme ? getThemeForMode(theme) : defaultTheme;
      const accentRgb = (resolvedTheme && (resolvedTheme.accentRgb || parseCssColor(resolvedTheme.accent))) ||
        defaultAccentColor;
      const isAi = Boolean(visualOptions && visualOptions.isAi);
      const isDark = Boolean(isDarkMode());
      if (isAi) {
        const alpha = isDark ? 0.18 : 0.1;
        return {
          background: `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${alpha})`,
          border: `1px solid rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${isDark ? 0.3 : 0.2})`,
          shadow: `0 6px 14px rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${isDark ? 0.2 : 0.1})`,
          color: isDark ? '#F8FAFC' : '#334155',
          caretColor: resolvedTheme && resolvedTheme.placeholderText
            ? resolvedTheme.placeholderText
            : rgbToCss(accentRgb)
        };
      }
      return {
        background: rgbToCss(accentRgb),
        border: '1px solid transparent',
        shadow: `0 7px 16px rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${isDark ? 0.34 : 0.24})`,
        color: '#F8FAFC',
        caretColor: resolvedTheme && resolvedTheme.placeholderText
          ? resolvedTheme.placeholderText
          : rgbToCss(accentRgb)
      };
    }

    function applyInputModePrefixVisual(theme, visualOptions) {
      const visual = getInputModePrefixVisual(theme, visualOptions);
      setStyle(siteSearchPrefix, 'background', visual.background, useImportantStyles);
      setStyle(siteSearchPrefix, 'border', visual.border, useImportantStyles);
      setStyle(siteSearchPrefix, 'box-shadow', visual.shadow, useImportantStyles);
      setStyle(siteSearchPrefix, 'color', visual.color, useImportantStyles);
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
      siteSearchPrefix.textContent = '';
      const iconUrl = contentOptions && contentOptions.iconUrl ? String(contentOptions.iconUrl || '').trim() : '';
      if (iconUrl) {
        const icon = doc.createElement('img');
        icon.alt = '';
        icon.decoding = 'async';
        icon.referrerPolicy = 'no-referrer';
        icon.style.cssText = cssText([
          ['all', 'unset'],
          ['width', '15px'],
          ['height', '15px'],
          ['border-radius', '4px'],
          ['object-fit', 'contain'],
          ['flex', '0 0 auto'],
          ['display', 'block']
        ], useImportantStyles);
        const removeUnavailableIcon = () => {
          icon.remove();
          updatePrefixLayout();
        };
        const iconHost = contentOptions && contentOptions.iconHost ? String(contentOptions.iconHost || '').trim() : '';
        let handledByProviderIconRuntime = false;
        if (attachProviderIcon) {
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
          if (attachFaviconData) {
            attachFaviconData(icon, iconUrl, iconHost);
          }
        }
        siteSearchPrefix.appendChild(icon);
      }
      const text = applyNoTranslate(doc.createElement('span'));
      text.textContent = prefixText;
      text.style.cssText = cssText([
        ['all', 'unset'],
        ['min-width', '0'],
        ['overflow', 'hidden'],
        ['text-overflow', 'ellipsis'],
        ['white-space', 'nowrap']
      ], useImportantStyles);
      siteSearchPrefix.appendChild(text);
    }

    function setInputModePrefixRestState(restOptions) {
      if (inputModePrefixAnimationFrame !== null && win && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(inputModePrefixAnimationFrame);
        inputModePrefixAnimationFrame = null;
      }
      const transitionEnabled = !restOptions || restOptions.transition !== false;
      setStyle(siteSearchPrefix, 'opacity', '1', useImportantStyles);
      setStyle(siteSearchPrefix, 'filter', 'blur(0px)', useImportantStyles);
      setStyle(siteSearchPrefix, 'transform', 'translateY(-50%)', useImportantStyles);
      setStyle(siteSearchPrefix, 'transition', transitionEnabled ? prefixTransition : 'none', useImportantStyles);
    }

    function playInputModePrefixEnterAnimation() {
      if (inputModePrefixAnimationFrame !== null && win && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(inputModePrefixAnimationFrame);
        inputModePrefixAnimationFrame = null;
      }
      if (shouldReduceInputModeMotion()) {
        setInputModePrefixRestState();
        return;
      }
      setStyle(siteSearchPrefix, 'transition', 'none', useImportantStyles);
      setStyle(siteSearchPrefix, 'opacity', '0', useImportantStyles);
      setStyle(siteSearchPrefix, 'filter', 'blur(4px)', useImportantStyles);
      setStyle(siteSearchPrefix, 'transform', 'translateY(-50%) translateX(-14px) scale(0.78)', useImportantStyles);
      void siteSearchPrefix.offsetWidth;
      inputModePrefixAnimationFrame = win.requestAnimationFrame(() => {
        inputModePrefixAnimationFrame = null;
        setStyle(siteSearchPrefix, 'transition', prefixTransition, useImportantStyles);
        setStyle(siteSearchPrefix, 'opacity', '1', useImportantStyles);
        setStyle(siteSearchPrefix, 'filter', 'blur(0px)', useImportantStyles);
        setStyle(siteSearchPrefix, 'transform', 'translateY(-50%) translateX(0) scale(1)', useImportantStyles);
      });
    }

    function setPrefixText(prefixText, theme, prefixOptions) {
      const nextOptions = prefixOptions || {};
      const shouldAnimate = Boolean(nextOptions.animate && nextOptions.isAi);
      if (!shouldAnimate) {
        setStyle(siteSearchPrefix, 'transition', 'none', useImportantStyles);
      }
      setInputModePrefixContent(prefixText, nextOptions);
      const visual = applyInputModePrefixVisual(theme, nextOptions);
      setStyle(siteSearchPrefix, 'display', 'inline-flex', useImportantStyles);
      if (!shouldAnimate) {
        setInputModePrefixRestState({ transition: false });
      }
      input.placeholder = '';
      setInputStyle(input, 'caret-color', visual.caretColor);
      updatePrefixLayout();
      if (shouldAnimate) {
        playInputModePrefixEnterAnimation();
      }
    }

    function setProviderPrefix(provider, theme, providerOptions) {
      const isAi = isAiSiteSearchProvider(provider);
      const nextOptions = {
        ...(providerOptions || {}),
        iconUrl: isAi ? getProviderIcon(provider) : '',
        iconHost: isAi ? getProviderThemeHost(provider) : '',
        provider,
        isAi
      };
      setPrefixText(getSiteSearchPrefixText(provider), theme, nextOptions);
    }

    function clearProviderPrefix() {
      siteSearchPrefix.textContent = '';
      setInputModePrefixRestState({ transition: false });
      setStyle(siteSearchPrefix, 'display', 'none', useImportantStyles);
      input.placeholder = getDefaultPlaceholder();
      setInputStyle(input, 'caret-color', defaultCaretColor);
      updatePrefixLayout();
    }

    function renderTabHint(provider) {
      const site = getSiteSearchDisplayName(provider);
      const explicitLabel = provider && provider.tabHintLabel
        ? String(provider.tabHintLabel).trim()
        : '';
      const label = explicitLabel ||
        formatMessage('site_search_tab_hint', '使用 {site} 搜索', { site });
      siteSearchTabHint.textContent = '';
      const keyLabel = applyNoTranslate(doc.createElement('span'));
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
      const textLabel = applyNoTranslate(doc.createElement('span'));
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
      siteSearchTabHint.appendChild(keyLabel);
      siteSearchTabHint.appendChild(textLabel);
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
      if (inputModePrefixAnimationFrame !== null && win && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(inputModePrefixAnimationFrame);
        inputModePrefixAnimationFrame = null;
      }
      if (win && typeof win.removeEventListener === 'function') {
        win.removeEventListener('resize', onResize);
      }
      if (layoutResizeObserver) {
        layoutResizeObserver.disconnect();
        layoutResizeObserver = null;
      }
      if (siteSearchPrefix && siteSearchPrefix.parentNode) {
        siteSearchPrefix.parentNode.removeChild(siteSearchPrefix);
      }
      if (siteSearchTabHint && siteSearchTabHint.parentNode) {
        siteSearchTabHint.parentNode.removeChild(siteSearchTabHint);
      }
    }

    return Object.freeze({
      prefixElement: siteSearchPrefix,
      tabHintElement: siteSearchTabHint,
      setProviderPrefix,
      setPrefixText,
      clearProviderPrefix,
      setTabHintVisible,
      updateLayout,
      destroy
    });
  }

  root.LumnoSearchInputMode = Object.freeze({
    createInputModeController
  });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
