import {
  createBookmarksViewApi,
  type LegacyBookmarksApi
} from './bookmarks';
import { createDockApi } from './dock';
import { createFeedbackControlApi } from './feedback';
import { createRecentSitesViewApi, type LegacyRecentSitesApi } from './recent-sites';
import { createSelectMenuApi } from './select-menu';
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
import { createWordmarkApi } from './wordmark';

const runtime = globalThis as typeof globalThis & {
  LumnoNewtabReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoNewtabReactIslands?: {
    bookmarks: ReturnType<typeof createBookmarksViewApi>;
    dock: ReturnType<typeof createDockApi>;
    feedback: ReturnType<typeof createFeedbackControlApi>;
    shortcutDialog: ReturnType<typeof createShortcutDialogApi>;
    recentSites: ReturnType<typeof createRecentSitesViewApi>;
    selectMenu: ReturnType<typeof createSelectMenuApi>;
    shortcuts: ReturnType<typeof createShortcutsViewApi>;
    suggestions: ReturnType<typeof createSuggestionsViewApi>;
    toast: ReturnType<typeof createToastApi>;
    wordmark: ReturnType<typeof createWordmarkApi>;
  };
  LumnoNewtabBookmarksView?: LegacyBookmarksApi;
  LumnoNewtabBookmarksViewReact?: ReturnType<typeof createBookmarksViewApi>;
  LumnoNewtabFeedbackControl?: ReturnType<typeof createFeedbackControlApi>;
  LumnoNewtabFeedbackControlReact?: ReturnType<typeof createFeedbackControlApi>;
  LumnoNewtabDock?: ReturnType<typeof createDockApi>;
  LumnoNewtabDockReact?: ReturnType<typeof createDockApi>;
  LumnoNewtabShortcutDialog?: ReturnType<typeof createShortcutDialogApi>;
  LumnoNewtabShortcutDialogReact?: ReturnType<typeof createShortcutDialogApi>;
  LumnoNewtabShortcutsView?: LegacyShortcutsApi;
  LumnoNewtabShortcutsViewReact?: ReturnType<typeof createShortcutsViewApi>;
  LumnoNewtabRecentSitesView?: LegacyRecentSitesApi;
  LumnoNewtabRecentSitesViewReact?: ReturnType<typeof createRecentSitesViewApi>;
  LumnoNewtabSelectMenu?: ReturnType<typeof createSelectMenuApi>;
  LumnoNewtabSelectMenuReact?: ReturnType<typeof createSelectMenuApi>;
  LumnoNewtabSuggestionsView?: LegacySuggestionsApi;
  LumnoNewtabSuggestionsViewReact?: ReturnType<typeof createSuggestionsViewApi>;
  LumnoNewtabToast?: LegacyToastApi;
  LumnoNewtabToastReact?: ReturnType<typeof createToastApi>;
  LumnoNewtabWordmark?: ReturnType<typeof createWordmarkApi>;
  LumnoNewtabWordmarkReact?: ReturnType<typeof createWordmarkApi>;
};

const bootstrapState = runtime.LumnoNewtabReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const legacyBookmarksApi = runtime.LumnoNewtabBookmarksView || null;
  const legacyRecentSitesApi = runtime.LumnoNewtabRecentSitesView || null;
  const legacyShortcutsApi = runtime.LumnoNewtabShortcutsView || null;
  const legacySuggestionsApi = runtime.LumnoNewtabSuggestionsView || null;
  const legacyToastApi = runtime.LumnoNewtabToast || null;
  const bookmarksApi = createBookmarksViewApi(legacyBookmarksApi);
  const dockApi = createDockApi();
  const feedbackApi = createFeedbackControlApi();
  const shortcutDialogApi = createShortcutDialogApi();
  const recentSitesApi = createRecentSitesViewApi(legacyRecentSitesApi);
  const selectMenuApi = createSelectMenuApi();
  const shortcutsApi = createShortcutsViewApi(legacyShortcutsApi);
  const suggestionsApi = createSuggestionsViewApi(legacySuggestionsApi);
  const toastApi = createToastApi(legacyToastApi);
  const wordmarkApi = createWordmarkApi();

  runtime.LumnoNewtabBookmarksViewReact = bookmarksApi;
  runtime.LumnoNewtabBookmarksView = bookmarksApi;
  runtime.LumnoNewtabDockReact = dockApi;
  runtime.LumnoNewtabDock = dockApi;
  runtime.LumnoNewtabFeedbackControlReact = feedbackApi;
  runtime.LumnoNewtabFeedbackControl = feedbackApi;
  runtime.LumnoNewtabShortcutDialogReact = shortcutDialogApi;
  runtime.LumnoNewtabShortcutDialog = shortcutDialogApi;
  runtime.LumnoNewtabRecentSitesViewReact = recentSitesApi;
  runtime.LumnoNewtabRecentSitesView = recentSitesApi;
  runtime.LumnoNewtabSelectMenuReact = selectMenuApi;
  runtime.LumnoNewtabSelectMenu = selectMenuApi;
  runtime.LumnoNewtabShortcutsViewReact = shortcutsApi;
  runtime.LumnoNewtabShortcutsView = shortcutsApi;
  runtime.LumnoNewtabSuggestionsViewReact = suggestionsApi;
  runtime.LumnoNewtabSuggestionsView = suggestionsApi;
  runtime.LumnoNewtabToastReact = toastApi;
  runtime.LumnoNewtabToast = toastApi;
  runtime.LumnoNewtabWordmarkReact = wordmarkApi;
  runtime.LumnoNewtabWordmark = wordmarkApi;
  runtime.LumnoNewtabReactIslands = Object.freeze({
    bookmarks: bookmarksApi,
    dock: dockApi,
    feedback: feedbackApi,
    shortcutDialog: shortcutDialogApi,
    recentSites: recentSitesApi,
    selectMenu: selectMenuApi,
    shortcuts: shortcutsApi,
    suggestions: suggestionsApi,
    toast: toastApi,
    wordmark: wordmarkApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
