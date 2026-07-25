(function(root) {
  const WRAP_CLASS = '_x_extension_select_wrap_2024_unique_';
  const CUSTOM_CLASS = '_x_extension_custom_select_2024_unique_';
  const AUTO_CLASS = '_x_extension_select_wrap_auto_2024_unique_';
  const ALIGN_LEFT_CLASS = '_x_extension_select_align_left_2024_unique_';
  const ALIGN_MIDDLE_CLASS = '_x_extension_select_align_middle_2024_unique_';
  const ALIGN_RIGHT_CLASS = '_x_extension_select_align_right_2024_unique_';
  const SELECT_CLASS = '_x_extension_select_2024_unique_';
  const TRIGGER_CLASS = '_x_extension_select_trigger_2024_unique_';
  const LABEL_CLASS = '_x_extension_select_label_2024_unique_';
  const MENU_CLASS = '_x_extension_select_menu_2024_unique_';
  const MENU_SURFACE_CLASS = '_x_extension_menu_surface_2024_unique_';
  const MENU_TITLE_CLASS = '_x_extension_select_menu_title_2024_unique_';
  const OPTION_CLASS = '_x_extension_select_option_2024_unique_';
  const OPTION_ICON_CLASS = '_x_extension_select_option_icon_2026_unique_';
  const OPTION_LABEL_CLASS = '_x_extension_select_option_label_2026_unique_';
  const ICON_CLASS = '_x_extension_select_icon_2024_unique_';
  const ACTION_HANDLER_PROPERTY = '__lumnoCustomSelectActionHandler';
  const PORTAL_ATTRIBUTE = 'data-menu-portal';
  const PORTAL_Z_INDEX_ATTRIBUTE = 'data-menu-portal-z-index';
  const PORTAL_OFFSET_ATTRIBUTE = 'data-menu-portal-offset';
  const PORTAL_ACTIVE_ATTRIBUTE = 'data-menu-portal-active';

  function getDocument(options) {
    return (options && options.documentObj) || root.document || null;
  }

  function getWindow(options) {
    return (options && options.windowObj) || root.window || root;
  }

  function getRequestAnimationFrame(windowObj) {
    if (windowObj && typeof windowObj.requestAnimationFrame === 'function') {
      return windowObj.requestAnimationFrame.bind(windowObj);
    }
    return (callback) => {
      if (typeof root.setTimeout === 'function') {
        root.setTimeout(callback, 0);
      } else {
        callback();
      }
    };
  }

  function appendClassName(base, extra) {
    const parts = String(base || '').split(/\s+/).filter(Boolean);
    String(extra || '').split(/\s+/).filter(Boolean).forEach((name) => {
      if (!parts.includes(name)) {
        parts.push(name);
      }
    });
    return parts.join(' ');
  }

  function normalizeAlign(value, fallback) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'left' || raw === 'right' || raw === 'middle') {
      return raw;
    }
    return fallback || 'right';
  }

  function getAlignClass(align) {
    if (align === 'left') {
      return ALIGN_LEFT_CLASS;
    }
    if (align === 'middle') {
      return ALIGN_MIDDLE_CLASS;
    }
    return ALIGN_RIGHT_CLASS;
  }

  function getOptionLabel(optionConfig) {
    if (!optionConfig) {
      return '';
    }
    return String(
      optionConfig.label ||
      optionConfig.text ||
      optionConfig.fallback ||
      optionConfig.value ||
      ''
    );
  }

  function normalizeCssLength(value) {
    if (value === undefined || value === null || value === '') {
      return '';
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0 ? `${value}px` : '';
    }
    const text = String(value).trim();
    return text || '';
  }

  function createSelect(options) {
    const config = options || {};
    const documentObj = getDocument(config);
    if (!documentObj) {
      return {};
    }
    const align = normalizeAlign(config.menuAlign || config.align, 'right');
    const wrapper = documentObj.createElement('div');
    const baseClassName = `${WRAP_CLASS} ${CUSTOM_CLASS} ${AUTO_CLASS} ${getAlignClass(align)}`;
    wrapper.className = appendClassName(baseClassName, config.className);
    if (config.id) {
      wrapper.id = String(config.id);
    }
    if (config.menuWidth) {
      wrapper.setAttribute('data-menu-width', String(config.menuWidth));
    }
    const menuMinWidth = normalizeCssLength(config.menuMinWidth);
    if (menuMinWidth) {
      wrapper.setAttribute('data-menu-min-width', menuMinWidth);
    }
    const menuMaxWidth = normalizeCssLength(config.menuMaxWidth);
    if (menuMaxWidth) {
      wrapper.setAttribute('data-menu-max-width', menuMaxWidth);
    }
    if (config.menuAlign || config.align) {
      wrapper.setAttribute('data-menu-align', align);
    }
    if (config.menuPortal) {
      wrapper.setAttribute(PORTAL_ATTRIBUTE, 'body');
    }
    if (config.menuPortalZIndex !== undefined && config.menuPortalZIndex !== null) {
      wrapper.setAttribute(PORTAL_Z_INDEX_ATTRIBUTE, String(config.menuPortalZIndex));
    }
    if (config.menuPortalOffset !== undefined && config.menuPortalOffset !== null) {
      wrapper.setAttribute(PORTAL_OFFSET_ATTRIBUTE, String(config.menuPortalOffset));
    }
    if (config.iconOnly) {
      wrapper.setAttribute('data-icon-only', 'true');
    }
    if (config.menuTitle) {
      wrapper.setAttribute('data-menu-title', String(config.menuTitle));
    }
    if (typeof config.onAction === 'function') {
      wrapper[ACTION_HANDLER_PROPERTY] = config.onAction;
    }

    const select = documentObj.createElement('select');
    select.className = SELECT_CLASS;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const selectId = config.selectId || (config.id ? `${config.id}_select` : '');
    if (selectId) {
      select.id = String(selectId);
      wrapper.setAttribute('data-select', String(selectId));
    }

    const selectedValue = config.value === undefined || config.value === null
      ? ''
      : String(config.value);
    setSelectOptions(select, config.options, selectedValue);

    const trigger = documentObj.createElement('button');
    trigger.type = 'button';
    trigger.className = TRIGGER_CLASS;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    if (config.ariaLabel) {
      trigger.setAttribute('aria-label', String(config.ariaLabel));
    }
    if (config.tooltip) {
      trigger.setAttribute('data-tooltip', String(config.tooltip));
    }

    const iconName = String(config.triggerIconClass || config.iconClass || 'ri-arrow-down-s-line');
    const icon = documentObj.createElement('i');
    icon.className = `${ICON_CLASS} ri-icon ri-size-16 ${iconName}`;
    icon.setAttribute('aria-hidden', 'true');
    trigger.appendChild(icon);

    const menu = documentObj.createElement('div');
    menu.className = appendClassName(`${MENU_CLASS} ${MENU_SURFACE_CLASS}`, config.menuClassName);
    menu.setAttribute('role', 'listbox');

    wrapper.appendChild(select);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    return { wrapper, select, trigger, menu };
  }

  function setSelectOptions(select, options, selectedValue) {
    if (!select) {
      return;
    }
    const items = Array.isArray(options) ? options : [];
    select.innerHTML = '';
    items.forEach((item) => {
      const option = select.ownerDocument.createElement('option');
      option.value = String(item && item.value !== undefined ? item.value : '');
      option.textContent = getOptionLabel(item);
      if (item && item.i18nKey) {
        option.setAttribute('data-i18n', String(item.i18nKey));
      }
      if (item && item.action) {
        option.setAttribute('data-action', String(item.action));
      }
      if (item && item.dividerBefore) {
        option.setAttribute('data-divider-before', 'true');
      }
      if (item && item.iconClass) {
        option.setAttribute('data-icon-class', String(item.iconClass));
      }
      select.appendChild(option);
    });
    if (selectedValue !== undefined && selectedValue !== null) {
      select.value = String(selectedValue);
    }
    if (select.selectedIndex < 0 && select.options.length > 0) {
      select.selectedIndex = 0;
    }
  }

  function createController(options) {
    const config = options || {};
    const documentObj = getDocument(config);
    const windowObj = getWindow(config);
    const requestFrame = getRequestAnimationFrame(windowObj);
    const boundWrappers = new WeakSet();
    const portalMenus = new WeakMap();
    let openCustomSelect = null;
    let documentEventsBound = false;
    let viewportEventsBound = false;

    function getWrappers(input) {
      if (!documentObj) {
        return [];
      }
      if (Array.isArray(input)) {
        return input.filter(Boolean);
      }
      if (input && typeof input.length === 'number' && typeof input !== 'string' && !input.nodeType) {
        return Array.from(input).filter(Boolean);
      }
      if (input && input.nodeType === 1) {
        return [input];
      }
      return Array.from(documentObj.querySelectorAll(`.${CUSTOM_CLASS}`));
    }

    function getCustomSelectElements(wrapper) {
      if (!wrapper) {
        return {};
      }
      const selectId = wrapper.getAttribute('data-select');
      const select = selectId
        ? (documentObj.getElementById(selectId) || wrapper.querySelector('select'))
        : wrapper.querySelector('select');
      const trigger = wrapper.querySelector(`.${TRIGGER_CLASS}`);
      const menu = wrapper.querySelector(`.${MENU_CLASS}`) || portalMenus.get(wrapper) || null;
      if (menu) {
        portalMenus.set(wrapper, menu);
      }
      return { select, trigger, menu };
    }

    function getMenuOptionItems(menu) {
      return menu ? Array.from(menu.querySelectorAll(`.${OPTION_CLASS}`)) : [];
    }

    function getCustomSelectMenuTitle(wrapper) {
      return wrapper ? String(wrapper.getAttribute('data-menu-title') || '') : '';
    }

    function appendCustomSelectMenuTitle(wrapper, menu) {
      const title = getCustomSelectMenuTitle(wrapper).trim();
      if (!title || !menu) {
        return;
      }
      const titleElement = documentObj.createElement('div');
      titleElement.className = MENU_TITLE_CLASS;
      titleElement.setAttribute('role', 'presentation');
      titleElement.textContent = title;
      menu.appendChild(titleElement);
    }

    function setCustomSelectActiveIndex(wrapper, nextIndex) {
      const { menu } = getCustomSelectElements(wrapper);
      if (!menu) {
        return;
      }
      const items = getMenuOptionItems(menu);
      if (items.length === 0) {
        return;
      }
      let index = Number.isFinite(nextIndex) ? nextIndex : 0;
      if (index < 0) {
        index = items.length - 1;
      }
      if (index >= items.length) {
        index = 0;
      }
      wrapper.setAttribute('data-active-index', String(index));
      items.forEach((item, itemIndex) => {
        if (itemIndex === index) {
          item.setAttribute('data-active', 'true');
        } else {
          item.removeAttribute('data-active');
        }
      });
    }

    function getCustomSelectActiveIndex(wrapper) {
      if (!wrapper) {
        return 0;
      }
      const raw = wrapper.getAttribute('data-active-index');
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function getCustomSelectMenuWidthMode(wrapper) {
      const raw = wrapper
        ? String(wrapper.getAttribute('data-menu-width') || '').trim().toLowerCase()
        : '';
      if (raw === 'content' || raw === 'trigger') {
        return raw;
      }
      return 'auto';
    }

    function getCustomSelectMenuMinWidth(wrapper) {
      return wrapper ? String(wrapper.getAttribute('data-menu-min-width') || '').trim() : '';
    }

    function getCustomSelectMenuMaxWidth(wrapper) {
      return wrapper ? String(wrapper.getAttribute('data-menu-max-width') || '').trim() : '';
    }

    function isCustomSelectPortalEnabled(wrapper) {
      return Boolean(wrapper && wrapper.getAttribute(PORTAL_ATTRIBUTE) === 'body');
    }

    function getCustomSelectPortalNumber(wrapper, attributeName, fallback) {
      const value = Number(wrapper ? wrapper.getAttribute(attributeName) : NaN);
      return Number.isFinite(value) ? value : fallback;
    }

    function getCustomSelectViewportTopInset(wrapper, fallback) {
      if (typeof config.getViewportTopInset !== 'function') {
        return fallback;
      }
      const value = Number(config.getViewportTopInset(wrapper));
      return Number.isFinite(value) ? Math.max(fallback, value) : fallback;
    }

    function setStyleProperty(element, name, value) {
      if (!element || !element.style || typeof element.style.setProperty !== 'function') {
        return;
      }
      element.style.setProperty(name, value);
    }

    function removeStyleProperty(element, name) {
      if (!element || !element.style || typeof element.style.removeProperty !== 'function') {
        return;
      }
      element.style.removeProperty(name);
    }

    function attachCustomSelectPortalMenu(wrapper, menu) {
      if (!isCustomSelectPortalEnabled(wrapper) || !menu || !documentObj || !documentObj.body) {
        return false;
      }
      portalMenus.set(wrapper, menu);
      if (menu.parentNode !== documentObj.body) {
        if (menu.parentNode && typeof menu.parentNode.removeChild === 'function') {
          menu.parentNode.removeChild(menu);
        }
        documentObj.body.appendChild(menu);
      }
      menu.setAttribute(PORTAL_ACTIVE_ATTRIBUTE, 'true');
      return true;
    }

    function restoreCustomSelectPortalMenu(wrapper, menu) {
      if (!isCustomSelectPortalEnabled(wrapper) || !menu || !wrapper) {
        return;
      }
      if (menu.parentNode !== wrapper) {
        if (menu.parentNode && typeof menu.parentNode.removeChild === 'function') {
          menu.parentNode.removeChild(menu);
        }
        wrapper.appendChild(menu);
      }
      menu.removeAttribute(PORTAL_ACTIVE_ATTRIBUTE);
      removeStyleProperty(menu, 'position');
      removeStyleProperty(menu, 'left');
      removeStyleProperty(menu, 'right');
      removeStyleProperty(menu, 'top');
      removeStyleProperty(menu, 'z-index');
    }

    function getCustomSelectMenuAlign(wrapper, alignOptions) {
      const settings = alignOptions || {};
      const raw = wrapper
        ? String(wrapper.getAttribute('data-menu-align') || '').trim().toLowerCase()
        : '';
      if (raw === 'left' || raw === 'right' || raw === 'middle') {
        return raw;
      }
      if (settings.preferRight) {
        return 'right';
      }
      if (wrapper && wrapper.classList.contains(ALIGN_LEFT_CLASS)) {
        return 'left';
      }
      if (wrapper && wrapper.classList.contains(ALIGN_MIDDLE_CLASS)) {
        return 'middle';
      }
      return 'right';
    }

    function applyCustomSelectMenuAlign(wrapper, menu, align) {
      if (!menu) {
        return 'right';
      }
      const nextAlign = align || getCustomSelectMenuAlign(wrapper);
      if (wrapper) {
        wrapper.setAttribute('data-menu-align-current', nextAlign);
      }
      if (nextAlign === 'left') {
        menu.style.left = '0';
        menu.style.right = 'auto';
        return nextAlign;
      }
      if (nextAlign === 'middle') {
        menu.style.left = '50%';
        menu.style.right = 'auto';
        return nextAlign;
      }
      menu.style.left = 'auto';
      menu.style.right = '0';
      return nextAlign;
    }

    function updateCustomSelectPortalPlacement(wrapper) {
      if (!wrapper || !isCustomSelectPortalEnabled(wrapper) ||
          wrapper.getAttribute('data-open') !== 'true') {
        return;
      }
      const { trigger, menu } = getCustomSelectElements(wrapper);
      if (!trigger || !menu || !attachCustomSelectPortalMenu(wrapper, menu)) {
        return;
      }
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = Math.max(
        0,
        (windowObj && windowObj.innerWidth) ||
          (documentObj.documentElement && documentObj.documentElement.clientWidth) ||
          0
      );
      const viewportHeight = Math.max(
        0,
        (windowObj && windowObj.innerHeight) ||
          (documentObj.documentElement && documentObj.documentElement.clientHeight) ||
          0
      );
      const padding = 8;
      const viewportTopInset = getCustomSelectViewportTopInset(wrapper, padding);
      const offset = getCustomSelectPortalNumber(wrapper, PORTAL_OFFSET_ATTRIBUTE, 6);
      const menuWidth = Math.max(
        Number(menuRect && menuRect.width) || 0,
        Number.parseFloat(menu.style.width) || 0,
        Number.parseFloat(menu.style.minWidth) || 0,
        Number(triggerRect && triggerRect.width) || 0
      );
      const menuHeight = Math.max(Number(menuRect && menuRect.height) || 0, 0);
      const align = getCustomSelectMenuAlign(wrapper);
      let left = Number(triggerRect.left) || 0;
      if (align === 'right') {
        left = (Number(triggerRect.right) || left) - menuWidth;
      } else if (align === 'middle') {
        left = left + ((Number(triggerRect.width) || 0) / 2) - (menuWidth / 2);
      }
      if (viewportWidth > 0) {
        left = Math.max(padding, Math.min(left, viewportWidth - menuWidth - padding));
      } else {
        left = Math.max(padding, left);
      }
      let top = (Number(triggerRect.bottom) || 0) + offset;
      if (viewportHeight > 0 &&
          menuHeight > 0 &&
          top + menuHeight > viewportHeight - padding &&
          (Number(triggerRect.top) || 0) - offset - menuHeight >= viewportTopInset) {
        top = (Number(triggerRect.top) || 0) - offset - menuHeight;
      }
      if (viewportHeight > 0 && menuHeight > 0) {
        const maxTop = viewportHeight - menuHeight - padding;
        top = Math.max(viewportTopInset, Math.min(top, maxTop));
      } else {
        top = Math.max(viewportTopInset, top);
      }
      setStyleProperty(menu, 'position', 'fixed');
      setStyleProperty(menu, 'left', `${Math.round(left)}px`);
      setStyleProperty(menu, 'right', 'auto');
      setStyleProperty(menu, 'top', `${Math.round(top)}px`);
      setStyleProperty(
        menu,
        'z-index',
        String(Math.round(getCustomSelectPortalNumber(wrapper, PORTAL_Z_INDEX_ATTRIBUTE, 10000)))
      );
    }

    function setCustomSelectEffectiveMenuWidth(wrapper, widthMode) {
      if (wrapper) {
        wrapper.setAttribute('data-menu-width-current', widthMode);
      }
    }

    function applyCustomSelectMenuSurfaceContentWidth(menu, minWidth, maxWidth) {
      if (!menu) {
        return;
      }
      if (root.LumnoMenuSurface && typeof root.LumnoMenuSurface.applyContentWidth === 'function') {
        root.LumnoMenuSurface.applyContentWidth(menu, {
          minWidth: minWidth || '0',
          maxWidth: maxWidth || 'calc(100vw - 32px)'
        });
        return;
      }
      if (menu.classList && typeof menu.classList.add === 'function') {
        menu.classList.add(MENU_SURFACE_CLASS);
      }
      menu.setAttribute('data-menu-surface-width', 'content');
      menu.style.setProperty('--x-extension-menu-surface-min-width', minWidth || '0');
      menu.style.setProperty('--x-extension-menu-surface-max-width', maxWidth || 'calc(100vw - 32px)');
    }

    function clearCustomSelectMenuSurfaceContentWidth(menu) {
      if (!menu) {
        return;
      }
      if (root.LumnoMenuSurface && typeof root.LumnoMenuSurface.clearContentWidth === 'function') {
        root.LumnoMenuSurface.clearContentWidth(menu);
        return;
      }
      menu.removeAttribute('data-menu-surface-width');
      menu.style.removeProperty('--x-extension-menu-surface-min-width');
      menu.style.removeProperty('--x-extension-menu-surface-max-width');
    }

    function applyCustomSelectMenuSurface(menu) {
      if (!menu) {
        return;
      }
      if (root.LumnoMenuSurface && typeof root.LumnoMenuSurface.apply === 'function') {
        root.LumnoMenuSurface.apply(menu);
        return;
      }
      if (menu.classList && typeof menu.classList.add === 'function') {
        menu.classList.add(MENU_SURFACE_CLASS);
      }
    }

    function applyCustomSelectTriggerMenuWidth(wrapper, menu, width, align) {
      setCustomSelectEffectiveMenuWidth(wrapper, 'trigger');
      applyCustomSelectMenuAlign(wrapper, menu, align);
      clearCustomSelectMenuSurfaceContentWidth(menu);
      menu.style.minWidth = `${width}px`;
      menu.style.width = `${width}px`;
      menu.style.maxWidth = '';
    }

    function applyCustomSelectContentMenuWidth(wrapper, menu, align) {
      setCustomSelectEffectiveMenuWidth(wrapper, 'content');
      applyCustomSelectMenuAlign(wrapper, menu, align);
      menu.style.minWidth = '';
      menu.style.width = '';
      menu.style.maxWidth = '';
      applyCustomSelectMenuSurfaceContentWidth(
        menu,
        getCustomSelectMenuMinWidth(wrapper),
        getCustomSelectMenuMaxWidth(wrapper)
      );
    }

    function getHorizontalBoxSpace(element) {
      if (!element || !windowObj || typeof windowObj.getComputedStyle !== 'function') {
        return 0;
      }
      const style = windowObj.getComputedStyle(element);
      return (Number.parseFloat(style.paddingLeft) || 0) +
        (Number.parseFloat(style.paddingRight) || 0) +
        (Number.parseFloat(style.borderLeftWidth) || 0) +
        (Number.parseFloat(style.borderRightWidth) || 0);
    }

    function measureTextWidth(element) {
      if (!element || !element.ownerDocument || !element.childNodes || element.childNodes.length === 0) {
        return 0;
      }
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      if (typeof range.detach === 'function') {
        range.detach();
      }
      return Math.ceil(rect.width || 0);
    }

    function getCustomSelectContentMetrics(menu) {
      const metrics = {
        naturalMenuWidth: 0
      };
      if (!menu) {
        return metrics;
      }
      const menuBoxSpace = getHorizontalBoxSpace(menu);
      Array.from(menu.children).forEach((item) => {
        const textWidth = measureTextWidth(item);
        const itemWidth = textWidth + getHorizontalBoxSpace(item);
        metrics.naturalMenuWidth = Math.max(metrics.naturalMenuWidth, itemWidth + menuBoxSpace);
      });
      return metrics;
    }

    function updateCustomSelectMenuWidth(wrapper) {
      const { menu, trigger } = getCustomSelectElements(wrapper);
      if (!menu || !trigger) {
        return;
      }
      const widthMode = getCustomSelectMenuWidthMode(wrapper);
      if (widthMode === 'content') {
        applyCustomSelectContentMenuWidth(
          wrapper,
          menu,
          getCustomSelectMenuAlign(wrapper, { preferRight: true })
        );
        return;
      }
      const triggerRect = trigger.getBoundingClientRect();
      const baseWidth = Math.round(triggerRect.width);
      if (!Number.isFinite(baseWidth) || baseWidth <= 0) {
        return;
      }
      applyCustomSelectTriggerMenuWidth(wrapper, menu, baseWidth, getCustomSelectMenuAlign(wrapper));

      if (widthMode === 'trigger') {
        return;
      }

      const contentMetrics = getCustomSelectContentMetrics(menu);
      if (contentMetrics.naturalMenuWidth > baseWidth + 1) {
        applyCustomSelectContentMenuWidth(
          wrapper,
          menu,
          getCustomSelectMenuAlign(wrapper, { preferRight: true })
        );
      }
    }

    function closeCustomSelect() {
      if (!openCustomSelect) {
        return;
      }
      const closingSelect = openCustomSelect;
      const { menu } = getCustomSelectElements(closingSelect);
      openCustomSelect.setAttribute('data-open', 'false');
      const trigger = openCustomSelect.querySelector(`.${TRIGGER_CLASS}`);
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
      if (menu) {
        menu.setAttribute('data-open', 'false');
        restoreCustomSelectPortalMenu(closingSelect, menu);
      }
      openCustomSelect = null;
    }

    function setCustomSelectOpen(wrapper, nextOpen) {
      if (!wrapper) {
        return;
      }
      if (nextOpen) {
        if (typeof config.onBeforeOpen === 'function') {
          config.onBeforeOpen(wrapper);
        }
        if (openCustomSelect && openCustomSelect !== wrapper) {
          closeCustomSelect();
        }
        wrapper.setAttribute('data-open', 'true');
        const trigger = wrapper.querySelector(`.${TRIGGER_CLASS}`);
        if (trigger) {
          trigger.setAttribute('aria-expanded', 'true');
        }
        const { select, menu } = getCustomSelectElements(wrapper);
        if (select && menu) {
          const selectedIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
          setCustomSelectActiveIndex(wrapper, selectedIndex);
        }
        if (menu && isCustomSelectPortalEnabled(wrapper)) {
          attachCustomSelectPortalMenu(wrapper, menu);
          updateCustomSelectMenuWidth(wrapper);
          updateCustomSelectPortalPlacement(wrapper);
          menu.setAttribute('data-open', 'true');
        }
        requestFrame(() => {
          updateCustomSelectMenuWidth(wrapper);
          updateCustomSelectPortalPlacement(wrapper);
        });
        openCustomSelect = wrapper;
      } else if (openCustomSelect === wrapper) {
        closeCustomSelect();
      }
    }

    function syncCustomSelectUI(select, wrapper) {
      if (!select || !wrapper) {
        return;
      }
      const { trigger, menu } = getCustomSelectElements(wrapper);
      if (!trigger || !menu) {
        return;
      }
      const selected = select.options[select.selectedIndex];
      const label = selected ? (selected.label || selected.textContent || '') : '';
      let labelEl = trigger.querySelector(`.${LABEL_CLASS}`);
      if (!labelEl) {
        labelEl = documentObj.createElement('span');
        labelEl.className = LABEL_CLASS;
        trigger.insertBefore(labelEl, trigger.firstChild);
      }
      labelEl.textContent = label;
      getMenuOptionItems(menu).forEach((item) => {
        const value = item.getAttribute('data-value');
        const isSelected = !item.getAttribute('data-action') && value === select.value;
        item.setAttribute('data-selected', isSelected ? 'true' : 'false');
        item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
      if (wrapper.getAttribute('data-icon-only') === 'true') {
        labelEl.setAttribute('aria-hidden', 'true');
      } else {
        labelEl.removeAttribute('aria-hidden');
      }
    }

    function buildCustomSelectMenu(select, wrapper) {
      if (!select || !wrapper) {
        return;
      }
      const { menu } = getCustomSelectElements(wrapper);
      if (!menu) {
        return;
      }
      applyCustomSelectMenuSurface(menu);
      menu.innerHTML = '';
      appendCustomSelectMenuTitle(wrapper, menu);
      Array.from(select.options).forEach((option) => {
        const item = documentObj.createElement('div');
        const action = String(option.getAttribute('data-action') || '');
        const iconClass = String(option.getAttribute('data-icon-class') || '');
        item.className = OPTION_CLASS;
        item.setAttribute('role', 'option');
        item.setAttribute('data-value', option.value);
        if (action) {
          item.setAttribute('data-action', action);
        }
        if (option.getAttribute('data-divider-before') === 'true') {
          item.setAttribute('data-divider-before', 'true');
        }
        if (iconClass) {
          const icon = documentObj.createElement('i');
          icon.className = `${OPTION_ICON_CLASS} ri-icon ri-size-16 ${iconClass}`;
          icon.setAttribute('aria-hidden', 'true');
          item.appendChild(icon);
        }
        const label = documentObj.createElement('span');
        label.className = OPTION_LABEL_CLASS;
        label.textContent = option.label || option.textContent || '';
        item.appendChild(label);
        item.addEventListener('click', () => {
          if (action) {
            setCustomSelectOpen(wrapper, false);
            const actionHandler = wrapper[ACTION_HANDLER_PROPERTY];
            if (typeof actionHandler === 'function') {
              actionHandler({
                action,
                value: option.value,
                option,
                select,
                wrapper
              });
            }
            return;
          }
          if (select.value !== option.value) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          syncCustomSelectUI(select, wrapper);
          setCustomSelectOpen(wrapper, false);
        });
        menu.appendChild(item);
      });
      syncCustomSelectUI(select, wrapper);
      updateCustomSelectMenuWidth(wrapper);
      updateCustomSelectPortalPlacement(wrapper);
    }

    function bindWrapper(wrapper) {
      if (!wrapper || boundWrappers.has(wrapper)) {
        return;
      }
      const { select, trigger } = getCustomSelectElements(wrapper);
      if (!select || !trigger) {
        return;
      }
      boundWrappers.add(wrapper);
      trigger.addEventListener('click', () => {
        const isOpen = wrapper.getAttribute('data-open') === 'true';
        setCustomSelectOpen(wrapper, !isOpen);
      });
      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setCustomSelectOpen(wrapper, true);
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = getCustomSelectActiveIndex(wrapper) + delta;
          setCustomSelectActiveIndex(wrapper, nextIndex);
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const isOpen = wrapper.getAttribute('data-open') === 'true';
          if (!isOpen) {
            setCustomSelectOpen(wrapper, true);
            return;
          }
          const { menu } = getCustomSelectElements(wrapper);
          const activeIndex = getCustomSelectActiveIndex(wrapper);
          const items = getMenuOptionItems(menu);
          const item = items[activeIndex] || null;
          if (item) {
            item.click();
          }
        }
      });
      select.addEventListener('change', () => {
        syncCustomSelectUI(select, wrapper);
      });
    }

    function bindDocumentEvents() {
      if (!documentObj || documentEventsBound) {
        return;
      }
      documentEventsBound = true;
      documentObj.addEventListener('click', (event) => {
        if (!openCustomSelect) {
          return;
        }
        if (openCustomSelect.contains(event.target)) {
          return;
        }
        closeCustomSelect();
      });
      documentObj.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeCustomSelect();
        }
        if (!openCustomSelect) {
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = getCustomSelectActiveIndex(openCustomSelect) + delta;
          setCustomSelectActiveIndex(openCustomSelect, nextIndex);
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const { menu } = getCustomSelectElements(openCustomSelect);
          const activeIndex = getCustomSelectActiveIndex(openCustomSelect);
          const items = getMenuOptionItems(menu);
          const item = items[activeIndex] || null;
          if (item) {
            item.click();
          }
        }
      });
    }

    function bindViewportEvents() {
      if (viewportEventsBound || !windowObj || typeof windowObj.addEventListener !== 'function') {
        return;
      }
      viewportEventsBound = true;
      windowObj.addEventListener('resize', () => {
        updateCustomSelectPortalPlacement(openCustomSelect);
      });
      windowObj.addEventListener('scroll', () => {
        updateCustomSelectPortalPlacement(openCustomSelect);
      }, true);
    }

    function refresh(wrappers) {
      const targets = getWrappers(wrappers);
      targets.forEach((wrapper) => {
        const { select } = getCustomSelectElements(wrapper);
        if (!select) {
          return;
        }
        bindWrapper(wrapper);
        buildCustomSelectMenu(select, wrapper);
      });
      bindDocumentEvents();
      bindViewportEvents();
      if (typeof config.afterRefresh === 'function') {
        config.afterRefresh();
      }
    }

    function setOptions(wrapper, optionsList, selectedValue) {
      const { select } = getCustomSelectElements(wrapper);
      if (!select) {
        return;
      }
      setSelectOptions(select, optionsList, selectedValue);
      bindWrapper(wrapper);
      buildCustomSelectMenu(select, wrapper);
    }

    function setMenuTitle(wrapper, title) {
      if (!wrapper) {
        return;
      }
      const nextTitle = String(title || '');
      if (nextTitle) {
        wrapper.setAttribute('data-menu-title', nextTitle);
      } else {
        wrapper.removeAttribute('data-menu-title');
      }
      const { select } = getCustomSelectElements(wrapper);
      if (select) {
        buildCustomSelectMenu(select, wrapper);
      }
    }

    function createManagedSelect(selectOptions) {
      const created = createSelect({
        documentObj,
        ...(selectOptions || {})
      });
      if (created.wrapper) {
        bindWrapper(created.wrapper);
        buildCustomSelectMenu(created.select, created.wrapper);
        bindDocumentEvents();
        bindViewportEvents();
      }
      return created;
    }

    return {
      close: closeCustomSelect,
      createSelect: createManagedSelect,
      getElements: getCustomSelectElements,
      isOpen: (wrapper) => wrapper
        ? wrapper.getAttribute('data-open') === 'true'
        : Boolean(openCustomSelect),
      refresh,
      setOpen: setCustomSelectOpen,
      setMenuTitle,
      setOptions,
      sync: (wrapper) => {
        const { select } = getCustomSelectElements(wrapper);
        syncCustomSelectUI(select, wrapper);
      },
      updateMenuWidth: updateCustomSelectMenuWidth
    };
  }

  root.LumnoCustomSelect = {
    createController,
    createSelect,
    classes: {
      wrap: WRAP_CLASS,
      custom: CUSTOM_CLASS,
      trigger: TRIGGER_CLASS,
      menu: MENU_CLASS,
      menuTitle: MENU_TITLE_CLASS,
      option: OPTION_CLASS,
      optionIcon: OPTION_ICON_CLASS,
      optionLabel: OPTION_LABEL_CLASS,
      label: LABEL_CLASS,
      select: SELECT_CLASS
    }
  };
})(globalThis);
