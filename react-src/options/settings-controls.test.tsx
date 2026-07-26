import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRequiredCheckboxGroupController,
  createSettingsControlsApi,
  createToggleControlController,
  type RequiredCheckboxGroupController,
  type ToggleControlController
} from './settings-controls';

let controllers: Array<RequiredCheckboxGroupController | ToggleControlController> = [];

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
});
