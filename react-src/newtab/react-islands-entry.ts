import {
  createBookmarksViewApi,
  type LegacyBookmarksApi
} from './bookmarks';
import { createFeedbackControlApi } from './feedback';
import { createRecentSitesViewApi, type LegacyRecentSitesApi } from './recent-sites';
import { createShortcutDialogApi } from './shortcut-dialog';
import {
  createShortcutsViewApi,
  type LegacyShortcutsApi
} from './shortcuts';
import {
  createSuggestionsViewApi,
  type LegacySuggestionsApi
} from './suggestions';
import { createToastApi, type LegacyToastApi } from './toast';

const runtime = globalThis as typeof globalThis & {
  LumnoNewtabReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoNewtabReactIslands?: {
    bookmarks: ReturnType<typeof createBookmarksViewApi>;
    feedback: ReturnType<typeof createFeedbackControlApi>;
    shortcutDialog: ReturnType<typeof createShortcutDialogApi>;
    recentSites: ReturnType<typeof createRecentSitesViewApi>;
    shortcuts: ReturnType<typeof createShortcutsViewApi>;
    suggestions: ReturnType<typeof createSuggestionsViewApi>;
    toast: ReturnType<typeof createToastApi>;
  };
  LumnoNewtabBookmarksView?: LegacyBookmarksApi;
  LumnoNewtabBookmarksViewReact?: ReturnType<typeof createBookmarksViewApi>;
  LumnoNewtabFeedbackControl?: ReturnType<typeof createFeedbackControlApi>;
  LumnoNewtabFeedbackControlReact?: ReturnType<typeof createFeedbackControlApi>;
  LumnoNewtabShortcutDialog?: ReturnType<typeof createShortcutDialogApi>;
  LumnoNewtabShortcutDialogReact?: ReturnType<typeof createShortcutDialogApi>;
  LumnoNewtabShortcutsView?: LegacyShortcutsApi;
  LumnoNewtabShortcutsViewReact?: ReturnType<typeof createShortcutsViewApi>;
  LumnoNewtabRecentSitesView?: LegacyRecentSitesApi;
  LumnoNewtabRecentSitesViewReact?: ReturnType<typeof createRecentSitesViewApi>;
  LumnoNewtabSuggestionsView?: LegacySuggestionsApi;
  LumnoNewtabSuggestionsViewReact?: ReturnType<typeof createSuggestionsViewApi>;
  LumnoNewtabToast?: LegacyToastApi;
  LumnoNewtabToastReact?: ReturnType<typeof createToastApi>;
};

const bootstrapState = runtime.LumnoNewtabReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const legacyBookmarksApi = runtime.LumnoNewtabBookmarksView || null;
  const legacyRecentSitesApi = runtime.LumnoNewtabRecentSitesView || null;
  const legacyShortcutsApi = runtime.LumnoNewtabShortcutsView || null;
  const legacySuggestionsApi = runtime.LumnoNewtabSuggestionsView || null;
  const legacyToastApi = runtime.LumnoNewtabToast || null;
  const bookmarksApi = createBookmarksViewApi(legacyBookmarksApi);
  const feedbackApi = createFeedbackControlApi();
  const shortcutDialogApi = createShortcutDialogApi();
  const recentSitesApi = createRecentSitesViewApi(legacyRecentSitesApi);
  const shortcutsApi = createShortcutsViewApi(legacyShortcutsApi);
  const suggestionsApi = createSuggestionsViewApi(legacySuggestionsApi);
  const toastApi = createToastApi(legacyToastApi);

  runtime.LumnoNewtabBookmarksViewReact = bookmarksApi;
  runtime.LumnoNewtabBookmarksView = bookmarksApi;
  runtime.LumnoNewtabFeedbackControlReact = feedbackApi;
  runtime.LumnoNewtabFeedbackControl = feedbackApi;
  runtime.LumnoNewtabShortcutDialogReact = shortcutDialogApi;
  runtime.LumnoNewtabShortcutDialog = shortcutDialogApi;
  runtime.LumnoNewtabRecentSitesViewReact = recentSitesApi;
  runtime.LumnoNewtabRecentSitesView = recentSitesApi;
  runtime.LumnoNewtabShortcutsViewReact = shortcutsApi;
  runtime.LumnoNewtabShortcutsView = shortcutsApi;
  runtime.LumnoNewtabSuggestionsViewReact = suggestionsApi;
  runtime.LumnoNewtabSuggestionsView = suggestionsApi;
  runtime.LumnoNewtabToastReact = toastApi;
  runtime.LumnoNewtabToast = toastApi;
  runtime.LumnoNewtabReactIslands = Object.freeze({
    bookmarks: bookmarksApi,
    feedback: feedbackApi,
    shortcutDialog: shortcutDialogApi,
    recentSites: recentSitesApi,
    shortcuts: shortcutsApi,
    suggestions: suggestionsApi,
    toast: toastApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
