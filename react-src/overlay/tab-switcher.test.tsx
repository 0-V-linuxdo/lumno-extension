import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTabSwitcherView,
  createTabSwitcherViewApi,
  type TabSwitcherViewController
} from './tab-switcher';

let controllers: TabSwitcherViewController[] = [];

function createView() {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  const onSelect = vi.fn();
  const onActivate = vi.fn();
  let controller!: TabSwitcherViewController;
  act(() => {
    controller = createTabSwitcherView({
      document,
      root: shadow,
      selectedIndex: 0,
      ariaLabel: 'Recent tabs',
      tabs: [
        {
          id: 1,
          title: 'First tab',
          url: 'https://first.example/',
          favIconUrl: 'data:image/png;base64,dGVzdA==',
          thumbnail: 'data:image/png;base64,b2xk'
        },
        {
          id: 2,
          title: 'Second tab',
          url: 'https://second.example/'
        }
      ],
      normalizeAccentCss: () => 'rgb(1, 2, 3)',
      onSelect,
      onActivate
    });
  });
  controllers.push(controller);
  return { controller, host, shadow, onSelect, onActivate };
}

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
  controllers = [];
  document.body.textContent = '';
  vi.useRealTimers();
});

describe('Overlay tab switcher React island', () => {
  it('renders cards synchronously with the legacy DOM contract', () => {
    const { controller, shadow } = createView();

    expect(createTabSwitcherViewApi().implementation).toBe('react');
    expect(controller.panel?.dataset.reactIsland).toBe(
      'overlay-tab-switcher'
    );
    expect(controller.panel?.getAttribute('role')).toBe('listbox');
    expect(controller.buttons).toHaveLength(2);
    expect(controller.buttons[0].dataset.active).toBe('true');
    expect(controller.buttons[0].tabIndex).toBe(0);
    expect(controller.buttons[1].tabIndex).toBe(-1);
    expect(
      shadow.querySelector('.x-tab-switcher-name')?.textContent
    ).toBe('First tab');
    expect(
      shadow.querySelector('.x-tab-switcher-host')?.textContent
    ).toBe('first.example');
    expect(
      controller.buttons[0].querySelector('.x-tab-switcher-title-favicon')
    ).not.toBeNull();
    expect(
      controller.buttons[0].querySelector('.x-tab-switcher-thumb-favicon')
    ).toBeNull();
  });

  it('updates selection without replacing stable card nodes', () => {
    const { controller, onSelect, onActivate } = createView();
    const first = controller.buttons[0];
    const second = controller.buttons[1];

    act(() => {
      controller.updateSelection(1);
    });
    expect(controller.buttons[0]).toBe(first);
    expect(controller.buttons[1]).toBe(second);
    expect(second.dataset.active).toBe('true');
    expect(
      first.querySelector('.x-tab-switcher-title-favicon')
    ).not.toBeNull();

    act(() => {
      second.focus();
      second.click();
    });
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(onActivate).toHaveBeenCalledWith(
      1,
      expect.any(MouseEvent)
    );
  });

  it('crossfades a live thumbnail update on the existing card', () => {
    vi.useFakeTimers();
    const { controller } = createView();
    const first = controller.buttons[0];

    let result!: { ok: boolean };
    act(() => {
      result = controller.updateThumbnail({
        tabId: 1,
        url: 'https://first.example/',
        thumbnail: 'data:image/png;base64,bmV3',
        thumbnailStatus: 'ok'
      });
    });

    expect(result.ok).toBe(true);
    expect(controller.buttons[0]).toBe(first);
    expect(
      first.querySelectorAll('img[data-kind="thumbnail"]')
    ).toHaveLength(2);

    act(() => {
      vi.runAllTimers();
    });
    expect(
      first.querySelectorAll('img[data-kind="thumbnail"]')
    ).toHaveLength(1);
    expect(
      first.querySelector<HTMLImageElement>(
        'img[data-kind="thumbnail"]'
      )?.src
    ).toContain('bmV3');
  });
});
