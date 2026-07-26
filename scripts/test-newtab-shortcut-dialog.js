const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const componentPath = path.join(repoRoot, 'src/newtab/shortcut-dialog.js');
const componentCssPath = path.join(repoRoot, 'src/newtab/shortcut-dialog.css');
const newtabHtmlPath = path.join(repoRoot, 'src/newtab/newtab.html');
const newtabJsPath = path.join(repoRoot, 'src/newtab/newtab.js');
const component = require(componentPath);

function createStyle() {
  const values = new Map();
  return {
    setProperty(name, value) {
      values.set(String(name), String(value));
    },
    getPropertyValue(name) {
      return values.get(String(name)) || '';
    },
    removeProperty(name) {
      values.delete(String(name));
    }
  };
}

function createFakeDocument() {
  const documentObj = {
    activeElement: null,
    documentElement: {
      clientWidth: 1200,
      clientHeight: 800
    },
    createElement(tagName) {
      return createFakeElement(tagName, documentObj);
    }
  };
  documentObj.body = documentObj.createElement('body');
  return documentObj;
}

function createFakeElement(tagName, documentObj) {
  const listeners = new Map();
  const attributes = new Map();
  const element = {
    tagName: String(tagName || '').toUpperCase(),
    children: [],
    parentNode: null,
    className: '',
    id: '',
    hidden: false,
    disabled: false,
    textContent: '',
    value: '',
    style: createStyle(),
    offsetWidth: 420,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    insertBefore(child, beforeNode) {
      child.parentNode = this;
      const index = this.children.indexOf(beforeNode);
      if (index < 0) {
        this.children.push(child);
      } else {
        this.children.splice(index, 0, child);
      }
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) {
        this.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    },
    contains(node) {
      return node === this || this.children.some((child) => child.contains(node));
    },
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
    },
    getAttribute(name) {
      return attributes.has(String(name)) ? attributes.get(String(name)) : null;
    },
    removeAttribute(name) {
      attributes.delete(String(name));
    },
    addEventListener(name, handler) {
      const eventName = String(name);
      const handlers = listeners.get(eventName) || [];
      handlers.push(handler);
      listeners.set(eventName, handlers);
    },
    removeEventListener(name, handler) {
      const eventName = String(name);
      const handlers = listeners.get(eventName) || [];
      listeners.set(eventName, handlers.filter((candidate) => candidate !== handler));
    },
    dispatch(name, event) {
      const payload = event || {};
      if (!payload.target) {
        payload.target = this;
      }
      (listeners.get(String(name)) || []).slice().forEach((handler) => handler(payload));
    },
    focus() {
      documentObj.activeElement = this;
    },
    reset() {
      findAll(this, (candidate) => candidate.tagName === 'INPUT').forEach((input) => {
        input.value = '';
      });
    },
    getBoundingClientRect() {
      return {
        left: 390,
        top: 240,
        right: 810,
        bottom: 560,
        width: 420,
        height: 320
      };
    }
  };
  return element;
}

function findAll(root, predicate, matches) {
  const result = matches || [];
  if (predicate(root)) {
    result.push(root);
  }
  (root.children || []).forEach((child) => findAll(child, predicate, result));
  return result;
}

function findByClass(root, className) {
  return findAll(root, (element) => String(element.className || '').split(/\s+/).includes(className))[0] || null;
}

function createFakeWindow() {
  let nextFrameId = 1;
  const frames = new Map();
  return {
    innerWidth: 1200,
    innerHeight: 800,
    requestAnimationFrame(callback) {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    flushAnimationFrame() {
      const pending = Array.from(frames.entries());
      frames.clear();
      pending.forEach(([, callback]) => callback());
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {}
  };
}

async function run() {
  assert.strictEqual(component.MODE_ADD, 'add');
  assert.strictEqual(component.MODE_EDIT, 'edit');
  assert.strictEqual(component.normalizeMode('edit', null), 'add');
  assert.strictEqual(component.normalizeMode('edit', { id: 'one' }), 'edit');
  assert.strictEqual(component.clampEnterOffset(50, 28), 28);
  assert.strictEqual(component.clampEnterOffset(-50, 28), -28);
  assert.strictEqual(component.getEnterOffset(100, 100), 0);
  assert.strictEqual(component.getEnterOffset(90, 100), -6);

  const documentObj = createFakeDocument();
  const windowObj = createFakeWindow();
  const trigger = documentObj.createElement('button');
  trigger.getBoundingClientRect = () => ({
    left: 50,
    top: 700,
    right: 98,
    bottom: 748,
    width: 48,
    height: 48
  });
  trigger.focus();
  const submissions = [];
  const tooltipBindings = [];
  const controller = component.createShortcutDialog({
    documentObj,
    windowObj,
    closeDelayMs: 0,
    t(key, fallback) {
      return fallback || key;
    },
    getRiSvg(id, sizeClass) {
      return `<i class="ri-icon ${sizeClass} ${id}" aria-hidden="true"></i>`;
    },
    bindTooltip(target, getText, options) {
      tooltipBindings.push({ target, getText, options });
      return target;
    },
    onSubmit(payload) {
      submissions.push(payload);
      return Promise.resolve(true);
    },
    prepareIconFile() {
      return Promise.resolve({
        dataUrl: 'data:image/png;base64,dGVzdA==',
        sourceWidth: 256,
        sourceHeight: 128
      });
    }
  });

  assert.ok(controller, 'component should create a controller');
  assert.ok(Object.isFrozen(controller), 'component API should be stable');
  assert.strictEqual(controller.element.getAttribute('data-open'), 'false');
  assert.strictEqual(controller.element.hidden, true);
  assert.strictEqual(findByClass(controller.element, 'x-nt-shortcut-dialog').getAttribute('role'), 'dialog');
  assert.strictEqual(findByClass(controller.element, 'x-nt-shortcut-dialog').getAttribute('aria-modal'), 'true');
  assert.strictEqual(findByClass(controller.element, 'x-nt-shortcut-error').getAttribute('aria-live'), 'polite');

  controller.mount(documentObj.body);
  assert.strictEqual(controller.element.parentNode, documentObj.body, 'mount should attach the dialog surface');

  controller.open({ sourceElement: trigger });
  assert.strictEqual(controller.element.hidden, false);
  assert.strictEqual(controller.element.getAttribute('data-preparing'), 'true');
  windowObj.flushAnimationFrame();
  assert.strictEqual(controller.element.getAttribute('data-open'), 'true');
  assert.strictEqual(controller.getState().mode, 'add');

  const inputs = findAll(controller.element, (element) => element.tagName === 'INPUT');
  const buttons = findAll(controller.element, (element) => element.tagName === 'BUTTON');
  const doneButton = findByClass(controller.element, 'x-nt-shortcut-dialog-button--primary');
  const cancelButton = findByClass(controller.element, 'x-nt-shortcut-dialog-button--secondary');
  const iconUploadTile = findByClass(controller.element, 'x-nt-shortcut-icon-upload-tile');
  const iconRemoveButton = findByClass(controller.element, 'x-nt-shortcut-icon-remove');
  const iconInput = findByClass(controller.element, 'x-nt-shortcut-icon-input');
  const iconInfoButton = findByClass(controller.element, 'x-nt-shortcut-icon-info');
  const iconInfoDescription = findByClass(controller.element, 'x-nt-shortcut-visually-hidden');
  const title = findByClass(controller.element, 'x-nt-shortcut-dialog-title');
  const error = findByClass(controller.element, 'x-nt-shortcut-error');
  assert.strictEqual(inputs.length, 3);
  assert.strictEqual(buttons.length, 4);
  assert.strictEqual(documentObj.activeElement, inputs[0], 'opening should focus the name field');
  assert.strictEqual(title.textContent, 'Add shortcut');
  assert.strictEqual(doneButton.textContent, 'Done');
  assert.strictEqual(cancelButton.disabled, false);
  assert.strictEqual(iconUploadTile.getAttribute('aria-label'), 'Choose image');
  assert.strictEqual(iconUploadTile.getAttribute('data-has-icon'), 'false');
  assert.strictEqual(
    iconInfoDescription.textContent,
    'PNG, JPG, and WebP supported. A transparent square icon at 128 × 128 px or larger is recommended. Saved only on this device.',
    'the accessible info description should concisely cover format, recommended shape, and local storage'
  );
  assert.strictEqual(
    iconInfoButton.className.includes('x-nt-appearance-info-button'),
    true,
    'the info trigger should reuse the New Tab appearance info-button pattern'
  );
  assert.strictEqual(tooltipBindings.length, 2, 'shared Tooltip should bind the info trigger and upload tile');
  assert.strictEqual(tooltipBindings[0].target, iconInfoButton);
  assert.strictEqual(
    tooltipBindings[0].getText(),
    'PNG, JPG, and WebP supported. A transparent square icon at 128 × 128 px or larger is recommended. Saved only on this device.',
    'the shared Tooltip should use the concise icon guidance'
  );
  assert.strictEqual(tooltipBindings[1].target, iconUploadTile);
  assert.strictEqual(tooltipBindings[1].getText(), 'Choose image');

  controller.setError('Invalid URL');
  assert.strictEqual(error.textContent, 'Invalid URL');
  assert.strictEqual(error.getAttribute('data-visible'), 'true');
  assert.strictEqual(inputs[1].getAttribute('aria-invalid'), 'true');

  controller.open({
    mode: 'edit',
    shortcut: {
      id: 'shortcut-one',
      title: 'Example',
      url: 'https://example.com/'
    },
    sourceElement: trigger
  });
  windowObj.flushAnimationFrame();
  assert.deepStrictEqual(
    controller.getState(),
    { mode: 'edit', editingId: 'shortcut-one', open: true, busy: false }
  );
  assert.strictEqual(inputs[0].value, 'Example');
  assert.strictEqual(inputs[1].value, 'https://example.com/');
  assert.strictEqual(title.textContent, 'Edit shortcut');
  assert.strictEqual(doneButton.textContent, 'Save');

  iconInput.files = [{
    name: 'test.png',
    type: 'image/png',
    size: 100
  }];
  iconInput.dispatch('change');
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(iconUploadTile.getAttribute('data-has-icon'), 'true');
  assert.strictEqual(iconUploadTile.getAttribute('aria-label'), 'Replace image');
  assert.strictEqual(iconRemoveButton.hidden, false);

  inputs[0].value = 'Edited';
  inputs[1].value = 'https://edited.example/';
  const saved = await controller.submit();
  assert.strictEqual(saved, true);
  assert.strictEqual(submissions.length, 1);
  assert.deepStrictEqual(submissions[0], {
    title: 'Edited',
    url: 'https://edited.example/',
    mode: 'edit',
    shortcutId: 'shortcut-one',
    iconAction: 'replace',
    iconDataUrl: 'data:image/png;base64,dGVzdA=='
  });
  assert.strictEqual(controller.element.hidden, true, 'successful submit should close the dialog');
  assert.strictEqual(documentObj.activeElement, trigger, 'successful submit should restore trigger focus');

  controller.open({ sourceElement: trigger });
  windowObj.flushAnimationFrame();
  doneButton.focus();
  let tabPrevented = false;
  controller.element.dispatch('keydown', {
    key: 'Tab',
    preventDefault() {
      tabPrevented = true;
    }
  });
  assert.strictEqual(tabPrevented, true);
  assert.strictEqual(documentObj.activeElement, inputs[0], 'Tab should wrap focus inside the modal');

  let escapePrevented = false;
  controller.element.dispatch('keydown', {
    key: 'Escape',
    preventDefault() {
      escapePrevented = true;
    }
  });
  assert.strictEqual(escapePrevented, true);
  assert.strictEqual(controller.element.hidden, true);
  assert.strictEqual(documentObj.activeElement, trigger);

  controller.destroy();
  assert.strictEqual(controller.element.parentNode, null, 'destroy should detach the component');

  const pendingDocument = createFakeDocument();
  const pendingWindow = createFakeWindow();
  const pendingTrigger = pendingDocument.createElement('button');
  pendingTrigger.focus();
  let resolvePendingSubmit = null;
  const pendingController = component.createShortcutDialog({
    documentObj: pendingDocument,
    windowObj: pendingWindow,
    closeDelayMs: 0,
    t(key, fallback) {
      return fallback || key;
    },
    onSubmit() {
      return new Promise((resolve) => {
        resolvePendingSubmit = resolve;
      });
    }
  });
  pendingController.mount(pendingDocument.body);
  pendingController.open({ sourceElement: pendingTrigger });
  pendingWindow.flushAnimationFrame();
  const pendingCancelButton = findByClass(
    pendingController.element,
    'x-nt-shortcut-dialog-button--secondary'
  );
  const pendingSubmit = pendingController.submit();
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(pendingController.getState().busy, true);
  assert.strictEqual(pendingCancelButton.disabled, true, 'cancel should be disabled during persistence');
  assert.strictEqual(
    pendingController.close({ restoreFocus: true }),
    false,
    'a user close should not dismiss the dialog while persistence is pending'
  );
  assert.strictEqual(
    pendingController.open({
      mode: 'edit',
      shortcut: {
        id: 'second-shortcut',
        title: 'Second',
        url: 'https://second.example/'
      },
      sourceElement: pendingTrigger
    }),
    false,
    'a second dialog state should not replace a pending submission'
  );
  assert.strictEqual(pendingController.getState().mode, 'add');
  resolvePendingSubmit(true);
  assert.strictEqual(await pendingSubmit, true);
  assert.strictEqual(pendingController.element.hidden, true);
  pendingController.destroy();

  const componentCss = fs.readFileSync(componentCssPath, 'utf8');
  const newtabHtml = fs.readFileSync(newtabHtmlPath, 'utf8');
  const newtabJs = fs.readFileSync(newtabJsPath, 'utf8');
  assert.ok(
    newtabHtml.includes('<link rel="stylesheet" href="shortcut-dialog.css" />'),
    'newtab should load component-owned shortcut dialog CSS'
  );
  assert.ok(
    newtabHtml.includes('<script src="shortcut-dialog.js"></script>'),
    'newtab should load the shortcut dialog component before newtab.js'
  );
  assert.ok(
    newtabHtml.includes('<script src="shortcut-icon-store.js"></script>'),
    'newtab should load the local shortcut icon processor'
  );
  assert.match(
    newtabJs,
    /let didWriteIcons = false;[\s\S]*?didWriteIcons = true;[\s\S]*?catch\(async \(\) => \{[\s\S]*?await shortcutIconStore\.writeAll\(previousIcons\);[\s\S]*?newtabShortcutIcons = previousIcons;[\s\S]*?renderShortcuts\(\);/,
    'shortcut persistence should roll local icons and rendered state back when the synced shortcut write fails'
  );
  assert.ok(
    newtabHtml.indexOf('<script src="shortcut-icon-store.js"></script>') <
      newtabHtml.indexOf('<script src="shortcut-dialog.js"></script>'),
    'shortcut icon processing should load before the dialog'
  );
  assert.ok(
    newtabHtml.indexOf('<script src="shortcut-dialog.js"></script>') <
      newtabHtml.indexOf('src="../shared/react-page-bootstrap.js"'),
    'shortcut dialog component should load before the page bootstrap'
  );
  assert.ok(
    !newtabHtml.includes('.x-nt-shortcut-dialog {'),
    'newtab HTML should not retain component-owned dialog styles inline'
  );
  assert.ok(
    componentCss.includes('.x-nt-shortcut-dialog {') &&
      componentCss.includes('.x-nt-shortcut-dialog-tooltip {') &&
      componentCss.includes('.x-nt-shortcut-icon-upload-tile {') &&
      componentCss.includes('@media (prefers-reduced-motion: reduce)'),
    'component CSS should own the dialog surface, shared Tooltip layer, upload-tile adaptation, and reduced-motion behavior'
  );
  assert.ok(
    !componentCss.includes('.x-nt-shortcut-icon-info-tooltip {'),
    'component CSS should not rebuild the shared Tooltip surface'
  );
  assert.ok(
    /\.x-nt-shortcut-dialog\s*\{[\s\S]*?border:\s*0;/.test(componentCss),
    'shortcut dialog surface should not draw an outer border'
  );
  assert.ok(
    newtabJs.includes('NEWTAB_SHORTCUT_DIALOG.createShortcutDialog({'),
    'newtab should instantiate the extracted component'
  );
  assert.ok(
    newtabJs.includes('bindTooltip: bindShortcutDialogTooltip') &&
      newtabJs.includes("className: 'x-nt-shortcut-dialog-tooltip'"),
    'newtab should provide the shared Lumno Tooltip controller to the dialog'
  );
  assert.ok(
    newtabJs.includes('shortcutDialogController.mount(document.body);'),
    'newtab should mount the component through its public API'
  );
  assert.ok(
    !newtabJs.includes("shortcutDialogBackdrop = document.createElement('div')"),
    'newtab should not rebuild the component DOM itself'
  );

  console.log('newtab shortcut dialog component tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
