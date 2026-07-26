import { createSearchInputApi } from '../shared/search-input';
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
  };
  LumnoOverlayShell?: LegacyOverlayShellApi | ReturnType<typeof createOverlayShellApi>;
  LumnoOverlayShellReact?: ReturnType<typeof createOverlayShellApi>;
  LumnoSearchInputUI?: ReturnType<typeof createSearchInputApi>;
  LumnoSearchInputUIReact?: ReturnType<typeof createSearchInputApi>;
  _x_extension_createSearchInput_2024_unique_?: ReturnType<
    typeof createSearchInputApi
  >['createSearchInput'];
};

const searchInputApi = createSearchInputApi();
const shellApi = createOverlayShellApi(
  (runtime.LumnoOverlayShell as LegacyOverlayShellApi) || null
);
runtime.LumnoSearchInputUIReact = searchInputApi;
runtime.LumnoSearchInputUI = searchInputApi;
runtime._x_extension_createSearchInput_2024_unique_ =
  searchInputApi.createSearchInput;
runtime.LumnoOverlayShellReact = shellApi;
runtime.LumnoOverlayShell = shellApi;
runtime.LumnoOverlayReactIslands = Object.freeze({
  searchInput: searchInputApi,
  shell: shellApi
});
runtime.LumnoOverlayReactBootstrap = Object.freeze({
  reactReady: true
});
