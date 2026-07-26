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
import { createPageStructureApi } from './page-structure';
import { createBookmarksTopbarApi } from './bookmarks-topbar';
import { createSearchInputApi } from '../shared/search-input';

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
    searchInput: ReturnType<typeof createSearchInputApi>;
    selectMenu: ReturnType<typeof createSelectMenuApi>;
    shortcuts: ReturnType<typeof createShortcutsViewApi>;
    suggestions: ReturnType<typeof createSuggestionsViewApi>;
    toast: ReturnType<typeof createToastApi>;
    wordmark: ReturnType<typeof createWordmarkApi>;
    pageStructure: ReturnType<typeof createPageStructureApi>;
    bookmarksTopbar: ReturnType<typeof createBookmarksTopbarApi>;
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
  LumnoNewtabPageStructure?: ReturnType<typeof createPageStructureApi>;
  LumnoNewtabPageStructureReact?: ReturnType<typeof createPageStructureApi>;
  LumnoNewtabBookmarksTopbar?: ReturnType<typeof createBookmarksTopbarApi>;
  LumnoNewtabBookmarksTopbarReact?: ReturnType<typeof createBookmarksTopbarApi>;
  LumnoSearchInputUI?: ReturnType<typeof createSearchInputApi>;
  LumnoSearchInputUIReact?: ReturnType<typeof createSearchInputApi>;
  _x_extension_createSearchInput_2024_unique_?: ReturnType<
    typeof createSearchInputApi
  >['createSearchInput'];
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
  const pageStructureApi = createPageStructureApi();
  const bookmarksTopbarApi = createBookmarksTopbarApi();
  const searchInputApi = createSearchInputApi();

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
  runtime.LumnoNewtabPageStructureReact = pageStructureApi;
  runtime.LumnoNewtabPageStructure = pageStructureApi;
  runtime.LumnoNewtabBookmarksTopbarReact = bookmarksTopbarApi;
  runtime.LumnoNewtabBookmarksTopbar = bookmarksTopbarApi;
  runtime.LumnoSearchInputUIReact = searchInputApi;
  runtime.LumnoSearchInputUI = searchInputApi;
  runtime._x_extension_createSearchInput_2024_unique_ =
    searchInputApi.createSearchInput;
  runtime.LumnoNewtabReactIslands = Object.freeze({
    bookmarks: bookmarksApi,
    dock: dockApi,
    feedback: feedbackApi,
    shortcutDialog: shortcutDialogApi,
    recentSites: recentSitesApi,
    searchInput: searchInputApi,
    selectMenu: selectMenuApi,
    shortcuts: shortcutsApi,
    suggestions: suggestionsApi,
    toast: toastApi,
    wordmark: wordmarkApi,
    pageStructure: pageStructureApi,
    bookmarksTopbar: bookmarksTopbarApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
