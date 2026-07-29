import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

export type NewtabTopContentMode = 'brand' | 'time';

export interface TopContentModel {
  animateEntry: boolean;
  ariaLabel: string;
  imageSrc: string;
  locale?: string;
  mode: NewtabTopContentMode;
}

export interface TopContentControllerOptions {
  onActivate(disposition: 'newTab' | 'backgroundTab'): void;
  onEntryAnimationComplete(animationName?: string): void;
}

export interface TopContentController {
  destroy(): void;
  getButton(): HTMLButtonElement | null;
  getContent(): HTMLElement | null;
  getImage(): HTMLImageElement | null;
  getSolid(): HTMLSpanElement | null;
  render(model: TopContentModel): void;
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

const clockStyle: CSSProperties = {
  alignItems: 'center',
  color: 'var(--x-nt-wordmark-solid-fill, rgb(31 41 55))',
  display: 'inline-flex',
  fontFamily: '"Open Sans", sans-serif',
  fontSize: 'clamp(42px, 4.2vw, 54px)',
  fontStretch: '86%',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 320,
  justifyContent: 'center',
  letterSpacing: '-0.055em',
  lineHeight: 0.86,
  pointerEvents: 'none',
  position: 'relative',
  textRendering: 'geometricPrecision'
};

const clockDigitsStyle = {
  '--number-flow-mask-height': '0.16em',
  '--number-flow-mask-width': '0.24em'
} as CSSProperties;

const colonStyle: CSSProperties = {
  display: 'inline-block',
  margin: '0 0.055em',
  opacity: 0.72,
  transform: 'translateY(-0.035em)'
};

const twoDigitFormat = Object.freeze({
  minimumIntegerDigits: 2,
  useGrouping: false
});

const hourDigits = Object.freeze({ 1: Object.freeze({ max: 2 }) });
const minuteDigits = Object.freeze({ 1: Object.freeze({ max: 5 }) });

function getCurrentMinute() {
  const now = new Date();
  return {
    dateTime: `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`,
    hours: now.getHours(),
    minutes: now.getMinutes()
  };
}

function getLocalizedTimeLabel(locale: string | undefined, dateTime: string) {
  const [hours, minutes] = dateTime.split(':').map(Number);
  const value = new Date();
  value.setHours(hours, minutes, 0, 0);
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit'
    }).format(value);
  } catch (_error) {
    return dateTime;
  }
}

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
  model: TopContentModel;
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
      className="x-nt-wordmark-content x-nt-wordmark-brand"
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
        height={25.1557}
        src={model.imageSrc}
        style={imageStyle}
        width={112}
      />
    </button>
  );
}

function ClockMark({
  model,
  onEntryAnimationComplete
}: {
  model: TopContentModel;
  onEntryAnimationComplete(animationName?: string): void;
}) {
  const [time, setTime] = useState(getCurrentMinute);

  useEffect(() => {
    let timer = 0;
    const scheduleNextMinute = () => {
      const delay = 60_000 - (Date.now() % 60_000) + 24;
      timer = window.setTimeout(() => {
        setTime(getCurrentMinute());
        scheduleNextMinute();
      }, delay);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timer);
        setTime(getCurrentMinute());
        scheduleNextMinute();
      }
    };
    scheduleNextMinute();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <time
      aria-label={getLocalizedTimeLabel(model.locale, time.dateTime)}
      className="x-nt-wordmark-content x-nt-time-mark"
      dateTime={time.dateTime}
      onAnimationEnd={(event) =>
        onEntryAnimationComplete(event.animationName || undefined)
      }
      style={clockStyle}
    >
      <span aria-hidden="true">
        <NumberFlowGroup>
          <NumberFlow
            digits={hourDigits}
            format={twoDigitFormat}
            locales={model.locale}
            style={clockDigitsStyle}
            trend={0}
            value={time.hours}
          />
          <span style={colonStyle}>:</span>
          <NumberFlow
            digits={minuteDigits}
            format={twoDigitFormat}
            locales={model.locale}
            style={clockDigitsStyle}
            trend={0}
            value={time.minutes}
          />
        </NumberFlowGroup>
      </span>
    </time>
  );
}

export function createTopContentController(
  host: HTMLElement | null,
  options: TopContentControllerOptions
): TopContentController {
  if (!host) {
    return Object.freeze({
      destroy() {},
      getButton: () => null,
      getContent: () => null,
      getImage: () => null,
      getSolid: () => null,
      render() {}
    });
  }
  host.id = '_x_extension_newtab_wordmark_2026_unique_';
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
    getContent() {
      return host.querySelector<HTMLElement>('.x-nt-wordmark-content');
    },
    getImage() {
      return host.querySelector('img');
    },
    getSolid() {
      return host.querySelector<HTMLSpanElement>('.x-nt-wordmark-solid');
    },
    render(model: TopContentModel) {
      if (destroyed) {
        return;
      }
      host.dataset.enter = model.animateEntry ? 'run' : 'done';
      flushSync(() => {
        root.render(model.mode === 'time' ? (
          <ClockMark
            model={model}
            onEntryAnimationComplete={options.onEntryAnimationComplete}
          />
        ) : (
          <Wordmark
            model={model}
            onActivate={options.onActivate}
            onEntryAnimationComplete={options.onEntryAnimationComplete}
          />
        ));
      });
    }
  });
}

export function createTopContentApi() {
  return Object.freeze({
    implementation: 'react',
    createTopContentController,
    createWordmarkController: createTopContentController
  });
}

// Compatibility aliases for the original brand-only island API.
export type WordmarkModel = TopContentModel;
export type WordmarkControllerOptions = TopContentControllerOptions;
export type WordmarkController = TopContentController;
export const createWordmarkController = createTopContentController;
export const createWordmarkApi = createTopContentApi;
