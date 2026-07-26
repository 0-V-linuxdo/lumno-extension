import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

export interface WordmarkModel {
  animateEntry: boolean;
  ariaLabel: string;
  imageSrc: string;
}

export interface WordmarkControllerOptions {
  onActivate(disposition: 'newTab' | 'backgroundTab'): void;
  onEntryAnimationComplete(animationName?: string): void;
}

export interface WordmarkController {
  destroy(): void;
  getButton(): HTMLButtonElement | null;
  getImage(): HTMLImageElement | null;
  getSolid(): HTMLSpanElement | null;
  render(model: WordmarkModel): void;
}

const containerStyle = `
  all: unset;
  width: 90vw;
  max-width: var(--x-nt-search-max-width, 720px);
  max-height: 74px;
  min-height: 0;
  margin: 0 0 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  position: relative;
  z-index: 3;
  overflow: hidden;
  pointer-events: auto;
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition: max-height 260ms cubic-bezier(0.22, 1, 0.36, 1), margin-bottom 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  user-select: none;
`;

const buttonStyle: CSSProperties = {
  alignItems: 'center',
  cursor: 'pointer',
  display: 'inline-flex',
  justifyContent: 'center',
  lineHeight: 0,
  pointerEvents: 'auto',
  position: 'relative'
};

const solidStyle: CSSProperties = {
  background: 'var(--x-nt-wordmark-solid-fill, rgb(31 41 55))',
  contain: 'paint',
  inset: 0,
  mask: 'url("../../assets/images/lumno-wordmark-mask.svg") center / contain no-repeat',
  opacity: 0,
  pointerEvents: 'none',
  position: 'absolute',
  transition: 'background-color 180ms ease, opacity 180ms ease',
  WebkitMask:
    'url("../../assets/images/lumno-wordmark-mask.svg") center / contain no-repeat',
  zIndex: 0
};

const imageStyle: CSSProperties = {
  display: 'block',
  filter: 'none',
  height: 'auto',
  maxWidth: '52%',
  objectFit: 'contain',
  opacity: 0.82,
  position: 'relative',
  transform: 'translateY(0)',
  transition: 'opacity 180ms ease',
  width: 180,
  zIndex: 1
};

function getDisposition(event: {
  button?: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
}) {
  return event.ctrlKey || event.metaKey || event.button === 1
    ? 'backgroundTab'
    : 'newTab';
}

function Wordmark({
  model,
  onActivate,
  onEntryAnimationComplete
}: {
  model: WordmarkModel;
  onActivate(disposition: 'newTab' | 'backgroundTab'): void;
  onEntryAnimationComplete(animationName?: string): void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) {
      return undefined;
    }
    const onAnimationCancel = () => onEntryAnimationComplete();
    button.addEventListener('animationcancel', onAnimationCancel);
    return () => {
      button.removeEventListener('animationcancel', onAnimationCancel);
    };
  }, [onEntryAnimationComplete]);
  return (
    <button
      aria-label={model.ariaLabel}
      onAnimationEnd={(event) =>
        onEntryAnimationComplete(event.animationName || undefined)
      }
      onAuxClick={(event) => {
        if (event.button !== 1) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        onActivate(getDisposition(event));
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate(getDisposition(event));
      }}
      ref={buttonRef}
      style={buttonStyle}
      type="button"
    >
      <span
        aria-hidden="true"
        className="x-nt-wordmark-solid"
        style={solidStyle}
      />
      <img
        alt=""
        className="x-nt-wordmark-image"
        draggable={false}
        src={model.imageSrc}
        style={imageStyle}
      />
    </button>
  );
}

export function createWordmarkController(
  host: HTMLElement | null,
  options: WordmarkControllerOptions
): WordmarkController {
  if (!host) {
    return Object.freeze({
      destroy() {},
      getButton: () => null,
      getImage: () => null,
      getSolid: () => null,
      render() {}
    });
  }
  host.id = '_x_extension_newtab_wordmark_2026_unique_';
  host.setAttribute('aria-hidden', 'true');
  host.dataset.reactIsland = 'newtab-wordmark';
  host.style.cssText = containerStyle;
  const root: Root = createRoot(host);
  let destroyed = false;
  return Object.freeze({
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      flushSync(() => root.unmount());
    },
    getButton() {
      return host.querySelector('button');
    },
    getImage() {
      return host.querySelector('img');
    },
    getSolid() {
      return host.querySelector('span');
    },
    render(model: WordmarkModel) {
      if (destroyed) {
        return;
      }
      host.dataset.enter = model.animateEntry ? 'run' : 'done';
      flushSync(() => {
        root.render(
          <Wordmark
            model={model}
            onActivate={options.onActivate}
            onEntryAnimationComplete={options.onEntryAnimationComplete}
          />
        );
      });
    }
  });
}

export function createWordmarkApi() {
  return Object.freeze({
    implementation: 'react',
    createWordmarkController
  });
}
