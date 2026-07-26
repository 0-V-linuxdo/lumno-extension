import { afterEach, describe, expect, it, vi } from 'vitest';

type OverlayRuntime = typeof globalThis & {
  LumnoOverlayReactBootstrap?: { reactReady: boolean };
  LumnoOverlayReactIslands?: {
    searchInput?: { implementation?: string };
    shell?: { implementation?: string };
  };
  LumnoOverlayShell?: {
    createOverlayMount?(): unknown;
    implementation?: string;
  };
  LumnoOverlayShellReact?: {
    implementation?: string;
  };
  LumnoSearchInputUI?: {
    createSearchInput?(): unknown;
    implementation?: string;
  };
  LumnoSearchInputUIReact?: {
    implementation?: string;
  };
  _x_extension_createSearchInput_2024_unique_?: unknown;
};

const runtime = globalThis as OverlayRuntime;

afterEach(() => {
  delete runtime.LumnoOverlayReactBootstrap;
  delete runtime.LumnoOverlayReactIslands;
  delete runtime.LumnoOverlayShell;
  delete runtime.LumnoOverlayShellReact;
  delete runtime.LumnoSearchInputUI;
  delete runtime.LumnoSearchInputUIReact;
  delete runtime._x_extension_createSearchInput_2024_unique_;
  vi.resetModules();
});

describe('Overlay React islands entry', () => {
  it('upgrades the legacy shell and search-input globals synchronously', async () => {
    runtime.LumnoOverlayShell = {
      createOverlayMount: vi.fn()
    };

    await import('./react-islands-entry');

    expect(runtime.LumnoOverlayReactBootstrap).toEqual({ reactReady: true });
    expect(runtime.LumnoSearchInputUI?.implementation).toBe('react');
    expect(runtime.LumnoSearchInputUIReact).toBe(runtime.LumnoSearchInputUI);
    expect(runtime._x_extension_createSearchInput_2024_unique_).toBe(
      runtime.LumnoSearchInputUI?.createSearchInput
    );
    expect(runtime.LumnoOverlayShell?.implementation).toBe('react');
    expect(runtime.LumnoOverlayShellReact).toBe(runtime.LumnoOverlayShell);
    expect(runtime.LumnoOverlayReactIslands).toEqual({
      searchInput: runtime.LumnoSearchInputUI,
      shell: runtime.LumnoOverlayShell
    });
  });
});
