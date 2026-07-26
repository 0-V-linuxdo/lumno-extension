import {
  createToastApi,
  type LegacyToastApi
} from '../shared/toast';
import { createPopconfirmApi } from './popconfirm';
import { createSegmentedControlApi } from './segmented-control';
import { createShortcutReferenceApi } from './shortcut-reference';
import { createThemePickerApi } from './theme-picker';

const runtime = globalThis as typeof globalThis & {
  LumnoOptionsReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOptionsReactIslands?: {
    popconfirm: ReturnType<typeof createPopconfirmApi>;
    segmentedControl: ReturnType<typeof createSegmentedControlApi>;
    shortcutReference: ReturnType<typeof createShortcutReferenceApi>;
    themePicker: ReturnType<typeof createThemePickerApi>;
    toast: ReturnType<typeof createToastApi>;
  };
  LumnoOptionsPopconfirm?: ReturnType<typeof createPopconfirmApi>;
  LumnoOptionsPopconfirmReact?: ReturnType<typeof createPopconfirmApi>;
  LumnoOptionsSegmentedControl?: ReturnType<typeof createSegmentedControlApi>;
  LumnoOptionsSegmentedControlReact?: ReturnType<typeof createSegmentedControlApi>;
  LumnoOptionsShortcutReference?: ReturnType<typeof createShortcutReferenceApi>;
  LumnoOptionsShortcutReferenceReact?: ReturnType<typeof createShortcutReferenceApi>;
  LumnoOptionsThemePicker?: ReturnType<typeof createThemePickerApi>;
  LumnoOptionsThemePickerReact?: ReturnType<typeof createThemePickerApi>;
  LumnoOptionsToast?: LegacyToastApi;
  LumnoOptionsToastReact?: ReturnType<typeof createToastApi>;
};

const bootstrapState = runtime.LumnoOptionsReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const popconfirmApi = createPopconfirmApi();
  const segmentedControlApi = createSegmentedControlApi();
  const shortcutReferenceApi = createShortcutReferenceApi();
  const themePickerApi = createThemePickerApi();
  const toastApi = createToastApi(runtime.LumnoOptionsToast || null);

  runtime.LumnoOptionsPopconfirmReact = popconfirmApi;
  runtime.LumnoOptionsPopconfirm = popconfirmApi;
  runtime.LumnoOptionsSegmentedControlReact = segmentedControlApi;
  runtime.LumnoOptionsSegmentedControl = segmentedControlApi;
  runtime.LumnoOptionsShortcutReferenceReact = shortcutReferenceApi;
  runtime.LumnoOptionsShortcutReference = shortcutReferenceApi;
  runtime.LumnoOptionsThemePickerReact = themePickerApi;
  runtime.LumnoOptionsThemePicker = themePickerApi;
  runtime.LumnoOptionsToastReact = toastApi;
  runtime.LumnoOptionsToast = toastApi;
  runtime.LumnoOptionsReactIslands = Object.freeze({
    popconfirm: popconfirmApi,
    segmentedControl: segmentedControlApi,
    shortcutReference: shortcutReferenceApi,
    themePicker: themePickerApi,
    toast: toastApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
