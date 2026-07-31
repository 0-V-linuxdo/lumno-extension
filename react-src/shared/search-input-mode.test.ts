import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../src/shared/menu-surface.js';
import '../../src/shared/shortcut-display.js';
import '../../src/shared/search-input-mode.js';

Object.assign(globalThis, {
  pinyinPro: {
    pinyin(value: string) {
      const syllables: Record<string, string> = {
        包: 'bao',
        书: 'shu',
        签: 'qian',
        豆: 'dou'
      };
      return Array.from(String(value || '')).map((character) => (
        syllables[character] || ''
      )).filter(Boolean);
    }
  }
});

interface ModeMenuItem {
  active?: boolean;
  group?: string;
  iconClass?: string;
  iconUrl?: string;
  id: string;
  kind: string;
  label: string;
  menuIconName?: string;
  provider?: Record<string, unknown>;
  searchTerms?: string[];
}

interface ModeController {
  clearProviderPrefix(): void;
  closeModeMenu(restoreFocus?: boolean): boolean;
  destroy(): void;
  fitModeMenuWithinViewport(options?: {
    bottomInset?: number;
    viewportBottom?: number;
  }): number | null;
  getModeMenuFilterQuery(): string;
  menuElement: HTMLDivElement;
  openModeMenu(focusTarget?: string): boolean;
  refreshModeMenuLanguage(): void;
  resetModeMenuDoubleTab(): boolean;
  resetModeTagRemovalConfirmation(): boolean;
  setModeMenuResultOffset(offset: number): void;
  setPrefixText(
    label: string,
    theme?: object,
    options?: Record<string, unknown>
  ): void;
  setProviderPrefix(
    provider: Record<string, unknown>,
    theme?: object,
    options?: Record<string, unknown>
  ): void;
  setTabHintVisible(
    visible: boolean,
    provider?: Record<string, unknown>
  ): void;
  shouldCompleteModeMenuDoubleTab(event: KeyboardEvent): boolean;
  shouldContainModeMenuTab(event: KeyboardEvent): boolean;
  shouldHandleModeMenuKeyEvent(event: KeyboardEvent): boolean;
  shouldOpenModeMenuForActiveModeOnTab(event: KeyboardEvent): boolean;
  shouldOpenModeMenuOnDoubleTab(event: KeyboardEvent): boolean;
  shouldRemoveModeTagOnBackspace(event?: { repeat?: boolean }): boolean;
}

declare global {
  interface Window {
    LumnoSearchInputMode: {
      createInputModeController(
        parts: Record<string, HTMLElement>,
        options?: Record<string, unknown>
      ): ModeController;
    };
  }
}

function createModeParts() {
  const container = document.createElement('div');
  const input = document.createElement('input');
  input.style.paddingLeft = '44px';
  const modePrefix = document.createElement('button');
  const modePrefixIcon = document.createElement('img');
  const modePrefixGlyph = document.createElement('i');
  const modePrefixText = document.createElement('span');
  const modePrefixChevron = document.createElement('i');
  const modePrefixCurrent = document.createElement('span');
  modePrefix.append(
    modePrefixIcon,
    modePrefixGlyph,
    modePrefixText,
    modePrefixCurrent,
    modePrefixChevron
  );
  const modeMenu = document.createElement('div');
  const modeTabHint = document.createElement('span');
  const modeTabHintKey = document.createElement('span');
  const modeTabHintText = document.createElement('span');
  modeTabHint.append(modeTabHintKey, modeTabHintText);
  container.append(input, modePrefix, modeMenu, modeTabHint);
  document.body.appendChild(container);
  return {
    container,
    input,
    modeMenu,
    modePrefix,
    modePrefixChevron,
    modePrefixCurrent,
    modePrefixGlyph,
    modePrefixIcon,
    modePrefixText,
    modeTabHint,
    modeTabHintKey,
    modeTabHintText
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('Shared search scope menu', () => {
  it('opens only after two distinct empty-input Tab presses within the shared window', () => {
    vi.useFakeTimers();
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }]
      }
    );
    const createTabEvent = (options: KeyboardEventInit = {}) => new KeyboardEvent(
      'keydown',
      { bubbles: true, cancelable: true, key: 'Tab', ...options }
    );

    const firstTab = createTabEvent();
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(firstTab)).toBe(false);
    expect(controller.shouldOpenModeMenuOnDoubleTab(firstTab)).toBe(false);
    expect(firstTab.defaultPrevented).toBe(true);
    expect(controller.shouldOpenModeMenuOnDoubleTab(firstTab)).toBe(false);

    const repeatedTab = createTabEvent({ repeat: true });
    expect(controller.shouldOpenModeMenuOnDoubleTab(repeatedTab)).toBe(false);
    expect(repeatedTab.defaultPrevented).toBe(true);

    const secondTab = createTabEvent();
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(secondTab)).toBe(false);
    expect(controller.shouldOpenModeMenuOnDoubleTab(secondTab)).toBe(true);
    expect(secondTab.defaultPrevented).toBe(true);

    expect(controller.shouldOpenModeMenuOnDoubleTab(createTabEvent())).toBe(false);
    vi.advanceTimersByTime(700);
    expect(controller.shouldOpenModeMenuOnDoubleTab(createTabEvent())).toBe(false);
    parts.input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(controller.shouldOpenModeMenuOnDoubleTab(createTabEvent())).toBe(false);
    parts.input.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })
    );
    expect(controller.shouldOpenModeMenuOnDoubleTab(createTabEvent())).toBe(false);
    parts.input.dispatchEvent(new FocusEvent('blur'));
    expect(controller.shouldOpenModeMenuOnDoubleTab(createTabEvent())).toBe(false);
    controller.resetModeMenuDoubleTab();

    const modifiedTab = createTabEvent({ shiftKey: true });
    expect(controller.shouldOpenModeMenuOnDoubleTab(modifiedTab)).toBe(false);
    expect(modifiedTab.defaultPrevented).toBe(false);

    controller.setPrefixText('Google', {}, { modeId: 'provider:google' });
    const taggedTab = createTabEvent();
    expect(controller.shouldOpenModeMenuOnDoubleTab(taggedTab)).toBe(false);
    expect(taggedTab.defaultPrevented).toBe(false);
    controller.destroy();
  });

  it('preserves the first overlay Tab while its automatic open-tabs tag is applied', () => {
    vi.useFakeTimers();
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(parts);
    const createTabEvent = () => new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab'
    });

    const firstTab = createTabEvent();
    expect(controller.shouldOpenModeMenuOnDoubleTab(firstTab)).toBe(false);
    expect(firstTab.defaultPrevented).toBe(true);
    controller.setPrefixText('Open tabs', {}, {
      modeId: 'openTabs',
      preserveModeMenuDoubleTab: true
    });
    expect(parts.modePrefix.dataset.modeId).toBe('openTabs');

    const secondTab = createTabEvent();
    expect(controller.shouldCompleteModeMenuDoubleTab(secondTab)).toBe(true);
    expect(secondTab.defaultPrevented).toBe(true);

    const expiredFirstTab = createTabEvent();
    controller.setPrefixText('', {}, { modeId: '' });
    expect(controller.shouldOpenModeMenuOnDoubleTab(expiredFirstTab)).toBe(false);
    controller.setPrefixText('Open tabs', {}, {
      modeId: 'openTabs',
      preserveModeMenuDoubleTab: true
    });
    vi.advanceTimersByTime(700);
    const lateSecondTab = createTabEvent();
    expect(controller.shouldCompleteModeMenuDoubleTab(lateSecondTab)).toBe(false);
    expect(lateSecondTab.defaultPrevented).toBe(false);
    controller.destroy();
  });

  it('opens on one Tab when a tag is already selected and preserves that tag', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }]
      }
    );
    const createTabEvent = (options: KeyboardEventInit = {}) => new KeyboardEvent(
      'keydown',
      { bubbles: true, cancelable: true, key: 'Tab', ...options }
    );

    const untaggedTab = createTabEvent();
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(untaggedTab)).toBe(
      false
    );
    expect(untaggedTab.defaultPrevented).toBe(false);

    controller.setPrefixText('Google', {}, { modeId: 'provider:google' });
    const repeatedTab = createTabEvent({ repeat: true });
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(repeatedTab)).toBe(
      false
    );
    expect(repeatedTab.defaultPrevented).toBe(false);
    const modifiedTab = createTabEvent({ shiftKey: true });
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(modifiedTab)).toBe(
      false
    );
    expect(modifiedTab.defaultPrevented).toBe(false);

    parts.input.value = 'query';
    const queryTab = createTabEvent();
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(queryTab)).toBe(
      true
    );
    expect(queryTab.defaultPrevented).toBe(true);
    expect(controller.openModeMenu('none')).toBe(true);
    expect(parts.input.value).toBe('query');
    expect(parts.modePrefix.dataset.modeId).toBe('provider:google');
    expect(
      controller.menuElement.querySelector('[role="menuitemradio"]')
        ?.getAttribute('aria-checked')
    ).toBe('true');
    controller.closeModeMenu(false);
    parts.input.value = '';

    const taggedTab = createTabEvent();
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(taggedTab)).toBe(
      true
    );
    expect(taggedTab.defaultPrevented).toBe(true);
    expect(controller.openModeMenu('none')).toBe(true);
    expect(parts.modePrefix.dataset.modeId).toBe('provider:google');
    expect(
      controller.menuElement.querySelector('[role="menuitemradio"]')
        ?.getAttribute('aria-checked')
    ).toBe('true');

    const activeCheckWhileOpen = createTabEvent();
    expect(
      controller.shouldOpenModeMenuForActiveModeOnTab(activeCheckWhileOpen)
    ).toBe(
      false
    );
    expect(activeCheckWhileOpen.defaultPrevented).toBe(false);
    const containedOpenTab = createTabEvent();
    expect(controller.shouldContainModeMenuTab(containedOpenTab)).toBe(true);
    expect(containedOpenTab.defaultPrevented).toBe(true);
    const modifiedOpenTab = createTabEvent({ shiftKey: true });
    expect(controller.shouldContainModeMenuTab(modifiedOpenTab)).toBe(false);
    expect(modifiedOpenTab.defaultPrevented).toBe(false);
    controller.destroy();
  });

  it('returns to a clean double-Tab gesture after the active tag is removed', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }]
      }
    );
    const createTabEvent = () => new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab'
    });

    controller.setPrefixText('Google', {}, { modeId: 'provider:google' });
    controller.openModeMenu('none');
    controller.clearProviderPrefix();

    expect(parts.modePrefix.hasAttribute('data-mode-id')).toBe(false);
    expect(controller.menuElement.hidden).toBe(true);

    const firstTab = createTabEvent();
    expect(controller.shouldOpenModeMenuForActiveModeOnTab(firstTab)).toBe(false);
    expect(controller.shouldOpenModeMenuOnDoubleTab(firstTab)).toBe(false);
    expect(firstTab.defaultPrevented).toBe(true);

    controller.setPrefixText('Open tabs', {}, {
      modeId: 'openTabs',
      preserveModeMenuDoubleTab: true
    });
    const secondTab = createTabEvent();
    expect(controller.shouldCompleteModeMenuDoubleTab(secondTab)).toBe(true);
    expect(secondTab.defaultPrevented).toBe(true);
    controller.destroy();
  });

  it('keeps a platform-aware shortcut hint fixed outside the scrollable menu grid', () => {
    const macParts = createModeParts();
    let localizedShortcutHint = '快速打开此面板';
    let localizedFilterHint = '点击面板，输入拼音或英文快速筛选';
    let localizedFilterQuery = '检索：{query}';
    const macController = window.LumnoSearchInputMode.createInputModeController(
      macParts,
      {
        formatMessage: (
          key: string,
          fallback: string,
          values?: Record<string, string>
        ) => {
          if (key === 'search_scope_menu_shortcut_hint') {
            return localizedShortcutHint;
          }
          if (key === 'search_scope_menu_filter_hint') {
            return localizedFilterHint;
          }
          if (key === 'search_scope_menu_filter_query') {
            return localizedFilterQuery.replace(
              '{query}',
              String(values?.query || '')
            );
          }
          return fallback;
        },
        getModeMenuItems: () => [{
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }],
        navigatorLike: { platform: 'MacIntel' }
      }
    );
    macController.openModeMenu('none');
    const macContent = macController.menuElement.querySelector(
      '[data-search-input-mode-menu-content]'
    );
    const macFooter = macController.menuElement.querySelector(
      '[data-search-input-mode-menu-footer]'
    );
    expect(macContent?.parentElement).toBe(macController.menuElement);
    expect(macFooter?.parentElement).toBe(macController.menuElement);
    expect(macController.menuElement.lastElementChild).toBe(macFooter);
    expect(macContent?.querySelectorAll('[role="menuitemradio"]')).toHaveLength(1);
    expect(macFooter?.querySelector('[role="menuitemradio"]')).toBeNull();
    expect(
      macFooter?.querySelector('[data-search-input-mode-menu-footer-key]')
        ?.textContent
    ).toBe('⇥ ⇥');
    expect(
      macFooter?.querySelector('[data-search-input-mode-menu-footer-text]')
        ?.textContent
    ).toBe('快速打开此面板');
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text]'
      )?.textContent
    ).toBe('点击面板，输入拼音或英文快速筛选');
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-divider]'
      )
    ).toBeNull();
    expect(macFooter?.firstElementChild).toBe(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text]'
      )
    );
    expect(macFooter?.lastElementChild).toBe(
      macFooter?.querySelector('[data-search-input-mode-menu-footer-text]')
    );
    macController.menuElement.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'g'
    }));
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text]'
      )?.textContent
    ).toBe('检索：g');
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text] .x-lumno-search-input-mode__menu-match'
      )?.textContent
    ).toBe('g');
    macController.menuElement.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Backspace'
    }));
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text]'
      )?.textContent
    ).toBe('点击面板，输入拼音或英文快速筛选');
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text] .x-lumno-search-input-mode__menu-match'
      )
    ).toBeNull();
    localizedShortcutHint = '快速開啟此面板';
    localizedFilterHint = '點擊面板，輸入拼音或英文快速篩選';
    localizedFilterQuery = '搜尋：{query}';
    macController.refreshModeMenuLanguage();
    expect(
      macFooter?.querySelector('[data-search-input-mode-menu-footer-text]')
        ?.textContent
    ).toBe('快速開啟此面板');
    expect(
      macFooter?.querySelector(
        '[data-search-input-mode-menu-footer-filter-text]'
      )?.textContent
    ).toBe('點擊面板，輸入拼音或英文快速篩選');
    macController.destroy();

    const windowsParts = createModeParts();
    const windowsController = window.LumnoSearchInputMode.createInputModeController(
      windowsParts,
      { navigatorLike: { platform: 'Win32' } }
    );
    expect(
      windowsController.menuElement.querySelector(
        '[data-search-input-mode-menu-footer-key]'
      )?.textContent
    ).toBe('Tab Tab');
    windowsController.destroy();
  });

  it('requires two distinct Backspace presses only while the scope menu is open', () => {
    vi.useFakeTimers();
    const parts = createModeParts();
    const onConfirmation = vi.fn();
    const onConfirmationReset = vi.fn();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:duckduckgo',
          kind: 'provider',
          label: 'DuckDuckGo'
        }],
        onModeTagRemovalConfirmation: onConfirmation,
        onModeTagRemovalConfirmationReset: onConfirmationReset
      }
    );
    controller.setPrefixText('DuckDuckGo', {}, {
      modeId: 'provider:duckduckgo'
    });

    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      true
    );
    expect(onConfirmation).not.toHaveBeenCalled();

    controller.openModeMenu('none');
    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      false
    );
    expect(onConfirmation).toHaveBeenCalledTimes(1);
    expect(onConfirmation).toHaveBeenLastCalledWith({ duration: 2200 });

    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: true })).toBe(
      false
    );
    expect(onConfirmation).toHaveBeenCalledTimes(1);
    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      true
    );
    expect(onConfirmationReset).toHaveBeenCalledTimes(1);

    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      false
    );
    parts.input.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'a' })
    );
    expect(onConfirmationReset).toHaveBeenCalledTimes(2);
    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      false
    );
    parts.input.value = 'query';
    parts.input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onConfirmationReset).toHaveBeenCalledTimes(3);

    parts.input.value = '';
    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      false
    );
    vi.advanceTimersByTime(2200);
    expect(onConfirmationReset).toHaveBeenCalledTimes(4);
    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      false
    );
    controller.closeModeMenu();
    expect(onConfirmationReset).toHaveBeenCalledTimes(5);
    expect(controller.shouldRemoveModeTagOnBackspace({ repeat: false })).toBe(
      true
    );
    controller.destroy();
  });

  it('renders and clears the matched search provider Tab hint', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      { surface: 'overlay' }
    );

    controller.setTabHintVisible(true, { name: 'YouTube' });

    expect(parts.modeTabHint.style.display).toBe('inline-flex');
    expect(parts.modeTabHintKey.textContent).toBe('Tab');
    expect(parts.modeTabHintText.textContent).toBe('使用 YouTube 搜索');
    expect(parts.modeTabHint.textContent).toBe('Tab使用 YouTube 搜索');
    expect(parts.modeTabHintKey.parentElement).toBe(parts.modeTabHint);
    expect(parts.modeTabHintText.parentElement).toBe(parts.modeTabHint);

    controller.setTabHintVisible(false);
    expect(parts.modeTabHint.style.display).toBe('none');
    controller.destroy();
  });

  it('keeps the menu mounted and updates its checked item after switching scope', async () => {
    const parts = createModeParts();
    const items: ModeMenuItem[] = [
      {
        active: true,
        group: 'Search scope',
        iconClass: 'ri-search-line',
        id: 'all',
        kind: 'all',
        label: 'Search everything'
      },
      {
        group: 'Browser content',
        iconClass: 'ri-bookmark-3-line',
        id: 'local:bookmark',
        kind: 'local',
        label: 'Bookmarks'
      }
    ];
    const onModeMenuSelect = vi.fn((selectedItem: ModeMenuItem) => {
      items.forEach((item) => {
        item.active = item === selectedItem;
      });
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        baseInputPaddingLeft: 44,
        getModeMenuItems: () => items,
        onModeMenuSelect
      }
    );

    controller.setPrefixText('Search everything', {}, {
      iconClass: 'ri-search-line',
      modeId: 'all'
    });
    expect(controller.openModeMenu()).toBe(true);
    expect(parts.modePrefix.getAttribute('aria-expanded')).toBe('true');
    const menuItems = Array.from(
      controller.menuElement.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]'
      )
    );
    expect(menuItems).toHaveLength(2);
    expect(menuItems[0].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(menuItems[0]);
    const selectedIcon = menuItems[1].querySelector(
      '.x-lumno-search-input-mode__menu-icon'
    );

    menuItems[0].dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' })
    );
    expect(document.activeElement).toBe(menuItems[1]);
    menuItems[1].click();
    await Promise.resolve();

    expect(onModeMenuSelect).toHaveBeenCalledWith(items[1]);
    expect(controller.menuElement.hidden).toBe(false);
    expect(parts.modePrefix.getAttribute('aria-expanded')).toBe('true');
    const refreshedMenuItems = Array.from(
      controller.menuElement.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]'
      )
    );
    expect(refreshedMenuItems[0].getAttribute('aria-checked')).toBe('false');
    expect(refreshedMenuItems[1].getAttribute('aria-checked')).toBe('true');
    expect(refreshedMenuItems[0]).toBe(menuItems[0]);
    expect(refreshedMenuItems[1]).toBe(menuItems[1]);
    expect(
      refreshedMenuItems[1].querySelector(
        '.x-lumno-search-input-mode__menu-icon'
      )
    ).toBe(selectedIcon);
    expect(document.activeElement).toBe(parts.input);
    expect(controller.menuElement.dataset.searchActive).toBe('false');
    controller.destroy();
  });

  it('keeps panel typing separate from the main input and filters English or pinyin matches', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [
          {
            group: 'Search engines',
            id: 'provider:google',
            kind: 'provider',
            label: 'Google'
          },
          {
            group: 'AI search',
            id: 'provider:doubao',
            kind: 'provider',
            label: '豆包',
            provider: {
              aliases: ['doubao'],
              key: 'dbai',
              name: '豆包'
            }
          },
          {
            group: 'Browser content',
            id: 'local:bookmark',
            kind: 'local',
            label: '书签',
            searchTerms: ['bookmark', 'bookmarks']
          }
        ]
      }
    );
    const pressMenuKey = (key: string) => {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key
      });
      controller.menuElement.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      return event;
    };
    const getVisibleLabels = () => Array.from(
      controller.menuElement.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]'
      )
    ).filter((button) => !button.hidden).map((button) => (
      button.querySelector('.x-lumno-search-input-mode__menu-label')?.textContent
    ));

    expect(controller.openModeMenu('none')).toBe(true);
    expect(document.activeElement).toBe(controller.menuElement);
    expect(controller.menuElement.dataset.searchActive).toBe('true');

    pressMenuKey('d');
    pressMenuKey('o');
    pressMenuKey('u');
    expect(controller.getModeMenuFilterQuery()).toBe('dou');
    expect(parts.input.value).toBe('');
    expect(getVisibleLabels()).toEqual(['豆包']);
    expect(
      controller.menuElement.querySelector(
        '.x-lumno-search-input-mode__menu-match'
      )?.textContent
    ).toBe('豆');

    const filteredItem = Array.from(
      controller.menuElement.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]'
      )
    ).find((button) => !button.hidden);
    filteredItem?.click();
    expect(document.activeElement).toBe(parts.input);
    expect(controller.menuElement.dataset.searchActive).toBe('false');
    expect(controller.menuElement.hidden).toBe(false);
    expect(controller.getModeMenuFilterQuery()).toBe('dou');
    const inputEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'x'
    });
    parts.input.dispatchEvent(inputEvent);
    expect(controller.shouldHandleModeMenuKeyEvent(inputEvent)).toBe(false);
    expect(controller.getModeMenuFilterQuery()).toBe('dou');

    controller.menuElement.dispatchEvent(new Event('pointerdown', {
      bubbles: true,
      cancelable: true
    }));
    expect(document.activeElement).toBe(controller.menuElement);
    expect(controller.menuElement.dataset.searchActive).toBe('true');

    pressMenuKey('Escape');
    expect(controller.menuElement.hidden).toBe(false);
    expect(controller.getModeMenuFilterQuery()).toBe('');
    'bookmark'.split('').forEach(pressMenuKey);
    expect(getVisibleLabels()).toEqual(['书签']);
    expect(
      controller.menuElement.querySelector(
        '.x-lumno-search-input-mode__menu-match'
      )?.textContent
    ).toBe('书签');

    pressMenuKey('Escape');
    'zzz'.split('').forEach(pressMenuKey);
    expect(getVisibleLabels()).toEqual([]);
    expect(
      controller.menuElement.querySelector<HTMLElement>(
        '.x-lumno-search-input-mode__menu-empty'
      )?.hidden
    ).toBe(false);
    controller.destroy();
  });

  it('switches localized scope placeholders with the panel state', () => {
    const parts = createModeParts();
    parts.input.placeholder = 'Search or type a URL...';
    let language = 'zh-CN';
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        formatMessage: (key: string, fallback: string) => {
          if (key === 'search_scope_panel_placeholder') {
            return language === 'zh-CN'
              ? '搜索特定站点内容...'
              : 'Search specific site content...';
          }
          if (key === 'search_scope_active_placeholder') {
            return language === 'zh-CN'
              ? '搜索特定内容，复按 Tab 打开范围面板...'
              : 'Search within this scope; press Tab again to open the scope panel...';
          }
          return fallback;
        },
        getModeMenuItems: () => [{
          active: true,
          group: 'Search engines',
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }]
      }
    );

    controller.setPrefixText('Google', {}, { modeId: 'provider:google' });
    expect(parts.input.placeholder).toBe(
      '搜索特定内容，复按 Tab 打开范围面板...'
    );

    expect(controller.openModeMenu('none')).toBe(true);
    expect(parts.input.placeholder).toBe('搜索特定站点内容...');

    controller.setPrefixText('Bing', {}, { modeId: 'provider:bing' });
    expect(parts.input.placeholder).toBe('搜索特定站点内容...');

    language = 'en';
    controller.refreshModeMenuLanguage();
    expect(parts.input.placeholder).toBe('Search specific site content...');

    controller.closeModeMenu(false);
    expect(parts.input.placeholder).toBe(
      'Search within this scope; press Tab again to open the scope panel...'
    );

    controller.clearProviderPrefix();
    expect(parts.input.placeholder).toBe('Search or type a URL...');
    controller.destroy();
  });

  it('keeps built-in Chinese scopes searchable while the full pinyin runtime is still loading', () => {
    const pinyinGlobal = globalThis as typeof globalThis & {
      pinyinPro?: unknown;
    };
    const existingPinyinApi = pinyinGlobal.pinyinPro;
    delete pinyinGlobal.pinyinPro;
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          group: 'Browser content',
          id: 'local:bookmark',
          kind: 'local',
          label: '书签'
        }]
      }
    );
    expect(controller.openModeMenu('none')).toBe(true);
    ['s', 'h', 'u'].forEach((key) => {
      controller.menuElement.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key
      }));
    });
    const item = controller.menuElement.querySelector<HTMLButtonElement>(
      '[role="menuitemradio"]'
    );
    expect(item?.hidden).toBe(false);
    expect(
      item?.querySelector('.x-lumno-search-input-mode__menu-match')?.textContent
    ).toBe('书');
    controller.destroy();
    pinyinGlobal.pinyinPro = existingPinyinApi;
  });

  it('reuses lighter vector glyphs in browser-content cards and the active tag', () => {
    const parts = createModeParts();
    const iconNames = ['browser', 'star', 'bookmark', 'history'];
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => iconNames.map((menuIconName) => ({
          group: 'Browser content',
          iconClass: 'ri-window-line',
          id: `local:${menuIconName}`,
          kind: 'local',
          label: menuIconName,
          menuIconName
        }))
      }
    );

    controller.setPrefixText('Open tabs', {}, {
      iconClass: 'ri-window-line',
      menuIconName: 'browser',
      modeId: 'openTabs'
    });
    controller.openModeMenu();

    const menuGlyphs = Array.from(
      controller.menuElement.querySelectorAll<SVGSVGElement>(
        '.x-lumno-search-input-mode__menu-line-icon'
      )
    );
    expect(menuGlyphs.map((glyph) => glyph.dataset.iconName)).toEqual(iconNames);
    expect(
      menuGlyphs.every((glyph) => (
        glyph.getAttribute('stroke-width') === '1.65' &&
        glyph.getAttribute('viewBox') === '0 0 24 24'
      ))
    ).toBe(true);
    expect(
      controller.menuElement.querySelectorAll(
        '.x-lumno-search-input-mode__menu-favicon-mask > i'
      )
    ).toHaveLength(0);
    const builtInCards = Array.from(
      controller.menuElement.querySelectorAll<HTMLElement>(
        '.x-lumno-search-input-mode__menu-icon[data-icon-kind="builtin"]'
      )
    );
    expect(builtInCards).toHaveLength(4);
    expect(
      builtInCards.every((card) => (
        card.style.getPropertyValue('--x-lumno-search-mode-icon-bg').includes(
          'var(--x-nt-text, #111827) 9%'
        ) &&
        card.style.getPropertyValue('--x-lumno-search-mode-icon-color') ===
          'var(--x-nt-text, #111827)'
      ))
    ).toBe(true);
    const prefixGlyph = parts.modePrefix.querySelector<SVGSVGElement>(
      '[data-search-input-mode-line-icon]'
    );
    expect(prefixGlyph?.dataset.iconName).toBe('browser');
    expect(prefixGlyph?.getAttribute('stroke-width')).toBe('2');
    expect(prefixGlyph?.style.display).toBe('inline-flex');
    expect(parts.modePrefixGlyph.style.display).toBe('none');
    expect(parts.modePrefix.style.background).toContain(
      'var(--x-nt-text, #111827) 9%'
    );
    controller.destroy();
  });

  it('uses the overlay theme color for built-in SVG cards in dark mode', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          group: 'Browser content',
          id: 'openTabs',
          kind: 'openTabs',
          label: 'Open tabs',
          menuIconName: 'browser'
        }],
        isDarkMode: () => true,
        surface: 'overlay'
      }
    );

    controller.setPrefixText('Open tabs', {}, { menuIconName: 'browser' });
    controller.openModeMenu();

    const card = controller.menuElement.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-icon[data-icon-kind="builtin"]'
    );
    const menuItem = controller.menuElement.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-item'
    );
    expect(card?.style.getPropertyValue('--x-lumno-search-mode-icon-bg')).toContain(
      'var(--x-ov-text, #111827) 14%'
    );
    expect(card?.style.getPropertyValue('--x-lumno-search-mode-icon-color')).toBe(
      'var(--x-ov-text, #111827)'
    );
    expect(
      menuItem?.style.getPropertyValue('--x-lumno-search-mode-item-theme-bg')
    ).toContain('var(--x-ov-text, #111827) 14%');
    expect(parts.modePrefix.style.background).toContain(
      'var(--x-ov-text, #111827) 14%'
    );
    expect(
      parts.modePrefix.querySelector('[data-search-input-mode-line-icon]')
        ?.getAttribute('data-icon-name')
    ).toBe('browser');
    controller.destroy();
  });

  it('keeps the built-in tag SVG when an earlier provider favicon fails late', () => {
    const parts = createModeParts();
    const unavailableCallbacks: Array<() => void> = [];
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        attachProviderIcon: (
          _image: HTMLImageElement,
          context: { onIconUnavailable: () => void }
        ) => {
          unavailableCallbacks.push(context.onIconUnavailable);
          return true;
        }
      }
    );

    controller.setPrefixText('YouTube', {}, {
      iconClass: 'ri-global-line',
      iconUrl: 'https://www.youtube.com/favicon.ico',
      modeId: 'provider:youtube'
    });
    controller.setPrefixText('Bookmarks', {}, {
      menuIconName: 'bookmark',
      modeId: 'local:bookmark'
    });
    expect(unavailableCallbacks).toHaveLength(1);
    unavailableCallbacks[0]?.();

    const prefixGlyph = parts.modePrefix.querySelector<SVGSVGElement>(
      '[data-search-input-mode-line-icon]'
    );
    expect(prefixGlyph?.dataset.iconName).toBe('bookmark');
    expect(prefixGlyph?.style.display).toBe('inline-flex');
    expect(parts.modePrefixGlyph.style.display).toBe('none');
    expect(parts.modePrefixIcon.style.display).toBe('none');
    controller.destroy();
  });

  it('keeps a shadow-root menu open while returning selection focus to its input', async () => {
    const parts = createModeParts();
    const shadowHost = document.createElement('div');
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    document.body.appendChild(shadowHost);
    shadowRoot.appendChild(parts.container);
    const duckduckgoItem: ModeMenuItem = {
      group: 'Search engines',
      iconClass: 'ri-global-line',
      id: 'provider:ddg',
      kind: 'provider',
      label: 'DuckDuckGo',
      provider: { key: 'ddg', name: 'DuckDuckGo' }
    };
    const onModeMenuSelect = vi.fn();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [duckduckgoItem],
        onModeMenuSelect,
        surface: 'overlay'
      }
    );
    controller.setPrefixText('Search open tabs', {}, {
      iconClass: 'ri-window-line',
      modeId: 'openTabs'
    });
    controller.openModeMenu();
    const menuItem = controller.menuElement.querySelector<HTMLButtonElement>(
      '[role="menuitemradio"]'
    );
    expect(menuItem).not.toBeNull();

    menuItem?.dispatchEvent(
      new Event('pointerdown', { bubbles: true, composed: true })
    );

    expect(controller.menuElement.hidden).toBe(false);
    menuItem?.click();
    await Promise.resolve();
    expect(onModeMenuSelect).toHaveBeenCalledWith(duckduckgoItem);
    expect(controller.menuElement.hidden).toBe(false);
    expect(parts.modePrefix.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(shadowHost);
    expect(shadowRoot.activeElement).toBe(parts.input);
    expect(controller.menuElement.dataset.searchActive).toBe('false');
    controller.destroy();
  });

  it('uses a themed Remix chevron and a neutralized chip surface', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        defaultAccentColor: [0, 174, 236]
      }
    );

    controller.setPrefixText('Bilibili', { accentRgb: [0, 174, 236] }, {
      iconClass: 'ri-global-line',
      modeId: 'provider:bilibili'
    });

    expect(parts.modePrefixChevron.classList.contains('ri-arrow-down-s-line')).toBe(
      true
    );
    expect(parts.modePrefixChevron.style.color).toBe('rgb(41, 122, 160)');
    expect(parts.modePrefixChevron.style.opacity).toBe('');
    expect(
      parts.container.style.getPropertyValue('--x-lumno-search-mode-accent')
    ).toBe('rgb(41, 122, 160)');
    expect(
      parts.container.style.getPropertyValue('--x-lumno-search-mode-selected-bg')
    ).toBe('rgba(0, 174, 236, 0.075)');
    expect(parts.modePrefix.style.border).toContain('rgba(41, 122, 160, 0.18)');
    expect(parts.modePrefix.style.boxShadow).toBe(
      '0 5px 14px rgba(15, 23, 42, 0.075)'
    );
    expect(parts.modePrefixCurrent.textContent).toBe('当前');
    expect(parts.modePrefix.style.justifyContent).toBe('flex-start');
    expect(parts.modePrefixText.style.display).toBe('block');
    expect(parts.modePrefixText.style.flex).toBe('1 1 auto');
    expect(parts.modePrefixText.style.lineHeight).toBe('18px');
    expect(parts.modePrefixCurrent.style.fontSize).toBe('10px');
    expect(parts.modePrefixCurrent.style.lineHeight).toBe('18px');
    expect(parts.modePrefixCurrent.style.display).toBe('none');
    expect(parts.modePrefixCurrent.style.overflow).toBe('visible');
    expect(parts.modePrefixCurrent.style.flex).toBe('0 0 auto');
    expect(parts.modePrefixChevron.style.flex).toBe('0 0 auto');
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('false');
    expect(parts.modePrefixCurrent.style.background).toBe('');
    controller.destroy();
  });

  it('drives current text and the chevron from one state while repeated clicks toggle the menu', () => {
    const parts = createModeParts();
    const prefixAnimation = {
      cancel: vi.fn(),
      oncancel: null as null | (() => void),
      onfinish: null as null | (() => void)
    };
    const animatePrefix = vi.fn(
      (_keyframes: Keyframe[], _options?: KeyframeAnimationOptions) =>
        prefixAnimation as unknown as Animation
    );
    Object.defineProperty(parts.modePrefix, 'animate', {
      configurable: true,
      value: animatePrefix
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(parts, {
      getModeMenuItems: () => [{
        active: true,
        id: 'provider:youtube',
        kind: 'provider',
        label: 'YouTube'
      }]
    });

    controller.setPrefixText('YouTube', {}, {
      animate: true,
      modeId: 'provider:youtube'
    });

    expect(animatePrefix).not.toHaveBeenCalled();
    expect(parts.modePrefixCurrent.textContent).toBe('当前');
    expect(parts.modePrefixCurrent.style.opacity).toBe('');
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('false');

    parts.modePrefix.focus();
    parts.modePrefix.click();

    expect(controller.menuElement.hidden).toBe(false);
    expect(document.activeElement).toBe(controller.menuElement);
    expect(parts.modePrefix.style.zIndex).toBe('41');
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('true');

    controller.setPrefixText('YouTube', { accentRgb: [255, 0, 0] }, {
      modeId: 'provider:youtube'
    });

    expect(prefixAnimation.cancel).not.toHaveBeenCalled();
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('true');
    expect(parts.modePrefixCurrent.style.opacity).toBe('');

    parts.modePrefix.click();

    expect(controller.menuElement.hidden).toBe(true);
    expect(document.activeElement).toBe(parts.modePrefix);
    expect(parts.modePrefix.style.zIndex).toBe('1');
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('false');
    expect(parts.modePrefixCurrent.style.opacity).toBe('');
    controller.destroy();
  });

  it('cancels a pending asynchronous open when the chip is clicked again', async () => {
    const parts = createModeParts();
    let resolveItems: ((items: ModeMenuItem[]) => void) | undefined;
    const itemsPromise = new Promise<ModeMenuItem[]>((resolve) => {
      resolveItems = resolve;
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(parts, {
      getModeMenuItems: () => itemsPromise
    });
    controller.setPrefixText('YouTube');

    parts.modePrefix.click();
    expect(controller.menuElement.getAttribute('aria-busy')).toBe('true');

    parts.modePrefix.click();
    expect(controller.menuElement.hidden).toBe(true);
    expect(controller.menuElement.hasAttribute('aria-busy')).toBe(false);
    expect(parts.modePrefix.getAttribute('aria-expanded')).toBe('false');
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('false');

    resolveItems?.([{
      active: true,
      id: 'provider:youtube',
      kind: 'provider',
      label: 'YouTube'
    }]);
    await itemsPromise;
    await Promise.resolve();

    expect(controller.menuElement.hidden).toBe(true);
    expect(parts.modePrefix.getAttribute('aria-expanded')).toBe('false');
    controller.destroy();
  });

  it('keeps the chip shadow unchanged when it receives focus', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(parts);
    controller.setPrefixText('YouTube', { accentRgb: [255, 0, 0] });
    const restingShadow = parts.modePrefix.style.boxShadow;

    parts.modePrefix.focus();

    expect(parts.modePrefix.style.boxShadow).toBe(restingShadow);
    expect(parts.modePrefix.style.boxShadow).not.toContain('0 0 0 3px');
    controller.destroy();
  });

  it('shows a new chip directly without scale or opacity animation', () => {
    const parts = createModeParts();
    const animation = {
      cancel: vi.fn(),
      oncancel: null as null | (() => void),
      onfinish: null as null | (() => void)
    };
    const animate = vi.fn(
      (_keyframes: Keyframe[], _options?: KeyframeAnimationOptions) =>
        animation as unknown as Animation
    );
    Object.defineProperty(parts.modePrefix, 'animate', {
      configurable: true,
      value: animate
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(parts);

    controller.setPrefixText('Bookmarks', {}, {
      animate: true,
      iconClass: 'ri-bookmark-3-line',
      menuIconName: 'bookmark',
      modeId: 'local:bookmark'
    });

    expect(animate).not.toHaveBeenCalled();
    expect(parts.modePrefix.style.opacity).toBe('1');
    expect(parts.modePrefix.style.transform).toBe(
      'translateY(-50%) translateX(0) scale(1)'
    );
    expect(parts.modePrefix.style.willChange).toBe('auto');
    controller.destroy();
  });

  it('shows the current label only while the menu is open and resizes the chip', () => {
    const parts = createModeParts();
    const resizeAnimation = {
      cancel: vi.fn(),
      oncancel: null as null | (() => void),
      onfinish: null as null | (() => void)
    };
    const animate = vi.fn(
      (_keyframes: Keyframe[], _options?: KeyframeAnimationOptions) =>
        resizeAnimation as unknown as Animation
    );
    Object.defineProperty(parts.modePrefix, 'animate', {
      configurable: true,
      value: animate
    });
    Object.defineProperty(parts.modePrefix, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 0,
        height: 26,
        left: 0,
        right: parts.modePrefix.dataset.menuOpen === 'true' ? 162 : 132,
        toJSON: () => ({}),
        top: 0,
        width: parts.modePrefix.dataset.menuOpen === 'true' ? 162 : 132,
        x: 0,
        y: 0
      })
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }]
      }
    );
    controller.setPrefixText('Google', {}, {
      iconClass: 'ri-google-fill',
      modeId: 'provider:google'
    });

    expect(parts.modePrefixCurrent.textContent).toBe('当前');
    expect(parts.modePrefixCurrent.style.display).toBe('none');
    expect(controller.openModeMenu('none')).toBe(true);
    expect(parts.modePrefixCurrent.style.display).toBe('inline-flex');
    expect(animate.mock.calls[0][0]).toEqual([
      { width: '132px' },
      { width: '162px' }
    ]);
    expect(animate.mock.calls[0][1]).toEqual({
      duration: 160,
      easing: 'linear'
    });

    expect(controller.closeModeMenu(false)).toBe(true);
    expect(parts.modePrefixCurrent.style.display).toBe('none');
    expect(animate.mock.calls[1][0]).toEqual([
      { width: '162px' },
      { width: '132px' }
    ]);
    controller.destroy();
  });

  it('does not animate when the already-selected mode is selected again', () => {
    const parts = createModeParts();
    const animate = vi.fn();
    Object.defineProperty(parts.modePrefix, 'animate', {
      configurable: true,
      value: animate
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(parts);
    controller.setPrefixText('Brave Search', {}, {
      iconClass: 'ri-global-line',
      modeId: 'provider:brave'
    });

    controller.setPrefixText('Brave Search', {}, {
      animate: true,
      iconClass: 'ri-global-line',
      modeId: 'provider:brave'
    });

    expect(animate).not.toHaveBeenCalled();
    expect(parts.modePrefixText.textContent).toBe('Brave Search');
    expect(parts.modePrefix.getAttribute('data-mode-id')).toBe('provider:brave');
    expect(parts.modePrefix.style.willChange).toBe('auto');
    controller.destroy();
  });

  it('stretches before revealing a longer label and fades the fixed icon in place', () => {
    const parts = createModeParts();
    const resizeAnimation = {
      cancel: vi.fn(),
      oncancel: null as null | (() => void),
      onfinish: null as null | (() => void)
    };
    const animate = vi.fn(
      (_keyframes: Keyframe[], _options?: KeyframeAnimationOptions) =>
        resizeAnimation as unknown as Animation
    );
    Object.defineProperty(parts.modePrefix, 'animate', {
      configurable: true,
      value: animate
    });
    const iconAnimation = {
      cancel: vi.fn(),
      oncancel: null as null | (() => void),
      onfinish: null as null | (() => void)
    };
    const animateIcon = vi.fn(
      (_keyframes: Keyframe[], _options?: KeyframeAnimationOptions) =>
        iconAnimation as unknown as Animation
    );
    Object.defineProperty(parts.modePrefixGlyph, 'animate', {
      configurable: true,
      value: animateIcon
    });
    Object.defineProperty(parts.modePrefix, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 0,
        height: 26,
        left: 0,
        right: parts.modePrefixText.textContent === 'Brave Search' ? 176 : 132,
        toJSON: () => ({}),
        top: 0,
        width: parts.modePrefixText.textContent === 'Brave Search' ? 176 : 132,
        x: 0,
        y: 0
      })
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(parts);
    controller.setPrefixText('Open tabs', {}, {
      iconClass: 'ri-window-line',
      modeId: 'openTabs'
    });

    controller.setPrefixText('Brave Search', {}, {
      animate: true,
      iconClass: 'ri-global-line',
      modeId: 'provider:brave'
    });

    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][0]).toEqual([
      { width: '132px' },
      { width: '176px' }
    ]);
    expect(animate.mock.calls[0][1]).toEqual({
      duration: 160,
      easing: 'linear'
    });
    expect(
      (animate.mock.calls[0][0] as Keyframe[]).every((frame) =>
        !('opacity' in frame) && !('transform' in frame)
      )
    ).toBe(true);
    expect(parts.modePrefixText.textContent).toBe('Open tabs');
    expect(parts.modePrefixGlyph.className).toContain('ri-window-line');
    expect(animateIcon).not.toHaveBeenCalled();
    expect(parts.modePrefixGlyph.style.transition).toBe('none');
    expect(parts.modePrefix.style.transition).toContain('background-color 180ms ease');
    expect(parts.modePrefixCurrent.textContent).toBe('当前');
    expect(parts.modePrefix.style.willChange).toBe('width');
    resizeAnimation.onfinish?.();
    expect(parts.modePrefixText.textContent).toBe('Brave Search');
    expect(parts.modePrefixGlyph.className).toContain('ri-global-line');
    expect(animateIcon).toHaveBeenCalledWith([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration: 100,
      easing: 'ease-out'
    });
    expect(
      (animateIcon.mock.calls[0][0] as Keyframe[]).every((frame) =>
        !('transform' in frame)
      )
    ).toBe(true);
    expect(parts.modePrefixGlyph.style.transform).toBe('none');
    expect(parts.modePrefix.style.willChange).toBe('auto');
    controller.destroy();
  });

  it('keeps the direct width animation when an existing mode becomes shorter', () => {
    const parts = createModeParts();
    const resizeAnimation = {
      cancel: vi.fn(),
      oncancel: null as null | (() => void),
      onfinish: null as null | (() => void)
    };
    const animate = vi.fn(
      (_keyframes: Keyframe[], _options?: KeyframeAnimationOptions) =>
        resizeAnimation as unknown as Animation
    );
    Object.defineProperty(parts.modePrefix, 'animate', {
      configurable: true,
      value: animate
    });
    const animateIcon = vi.fn(() => ({
      cancel: vi.fn(),
      oncancel: null,
      onfinish: null
    }) as unknown as Animation);
    Object.defineProperty(parts.modePrefixGlyph, 'animate', {
      configurable: true,
      value: animateIcon
    });
    Object.defineProperty(parts.modePrefix, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        bottom: 0,
        height: 26,
        left: 0,
        right: parts.modePrefixText.textContent === 'Brave Search' ? 176 : 132,
        toJSON: () => ({}),
        top: 0,
        width: parts.modePrefixText.textContent === 'Brave Search' ? 176 : 132,
        x: 0,
        y: 0
      })
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(parts);
    controller.setPrefixText('Brave Search', {}, {
      iconClass: 'ri-global-line',
      modeId: 'provider:brave'
    });

    controller.setPrefixText('Open tabs', {}, {
      animate: true,
      iconClass: 'ri-window-line',
      modeId: 'openTabs'
    });

    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][0]).toEqual([
      { width: '176px' },
      { width: '132px' }
    ]);
    expect(parts.modePrefixText.textContent).toBe('Open tabs');
    expect(parts.modePrefixGlyph.className).toContain('ri-window-line');
    expect(animateIcon).toHaveBeenCalledTimes(1);
    expect(
      (animate.mock.calls[0][0] as Keyframe[]).every((frame) =>
        !('opacity' in frame) && !('transform' in frame)
      )
    ).toBe(true);
    expect(parts.modePrefix.style.willChange).toBe('width');
    resizeAnimation.onfinish?.();
    expect(parts.modePrefix.style.willChange).toBe('auto');
    controller.destroy();
  });

  it('opens a wide horizontal menu and supports horizontal arrow navigation', () => {
    const parts = createModeParts();
    const items: ModeMenuItem[] = [
      {
        active: true,
        group: 'Search scope',
        iconClass: 'ri-search-line',
        id: 'all',
        kind: 'all',
        label: 'Search everything'
      },
      {
        group: 'Browser content',
        iconClass: 'ri-bookmark-3-line',
        id: 'local:bookmark',
        kind: 'local',
        label: 'Bookmarks'
      },
      {
        group: 'Site search',
        iconClass: 'ri-global-line',
        id: 'provider:bilibili',
        kind: 'provider',
        label: 'Bilibili'
      }
    ];
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      { getModeMenuItems: () => items }
    );
    controller.setPrefixText('Search everything');
    controller.openModeMenu();
    const menuItems = Array.from(
      controller.menuElement.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemradio"]'
      )
    );

    expect(controller.menuElement.style.left).toBe('-6px');
    expect(controller.menuElement.style.right).toBe('-6px');
    expect(controller.menuElement.style.width).toBe('auto');
    expect(controller.menuElement.style.padding).toBe('0px');
    expect(
      controller.menuElement.classList.contains(
        '_x_extension_menu_surface_2024_unique_'
      )
    ).toBe(true);
    expect(parts.container.getAttribute('data-mode-menu-open')).toBe('true');
    menuItems[0].dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })
    );
    expect(document.activeElement).toBe(menuItems[1]);
    controller.closeModeMenu();
    expect(parts.container.hasAttribute('data-mode-menu-open')).toBe(false);
    controller.destroy();
  });

  it('reserves viewport room for the full scope menu before sizing results', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:google',
          kind: 'provider',
          label: 'Google'
        }]
      }
    );
    Object.defineProperty(parts.container, 'offsetHeight', {
      configurable: true,
      value: 56
    });
    vi.spyOn(parts.container, 'getBoundingClientRect').mockReturnValue({
      bottom: 300,
      height: 56,
      left: 0,
      right: 760,
      top: 244,
      width: 760
    } as DOMRect);
    Object.defineProperty(controller.menuElement, 'offsetTop', {
      configurable: true,
      value: 70
    });
    let renderedMenuContentHeight = 360;
    Object.defineProperty(controller.menuElement, 'offsetHeight', {
      configurable: true,
      get: () => Math.min(
        renderedMenuContentHeight,
        Number.parseFloat(
          controller.menuElement.style.getPropertyValue(
            '--x-lumno-search-mode-menu-viewport-max-height'
          )
        ) || 360
      )
    });
    controller.openModeMenu('none');

    expect(controller.fitModeMenuWithinViewport({
      bottomInset: 24,
      viewportBottom: 1209
    })).toBe(511);
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-viewport-max-height'
      )
    ).toBe('871px');
    controller.setModeMenuResultOffset(511);
    expect(controller.fitModeMenuWithinViewport({
      bottomInset: 24,
      viewportBottom: 1209
    })).toBe(511);

    renderedMenuContentHeight = 200;
    expect(controller.fitModeMenuWithinViewport({
      bottomInset: 24,
      viewportBottom: 1209
    })).toBe(671);
    renderedMenuContentHeight = 360;
    expect(controller.fitModeMenuWithinViewport({
      bottomInset: 24,
      viewportBottom: 1209
    })).toBe(511);

    expect(controller.fitModeMenuWithinViewport({
      bottomInset: 24,
      viewportBottom: 600
    })).toBe(0);
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-viewport-max-height'
      )
    ).toBe('262px');

    expect(controller.fitModeMenuWithinViewport({
      bottomInset: 24,
      viewportBottom: 1209
    })).toBe(511);
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-viewport-max-height'
      )
    ).toBe('871px');

    controller.closeModeMenu();
    expect(controller.fitModeMenuWithinViewport()).toBeNull();
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-viewport-max-height'
      )
    ).toBe('');
    controller.destroy();
  });

  it('lifts an open scope menu when the input contains a query', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:youtube',
          kind: 'provider',
          label: 'YouTube'
        }]
      }
    );
    controller.setPrefixText('YouTube');
    controller.openModeMenu();

    expect(controller.menuElement.dataset.hasQuery).toBe('false');
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-lift'
      )
    ).toBe('0px');

    parts.input.value = '12';
    parts.input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(controller.menuElement.dataset.hasQuery).toBe('true');
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-lift'
      )
    ).toBe('-8px');
    controller.setModeMenuResultOffset(72);
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-lumno-search-mode-menu-result-offset'
      )
    ).toBe('72px');
    expect(
      controller.menuElement.style.getPropertyValue(
        '--x-extension-menu-surface-open-transform'
      )
    ).toContain(
      'var(--x-lumno-search-mode-menu-result-offset, 0px)'
    );
    controller.destroy();
  });

  it('shows the full label bubble only when the trailing-ellipsis label overflows', () => {
    const parts = createModeParts();
    const tooltipController = {
      bind: vi.fn(),
      hide: vi.fn()
    };
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        modeMenuCursorTooltipController: tooltipController,
        getModeMenuItems: () => [{
          active: true,
          id: 'provider:wechat',
          kind: 'provider',
          label: '微信公众号'
        }]
      }
    );
    controller.setPrefixText('微信公众号');
    controller.openModeMenu();

    const item = controller.menuElement.querySelector<HTMLButtonElement>(
      '[role="menuitemradio"]'
    );
    const label = item?.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-label'
    );
    expect(item?.getAttribute('aria-label')).toBe('微信公众号');
    expect(label?.textContent).toBe('微信公众号');
    expect(label?.hasAttribute('title')).toBe(false);
    expect(tooltipController.bind).toHaveBeenCalledOnce();

    const resolveTooltipText = tooltipController.bind.mock.calls[0]?.[1] as
      | (() => string)
      | undefined;
    const tooltipOptions = tooltipController.bind.mock.calls[0]?.[2] as
      | { shouldShow?: () => boolean; placement?: string }
      | undefined;
    expect(resolveTooltipText).toBeTypeOf('function');
    expect(tooltipOptions?.shouldShow).toBeTypeOf('function');
    expect(tooltipOptions?.placement).toBeUndefined();
    Object.defineProperty(label, 'clientWidth', {
      configurable: true,
      value: 48
    });
    Object.defineProperty(label, 'scrollWidth', {
      configurable: true,
      value: 76
    });
    expect(resolveTooltipText?.()).toBe('微信公众号');
    expect(tooltipOptions?.shouldShow?.()).toBe(true);
    expect(item?.getAttribute('data-label-truncated')).toBe('true');

    Object.defineProperty(label, 'scrollWidth', {
      configurable: true,
      value: 49
    });
    expect(resolveTooltipText?.()).toBe('微信公众号');
    expect(tooltipOptions?.shouldShow?.()).toBe(true);
    expect(item?.getAttribute('data-label-truncated')).toBe('true');

    Object.defineProperty(label, 'clientWidth', {
      configurable: true,
      value: 80
    });
    expect(resolveTooltipText?.()).toBe('微信公众号');
    expect(tooltipOptions?.shouldShow?.()).toBe(false);
    expect(item?.getAttribute('data-label-truncated')).toBe('false');
    controller.destroy();
  });

  it('uses opaque menu materials with the same radius as each search input', () => {
    const newtabParts = createModeParts();
    const newtabController = window.LumnoSearchInputMode.createInputModeController(
      newtabParts,
      { surface: 'newtab' }
    );
    expect(newtabController.menuElement.dataset.surface).toBe('newtab');
    expect(newtabController.menuElement.style.background).toBe(
      'var(--x-nt-mode-menu-bg, #FFFFFF)'
    );
    expect(newtabController.menuElement.style.borderRadius).toBe(
      'var(--x-nt-search-shell-radius, 32px)'
    );
    expect(newtabController.menuElement.style.top).toBe('calc(100% + 18px)');
    expect(newtabController.menuElement.style.boxShadow).toBe(
      'var(--x-nt-panel-shadow-focus, 0 16px 40px rgba(15, 23, 42, 0.13))'
    );
    newtabController.destroy();

    const overlayParts = createModeParts();
    const overlayController = window.LumnoSearchInputMode.createInputModeController(
      overlayParts,
      { surface: 'overlay' }
    );
    expect(overlayController.menuElement.dataset.surface).toBe('overlay');
    expect(overlayController.menuElement.style.background).toBe(
      'var(--x-ov-mode-menu-bg, #FFFFFF)'
    );
    expect(overlayController.menuElement.style.borderRadius).toBe(
      'var(--x-ov-panel-radius, 28px)'
    );
    expect(overlayController.menuElement.style.top).toBe('calc(100% + 14px)');
    expect(overlayController.menuElement.style.boxShadow).toBe(
      'var(--x-ov-shadow, 0 16px 40px rgba(15, 23, 42, 0.13))'
    );
    expect(overlayController.menuElement.style.left).toBe('-1px');
    expect(overlayController.menuElement.style.right).toBe('-1px');
    overlayController.destroy();
  });

  it('routes provider menu icons through the favicon fallback runtime', () => {
    const parts = createModeParts();
    const provider = {
      key: 'tb',
      template: 'https://s.taobao.com/search?q={query}'
    };
    const attachProviderIcon = vi.fn(
      (
        image: HTMLImageElement,
        context: { iconUrl: string; onIconUnavailable: () => void }
      ) => {
        const runtimeFallback = document.createElement('span');
        runtimeFallback.className = 'x-nt-favicon-fallback';
        image.parentElement?.appendChild(runtimeFallback);
        image.src = context.iconUrl;
        image.dispatchEvent(new Event('load'));
        return true;
      }
    );
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        attachProviderIcon,
        getModeMenuItems: () => [{
          active: true,
          iconClass: 'ri-global-line',
          iconUrl: 'https://www.taobao.com/favicon.ico',
          id: 'provider:tb',
          kind: 'provider',
          label: 'Taobao',
          provider
        }],
        getProviderThemeHost: () => 'taobao.com'
      }
    );
    controller.setPrefixText('Taobao');
    controller.openModeMenu();

    expect(attachProviderIcon).toHaveBeenCalledTimes(1);
    expect(attachProviderIcon.mock.calls[0][1]).toMatchObject({
      iconHost: 'taobao.com',
      iconUrl: 'https://www.taobao.com/favicon.ico',
      provider
    });
    expect(
      controller.menuElement.querySelector(
        '.x-lumno-search-input-mode__menu-icon'
      )?.getAttribute('data-icon-state')
    ).toBe('resolved');
    expect(
      controller.menuElement.querySelector('.x-nt-favicon-fallback')
    ).toBeNull();
    expect(
      controller.menuElement.querySelector<HTMLElement>(
        '.x-lumno-search-input-mode__menu-favicon-mask > i'
      )?.hidden
    ).toBe(true);
    const faviconMask = controller.menuElement.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-favicon-mask'
    );
    expect(faviconMask).not.toBeNull();
    expect(faviconMask?.querySelector('img')?.parentElement).toBe(faviconMask);
    controller.destroy();
  });

  it('renders canonical provider data directly without host-level favicon replacement', () => {
    const parts = createModeParts();
    const provider = {
      key: 'yt',
      name: 'YouTube',
      template: 'https://www.youtube.com/results?search_query={query}'
    };
    const canonicalIcon = 'data:image/png;base64,eW91dHViZQ==';
    const attachProviderIcon = vi.fn(() => true);
    const attachFaviconData = vi.fn();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        attachFaviconData,
        attachProviderIcon,
        preferDirectProviderIcons: true,
        getProviderIcon: () => canonicalIcon,
        getModeMenuItems: () => [{
          active: true,
          iconUrl: canonicalIcon,
          id: 'provider:yt',
          kind: 'provider',
          label: 'YouTube',
          provider
        }]
      }
    );

    controller.setProviderPrefix(provider, {});
    controller.openModeMenu();

    expect(parts.modePrefixIcon.getAttribute('src')).toBe(canonicalIcon);
    expect(
      controller.menuElement.querySelector('img')?.getAttribute('src')
    ).toBe(canonicalIcon);
    expect(attachProviderIcon).not.toHaveBeenCalled();
    expect(attachFaviconData).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('clips the prefix favicon with a subtle two-pixel corner mask', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {}
    );

    controller.setPrefixText('Google', {}, {
      iconHost: 'google.com',
      iconUrl: 'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
      modeId: 'siteSearch'
    });

    expect(parts.modePrefixIcon.style.width).toBe('16px');
    expect(parts.modePrefixIcon.style.height).toBe('16px');
    expect(parts.modePrefixIcon.style.borderRadius).toBe('2px');
    expect(parts.modePrefixIcon.style.clipPath).toBe('inset(0 round 2px)');
    expect(parts.modePrefixIcon.style.overflow).toBe('hidden');
    controller.destroy();
  });

  it('reuses one provider theme result for the icon and hover card', async () => {
    const parts = createModeParts();
    const getThemeForProvider = vi.fn().mockResolvedValue({
      accent: 'rgb(0, 174, 236)',
      accentRgb: [0, 174, 236]
    });
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getThemeForProvider,
        getModeMenuItems: () => [{
          iconClass: 'ri-bilibili-fill',
          id: 'provider:bilibili',
          kind: 'provider',
          label: 'Bilibili',
          provider: { key: 'bilibili' }
        }]
      }
    );
    controller.setPrefixText('Bilibili');
    controller.openModeMenu();
    await Promise.resolve();

    const icon = controller.menuElement.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-icon'
    );
    const menuItem = controller.menuElement.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-item'
    );
    const label = menuItem?.querySelector<HTMLElement>(
      '.x-lumno-search-input-mode__menu-label'
    );
    menuItem?.dispatchEvent(new MouseEvent('mouseenter'));
    menuItem?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    expect(getThemeForProvider).toHaveBeenCalledTimes(1);
    expect(getThemeForProvider).toHaveBeenCalledWith({ key: 'bilibili' });
    expect(
      icon?.style.getPropertyValue('--x-lumno-search-mode-icon-bg')
    ).toBe('rgb(209, 240, 252)');
    expect(
      icon?.style.getPropertyValue('--x-lumno-search-mode-icon-color')
    ).toBe('#111827');
    expect(
      menuItem?.style.getPropertyValue('--x-lumno-search-mode-item-theme-bg')
    ).toBe('rgba(0, 174, 236, 0.075)');
    expect(menuItem?.getAttribute('aria-label')).toBe('Bilibili');
    expect(label?.textContent).toBe('Bilibili');
    expect(label?.isConnected).toBe(true);
    expect(getThemeForProvider).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it('keeps one glyph and no nested fallback card when a provider favicon fails', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        attachProviderIcon: (
          image: HTMLImageElement,
          context: { onIconUnavailable: () => void }
        ) => {
          const runtimeFallback = document.createElement('span');
          runtimeFallback.className =
            'x-nt-favicon-fallback _x_extension_favicon_fallback_2024_unique_';
          image.parentElement?.appendChild(runtimeFallback);
          context.onIconUnavailable();
          return true;
        },
        getModeMenuItems: () => [{
          active: true,
          iconClass: 'ri-global-line',
          iconUrl: 'https://missing.example/favicon.ico',
          id: 'provider:missing',
          kind: 'provider',
          label: 'Missing',
          provider: { key: 'missing' }
        }]
      }
    );
    controller.setPrefixText('Missing');
    controller.openModeMenu();

    const icon = controller.menuElement.querySelector(
      '.x-lumno-search-input-mode__menu-icon'
    );
    expect(icon?.getAttribute('data-icon-state')).toBe('fallback');
    expect(icon?.querySelectorAll('i')).toHaveLength(1);
    expect(icon?.querySelector('i')?.classList.contains('ri-size-24')).toBe(true);
    expect(icon?.querySelector('img')).toBeNull();
    expect(icon?.querySelector('.x-nt-favicon-fallback')).toBeNull();
    controller.destroy();
  });

  it('returns focus to the chip when Escape closes the menu', () => {
    const parts = createModeParts();
    const controller = window.LumnoSearchInputMode.createInputModeController(
      parts,
      {
        getModeMenuItems: () => [
          {
            active: true,
            id: 'all',
            kind: 'all',
            label: 'Search everything'
          }
        ]
      }
    );
    controller.setPrefixText('Search everything');
    controller.openModeMenu();
    controller.menuElement.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
    );

    expect(controller.menuElement.hidden).toBe(true);
    expect(document.activeElement).toBe(parts.modePrefix);
    controller.destroy();
  });
});
