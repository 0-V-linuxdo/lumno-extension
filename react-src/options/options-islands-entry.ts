import {
  createToastApi,
  type LegacyToastApi
} from '../shared/toast';
import { createBlacklistListApi } from './blacklist-list';
import { createPopconfirmApi } from './popconfirm';
import { createSegmentedControlApi } from './segmented-control';
import { createSettingsNavigationApi } from './settings-navigation';
import { createSettingsControlsApi } from './settings-controls';
import { createShortcutReferenceApi } from './shortcut-reference';
import { createSiteSearchListApi } from './site-search-list';
import { createThemePickerApi } from './theme-picker';

const runtime = globalThis as typeof globalThis & {
  LumnoOptionsReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOptionsReactIslands?: {
    blacklistList: ReturnType<typeof createBlacklistListApi>;
    popconfirm: ReturnType<typeof createPopconfirmApi>;
    segmentedControl: ReturnType<typeof createSegmentedControlApi>;
    settingsNavigation: ReturnType<typeof createSettingsNavigationApi>;
    settingsControls: ReturnType<typeof createSettingsControlsApi>;
    shortcutReference: ReturnType<typeof createShortcutReferenceApi>;
    siteSearchList: ReturnType<typeof createSiteSearchListApi>;
    themePicker: ReturnType<typeof createThemePickerApi>;
    toast: ReturnType<typeof createToastApi>;
  };
  LumnoOptionsBlacklistList?: ReturnType<typeof createBlacklistListApi>;
  LumnoOptionsBlacklistListReact?: ReturnType<typeof createBlacklistListApi>;
  LumnoOptionsPopconfirm?: ReturnType<typeof createPopconfirmApi>;
  LumnoOptionsPopconfirmReact?: ReturnType<typeof createPopconfirmApi>;
  LumnoOptionsSegmentedControl?: ReturnType<typeof createSegmentedControlApi>;
  LumnoOptionsSegmentedControlReact?: ReturnType<typeof createSegmentedControlApi>;
  LumnoOptionsSettingsNavigation?: ReturnType<typeof createSettingsNavigationApi>;
  LumnoOptionsSettingsNavigationReact?: ReturnType<typeof createSettingsNavigationApi>;
  LumnoOptionsSettingsControls?: ReturnType<typeof createSettingsControlsApi>;
  LumnoOptionsSettingsControlsReact?: ReturnType<typeof createSettingsControlsApi>;
  LumnoOptionsShortcutReference?: ReturnType<typeof createShortcutReferenceApi>;
  LumnoOptionsShortcutReferenceReact?: ReturnType<typeof createShortcutReferenceApi>;
  LumnoOptionsSiteSearchList?: ReturnType<typeof createSiteSearchListApi>;
  LumnoOptionsSiteSearchListReact?: ReturnType<typeof createSiteSearchListApi>;
  LumnoOptionsThemePicker?: ReturnType<typeof createThemePickerApi>;
  LumnoOptionsThemePickerReact?: ReturnType<typeof createThemePickerApi>;
  LumnoOptionsToast?: LegacyToastApi;
  LumnoOptionsToastReact?: ReturnType<typeof createToastApi>;
};

const bootstrapState = runtime.LumnoOptionsReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const blacklistListApi = createBlacklistListApi();
  const popconfirmApi = createPopconfirmApi();
  const segmentedControlApi = createSegmentedControlApi();
  const settingsNavigationApi = createSettingsNavigationApi();
  const settingsControlsApi = createSettingsControlsApi();
  const shortcutReferenceApi = createShortcutReferenceApi();
  const siteSearchListApi = createSiteSearchListApi();
  const themePickerApi = createThemePickerApi();
  const toastApi = createToastApi(runtime.LumnoOptionsToast || null);

  runtime.LumnoOptionsBlacklistListReact = blacklistListApi;
  runtime.LumnoOptionsBlacklistList = blacklistListApi;
  runtime.LumnoOptionsPopconfirmReact = popconfirmApi;
  runtime.LumnoOptionsPopconfirm = popconfirmApi;
  runtime.LumnoOptionsSegmentedControlReact = segmentedControlApi;
  runtime.LumnoOptionsSegmentedControl = segmentedControlApi;
  runtime.LumnoOptionsSettingsNavigationReact = settingsNavigationApi;
  runtime.LumnoOptionsSettingsNavigation = settingsNavigationApi;
  runtime.LumnoOptionsSettingsControlsReact = settingsControlsApi;
  runtime.LumnoOptionsSettingsControls = settingsControlsApi;
  runtime.LumnoOptionsShortcutReferenceReact = shortcutReferenceApi;
  runtime.LumnoOptionsShortcutReference = shortcutReferenceApi;
  runtime.LumnoOptionsSiteSearchListReact = siteSearchListApi;
  runtime.LumnoOptionsSiteSearchList = siteSearchListApi;
  runtime.LumnoOptionsThemePickerReact = themePickerApi;
  runtime.LumnoOptionsThemePicker = themePickerApi;
  runtime.LumnoOptionsToastReact = toastApi;
  runtime.LumnoOptionsToast = toastApi;
  runtime.LumnoOptionsReactIslands = Object.freeze({
    blacklistList: blacklistListApi,
    popconfirm: popconfirmApi,
    segmentedControl: segmentedControlApi,
    settingsNavigation: settingsNavigationApi,
    settingsControls: settingsControlsApi,
    shortcutReference: shortcutReferenceApi,
    siteSearchList: siteSearchListApi,
    themePicker: themePickerApi,
    toast: toastApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
