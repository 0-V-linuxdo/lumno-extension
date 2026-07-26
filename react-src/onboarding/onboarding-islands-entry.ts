import { createActionButtonsApi } from './action-buttons';
import { createBodyCopyApi } from './body-copy';
import { createCopyHeadingApi } from './copy-heading';
import { createCursorLayerApi } from './cursor-layer';
import { createInteractionsApi } from './interactions';
import { createPageStripApi } from './page-strip';
import { createVisualSurfaceApi } from './visual-surface';

const runtime = globalThis as typeof globalThis & {
  LumnoOnboardingActions?: ReturnType<typeof createActionButtonsApi>;
  LumnoOnboardingActionsReact?: ReturnType<typeof createActionButtonsApi>;
  LumnoOnboardingBodyCopy?: ReturnType<typeof createBodyCopyApi>;
  LumnoOnboardingBodyCopyReact?: ReturnType<typeof createBodyCopyApi>;
  LumnoOnboardingCopyHeading?: ReturnType<typeof createCopyHeadingApi>;
  LumnoOnboardingCopyHeadingReact?: ReturnType<typeof createCopyHeadingApi>;
  LumnoOnboardingCursorLayer?: ReturnType<typeof createCursorLayerApi>;
  LumnoOnboardingCursorLayerReact?: ReturnType<typeof createCursorLayerApi>;
  LumnoOnboardingInteractions?: ReturnType<typeof createInteractionsApi>;
  LumnoOnboardingInteractionsReact?: ReturnType<typeof createInteractionsApi>;
  LumnoOnboardingPageStrip?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingPageStripReact?: ReturnType<typeof createPageStripApi>;
  LumnoOnboardingVisualSurface?: ReturnType<typeof createVisualSurfaceApi>;
  LumnoOnboardingVisualSurfaceReact?: ReturnType<typeof createVisualSurfaceApi>;
  LumnoOnboardingReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOnboardingReactIslands?: {
    actions: ReturnType<typeof createActionButtonsApi>;
    bodyCopy: ReturnType<typeof createBodyCopyApi>;
    copyHeading: ReturnType<typeof createCopyHeadingApi>;
    cursorLayer: ReturnType<typeof createCursorLayerApi>;
    interactions: ReturnType<typeof createInteractionsApi>;
    pageStrip: ReturnType<typeof createPageStripApi>;
    visualSurface: ReturnType<typeof createVisualSurfaceApi>;
  };
};

const bootstrapState = runtime.LumnoOnboardingReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const actionsApi = createActionButtonsApi();
  const bodyCopyApi = createBodyCopyApi();
  const copyHeadingApi = createCopyHeadingApi();
  const cursorLayerApi = createCursorLayerApi();
  const interactionsApi = createInteractionsApi();
  const pageStripApi = createPageStripApi();
  const visualSurfaceApi = createVisualSurfaceApi();

  runtime.LumnoOnboardingActionsReact = actionsApi;
  runtime.LumnoOnboardingActions = actionsApi;
  runtime.LumnoOnboardingBodyCopyReact = bodyCopyApi;
  runtime.LumnoOnboardingBodyCopy = bodyCopyApi;
  runtime.LumnoOnboardingCopyHeadingReact = copyHeadingApi;
  runtime.LumnoOnboardingCopyHeading = copyHeadingApi;
  runtime.LumnoOnboardingCursorLayerReact = cursorLayerApi;
  runtime.LumnoOnboardingCursorLayer = cursorLayerApi;
  runtime.LumnoOnboardingInteractionsReact = interactionsApi;
  runtime.LumnoOnboardingInteractions = interactionsApi;
  runtime.LumnoOnboardingPageStripReact = pageStripApi;
  runtime.LumnoOnboardingPageStrip = pageStripApi;
  runtime.LumnoOnboardingVisualSurfaceReact = visualSurfaceApi;
  runtime.LumnoOnboardingVisualSurface = visualSurfaceApi;
  runtime.LumnoOnboardingReactIslands = Object.freeze({
    actions: actionsApi,
    bodyCopy: bodyCopyApi,
    copyHeading: copyHeadingApi,
    cursorLayer: cursorLayerApi,
    interactions: interactionsApi,
    pageStrip: pageStripApi,
    visualSurface: visualSurfaceApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
