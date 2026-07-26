const assert = require('assert');
const path = require('path');

require(path.join('..', 'src', 'newtab', 'recent-sites-view.js'));
require(path.join('..', 'src', 'newtab', 'bookmarks-view.js'));

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      const handlers = listeners.get(type);
      if (handlers) {
        handlers.delete(listener);
      }
    },
    dispatch(type, event) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }
      Array.from(handlers).forEach((listener) => listener(event || {}));
    },
    listenerCount(type) {
      const handlers = listeners.get(type);
      return handlers ? handlers.size : 0;
    }
  };
}

function createFakeElement(tagName) {
  const eventTarget = createEventTarget();
  const attributes = new Map();
  const element = {
    ...eventTarget,
    tagName: String(tagName || '').toUpperCase(),
    children: [],
    childNodes: [],
    className: '',
    textContent: '',
    title: '',
    tabIndex: 0,
    disabled: false,
    isConnected: true,
    style: {
      setProperty() {},
      removeProperty() {}
    },
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      }
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    appendChild(child) {
      if (child && child.nodeType === 11) {
        child.children.slice().forEach((nestedChild) => this.appendChild(nestedChild));
        return child;
      }
      this.children.push(child);
      this.childNodes.push(child);
      if (child) {
        child.parentElement = this;
      }
      return child;
    },
    setPointerCapture() {}
  };
  let innerHtml = '';
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return innerHtml;
    },
    set(value) {
      innerHtml = String(value || '');
      if (!innerHtml) {
        element.children.length = 0;
        element.childNodes.length = 0;
      }
    }
  });
  return element;
}

function createFakeDocument() {
  const eventTarget = createEventTarget();
  let fragmentCount = 0;
  return {
    ...eventTarget,
    visibilityState: 'visible',
    createElement: createFakeElement,
    createDocumentFragment() {
      fragmentCount += 1;
      const fragment = createFakeElement('fragment');
      fragment.nodeType = 11;
      return fragment;
    },
    getFragmentCount() {
      return fragmentCount;
    }
  };
}

function createBaseOptions(documentObj, windowObj, grid) {
  return {
    documentObj,
    windowObj,
    grid,
    cards: [],
    t: (_key, fallback) => fallback || '',
    formatMessage: (_key, fallback, values) => fallback.replace('{title}', values.title),
    sanitizeDisplayText: (text) => String(text || ''),
    getHostFromUrl: (url) => new URL(url).hostname,
    getSiteDisplayName: (host, title) => title || host,
    getUrlDisplay: (url) => url,
    getRiSvg: () => '',
    attachFaviconWithFallbacks() {},
    getImmediateThemeForSuggestion: () => null,
    queueThemeForTarget() {},
    applyCardTheme() {},
    bindCursorTooltip() {},
    hideCursorTooltip() {},
    hideTopActionTooltip() {}
  };
}

function createNavigationEvent(button) {
  return {
    button: Number(button) || 0,
    preventDefault() {},
    stopPropagation() {}
  };
}

function testRecentViewNavigationListenerLifecycle() {
  const documentObj = createFakeDocument();
  const windowEvents = createEventTarget();
  const windowObj = {
    ...windowEvents,
    setTimeout,
    clearTimeout
  };
  const grid = createFakeElement('div');
  const opened = [];
  const view = globalThis.LumnoNewtabRecentSitesView.createRecentSitesView({
    ...createBaseOptions(documentObj, windowObj, grid),
    getOwnExtensionPageDisplay: () => null,
    getCanonicalPageUrlForFavicon: (url) => url,
    getBrowserPageFaviconUrl: () => '',
    getCurrentRecentCount: () => 4,
    updatePinButton() {},
    updateDismissButton() {},
    openUrl(url, options) {
      opened.push({ url, options });
    }
  });

  view.render([
    { title: 'One', url: 'https://one.example/' },
    { title: 'Two', url: 'https://two.example/' }
  ], {});

  assert.strictEqual(documentObj.listenerCount('visibilitychange'), 0);
  assert.strictEqual(windowObj.listenerCount('pagehide'), 0);
  assert.strictEqual(documentObj.getFragmentCount(), 1, 'recent cards should mount through one fragment');

  const firstCard = view.getCards()[0];
  const firstFavicon = firstCard.children[0].children[0].children[0];
  assert.strictEqual(firstFavicon.width, 25);
  assert.strictEqual(firstFavicon.height, 25);
  firstCard.dispatch('click', createNavigationEvent(0));
  assert.strictEqual(opened.length, 1);
  assert.strictEqual(documentObj.listenerCount('visibilitychange'), 1);
  assert.strictEqual(windowObj.listenerCount('pagehide'), 1);

  view.clear();
  assert.strictEqual(documentObj.listenerCount('visibilitychange'), 0);
  assert.strictEqual(windowObj.listenerCount('pagehide'), 0);

  view.render([{ title: 'Three', url: 'https://three.example/' }], {});
  const secondCard = view.getCards()[0];
  secondCard.dispatch('click', createNavigationEvent(0));
  documentObj.visibilityState = 'hidden';
  documentObj.dispatch('visibilitychange');
  assert.strictEqual(documentObj.listenerCount('visibilitychange'), 0);
  assert.strictEqual(windowObj.listenerCount('pagehide'), 0);

  documentObj.visibilityState = 'visible';
  view.clear();
  view.render([{ title: 'Four', url: 'https://four.example/' }], {});
  view.getCards()[0].dispatch('auxclick', createNavigationEvent(1));
  assert.strictEqual(documentObj.listenerCount('visibilitychange'), 0);
  assert.strictEqual(windowObj.listenerCount('pagehide'), 0);
}

function testBookmarkFaviconDimensions() {
  const documentObj = createFakeDocument();
  const windowObj = {
    setTimeout,
    clearTimeout
  };
  const grid = createFakeElement('div');
  const cardElementCache = new Map();
  const view = globalThis.LumnoNewtabBookmarksView.createBookmarksView({
    ...createBaseOptions(documentObj, windowObj, grid),
    cardElementCache,
    getFigmaFolderSvg: () => '',
    normalizeHost: (host) => host,
    getBrowserPageFaviconUrl: () => '',
    isLocalNetworkHost: () => false,
    getChromeFaviconUrl: () => ''
  });

  view.render([{
    id: 'bookmark-1',
    parentId: '1',
    index: 0,
    type: 'bookmark',
    title: 'Example',
    url: 'https://example.com/'
  }], {
    folderId: '1',
    rootFolderId: '1'
  });

  const favicon = view.getCards()[0].children[0];
  assert.strictEqual(favicon.width, 22);
  assert.strictEqual(favicon.height, 22);
  assert.strictEqual(favicon.decoding, 'async');

  const activeItem = {
    id: 'bookmark-1',
    parentId: '1',
    index: 0,
    type: 'bookmark',
    title: 'Example',
    url: 'https://example.com/'
  };
  const activeKey = `folder::${view.getCacheKey(activeItem)}`;
  const staleKey = `folder::${view.getCacheKey({
    id: 'stale',
    type: 'bookmark',
    title: 'Stale',
    url: 'https://stale.example/'
  })}`;
  let staleDisposeCount = 0;
  cardElementCache.set(activeKey, view.getCards()[0]);
  cardElementCache.set(staleKey, {
    _xDisposeBookmarkCard() {
      staleDisposeCount += 1;
    }
  });
  view.syncCardElementCache([activeItem]);
  assert.strictEqual(cardElementCache.has(activeKey), true);
  assert.strictEqual(cardElementCache.has(staleKey), false);
  assert.strictEqual(staleDisposeCount, 1);
}

testRecentViewNavigationListenerLifecycle();
testBookmarkFaviconDimensions();
console.log('newtab view lifecycle tests passed');
