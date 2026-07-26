import { useEffect, useRef, useState } from 'react';

export interface InlinePopconfirmCopy {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  messageKey: string;
}

export function InlinePopconfirm({
  copy,
  onConfirm,
  triggerAriaLabel,
  triggerClassName,
  triggerIconClass
}: {
  copy: InlinePopconfirmCopy;
  onConfirm(): void | Promise<void>;
  triggerAriaLabel: string;
  triggerClassName: string;
  triggerIconClass: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, [open]);

  return (
    <div
      className="_x_extension_popconfirm_wrap_2024_unique_"
      data-react-surface="options-inline-popconfirm"
      ref={wrapRef}
    >
      <button
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        type="button"
      >
        <i aria-hidden="true" className={triggerIconClass} />
      </button>
      <div
        className="_x_extension_popconfirm_2024_unique_"
        data-open={open ? 'true' : 'false'}
      >
        <div
          className="_x_extension_popconfirm_text_2024_unique_"
          data-i18n={copy.messageKey}
        >
          {copy.message}
        </div>
        <div className="_x_extension_popconfirm_actions_2024_unique_">
          <button
            className="_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_secondary_2024_unique_"
            data-i18n="confirm_cancel"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
            }}
            type="button"
          >
            {copy.cancelLabel}
          </button>
          <button
            className="_x_extension_shortcut_submit_2024_unique_ _x_extension_shortcut_submit_primary_2024_unique_ _x_extension_shortcut_save_2024_unique_"
            data-i18n="confirm_ok"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              void onConfirm();
            }}
            type="button"
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
