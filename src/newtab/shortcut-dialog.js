(function(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoNewtabShortcutDialog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';

  const MODE_ADD = 'add';
  const MODE_EDIT = 'edit';
  const DEFAULT_CLOSE_DELAY_MS = 180;
  const DEFAULT_ID_PREFIX = '_x_extension_newtab_shortcut_dialog_2026_unique_';

  function noop() {}

  function getOption(options, key, fallback) {
    if (options && Object.prototype.hasOwnProperty.call(options, key)) {
      return options[key];
    }
    return fallback;
  }

  function getFunction(options, key, fallback) {
    const value = getOption(options, key, fallback || noop);
    return typeof value === 'function' ? value : (fallback || noop);
  }

  function normalizeMode(mode, shortcut) {
    return mode === MODE_EDIT && shortcut ? MODE_EDIT : MODE_ADD;
  }

  function clampEnterOffset(value, limit) {
    const raw = Number(value);
    const max = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 28;
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return Math.max(-max, Math.min(max, raw));
  }

  function getEnterOffset(sourceCenter, targetCenter) {
    const delta = Number(sourceCenter) - Number(targetCenter);
    if (!Number.isFinite(delta) || Math.abs(delta) < 4) {
      return 0;
    }
    const offset = clampEnterOffset(delta * 0.12, 28);
    if (Math.abs(offset) < 6) {
      return delta < 0 ? -6 : 6;
    }
    return offset;
  }

  function focusElement(element) {
    if (!element || typeof element.focus !== 'function') {
      return;
    }
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  function createShortcutDialog(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const documentObj = getOption(opts, 'documentObj', root.document);
    const windowObj = getOption(opts, 'windowObj', root.window || root);
    if (!documentObj || typeof documentObj.createElement !== 'function') {
      return null;
    }

    const t = getFunction(opts, 't', function(key, fallback) {
      return fallback || key || '';
    });
    const onSubmit = getFunction(opts, 'onSubmit', function() {
      return Promise.resolve(false);
    });
    const prepareIconFile = getFunction(opts, 'prepareIconFile', function() {
      return Promise.reject(new Error('Shortcut icon processing is unavailable.'));
    });
    const getRiSvg = getFunction(opts, 'getRiSvg', function(id, sizeClass) {
      return `<i class="ri-icon ${sizeClass || 'ri-size-16'} ${id}" aria-hidden="true"></i>`;
    });
    const bindTooltip = getFunction(opts, 'bindTooltip', noop);
    const hideTooltip = getFunction(opts, 'hideTooltip', noop);
    const closeDelayMs = Number.isFinite(Number(opts.closeDelayMs))
      ? Math.max(0, Number(opts.closeDelayMs))
      : DEFAULT_CLOSE_DELAY_MS;
    const idPrefix = String(opts.idPrefix || DEFAULT_ID_PREFIX);
    const requestFrame = typeof windowObj.requestAnimationFrame === 'function'
      ? windowObj.requestAnimationFrame.bind(windowObj)
      : (callback) => windowObj.setTimeout(callback, 0);
    const cancelFrame = typeof windowObj.cancelAnimationFrame === 'function'
      ? windowObj.cancelAnimationFrame.bind(windowObj)
      : windowObj.clearTimeout.bind(windowObj);
    const setTimer = windowObj.setTimeout.bind(windowObj);
    const clearTimer = windowObj.clearTimeout.bind(windowObj);

    let mode = MODE_ADD;
    let editingId = '';
    let previousFocus = null;
    let openFrame = 0;
    let closeTimer = 0;
    let busy = false;
    let iconBusy = false;
    let iconAction = 'keep';
    let iconDataUrl = '';
    let iconRequestId = 0;
    let destroyed = false;

    const backdrop = documentObj.createElement('div');
    backdrop.className = 'x-nt-shortcut-dialog-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('data-open', 'false');

    const dialog = documentObj.createElement('div');
    dialog.className = 'x-nt-shortcut-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const form = documentObj.createElement('form');
    form.className = 'x-nt-shortcut-form';

    const title = documentObj.createElement('h2');
    title.id = `${idPrefix}_title`;
    title.className = 'x-nt-shortcut-dialog-title';
    dialog.setAttribute('aria-labelledby', title.id);

    const nameField = documentObj.createElement('label');
    nameField.className = 'x-nt-shortcut-field';
    const nameLabel = documentObj.createElement('span');
    const nameInputShell = documentObj.createElement('div');
    nameInputShell.className = '_x_extension_shortcut_input_affix_2026_unique_';
    nameInputShell.setAttribute('data-has-prefix', 'false');
    const nameInput = documentObj.createElement('input');
    nameInput.type = 'text';
    nameInput.autocomplete = 'off';
    nameInput.maxLength = 64;
    nameInput.className = '_x_extension_shortcut_input_2024_unique_';
    nameInputShell.appendChild(nameInput);
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInputShell);

    const urlField = documentObj.createElement('label');
    urlField.className = 'x-nt-shortcut-field';
    const urlLabel = documentObj.createElement('span');
    const urlInputShell = documentObj.createElement('div');
    urlInputShell.className = '_x_extension_shortcut_input_affix_2026_unique_';
    urlInputShell.setAttribute('data-has-prefix', 'false');
    const urlInput = documentObj.createElement('input');
    urlInput.type = 'text';
    urlInput.inputMode = 'url';
    urlInput.autocomplete = 'url';
    urlInput.required = true;
    urlInput.className = '_x_extension_shortcut_input_2024_unique_';
    urlInputShell.appendChild(urlInput);
    urlField.appendChild(urlLabel);
    urlField.appendChild(urlInputShell);

    const iconField = documentObj.createElement('div');
    iconField.className = 'x-nt-shortcut-field x-nt-shortcut-icon-field';
    const iconLabelRow = documentObj.createElement('div');
    iconLabelRow.className = 'x-nt-shortcut-icon-label-row';
    const iconLabel = documentObj.createElement('span');
    const iconInfoButton = documentObj.createElement('button');
    iconInfoButton.type = 'button';
    iconInfoButton.className = 'x-nt-appearance-info-button x-nt-shortcut-icon-info';
    iconInfoButton.innerHTML = getRiSvg('ri-information-line', 'ri-size-14');
    const iconInfoDescription = documentObj.createElement('span');
    iconInfoDescription.id = `${idPrefix}_icon_info`;
    iconInfoDescription.className = 'x-nt-shortcut-visually-hidden';
    iconInfoButton.setAttribute('aria-describedby', iconInfoDescription.id);
    iconLabelRow.appendChild(iconLabel);
    iconLabelRow.appendChild(iconInfoButton);

    const iconControl = documentObj.createElement('div');
    iconControl.className = 'x-nt-shortcut-icon-control';
    const iconUploadTile = documentObj.createElement('div');
    iconUploadTile.className = [
      'x-nt-wallpaper-tile',
      'x-nt-wallpaper-upload-tile',
      'x-nt-wallpaper-custom-tile',
      'x-nt-shortcut-icon-upload-tile'
    ].join(' ');
    iconUploadTile.setAttribute('role', 'button');
    iconUploadTile.setAttribute('tabindex', '0');
    iconUploadTile.setAttribute('data-upload', 'true');
    iconUploadTile.setAttribute('data-loading', 'false');
    iconUploadTile.setAttribute('data-has-icon', 'false');
    iconUploadTile.setAttribute('aria-disabled', 'false');
    const iconPreview = documentObj.createElement('span');
    iconPreview.className = [
      'x-nt-wallpaper-thumb',
      'x-nt-wallpaper-upload-thumb',
      'x-nt-shortcut-icon-preview'
    ].join(' ');
    const iconPreviewImage = documentObj.createElement('img');
    iconPreviewImage.className = 'x-nt-shortcut-icon-preview-image';
    iconPreviewImage.alt = '';
    iconPreviewImage.draggable = false;
    const iconPreviewPlaceholder = documentObj.createElement('span');
    iconPreviewPlaceholder.className = 'x-nt-wallpaper-upload-placeholder x-nt-shortcut-icon-placeholder';
    iconPreviewPlaceholder.innerHTML = getRiSvg('ri-add-large-line', 'ri-size-18');
    iconPreview.appendChild(iconPreviewImage);
    iconPreview.appendChild(iconPreviewPlaceholder);

    const iconRemoveButton = documentObj.createElement('button');
    iconRemoveButton.type = 'button';
    iconRemoveButton.className = 'x-nt-wallpaper-delete-button x-nt-shortcut-icon-remove';
    iconRemoveButton.innerHTML = getRiSvg('ri-subtract-line', 'ri-size-14');
    iconRemoveButton.hidden = true;
    const iconInput = documentObj.createElement('input');
    iconInput.type = 'file';
    iconInput.accept = 'image/png,image/jpeg,image/webp';
    iconInput.className = 'x-nt-shortcut-icon-input';
    iconInput.tabIndex = -1;
    iconUploadTile.appendChild(iconPreview);
    iconUploadTile.appendChild(iconRemoveButton);
    iconControl.appendChild(iconUploadTile);
    iconControl.appendChild(iconInput);

    const iconError = documentObj.createElement('div');
    iconError.id = `${idPrefix}_icon_error`;
    iconError.className = 'x-nt-shortcut-icon-error';
    iconError.setAttribute('data-visible', 'false');
    iconError.setAttribute('role', 'alert');
    iconError.setAttribute('aria-live', 'polite');
    iconUploadTile.setAttribute('aria-describedby', `${iconInfoDescription.id} ${iconError.id}`);
    iconInput.setAttribute('aria-describedby', `${iconInfoDescription.id} ${iconError.id}`);
    iconField.appendChild(iconLabelRow);
    iconField.appendChild(iconControl);
    iconField.appendChild(iconInfoDescription);
    iconField.appendChild(iconError);

    const error = documentObj.createElement('div');
    error.id = `${idPrefix}_error`;
    error.className = 'x-nt-shortcut-error';
    error.setAttribute('data-visible', 'false');
    error.setAttribute('role', 'alert');
    error.setAttribute('aria-live', 'polite');
    urlInput.setAttribute('aria-describedby', error.id);

    const actions = documentObj.createElement('div');
    actions.className = 'x-nt-shortcut-dialog-actions';
    const cancelButton = documentObj.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'x-lumno-action-button x-lumno-action-button--secondary x-nt-shortcut-dialog-button x-nt-shortcut-dialog-button--secondary';
    const doneButton = documentObj.createElement('button');
    doneButton.type = 'submit';
    doneButton.className = 'x-lumno-action-button x-lumno-action-button--primary x-nt-shortcut-dialog-button x-nt-shortcut-dialog-button--primary';
    actions.appendChild(cancelButton);
    actions.appendChild(doneButton);

    form.appendChild(title);
    form.appendChild(nameField);
    form.appendChild(urlField);
    form.appendChild(iconField);
    form.appendChild(error);
    form.appendChild(actions);
    dialog.appendChild(form);
    backdrop.appendChild(dialog);

    const focusableElements = [
      nameInput,
      urlInput,
      iconInfoButton,
      iconUploadTile,
      iconRemoveButton,
      cancelButton,
      doneButton
    ];

    function getState() {
      return Object.freeze({
        mode,
        editingId,
        open: !backdrop.hidden && backdrop.getAttribute('data-open') === 'true',
        busy
      });
    }

    function setError(message) {
      const text = String(message || '').trim();
      error.textContent = text;
      error.setAttribute('data-visible', text ? 'true' : 'false');
      urlInput.setAttribute('aria-invalid', text ? 'true' : 'false');
    }

    function setIconError(message) {
      const text = String(message || '').trim();
      iconError.textContent = text;
      iconError.setAttribute('data-visible', text ? 'true' : 'false');
      iconInput.setAttribute('aria-invalid', text ? 'true' : 'false');
    }

    function getIconErrorMessage(errorValue) {
      const code = String(errorValue && errorValue.code ? errorValue.code : '');
      if (code === 'unsupported-type' || code === 'empty-file') {
        return t(
          'newtab_shortcuts_icon_unsupported',
          'Choose a PNG, JPG, or WebP image.'
        );
      }
      if (code === 'file-too-large') {
        return t(
          'newtab_shortcuts_icon_file_too_large',
          'The image must be 1 MB or smaller.'
        );
      }
      if (code === 'dimensions-too-large') {
        return t(
          'newtab_shortcuts_icon_dimensions_too_large',
          'The image must be no larger than 4096 × 4096 px.'
        );
      }
      return t(
        'newtab_shortcuts_icon_invalid',
        'This image could not be used. Choose another image.'
      );
    }

    function updateIconPreview() {
      const hasIcon = Boolean(iconDataUrl);
      const chooseText = hasIcon
        ? t('newtab_shortcuts_icon_replace', 'Replace image')
        : t('newtab_shortcuts_icon_choose', 'Choose image');
      iconUploadTile.setAttribute('data-has-icon', hasIcon ? 'true' : 'false');
      iconUploadTile.setAttribute('aria-label', chooseText);
      iconUploadTile.setAttribute('data-tooltip', chooseText);
      iconPreviewImage.src = hasIcon ? iconDataUrl : '';
      iconPreviewImage.hidden = !hasIcon;
      iconPreviewPlaceholder.hidden = hasIcon;
      iconRemoveButton.hidden = !hasIcon;
    }

    function updateLanguage() {
      const isEditMode = mode === MODE_EDIT;
      title.textContent = isEditMode
        ? t('newtab_shortcuts_edit_dialog_title', 'Edit shortcut')
        : t('newtab_shortcuts_dialog_title', 'Add shortcut');
      nameLabel.textContent = t('newtab_shortcuts_name_label', 'Name');
      urlLabel.textContent = t('newtab_shortcuts_url_label', 'URL');
      nameInput.placeholder = t('newtab_shortcuts_name_placeholder', 'Lumno');
      urlInput.placeholder = t('newtab_shortcuts_url_placeholder', 'https://example.com');
      iconLabel.textContent = t('newtab_shortcuts_icon_label', 'Icon (optional)');
      iconInfoButton.setAttribute(
        'aria-label',
        t('newtab_shortcuts_icon_info_label', 'About local shortcut icons')
      );
      iconInfoDescription.textContent = t(
        'newtab_shortcuts_icon_info',
        'A square PNG at 128 × 128 px or larger with a transparent background is recommended. JPG and WebP are also supported. Files must be 1 MB or smaller, with dimensions no larger than 4096 × 4096 px.\nBecause Chrome extension sync storage (chrome.storage.sync) has a limited quota, this icon is saved only on this device and cannot sync to other devices.'
      );
      iconRemoveButton.setAttribute(
        'aria-label',
        t('newtab_shortcuts_icon_remove', 'Remove')
      );
      updateIconPreview();
      cancelButton.textContent = t('newtab_shortcuts_cancel', 'Cancel');
      doneButton.textContent = isEditMode
        ? t('newtab_shortcuts_save', 'Save')
        : t('newtab_shortcuts_done', 'Done');
    }

    function updateIconControlState() {
      const disabled = busy || iconBusy;
      nameInput.disabled = busy;
      urlInput.disabled = busy;
      iconInfoButton.disabled = busy;
      iconUploadTile.setAttribute('data-loading', disabled ? 'true' : 'false');
      iconUploadTile.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      iconRemoveButton.disabled = disabled;
      cancelButton.disabled = busy;
      doneButton.disabled = disabled;
      form.setAttribute('aria-busy', disabled ? 'true' : 'false');
    }

    function setBusy(nextBusy) {
      busy = Boolean(nextBusy);
      updateIconControlState();
    }

    function setIconBusy(nextBusy) {
      iconBusy = Boolean(nextBusy);
      updateIconControlState();
    }

    function setMode(nextMode, shortcut) {
      mode = normalizeMode(nextMode, shortcut);
      editingId = mode === MODE_EDIT ? String(shortcut.id || '') : '';
      updateLanguage();
      iconAction = 'keep';
      iconDataUrl = mode === MODE_EDIT ? String(shortcut.iconDataUrl || '') : '';
      updateIconPreview();
      if (mode === MODE_EDIT) {
        nameInput.value = shortcut.title || '';
        urlInput.value = shortcut.url || '';
      }
    }

    function setEnterDirection(sourceElement) {
      let enterX = 0;
      let enterY = 12;
      let originX = 'center';
      let originY = 'bottom';
      if (sourceElement && typeof sourceElement.getBoundingClientRect === 'function') {
        const sourceRect = sourceElement.getBoundingClientRect();
        const dialogRect = dialog.getBoundingClientRect();
        const viewportWidth = Math.max(
          0,
          windowObj.innerWidth || (documentObj.documentElement && documentObj.documentElement.clientWidth) || 0
        );
        const viewportHeight = Math.max(
          0,
          windowObj.innerHeight || (documentObj.documentElement && documentObj.documentElement.clientHeight) || 0
        );
        const targetX = dialogRect.width ? dialogRect.left + dialogRect.width / 2 : viewportWidth / 2;
        const targetY = dialogRect.height ? dialogRect.top + dialogRect.height / 2 : viewportHeight / 2;
        const sourceX = sourceRect.left + sourceRect.width / 2;
        const sourceY = sourceRect.top + sourceRect.height / 2;
        enterX = getEnterOffset(sourceX, targetX);
        enterY = getEnterOffset(sourceY, targetY);
        if (Math.abs(enterX) < 2) {
          enterX = 0;
        }
        if (Math.abs(enterY) < 2) {
          enterY = 0;
        }
        originX = enterX < -2 ? 'left' : enterX > 2 ? 'right' : 'center';
        originY = enterY < -2 ? 'top' : enterY > 2 ? 'bottom' : 'center';
      }
      dialog.style.setProperty('--x-nt-shortcut-dialog-enter-x', `${Math.round(enterX)}px`);
      dialog.style.setProperty('--x-nt-shortcut-dialog-enter-y', `${Math.round(enterY)}px`);
      dialog.style.transformOrigin = `${originX} ${originY}`;
    }

    function close(closeOptions) {
      if (destroyed) {
        return false;
      }
      const closeOpts = closeOptions && typeof closeOptions === 'object' ? closeOptions : {};
      if (busy && closeOpts.force !== true) {
        return false;
      }
      if (openFrame) {
        cancelFrame(openFrame);
        openFrame = 0;
      }
      backdrop.removeAttribute('data-preparing');
      if (closeTimer) {
        clearTimer(closeTimer);
        closeTimer = 0;
      }
      backdrop.setAttribute('data-open', 'false');
      hideTooltip();
      if (backdrop.hidden || closeDelayMs === 0) {
        backdrop.hidden = true;
      } else {
        closeTimer = setTimer(() => {
          closeTimer = 0;
          if (backdrop.getAttribute('data-open') !== 'true') {
            backdrop.hidden = true;
          }
        }, closeDelayMs);
      }
      setError('');
      setIconError('');
      iconRequestId += 1;
      if (closeOpts.restoreFocus) {
        focusElement(previousFocus);
      }
      previousFocus = null;
      return true;
    }

    function open(openOptions) {
      if (destroyed || busy) {
        return false;
      }
      const openOpts = openOptions && typeof openOptions === 'object' ? openOptions : {};
      previousFocus = openOpts.sourceElement || documentObj.activeElement;
      form.reset();
      setBusy(false);
      setIconBusy(false);
      setError('');
      setIconError('');
      setMode(openOpts.mode, openOpts.shortcut);
      if (closeTimer) {
        clearTimer(closeTimer);
        closeTimer = 0;
      }
      if (openFrame) {
        cancelFrame(openFrame);
        openFrame = 0;
      }
      backdrop.setAttribute('data-open', 'false');
      backdrop.hidden = false;
      backdrop.setAttribute('data-preparing', 'true');
      setEnterDirection(openOpts.sourceElement);
      void dialog.offsetWidth;
      openFrame = requestFrame(() => {
        openFrame = 0;
        if (destroyed || backdrop.hidden) {
          return;
        }
        backdrop.removeAttribute('data-preparing');
        void dialog.offsetWidth;
        backdrop.setAttribute('data-open', 'true');
        focusElement(nameInput);
      });
      return true;
    }

    function mount(parentNode, beforeNode) {
      if (!parentNode || typeof parentNode.appendChild !== 'function') {
        return backdrop;
      }
      if (beforeNode && typeof parentNode.insertBefore === 'function') {
        parentNode.insertBefore(backdrop, beforeNode);
      } else {
        parentNode.appendChild(backdrop);
      }
      return backdrop;
    }

    function submit() {
      if (busy || iconBusy || destroyed) {
        return Promise.resolve(false);
      }
      setError('');
      setBusy(true);
      const payload = Object.freeze({
        title: nameInput.value || '',
        url: urlInput.value || '',
        mode,
        shortcutId: editingId,
        iconAction,
        iconDataUrl: iconAction === 'replace' ? iconDataUrl : ''
      });
      return Promise.resolve()
        .then(() => onSubmit(payload))
        .then((saved) => {
          if (saved) {
            close({ restoreFocus: true, force: true });
          }
          return Boolean(saved);
        })
        .catch(() => false)
        .finally(() => {
          if (!destroyed) {
            setBusy(false);
          }
        });
    }

    function handleSubmit(event) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      submit();
    }

    function handleBackdropPointerDown(event) {
      if (event && event.target === backdrop) {
        close({ restoreFocus: true });
      }
    }

    function handleKeydown(event) {
      if (!event) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close({ restoreFocus: true });
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const activeFocusables = focusableElements.filter((element) => !element.disabled && !element.hidden);
      if (activeFocusables.length === 0) {
        return;
      }
      const first = activeFocusables[0];
      const last = activeFocusables[activeFocusables.length - 1];
      if (event.shiftKey && documentObj.activeElement === first) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && documentObj.activeElement === last) {
        event.preventDefault();
        focusElement(first);
      } else if (!activeFocusables.includes(documentObj.activeElement)) {
        event.preventDefault();
        focusElement(first);
      }
    }

    function handleCancel() {
      close({ restoreFocus: true });
    }

    function handleIconChoose() {
      if (busy || iconBusy) {
        return;
      }
      setIconError('');
      if (typeof iconInput.click === 'function') {
        iconInput.click();
      }
    }

    function handleIconChooseKeydown(event) {
      if (!event || (event.key !== 'Enter' && event.key !== ' ')) {
        return;
      }
      event.preventDefault();
      handleIconChoose();
    }

    function handleIconRemove(event) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      iconAction = 'remove';
      iconDataUrl = '';
      setIconError('');
      updateIconPreview();
      focusElement(iconUploadTile);
    }

    function handleIconChange() {
      const file = iconInput.files && iconInput.files[0];
      iconInput.value = '';
      if (!file) {
        return;
      }
      setIconError('');
      setIconBusy(true);
      const requestId = iconRequestId + 1;
      iconRequestId = requestId;
      Promise.resolve()
        .then(() => prepareIconFile(file))
        .then((result) => {
          if (requestId !== iconRequestId || destroyed) {
            return;
          }
          const dataUrl = String(result && result.dataUrl ? result.dataUrl : '');
          if (!dataUrl) {
            throw new Error('Shortcut icon result is empty.');
          }
          iconAction = 'replace';
          iconDataUrl = dataUrl;
          updateIconPreview();
        })
        .catch((errorValue) => {
          if (requestId === iconRequestId && !destroyed) {
            setIconError(getIconErrorMessage(errorValue));
          }
        })
        .finally(() => {
          if (!destroyed && requestId === iconRequestId) {
            setIconBusy(false);
          }
        });
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      close({ force: true });
      destroyed = true;
      form.removeEventListener('submit', handleSubmit);
      cancelButton.removeEventListener('click', handleCancel);
      iconUploadTile.removeEventListener('click', handleIconChoose);
      iconUploadTile.removeEventListener('keydown', handleIconChooseKeydown);
      iconRemoveButton.removeEventListener('click', handleIconRemove);
      iconInput.removeEventListener('change', handleIconChange);
      backdrop.removeEventListener('pointerdown', handleBackdropPointerDown);
      backdrop.removeEventListener('keydown', handleKeydown);
      if (backdrop.parentNode && typeof backdrop.parentNode.removeChild === 'function') {
        backdrop.parentNode.removeChild(backdrop);
      }
    }

    form.addEventListener('submit', handleSubmit);
    cancelButton.addEventListener('click', handleCancel);
    iconUploadTile.addEventListener('click', handleIconChoose);
    iconUploadTile.addEventListener('keydown', handleIconChooseKeydown);
    iconRemoveButton.addEventListener('click', handleIconRemove);
    iconInput.addEventListener('change', handleIconChange);
    backdrop.addEventListener('pointerdown', handleBackdropPointerDown);
    backdrop.addEventListener('keydown', handleKeydown);
    bindTooltip(iconInfoButton, () => iconInfoDescription.textContent, {
      placement: 'top',
      maxWidth: 320
    });
    bindTooltip(iconUploadTile, () => iconUploadTile.getAttribute('data-tooltip'), {
      placement: 'top',
      maxWidth: 260
    });
    updateLanguage();

    return Object.freeze({
      element: backdrop,
      open,
      close,
      mount,
      submit,
      setError,
      setIconError,
      updateLanguage,
      getState,
      destroy
    });
  }

  return Object.freeze({
    MODE_ADD,
    MODE_EDIT,
    clampEnterOffset,
    getEnterOffset,
    normalizeMode,
    createShortcutDialog
  });
});
