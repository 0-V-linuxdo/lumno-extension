import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createBookmarksTopbar,
  createBookmarksTopbarApi,
  getSurfaceColorTokens,
  normalizeSurfaceMode,
  normalizeSurfaceColor,
  type BookmarksTopbarRuntime
} from './bookmarks-topbar';

let runtime: BookmarksTopbarRuntime | null = null;

afterEach(() => {
  if (runtime) {
    act(() => runtime?.destroy());
  }
  runtime = null;
  document.body.innerHTML = '';
});

describe('New Tab React bookmarks topbar', () => {
  it('moves adapter-owned content into the React surface and restores it', () => {
    const section = document.createElement('section');
    const grid = document.createElement('div');
    const modeControl = document.createElement('button');
    const managerButton = document.createElement('button');
    section.append(grid, managerButton, modeControl);
    document.body.appendChild(section);
    const onVisibilityChange = vi.fn();
    act(() => {
      runtime = createBookmarksTopbar({
        documentObj: document,
        windowObj: window,
        grid,
        managerButton,
        modeControl,
        onVisibilityChange
      });
      runtime.mount(document.body);
    });
    if (!runtime) {
      throw new Error('Expected bookmarks topbar runtime');
    }

    expect(createBookmarksTopbarApi().implementation).toBe('react');
    expect(runtime.element.dataset.reactIsland).toBe(
      'newtab-bookmarks-topbar'
    );
    expect(runtime.activate()).toBe(true);
    expect(runtime.itemsHost.firstElementChild).toBe(grid);
    expect(Array.from(runtime.actions.children)).toEqual([
      managerButton,
      modeControl
    ]);
    expect(runtime.setVisible(true)).toBe(true);
    expect(onVisibilityChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ height: 36 })
    );
    expect(runtime.deactivate()).toBe(true);
    expect(Array.from(section.children)).toEqual([
      grid,
      managerButton,
      modeControl
    ]);
  });

  it('keeps surface color and overflow behavior', () => {
    act(() => {
      runtime = createBookmarksTopbar({
        documentObj: document,
        windowObj: window
      });
    });
    if (!runtime) {
      throw new Error('Expected bookmarks topbar runtime');
    }
    expect(normalizeSurfaceColor('#EdF4Fe')).toBe('#edf4fe');
    expect(normalizeSurfaceColor('#abc')).toBe('#aabbcc');
    expect(getSurfaceColorTokens('#111827')?.ink).toBe('#f8fafc');
    expect(normalizeSurfaceMode('clear')).toBe('clear');
    expect(normalizeSurfaceMode('transparent')).toBe('transparent');
    expect(runtime.setSurfaceMode('transparent')).toBe('transparent');
    expect(runtime.element.dataset.surfaceMode).toBe('transparent');
    expect(runtime.setSurfaceColor('#edf4fe')).toBe('#edf4fe');
    expect(
      runtime.element.style.getPropertyValue(
        '--x-nt-bookmarks-topbar-surface'
      )
    ).toBe('#edf4fe');

    Object.defineProperties(runtime.viewport, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 500 }
    });
    runtime.activate();
    runtime.setVisible(true);
    expect(runtime.syncOverflowFade()).toBe(true);
    expect(runtime.edgeFade.dataset.visible).toBe('true');
  });
});
