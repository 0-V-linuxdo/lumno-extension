import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

type ThemeValue = unknown;

export interface ShortcutItem {
  id?: string;
  url?: string;
  host?: string;
  title?: string;
  [key: string]: unknown;
}

interface ThemeSuggestion {
  type: 'shortcut';
  url: string;
  title: string;
  customIconDataUrl: string;
}

export interface ShortcutTileElement extends HTMLButtonElement {
  _xHost?: string;
  _xTheme?: ThemeValue;
  _xShortcutSuppressClick?: boolean;
}

export interface ShortcutsViewOptions {
  grid?: HTMLElement | null;
  tiles?: ShortcutTileElement[];
  maxShortcuts?: number;
  getShortcutTitle?: (shortcut: ShortcutItem) => string;
  getHostFromUrl?: (url: string) => string;
  getShortcutIconDataUrl?: (shortcutId: string) => string;
  getShortcutFaviconDataUrl?: (pageUrl: string) => string;
  resolveShortcutFaviconDataUrl?: (pageUrl: string) => Promise<string>;
  getPageFaviconCandidateUrl?: (url: string) => string;
  getImmediateThemeForSuggestion?: (
    suggestion: ThemeSuggestion
  ) => ThemeValue;
  applyShortcutTileTheme?: (
    tile: ShortcutTileElement,
    theme: ThemeValue,
    host: string
  ) => void;
  queueThemeForTarget?: (
    tile: ShortcutTileElement,
    suggestion: ThemeSuggestion,
    onTheme: (theme: ThemeValue) => void,
    options: { priority: number }
  ) => void;
  attachFaviconWithFallbacks?: (
    image: HTMLImageElement,
    pageUrl: string,
    host: string,
    options: {
      primaryUrl: string;
      browserUrl?: string;
      pageSpecificUrl?: string;
      skipPersisted?: boolean;
    }
  ) => void;
  bindTooltip?: (
    target: HTMLElement,
    getText: () => string,
    options: { maxWidth: number }
  ) => unknown;
  hideTooltip?: () => void;
  formatOpenLabel?: (title: string) => string;
  isMiddleClick?: (event: ReactMouseEvent<HTMLElement>) => boolean;
  openShortcut?: (
    shortcut: ShortcutItem,
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>
  ) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onNativeDragStart?: (event: ReactDragEvent<HTMLButtonElement>) => void;
  getAddLabel?: () => string;
  getAddIconSvg?: () => string;
  getAddVisible?: () => boolean;
  onAdd?: (sourceElement: HTMLButtonElement) => void;
  onAddContextMenu?: (sourceElement: HTMLButtonElement) => void;
}

export interface ShortcutsViewController {
  render(items: ShortcutItem[]): { count: number };
  clear(): void;
  refreshElements(): void;
  getTiles(): ShortcutTileElement[];
  getAddButton(): HTMLButtonElement | null;
}

interface NormalizedOptions {
  grid: HTMLElement;
  tiles: ShortcutTileElement[];
  maxShortcuts: number;
  getShortcutTitle: (shortcut: ShortcutItem) => string;
  getHostFromUrl: (url: string) => string;
  getShortcutIconDataUrl: (shortcutId: string) => string;
  getShortcutFaviconDataUrl: (pageUrl: string) => string;
  resolveShortcutFaviconDataUrl: (pageUrl: string) => Promise<string>;
  getPageFaviconCandidateUrl: (url: string) => string;
  getImmediateThemeForSuggestion: (
    suggestion: ThemeSuggestion
  ) => ThemeValue;
  applyShortcutTileTheme: (
    tile: ShortcutTileElement,
    theme: ThemeValue,
    host: string
  ) => void;
  queueThemeForTarget: (
    tile: ShortcutTileElement,
    suggestion: ThemeSuggestion,
    onTheme: (theme: ThemeValue) => void,
    options: { priority: number }
  ) => void;
  attachFaviconWithFallbacks: (
    image: HTMLImageElement,
    pageUrl: string,
    host: string,
    options: {
      primaryUrl: string;
      browserUrl?: string;
      pageSpecificUrl?: string;
      skipPersisted?: boolean;
    }
  ) => void;
  bindTooltip: (
    target: HTMLElement,
    getText: () => string,
    options: { maxWidth: number }
  ) => unknown;
  hideTooltip: () => void;
  formatOpenLabel: (title: string) => string;
  isMiddleClick: (event: ReactMouseEvent<HTMLElement>) => boolean;
  openShortcut: (
    shortcut: ShortcutItem,
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>
  ) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  onNativeDragStart: (event: ReactDragEvent<HTMLButtonElement>) => void;
  getAddLabel: () => string;
  getAddIconSvg: () => string;
  getAddVisible: () => boolean;
  onAdd: (sourceElement: HTMLButtonElement) => void;
  onAddContextMenu: (sourceElement: HTMLButtonElement) => void;
}

function normalizeOptions(
  options: ShortcutsViewOptions = {}
): NormalizedOptions | null {
  if (!options.grid) {
    return null;
  }
  return {
    grid: options.grid,
    tiles: Array.isArray(options.tiles) ? options.tiles : [],
    maxShortcuts: Number.isFinite(Number(options.maxShortcuts))
      ? Math.max(0, Math.floor(Number(options.maxShortcuts)))
      : Number.POSITIVE_INFINITY,
    getShortcutTitle: options.getShortcutTitle || (() => ''),
    getHostFromUrl: options.getHostFromUrl || (() => ''),
    getShortcutIconDataUrl: options.getShortcutIconDataUrl || (() => ''),
    getShortcutFaviconDataUrl:
      options.getShortcutFaviconDataUrl || (() => ''),
    resolveShortcutFaviconDataUrl:
      options.resolveShortcutFaviconDataUrl || (() => Promise.resolve('')),
    getPageFaviconCandidateUrl:
      options.getPageFaviconCandidateUrl || (() => ''),
    getImmediateThemeForSuggestion:
      options.getImmediateThemeForSuggestion || (() => null),
    applyShortcutTileTheme: options.applyShortcutTileTheme || (() => {}),
    queueThemeForTarget: options.queueThemeForTarget || (() => {}),
    attachFaviconWithFallbacks:
      options.attachFaviconWithFallbacks || (() => {}),
    bindTooltip: options.bindTooltip || (() => null),
    hideTooltip: options.hideTooltip || (() => {}),
    formatOpenLabel: options.formatOpenLabel || ((title) => title),
    isMiddleClick:
      options.isMiddleClick ||
      ((event) => Number(event.button) === 1),
    openShortcut: options.openShortcut || (() => {}),
    onContextMenu: options.onContextMenu || (() => {}),
    onNativeDragStart: options.onNativeDragStart || ((event) => {
      event.preventDefault();
    }),
    getAddLabel: options.getAddLabel || (() => ''),
    getAddIconSvg: options.getAddIconSvg || (() => ''),
    getAddVisible: options.getAddVisible || (() => true),
    onAdd: options.onAdd || (() => {}),
    onAddContextMenu: options.onAddContextMenu || (() => {})
  };
}

function ShortcutFavicon({
  shortcut,
  host,
  options
}: {
  shortcut: ShortcutItem;
  host: string;
  options: NormalizedOptions;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const shortcutId = String(shortcut.id || '');
  const url = String(shortcut.url || '');
  const localIconDataUrl = options.getShortcutIconDataUrl(shortcutId);
  const cachedFaviconDataUrl = options.getShortcutFaviconDataUrl(url);
  const [resolvedFaviconDataUrl, setResolvedFaviconDataUrl] = useState(
    cachedFaviconDataUrl
  );
  const fallbackFaviconDataUrl =
    resolvedFaviconDataUrl || cachedFaviconDataUrl;

  useEffect(() => {
    let cancelled = false;
    if (localIconDataUrl || cachedFaviconDataUrl) {
      setResolvedFaviconDataUrl(cachedFaviconDataUrl);
      return () => {
        cancelled = true;
      };
    }
    setResolvedFaviconDataUrl('');
    options.resolveShortcutFaviconDataUrl(url).then((dataUrl) => {
      if (!cancelled && dataUrl) {
        setResolvedFaviconDataUrl(dataUrl);
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cachedFaviconDataUrl, localIconDataUrl, options, url]);

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }
    if (localIconDataUrl) {
      image.parentElement
        ?.querySelectorAll('._x_extension_favicon_fallback_2024_unique_')
        .forEach((node) => node.remove());
      return;
    }
    options.attachFaviconWithFallbacks(image, url, host, {
      primaryUrl: options.getPageFaviconCandidateUrl(url),
      pageSpecificUrl: fallbackFaviconDataUrl,
      skipPersisted: true
    });
  }, [fallbackFaviconDataUrl, host, localIconDataUrl, options, url]);

  return (
    <span className="x-nt-shortcut-icon">
      <span className="x-nt-shortcut-favicon-mask">
        <img
          key={localIconDataUrl || url}
          ref={imageRef}
          className="x-nt-shortcut-favicon"
          alt=""
          loading="lazy"
          draggable={false}
          src={localIconDataUrl || undefined}
        />
      </span>
    </span>
  );
}

function ShortcutTile({
  shortcut,
  options
}: {
  shortcut: ShortcutItem;
  options: NormalizedOptions;
}) {
  const tileRef = useRef<ShortcutTileElement>(null);
  const title = options.getShortcutTitle(shortcut);
  const url = String(shortcut.url || '');
  const host = String(shortcut.host || options.getHostFromUrl(url));
  const shortcutId = String(shortcut.id || url);
  const localIconDataUrl = options.getShortcutIconDataUrl(
    String(shortcut.id || '')
  );
  const themeSuggestion = useMemo<ThemeSuggestion>(() => ({
    type: 'shortcut',
    url,
    title,
    customIconDataUrl: localIconDataUrl
  }), [localIconDataUrl, title, url]);

  useLayoutEffect(() => {
    const tile = tileRef.current;
    if (!tile) {
      return;
    }
    const immediateTheme =
      options.getImmediateThemeForSuggestion(themeSuggestion);
    tile._xHost = host;
    tile._xTheme = immediateTheme;
    options.applyShortcutTileTheme(tile, immediateTheme, host);
    options.queueThemeForTarget(
      tile,
      themeSuggestion,
      (theme) => {
        if (!tile.isConnected) {
          return;
        }
        tile._xTheme = theme || tile._xTheme;
        options.applyShortcutTileTheme(tile, theme, host);
      },
      { priority: 0 }
    );
    options.bindTooltip(
      tile,
      () => tile.getAttribute('data-shortcut-title') || title,
      { maxWidth: 360 }
    );
  }, [host, options, themeSuggestion, title]);

  function activate(
    event: ReactMouseEvent<HTMLButtonElement> |
      ReactKeyboardEvent<HTMLButtonElement>
  ): void {
    const tile = tileRef.current;
    if (tile?._xShortcutSuppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    options.hideTooltip();
    options.openShortcut(shortcut, event);
  }

  function handleAuxClick(event: ReactMouseEvent<HTMLButtonElement>): void {
    if (!options.isMiddleClick(event)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    options.openShortcut(shortcut, event);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    activate(event);
  }

  return (
    <button
      ref={tileRef}
      type="button"
      className="x-nt-shortcut-tile"
      draggable={false}
      data-shortcut-id={shortcutId}
      data-shortcut-url={url}
      data-shortcut-title={title}
      data-shortcut-draggable="true"
      data-shortcut-custom-icon={localIconDataUrl ? 'true' : undefined}
      data-tooltip={title}
      aria-label={options.formatOpenLabel(title)}
      onClick={activate}
      onAuxClick={handleAuxClick}
      onKeyDown={handleKeyDown}
      onContextMenu={options.onContextMenu}
      onDragStart={options.onNativeDragStart}
    >
      <ShortcutFavicon
        shortcut={shortcut}
        host={host}
        options={options}
      />
    </button>
  );
}

function ShortcutsList({
  items,
  options,
  addButtonRef
}: {
  items: ShortcutItem[];
  options: NormalizedOptions;
  addButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const addLabel = options.getAddLabel();
  const keys = new Map<string, number>();

  return (
    <>
      {items.map((shortcut) => {
        const identity = String(shortcut.id || shortcut.url || 'shortcut');
        const occurrence = keys.get(identity) || 0;
        keys.set(identity, occurrence + 1);
        return (
          <ShortcutTile
            key={`${identity}:${occurrence}`}
            shortcut={shortcut}
            options={options}
          />
        );
      })}
      <button
        ref={addButtonRef}
        type="button"
        className="x-nt-shortcut-tile x-nt-shortcut-tile--add"
        hidden={!options.getAddVisible() || items.length >= options.maxShortcuts}
        data-tooltip={addLabel}
        aria-label={addLabel}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          options.hideTooltip();
          options.onAdd(event.currentTarget);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          options.hideTooltip();
          options.onAddContextMenu(event.currentTarget);
        }}
      >
        <span
          className="x-nt-shortcut-icon x-nt-shortcut-icon--add"
          dangerouslySetInnerHTML={{ __html: options.getAddIconSvg() }}
        />
      </button>
    </>
  );
}

function createNoopController(
  options: ShortcutsViewOptions
): ShortcutsViewController {
  const tiles = Array.isArray(options.tiles) ? options.tiles : [];
  return {
    render() {
      tiles.length = 0;
      return { count: 0 };
    },
    clear() {
      tiles.length = 0;
    },
    refreshElements() {
      tiles.length = 0;
    },
    getTiles() {
      return tiles;
    },
    getAddButton() {
      return null;
    }
  };
}

export function createShortcutsView(
  rawOptions: ShortcutsViewOptions = {}
): ShortcutsViewController {
  const normalizedOptions = normalizeOptions(rawOptions);
  if (!normalizedOptions) {
    return createNoopController(rawOptions);
  }
  const options: NormalizedOptions = normalizedOptions;
  const reactRoot: Root = createRoot(options.grid);
  const addButtonRef = { current: null } as {
    current: HTMLButtonElement | null;
  };
  options.grid.setAttribute('data-react-island', 'shortcuts');

  function refreshElements(): void {
    options.tiles.length = 0;
    options.grid
      .querySelectorAll<ShortcutTileElement>(
        '.x-nt-shortcut-tile[data-shortcut-id]'
      )
      .forEach((tile) => options.tiles.push(tile));
    addButtonRef.current = options.grid.querySelector<HTMLButtonElement>(
      '.x-nt-shortcut-tile--add'
    );
  }

  function render(items: ShortcutItem[]): { count: number } {
    const normalizedItems = Array.isArray(items) ? items : [];
    options.hideTooltip();
    flushSync(() => {
      reactRoot.render(
        <ShortcutsList
          items={normalizedItems}
          options={options}
          addButtonRef={addButtonRef}
        />
      );
    });
    refreshElements();
    const addButton = addButtonRef.current;
    if (addButton) {
      options.bindTooltip(
        addButton,
        () => addButton.getAttribute('data-tooltip') || options.getAddLabel(),
        { maxWidth: 260 }
      );
    }
    return { count: normalizedItems.length };
  }

  return {
    render,
    clear() {
      options.hideTooltip();
      flushSync(() => {
        reactRoot.render(null);
      });
      options.tiles.length = 0;
      addButtonRef.current = null;
    },
    refreshElements,
    getTiles() {
      return options.tiles;
    },
    getAddButton() {
      return addButtonRef.current;
    }
  };
}

export function createShortcutsViewApi() {
  return Object.freeze({
    implementation: 'react',
    createShortcutsView(options?: ShortcutsViewOptions) {
      return createShortcutsView(options);
    }
  });
}
