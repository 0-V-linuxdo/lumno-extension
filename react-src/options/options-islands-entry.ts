import {
  createToastApi,
  type LegacyToastApi
} from '../shared/toast';
import { createPopconfirmApi } from './popconfirm';

const runtime = globalThis as typeof globalThis & {
  LumnoOptionsReactBootstrap?: {
    allowReactUpgrade: boolean;
    reactReady: boolean;
  };
  LumnoOptionsReactIslands?: {
    popconfirm: ReturnType<typeof createPopconfirmApi>;
    toast: ReturnType<typeof createToastApi>;
  };
  LumnoOptionsPopconfirm?: ReturnType<typeof createPopconfirmApi>;
  LumnoOptionsPopconfirmReact?: ReturnType<typeof createPopconfirmApi>;
  LumnoOptionsToast?: LegacyToastApi;
  LumnoOptionsToastReact?: ReturnType<typeof createToastApi>;
};

const bootstrapState = runtime.LumnoOptionsReactBootstrap;

if (!bootstrapState || bootstrapState.allowReactUpgrade) {
  const popconfirmApi = createPopconfirmApi();
  const toastApi = createToastApi(runtime.LumnoOptionsToast || null);

  runtime.LumnoOptionsPopconfirmReact = popconfirmApi;
  runtime.LumnoOptionsPopconfirm = popconfirmApi;
  runtime.LumnoOptionsToastReact = toastApi;
  runtime.LumnoOptionsToast = toastApi;
  runtime.LumnoOptionsReactIslands = Object.freeze({
    popconfirm: popconfirmApi,
    toast: toastApi
  });

  if (bootstrapState) {
    bootstrapState.reactReady = true;
  }
}
