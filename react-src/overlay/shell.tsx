import { useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

export interface LegacyOverlayShellApi {
  appendOverlayStyleNodes?(doc: Document, options?: Record<string, unknown>): void;
  createOverlayElement?(doc: Document, options?: Record<string, unknown>): HTMLElement;
  createOverlayMount?(
    doc: Document,
    options?: Record<string, unknown>
  ): {
    host: HTMLElement;
    panel: HTMLElement;
    root: ShadowRoot | null;
  } | null;
  findOverlayPanel?(doc: Document, options?: Record<string, unknown>): HTMLElement | null;
}

function OverlayPanel({
  attributes,
  register,
  styleText
}: {
  attributes: Record<string, string>;
  register(panel: HTMLDivElement): void;
  styleText: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    panel.style.cssText = styleText;
    Object.entries(attributes).forEach(([name, value]) => {
      panel.setAttribute(name, value);
    });
    panel.dataset.reactIsland = 'overlay-shell';
    register(panel);
  }, [attributes, register, styleText]);
  return <div ref={panelRef} />;
}

export function createOverlayShellApi(legacyApi: LegacyOverlayShellApi | null) {
  const roots = new WeakMap<HTMLElement, Root>();
  const createOverlayMount = (
    doc: Document,
    options: Record<string, unknown> = {}
  ) => {
    const legacyMount = legacyApi?.createOverlayMount?.(doc, options);
    if (!legacyMount) {
      return null;
    }
    const { host, panel: templatePanel, root: shadowRoot } = legacyMount;
    if (!shadowRoot) {
      templatePanel.dataset.reactIsland = 'overlay-shell';
      return legacyMount;
    }
    const styleText = templatePanel.style.cssText;
    const attributes = Array.from(templatePanel.attributes).reduce<
      Record<string, string>
    >((result, attribute) => {
      if (attribute.name !== 'style') {
        result[attribute.name] = attribute.value;
      }
      return result;
    }, {});
    templatePanel.remove();
    let panel: HTMLDivElement | null = null;
    const register = (nextPanel: HTMLDivElement) => {
      panel = nextPanel;
    };
    const reactRoot = createRoot(shadowRoot);
    flushSync(() => {
      reactRoot.render(
        <OverlayPanel
          attributes={attributes}
          register={register}
          styleText={styleText}
        />
      );
    });
    if (!panel) {
      reactRoot.unmount();
      return null;
    }
    const mountedPanel = panel as HTMLDivElement & {
      _lumnoOverlayHost?: HTMLElement;
      _lumnoOverlayRoot?: ShadowRoot;
    };
    const mountedHost = host as HTMLElement & {
      _lumnoOverlayPanel?: HTMLElement;
    };
    mountedPanel._lumnoOverlayHost = host;
    mountedPanel._lumnoOverlayRoot = shadowRoot;
    mountedHost._lumnoOverlayPanel = mountedPanel;
    roots.set(host, reactRoot);
    return {
      host,
      panel: mountedPanel,
      root: shadowRoot
    };
  };

  return Object.freeze({
    appendOverlayStyleNodes:
      legacyApi?.appendOverlayStyleNodes?.bind(legacyApi) || (() => {}),
    createOverlayElement(doc: Document, options?: Record<string, unknown>) {
      const panel = legacyApi?.createOverlayElement?.(doc, options);
      if (panel) {
        panel.dataset.reactIsland = 'overlay-shell';
      }
      return panel || doc.createElement('div');
    },
    createOverlayMount,
    destroyOverlayMount(host: HTMLElement | null) {
      if (!host) {
        return;
      }
      const root = roots.get(host);
      if (!root) {
        return;
      }
      flushSync(() => root.unmount());
      roots.delete(host);
    },
    findOverlayPanel:
      legacyApi?.findOverlayPanel?.bind(legacyApi) || (() => null),
    implementation: 'react'
  });
}
