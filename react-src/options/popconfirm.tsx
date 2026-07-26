import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

export interface PopconfirmRenderModel {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  messageKey: string;
  open: boolean;
}

export interface PopconfirmControllerOptions {
  onCancel(): void;
  onConfirm(): void;
}

export interface PopconfirmController {
  render(model: PopconfirmRenderModel): void;
  destroy(): void;
}

function PopconfirmContent({
  model,
  onCancel,
  onConfirm
}: {
  model: PopconfirmRenderModel;
  onCancel(): void;
  onConfirm(): void;
}) {
  return (
    <>
      <div
        className="_x_extension_popconfirm_text_2024_unique_"
        data-i18n={model.messageKey}
      >
        {model.message}
      </div>
      <div className="_x_extension_popconfirm_actions_2024_unique_">
        <button
          className="_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_secondary_2024_unique_"
          data-i18n="confirm_cancel"
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
          type="button"
        >
          {model.cancelLabel}
        </button>
        <button
          className="_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_"
          data-i18n="confirm_ok"
          onClick={(event) => {
            event.stopPropagation();
            onConfirm();
          }}
          type="button"
        >
          {model.confirmLabel}
        </button>
      </div>
    </>
  );
}

export function createPopconfirmController(
  host: HTMLElement | null,
  options: PopconfirmControllerOptions
): PopconfirmController {
  if (!host) {
    return Object.freeze({
      render() {},
      destroy() {}
    });
  }

  const hostElement = host;
  const reactRoot: Root = createRoot(hostElement);
  let destroyed = false;
  hostElement.className = '_x_extension_popconfirm_2024_unique_';
  hostElement.dataset.open = 'false';
  hostElement.dataset.reactIsland = 'options-popconfirm';

  function render(model: PopconfirmRenderModel): void {
    if (destroyed) {
      return;
    }
    hostElement.dataset.open = model.open ? 'true' : 'false';
    flushSync(() => {
      reactRoot.render(
        <PopconfirmContent
          model={model}
          onCancel={options.onCancel}
          onConfirm={options.onConfirm}
        />
      );
    });
  }

  return Object.freeze({
    render,
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      hostElement.dataset.open = 'false';
      flushSync(() => {
        reactRoot.unmount();
      });
    }
  });
}

export function createPopconfirmApi() {
  return Object.freeze({
    implementation: 'react',
    createPopconfirmController
  });
}
