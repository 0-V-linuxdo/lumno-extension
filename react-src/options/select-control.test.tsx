import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSelectControlApi,
  createSelectControlController,
  type SelectControlController
} from './select-control';

let controllers: SelectControlController[] = [];

const items = [
  { label: '跟随系统', labelKey: 'language_system', value: 'system' },
  { label: '简体中文', labelKey: 'language_zh_cn', value: 'zh-CN' }
];

afterEach(() => {
  act(() => controllers.forEach((controller) => controller.destroy()));
  controllers = [];
  document.body.textContent = '';
});

describe('Options select control React island', () => {
  it('renders selected labels and legacy classes', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const controller = createSelectControlController(host, {
      kind: 'language',
      onSelect: vi.fn()
    });
    controllers.push(controller);

    act(() => controller.render({ id: 'language', items, value: 'system' }));

    expect(createSelectControlApi().implementation).toBe('react');
    expect(host.dataset.reactIsland).toBe('options-select-control');
    expect(host.querySelector('._x_extension_select_label_2024_unique_')?.textContent)
      .toBe('跟随系统');
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(2);
  });

  it('opens the menu and reports a selected value', () => {
    const host = document.createElement('div');
    const onSelect = vi.fn();
    document.body.appendChild(host);
    const controller = createSelectControlController(host, {
      kind: 'language',
      onSelect
    });
    controllers.push(controller);
    act(() => controller.render({ id: 'language', items, value: 'system' }));

    act(() => {
      host.querySelector<HTMLButtonElement>('button')?.click();
    });
    expect(host.dataset.open).toBe('true');
    const options = host.querySelectorAll<HTMLElement>('[role="option"]');
    act(() => options[1]?.click());

    expect(onSelect).toHaveBeenCalledWith('zh-CN');
    expect(host.dataset.open).toBe('false');
    expect(host.querySelector('._x_extension_select_label_2024_unique_')?.textContent)
      .toBe('简体中文');
  });

  it('accepts adapter-driven selection and copy updates', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const controller = createSelectControlController(host, {
      kind: 'language',
      onSelect: vi.fn()
    });
    controllers.push(controller);
    act(() => controller.render({ id: 'language', items, value: 'system' }));
    act(() => controller.render({
      id: 'language',
      items: items.map((item) => ({
        ...item,
        label: item.value === 'system' ? 'System' : 'Simplified Chinese'
      })),
      value: 'zh-CN'
    }));

    expect(host.querySelector('._x_extension_select_label_2024_unique_')?.textContent)
      .toBe('Simplified Chinese');
  });
});
