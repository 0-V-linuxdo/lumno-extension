import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createShortcutDialog,
  createShortcutDialogApi,
  type ShortcutDialogController,
  type ShortcutDialogOptions,
  type ShortcutDialogPayload
} from './shortcut-dialog';

let frameCallbacks: Map<number, FrameRequestCallback>;
let nextFrameId: number;
let controllers: ShortcutDialogController[];

function flushAnimationFrames(): void {
  const pending = Array.from(frameCallbacks.values());
  frameCallbacks.clear();
  pending.forEach((callback) => callback(performance.now()));
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function createController(
  onSubmit: (payload: Readonly<ShortcutDialogPayload>) => boolean | Promise<boolean>,
  overrides: Partial<ShortcutDialogOptions> = {}
): ShortcutDialogController {
  const result: { controller: ShortcutDialogController | null } = {
    controller: null
  };
  act(() => {
    result.controller = createShortcutDialog({
      documentObj: document,
      windowObj: window,
      closeDelayMs: 0,
      t: (_key, fallback) => fallback,
      onSubmit,
      getRiSvg: (id, sizeClass = 'ri-size-16') =>
        `<i class="${sizeClass} ${id}" aria-hidden="true"></i>`,
      ...overrides
    });
  });
  const controller = result.controller;
  if (!controller) {
    throw new Error('Expected the shortcut dialog controller to be created.');
  }
  controllers.push(controller);
  controller.mount(document.body);
  return controller;
}

beforeEach(() => {
  frameCallbacks = new Map();
  nextFrameId = 1;
  controllers = [];
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      frameCallbacks.set(frameId, callback);
      return frameId;
    })
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    value: vi.fn((frameId: number) => {
      frameCallbacks.delete(frameId);
    })
  });
});

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
});

describe('shortcut dialog React island', () => {
  it('keeps the legacy helper and controller contract', () => {
    const api = createShortcutDialogApi();

    expect(api.implementation).toBe('react');
    expect(api.MODE_ADD).toBe('add');
    expect(api.MODE_EDIT).toBe('edit');
    expect(api.normalizeMode('edit', null)).toBe('add');
    expect(api.normalizeMode('edit', { id: 'one' })).toBe('edit');
    expect(api.clampEnterOffset(50, 28)).toBe(28);
    expect(api.getEnterOffset(90, 100)).toBe(-6);

    const controller = createController(() => false);
    expect(Object.isFrozen(controller)).toBe(true);
    expect(controller.element.dataset.reactIsland).toBe('shortcut-dialog');
    expect(controller.getState()).toEqual({
      mode: 'add',
      itemType: 'shortcut',
      editingId: '',
      open: false,
      busy: false
    });
  });

  it('opens in edit mode, submits controlled values, and restores focus', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const submissions: Readonly<ShortcutDialogPayload>[] = [];
    const controller = createController((payload) => {
      submissions.push(payload);
      return true;
    });

    act(() => {
      controller.open({
        mode: 'edit',
        shortcut: {
          id: 'shortcut-one',
          title: 'Example',
          url: 'https://example.com/'
        },
        sourceElement: trigger
      });
    });

    const inputs = controller.element.querySelectorAll<HTMLInputElement>(
      'input[type="text"]'
    );
    expect(controller.element.hidden).toBe(false);
    expect(document.activeElement).toBe(inputs[0]);

    act(() => {
      flushAnimationFrames();
    });

    expect(controller.element.dataset.open).toBe('true');
    expect(controller.getState()).toEqual({
      mode: 'edit',
      itemType: 'shortcut',
      editingId: 'shortcut-one',
      open: true,
      busy: false
    });
    expect(document.activeElement).toBe(inputs[0]);
    expect(inputs[0].value).toBe('Example');
    expect(inputs[1].value).toBe('https://example.com/');
    expect(
      controller.element.querySelector('.x-nt-shortcut-dialog-title')?.textContent
    ).toBe('Edit shortcut');

    act(() => {
      setInputValue(inputs[0], 'Edited');
      setInputValue(inputs[1], 'https://edited.example/');
    });

    let saved = false;
    await act(async () => {
      saved = await controller.submit();
    });

    expect(saved).toBe(true);
    expect(submissions).toEqual([
      {
        title: 'Edited',
        url: 'https://edited.example/',
        mode: 'edit',
        itemType: 'shortcut',
        itemId: 'shortcut-one',
        shortcutId: 'shortcut-one',
        iconAction: 'keep',
        iconDataUrl: ''
      }
    ]);
    expect(controller.element.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('isolates the page while open and redirects escaped focus into the dialog', () => {
    const pageContent = document.createElement('main');
    const searchInput = document.createElement('input');
    const backgroundButton = document.createElement('button');
    pageContent.append(searchInput, backgroundButton);
    document.body.appendChild(pageContent);
    searchInput.focus();

    const controller = createController(() => false);

    act(() => {
      controller.open({ sourceElement: backgroundButton });
    });

    const nameInput = controller.element.querySelector<HTMLInputElement>(
      'input[type="text"]'
    );
    expect(document.activeElement).toBe(nameInput);
    expect(pageContent.hasAttribute('inert')).toBe(true);

    act(() => {
      searchInput.focus();
    });
    expect(document.activeElement).toBe(nameInput);

    act(() => {
      flushAnimationFrames();
    });
    expect(controller.getState().open).toBe(true);

    act(() => {
      controller.close({ restoreFocus: true });
    });
    expect(pageContent.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(backgroundButton);
  });

  it('uses the shared form for bookmark and folder editing', async () => {
    const submissions: Readonly<ShortcutDialogPayload>[] = [];
    const controller = createController((payload) => {
      submissions.push(payload);
      return true;
    });

    act(() => {
      controller.open({
        mode: 'edit',
        itemType: 'bookmark',
        shortcut: {
          id: 'bookmark-one',
          title: 'Docs',
          url: 'https://docs.example/'
        }
      });
      flushAnimationFrames();
    });

    let inputs = controller.element.querySelectorAll<HTMLInputElement>(
      'input[type="text"]'
    );
    expect(controller.getState().itemType).toBe('bookmark');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe('Docs');
    expect(inputs[1].value).toBe('https://docs.example/');
    expect(
      controller.element.querySelector('.x-nt-shortcut-dialog-title')?.textContent
    ).toBe('Edit bookmark');
    expect(
      controller.element.querySelector('.x-nt-shortcut-icon-field')
    ).toBeNull();

    act(() => {
      setInputValue(inputs[0], 'Reference');
      setInputValue(inputs[1], 'https://reference.example/');
    });
    await act(async () => {
      await controller.submit();
    });

    act(() => {
      controller.open({
        mode: 'edit',
        itemType: 'folder',
        shortcut: {
          id: 'folder-one',
          title: 'Research'
        }
      });
      flushAnimationFrames();
    });

    inputs = controller.element.querySelectorAll<HTMLInputElement>(
      'input[type="text"]'
    );
    expect(controller.getState().itemType).toBe('folder');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe('Research');
    expect(
      controller.element.querySelector('.x-nt-shortcut-dialog-title')?.textContent
    ).toBe('Edit folder');
    expect(
      controller.element.querySelector('.x-nt-shortcut-icon-field')
    ).toBeNull();

    act(() => {
      setInputValue(inputs[0], 'Reading');
    });
    await act(async () => {
      await controller.submit();
    });

    expect(submissions).toEqual([
      {
        title: 'Reference',
        url: 'https://reference.example/',
        mode: 'edit',
        itemType: 'bookmark',
        itemId: 'bookmark-one',
        shortcutId: 'bookmark-one',
        iconAction: 'keep',
        iconDataUrl: ''
      },
      {
        title: 'Reading',
        url: '',
        mode: 'edit',
        itemType: 'folder',
        itemId: 'folder-one',
        shortcutId: 'folder-one',
        iconAction: 'keep',
        iconDataUrl: ''
      }
    ]);
  });

  it('blocks close and replacement state while persistence is pending', async () => {
    let resolveSubmit: ((saved: boolean) => void) | undefined;
    const controller = createController(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    act(() => {
      controller.open();
      flushAnimationFrames();
    });

    let submission: Promise<boolean> = Promise.resolve(false);
    act(() => {
      submission = controller.submit();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(controller.getState().busy).toBe(true);
    expect(controller.close({ restoreFocus: true })).toBe(false);
    expect(
      controller.open({
        mode: 'edit',
        shortcut: {
          id: 'second',
          title: 'Second',
          url: 'https://second.example/'
        }
      })
    ).toBe(false);
    expect(controller.getState().mode).toBe('add');

    await act(async () => {
      resolveSubmit?.(true);
      expect(await submission).toBe(true);
    });
    expect(controller.element.hidden).toBe(true);
  });

  it('processes a replacement icon and refreshes translated copy', async () => {
    let language = 'en';
    const submissions: Readonly<ShortcutDialogPayload>[] = [];
    const controller = createController(
      (payload) => {
        submissions.push(payload);
        return true;
      },
      {
        t: (key, fallback) => (
          language === 'zh' && key === 'newtab_shortcuts_dialog_title'
            ? '添加快捷方式'
            : fallback
        ),
        prepareIconFile: async () => ({
          dataUrl: 'data:image/png;base64,dGVzdA=='
        })
      }
    );

    act(() => {
      controller.open();
      flushAnimationFrames();
    });
    const fileInput = controller.element.querySelector<HTMLInputElement>(
      '.x-nt-shortcut-icon-input'
    );
    if (!fileInput) {
      throw new Error('Expected the shortcut icon input to exist.');
    }
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [new File(['icon'], 'icon.png', { type: 'image/png' })]
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const uploadTile = controller.element.querySelector<HTMLElement>(
      '.x-nt-shortcut-icon-upload-tile'
    );
    expect(uploadTile?.dataset.hasIcon).toBe('true');
    expect(uploadTile?.getAttribute('aria-label')).toBe('Replace image');

    language = 'zh';
    act(() => {
      controller.updateLanguage();
    });
    expect(
      controller.element.querySelector('.x-nt-shortcut-dialog-title')?.textContent
    ).toBe('添加快捷方式');

    await act(async () => {
      await controller.submit();
    });
    expect(submissions[0]).toMatchObject({
      iconAction: 'replace',
      iconDataUrl: 'data:image/png;base64,dGVzdA=='
    });
  });

  it('traps focus, closes on Escape, and detaches cleanly', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const controller = createController(() => false);

    act(() => {
      controller.open({ sourceElement: trigger });
      flushAnimationFrames();
    });

    const nameInput = controller.element.querySelector<HTMLInputElement>(
      'input[type="text"]'
    );
    const doneButton = controller.element.querySelector<HTMLButtonElement>(
      '.x-nt-shortcut-dialog-button--primary'
    );
    doneButton?.focus();
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true
    });
    act(() => {
      controller.element.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(nameInput);

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    });
    act(() => {
      controller.element.dispatchEvent(escapeEvent);
    });
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(controller.element.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);

    act(() => {
      controller.destroy();
    });
    controllers = controllers.filter((candidate) => candidate !== controller);
    expect(controller.element.isConnected).toBe(false);
    expect(controller.open()).toBe(false);
  });
});
