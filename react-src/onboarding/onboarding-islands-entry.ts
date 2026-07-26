import { createActionButtonsApi } from './action-buttons';
import { createInteractionsApi } from './interactions';
import { createPageStripApi } from './page-strip';

const runtime = globalThis as typeof globalThis & {
  LumnoOnboardingActions?: ReturnType<typeof createActionButtonsApi>;
  LumnoOnboardingActionsReact?: ReturnType<typeof createActionButtonsApi>;
  LumnoOnboardingInteractions?: ReturnType<typeof createInteractionsApi>;
  LumnoOnboardingInteractionsReact?: ReturnType<typeof createInteractionsApi>;
  LumnoOnboardingPageStrip?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingPageStripReact?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOnboardingReactIslands?: {
    actions: ReturnType<typeof createActionButtonsApi>;
    interactions: ReturnType<typeof createInteractionsApi>;
    pageStrip: ReturnType<typeof createPageStripApi>;
  };
};

const bootstrapState = runtime.LumnoOnboardingReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const actionsApi = createActionButtonsApi();
  const interactionsApi = createInteractionsApi();
  const pageStripApi = createPageStripApi();

  runtime.LumnoOnboardingActionsReact = actionsApi;
  runtime.LumnoOnboardingActions = actionsApi;
  runtime.LumnoOnboardingInteractionsReact = interactionsApi;
  runtime.LumnoOnboardingInteractions = interactionsApi;
  runtime.LumnoOnboardingPageStripReact = pageStripApi;
  runtime.LumnoOnboardingPageStrip = pageStripApi;
  runtime.LumnoOnboardingReactIslands = Object.freeze({
    actions: actionsApi,
    interactions: interactionsApi,
    pageStrip: pageStripApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
