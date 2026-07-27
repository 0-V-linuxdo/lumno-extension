import { useEffect, useId, useRef, useState } from 'react';
import { useExclusiveAsyncAction } from '../shared/use-exclusive-async-action';
import {
  PopconfirmContent,
  type PopconfirmCopy
} from './popconfirm-content';

export interface InlinePopconfirmCopy extends PopconfirmCopy {}

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popconfirmId = useId();
  const confirmAction = useExclusiveAsyncAction(onConfirm);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [open]);

  return (
    <div
      className="_x_extension_popconfirm_wrap_2024_unique_"
      data-react-surface="options-inline-popconfirm"
      ref={wrapRef}
    >
      <button
        aria-controls={popconfirmId}
        aria-expanded={open}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        disabled={confirmAction.pending}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        ref={triggerRef}
        type="button"
      >
        <i aria-hidden="true" className={triggerIconClass} />
      </button>
      <div
        className="_x_extension_popconfirm_2024_unique_"
        data-open={open ? 'true' : 'false'}
        id={popconfirmId}
      >
        <PopconfirmContent
          busy={confirmAction.pending}
          copy={copy}
          onCancel={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
          onConfirm={() => {
            void confirmAction.run().then((outcome) => {
              if (outcome.status !== 'skipped') {
                setOpen(false);
              }
            });
          }}
        />
      </div>
    </div>
  );
}
