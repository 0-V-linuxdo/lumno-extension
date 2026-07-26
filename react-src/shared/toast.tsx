import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

export interface ToastOptions {
  windowObj?: Pick<Window, 'setTimeout' | 'clearTimeout'>;
  duration?: number;
  errorBackground?: string;
}

export interface ToastController {
  show(
    message: unknown,
    options?: { error?: boolean; duration?: number }
  ): void;
  hide(): void;
  destroy(): void;
}

export interface LegacyToastApi {
  createToastController?: (
    toastElement: HTMLElement | null,
    options?: ToastOptions
  ) => ToastController;
}

export function createToastController(
  toastElement: HTMLElement | null,
  options: ToastOptions = {},
  legacyApi?: LegacyToastApi | null
): ToastController {
  if (!toastElement) {
    return legacyApi?.createToastController?.(toastElement, options) || {
      show() {},
      hide() {},
      destroy() {}
    };
  }
  const host: HTMLElement = toastElement;
  const windowObj = options.windowObj || window;
  const setTimer = windowObj.setTimeout.bind(windowObj);
  const clearTimer = windowObj.clearTimeout.bind(windowObj);
  const defaultDuration = Number.isFinite(Number(options.duration))
    ? Math.max(0, Number(options.duration))
    : 2200;
  const reactRoot: Root = createRoot(host);
  host.setAttribute('data-react-island', 'toast');
  let timer = 0;
  let destroyed = false;

  function hide(): void {
    if (timer) {
      clearTimer(timer);
      timer = 0;
    }
    if (!destroyed) {
      host.setAttribute('data-show', 'false');
    }
  }

  function show(
    message: unknown,
    showOptions: { error?: boolean; duration?: number } = {}
  ): void {
    const text = String(message || '');
    if (destroyed || !text) {
      return;
    }
    hide();
    flushSync(() => {
      reactRoot.render(text);
    });
    if (showOptions.error) {
      host.style.setProperty(
        'background',
        options.errorBackground || 'rgba(153, 27, 27, 0.92)'
      );
    } else {
      host.style.removeProperty('background');
    }
    host.setAttribute('data-show', 'true');
    const duration = Number.isFinite(Number(showOptions.duration))
      ? Math.max(0, Number(showOptions.duration))
      : defaultDuration;
    if (duration > 0) {
      timer = setTimer(() => {
        timer = 0;
        if (!destroyed) {
          host.setAttribute('data-show', 'false');
        }
      }, duration);
    }
  }

  return Object.freeze({
    show,
    hide,
    destroy() {
      if (destroyed) {
        return;
      }
      hide();
      destroyed = true;
      flushSync(() => {
        reactRoot.unmount();
      });
    }
  });
}

export function createToastApi(legacyApi?: LegacyToastApi | null) {
  return Object.freeze({
    implementation: 'react',
    createToastController(
      toastElement: HTMLElement | null,
      options?: ToastOptions
    ) {
      return createToastController(toastElement, options, legacyApi);
    }
  });
}
