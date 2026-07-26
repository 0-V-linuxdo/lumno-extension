import { afterEach, describe, expect, it, vi } from 'vitest';

type OptionsRuntime = typeof globalThis & {
  LumnoOptionsReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOptionsReactIslands?: unknown;
  LumnoOptionsToast?: {
    implementation?: string;
  };
  LumnoOptionsToastReact?: {
    implementation?: string;
  };
};

const runtime = globalThis as OptionsRuntime;

function clearRuntime(): void {
  delete runtime.LumnoOptionsReactBootstrap;
  delete runtime.LumnoOptionsReactIslands;
  delete runtime.LumnoOptionsToast;
  delete runtime.LumnoOptionsToastReact;
}

afterEach(() => {
  clearRuntime();
  vi.resetModules();
});

describe('Options React islands entry', () => {
  it('installs the Toast API and marks the bootstrap ready', async () => {
    runtime.LumnoOptionsReactBootstrap = {
      allowReactUpgrade: true,
      reactReady: false
    };

    await import('./options-islands-entry');

    expect(runtime.LumnoOptionsReactBootstrap.reactReady).toBe(true);
    expect(runtime.LumnoOptionsToast?.implementation).toBe('react');
    expect(runtime.LumnoOptionsToastReact).toBe(runtime.LumnoOptionsToast);
    expect(runtime.LumnoOptionsReactIslands).toEqual({
      toast: runtime.LumnoOptionsToast
    });
  });

  it('does not upgrade APIs after the shared bootstrap has fallen back', async () => {
    runtime.LumnoOptionsReactBootstrap = {
      allowReactUpgrade: false,
      reactReady: false
    };

    await import('./options-islands-entry');

    expect(runtime.LumnoOptionsReactBootstrap.reactReady).toBe(false);
    expect(runtime.LumnoOptionsToast).toBeUndefined();
    expect(runtime.LumnoOptionsReactIslands).toBeUndefined();
  });
});
