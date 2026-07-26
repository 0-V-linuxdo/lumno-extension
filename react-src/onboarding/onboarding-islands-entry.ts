import { createActionButtonsApi } from './action-buttons';
import { createPageStripApi } from './page-strip';

const runtime = globalThis as typeof globalThis & {
  LumnoOnboardingActions?: ReturnType<typeof createActionButtonsApi>;
  LumnoOnboardingActionsReact?: ReturnType<typeof createActionButtonsApi>;
  LumnoOnboardingPageStrip?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingPageStripReact?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOnboardingReactIslands?: {
    actions: ReturnType<typeof createActionButtonsApi>;
    pageStrip: ReturnType<typeof createPageStripApi>;
  };
};

const bootstrapState = runtime.LumnoOnboardingReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const actionsApi = createActionButtonsApi();
  const pageStripApi = createPageStripApi();

  runtime.LumnoOnboardingActionsReact = actionsApi;
  runtime.LumnoOnboardingActions = actionsApi;
  runtime.LumnoOnboardingPageStripReact = pageStripApi;
  runtime.LumnoOnboardingPageStrip = pageStripApi;
  runtime.LumnoOnboardingReactIslands = Object.freeze({
    actions: actionsApi,
    pageStrip: pageStripApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
