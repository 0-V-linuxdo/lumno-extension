import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../src/shared/menu-surface.js';
import '../../src/shared/search-input-mode.js';

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
}

interface ModeController {
  closeModeMenu(restoreFocus?: boolean): boolean;
  destroy(): void;
  menuElement: HTMLDivElement;
  openModeMenu(focusTarget?: string): boolean;
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
    expect(document.activeElement).toBe(refreshedMenuItems[1]);
    controller.destroy();
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
    expect(card?.style.getPropertyValue('--x-lumno-search-mode-icon-bg')).toContain(
      'var(--x-ov-text, #111827) 14%'
    );
    expect(card?.style.getPropertyValue('--x-lumno-search-mode-icon-color')).toBe(
      'var(--x-ov-text, #111827)'
    );
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

  it('does not treat a menu selection inside a shadow root as an outside click', async () => {
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
    expect(
      shadowRoot.activeElement?.getAttribute('data-mode-id')
    ).toBe('provider:ddg');
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
    expect(parts.modePrefixText.style.display).toBe('block');
    expect(parts.modePrefixText.style.lineHeight).toBe('18px');
    expect(parts.modePrefixCurrent.style.fontSize).toBe('10px');
    expect(parts.modePrefixCurrent.style.lineHeight).toBe('18px');
    expect(parts.modePrefixCurrent.style.display).toBe('inline-flex');
    expect(parts.modePrefixCurrent.style.overflow).toBe('visible');
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

    const prefixKeyframes = animatePrefix.mock.calls[0][0] as Keyframe[];
    expect(prefixKeyframes[0].transform).toContain('scale(0.86)');
    expect(prefixKeyframes[1].transform).toContain('scale(1.045)');
    expect(parts.modePrefixCurrent.textContent).toBe('当前');
    expect(parts.modePrefixCurrent.style.opacity).toBe('');
    expect(parts.modePrefix.getAttribute('data-menu-open')).toBe('false');

    parts.modePrefix.focus();
    parts.modePrefix.click();

    expect(controller.menuElement.hidden).toBe(false);
    expect(document.activeElement).toBe(parts.modePrefix);
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

  it('animates chip entry on the compositor without blur or layout reads', () => {
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

    expect(animate).toHaveBeenCalledTimes(1);
    const keyframes = animate.mock.calls[0][0] as Keyframe[];
    expect(keyframes).toHaveLength(3);
    expect(keyframes.every((frame) => !('filter' in frame))).toBe(true);
    expect(
      keyframes.every((frame) =>
        Object.keys(frame).every((key) =>
          ['offset', 'opacity', 'transform'].includes(key)
        )
      )
    ).toBe(true);
    expect(parts.modePrefix.style.willChange).toBe('transform, opacity');
    animation.onfinish?.();
    expect(parts.modePrefix.style.willChange).toBe('auto');
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

  it('expands an existing mode immediately so the new label never ellipsizes', () => {
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

    expect(animate).not.toHaveBeenCalled();
    expect(parts.modePrefixCurrent.textContent).toBe('当前');
    expect(parts.modePrefix.style.width).toBe('');
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
    expect(controller.menuElement.style.padding).toBe('16px');
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
        modeMenuTooltipController: tooltipController,
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
    expect(resolveTooltipText).toBeTypeOf('function');
    Object.defineProperty(label, 'clientWidth', {
      configurable: true,
      value: 48
    });
    Object.defineProperty(label, 'scrollWidth', {
      configurable: true,
      value: 76
    });
    expect(resolveTooltipText?.()).toBe('微信公众号');
    expect(item?.getAttribute('data-label-truncated')).toBe('true');

    Object.defineProperty(label, 'scrollWidth', {
      configurable: true,
      value: 49
    });
    expect(resolveTooltipText?.()).toBe('微信公众号');
    expect(item?.getAttribute('data-label-truncated')).toBe('true');

    Object.defineProperty(label, 'clientWidth', {
      configurable: true,
      value: 80
    });
    expect(resolveTooltipText?.()).toBe('');
    expect(item?.getAttribute('data-label-truncated')).toBe('false');
    expect(tooltipController.hide).toHaveBeenCalled();
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

    expect(parts.modePrefixIcon.style.width).toBe('15px');
    expect(parts.modePrefixIcon.style.height).toBe('15px');
    expect(parts.modePrefixIcon.style.borderRadius).toBe('2px');
    expect(parts.modePrefixIcon.style.clipPath).toBe('inset(0 round 2px)');
    expect(parts.modePrefixIcon.style.overflow).toBe('hidden');
    controller.destroy();
  });

  it('uses the shortcut theme mixing logic for each provider icon container', async () => {
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
    expect(getThemeForProvider).toHaveBeenCalledWith({ key: 'bilibili' });
    expect(
      icon?.style.getPropertyValue('--x-lumno-search-mode-icon-bg')
    ).toBe('rgb(209, 240, 252)');
    expect(
      icon?.style.getPropertyValue('--x-lumno-search-mode-icon-color')
    ).toBe('#111827');
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
