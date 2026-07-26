import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSettingsNavigationApi,
  createSettingsNavigationController,
  type SettingsNavigationController,
  type SettingsNavigationRenderModel
} from './settings-navigation';

let controllers: SettingsNavigationController[] = [];

const model: SettingsNavigationRenderModel = {
  activeKey: 'general',
  items: [
    {
      iconClass: 'ri-icon ri-command-fill',
      key: 'general',
      label: '常规',
      labelKey: 'settings_tab_general'
    },
    {
      iconClass: 'ri-icon ri-moon-clear-fill',
      key: 'appearance',
      label: '外观',
      labelKey: 'settings_tab_appearance'
    }
  ]
};

function createFixture() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const onSelect = vi.fn();
  const controller = createSettingsNavigationController(host, { onSelect });
  controllers.push(controller);
  return { controller, host, onSelect };
}

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
  controllers = [];
  document.body.textContent = '';
});

describe('Options settings navigation React island', () => {
  it('preserves the indicator, tab classes, icons, and active semantics', () => {
    const { controller, host } = createFixture();
    act(() => controller.render(model));

    expect(createSettingsNavigationApi().implementation).toBe('react');
    expect(host.dataset.reactIsland).toBe('options-settings-navigation');
    expect(host.querySelector('._x_extension_tabs_indicator_2024_unique_'))
      .not.toBeNull();
    expect(host.querySelectorAll('._x_extension_settings_tab_button_2024_unique_'))
      .toHaveLength(2);
    expect(host.querySelector('[data-tab="general"]')?.getAttribute('aria-current'))
      .toBe('page');
    expect(host.querySelector('[data-tab="appearance"] i')?.className)
      .toContain('ri-moon-clear-fill');
  });

  it('routes tab selection through the browser adapter', () => {
    const { controller, host, onSelect } = createFixture();
    act(() => {
      controller.render(model);
      host.querySelector<HTMLButtonElement>('[data-tab="appearance"]')?.click();
    });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('appearance');
  });

  it('updates active state and localized labels without replacing the host', () => {
    const { controller, host } = createFixture();
    act(() => controller.render(model));
    act(() => controller.render({
      activeKey: 'appearance',
      items: model.items.map((item) => ({
        ...item,
        label: item.key === 'appearance' ? 'Appearance' : 'General'
      }))
    }));

    expect(host.isConnected).toBe(true);
    expect(host.querySelector('[data-tab="general"]')?.getAttribute('aria-pressed'))
      .toBe('false');
    expect(host.querySelector('[data-tab="appearance"]')?.getAttribute('aria-pressed'))
      .toBe('true');
    expect(host.querySelector('[data-tab="appearance"]')?.textContent)
      .toContain('Appearance');
  });

  it('unmounts cleanly', () => {
    const { controller, host } = createFixture();
    act(() => {
      controller.render(model);
      controller.destroy();
    });

    expect(host.childElementCount).toBe(0);
  });
});
