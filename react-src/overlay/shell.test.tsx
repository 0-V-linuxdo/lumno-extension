import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createOverlayShellApi,
  type LegacyOverlayShellApi
} from './shell';

function createLegacyShell(): LegacyOverlayShellApi {
  return {
    appendOverlayStyleNodes: vi.fn(),
    createOverlayElement(doc, options = {}) {
      const panel = doc.createElement('div');
      panel.id = String(options.id || 'overlay');
      panel.style.cssText =
        'position: fixed !important; border-radius: 32px !important;';
      panel.setAttribute('data-lumno-overlay-panel', 'true');
      return panel;
    },
    createOverlayMount(doc, options = {}) {
      const host = doc.createElement('div');
      host.id = String(options.hostId || 'host');
      host.setAttribute('data-lumno-overlay-host', 'true');
      const root = host.attachShadow({ mode: 'open' });
      const panel = this.createOverlayElement?.(doc, options);
      if (!panel) {
        return null;
      }
      root.appendChild(panel);
      return { host, panel, root };
    },
    findOverlayPanel(doc, options = {}) {
      const host = doc.getElementById(String(options.hostId || 'host'));
      return host?.shadowRoot?.querySelector(
        `#${String(options.id || 'overlay')}`
      ) as HTMLElement | null;
    }
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Overlay React shell', () => {
  it('recreates the legacy panel as a React-owned Shadow DOM node', () => {
    const api = createOverlayShellApi(createLegacyShell());
    const holder: {
      value: ReturnType<typeof api.createOverlayMount>;
    } = { value: null };
    act(() => {
      holder.value = api.createOverlayMount(document, {
        hostId: 'overlay-host',
        id: 'overlay-panel'
      });
    });
    const mount = holder.value;
    if (!mount) {
      throw new Error('Expected overlay mount');
    }
    document.body.appendChild(mount.host);

    expect(api.implementation).toBe('react');
    expect(mount.panel.dataset.reactIsland).toBe('overlay-shell');
    expect(mount.panel.id).toBe('overlay-panel');
    expect(mount.panel.getAttribute('data-lumno-overlay-panel')).toBe('true');
    expect(mount.panel.style.position).toBe('fixed');
    expect(mount.root?.querySelectorAll('#overlay-panel')).toHaveLength(1);

    const externalChild = document.createElement('input');
    mount.panel.appendChild(externalChild);
    expect(mount.panel.contains(externalChild)).toBe(true);

    act(() => api.destroyOverlayMount(mount.host));
    expect(mount.root?.querySelector('#overlay-panel')).toBeNull();
  });

  it('keeps the legacy stylesheet and lookup adapters', () => {
    const legacy = createLegacyShell();
    const api = createOverlayShellApi(legacy);
    api.appendOverlayStyleNodes(document, { root: document.head });
    expect(legacy.appendOverlayStyleNodes).toHaveBeenCalled();
  });
});
