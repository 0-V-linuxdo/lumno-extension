import { afterEach, describe, expect, it, vi } from 'vitest';

type OnboardingRuntime = typeof globalThis & {
  LumnoOnboardingActions?: {
    implementation?: string;
  };
  LumnoOnboardingActionsReact?: {
    implementation?: string;
  };
  LumnoOnboardingInteractions?: {
    implementation?: string;
  };
  LumnoOnboardingInteractionsReact?: {
    implementation?: string;
  };
  LumnoOnboardingPageStrip?: {
    implementation?: string;
  };
  LumnoOnboardingPageStripReact?: {
    implementation?: string;
  };
  LumnoOnboardingReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOnboardingReactIslands?: unknown;
};

const runtime = globalThis as OnboardingRuntime;

function clearRuntime(): void {
  delete runtime.LumnoOnboardingActions;
  delete runtime.LumnoOnboardingActionsReact;
  delete runtime.LumnoOnboardingInteractions;
  delete runtime.LumnoOnboardingInteractionsReact;
  delete runtime.LumnoOnboardingPageStrip;
  delete runtime.LumnoOnboardingPageStripReact;
  delete runtime.LumnoOnboardingReactBootstrap;
  delete runtime.LumnoOnboardingReactIslands;
}

afterEach(() => {
  clearRuntime();
  vi.resetModules();
});

describe('Onboarding React islands entry', () => {
  it('installs the page-strip API and marks the bootstrap ready', async () => {
    runtime.LumnoOnboardingReactBootstrap = {
      allowReactUpgrade: true,
      reactReady: false
    };

    await import('./onboarding-islands-entry');

    expect(runtime.LumnoOnboardingReactBootstrap.reactReady).toBe(true);
    expect(runtime.LumnoOnboardingPageStrip?.implementation).toBe('react');
    expect(runtime.LumnoOnboardingPageStripReact).toBe(
      runtime.LumnoOnboardingPageStrip
    );
    expect(runtime.LumnoOnboardingActions?.implementation).toBe('react');
    expect(runtime.LumnoOnboardingActionsReact).toBe(
      runtime.LumnoOnboardingActions
    );
    expect(runtime.LumnoOnboardingInteractions?.implementation).toBe('react');
    expect(runtime.LumnoOnboardingInteractionsReact).toBe(
      runtime.LumnoOnboardingInteractions
    );
    expect(runtime.LumnoOnboardingReactIslands).toEqual({
      actions: runtime.LumnoOnboardingActions,
      interactions: runtime.LumnoOnboardingInteractions,
      pageStrip: runtime.LumnoOnboardingPageStrip
    });
  });

  it('does not upgrade APIs after the shared bootstrap has fallen back', async () => {
    runtime.LumnoOnboardingReactBootstrap = {
      allowReactUpgrade: false,
      reactReady: false
    };

    await import('./onboarding-islands-entry');

    expect(runtime.LumnoOnboardingReactBootstrap.reactReady).toBe(false);
    expect(runtime.LumnoOnboardingActions).toBeUndefined();
    expect(runtime.LumnoOnboardingInteractions).toBeUndefined();
    expect(runtime.LumnoOnboardingPageStrip).toBeUndefined();
    expect(runtime.LumnoOnboardingReactIslands).toBeUndefined();
  });
});
