import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSelectMenuApi,
  createSelectMenuController,
  type SelectMenuConfig,
  type SelectMenuInstance
} from './select-menu';

type Controller = ReturnType<typeof createSelectMenuController>;
const mounted: Array<{ controller: Controller; host: HTMLElement }> = [];

const baseConfig: SelectMenuConfig = {
  ariaLabel: 'Display mode',
  className: 'x-nt-section-mode-select',
  iconOnly: true,
  id: 'mode-menu',
  menuAlign: 'left',
  menuClassName: 'x-nt-section-mode-portal',
  menuMaxWidth: 240,
  menuMinWidth: 168,
  menuPortal: true,
  menuPortalOffset: 8,
  menuPortalZIndex: 10020,
  menuTitle: 'Display mode',
  menuWidth: 'content',
  options: [
    { label: 'Folders', value: 'folder' },
    { label: 'List', value: 'list' }
  ],
  selectId: 'mode-menu-select',
  tooltip: 'Display mode',
  triggerIconClass: 'ri-more-line',
  value: 'folder'
};

function createMenu(config: SelectMenuConfig = baseConfig) {
  const controller = createSelectMenuController({
    documentObj: document,
    windowObj: window
  });
  const holder: { value: SelectMenuInstance | null } = { value: null };
  act(() => {
    holder.value = controller.createSelect(config);
  });
  const instance = holder.value;
  if (!instance) {
    throw new Error('Expected React select menu instance');
  }
  document.body.appendChild(instance.wrapper);
  mounted.push({ controller, host: instance.wrapper });
  return { controller, instance };
}

afterEach(() => {
  act(() => {
    mounted.forEach(({ controller, host }) => controller.destroy(host));
  });
  mounted.length = 0;
  document.body.innerHTML = '';
});

describe('New Tab select menu React island', () => {
  it('preserves the custom-select DOM and synchronous controller contract', () => {
    const { controller, instance } = createMenu();

    expect(createSelectMenuApi().implementation).toBe('react');
    expect(instance.wrapper.dataset.reactIsland).toBe('newtab-select-menu');
    expect(instance.wrapper.classList.contains('x-nt-section-mode-select')).toBe(
      true
    );
    expect(instance.menu.parentElement).toBe(document.body);
    expect(controller.isOpen(instance.wrapper)).toBe(false);

    act(() => controller.setOpen(instance.wrapper, true));

    expect(controller.isOpen(instance.wrapper)).toBe(true);
    expect(instance.wrapper.dataset.open).toBe('true');
    expect(instance.menu.dataset.open).toBe('true');
    expect(instance.trigger.getAttribute('aria-expanded')).toBe('true');

    act(() => controller.setOpen(instance.wrapper, false));
    expect(controller.isOpen(instance.wrapper)).toBe(false);
  });

  it('dispatches the legacy select change event and updates selection', () => {
    const { controller, instance } = createMenu();
    const onChange = vi.fn();
    instance.select.addEventListener('change', onChange);
    act(() => controller.setOpen(instance.wrapper, true));

    act(() => {
      instance.menu
        .querySelector<HTMLElement>('[data-value="list"]')
        ?.click();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(instance.select.value).toBe('list');
    expect(
      instance.menu.querySelector('[data-value="list"]')?.getAttribute(
        'data-selected'
      )
    ).toBe('true');
    expect(controller.isOpen(instance.wrapper)).toBe(false);
  });

  it('supports action rows and in-place localization updates', () => {
    const onAction = vi.fn();
    const { controller, instance } = createMenu({
      ...baseConfig,
      onAction,
      options: [
        ...(baseConfig.options || []),
        {
          action: 'pick-color',
          dividerBefore: true,
          iconClass: 'ri-dropper-line',
          label: 'Pick color',
          value: '__pick__'
        }
      ]
    });
    act(() => controller.setOpen(instance.wrapper, true));
    act(() => {
      instance.menu
        .querySelector<HTMLElement>('[data-value="__pick__"]')
        ?.click();
    });
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pick-color' })
    );

    act(() => {
      controller.setMenuTitle(instance.wrapper, 'Anzeige');
      controller.setOptions(
        instance.wrapper,
        [{ label: 'Liste', value: 'list' }],
        'list'
      );
    });

    expect(
      instance.menu.querySelector(
        '._x_extension_select_menu_title_2024_unique_'
      )?.textContent
    ).toBe('Anzeige');
    expect(instance.select.value).toBe('list');
    expect(instance.menu.textContent).toContain('Liste');
  });

  it('closes when focus moves to an outside pointer target', () => {
    const { controller, instance } = createMenu();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    act(() => controller.setOpen(instance.wrapper, true));

    act(() => {
      outside.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      );
    });

    expect(controller.isOpen(instance.wrapper)).toBe(false);
  });
});
