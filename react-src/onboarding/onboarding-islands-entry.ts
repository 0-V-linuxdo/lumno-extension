import { createPageStripApi } from './page-strip';

const runtime = globalThis as typeof globalThis & {
  LumnoOnboardingPageStrip?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingPageStripReact?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOnboardingReactIslands?: {
    pageStrip: ReturnType<typeof createPageStripApi>;
  };
};

const bootstrapState = runtime.LumnoOnboardingReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const pageStripApi = createPageStripApi();

  runtime.LumnoOnboardingPageStripReact = pageStripApi;
  runtime.LumnoOnboardingPageStrip = pageStripApi;
  runtime.LumnoOnboardingReactIslands = Object.freeze({
    pageStrip: pageStripApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
