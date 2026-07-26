import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createWordmarkApi,
  createWordmarkController,
  type WordmarkController
} from './wordmark';

let controllers: WordmarkController[] = [];

function createController(animateEntry = true) {
  const host = document.createElement('div');
  const onActivate = vi.fn();
  const onEntryAnimationComplete = vi.fn();
  document.body.appendChild(host);
  const controller = createWordmarkController(host, {
    onActivate,
    onEntryAnimationComplete
  });
  controllers.push(controller);
  act(() => {
    controller.render({
      animateEntry,
      ariaLabel: 'Lumno Chrome Web Store',
      imageSrc: '/wordmark.svg'
    });
  });
  return { controller, host, onActivate, onEntryAnimationComplete };
}

afterEach(() => {
  act(() => controllers.forEach((controller) => controller.destroy()));
  controllers = [];
  document.body.innerHTML = '';
});

describe('New Tab wordmark React island', () => {
  it('owns the existing wordmark host and visual elements', () => {
    const { controller, host } = createController();

    expect(createWordmarkApi().implementation).toBe('react');
    expect(host.id).toBe('_x_extension_newtab_wordmark_2026_unique_');
    expect(host.dataset.reactIsland).toBe('newtab-wordmark');
    expect(host.dataset.enter).toBe('run');
    expect(controller.getButton()?.getAttribute('aria-label')).toBe(
      'Lumno Chrome Web Store'
    );
    expect(controller.getImage()?.getAttribute('src')).toBe('/wordmark.svg');
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
