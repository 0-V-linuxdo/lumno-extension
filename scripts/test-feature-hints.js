const assert = require('assert');

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.blurred = false;
    this.inert = false;
    this.id = '';
    this.className = '';
    this.type = '';
    this.innerHTML = '';
    this.textContent = '';
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  getBoundingClientRect() {
    return { width: 0, height: 0 };
  }

  contains(target) {
    if (target === this) {
      return true;
    }
    return this.children.some((child) => child && typeof child.contains === 'function' && child.contains(target));
  }

  blur() {
    this.blurred = true;
  }
}

function createFakeDocument() {
  const fakeDocument = {
    activeElement: null,
    defaultView: null,
    createElement(tagName) {
      const element = new FakeElement(tagName);
      element.ownerDocument = fakeDocument;
      return element;
    }
  };
  return fakeDocument;
}

global.LumnoFeatureHintView = {
  implementation: 'react-test-double',
  createFeatureHintView(options) {
    const documentObj = options.documentObj;
    const model = options.model;
    const element = documentObj.createElement('span');
    element.id = model.elementId;
    element.className = ['x-lumno-feature-hint', model.className || '']
      .filter(Boolean)
      .join(' ');
    element.setAttribute('data-react-island', 'feature-hint');
    element.setAttribute('data-rounded-arrow-tip', model.roundedArrowTip ? 'true' : 'false');
    element.setAttribute('data-visible', 'false');
    element.setAttribute('data-dismissed', 'false');
    element.setAttribute('aria-hidden', 'true');
    let arrowTip = null;
    if (model.roundedArrowTip) {
      arrowTip = documentObj.createElement('span');
      arrowTip.className = 'x-lumno-feature-hint__arrow-tip';
      arrowTip.setAttribute('aria-hidden', 'true');
      element.appendChild(arrowTip);
    }
    const badge = documentObj.createElement('span');
    badge.className = 'x-lumno-feature-hint__badge';
    element.appendChild(badge);
    const text = documentObj.createElement('span');
    text.id = model.textId;
    text.className = 'x-lumno-feature-hint__text';
    element.appendChild(text);
    let linkButton = null;
    if (model.hasLink) {
      linkButton = documentObj.createElement('button');
      linkButton.className = 'x-lumno-feature-hint__link';
      element.appendChild(linkButton);
    }
    const closeButton = documentObj.createElement('button');
    closeButton.className = 'x-lumno-feature-hint__close';
    element.appendChild(closeButton);
    return {
      arrowTip,
      badge,
      closeButton,
      destroy() {},
      element,
      linkButton,
      text,
      updateLabels(labels) {
        badge.setAttribute('aria-label', labels.badge);
        text.textContent = labels.text;
        closeButton.setAttribute('aria-label', labels.close);
        if (linkButton) {
          linkButton.setAttribute('aria-label', labels.link || '');
        }
      }
    };
  }
};

const featureHints = require('../src/shared/feature-hints.js');

function createStorageArea(store) {
  return {
    get(keys, callback) {
      const result = {};
      keys.forEach((key) => {
        result[key] = store[key];
      });
      callback(result);
    },
    set(values, callback) {
      Object.assign(store, values);
      if (typeof callback === 'function') {
        callback();
      }
    }
  };
}

function createStorageBackedChrome(localStore, syncStore) {
  const local = createStorageArea(localStore);
  const sync = createStorageArea(syncStore);
  return {
    runtime: { lastError: null },
    storage: { local, sync }
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

(async () => {
  assert.strictEqual(
    featureHints.normalizeDismissStorage('local'),
    'local',
    'local dismiss storage should be supported'
  );
  assert.strictEqual(
    featureHints.normalizeDismissStorage('sync'),
    'sync',
    'sync dismiss storage should be supported'
  );

  const localStore = {};
  const syncStore = {};
  const chromeApi = createStorageBackedChrome(localStore, syncStore);
  let resizeObserverDisconnects = 0;
  const fakeWindow = {
    ResizeObserver: class FakeResizeObserver {
      observe() {}
      disconnect() {
        resizeObserverDisconnects += 1;
      }
    }
  };
  const localKey = featureHints.getFeatureHintLocalDismissKey('newtab-ai-quick-jump');
  const sessionKey = featureHints.getFeatureHintSessionDismissKey('newtab-ai-quick-jump');
  const syncKey = featureHints.getFeatureHintSyncDismissKey('newtab-ai-quick-jump');
  assert.notStrictEqual(localKey, sessionKey, 'local and session dismiss keys should not collide');
  assert.notStrictEqual(syncKey, localKey, 'sync and local dismiss keys should not collide');
  assert.notStrictEqual(syncKey, sessionKey, 'sync and session dismiss keys should not collide');

  const tabSwitcherHint = featureHints.getFeatureHint('newtab-tab-switcher');
  assert(tabSwitcherHint, 'newtab tab switcher feature hint should be registered');
  assert.strictEqual(
    tabSwitcherHint.introducedIn,
    '0.9.13',
    'newtab tab switcher feature hint should be keyed to the release version'
  );
  assert.strictEqual(
    tabSwitcherHint.placement,
    'newtab settings icon',
    'newtab tab switcher feature hint should anchor to the settings icon'
  );
  assert.strictEqual(
    tabSwitcherHint.className,
    'x-lumno-feature-hint--newtab-tab-switcher',
    'newtab tab switcher feature hint should expose a dedicated placement class'
  );
  assert.match(
    tabSwitcherHint.textFallback,
    /Alt\+Q[\s\S]*tab switcher/i,
    'newtab tab switcher feature hint fallback should explain the Alt+Q tab switcher'
  );

  const firstDocument = createFakeDocument();
  const firstController = featureHints.createFeatureHint({
    documentObj: firstDocument,
    definition: 'newtab-ai-quick-jump',
    chromeApi,
    windowObj: fakeWindow,
    t: (key, fallback) => fallback,
    getRiSvg: () => ''
  });
  assert(firstController, 'first feature hint should be created');
  await flushMicrotasks();

  assert.strictEqual(
    firstController.element.getAttribute('data-visible'),
    'true',
    'first feature hint should become visible after storage loads'
  );
  assert.strictEqual(
    firstController.element.getAttribute('data-rounded-arrow-tip'),
    'true',
    'new feature hint should opt into component-rendered rounded arrow tip'
  );
  assert.strictEqual(
    firstController.element.children[0].className,
    'x-lumno-feature-hint__arrow-tip',
    'rounded arrow tip should be rendered as a component child'
  );
  assert.strictEqual(
    firstController.element.children[0].getAttribute('aria-hidden'),
    'true',
    'rounded arrow tip should stay hidden from assistive technology'
  );
  assert.strictEqual(
    syncStore[syncKey],
    true,
    'first visible render should persist a sync dismissal marker'
  );
  assert.strictEqual(localStore[localKey], undefined, 'sync dismiss should not write the legacy local marker');
  assert.strictEqual(firstController.element.inert, false, 'visible feature hint should not be inert');

  const closeButton = firstController.element.children[firstController.element.children.length - 1];
  firstDocument.activeElement = closeButton;
  firstController.dismiss();
  assert.strictEqual(closeButton.blurred, true, 'focused feature hint control should blur on dismiss');
  assert.strictEqual(firstController.element.inert, true, 'dismissed feature hint should become inert');
  assert.strictEqual(resizeObserverDisconnects, 1, 'dismissed feature hint should disconnect layout observer');

  const secondController = featureHints.createFeatureHint({
    documentObj: createFakeDocument(),
    definition: 'newtab-ai-quick-jump',
    chromeApi,
    t: (key, fallback) => fallback,
    getRiSvg: () => ''
  });
  assert(secondController, 'second feature hint should be created');
  await flushMicrotasks();

  assert.strictEqual(
    secondController.element.getAttribute('data-visible'),
    'false',
    'second feature hint should stay hidden after the first one was remembered'
  );
  assert.strictEqual(
    secondController.element.getAttribute('data-dismissed'),
    'true',
    'second feature hint should load the sync dismissed state'
  );

  const legacyLocalStore = { [localKey]: true };
  const migratedSyncStore = {};
  const legacyController = featureHints.createFeatureHint({
    documentObj: createFakeDocument(),
    definition: 'newtab-ai-quick-jump',
    chromeApi: createStorageBackedChrome(legacyLocalStore, migratedSyncStore),
    t: (key, fallback) => fallback,
    getRiSvg: () => ''
  });
  assert(legacyController, 'legacy feature hint should be created');
  await flushMicrotasks();

  assert.strictEqual(
    legacyController.element.getAttribute('data-dismissed'),
    'true',
    'sync feature hint should honor legacy local dismissed state'
  );
  assert.strictEqual(
    migratedSyncStore[syncKey],
    true,
    'legacy local dismissed state should migrate into sync'
  );

  const plainController = featureHints.createFeatureHint({
    documentObj: createFakeDocument(),
    definition: {
      id: 'plain-feature-hint',
      introducedIn: '0.0.0',
      surface: 'test',
      placement: 'test',
      arrowSide: 'bottom',
      arrowAlign: 'center',
      dismissStorage: 'none',
      badgeFallback: 'New',
      textFallback: 'Plain feature hint',
      closeLabelFallback: 'Dismiss plain feature hint'
    },
    t: (key, fallback) => fallback,
    getRiSvg: () => ''
  });
  assert(plainController, 'plain feature hint should be created');
  assert.strictEqual(
    plainController.element.getAttribute('data-rounded-arrow-tip'),
    'false',
    'rounded arrow tip should stay opt-in at the component definition level'
  );
  assert.notStrictEqual(
    plainController.element.children[0].className,
    'x-lumno-feature-hint__arrow-tip',
    'plain feature hints should not render a rounded arrow tip child'
  );

  console.log('feature hint tests passed');
})();
