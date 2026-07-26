import { afterEach, describe, expect, it, vi } from 'vitest';

type OptionsRuntime = typeof globalThis & {
  LumnoOptionsReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOptionsReactIslands?: unknown;
  LumnoOptionsBlacklistList?: {
    implementation?: string;
  };
  LumnoOptionsBlacklistListReact?: {
    implementation?: string;
  };
  LumnoOptionsPopconfirm?: {
    implementation?: string;
  };
  LumnoOptionsPopconfirmReact?: {
    implementation?: string;
  };
  LumnoOptionsSegmentedControl?: {
    implementation?: string;
  };
  LumnoOptionsSegmentedControlReact?: {
    implementation?: string;
  };
  LumnoOptionsSelectControl?: {
    implementation?: string;
  };
  LumnoOptionsSelectControlReact?: {
    implementation?: string;
  };
  LumnoOptionsSettingsNavigation?: {
    implementation?: string;
  };
  LumnoOptionsSettingsNavigationReact?: {
    implementation?: string;
  };
  LumnoOptionsSettingsControls?: {
    implementation?: string;
  };
  LumnoOptionsSettingsControlsReact?: {
    implementation?: string;
  };
  LumnoOptionsShortcutReference?: {
    implementation?: string;
  };
  LumnoOptionsShortcutReferenceReact?: {
    implementation?: string;
  };
  LumnoOptionsSiteSearchList?: {
    implementation?: string;
  };
  LumnoOptionsSiteSearchListReact?: {
    implementation?: string;
  };
  LumnoOptionsThemePicker?: {
    implementation?: string;
  };
  LumnoOptionsThemePickerReact?: {
    implementation?: string;
  };
  LumnoOptionsToast?: {
    implementation?: string;
  };
  LumnoOptionsToastReact?: {
    implementation?: string;
  };
};

const runtime = globalThis as OptionsRuntime;

function clearRuntime(): void {
  delete runtime.LumnoOptionsReactBootstrap;
  delete runtime.LumnoOptionsReactIslands;
  delete runtime.LumnoOptionsBlacklistList;
  delete runtime.LumnoOptionsBlacklistListReact;
  delete runtime.LumnoOptionsPopconfirm;
  delete runtime.LumnoOptionsPopconfirmReact;
  delete runtime.LumnoOptionsSegmentedControl;
  delete runtime.LumnoOptionsSegmentedControlReact;
  delete runtime.LumnoOptionsSelectControl;
  delete runtime.LumnoOptionsSelectControlReact;
  delete runtime.LumnoOptionsSettingsNavigation;
  delete runtime.LumnoOptionsSettingsNavigationReact;
  delete runtime.LumnoOptionsSettingsControls;
  delete runtime.LumnoOptionsSettingsControlsReact;
  delete runtime.LumnoOptionsShortcutReference;
  delete runtime.LumnoOptionsShortcutReferenceReact;
  delete runtime.LumnoOptionsSiteSearchList;
  delete runtime.LumnoOptionsSiteSearchListReact;
  delete runtime.LumnoOptionsThemePicker;
  delete runtime.LumnoOptionsThemePickerReact;
  delete runtime.LumnoOptionsToast;
  delete runtime.LumnoOptionsToastReact;
}

afterEach(() => {
  clearRuntime();
  vi.resetModules();
});

describe('Options React islands entry', () => {
  it('installs the Popconfirm and Toast APIs and marks the bootstrap ready', async () => {
    runtime.LumnoOptionsReactBootstrap = {
      allowReactUpgrade: true,
      reactReady: false
    };

    await import('./options-islands-entry');

    expect(runtime.LumnoOptionsReactBootstrap.reactReady).toBe(true);
    expect(runtime.LumnoOptionsBlacklistList?.implementation).toBe('react');
    expect(runtime.LumnoOptionsBlacklistListReact).toBe(
      runtime.LumnoOptionsBlacklistList
    );
    expect(runtime.LumnoOptionsPopconfirm?.implementation).toBe('react');
    expect(runtime.LumnoOptionsPopconfirmReact).toBe(
      runtime.LumnoOptionsPopconfirm
    );
    expect(runtime.LumnoOptionsSegmentedControl?.implementation).toBe('react');
    expect(runtime.LumnoOptionsSegmentedControlReact).toBe(
      runtime.LumnoOptionsSegmentedControl
    );
    expect(runtime.LumnoOptionsSelectControl?.implementation).toBe('react');
    expect(runtime.LumnoOptionsSelectControlReact).toBe(
      runtime.LumnoOptionsSelectControl
    );
    expect(runtime.LumnoOptionsSettingsNavigation?.implementation).toBe('react');
    expect(runtime.LumnoOptionsSettingsNavigationReact).toBe(
      runtime.LumnoOptionsSettingsNavigation
    );
    expect(runtime.LumnoOptionsSettingsControls?.implementation).toBe('react');
    expect(runtime.LumnoOptionsSettingsControlsReact).toBe(
      runtime.LumnoOptionsSettingsControls
    );
    expect(runtime.LumnoOptionsShortcutReference?.implementation).toBe('react');
    expect(runtime.LumnoOptionsShortcutReferenceReact).toBe(
      runtime.LumnoOptionsShortcutReference
    );
    expect(runtime.LumnoOptionsSiteSearchList?.implementation).toBe('react');
    expect(runtime.LumnoOptionsSiteSearchListReact).toBe(
      runtime.LumnoOptionsSiteSearchList
    );
    expect(runtime.LumnoOptionsThemePicker?.implementation).toBe('react');
    expect(runtime.LumnoOptionsThemePickerReact).toBe(
      runtime.LumnoOptionsThemePicker
    );
    expect(runtime.LumnoOptionsToast?.implementation).toBe('react');
    expect(runtime.LumnoOptionsToastReact).toBe(runtime.LumnoOptionsToast);
    expect(runtime.LumnoOptionsReactIslands).toEqual({
      blacklistList: runtime.LumnoOptionsBlacklistList,
      popconfirm: runtime.LumnoOptionsPopconfirm,
      segmentedControl: runtime.LumnoOptionsSegmentedControl,
      selectControl: runtime.LumnoOptionsSelectControl,
      settingsNavigation: runtime.LumnoOptionsSettingsNavigation,
      settingsControls: runtime.LumnoOptionsSettingsControls,
      shortcutReference: runtime.LumnoOptionsShortcutReference,
      siteSearchList: runtime.LumnoOptionsSiteSearchList,
      themePicker: runtime.LumnoOptionsThemePicker,
      toast: runtime.LumnoOptionsToast
    });
  });

  it('does not upgrade APIs after the shared bootstrap has fallen back', async () => {
    runtime.LumnoOptionsReactBootstrap = {
      allowReactUpgrade: false,
      reactReady: false
    };

    await import('./options-islands-entry');

    expect(runtime.LumnoOptionsReactBootstrap.reactReady).toBe(false);
    expect(runtime.LumnoOptionsBlacklistList).toBeUndefined();
    expect(runtime.LumnoOptionsPopconfirm).toBeUndefined();
    expect(runtime.LumnoOptionsSegmentedControl).toBeUndefined();
    expect(runtime.LumnoOptionsSelectControl).toBeUndefined();
    expect(runtime.LumnoOptionsSettingsNavigation).toBeUndefined();
    expect(runtime.LumnoOptionsSettingsControls).toBeUndefined();
    expect(runtime.LumnoOptionsShortcutReference).toBeUndefined();
    expect(runtime.LumnoOptionsSiteSearchList).toBeUndefined();
    expect(runtime.LumnoOptionsThemePicker).toBeUndefined();
    expect(runtime.LumnoOptionsToast).toBeUndefined();
    expect(runtime.LumnoOptionsReactIslands).toBeUndefined();
  });
});
