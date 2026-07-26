import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createToastApi,
  createToastController,
  type ToastController
} from './toast';

let controllers: ToastController[] = [];

function createController(duration = 2200): {
  controller: ToastController;
  element: HTMLDivElement;
} {
  const element = document.createElement('div');
  element.setAttribute('data-show', 'false');
  document.body.appendChild(element);
  const controller = createToastController(element, {
    windowObj: window,
    duration
  });
  controllers.push(controller);
  return { controller, element };
}

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
  controllers = [];
  vi.useRealTimers();
});

describe('Toast React island', () => {
  it('preserves the synchronous show and error palette contract', () => {
    const { controller, element } = createController();

    act(() => {
      controller.show('Saved', { error: true, duration: 0 });
    });

    expect(createToastApi().implementation).toBe('react');
    expect(element.dataset.reactIsland).toBe('toast');
    expect(element.dataset.show).toBe('true');
    expect(element.textContent).toBe('Saved');
    expect(element.style.getPropertyValue('background')).toBe(
      'rgba(153, 27, 27, 0.92)'
    );

    act(() => {
      controller.show('Done', { duration: 0 });
    });

    expect(element.textContent).toBe('Done');
    expect(element.style.getPropertyValue('background')).toBe('');
  });

  it('restarts the auto-hide timer when a newer message arrives', () => {
    vi.useFakeTimers();
    const { controller, element } = createController(1000);

    act(() => {
      controller.show('First');
      vi.advanceTimersByTime(700);
      controller.show('Second');
      vi.advanceTimersByTime(700);
    });
    expect(element.dataset.show).toBe('true');
    expect(element.textContent).toBe('Second');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(element.dataset.show).toBe('false');
  });

  it('hides and unmounts safely when destroyed', () => {
    const { controller, element } = createController();

    act(() => {
      controller.show('Visible', { duration: 0 });
      controller.hide();
    });
    expect(element.dataset.show).toBe('false');

    act(() => {
      controller.destroy();
      controller.show('Ignored', { duration: 0 });
    });
    expect(element.textContent).toBe('');
    expect(element.dataset.show).toBe('false');
  });

  it('keeps the legacy controller available when no host exists', () => {
    const legacyController = {
      show: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn()
    };
    const legacyApi = {
      createToastController: vi.fn(() => legacyController)
    };
    const controller = createToastController(null, {}, legacyApi);

    expect(controller).toBe(legacyController);
    expect(legacyApi.createToastController).toHaveBeenCalledWith(null, {});
  });
});
