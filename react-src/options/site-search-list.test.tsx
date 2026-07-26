import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSiteSearchListApi,
  createSiteSearchListController,
  type SiteSearchListController,
  type SiteSearchListRenderModel
} from './site-search-list';

let controllers: SiteSearchListController[] = [];

const model: SiteSearchListRenderModel = {
  copy: {
    aliasLabel: '别名',
    aliasPlaceholder: '例如 小破站、油管等',
    cancelLabel: '取消',
    confirmLabel: '确认',
    confirmMessage: '确认移除该项？',
    confirmMessageKey: 'confirm_remove_item',
    editLabel: '编辑',
    keyLabel: '触发词',
    keyPlaceholder: '必填，如有多个用英文逗号分隔',
    nameLabel: '显示名称',
    namePlaceholder: '选填，默认使用触发词',
    removeLabel: '移除',
    saveLabel: '保存修改',
    templateHelp: '搜索模板需要包含 {query}',
    templateLabel: '搜索模板'
  },
  items: [
    {
      aliasesText: '视频',
      badgeText: '自定义',
      duplicateLabel: '与内置重复',
      duplicateTemplate: 'https://example.com/?q={query}',
      duplicateTooltip: '定位内置项',
      iconUrl: 'https://example.com/favicon.ico',
      id: 'custom:ex',
      isBuiltin: false,
      key: 'ex',
      meta: 'ex · https://example.com/?q={query}',
      name: 'Example',
      normalizedTemplate: 'https://example.com/?q={query}',
      template: 'https://example.com/?q={query}',
      templateEditable: true
    }
  ],
  placeholder: ''
};

function createFixture() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const options = {
    kind: 'custom',
    onLocateDuplicate: vi.fn(),
    onRemove: vi.fn(),
    onSave: vi.fn().mockResolvedValue({ ok: true })
  };
  const controller = createSiteSearchListController(host, options);
  controllers.push(controller);
  return { controller, host, options };
}

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
  controllers = [];
  document.body.textContent = '';
});

describe('Options site-search list React island', () => {
  it('renders provider metadata, legacy classes, and host contracts', () => {
    const { controller, host } = createFixture();
    act(() => controller.render(model));

    expect(createSiteSearchListApi().implementation).toBe('react');
    expect(host.dataset.reactIsland).toBe('options-site-search-list');
    expect(host.dataset.providerKind).toBe('custom');
    expect(host.querySelector('[data-provider-id="custom:ex"]')).not.toBeNull();
    expect(host.querySelector('._x_extension_shortcut_item_meta_2024_unique_')
      ?.textContent).toContain('{query}');
  });

  it('edits a provider draft and routes save through the adapter', async () => {
    const { controller, host, options } = createFixture();
    act(() => controller.render(model));
    act(() => {
      host.querySelector<HTMLButtonElement>('._x_extension_shortcut_edit_2024_unique_')
        ?.click();
    });
    const nameInput = host.querySelector<HTMLInputElement>('[data-provider-field="name"]');
    act(() => {
      if (nameInput) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(nameInput, 'Updated');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await act(async () => {
      host.querySelector<HTMLButtonElement>(
        '._x_extension_shortcut_editor_2024_unique_ ._x_extension_shortcut_submit_primary_2024_unique_'
      )?.click();
      await Promise.resolve();
    });

    expect(options.onSave).toHaveBeenCalledWith(
      'ex',
      false,
      expect.objectContaining({ name: 'Updated' })
    );
  });

  it('keeps the editor expanded when the adapter returns an error', async () => {
    const { controller, host, options } = createFixture();
    options.onSave.mockResolvedValue({ ok: false, error: '触发词不能为空' });
    act(() => controller.render(model));
    act(() => {
      host.querySelector<HTMLButtonElement>('._x_extension_shortcut_edit_2024_unique_')
        ?.click();
    });
    await act(async () => {
      host.querySelector<HTMLButtonElement>(
        '._x_extension_shortcut_editor_2024_unique_ ._x_extension_shortcut_submit_primary_2024_unique_'
      )?.click();
      await Promise.resolve();
    });

    expect(host.querySelector('._x_extension_shortcut_error_2024_unique_')?.textContent)
      .toBe('触发词不能为空');
    expect(host.querySelector('[data-expanded="true"]')).not.toBeNull();
  });

  it('routes duplicate location and confirmed removal actions', () => {
    const { controller, host, options } = createFixture();
    act(() => controller.render(model));
    act(() => {
      host.querySelector<HTMLButtonElement>('._x_extension_shortcut_badge_warn_2024_unique_')
        ?.click();
      host.querySelector<HTMLButtonElement>('._x_extension_shortcut_remove_2024_unique_')
        ?.click();
    });
    const confirmButtons = host.querySelectorAll<HTMLButtonElement>(
      '._x_extension_popconfirm_actions_2024_unique_ button'
    );
    act(() => confirmButtons[1]?.click());

    expect(options.onLocateDuplicate).toHaveBeenCalledWith(
      'https://example.com/?q={query}'
    );
    expect(options.onRemove).toHaveBeenCalledWith('ex', false);
  });
});
