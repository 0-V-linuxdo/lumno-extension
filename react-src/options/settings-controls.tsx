import { useEffect, useState } from 'react';
import {
  createReactRootController,
  type ReactRootController
} from './root-controller';

export interface ToggleControlRenderModel {
  ariaLabel?: string;
  ariaLabelKey?: string;
  checked: boolean;
  disabled?: boolean;
  id: string;
}

export interface ToggleControlControllerOptions {
  kind: string;
  onChange(checked: boolean): void;
}

export type ToggleControlController =
  ReactRootController<ToggleControlRenderModel>;

export interface RequiredCheckboxItemModel {
  checked: boolean;
  id: string;
  label: string;
  labelKey: string;
  value: string;
}

export interface RequiredCheckboxGroupRenderModel {
  items: RequiredCheckboxItemModel[];
}

export interface RequiredCheckboxGroupControllerOptions {
  kind: string;
  onChange(values: string[]): void;
}

export type RequiredCheckboxGroupController =
  ReactRootController<RequiredCheckboxGroupRenderModel>;

function ToggleControl({
  model,
  onChange
}: {
  model: ToggleControlRenderModel;
  onChange(checked: boolean): void;
}) {
  const [checked, setChecked] = useState(model.checked);

  useEffect(() => {
    setChecked(model.checked);
  }, [model.checked]);

  const ariaProps = model.ariaLabelKey
    ? { 'data-i18n-aria-label': model.ariaLabelKey }
    : {};

  return (
    <>
      <input
        {...ariaProps}
        aria-label={model.ariaLabel}
        checked={checked}
        disabled={model.disabled}
        id={model.id}
        onChange={(event) => {
          const next = event.currentTarget.checked;
          setChecked(next);
          onChange(next);
        }}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="_x_extension_switch_slider_2024_unique_"
      />
    </>
  );
}

function RequiredCheckboxGroup({
  model,
  onChange
}: {
  model: RequiredCheckboxGroupRenderModel;
  onChange(values: string[]): void;
}) {
  const serializedValues = model.items
    .filter((item) => item.checked)
    .map((item) => item.value)
    .join('\u0000');
  const [selected, setSelected] = useState(
    () => new Set(serializedValues ? serializedValues.split('\u0000') : [])
  );

  useEffect(() => {
    setSelected(new Set(serializedValues ? serializedValues.split('\u0000') : []));
  }, [serializedValues]);

  return (
    <>
      {model.items.map((item) => (
        <label className="_x_extension_checkbox_2026_unique_" key={item.value}>
          <input
            checked={selected.has(item.value)}
            data-search-result-source-type={item.value}
            id={item.id}
            onChange={(event) => {
              const next = new Set(selected);
              if (event.currentTarget.checked) {
                next.add(item.value);
              } else {
                next.delete(item.value);
              }
              if (next.size === 0) {
                return;
              }
              setSelected(next);
              onChange(model.items
                .map((entry) => entry.value)
                .filter((value) => next.has(value)));
            }}
            type="checkbox"
          />
          <span data-i18n={item.labelKey}>{item.label}</span>
        </label>
      ))}
    </>
  );
}

export function createToggleControlController(
  host: HTMLElement | null,
  options: ToggleControlControllerOptions
): ToggleControlController {
  if (host) {
    host.dataset.reactIsland = 'options-toggle-control';
    host.dataset.toggleKind = options.kind;
  }
  return createReactRootController(
    host,
    (model: ToggleControlRenderModel) => (
      <ToggleControl model={model} onChange={options.onChange} />
    )
  );
}

export function createRequiredCheckboxGroupController(
  host: HTMLElement | null,
  options: RequiredCheckboxGroupControllerOptions
): RequiredCheckboxGroupController {
  if (host) {
    host.dataset.reactIsland = 'options-required-checkbox-group';
    host.dataset.checkboxGroupKind = options.kind;
  }
  return createReactRootController(
    host,
    (model: RequiredCheckboxGroupRenderModel) => (
      <RequiredCheckboxGroup model={model} onChange={options.onChange} />
    )
  );
}

export function createSettingsControlsApi() {
  return Object.freeze({
    implementation: 'react',
    createRequiredCheckboxGroupController,
    createToggleControlController
  });
}
