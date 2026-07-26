import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRecentSitesView,
  createRecentSitesViewApi,
  getRecentSitesSignature,
  type RecentCardElement,
  type RecentSiteItem,
  type RecentSitesViewController,
  type RecentSitesViewOptions
} from './recent-sites';

let views: RecentSitesViewController[] = [];

function createOptions(
  overrides: Partial<RecentSitesViewOptions> = {}
): RecentSitesViewOptions {
  const grid = document.createElement('div');
  document.body.appendChild(grid);
  return {
    documentObj: document,
    windowObj: window,
    grid,
    cards: [],
    t: (_key, fallback) => fallback,
    formatMessage: (_key, fallback, values) =>
      fallback.replace('{title}', values.title),
    sanitizeDisplayText: (value) => String(value || ''),
    getOwnExtensionPageDisplay: () => null,
    getHostFromUrl: () => 'example.com',
    getCanonicalPageUrlForFavicon: (url) => url,
    getBrowserPageFaviconUrl: () => 'chrome://favicon/',
    getSiteDisplayName: (_host, title) => title || 'Example',
    getUrlDisplay: (url) => url,
    getRiSvg: (id, sizeClass = '') =>
      `<i class="${sizeClass} ${id}"></i>`,
    attachFaviconWithFallbacks: (image) => {
      image.src = 'data:image/png;base64,dGVzdA==';
    },
    getImmediateThemeForSuggestion: () => ({ accent: 'blue' }),
    queueThemeForTarget: () => {},
    applyCardTheme: (card) => {
      card.dataset.themed = 'true';
    },
    getCurrentRecentCount: () => 4,
    isPinned: () => false,
    getPinnedCount: () => 0,
    getMaxPinnedCount: () => 3,
    canDismiss: () => true,
    getDismissTooltip: () => 'Dismiss',
    updatePinButton: (button, pinned, limitReached) => {
      button.dataset.pinned = String(pinned);
      button.dataset.limitReached = String(limitReached);
      button.setAttribute('aria-label', pinned ? 'Unpin' : 'Pin');
    },
    updateDismissButton: (button) => {
      button.setAttribute('aria-label', 'Dismiss');
    },
    showToast: () => {},
    showTopActionTooltip: () => {},
    hideTopActionTooltip: () => {},
    hideCursorTooltip: () => {},
    bindCursorTooltip: () => null,
    openUrl: () => {},
    togglePinned: () => Promise.resolve(null),
    hideTemporarily: () => Promise.resolve(null),
    ...overrides
  };
}

function createView(
  overrides: Partial<RecentSitesViewOptions> = {}
): {
  view: RecentSitesViewController;
  options: RecentSitesViewOptions;
} {
  const options = createOptions(overrides);
  const view = createRecentSitesView(options);
  views.push(view);
  return { view, options };
}

function renderItems(
  view: RecentSitesViewController,
  items: RecentSiteItem[],
  signature = ''
) {
  let result = {
    changed: false,
    count: 0,
    signature: ''
  };
  act(() => {
    result = view.render(items, { signature });
  });
  return result;
}

afterEach(() => {
  act(() => {
    views.forEach((view) => view.clear());
  });
  views = [];
});

describe('Recent Sites React island', () => {
  it('preserves signatures and the legacy buildCard compatibility path', () => {
    const items = [{
      title: 'Example',
      url: 'https://example.com/',
      visitCount: 2
    }];
    expect(getRecentSitesSignature(items)).toBe(
      '0::https://example.com/::Example::::::2'
    );

    const legacyCard = document.createElement('div') as RecentCardElement;
    const legacyApi = {
      createRecentSitesView: () => ({
        buildCard: () => legacyCard
      })
    };
    const options = createOptions();
    const view = createRecentSitesView(options, legacyApi);
    views.push(view);
    expect(view.buildCard(items[0], 0)).toBe(legacyCard);
    expect(createRecentSitesViewApi(legacyApi).implementation).toBe('react');
  });

  it('renders cards synchronously and keeps external card metadata intact', () => {
    const attachFavicon = vi.fn();
    const applyTheme = vi.fn((card: RecentCardElement) => {
      card.dataset.themed = 'true';
    });
    const bindTooltip = vi.fn();
    const { view, options } = createView({
      attachFaviconWithFallbacks: attachFavicon,
      applyCardTheme: applyTheme,
      bindCursorTooltip: bindTooltip
    });
    const items = [{
      title: 'Example Docs',
      url: 'https://example.com/docs',
      lastVisitTime: 42,
      visitCount: 3
    }];

    const result = renderItems(view, items);
    const grid = options.grid as HTMLElement;
    const card = grid.querySelector<RecentCardElement>('.x-nt-recent-card');

    expect(result).toEqual({
      changed: true,
      count: 1,
      signature: getRecentSitesSignature(items)
    });
    expect(grid.dataset.reactIsland).toBe('recent-sites');
    expect(view.getCards()).toEqual([card]);
    expect(card?._xHost).toBe('example.com');
    expect(card?._xTitleText).toBe('Example Docs');
    expect(card?._xActionText?.textContent).toBe('前往');
    expect(card?._xPinButton).toBeInstanceOf(HTMLButtonElement);
    expect(card?._xDismissButton).toBeInstanceOf(HTMLButtonElement);
    expect(card?.dataset.themed).toBe('true');
    expect(attachFavicon).toHaveBeenCalledOnce();
    expect(applyTheme).toHaveBeenCalledOnce();
    expect(bindTooltip).toHaveBeenCalledOnce();

    const unchanged = renderItems(view, items, result.signature);
    expect(unchanged.changed).toBe(false);
    expect(attachFavicon).toHaveBeenCalledOnce();
  });

  it('preserves pointer suppression and background-open behavior', async () => {
    const opened: Array<{
      url: string;
      openInBackgroundTab: boolean;
    }> = [];
    const { view } = createView({
      openUrl: (url, options) => {
        opened.push({ url, ...options });
      }
    });
    renderItems(view, [{
      title: 'Example',
      url: 'https://example.com/'
    }]);
    const card = view.getCards()[0];

    act(() => {
      card.dispatchEvent(new MouseEvent('pointerdown', {
        bubbles: true,
        button: 0,
        ctrlKey: true
      }));
      card.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0,
        ctrlKey: true
      }));
    });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    act(() => {
      card.dispatchEvent(new MouseEvent('auxclick', {
        bubbles: true,
        button: 1
      }));
    });

    expect(opened).toEqual([
      {
        url: 'https://example.com/',
        openInBackgroundTab: true
      },
      {
        url: 'https://example.com/',
        openInBackgroundTab: true
      }
    ]);
  });

  it('cleans foreground navigation listeners when the view clears', () => {
    const documentAdd = vi.spyOn(document, 'addEventListener');
    const documentRemove = vi.spyOn(document, 'removeEventListener');
    const windowAdd = vi.spyOn(window, 'addEventListener');
    const windowRemove = vi.spyOn(window, 'removeEventListener');
    const { view } = createView();
    renderItems(view, [{
      title: 'Example',
      url: 'https://example.com/'
    }]);

    act(() => {
      view.getCards()[0].dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0
      }));
    });
    expect(
      documentAdd.mock.calls.some(([type]) => type === 'visibilitychange')
    ).toBe(true);
    expect(
      windowAdd.mock.calls.some(([type]) => type === 'pagehide')
    ).toBe(true);

    act(() => {
      view.clear();
    });
    expect(
      documentRemove.mock.calls.some(([type]) => type === 'visibilitychange')
    ).toBe(true);
    expect(
      windowRemove.mock.calls.some(([type]) => type === 'pagehide')
    ).toBe(true);
    expect(view.getCards()).toEqual([]);
  });

  it('keeps pin-limit activation inside the action button', () => {
    const opened = vi.fn();
    const showToast = vi.fn();
    const updatePinButton = vi.fn();
    const { view } = createView({
      openUrl: opened,
      getPinnedCount: () => 3,
      getMaxPinnedCount: () => 3,
      showToast,
      updatePinButton
    });
    renderItems(view, [{
      title: 'Example',
      url: 'https://example.com/'
    }]);
    updatePinButton.mockClear();

    act(() => {
      view.getCards()[0]._xPinButton?.click();
    });

    expect(opened).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('最多只能置顶 3 个卡片', false);
    expect(updatePinButton).toHaveBeenCalledWith(
      view.getCards()[0]._xPinButton,
      false,
      true
    );
  });
});
