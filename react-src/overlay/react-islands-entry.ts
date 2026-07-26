import { createSearchInputApi } from '../shared/search-input';
import { createSuggestionsViewApi } from '../newtab/suggestions';
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
  _x_extension_createSearchInput_2024_unique_?: ReturnType<
    typeof createSearchInputApi
  >['createSearchInput'];
};

const searchInputApi = createSearchInputApi();
const shellApi = createOverlayShellApi(
  (runtime.LumnoOverlayShell as LegacyOverlayShellApi) || null
);
const suggestionsApi = createSuggestionsViewApi();
runtime.LumnoSearchInputUIReact = searchInputApi;
runtime.LumnoSearchInputUI = searchInputApi;
runtime._x_extension_createSearchInput_2024_unique_ =
  searchInputApi.createSearchInput;
runtime.LumnoOverlayShellReact = shellApi;
runtime.LumnoOverlayShell = shellApi;
runtime.LumnoOverlaySuggestionsViewReact = suggestionsApi;
runtime.LumnoOverlaySuggestionsView = suggestionsApi;
runtime.LumnoOverlayReactIslands = Object.freeze({
  searchInput: searchInputApi,
  shell: shellApi,
  suggestions: suggestionsApi
});
runtime.LumnoOverlayReactBootstrap = Object.freeze({
  reactReady: true
});
