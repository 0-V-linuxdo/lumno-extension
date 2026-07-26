import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

const TOOLTIP_CLASS = '_x_extension_tooltip_2026_unique_';
const LINE_CLASS = '_x_extension_tooltip_line_2026_unique_';
const DIVIDER_CLASS =
  '_x_extension_tooltip_divider_2026_unique_';
const TAG_KEY_CLASS =
  '_x_extension_cursor_tooltip_tag_key_2026_unique_';
const TAG_LABEL_CLASS =
  '_x_extension_cursor_tooltip_tag_label_2026_unique_';
const WINDOWS_LOGO_CLASS =
  '_x_extension_cursor_tooltip_windows_logo_2026_unique_';
const WINDOWS_LOGO_PANE_CLASS =
  '_x_extension_cursor_tooltip_windows_logo_pane_2026_unique_';
const DIVIDER_MARKER = '────────';

interface TooltipElementOptions {
  className?: string;
  documentObj?: Document;
  id?: string;
  kind?: string;
  positionMode?: string;
}

interface CursorTagModel {
  keyText: string;
  label: string;
  windowsLogo?: boolean;
}

interface TooltipRootState {
  destroyed: boolean;
  root: Root;
}

const roots = new WeakMap<HTMLElement, TooltipRootState>();

function TooltipLines({ text }: { text: string }) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trimEnd());
  return (
    <>
      {lines.map((line, index) =>
        line === DIVIDER_MARKER ? (
          <span
            className={DIVIDER_CLASS}
            key={`divider:${index}`}
          />
        ) : (
          <span className={LINE_CLASS} key={`line:${index}`}>
            {line}
          </span>
        )
      )}
    </>
  );
}

function WindowsLogo() {
  return (
    <span aria-hidden="true" className={WINDOWS_LOGO_CLASS}>
      {[1, 2, 3, 4].map((index) => (
        <span
          className={WINDOWS_LOGO_PANE_CLASS}
          data-cursor-tooltip-windows-logo-pane={String(index)}
          key={index}
        />
      ))}
    </span>
  );
}

function CursorTag({ model }: { model: CursorTagModel }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={TAG_KEY_CLASS}
        data-cursor-tooltip-tag-key={model.keyText}
      >
        {model.windowsLogo ? <WindowsLogo /> : model.keyText}
      </span>
      <span className={TAG_LABEL_CLASS}>{model.label}</span>
    </>
  );
}

function renderInto(
  element: HTMLElement,
  content: ReactNode
): boolean {
  const state = roots.get(element);
  if (!state || state.destroyed) {
    return false;
  }
  flushSync(() => state.root.render(content));
  return true;
}

export function renderTooltipContent(
  element: HTMLElement,
  content: ReactNode
): HTMLElement {
  renderInto(element, content);
  return element;
}

export function createTooltipElement(
  options: TooltipElementOptions = {}
): HTMLDivElement | null {
  const documentObj = options.documentObj || document;
  if (!documentObj) {
    return null;
  }
  const element = documentObj.createElement('div');
  if (options.id) {
    element.id = options.id;
  }
  element.className = [TOOLTIP_CLASS, options.className || '']
    .filter(Boolean)
    .join(' ');
  element.dataset.reactIsland = 'tooltip';
  element.setAttribute('data-visible', 'false');
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute(
    'data-tooltip-position',
    options.positionMode === 'absolute' ? 'absolute' : 'fixed'
  );
  if (options.kind) {
    element.setAttribute('data-tooltip-kind', options.kind);
  }
  const root = createRoot(element);
  roots.set(element, { destroyed: false, root });
  renderInto(element, null);
  return element;
}

export function renderTooltipText(
  element: HTMLElement,
  text: string
): HTMLElement {
  return renderTooltipContent(element, <TooltipLines text={text} />);
}

export function renderCursorTag(
  element: HTMLElement,
  model: CursorTagModel
): HTMLElement {
  return renderTooltipContent(element, <CursorTag model={model} />);
}

export function destroyTooltipElement(
  element: HTMLElement | null
): void {
  if (!element) {
    return;
  }
  const state = roots.get(element);
  if (!state || state.destroyed) {
    return;
  }
  state.destroyed = true;
  flushSync(() => state.root.unmount());
  roots.delete(element);
}

export function createTooltipViewApi() {
  return Object.freeze({
    implementation: 'react',
    createTooltipElement,
    destroyTooltipElement,
    renderCursorTag,
    renderTooltipText
  });
}
