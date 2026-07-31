import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createShortcutsView,
  createShortcutsViewApi,
  type ShortcutItem,
  type ShortcutsViewController,
  type ShortcutsViewOptions
} from './shortcuts';

let views: ShortcutsViewController[] = [];

function createOptions(
  overrides: Partial<ShortcutsViewOptions> = {}
): ShortcutsViewOptions {
  const grid = document.createElement('div');
  document.body.appendChild(grid);
  return {
    grid,
    tiles: [],
    getShortcutTitle: (shortcut) => String(shortcut.title || shortcut.host || ''),
    getHostFromUrl: () => 'example.com',
    getShortcutIconDataUrl: () => '',
    getPageFaviconCandidateUrl: (url) => `favicon:${url}`,
    getImmediateThemeForSuggestion: () => ({ accent: 'blue' }),
    applyShortcutTileTheme: (tile) => {
      tile.dataset.themed = 'true';
    },
    queueThemeForTarget: () => {},
    attachFaviconWithFallbacks: (image) => {
      image.src = 'data:image/png;base64,dGVzdA==';
    },
    bindTooltip: () => null,
    hideTooltip: () => {},
    formatOpenLabel: (title) => `Open ${title}`,
    isMiddleClick: (event) => event.button === 1,
    openShortcut: () => {},
    onContextMenu: () => {},
    onNativeDragStart: (event) => event.preventDefault(),
    getAddLabel: () => 'Add shortcut',
    getAddIconSvg: () => '<i class="ri-add-line"></i>',
    getAddVisible: () => true,
    onAdd: () => {},
    onAddContextMenu: () => {},
    ...overrides
  };
}

function createView(
  overrides: Partial<ShortcutsViewOptions> = {}
): {
  view: ShortcutsViewController;
  options: ShortcutsViewOptions;
} {
  const options = createOptions(overrides);
  const view = createShortcutsView(options);
  views.push(view);
  return { view, options };
}

function renderItems(
  view: ShortcutsViewController,
  items: ShortcutItem[]
): { count: number } {
  let result = { count: 0 };
  act(() => {
    result = view.render(items);
  });
  return result;
}

afterEach(() => {
  act(() => {
    views.forEach((view) => view.clear());
  });
  views = [];
});

describe('Shortcuts React island', () => {
  it('renders shortcut metadata and keeps the external tile cache synchronous', () => {
    const attachFavicon = vi.fn((image: HTMLImageElement) => {
      image.src = 'data:image/png;base64,dGVzdA==';
    });
    const applyTheme = vi.fn((tile: HTMLButtonElement) => {
      tile.dataset.themed = 'true';
    });
    const bindTooltip = vi.fn();
    const { view, options } = createView({
      attachFaviconWithFallbacks: attachFavicon,
      applyShortcutTileTheme: applyTheme,
      bindTooltip
    });
    const result = renderItems(view, [{
      id: 'docs',
      title: 'Docs',
      url: 'https://example.com/docs'
    }]);
    const grid = options.grid as HTMLElement;
    const tile = view.getTiles()[0];

    expect(createShortcutsViewApi().implementation).toBe('react');
    expect(result).toEqual({ count: 1 });
    expect(grid.dataset.reactIsland).toBe('shortcuts');
    expect(tile.dataset.shortcutId).toBe('docs');
    expect(tile.dataset.shortcutUrl).toBe('https://example.com/docs');
    expect(tile.dataset.shortcutDraggable).toBe('true');
    expect(tile.dataset.themed).toBe('true');
    expect(tile.getAttribute('aria-label')).toBe('Open Docs');
    expect(tile._xHost).toBe('example.com');
    expect(view.getAddButton()?.dataset.tooltip).toBe('Add shortcut');
    expect(attachFavicon).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      'https://example.com/docs',
      'example.com',
      {
        primaryUrl: 'favicon:https://example.com/docs',
        browserUrl: '',
        skipPersisted: true
      }
    );
    expect(applyTheme).toHaveBeenCalledOnce();
    expect(bindTooltip).toHaveBeenCalledTimes(2);
  });

  it('routes click, keyboard, middle-click, context menu, and add actions', () => {
    const openShortcut = vi.fn();
    const onContextMenu = vi.fn();
    const onAdd = vi.fn();
    const onAddContextMenu = vi.fn();
    const { view } = createView({
      openShortcut,
      onContextMenu,
      onAdd,
      onAddContextMenu
    });
    renderItems(view, [{
      id: 'docs',
      title: 'Docs',
      url: 'https://example.com/docs'
    }]);
    const tile = view.getTiles()[0];

    act(() => {
      tile.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0
      }));
      tile.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter'
      }));
      tile.dispatchEvent(new MouseEvent('auxclick', {
        bubbles: true,
        button: 1
      }));
      tile.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true
      }));
      view.getAddButton()?.click();
      view.getAddButton()?.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true
      }));
    });

    expect(openShortcut).toHaveBeenCalledTimes(3);
    expect(onContextMenu).toHaveBeenCalledOnce();
    expect(onAdd).toHaveBeenCalledWith(view.getAddButton());
    expect(onAddContextMenu).toHaveBeenCalledWith(view.getAddButton());
  });

  it('hides the add tile when the preference is off and restores it live', () => {
    let addVisible = false;
    const { view } = createView({
      getAddVisible: () => addVisible
    });

    renderItems(view, [{
      id: 'docs',
      title: 'Docs',
      url: 'https://example.com/docs'
    }]);
    expect(view.getAddButton()?.hidden).toBe(true);

    addVisible = true;
    renderItems(view, [{
      id: 'docs',
      title: 'Docs',
      url: 'https://example.com/docs'
    }]);
    expect(view.getAddButton()?.hidden).toBe(false);
  });

  it('hides the add tile at capacity without removing existing shortcuts', () => {
    const { view } = createView({
      maxShortcuts: 2
    });
    renderItems(view, [
      {
        id: 'one',
        title: 'One',
        url: 'https://one.example/'
      },
      {
        id: 'two',
        title: 'Two',
        url: 'https://two.example/'
      }
    ]);

    expect(view.getTiles()).toHaveLength(2);
    expect(view.getAddButton()?.hidden).toBe(true);

    renderItems(view, [{
      id: 'one',
      title: 'One',
      url: 'https://one.example/'
    }]);

    expect(view.getAddButton()?.hidden).toBe(false);
  });

  it('renders uploaded icons without invoking the favicon fallback runtime', () => {
    const attachFavicon = vi.fn();
    const getImmediateTheme = vi.fn(() => ({ accent: 'custom' }));
    const queueTheme = vi.fn();
    const { view } = createView({
      getShortcutIconDataUrl: (shortcutId) =>
        shortcutId === 'custom'
          ? 'data:image/png;base64,Y3VzdG9t'
          : '',
      attachFaviconWithFallbacks: attachFavicon,
      getImmediateThemeForSuggestion: getImmediateTheme,
      queueThemeForTarget: queueTheme
    });
    renderItems(view, [{
      id: 'custom',
      title: 'Custom',
      url: 'https://example.com/'
    }]);
    const tile = view.getTiles()[0];
    const image = tile.querySelector<HTMLImageElement>('.x-nt-shortcut-favicon');

    expect(tile.dataset.shortcutCustomIcon).toBe('true');
    expect(image?.src).toContain('data:image/png;base64,Y3VzdG9t');
    expect(attachFavicon).not.toHaveBeenCalled();
    expect(getImmediateTheme).toHaveBeenCalledWith(expect.objectContaining({
      customIconDataUrl: 'data:image/png;base64,Y3VzdG9t'
    }));
    expect(queueTheme).toHaveBeenCalledWith(
      tile,
      expect.objectContaining({
        customIconDataUrl: 'data:image/png;base64,Y3VzdG9t'
      }),
      expect.any(Function),
      { priority: 0 }
    );
  });

  it('adds a resolved high-resolution icon behind the browser favicon', async () => {
    const attachFavicon = vi.fn();
    let finishResolution: (dataUrl: string) => void = () => {};
    const resolveShortcutFaviconDataUrl = vi.fn(() => new Promise<string>((resolve) => {
      finishResolution = resolve;
    }));
    const { view } = createView({
      attachFaviconWithFallbacks: attachFavicon,
      getShortcutFaviconDataUrl: () => '',
      resolveShortcutFaviconDataUrl
    });
    renderItems(view, [{
      id: 'docs',
      title: 'Docs',
      url: 'https://example.com/docs'
    }]);

    expect(attachFavicon).toHaveBeenCalledOnce();
    expect(resolveShortcutFaviconDataUrl).toHaveBeenCalledWith(
      'https://example.com/docs'
    );

    await act(async () => {
      finishResolution('data:image/png;base64,aGlnaC1yZXM=');
      await Promise.resolve();
    });

    expect(attachFavicon).toHaveBeenCalledTimes(2);
    expect(attachFavicon).toHaveBeenLastCalledWith(
      expect.any(HTMLImageElement),
      'https://example.com/docs',
      'example.com',
      {
        primaryUrl: 'favicon:https://example.com/docs',
        browserUrl: 'data:image/png;base64,aGlnaC1yZXM=',
        skipPersisted: true
      }
    );
  });

  it('keeps a path-specific browser favicon ahead of a cached high-resolution fallback', () => {
    const attachFavicon = vi.fn();
    const resolveShortcutFaviconDataUrl = vi.fn(() => Promise.resolve(''));
    const developerConsoleUrl =
      'https://chrome.google.com/webstore/devconsole/example?hl=zh-cn';
    const { view } = createView({
      attachFaviconWithFallbacks: attachFavicon,
      getShortcutFaviconDataUrl: () => 'data:image/png;base64,Y2FjaGVkLWhk',
      resolveShortcutFaviconDataUrl
    });
    renderItems(view, [{
      id: 'docs',
      title: 'Docs',
      url: developerConsoleUrl
    }]);

    const image = view.getTiles()[0]
      .querySelector<HTMLImageElement>('.x-nt-shortcut-favicon');
    expect(image?.getAttribute('src')).toBeNull();
    expect(attachFavicon).toHaveBeenCalledWith(
      image,
      developerConsoleUrl,
      'example.com',
      {
        primaryUrl: `favicon:${developerConsoleUrl}`,
        browserUrl: 'data:image/png;base64,Y2FjaGVkLWhk',
        skipPersisted: true
      }
    );
    expect(resolveShortcutFaviconDataUrl).not.toHaveBeenCalled();
  });

  it('preserves keyed tile nodes when legacy drag order is synchronized', () => {
    const { view, options } = createView();
    const first = {
      id: 'first',
      title: 'First',
      url: 'https://first.example/'
    };
    const second = {
      id: 'second',
      title: 'Second',
      url: 'https://second.example/'
    };
    renderItems(view, [first, second]);
    const firstTile = view.getTiles()[0];
    const secondTile = view.getTiles()[1];
    const grid = options.grid as HTMLElement;

    grid.insertBefore(secondTile, firstTile);
    renderItems(view, [second, first]);

    expect(view.getTiles()).toEqual([secondTile, firstTile]);
    expect(view.getTiles()[0].dataset.shortcutId).toBe('second');
    expect(view.getTiles()[1].dataset.shortcutId).toBe('first');
  });
});
