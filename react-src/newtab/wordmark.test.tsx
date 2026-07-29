import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTopContentApi,
  createTopContentController,
  type TopContentController
} from './wordmark';

let controllers: TopContentController[] = [];

function createController(animateEntry = true, mode: 'brand' | 'time' = 'brand') {
  const host = document.createElement('div');
  const onActivate = vi.fn();
  const onEntryAnimationComplete = vi.fn();
  document.body.appendChild(host);
  const controller = createTopContentController(host, {
    onActivate,
    onEntryAnimationComplete
  });
  controllers.push(controller);
  act(() => {
    controller.render({
      animateEntry,
      ariaLabel: 'Lumno Chrome Web Store',
      imageSrc: '/wordmark.svg',
      locale: 'zh-CN',
      mode
    });
  });
  return { controller, host, onActivate, onEntryAnimationComplete };
}

afterEach(() => {
  act(() => controllers.forEach((controller) => controller.destroy()));
  controllers = [];
  document.body.innerHTML = '';
});

describe('New Tab top-content React island', () => {
  it('owns the existing wordmark host and visual elements', () => {
    const { controller, host } = createController();

    expect(createTopContentApi().implementation).toBe('react');
    expect(host.id).toBe('_x_extension_newtab_wordmark_2026_unique_');
    expect(host.dataset.reactIsland).toBe('newtab-wordmark');
    expect(host.dataset.enter).toBe('run');
    expect(controller.getButton()?.getAttribute('aria-label')).toBe(
      'Lumno Chrome Web Store'
    );
    expect(controller.getImage()?.getAttribute('src')).toBe('/wordmark.svg');
    expect(controller.getImage()?.getAttribute('width')).toBe('112');
    expect(controller.getImage()?.getAttribute('height')).toBe('25.1557');
    expect(controller.getSolid()?.className).toBe('x-nt-wordmark-solid');
  });

  it('preserves foreground and background navigation dispositions', () => {
    const { controller, onActivate } = createController();
    const button = controller.getButton();

    act(() => button?.click());
    act(() => {
      button?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, ctrlKey: true })
      );
    });
    act(() => {
      button?.dispatchEvent(
        new MouseEvent('auxclick', { bubbles: true, button: 1 })
      );
    });

    expect(onActivate.mock.calls).toEqual([
      ['newTab'],
      ['backgroundTab'],
      ['backgroundTab']
    ]);
  });

  it('renders a single-line animated hour and minute clock', () => {
    const { controller, host } = createController(true, 'time');
    const clock = host.querySelector<HTMLElement>('time.x-nt-time-mark');

    expect(controller.getContent()).toBe(clock);
    expect(clock?.getAttribute('datetime')).toMatch(/^\d{2}:\d{2}$/);
    expect(clock?.style.display).toBe('inline-flex');
    expect(clock?.style.fontFamily).toContain('Open Sans');
    expect(clock?.querySelectorAll('number-flow-react')).toHaveLength(2);
    expect(clock?.querySelector('br')).toBeNull();
    expect(controller.getButton()).toBeNull();
    expect(controller.getImage()).toBeNull();
    expect(controller.getSolid()).toBeNull();
  });

  it('reports the named entry animation and reduced-motion state', () => {
    const { controller, host, onEntryAnimationComplete } =
      createController(false);
    expect(host.dataset.enter).toBe('done');
    const event = new Event('animationend', { bubbles: true });
    Object.defineProperty(event, 'animationName', {
      value: '_x_nt_wordmark_enter_2026_unique_'
    });
    act(() => controller.getButton()?.dispatchEvent(event));
    expect(onEntryAnimationComplete).toHaveBeenCalledWith(
      '_x_nt_wordmark_enter_2026_unique_'
    );
  });
});
