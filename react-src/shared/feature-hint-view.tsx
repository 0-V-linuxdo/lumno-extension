import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

export interface FeatureHintViewModel {
  alignMode: string;
  arrowAlign: string;
  arrowSide: string;
  badgeIconHtml?: string;
  badgeIconText?: string;
  className?: string;
  dismissStorage: string;
  elementId: string;
  hasLink: boolean;
  hintId: string;
  placement?: string;
  roundedArrowTip: boolean;
  surface?: string;
  textId: string;
  version?: string;
  widthMode: string;
}

export interface FeatureHintViewLabels {
  badge: string;
  close: string;
  link?: string;
  text: string;
}

export interface FeatureHintViewOptions {
  documentObj?: Document;
  labels: FeatureHintViewLabels;
  model: FeatureHintViewModel;
  onDismiss?(): void;
  onLinkClick?(event: MouseEvent): void;
}

export interface FeatureHintViewController {
  arrowTip: HTMLSpanElement | null;
  badge: HTMLSpanElement;
  closeButton: HTMLButtonElement;
  destroy(): void;
  element: HTMLSpanElement;
  linkButton: HTMLButtonElement | null;
  text: HTMLSpanElement;
  updateLabels(labels: FeatureHintViewLabels): void;
}

function FeatureHintContent({
  labels,
  model,
  onDismiss,
  onLinkClick
}: Omit<FeatureHintViewOptions, 'documentObj'>) {
  const activateLink = (
    event: React.MouseEvent<HTMLButtonElement>
  ): void => {
    event.preventDefault();
    event.stopPropagation();
    if (
      event.type === 'auxclick' &&
      event.button !== 1
    ) {
      return;
    }
    onLinkClick?.(event.nativeEvent);
  };

  return (
    <>
      {model.roundedArrowTip ? (
        <span
          aria-hidden="true"
          className="x-lumno-feature-hint__arrow-tip"
        />
      ) : null}
      <span
        aria-label={labels.badge}
        className="x-lumno-feature-hint__badge"
      >
        {model.badgeIconHtml ? (
          <span
            className="x-lumno-feature-hint__badge-icon"
            dangerouslySetInnerHTML={{
              __html: model.badgeIconHtml
            }}
          />
        ) : model.badgeIconText ? (
          <span
            className="x-lumno-feature-hint__badge-icon"
            data-icon-type="text"
          >
            {model.badgeIconText}
          </span>
        ) : null}
        <span className="x-lumno-feature-hint__badge-text">
          {labels.badge}
        </span>
      </span>
      <span
        className="x-lumno-feature-hint__text"
        id={model.textId}
      >
        {labels.text}
      </span>
      {model.hasLink ? (
        <button
          aria-label={labels.link || ''}
          className="x-lumno-feature-hint__link"
          onAuxClick={activateLink}
          onClick={activateLink}
          title={labels.link || ''}
          type="button"
        >
          <span className="x-lumno-feature-hint__link-text">
            {labels.link || ''}
          </span>
          <span
            className="x-lumno-feature-hint__link-icon"
            dangerouslySetInnerHTML={{
              __html:
                '<i class="ri-icon ri-size-12 ri-arrow-right-line" aria-hidden="true"></i>'
            }}
          />
        </button>
      ) : null}
      <button
        aria-label={labels.close}
        className="x-lumno-feature-hint__close"
        dangerouslySetInnerHTML={{
          __html:
            '<i class="ri-icon ri-size-12 ri-close-line" aria-hidden="true"></i>'
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDismiss?.();
        }}
        type="button"
      />
    </>
  );
}

export function createFeatureHintView(
  options: FeatureHintViewOptions
): FeatureHintViewController | null {
  const documentObj = options.documentObj || document;
  if (!documentObj || !options.model) {
    return null;
  }
  const model = options.model;
  const element = documentObj.createElement('span');
  element.id = model.elementId;
  element.className = [
    'x-lumno-feature-hint',
    model.className || ''
  ]
    .filter(Boolean)
    .join(' ');
  element.setAttribute('role', 'note');
  element.setAttribute('data-react-island', 'feature-hint');
  element.setAttribute('data-feature-hint-id', model.hintId);
  element.setAttribute(
    'data-feature-hint-surface',
    model.surface || ''
  );
  element.setAttribute(
    'data-feature-hint-placement',
    model.placement || ''
  );
  element.setAttribute(
    'data-feature-hint-version',
    model.version || ''
  );
  element.setAttribute('data-arrow-side', model.arrowSide);
  element.setAttribute('data-arrow-align', model.arrowAlign);
  element.setAttribute(
    'data-dismiss-storage',
    model.dismissStorage
  );
  element.setAttribute('data-width-mode', model.widthMode);
  element.setAttribute('data-align-mode', model.alignMode);
  element.setAttribute('data-multiline', 'false');
  element.setAttribute(
    'data-has-link',
    model.hasLink ? 'true' : 'false'
  );
  element.setAttribute(
    'data-rounded-arrow-tip',
    model.roundedArrowTip ? 'true' : 'false'
  );
  element.setAttribute('data-visible', 'false');
  element.setAttribute('data-dismissed', 'false');
  element.setAttribute('aria-hidden', 'true');

  const root: Root = createRoot(element);
  let labels = options.labels;
  let destroyed = false;
  const render = (): void => {
    if (destroyed) {
      return;
    }
    flushSync(() => {
      root.render(
        <FeatureHintContent
          labels={labels}
          model={model}
          onDismiss={options.onDismiss}
          onLinkClick={options.onLinkClick}
        />
      );
    });
  };
  render();

  const badge = element.querySelector<HTMLSpanElement>(
    '.x-lumno-feature-hint__badge'
  );
  const text = element.querySelector<HTMLSpanElement>(
    '.x-lumno-feature-hint__text'
  );
  const closeButton = element.querySelector<HTMLButtonElement>(
    '.x-lumno-feature-hint__close'
  );
  if (!badge || !text || !closeButton) {
    flushSync(() => root.unmount());
    return null;
  }

  return {
    arrowTip: element.querySelector<HTMLSpanElement>(
      '.x-lumno-feature-hint__arrow-tip'
    ),
    badge,
    closeButton,
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      flushSync(() => root.unmount());
    },
    element,
    linkButton: element.querySelector<HTMLButtonElement>(
      '.x-lumno-feature-hint__link'
    ),
    text,
    updateLabels(nextLabels) {
      labels = nextLabels;
      render();
    }
  };
}

export function createFeatureHintViewApi() {
  return Object.freeze({
    implementation: 'react',
    createFeatureHintView
  });
}
