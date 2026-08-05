(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSuggestionNavigation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const NUMBER_SHORTCUT_TIMEOUT_MS = 2000;
  const numberShortcutTimers = new WeakMap();

  function scrollItemIntoView(container, item, options) {
    if (!container || !item || !item.isConnected) {
      return;
    }
    const config = options || {};
    const direction = config.direction === 'down' ? 'down' : 'up';
    const inset = Number.isFinite(Number(config.inset)) ? Number(config.inset) : 8;

    if (config.didWrap) {
      container.scrollTop = direction === 'down'
        ? 0
        : container.scrollHeight;
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < containerRect.top + inset) {
      container.scrollTop -= (containerRect.top + inset) - itemRect.top;
    } else if (itemRect.bottom > containerRect.bottom - inset) {
      container.scrollTop += itemRect.bottom - (containerRect.bottom - inset);
    }
  }

  function getNumberShortcutTimeoutMs(options) {
    const configured = Number(options && options.timeoutMs);
    return Number.isFinite(configured) && configured > 0
      ? configured
      : NUMBER_SHORTCUT_TIMEOUT_MS;
  }

  function setNumberShortcutsActive(container, active, options) {
    if (!container) {
      return;
    }
    const pendingTimer = numberShortcutTimers.get(container);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      numberShortcutTimers.delete(container);
    }
    if (active) {
      container.setAttribute('data-number-shortcuts-active', 'true');
      const timeoutId = setTimeout(function() {
        numberShortcutTimers.delete(container);
        container.removeAttribute('data-number-shortcuts-active');
      }, getNumberShortcutTimeoutMs(options));
      numberShortcutTimers.set(container, timeoutId);
      return;
    }
    container.removeAttribute('data-number-shortcuts-active');
  }

  function cancelNumberShortcuts(container) {
    setNumberShortcutsActive(container, false);
  }

  function isNumberShortcutsActive(container) {
    return Boolean(
      container &&
      container.getAttribute('data-number-shortcuts-active') === 'true'
    );
  }

  function consumeNumberShortcutEvent(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function isNumberShortcutModeTrigger(event) {
    const key = String(event && event.key || '');
    const code = String(event && event.code || '');
    return Boolean(
      event &&
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      !event.altKey &&
      (code === 'Space' || key === ' ' || key === 'Spacebar')
    );
  }

  function handleNumberShortcutKeydown(event, items, container, options) {
    const rows = Array.isArray(items) ? items : [];
    if (!event) {
      return false;
    }
    if (isNumberShortcutModeTrigger(event)) {
      if (rows.length === 0) {
        return false;
      }
      consumeNumberShortcutEvent(event);
      if (!event.repeat) {
        setNumberShortcutsActive(container, true, options);
      }
      return true;
    }
    if (!isNumberShortcutsActive(container)) {
      return false;
    }
    const key = String(event.key || '');
    if (key === 'Escape') {
      cancelNumberShortcuts(container);
      consumeNumberShortcutEvent(event);
      return true;
    }
    const plainNumber = !event.metaKey && !event.ctrlKey &&
      !event.altKey && !event.shiftKey && /^[0-9]$/.test(key);
    if (!plainNumber) {
      cancelNumberShortcuts(container);
      return false;
    }
    const item = rows[Number(key)];
    cancelNumberShortcuts(container);
    consumeNumberShortcutEvent(event);
    if (!event.repeat && item && typeof item.click === 'function') {
      item.click();
    }
    return true;
  }

  function preventNumberShortcutWheel(event, container) {
    if (!event || !container ||
        container.getAttribute('data-number-shortcuts-active') !== 'true') {
      return false;
    }
    event.preventDefault();
    return true;
  }

  return {
    scrollItemIntoView,
    handleNumberShortcutKeydown,
    setNumberShortcutsActive,
    cancelNumberShortcuts,
    preventNumberShortcutWheel
  };
});
