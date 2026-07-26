import { useEffect, useMemo, useState } from 'react';
import {
  createReactRootController,
  type ReactRootController
} from './root-controller';

export interface SelectControlItemModel {
  label: string;
  labelKey: string;
  value: string;
}

export interface SelectControlRenderModel {
  id: string;
  items: SelectControlItemModel[];
  value: string;
}

export interface SelectControlControllerOptions {
  kind: string;
  onSelect(value: string): void;
}

export type SelectControlController =
  ReactRootController<SelectControlRenderModel>;

function SelectControl({
  host,
  model,
  onSelect
}: {
  host: HTMLElement | null;
  model: SelectControlRenderModel;
  onSelect(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(model.value);
  const selectedItem = useMemo(
    () => model.items.find((item) => item.value === value) || model.items[0] || null,
    [model.items, value]
  );

  useEffect(() => {
    setValue(model.value);
  }, [model.value]);

  useEffect(() => {
    if (host) {
      host.dataset.open = open ? 'true' : 'false';
    }
    if (!open) {
      return undefined;
    }
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!host?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [host, open]);

  const selectValue = selectedItem?.value || '';

  return (
    <>
      <select
        aria-hidden="true"
        className="_x_extension_select_2024_unique_"
        id={model.id}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setValue(next);
          onSelect(next);
        }}
        tabIndex={-1}
        value={selectValue}
      >
        {model.items.map((item) => (
          <option data-i18n={item.labelKey} key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="_x_extension_select_trigger_2024_unique_"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="_x_extension_select_label_2024_unique_">
          {selectedItem?.label || ''}
        </span>
        <i
          aria-hidden="true"
          className="_x_extension_select_icon_2024_unique_ ri-icon ri-size-16 ri-arrow-down-s-line"
        />
      </button>
      <div
        className="_x_extension_select_menu_2024_unique_ _x_extension_menu_surface_2024_unique_"
        data-open={open ? 'true' : 'false'}
        role="listbox"
      >
        {model.items.map((item) => {
          const selected = item.value === selectValue;
          return (
            <div
              aria-selected={selected}
              className="_x_extension_select_option_2024_unique_"
              data-selected={selected ? 'true' : 'false'}
              data-value={item.value}
              key={item.value}
              onClick={() => {
                setValue(item.value);
                setOpen(false);
                if (!selected) {
                  onSelect(item.value);
                }
              }}
              role="option"
            >
              <span
                className="_x_extension_select_option_label_2026_unique_"
                data-i18n={item.labelKey}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function createSelectControlController(
  host: HTMLElement | null,
  options: SelectControlControllerOptions
): SelectControlController {
  if (host) {
    host.dataset.reactIsland = 'options-select-control';
    host.dataset.selectKind = options.kind;
  }
  return createReactRootController(
    host,
    (model: SelectControlRenderModel) => (
      <SelectControl host={host} model={model} onSelect={options.onSelect} />
    )
  );
}

export function createSelectControlApi() {
  return Object.freeze({
    implementation: 'react',
    createSelectControlController
  });
}
