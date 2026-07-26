import { createSearchInputApi } from '../shared/search-input';
import { createSuggestionsViewApi } from '../newtab/suggestions';
import { createTabSwitcherViewApi } from './tab-switcher';
import {
  createOverlayShellApi,
  type LegacyOverlayShellApi
} from './shell';

const runtime = globalThis as typeof globalThis & {
  LumnoOverlayReactBootstrap?: {
    reactReady: boolean;
  };
  LumnoOverlayReactIslands?: {
    searchInput: ReturnType<typeof createSearchInputApi>;
    shell: ReturnType<typeof createOverlayShellApi>;
    suggestions: ReturnType<typeof createSuggestionsViewApi>;
    tabSwitcher: ReturnType<typeof createTabSwitcherViewApi>;
  };
  LumnoOverlayShell?: LegacyOverlayShellApi | ReturnType<typeof createOverlayShellApi>;
  LumnoOverlayShellReact?: ReturnType<typeof createOverlayShellApi>;
  LumnoSearchInputUI?: ReturnType<typeof createSearchInputApi>;
  LumnoSearchInputUIReact?: ReturnType<typeof createSearchInputApi>;
  LumnoOverlaySuggestionsView?: ReturnType<
    typeof createSuggestionsViewApi
  >;
  LumnoOverlaySuggestionsViewReact?: ReturnType<
    typeof createSuggestionsViewApi
  >;
  LumnoOverlayTabSwitcherView?: ReturnType<
    typeof createTabSwitcherViewApi
  >;
  LumnoOverlayTabSwitcherViewReact?: ReturnType<
    typeof createTabSwitcherViewApi
  >;
  _x_extension_createSearchInput_2024_unique_?: ReturnType<
    typeof createSearchInputApi
  >['createSearchInput'];
};

const existingIslands = runtime.LumnoOverlayReactIslands;
const searchInputApi =
  existingIslands?.searchInput || createSearchInputApi();
const shellApi =
  existingIslands?.shell ||
  createOverlayShellApi(
    (runtime.LumnoOverlayShell as LegacyOverlayShellApi) || null
  );
const suggestionsApi =
  existingIslands?.suggestions || createSuggestionsViewApi();
const tabSwitcherApi =
  existingIslands?.tabSwitcher || createTabSwitcherViewApi();
runtime.LumnoSearchInputUIReact = searchInputApi;
runtime.LumnoSearchInputUI = searchInputApi;
runtime._x_extension_createSearchInput_2024_unique_ =
  searchInputApi.createSearchInput;
runtime.LumnoOverlayShellReact = shellApi;
runtime.LumnoOverlayShell = shellApi;
runtime.LumnoOverlaySuggestionsViewReact = suggestionsApi;
runtime.LumnoOverlaySuggestionsView = suggestionsApi;
runtime.LumnoOverlayTabSwitcherViewReact = tabSwitcherApi;
runtime.LumnoOverlayTabSwitcherView = tabSwitcherApi;
runtime.LumnoOverlayReactIslands = Object.freeze({
  searchInput: searchInputApi,
  shell: shellApi,
  suggestions: suggestionsApi,
  tabSwitcher: tabSwitcherApi
});
runtime.LumnoOverlayReactBootstrap = Object.freeze({
  reactReady: true
});
