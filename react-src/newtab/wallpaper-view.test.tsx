import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createWallpaperViewApi,
  createWallpaperViewController,
  type WallpaperViewController
} from './wallpaper-view';

let controller: WallpaperViewController | null = null;

afterEach(() => {
  if (controller) {
    act(() => controller?.destroy());
  }
  controller = null;
  document.body.innerHTML = '';
});

describe('New Tab React wallpaper view', () => {
  it('renders the complete appearance panel contract', () => {
    act(() => {
      controller = createWallpaperViewController({
        documentObj: document,
        model: {
          activeTab: 'built-in',
          appearanceOptions: [
            { mode: 'system', imageUrl: '/system.svg' },
            { mode: 'light', imageUrl: '/light.svg' },
            { mode: 'dark', imageUrl: '/dark.svg' }
          ],
          effectTypes: [
            { type: 'none', fallback: 'Off' },
            { type: 'grain', fallback: 'Grain' }
          ],
          favicons: [{ id: 'default', previewUrl: '/favicon.png' }],
          icons: {},
          moreSettingsUrl: '/options#appearance',
          searchWidth: {
            min: 720,
            max: 1040,
            ticks: []
          },
          topContentOptions: [
            { value: 'brand', label: 'Brand' },
            { value: 'time', label: 'Time' },
            { value: 'off', label: 'Hide' }
          ],
          wallpapers: [
            { id: 'coast', path: '/coast.webp', thumbnailUrl: '/coast-thumb.webp' }
          ]
        }
      });
    });
    if (!controller) {
      throw new Error('Expected wallpaper view controller');
    }
    expect(createWallpaperViewApi().implementation).toBe('react');
    expect(controller.control.dataset.reactIsland).toBe('newtab-wallpaper');
    expect(controller.getRefs().builtInGrid).toBeTruthy();
    expect(
      controller.control.querySelector('[data-wallpaper-id="coast"]')
    ).not.toBeNull();
    expect(
      controller.control.querySelectorAll('.x-nt-effect-option')
    ).toHaveLength(2);
    const topContentGroup = controller.getRefs().topContentTabs;
    expect(topContentGroup?.getAttribute('role')).toBe('group');
    const topContentButtons = topContentGroup?.querySelectorAll('button');
    expect(topContentButtons).toHaveLength(3);
    expect(topContentButtons?.[0]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('updates custom wallpaper tiles without replacing the panel', () => {
    act(() => {
      controller = createWallpaperViewController({
        documentObj: document,
        model: {
          appearanceOptions: [],
          effectTypes: [],
          favicons: [],
          icons: {},
          searchWidth: { min: 720, max: 1040, ticks: [] },
          wallpapers: []
        }
      });
    });
    if (!controller) {
      throw new Error('Expected wallpaper view controller');
    }
    const panel = controller.panel;
    let tiles: HTMLElement[] = [];
    act(() => {
      tiles = controller?.renderCustomWallpapers([
        { id: 'custom-1', thumbnailUrl: 'data:image/png;base64,AA==' }
      ]) || [];
    });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].dataset.wallpaperId).toBe('custom-1');
    expect(controller.panel).toBe(panel);
  });
});
