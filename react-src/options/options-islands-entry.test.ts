import { afterEach, describe, expect, it, vi } from 'vitest';

type OptionsRuntime = typeof globalThis & {
  LumnoOptionsReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOptionsReactIslands?: unknown;
  LumnoOptionsPopconfirm?: {
    implementation?: string;
  };
  LumnoOptionsPopconfirmReact?: {
    implementation?: string;
  };
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
  delete runtime.LumnoOptionsPopconfirm;
  delete runtime.LumnoOptionsPopconfirmReact;
  delete runtime.LumnoOptionsToast;
  delete runtime.LumnoOptionsToastReact;
}

afterEach(() => {
  clearRuntime();
  vi.resetModules();
});

describe('Options React islands entry', () => {
  it('installs the Popconfirm and Toast APIs and marks the bootstrap ready', async () => {
    runtime.LumnoOptionsReactBootstrap = {
      allowReactUpgrade: true,
      reactReady: false
    };

    await import('./options-islands-entry');

    expect(runtime.LumnoOptionsReactBootstrap.reactReady).toBe(true);
    expect(runtime.LumnoOptionsPopconfirm?.implementation).toBe('react');
    expect(runtime.LumnoOptionsPopconfirmReact).toBe(
      runtime.LumnoOptionsPopconfirm
    );
    expect(runtime.LumnoOptionsToast?.implementation).toBe('react');
    expect(runtime.LumnoOptionsToastReact).toBe(runtime.LumnoOptionsToast);
    expect(runtime.LumnoOptionsReactIslands).toEqual({
      popconfirm: runtime.LumnoOptionsPopconfirm,
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
    expect(runtime.LumnoOptionsPopconfirm).toBeUndefined();
    expect(runtime.LumnoOptionsToast).toBeUndefined();
    expect(runtime.LumnoOptionsReactIslands).toBeUndefined();
  });
});
