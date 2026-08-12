import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRangeSliderControlController,
  createRequiredCheckboxGroupController,
  createSettingsControlsApi,
  createToggleControlController,
  type RangeSliderControlController,
  type RequiredCheckboxGroupController,
  type ToggleControlController
} from './settings-controls';

let controllers: Array<
  RangeSliderControlController |
  RequiredCheckboxGroupController |
  ToggleControlController
> = [];

afterEach(() => {
  act(() => controllers.forEach((controller) => controller.destroy()));
  controllers = [];
  document.body.textContent = '';
});

describe('Options settings controls React islands', () => {
  it('renders a controlled switch and reports changes', () => {
    const host = document.createElement('label');
    const onChange = vi.fn();
    document.body.appendChild(host);
    const controller = createToggleControlController(host, {
      kind: 'auto-pip',
      onChange
    });
    controllers.push(controller);

    act(() => controller.render({
      checked: true,
      id: 'auto-pip'
    }));
    const input = host.querySelector<HTMLInputElement>('input');
    expect(createSettingsControlsApi().implementation).toBe('react');
    expect(host.dataset.reactIsland).toBe('options-toggle-control');
    expect(input?.checked).toBe(true);

    act(() => input?.click());
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('keeps at least one required checkbox selected', () => {
    const host = document.createElement('div');
    const onChange = vi.fn();
    document.body.appendChild(host);
    const controller = createRequiredCheckboxGroupController(host, {
      kind: 'search-result-sources',
      onChange
    });
    controllers.push(controller);

    act(() => controller.render({
      items: [
        {
          checked: true,
          id: 'bookmark',
          label: '书签',
          labelKey: 'search_tag_bookmark',
          value: 'bookmark'
        },
        {
          checked: false,
          id: 'history',
          label: '历史',
          labelKey: 'search_tag_history',
          value: 'history'
        }
      ]
    }));
    const inputs = host.querySelectorAll<HTMLInputElement>('input');

    act(() => inputs[0]?.click());
    expect(inputs[0]?.checked).toBe(true);
    expect(onChange).not.toHaveBeenCalled();

    act(() => inputs[1]?.click());
    expect(onChange).toHaveBeenLastCalledWith(['bookmark', 'history']);
  });

  it('accepts adapter-driven state refreshes', () => {
    const host = document.createElement('label');
    document.body.appendChild(host);
    const controller = createToggleControlController(host, {
      kind: 'updates',
      onChange: vi.fn()
    });
    controllers.push(controller);

    act(() => controller.render({ checked: true, id: 'updates' }));
    act(() => controller.render({ checked: false, id: 'updates' }));

    expect(host.querySelector<HTMLInputElement>('input')?.checked).toBe(false);
  });

  it('renders the shared range slider and reports every integer step', () => {
    const host = document.createElement('div');
    const onInput = vi.fn();
    document.body.appendChild(host);
    const controller = createRangeSliderControlController(host, {
      kind: 'bookmark-columns',
      onInput
    });
    controllers.push(controller);

    act(() => controller.render({
      ariaLabel: '书签每行最多显示',
      id: 'bookmark-columns',
      max: 8,
      min: 4,
      step: 1,
      ticks: [
        { align: 'start', label: '4' },
        { label: '6' },
        { align: 'end', label: '8' }
      ],
      value: 6
    }));

    const input = host.querySelector<HTMLInputElement>('input[type="range"]');
    expect(host.dataset.reactIsland).toBe('options-range-slider-control');
    expect(input?.classList.contains('x-lumno-range-slider-input')).toBe(true);
    expect(input?.value).toBe('6');
    expect(host.querySelector<HTMLElement>('.x-lumno-range-slider-scale')
      ?.style.getPropertyValue('--x-lumno-range-slider-tick-count')).toBe('3');
    expect(host.querySelector('output')?.textContent).toBe('6');

    act(() => {
      if (!input) return;
      input.value = '7';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onInput).toHaveBeenCalledWith(7);
    expect(host.querySelector('output')?.textContent).toBe('7');
  });

  it('aligns a two-tick range to both slider endpoints', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const controller = createRangeSliderControlController(host, {
      kind: 'search-result-display-limit',
      onInput: vi.fn()
    });
    controllers.push(controller);

    act(() => controller.render({
      ariaLabel: '最多显示结果',
      id: 'search-result-display-limit',
      max: 10,
      min: 5,
      step: 1,
      ticks: [
        { align: 'start', label: '5' },
        { align: 'end', label: '10' }
      ],
      value: 10
    }));

    const scale = host.querySelector<HTMLElement>('.x-lumno-range-slider-scale');
    const ticks = host.querySelectorAll<HTMLElement>('.x-lumno-range-slider-tick');
    expect(scale?.style.getPropertyValue('--x-lumno-range-slider-tick-count')).toBe('2');
    expect(Array.from(ticks).map((tick) => [tick.dataset.align, tick.textContent]))
      .toEqual([['start', '5'], ['end', '10']]);
  });

  it('keeps adapter-provided localized labels after an interaction rerender', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const controller = createRequiredCheckboxGroupController(host, {
      kind: 'search-result-sources',
      onChange: vi.fn()
    });
    controllers.push(controller);

    act(() => controller.render({
      items: [
        {
          checked: true,
          id: 'bookmark',
          label: 'Bookmarks',
          labelKey: 'search_tag_bookmark',
          value: 'bookmark'
        },
        {
          checked: false,
          id: 'history',
          label: 'History',
          labelKey: 'search_tag_history',
          value: 'history'
        }
      ]
    }));
    const inputs = host.querySelectorAll<HTMLInputElement>('input');

    act(() => inputs[1]?.click());

    expect(Array.from(host.querySelectorAll('span')).map((node) => node.textContent))
      .toEqual(['Bookmarks', 'History']);
  });
});
