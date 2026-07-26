import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

type ThemeValue = Record<string, unknown> | null;
type Translate = (key: string, fallback: string) => string;

export interface Suggestion {
  type?: string;
  title?: string;
  url?: string;
  favicon?: string;
  path?: string;
  commandText?: string;
  reasons?: unknown[];
  isTopSite?: boolean;
  provider?: Record<string, unknown> | null;
  searchQuery?: string;
  [key: string]: unknown;
}

export interface OpenTabSuggestion {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
  [key: string]: unknown;
}

interface SuggestionActionTagModel {
  action: string;
  keyLabel?: string;
}

interface SuggestionActionModelResult {
  actionTags: SuggestionActionTagModel[];
  visitButtonAction: string;
  alwaysHideVisitButton: boolean;
  hasActionTags: boolean;
  hasSwitchAction: boolean;
}

interface SuggestionActionModel {
  createSearchActionModel?: (
    options: Record<string, unknown>
  ) => Partial<SuggestionActionModelResult> | null;
  getModifierAdjustedAction?: (
    action: string,
    modifiers: {
      openInCurrentTab: boolean;
      openSwitchInNewTab: boolean;
      openInBackgroundTab: boolean;
    }
  ) => string;
  shouldShowVisitButton?: (
    model: SuggestionActionModelResult,
    active: boolean
  ) => boolean;
}

interface CursorTooltipOptions {
  maxWidth: number;
  shouldShow: (target: HTMLElement) => boolean;
  deferHideVisibility: boolean;
  preserveVisibleOnTargetSwitch: boolean;
  renderContent?: (
    element: HTMLElement,
    text: string
  ) => HTMLElement;
}

interface FaviconCandidates {
  primaryUrl?: string;
  browserUrl?: string;
}

interface ModeTheme {
  accent?: string;
  buttonText?: string;
  buttonBg?: string;
  buttonBorder?: string;
  tagBg?: string;
  tagText?: string;
  tagBorder?: string;
  [key: string]: unknown;
}

export interface SuggestionActionTagElement extends HTMLSpanElement {
  _xActionLabel?: HTMLSpanElement | null;
  _xAction?: string;
  _xSuggestion?: Suggestion;
  _xDefaultBg?: string;
  _xDefaultText?: string;
  _xDefaultBorder?: string;
}

interface SuggestionIconSlotElement extends HTMLSpanElement {
  _xIsFavicon?: boolean;
}

export interface SuggestionElement extends HTMLDivElement {
  _xIsSearchSuggestion?: boolean;
  _xIsAutocompleteTop?: boolean;
  _xTheme?: ThemeValue;
  _xThemeHost?: string;
  _xIconWrap?: HTMLSpanElement | null;
  _xIconIsFavicon?: boolean;
  _xDirectIconWrap?: HTMLSpanElement | null;
  _xTitle?: HTMLSpanElement | null;
  _xCommandLabel?: HTMLSpanElement | null;
  _xSwitchButton?: HTMLButtonElement | null;
  _xHistoryTag?: SuggestionActionTagElement | null;
  _xBookmarkTag?: SuggestionActionTagElement | null;
  _xTopSiteTag?: SuggestionActionTagElement | null;
  _xTagContainer?: HTMLDivElement | null;
  _xActionModel?: SuggestionActionModelResult;
  _xHasActionTags?: boolean;
  _xVisitButton?: HTMLButtonElement | null;
  _xVisitButtonLabel?: HTMLSpanElement | null;
  _xVisitButtonAction?: string;
  _xActionTags?: SuggestionActionTagElement[];
  _xSuggestion?: Suggestion;
  _xAlwaysHideVisitButton?: boolean;
  _xHasSwitchAction?: boolean;
  _xHistoryDeleteButton?: HTMLButtonElement | null;
  _xHistoryDeleteSlot?: HTMLDivElement | null;
  _xHasHistoryDeleteButton?: boolean;
  _xIsHovering?: boolean;
}

export interface SuggestionsRenderPayload {
  suggestions?: Suggestion[];
  query?: string;
  canAppend?: boolean;
  startIndex?: number;
  primaryHighlightIndex?: number;
  primarySuggestion?: Suggestion | null;
  primaryHighlightReason?: string;
  onlyKeywordSuggestions?: boolean;
  mergedProvider?: Record<string, unknown> | null;
  emptyMessage?: string;
}

export interface SuggestionsViewOptions {
  document?: Document;
  container?: HTMLElement | null;
  items?: SuggestionElement[];
  t?: Translate;
  formatMessage?: (
    key: string,
    fallback: string,
    values?: Record<string, string>
  ) => string;
  actionModel?: SuggestionActionModel;
  getRiSvg?: (name: string, sizeClass?: string) => string;
  sanitizeDisplayText?: (value: unknown) => string;
  formatTabRankDebugText?: (tab: OpenTabSuggestion) => string;
  isTabRankScoreDebugEnabled?: () => boolean;
  shouldBlockFaviconForHost?: (host: string) => boolean;
  isLocalNetworkHost?: (host: string) => boolean;
  getChromeFaviconUrl?: (url: string) => string;
  getHostFromUrl?: (url: string) => string;
  getThemeHostForSuggestion?: (suggestion: Suggestion) => string;
  getImmediateThemeForSuggestion?: (
    suggestion: Suggestion
  ) => ThemeValue;
  getThemeForSuggestion?: (
    suggestion: Suggestion
  ) => Promise<ThemeValue>;
  shouldUseUrlFallbackThemeForSuggestion?: (
    suggestion: Suggestion,
    theme: ThemeValue
  ) => boolean;
  getThemeForMode?: (theme: ThemeValue) => ModeTheme;
  getHoverColors?: (
    theme: ThemeValue
  ) => { bg?: string; border?: string };
  getNeutralHoverActionColors?: () => {
    bg?: string;
    border?: string;
    text?: string;
  };
  applyThemeVariables?: (
    target: SuggestionElement,
    theme: ThemeValue
  ) => void;
  applyMarkVariables?: (
    target: SuggestionElement,
    theme: ThemeValue
  ) => void;
  applyFaviconOpticalAlignment?: (image: HTMLImageElement) => void;
  applyFaviconOpticalShift?: (image: HTMLImageElement) => void;
  setFaviconSrcWithAnimation?: (
    image: HTMLImageElement,
    source: string
  ) => boolean;
  applyFallbackIcon?: (image: HTMLImageElement) => void;
  attachFaviconWithFallbacks?: (
    image: HTMLImageElement,
    url: string,
    host: string,
    candidates: FaviconCandidates
  ) => void;
  getBrowserPageFaviconUrl?: (url: string) => string;
  getPageFaviconRenderCandidates?: (
    url: string,
    explicitUrl: string,
    options?: { includeChromeFallback?: boolean }
  ) => FaviconCandidates;
  reportMissingIcon?: (...args: unknown[]) => void;
  preloadIcon?: (favicon: string, url: string) => void;
  setSuggestionsVisible?: (visible: boolean) => void;
  onSetSelectedIndex?: (index: number) => void;
  getSelectedIndex?: () => number;
  onSwitchToTab?: (
    tab: OpenTabSuggestion,
    event: MouseEvent
  ) => void;
  onActivateSuggestion?: (
    suggestion: Suggestion,
    query: string,
    event: MouseEvent,
    index: number,
    item: SuggestionElement
  ) => void;
  onDeleteHistory?: (
    suggestion: Suggestion,
    query: string
  ) => void;
  shouldSwitchMatchedTabSuggestion?: (
    suggestion: Suggestion,
    index: number
  ) => boolean;
  showTopActionTooltip?: (
    target: HTMLElement,
    text: string
  ) => void;
  hideTopActionTooltip?: () => void;
  bindCursorTooltip?: (
    target: HTMLElement,
    getText: () => string,
    options: CursorTooltipOptions
  ) => unknown;
  getSearchActionLabel?: () => string;
  getSiteSearchDisplayName?: (
    provider: Record<string, unknown>
  ) => string;
  isAiSiteSearchProvider?: (
    provider: Record<string, unknown>
  ) => boolean;
  getDefaultSearchEngineThemeUrl?: () => string;
  getBrandAccentForUrl?: (url: string) => unknown;
  buildThemeFromAccent?: (
    accent: unknown,
    kind: string
  ) => ThemeValue;
  isBrowserNewtabUrl?: (url: string) => boolean;
  isBrowserInternalUrl?: (url: string) => boolean;
  defaultTheme?: ThemeValue;
  urlHighlightTheme?: ThemeValue;
  openTabSuggestionLimit?: number;
}

export interface SuggestionsViewController {
  render(payload?: SuggestionsRenderPayload): void;
  renderTabs(tabList?: OpenTabSuggestion[]): void;
  updateSelection(selectedIndex?: number): void;
  setOpenInCurrentTabModifierActive(active: boolean): void;
  setOpenSwitchInNewTabModifierActive(active: boolean): void;
  setOpenInBackgroundTabModifierActive(active: boolean): void;
  clear(): void;
  destroy(): void;
  getAutoHighlightIndex(): number;
  markAutocompleteTop(primaryHighlightIndex: number): void;
  getItems(): SuggestionElement[];
}

export interface LegacySuggestionsApi {
  createSuggestionsView?: (
    options?: SuggestionsViewOptions
  ) => SuggestionsViewController;
}

interface NormalizedOptions {
  document: Document;
  container: HTMLElement;
  items: SuggestionElement[];
  t: Translate;
  formatMessage: NonNullable<SuggestionsViewOptions['formatMessage']>;
  actionModel: SuggestionActionModel;
  getRiSvg: NonNullable<SuggestionsViewOptions['getRiSvg']>;
  sanitizeDisplayText: NonNullable<
    SuggestionsViewOptions['sanitizeDisplayText']
  >;
  formatTabRankDebugText: NonNullable<
    SuggestionsViewOptions['formatTabRankDebugText']
  >;
  isTabRankScoreDebugEnabled: NonNullable<
    SuggestionsViewOptions['isTabRankScoreDebugEnabled']
  >;
  shouldBlockFaviconForHost: NonNullable<
    SuggestionsViewOptions['shouldBlockFaviconForHost']
  >;
  isLocalNetworkHost: NonNullable<
    SuggestionsViewOptions['isLocalNetworkHost']
  >;
  getChromeFaviconUrl: NonNullable<
    SuggestionsViewOptions['getChromeFaviconUrl']
  >;
  getHostFromUrl: NonNullable<SuggestionsViewOptions['getHostFromUrl']>;
  getThemeHostForSuggestion: NonNullable<
    SuggestionsViewOptions['getThemeHostForSuggestion']
  >;
  getImmediateThemeForSuggestion: NonNullable<
    SuggestionsViewOptions['getImmediateThemeForSuggestion']
  >;
  getThemeForSuggestion: NonNullable<
    SuggestionsViewOptions['getThemeForSuggestion']
  >;
  shouldUseUrlFallbackThemeForSuggestion: NonNullable<
    SuggestionsViewOptions['shouldUseUrlFallbackThemeForSuggestion']
  >;
  getThemeForMode: NonNullable<SuggestionsViewOptions['getThemeForMode']>;
  getHoverColors: NonNullable<SuggestionsViewOptions['getHoverColors']>;
  getNeutralHoverActionColors: NonNullable<
    SuggestionsViewOptions['getNeutralHoverActionColors']
  >;
  applyThemeVariables: NonNullable<
    SuggestionsViewOptions['applyThemeVariables']
  >;
  applyMarkVariables: NonNullable<
    SuggestionsViewOptions['applyMarkVariables']
  >;
  applyFaviconOpticalAlignment: NonNullable<
    SuggestionsViewOptions['applyFaviconOpticalAlignment']
  >;
  attachFaviconWithFallbacks: NonNullable<
    SuggestionsViewOptions['attachFaviconWithFallbacks']
  >;
  getPageFaviconRenderCandidates: NonNullable<
    SuggestionsViewOptions['getPageFaviconRenderCandidates']
  >;
  preloadIcon: NonNullable<SuggestionsViewOptions['preloadIcon']>;
  setSuggestionsVisible: NonNullable<
    SuggestionsViewOptions['setSuggestionsVisible']
  >;
  onSetSelectedIndex: NonNullable<
    SuggestionsViewOptions['onSetSelectedIndex']
  >;
  getSelectedIndex: NonNullable<
    SuggestionsViewOptions['getSelectedIndex']
  >;
  onSwitchToTab: NonNullable<SuggestionsViewOptions['onSwitchToTab']>;
  onActivateSuggestion: NonNullable<
    SuggestionsViewOptions['onActivateSuggestion']
  >;
  onDeleteHistory: NonNullable<
    SuggestionsViewOptions['onDeleteHistory']
  >;
  shouldSwitchMatchedTabSuggestion: NonNullable<
    SuggestionsViewOptions['shouldSwitchMatchedTabSuggestion']
  >;
  showTopActionTooltip: NonNullable<
    SuggestionsViewOptions['showTopActionTooltip']
  >;
  hideTopActionTooltip: NonNullable<
    SuggestionsViewOptions['hideTopActionTooltip']
  >;
  bindCursorTooltip: SuggestionsViewOptions['bindCursorTooltip'];
  getSearchActionLabel: NonNullable<
    SuggestionsViewOptions['getSearchActionLabel']
  >;
  getSiteSearchDisplayName: NonNullable<
    SuggestionsViewOptions['getSiteSearchDisplayName']
  >;
  isAiSiteSearchProvider: NonNullable<
    SuggestionsViewOptions['isAiSiteSearchProvider']
  >;
  getDefaultSearchEngineThemeUrl: NonNullable<
    SuggestionsViewOptions['getDefaultSearchEngineThemeUrl']
  >;
  getBrandAccentForUrl: NonNullable<
    SuggestionsViewOptions['getBrandAccentForUrl']
  >;
  buildThemeFromAccent: NonNullable<
    SuggestionsViewOptions['buildThemeFromAccent']
  >;
  isBrowserNewtabUrl: NonNullable<
    SuggestionsViewOptions['isBrowserNewtabUrl']
  >;
  isBrowserInternalUrl: NonNullable<
    SuggestionsViewOptions['isBrowserInternalUrl']
  >;
  defaultTheme: ThemeValue;
  urlHighlightTheme: ThemeValue;
  openTabSuggestionLimit: number;
}

interface ModifierState {
  openInCurrentTab: boolean;
  openSwitchInNewTab: boolean;
  openInBackgroundTab: boolean;
}

interface SuggestionsRuntime {
  options: NormalizedOptions;
  modifiers: ModifierState;
  updateSelection: (selectedIndex?: number) => void;
}

function noop(): void {}

function fallbackFormatMessage(
  key: string,
  fallback: string,
  values: Record<string, string> = {}
): string {
  let text = fallback || key || '';
  Object.entries(values).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), value);
  });
  return text;
}

function normalizeOptions(
  raw: SuggestionsViewOptions
): NormalizedOptions | null {
  const documentRef = raw.document || globalThis.document;
  if (!documentRef || !raw.container) {
    return null;
  }
  const defaultTheme = raw.defaultTheme || {};
  const isBrowserNewtabUrl = raw.isBrowserNewtabUrl || ((url) => {
    const normalized = String(url || '')
      .trim()
      .toLowerCase()
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '');
    return [
      'chrome://newtab',
      'chrome://new-tab-page',
      'edge://newtab',
      'brave://newtab',
      'vivaldi://newtab',
      'opera://startpage'
    ].includes(normalized);
  });
  const isBrowserInternalUrl = raw.isBrowserInternalUrl || ((url) =>
    /^(chrome|edge|brave|vivaldi|opera):\/\/|^about:/i.test(
      String(url || '').trim()
    ));
  const shouldBlockFaviconForHost =
    raw.shouldBlockFaviconForHost || (() => false);
  const getChromeFaviconUrl = raw.getChromeFaviconUrl || (() => '');
  const getBrowserPageFaviconUrl =
    raw.getBrowserPageFaviconUrl || (() => '');
  return {
    document: documentRef,
    container: raw.container,
    items: Array.isArray(raw.items) ? raw.items : [],
    t: raw.t || ((_key, fallback) => fallback || _key || ''),
    formatMessage: raw.formatMessage || fallbackFormatMessage,
    actionModel: raw.actionModel || {},
    getRiSvg: raw.getRiSvg || (() => ''),
    sanitizeDisplayText:
      raw.sanitizeDisplayText || ((value) => String(value || '')),
    formatTabRankDebugText: raw.formatTabRankDebugText || (() => ''),
    isTabRankScoreDebugEnabled:
      raw.isTabRankScoreDebugEnabled || (() => false),
    shouldBlockFaviconForHost,
    isLocalNetworkHost:
      raw.isLocalNetworkHost || shouldBlockFaviconForHost,
    getChromeFaviconUrl,
    getHostFromUrl: raw.getHostFromUrl || (() => ''),
    getThemeHostForSuggestion:
      raw.getThemeHostForSuggestion || (() => ''),
    getImmediateThemeForSuggestion:
      raw.getImmediateThemeForSuggestion || (() => defaultTheme),
    getThemeForSuggestion:
      raw.getThemeForSuggestion ||
      (() => Promise.resolve(defaultTheme)),
    shouldUseUrlFallbackThemeForSuggestion:
      raw.shouldUseUrlFallbackThemeForSuggestion || (() => false),
    getThemeForMode:
      raw.getThemeForMode || ((theme) => (theme || defaultTheme) as ModeTheme),
    getHoverColors:
      raw.getHoverColors ||
      (() => ({
        bg: 'var(--x-nt-hover-bg, #F3F4F6)',
        border: 'transparent'
      })),
    getNeutralHoverActionColors:
      raw.getNeutralHoverActionColors ||
      (() => ({
        bg: 'rgba(200, 208, 218, 0.45)',
        border: 'rgba(148, 163, 184, 0.28)',
        text: '#4B5563'
      })),
    applyThemeVariables: raw.applyThemeVariables || noop,
    applyMarkVariables: raw.applyMarkVariables || noop,
    applyFaviconOpticalAlignment:
      raw.applyFaviconOpticalAlignment || noop,
    attachFaviconWithFallbacks:
      raw.attachFaviconWithFallbacks || noop,
    getPageFaviconRenderCandidates:
      raw.getPageFaviconRenderCandidates ||
      ((url, explicitUrl, options) => {
        const browserPageUrl = getBrowserPageFaviconUrl(url);
        const chromeUrl = getChromeFaviconUrl(url);
        const internal = isBrowserInternalUrl(url);
        const primaryUrl = internal
          ? browserPageUrl || explicitUrl || chromeUrl
          : browserPageUrl || explicitUrl;
        return {
          primaryUrl,
          browserUrl:
            (internal || options?.includeChromeFallback) &&
            chromeUrl !== primaryUrl
              ? chromeUrl
              : ''
        };
      }),
    preloadIcon: raw.preloadIcon || noop,
    setSuggestionsVisible: raw.setSuggestionsVisible || noop,
    onSetSelectedIndex: raw.onSetSelectedIndex || noop,
    getSelectedIndex: raw.getSelectedIndex || (() => -1),
    onSwitchToTab: raw.onSwitchToTab || noop,
    onActivateSuggestion: raw.onActivateSuggestion || noop,
    onDeleteHistory: raw.onDeleteHistory || noop,
    shouldSwitchMatchedTabSuggestion:
      raw.shouldSwitchMatchedTabSuggestion || (() => false),
    showTopActionTooltip: raw.showTopActionTooltip || noop,
    hideTopActionTooltip: raw.hideTopActionTooltip || noop,
    bindCursorTooltip: raw.bindCursorTooltip,
    getSearchActionLabel: raw.getSearchActionLabel || (() => 'Search'),
    getSiteSearchDisplayName:
      raw.getSiteSearchDisplayName ||
      ((provider) => String(provider.name || provider.key || '')),
    isAiSiteSearchProvider:
      raw.isAiSiteSearchProvider ||
      ((provider) => String(provider.action || '').trim() === 'openAndSubmit'),
    getDefaultSearchEngineThemeUrl:
      raw.getDefaultSearchEngineThemeUrl || (() => ''),
    getBrandAccentForUrl: raw.getBrandAccentForUrl || (() => null),
    buildThemeFromAccent:
      raw.buildThemeFromAccent || ((theme) => (theme || defaultTheme) as ThemeValue),
    isBrowserNewtabUrl,
    isBrowserInternalUrl,
    defaultTheme,
    urlHighlightTheme: raw.urlHighlightTheme || defaultTheme,
    openTabSuggestionLimit:
      Number(raw.openTabSuggestionLimit) > 0
        ? Number(raw.openTabSuggestionLimit)
        : 3
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHighlightedParts(
  options: NormalizedOptions,
  text: unknown,
  query: string
): Array<{ text: string; highlighted: boolean }> {
  const safeText = options.sanitizeDisplayText(text);
  const needle = String(query || '').trim();
  if (!needle) {
    return [{ text: safeText, highlighted: false }];
  }
  const parts = safeText.split(
    new RegExp(`(${escapeRegExp(needle)})`, 'gi')
  );
  if (parts.length === 1) {
    return [{ text: safeText, highlighted: false }];
  }
  return parts.filter(Boolean).map((part) => ({
    text: part,
    highlighted: part.toLowerCase() === needle.toLowerCase()
  }));
}

function HighlightedText({
  options,
  text,
  query
}: {
  options: NormalizedOptions;
  text: unknown;
  query: string;
}) {
  return getHighlightedParts(options, text, query).map((part, index) =>
    part.highlighted ? (
      <mark
        key={`${index}:${part.text}`}
        className="x-nt-suggestion-mark"
      >
        {part.text}
      </mark>
    ) : (
      part.text
    )
  );
}

function renderHighlightedText(
  options: NormalizedOptions,
  target: HTMLElement,
  text: unknown,
  query: string
): HTMLElement {
  target.textContent = '';
  getHighlightedParts(options, text, query).forEach((part) => {
    if (part.highlighted) {
      const mark = options.document.createElement('mark');
      mark.className = 'x-nt-suggestion-mark';
      mark.textContent = part.text;
      target.appendChild(mark);
    } else {
      target.appendChild(options.document.createTextNode(part.text));
    }
  });
  return target;
}

function isOverflowing(target: HTMLElement): boolean {
  const clientWidth = Number(target.clientWidth);
  const scrollWidth = Number(target.scrollWidth);
  return Number.isFinite(clientWidth) &&
    Number.isFinite(scrollWidth) &&
    clientWidth > 0 &&
    scrollWidth > clientWidth + 1;
}

function bindTextTooltip(
  options: NormalizedOptions,
  target: HTMLElement | null,
  text: unknown,
  query?: string
): void {
  const safeText = options.sanitizeDisplayText(text);
  if (!options.bindCursorTooltip || !target || !safeText) {
    return;
  }
  options.bindCursorTooltip(target, () => safeText, {
    maxWidth: 520,
    shouldShow: isOverflowing,
    deferHideVisibility: true,
    preserveVisibleOnTargetSwitch: true,
    ...(query
      ? {
          renderContent: (element: HTMLElement, value: string) =>
            renderHighlightedText(options, element, value, query)
        }
      : {})
  });
}

function isLocalUrlSuggestion(
  options: NormalizedOptions,
  suggestion: Suggestion
): boolean {
  const url = String(suggestion.url || '');
  if (!url) {
    return false;
  }
  try {
    if (new URL(url).protocol.toLowerCase() === 'file:') {
      return true;
    }
  } catch {
    // Continue with the host-based check for partially typed URLs.
  }
  const host = options.getHostFromUrl(url);
  return Boolean(
    host &&
    (options.isLocalNetworkHost(host) ||
      options.shouldBlockFaviconForHost(host))
  );
}

function resolveTheme(
  options: NormalizedOptions,
  suggestion: Suggestion,
  theme: ThemeValue
): ThemeValue {
  const nextTheme = theme || options.defaultTheme;
  return options.shouldUseUrlFallbackThemeForSuggestion(
    suggestion,
    nextTheme
  )
    ? options.urlHighlightTheme
    : nextTheme;
}

function getModifierAction(
  runtime: SuggestionsRuntime,
  action: string
): string {
  const { actionModel } = runtime.options;
  if (actionModel.getModifierAdjustedAction) {
    return actionModel.getModifierAdjustedAction(
      action,
      runtime.modifiers
    );
  }
  if (
    runtime.modifiers.openSwitchInNewTab &&
    action === 'switch'
  ) {
    return runtime.modifiers.openInBackgroundTab &&
      !runtime.modifiers.openInCurrentTab
      ? 'openBackgroundTab'
      : 'openNewTab';
  }
  if (
    runtime.modifiers.openInBackgroundTab &&
    !runtime.modifiers.openInCurrentTab &&
    ['openNewTab', 'go', 'switch'].includes(action)
  ) {
    return 'openBackgroundTab';
  }
  return runtime.modifiers.openInCurrentTab && action === 'openNewTab'
    ? 'go'
    : action;
}

function getActionLabel(
  runtime: SuggestionsRuntime,
  action: string,
  suggestion: Suggestion
): string {
  const options = runtime.options;
  if (action === 'search') {
    const provider = suggestion.provider;
    if (provider) {
      const site = options.getSiteSearchDisplayName(provider);
      return options.isAiSiteSearchProvider(provider)
        ? options.formatMessage(
            'action_open_ai_web',
            '打开 {site} 网页版',
            { site }
          )
        : options.formatMessage(
            'search_in_site',
            '在 {site} 中搜索',
            { site }
          );
    }
    return options.getSearchActionLabel();
  }
  const labels: Record<string, [string, string]> = {
    switch: ['action_switch', '切换'],
    open: ['action_open', '打开'],
    openBackgroundTab: [
      'action_open_background_new_tab',
      '在后台新开'
    ],
    openNewTab: ['action_open_new_tab', '新开'],
    go: ['action_go_current_tab', '前往'],
    commandNewTab: ['command_newtab', '新建标签页'],
    commandDocumentPip: ['document_pip_command_action', '开始剪裁']
  };
  if (action === 'commandSettings') {
    return options.formatMessage(
      'command_settings',
      '打开 {name} 设置',
      { name: 'Lumno' }
    );
  }
  const entry = labels[action] || labels.openNewTab;
  return options.t(entry[0], entry[1]);
}

function createActionModel(
  options: NormalizedOptions,
  input: Record<string, unknown>
): SuggestionActionModelResult {
  const model =
    options.actionModel.createSearchActionModel?.(input) || {};
  const tags = Array.isArray(model.actionTags)
    ? model.actionTags.filter(
        (tag): tag is SuggestionActionTagModel =>
          Boolean(tag && typeof tag.action === 'string')
      )
    : [];
  return {
    actionTags: tags,
    visitButtonAction: String(
      model.visitButtonAction || 'openNewTab'
    ),
    alwaysHideVisitButton: Boolean(model.alwaysHideVisitButton),
    hasActionTags:
      typeof model.hasActionTags === 'boolean'
        ? model.hasActionTags
        : tags.length > 0,
    hasSwitchAction: Boolean(model.hasSwitchAction)
  };
}

function setIconEmphasis(
  item: SuggestionElement,
  active: boolean
): void {
  if (!item._xIconWrap || item._xIconIsFavicon) {
    return;
  }
  item._xIconWrap.setAttribute(
    'data-emphasis',
    active ? 'true' : 'false'
  );
}

function setPalette(
  button: HTMLElement,
  text?: unknown,
  bg?: unknown,
  border?: unknown
): void {
  button.style.setProperty(
    '--x-nt-suggestion-action-button-text',
    String(text || 'var(--x-nt-subtext, #9CA3AF)')
  );
  button.style.setProperty(
    '--x-nt-suggestion-action-button-bg',
    String(bg || 'transparent')
  );
  button.style.setProperty(
    '--x-nt-suggestion-action-button-border',
    String(border || 'transparent')
  );
}

function applyTagStyle(
  tag: SuggestionActionTagElement | null | undefined,
  theme: ModeTheme,
  active: boolean
): void {
  if (!tag) {
    return;
  }
  tag.style.setProperty(
    '--x-nt-suggestion-tag-bg',
    String(
      active
        ? theme.tagBg || ''
        : tag._xDefaultBg || 'var(--x-nt-tag-bg, #F3F4F6)'
    )
  );
  tag.style.setProperty(
    '--x-nt-suggestion-tag-text',
    String(
      active
        ? theme.tagText || ''
        : tag._xDefaultText || 'var(--x-nt-tag-text, #6B7280)'
    )
  );
  tag.style.setProperty(
    '--x-nt-suggestion-tag-border',
    String(
      active
        ? theme.tagBorder || ''
        : tag._xDefaultBorder || 'transparent'
    )
  );
}

function applySearchActionStyles(
  runtime: SuggestionsRuntime,
  item: SuggestionElement,
  themeValue: ThemeValue,
  active: boolean
): void {
  const { options } = runtime;
  const theme = options.getThemeForMode(themeValue);
  item.setAttribute('data-active', active ? 'true' : 'false');
  item.setAttribute(
    'data-has-action-tags',
    item._xHasActionTags ? 'true' : 'false'
  );
  options.applyMarkVariables(
    item,
    active ? themeValue : options.defaultTheme
  );
  if (item._xVisitButton && item._xActionModel) {
    const visible = options.actionModel.shouldShowVisitButton
      ? options.actionModel.shouldShowVisitButton(
          item._xActionModel,
          active
        )
      : Boolean(
          !item._xAlwaysHideVisitButton &&
          !(active && item._xHasActionTags)
        );
    item._xVisitButton.setAttribute(
      'data-visible',
      visible ? 'true' : 'false'
    );
    if (active) {
      setPalette(
        item._xVisitButton,
        theme.buttonText,
        theme.buttonBg,
        theme.buttonBorder
      );
    } else {
      setPalette(item._xVisitButton);
    }
  }
  applyTagStyle(item._xHistoryTag, theme, active);
  applyTagStyle(item._xBookmarkTag, theme, active);
  applyTagStyle(item._xTopSiteTag, theme, active);
  item._xTagContainer?.setAttribute(
    'data-visible',
    active && item._xHasActionTags ? 'true' : 'false'
  );
  if (item._xHistoryDeleteButton) {
    const visible = Boolean(
      item._xHasHistoryDeleteButton && item._xIsHovering
    );
    item.setAttribute(
      'data-history-delete-visible',
      visible ? 'true' : 'false'
    );
    item._xHistoryDeleteButton.style.setProperty(
      '--x-nt-history-delete-color',
      String(
        visible && active
          ? theme.buttonText || ''
          : 'var(--x-nt-subtext, #6B7280)'
      )
    );
    item._xHistoryDeleteButton.style.setProperty(
      '--x-nt-history-delete-bg',
      String(visible && active ? theme.buttonBg || '' : 'transparent')
    );
    item._xHistoryDeleteButton.style.setProperty(
      '--x-nt-history-delete-border',
      String(
        visible && active ? theme.buttonBorder || '' : 'transparent'
      )
    );
  }
}

function updateSelectionForRuntime(
  runtime: SuggestionsRuntime,
  selectedIndex?: number
): void {
  const resolvedIndex = Number.isInteger(selectedIndex)
    ? Number(selectedIndex)
    : -1;
  const { options } = runtime;
  options.items.forEach((item, index) => {
    const selected = index === resolvedIndex;
    const autoHighlighted = Boolean(
      resolvedIndex === -1 && item._xIsAutocompleteTop
    );
    const highlighted = selected || autoHighlighted;
    const theme = item._xTheme || options.defaultTheme;
    if (highlighted) {
      item.setAttribute('data-row-state', 'active');
    } else {
      item.removeAttribute('data-row-state');
    }
    setIconEmphasis(
      item,
      Boolean(highlighted || item._xIsHovering)
    );
    if (item._xIsSearchSuggestion) {
      applySearchActionStyles(runtime, item, theme, highlighted);
      if (item._xDirectIconWrap) {
        const modeTheme = options.getThemeForMode(theme);
        item._xDirectIconWrap.style.setProperty(
          '--x-nt-suggestion-icon-color',
          String(
            highlighted && theme?._xIsBrand
              ? modeTheme.accent || ''
              : 'var(--x-nt-subtext, #6B7280)'
          )
        );
      }
    } else if (selected && theme?._xIsBrand) {
      const hover = options.getHoverColors(theme);
      item.style.setProperty(
        '--x-nt-suggestion-active-bg',
        String(hover.bg || '')
      );
      item.style.setProperty(
        '--x-nt-suggestion-active-border',
        String(hover.border || '')
      );
    }
  });
}

function syncModifierLabels(runtime: SuggestionsRuntime): void {
  runtime.options.items.forEach((item) => {
    if (!item._xIsSearchSuggestion || !item._xSuggestion) {
      return;
    }
    if (
      item._xVisitButtonLabel &&
      item._xVisitButtonAction
    ) {
      item._xVisitButtonLabel.textContent = getActionLabel(
        runtime,
        getModifierAction(runtime, item._xVisitButtonAction),
        item._xSuggestion
      );
      item._xVisitButton?.setAttribute(
        'aria-label',
        item._xVisitButtonLabel.textContent || ''
      );
    }
    item._xActionTags?.forEach((tag) => {
      if (!tag._xActionLabel || !tag._xAction) {
        return;
      }
      tag._xActionLabel.textContent = getActionLabel(
        runtime,
        getModifierAction(runtime, tag._xAction),
        item._xSuggestion as Suggestion
      );
    });
  });
}

function getBrowserFallbackIcon(
  options: NormalizedOptions,
  url: string
): string {
  if (options.isBrowserNewtabUrl(url)) {
    return 'ri-link';
  }
  return options.isBrowserInternalUrl(url) ? 'ri-link' : '';
}

function getFaviconCandidates(
  options: NormalizedOptions,
  url: string,
  favicon: string,
  host: string
): FaviconCandidates {
  return options.getPageFaviconRenderCandidates(
    url,
    favicon,
    {
      includeChromeFallback:
        Boolean(url && !/^https?:\/\//i.test(url)) ||
        Boolean(host && options.isLocalNetworkHost(host))
    }
  );
}

interface IconSpec {
  kind: 'favicon' | 'inline';
  iconName?: string;
  tone?: string;
  src?: string;
  attach?: boolean;
  url?: string;
  host?: string;
  favicon?: string;
  objectFitContain?: boolean;
  fallbackIconName?: string;
}

function getSuggestionIconSpec(
  options: NormalizedOptions,
  suggestion: Suggestion
): IconSpec {
  const type = suggestion.type || '';
  const url = String(suggestion.url || '');
  const favicon = String(suggestion.favicon || '');
  const host = url ? options.getHostFromUrl(url) : '';
  if (type === 'browserPage' || type === 'directUrl') {
    const useBrowserFavicon =
      type === 'browserPage' &&
      options.isBrowserInternalUrl(url);
    if (favicon || useBrowserFavicon) {
      return {
        kind: 'favicon',
        attach: true,
        url,
        host,
        favicon,
        objectFitContain: true,
        fallbackIconName:
          type === 'browserPage'
            ? getBrowserFallbackIcon(options, url)
            : ''
      };
    }
    return {
      kind: 'inline',
      iconName:
        type === 'browserPage' ? 'ri-window-2-line' : 'ri-search-line'
    };
  }
  const commandIcons: Record<string, string> = {
    commandNewTab: 'ri-add-line',
    commandSettings: 'ri-settings-3-line',
    commandDocumentPip: 'ri-scissors-cut-line'
  };
  if (commandIcons[type]) {
    return {
      kind: 'inline',
      iconName: commandIcons[type],
      tone: 'subtext'
    };
  }
  if ((type === 'modeSwitch' || type === 'zenSwitch') && favicon) {
    return {
      kind: 'favicon',
      src: favicon,
      fallbackIconName: 'ri-link'
    };
  }
  if (type === 'newtab' || type === 'googleSuggest') {
    return {
      kind: 'inline',
      iconName: 'ri-search-line',
      tone: 'subtext'
    };
  }
  if (
    favicon &&
    ['siteSearch', 'inlineSiteSearch', 'siteSearchPrompt'].includes(
      type
    )
  ) {
    return {
      kind: 'favicon',
      attach: true,
      url,
      host,
      favicon,
      objectFitContain: true
    };
  }
  if (favicon) {
    if (host && options.shouldBlockFaviconForHost(host)) {
      return { kind: 'inline', iconName: 'ri-link' };
    }
    return {
      kind: 'favicon',
      attach: true,
      url: url || favicon,
      host,
      favicon,
      objectFitContain: true
    };
  }
  return {
    kind: 'inline',
    iconName:
      host && options.shouldBlockFaviconForHost(host)
        ? 'ri-link'
        : 'ri-search-line',
    tone: 'subtext'
  };
}

function InlineIcon({
  options,
  name,
  tone
}: {
  options: NormalizedOptions;
  name: string;
  tone?: string;
}) {
  return (
    <span
      className="x-nt-suggestion-inline-icon"
      data-tone={tone || undefined}
      dangerouslySetInnerHTML={{
        __html: options.getRiSvg(name, 'ri-size-16')
      }}
    />
  );
}

function SuggestionIcon({
  spec,
  index,
  options,
  iconSlotRef
}: {
  spec: IconSpec;
  index: number;
  options: NormalizedOptions;
  iconSlotRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const isFavicon = spec.kind === 'favicon' && !failed;

  useLayoutEffect(() => {
    const image = imageRef.current;
    const slot =
      iconSlotRef.current as SuggestionIconSlotElement | null;
    if (slot) {
      slot._xIsFavicon = isFavicon;
    }
    if (!image || !isFavicon) {
      return;
    }
    options.applyFaviconOpticalAlignment(image);
    if (spec.attach) {
      options.attachFaviconWithFallbacks(
        image,
        spec.url || spec.favicon || '',
        spec.host || '',
        getFaviconCandidates(
          options,
          spec.url || '',
          spec.favicon || '',
          spec.host || ''
        )
      );
    }
  }, [isFavicon, options, spec]);

  return (
    <span
      ref={iconSlotRef}
      className="x-nt-suggestion-icon-slot"
      data-favicon={isFavicon ? 'true' : 'false'}
    >
      {isFavicon ? (
        <img
          ref={imageRef}
          data-x-nt-suggestion-icon="1"
          className="x-nt-suggestion-favicon"
          decoding="async"
          loading="eager"
          referrerPolicy="no-referrer"
          fetchPriority={index < 4 ? 'high' : undefined}
          data-object-fit={
            spec.objectFitContain ? 'contain' : undefined
          }
          data-fallback-icon-name={
            spec.fallbackIconName || undefined
          }
          src={spec.src}
          onError={
            spec.src && !spec.attach
              ? () => setFailed(true)
              : undefined
          }
        />
      ) : (
        <InlineIcon
          options={options}
          name={spec.fallbackIconName || spec.iconName || 'ri-link'}
          tone={spec.tone || (failed ? 'subtext' : undefined)}
        />
      )}
    </span>
  );
}

function isTopSite(suggestion: Suggestion): boolean {
  return Boolean(
    suggestion.type === 'topSite' || suggestion.isTopSite
  );
}

function canDeleteHistory(suggestion: Suggestion): boolean {
  return Boolean(
    suggestion.url &&
    (suggestion.type === 'history' || isTopSite(suggestion))
  );
}

function SearchSuggestionRow({
  runtime,
  suggestion,
  index,
  query,
  primaryHighlightIndex,
  primaryHighlightReason,
  primarySuggestion,
  onlyKeywordSuggestions,
  mergedProvider,
  last
}: {
  runtime: SuggestionsRuntime;
  suggestion: Suggestion;
  index: number;
  query: string;
  primaryHighlightIndex: number;
  primaryHighlightReason: string;
  primarySuggestion: Suggestion | null;
  onlyKeywordSuggestions: boolean;
  mergedProvider: Record<string, unknown> | null;
  last: boolean;
}) {
  const { options } = runtime;
  const itemRef = useRef<SuggestionElement>(null);
  const iconSlotRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const commandRef = useRef<HTMLSpanElement>(null);
  const historyTagRef = useRef<SuggestionActionTagElement>(null);
  const bookmarkTagRef = useRef<SuggestionActionTagElement>(null);
  const topSiteTagRef = useRef<SuggestionActionTagElement>(null);
  const actionTagsRef = useRef<HTMLDivElement>(null);
  const visitButtonRef = useRef<HTMLButtonElement>(null);
  const visitLabelRef = useRef<HTMLSpanElement>(null);
  const deleteSlotRef = useRef<HTMLDivElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const isPrimary = index === primaryHighlightIndex;
  const primarySearch =
    isPrimary && suggestion.type === 'googleSuggest';
  const localFallback = isLocalUrlSuggestion(options, suggestion);
  const searchTheme =
    primarySearch ||
    (onlyKeywordSuggestions &&
      isPrimary &&
      suggestion.type === 'newtab');
  let immediateTheme =
    options.getImmediateThemeForSuggestion(suggestion) ||
    options.defaultTheme;
  if (
    suggestion.type === 'directUrl' ||
    suggestion.type === 'browserPage' ||
    localFallback
  ) {
    immediateTheme = options.urlHighlightTheme;
  }
  if (searchTheme) {
    const accent = options.getBrandAccentForUrl(
      options.getDefaultSearchEngineThemeUrl()
    );
    if (accent) {
      immediateTheme =
        options.buildThemeFromAccent(accent, 'brand') ||
        options.defaultTheme;
      if (immediateTheme) {
        immediateTheme._xIsBrand = true;
      }
    }
  }
  const iconSpec = useMemo(
    () => getSuggestionIconSpec(options, suggestion),
    [options, suggestion]
  );
  const command = Boolean(suggestion.commandText);
  const actionModel = useMemo(
    () => createActionModel(options, {
      suggestion,
      isPrimaryHighlight: isPrimary,
      isPrimarySearchSuggest: primarySearch,
      primaryHighlightReason,
      onlyKeywordSuggestions,
      isMergedHighlight: Boolean(
        mergedProvider &&
        primarySuggestion === suggestion &&
        isPrimary
      ),
      shouldSwitchMatchedTab:
        isPrimary &&
        (
          primaryHighlightReason === 'openTab' ||
          primaryHighlightReason === 'currentOpenTab'
        ) &&
        options.shouldSwitchMatchedTabSuggestion(
          suggestion,
          index
        ),
      enterAction: 'go'
    }),
    [
      index,
      isPrimary,
      mergedProvider,
      onlyKeywordSuggestions,
      options,
      primaryHighlightReason,
      primarySearch,
      primarySuggestion,
      suggestion
    ]
  );
  const actionTagRefs = useRef<SuggestionActionTagElement[]>([]);
  const removable = canDeleteHistory(suggestion);
  const deleteTooltip = isTopSite(suggestion)
    ? options.t('search_remove_top_site_tooltip', '移除该常用')
    : options.t('search_remove_history_tooltip', '移除该历史');

  useLayoutEffect(() => {
    const item = itemRef.current;
    if (!item) {
      return;
    }
    item._xIsSearchSuggestion = true;
    item._xTheme = immediateTheme;
    item._xThemeHost =
      options.getThemeHostForSuggestion(suggestion);
    item._xIsAutocompleteTop = isPrimary;
    item._xIconWrap = iconSlotRef.current;
    item._xIconIsFavicon =
      iconSpec.kind === 'favicon' &&
      iconSlotRef.current?.getAttribute('data-favicon') === 'true';
    item._xDirectIconWrap =
      suggestion.type === 'directUrl' ||
      suggestion.type === 'browserPage'
        ? iconSlotRef.current
        : null;
    item._xTitle = command
      ? commandRef.current
      : titleRef.current;
    item._xCommandLabel = command ? commandRef.current : null;
    item._xHistoryTag = historyTagRef.current;
    item._xBookmarkTag = bookmarkTagRef.current;
    item._xTopSiteTag = topSiteTagRef.current;
    if (item._xHistoryTag) {
      item._xHistoryTag._xDefaultBg =
        'var(--x-nt-tag-bg, #F3F4F6)';
      item._xHistoryTag._xDefaultText =
        'var(--x-nt-tag-text, #6B7280)';
      item._xHistoryTag._xDefaultBorder = 'transparent';
    }
    if (item._xTopSiteTag) {
      item._xTopSiteTag._xDefaultBg =
        'var(--x-nt-tag-bg, #F3F4F6)';
      item._xTopSiteTag._xDefaultText =
        'var(--x-nt-tag-text, #6B7280)';
      item._xTopSiteTag._xDefaultBorder = 'transparent';
    }
    if (item._xBookmarkTag) {
      item._xBookmarkTag._xDefaultBg =
        'var(--x-nt-bookmark-tag-bg, #FEF3C7)';
      item._xBookmarkTag._xDefaultText =
        'var(--x-nt-bookmark-tag-text, #D97706)';
      item._xBookmarkTag._xDefaultBorder = 'transparent';
    }
    item._xTagContainer = actionTagsRef.current;
    item._xActionModel = actionModel;
    item._xHasActionTags = actionModel.hasActionTags;
    item._xVisitButton = visitButtonRef.current;
    item._xVisitButtonLabel = visitLabelRef.current;
    item._xVisitButtonAction = actionModel.visitButtonAction;
    item._xActionTags = actionTagRefs.current;
    item._xActionTags.forEach((tag) => {
      tag._xActionLabel = tag.querySelector<HTMLSpanElement>(
        '.x-nt-suggestion-action-tag__label'
      );
    });
    item._xSuggestion = suggestion;
    item._xAlwaysHideVisitButton =
      actionModel.alwaysHideVisitButton;
    item._xHasSwitchAction = actionModel.hasSwitchAction;
    item._xHistoryDeleteButton = deleteButtonRef.current;
    item._xHistoryDeleteSlot = deleteSlotRef.current;
    item._xHasHistoryDeleteButton = removable;
    options.applyThemeVariables(item, immediateTheme);
    bindTextTooltip(
      options,
      titleRef.current,
      suggestion.title || '',
      query
    );
    const urlLine = item.querySelector<HTMLElement>(
      '.x-nt-suggestion-url-line'
    );
    bindTextTooltip(options, urlLine, suggestion.url || '');

    let active = true;
    const shouldLoadTheme =
      !searchTheme &&
      !(
        onlyKeywordSuggestions &&
        suggestion.type === 'newtab'
      ) &&
      suggestion.type !== 'directUrl' &&
      suggestion.type !== 'browserPage' &&
      !localFallback;
    if (shouldLoadTheme) {
      void options.getThemeForSuggestion(suggestion).then((theme) => {
        if (!active || !item.isConnected) {
          return;
        }
        const nextTheme = resolveTheme(options, suggestion, theme);
        item._xTheme = nextTheme;
        options.applyThemeVariables(item, nextTheme);
        runtime.updateSelection(options.getSelectedIndex());
      });
    }
    return () => {
      active = false;
    };
  }, [
    actionModel,
    command,
    iconSpec.kind,
    immediateTheme,
    isPrimary,
    localFallback,
    options,
    query,
    removable,
    runtime,
    searchTheme,
    suggestion
  ]);

  const handleRowMouseEnter = (): void => {
    const item = itemRef.current;
    if (!item) {
      return;
    }
    item._xIsHovering = true;
    setIconEmphasis(item, true);
    runtime.updateSelection(options.getSelectedIndex());
    if (options.items.indexOf(item) !== options.getSelectedIndex()) {
      if (
        options.getSelectedIndex() === -1 &&
        item._xIsAutocompleteTop
      ) {
        return;
      }
      item.setAttribute('data-row-state', 'hover');
    }
  };

  const activate = (
    event: ReactMouseEvent<HTMLElement>
  ): void => {
    const item = itemRef.current;
    if (item) {
      options.onActivateSuggestion(
        suggestion,
        query,
        event.nativeEvent,
        index,
        item
      );
    }
  };

  const handleAuxClick = (
    event: ReactMouseEvent<HTMLElement>
  ): void => {
    if (event.button !== 1) {
      return;
    }
    event.preventDefault();
    activate(event);
  };

  const showDeleteTooltip = (): void => {
    if (deleteButtonRef.current) {
      options.showTopActionTooltip(
        deleteButtonRef.current,
        deleteTooltip
      );
    }
  };

  const applyDeleteHover = (): void => {
    const item = itemRef.current;
    const button = deleteButtonRef.current;
    if (!item || !button) {
      return;
    }
    const itemIndex = options.items.indexOf(item);
    const selectedIndex = options.getSelectedIndex();
    const useTheme =
      itemIndex === selectedIndex ||
      (selectedIndex === -1 && item._xIsAutocompleteTop);
    const theme = item._xTheme || options.defaultTheme;
    const modeTheme = options.getThemeForMode(theme);
    const hover = useTheme
      ? options.getHoverColors(theme)
      : options.getNeutralHoverActionColors();
    showDeleteTooltip();
    button.style.removeProperty('transform');
    button.style.setProperty(
      '--x-nt-history-delete-hover-bg',
      String(hover.bg || '')
    );
    button.style.setProperty(
      '--x-nt-history-delete-hover-border',
      String(hover.border || '')
    );
    button.style.setProperty(
      '--x-nt-history-delete-hover-color',
      String(
        useTheme
          ? modeTheme.buttonText || ''
          : 'text' in hover
            ? hover.text || ''
            : ''
      )
    );
    button.setAttribute('data-hover', 'true');
  };

  const resetDelete = (): void => {
    options.hideTopActionTooltip();
    deleteButtonRef.current?.removeAttribute('data-hover');
    deleteButtonRef.current?.style.removeProperty('transform');
  };

  const showUrl =
    (suggestion.type === 'history' && !suggestion.isTopSite) ||
    isTopSite(suggestion);

  return (
    <div
      ref={itemRef}
      id={`_x_extension_newtab_suggestion_item_${index}_2024_unique_`}
      className="x-nt-suggestion-item"
      data-last={last ? 'true' : 'false'}
      data-row-state={isPrimary ? 'active' : undefined}
      data-command-row={command ? 'true' : undefined}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={() => {
        if (itemRef.current) {
          itemRef.current._xIsHovering = false;
        }
        runtime.updateSelection(options.getSelectedIndex());
      }}
      onClick={activate}
      onAuxClick={handleAuxClick}
    >
      <div className="x-nt-suggestion-left">
        <SuggestionIcon
          spec={iconSpec}
          index={index}
          options={options}
          iconSlotRef={iconSlotRef}
        />
        <div className="x-nt-suggestion-text">
          {command && (
            <span
              ref={commandRef}
              className="x-nt-suggestion-command"
            >
              <HighlightedText
                options={options}
                text={suggestion.commandText || ''}
                query={query}
              />
            </span>
          )}
          <span
            ref={titleRef}
            className={
              command
                ? 'x-nt-suggestion-title x-nt-suggestion-command-description'
                : 'x-nt-suggestion-title'
            }
          >
            {command ? (
              options.sanitizeDisplayText(suggestion.title || '')
            ) : (
              <HighlightedText
                options={options}
                text={suggestion.title || ''}
                query={query}
              />
            )}
          </span>
          {options.isTabRankScoreDebugEnabled() &&
            Array.isArray(suggestion.reasons) &&
            suggestion.reasons
              .map((reason) => String(reason || '').trim())
              .filter(Boolean).length > 0 && (
              <span className="x-nt-suggestion-reason">
                {suggestion.reasons
                  .map((reason) => String(reason || '').trim())
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          {showUrl && (
            <span className="x-nt-suggestion-url-line">
              {String(suggestion.url || '')}
            </span>
          )}
          {suggestion.type === 'history' &&
            !suggestion.isTopSite && (
            <span
              ref={historyTagRef}
              className="x-nt-suggestion-tag"
              data-tag-type="history"
            >
              {options.t('search_tag_history', '历史')}
            </span>
          )}
          {isTopSite(suggestion) && (
            <span
              ref={topSiteTagRef}
              className="x-nt-suggestion-tag"
              data-tag-type="top-site"
            >
              {options.t('search_tag_top_site', '常用')}
            </span>
          )}
          {suggestion.type === 'bookmark' && (
            <>
              {suggestion.path && (
                <span className="x-nt-suggestion-bookmark-path">
                  {String(suggestion.path)}
                </span>
              )}
              <span
                ref={bookmarkTagRef}
                className="x-nt-suggestion-tag"
                data-tag-type="bookmark"
              >
                {options.t('search_tag_bookmark', '书签')}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        className="x-nt-suggestion-right"
        data-action-column={
          !actionModel.alwaysHideVisitButton ||
          actionModel.hasActionTags
            ? 'true'
            : undefined
        }
      >
        <div
          ref={actionTagsRef}
          className="x-nt-suggestion-action-tags"
          data-visible="false"
        >
          {actionModel.actionTags.map((tag, tagIndex) => (
            <span
              ref={(node) => {
                if (node) {
                  const actionTag =
                    node as SuggestionActionTagElement;
                  actionTagRefs.current[tagIndex] = actionTag;
                  actionTag._xAction = tag.action;
                  actionTag._xSuggestion = suggestion;
                  actionTag._xDefaultBg =
                    'var(--x-nt-tag-bg, #F3F4F6)';
                  actionTag._xDefaultText =
                    'var(--x-nt-tag-text, #6B7280)';
                  actionTag._xDefaultBorder = 'transparent';
                }
              }}
              key={`${tag.action}:${tag.keyLabel || 'Enter'}`}
              className="x-nt-suggestion-action-tag"
            >
              <span
                ref={(node) => {
                  const tagNode =
                    actionTagRefs.current[tagIndex];
                  if (tagNode) {
                    tagNode._xActionLabel = node;
                  }
                }}
                className="x-nt-suggestion-action-tag__label"
              >
                {getActionLabel(
                  runtime,
                  getModifierAction(runtime, tag.action),
                  suggestion
                )}
              </span>
              <span className="x-nt-suggestion-action-tag__key">
                {tag.keyLabel || 'Enter'}
              </span>
            </span>
          ))}
        </div>
        <button
          ref={visitButtonRef}
          type="button"
          className="x-nt-suggestion-action-button x-nt-suggestion-visit-button"
          data-visible={
            actionModel.alwaysHideVisitButton ? 'false' : 'true'
          }
          aria-label={getActionLabel(
            runtime,
            getModifierAction(
              runtime,
              actionModel.visitButtonAction
            ),
            suggestion
          )}
          onClick={(event) => {
            event.stopPropagation();
            activate(event);
          }}
          onAuxClick={(event) => {
            if (event.button !== 1) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            activate(event);
          }}
        >
          <span
            ref={visitLabelRef}
            className="x-nt-suggestion-action-button__label"
          >
            {getActionLabel(
              runtime,
              getModifierAction(
                runtime,
                actionModel.visitButtonAction
              ),
              suggestion
            )}
          </span>
          <span
            className="x-nt-suggestion-action-button__icon"
            dangerouslySetInnerHTML={{
              __html: options.getRiSvg(
                'ri-arrow-right-line',
                'ri-size-12'
              )
            }}
          />
        </button>
        {removable && (
          <div
            ref={deleteSlotRef}
            className="x-nt-history-delete-slot"
          >
            <button
              ref={deleteButtonRef}
              type="button"
              className="x-nt-history-delete-button"
              aria-label={deleteTooltip}
              dangerouslySetInnerHTML={{
                __html: options.getRiSvg(
                  'ri-delete-bin-6-line',
                  'ri-size-14'
                )
              }}
              onMouseEnter={applyDeleteHover}
              onMouseLeave={resetDelete}
              onFocus={showDeleteTooltip}
              onBlur={resetDelete}
              onPointerUp={(
                event: ReactPointerEvent<HTMLButtonElement>
              ) => {
                event.currentTarget.style.setProperty(
                  'transform',
                  'none'
                );
              }}
              onPointerCancel={(
                event: ReactPointerEvent<HTMLButtonElement>
              ) => {
                event.currentTarget.style.setProperty(
                  'transform',
                  'none'
                );
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                options.onDeleteHistory(suggestion, query);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OpenTabRow({
  runtime,
  tab,
  index,
  last
}: {
  runtime: SuggestionsRuntime;
  tab: OpenTabSuggestion;
  index: number;
  last: boolean;
}) {
  const { options } = runtime;
  const itemRef = useRef<SuggestionElement>(null);
  const iconSlotRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const switchButtonRef = useRef<HTMLButtonElement>(null);
  let host = '';
  try {
    host = tab.url ? new URL(tab.url).hostname : '';
  } catch {
    host = '';
  }
  const hasFavicon = Boolean(String(tab.favIconUrl || '').trim());
  const fallback =
    options.shouldBlockFaviconForHost(host) ||
    (!hasFavicon && options.isBrowserNewtabUrl(tab.url || ''));
  const iconSpec: IconSpec = fallback
    ? {
        kind: 'inline',
        iconName:
          getBrowserFallbackIcon(options, tab.url || '') || 'ri-link'
      }
    : {
        kind: 'favicon',
        attach: true,
        url: tab.url || '',
        favicon: tab.favIconUrl || '',
        host,
        fallbackIconName: getBrowserFallbackIcon(
          options,
          tab.url || ''
        )
      };
  const themeSuggestion: Suggestion = {
    url: tab.url || '',
    favicon: tab.favIconUrl || ''
  };
  const localFallback = isLocalUrlSuggestion(
    options,
    themeSuggestion
  );
  const immediateTheme = localFallback
    ? options.urlHighlightTheme
    : options.getImmediateThemeForSuggestion(themeSuggestion) ||
      options.defaultTheme;
  const titleText = options.sanitizeDisplayText(
    tab.title || options.t('untitled', '无标题')
  );

  useLayoutEffect(() => {
    const item = itemRef.current;
    if (!item) {
      return;
    }
    item._xIsSearchSuggestion = false;
    item._xIsAutocompleteTop = false;
    item._xTheme = immediateTheme;
    item._xThemeHost =
      options.getThemeHostForSuggestion(themeSuggestion);
    item._xIconWrap = iconSlotRef.current;
    item._xIconIsFavicon = !fallback;
    item._xTitle = titleRef.current;
    item._xSwitchButton = switchButtonRef.current;
    options.applyThemeVariables(item, immediateTheme);
    bindTextTooltip(options, titleRef.current, titleText);
    let active = true;
    if (!localFallback) {
      void options
        .getThemeForSuggestion(themeSuggestion)
        .then((theme) => {
          if (!active || !item.isConnected) {
            return;
          }
          item._xTheme = resolveTheme(
            options,
            themeSuggestion,
            theme
          );
          runtime.updateSelection(options.getSelectedIndex());
        });
    }
    return () => {
      active = false;
    };
  }, [
    fallback,
    immediateTheme,
    localFallback,
    options,
    runtime,
    themeSuggestion,
    titleText
  ]);

  const activate = (
    event: ReactMouseEvent<HTMLElement>
  ): void => {
    options.onSwitchToTab(tab, event.nativeEvent);
  };

  const handleAuxClick = (
    event: ReactMouseEvent<HTMLElement>
  ): void => {
    if (event.button !== 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    activate(event);
  };

  return (
    <div
      ref={itemRef}
      id={`_x_extension_newtab_suggestion_item_${index}_2024_unique_`}
      className="x-nt-suggestion-item"
      data-last={last ? 'true' : 'false'}
      onMouseEnter={() => {
        const item = itemRef.current;
        if (
          !item ||
          options.items.indexOf(item) === options.getSelectedIndex()
        ) {
          return;
        }
        item._xIsHovering = true;
        setIconEmphasis(item, true);
        if (
          options.getSelectedIndex() === -1 &&
          item._xIsAutocompleteTop
        ) {
          return;
        }
        const theme = item._xTheme;
        if (theme?._xIsBrand) {
          const hover = options.getHoverColors(theme);
          item.style.setProperty(
            '--x-nt-suggestion-hover-bg',
            String(hover.bg || '')
          );
          item.style.setProperty(
            '--x-nt-suggestion-hover-border',
            String(hover.border || '')
          );
        }
        item.setAttribute('data-row-state', 'hover');
      }}
      onMouseLeave={() => {
        const item = itemRef.current;
        if (
          item &&
          options.items.indexOf(item) !== options.getSelectedIndex()
        ) {
          item._xIsHovering = false;
          runtime.updateSelection(options.getSelectedIndex());
        }
      }}
      onClick={activate}
      onAuxClick={handleAuxClick}
    >
      <div className="x-nt-suggestion-left">
        <SuggestionIcon
          spec={iconSpec}
          index={index}
          options={options}
          iconSlotRef={iconSlotRef}
        />
        <span
          ref={titleRef}
          className="x-nt-suggestion-title"
        >
          {titleText}
        </span>
        {options.isTabRankScoreDebugEnabled() && (
          <span className="x-nt-tab-rank-debug">
            {options.formatTabRankDebugText(tab)}
          </span>
        )}
      </div>
      <div
        className="x-nt-suggestion-right"
        data-action-column="true"
      >
        <button
          ref={switchButtonRef}
          type="button"
          className="x-nt-tab-switch-button"
          onClick={(event) => {
            event.stopPropagation();
            activate(event);
          }}
          onAuxClick={handleAuxClick}
        >
          {options.t('switch_to_tab', '切换到标签页')}{' '}
          <span
            dangerouslySetInnerHTML={{
              __html: options.getRiSvg(
                'ri-arrow-right-line',
                'ri-size-12'
              )
            }}
          />
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  options,
  message
}: {
  options: NormalizedOptions;
  message: string;
}) {
  return (
    <div className="x-nt-empty-state">
      <span
        className="x-nt-empty-state__icon"
        dangerouslySetInnerHTML={{
          __html: options.getRiSvg(
            'ri-file-3-line',
            'ri-size-16'
          )
        }}
      />
      <span className="x-nt-empty-state__text">
        {options.sanitizeDisplayText(message)}
      </span>
    </div>
  );
}

function syncItems(options: NormalizedOptions): void {
  options.items.length = 0;
  options.container
    .querySelectorAll<SuggestionElement>('.x-nt-suggestion-item')
    .forEach((item) => options.items.push(item));
}

function createNoopController(
  rawOptions: SuggestionsViewOptions,
  legacyApi?: LegacySuggestionsApi | null
): SuggestionsViewController {
  const legacy =
    legacyApi?.createSuggestionsView?.(rawOptions) || null;
  const items = Array.isArray(rawOptions.items)
    ? rawOptions.items
    : [];
  return {
    render(payload) {
      legacy?.render(payload);
    },
    renderTabs(tabs) {
      legacy?.renderTabs(tabs);
    },
    updateSelection(index) {
      legacy?.updateSelection(index);
    },
    setOpenInCurrentTabModifierActive(active) {
      legacy?.setOpenInCurrentTabModifierActive(active);
    },
    setOpenSwitchInNewTabModifierActive(active) {
      legacy?.setOpenSwitchInNewTabModifierActive(active);
    },
    setOpenInBackgroundTabModifierActive(active) {
      legacy?.setOpenInBackgroundTabModifierActive(active);
    },
    clear() {
      legacy?.clear();
      items.length = 0;
    },
    destroy() {
      legacy?.destroy();
      items.length = 0;
    },
    getAutoHighlightIndex() {
      return legacy?.getAutoHighlightIndex() ?? -1;
    },
    markAutocompleteTop(index) {
      legacy?.markAutocompleteTop(index);
    },
    getItems() {
      return legacy?.getItems() || items;
    }
  };
}

function getSuggestionRenderIdentity(
  suggestion: Suggestion
): string {
  const matchedTabId = suggestion._xMatchedTabId;
  if (
    typeof matchedTabId === 'number' ||
    (typeof matchedTabId === 'string' && matchedTabId)
  ) {
    return `matched-tab:${String(matchedTabId)}`;
  }
  const type = String(suggestion.type || 'suggestion');
  const url = String(suggestion.url || '');
  if (url) {
    return `${type}:url:${url}`;
  }
  const commandText = String(suggestion.commandText || '');
  if (commandText) {
    return `${type}:command:${commandText}`;
  }
  const provider = suggestion.provider;
  const providerKey =
    provider && typeof provider === 'object'
      ? String(
          provider.key ||
          provider.id ||
          provider.template ||
          provider.name ||
          ''
        )
      : '';
  const searchQuery = String(suggestion.searchQuery || '');
  if (providerKey || searchQuery) {
    return `${type}:provider:${providerKey}:query:${searchQuery}`;
  }
  return `${type}:title:${String(suggestion.title || '')}`;
}

function getStableRenderKeys<T>(
  values: T[],
  getIdentity: (value: T) => string
): string[] {
  const occurrences = new Map<string, number>();
  return values.map((value) => {
    const identity = getIdentity(value);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    return `${identity}:occurrence:${occurrence}`;
  });
}

export function createSuggestionsView(
  rawOptions: SuggestionsViewOptions = {},
  legacyApi?: LegacySuggestionsApi | null
): SuggestionsViewController {
  const normalizedOptions = normalizeOptions(rawOptions);
  if (!normalizedOptions) {
    return createNoopController(rawOptions, legacyApi);
  }
  const options: NormalizedOptions = normalizedOptions;
  const root: Root = createRoot(options.container);
  options.container.setAttribute(
    'data-react-island',
    'suggestions'
  );
  let destroyed = false;
  const runtime: SuggestionsRuntime = {
    options,
    modifiers: {
      openInCurrentTab: false,
      openSwitchInNewTab: false,
      openInBackgroundTab: false
    },
    updateSelection(index) {
      updateSelectionForRuntime(runtime, index);
    }
  };

  function clear(): void {
    if (destroyed) {
      return;
    }
    options.hideTopActionTooltip();
    flushSync(() => root.render(null));
    options.items.length = 0;
    options.onSetSelectedIndex(-1);
    options.setSuggestionsVisible(false);
  }

  function render(
    payload: SuggestionsRenderPayload = {}
  ): void {
    if (destroyed) {
      return;
    }
    const suggestions = Array.isArray(payload.suggestions)
      ? payload.suggestions
      : [];
    const query = String(payload.query || '');
    const primaryHighlightIndex =
      Number.isInteger(payload.primaryHighlightIndex)
        ? Number(payload.primaryHighlightIndex)
        : -1;
    if (!payload.canAppend) {
      options.onSetSelectedIndex(-1);
    }
    if (suggestions.length === 0 && payload.emptyMessage) {
      flushSync(() => {
        root.render(
          <EmptyState
            key="empty"
            options={options}
            message={payload.emptyMessage || ''}
          />
        );
      });
      options.items.length = 0;
      options.onSetSelectedIndex(-1);
      options.setSuggestionsVisible(true);
      return;
    }
    const renderKeys = getStableRenderKeys(
      suggestions,
      getSuggestionRenderIdentity
    );
    flushSync(() => {
      root.render(
        suggestions.map((suggestion, index) => (
          <SearchSuggestionRow
            key={renderKeys[index]}
            runtime={runtime}
            suggestion={suggestion}
            index={index}
            query={query}
            primaryHighlightIndex={primaryHighlightIndex}
            primaryHighlightReason={String(
              payload.primaryHighlightReason || 'none'
            )}
            primarySuggestion={payload.primarySuggestion || null}
            onlyKeywordSuggestions={Boolean(
              payload.onlyKeywordSuggestions
            )}
            mergedProvider={payload.mergedProvider || null}
            last={index === suggestions.length - 1}
          />
        ))
      );
    });
    syncItems(options);
    runtime.updateSelection(options.getSelectedIndex());
  }

  function renderTabs(
    tabList: OpenTabSuggestion[] = []
  ): void {
    if (destroyed) {
      return;
    }
    const tabs = Array.isArray(tabList)
      ? tabList.slice(
          0,
          Math.max(1, options.openTabSuggestionLimit)
        )
      : [];
    tabs.forEach((tab) => {
      if (tab.favIconUrl) {
        options.preloadIcon(
          String(tab.favIconUrl),
          String(tab.url || '')
        );
      }
    });
    const renderKeys = getStableRenderKeys(
      tabs,
      (tab) =>
        typeof tab.id === 'number'
          ? `tab:id:${tab.id}`
          : `tab:url:${String(tab.url || '')}:title:${String(
              tab.title || ''
            )}`
    );
    flushSync(() => {
      root.render(
        tabs.map((tab, index) => (
          <OpenTabRow
            key={renderKeys[index]}
            runtime={runtime}
            tab={tab}
            index={index}
            last={index === tabs.length - 1}
          />
        ))
      );
    });
    syncItems(options);
    options.onSetSelectedIndex(-1);
    runtime.updateSelection(-1);
    options.setSuggestionsVisible(tabs.length > 0);
  }

  function setModifier(
    key: keyof ModifierState,
    active: boolean
  ): void {
    const next = Boolean(active);
    if (runtime.modifiers[key] === next) {
      return;
    }
    runtime.modifiers[key] = next;
    syncModifierLabels(runtime);
  }

  return {
    render,
    renderTabs,
    updateSelection(index) {
      runtime.updateSelection(index);
    },
    setOpenInCurrentTabModifierActive(active) {
      setModifier('openInCurrentTab', active);
    },
    setOpenSwitchInNewTabModifierActive(active) {
      setModifier('openSwitchInNewTab', active);
    },
    setOpenInBackgroundTabModifierActive(active) {
      setModifier('openInBackgroundTab', active);
    },
    clear,
    destroy() {
      if (destroyed) {
        return;
      }
      options.hideTopActionTooltip();
      flushSync(() => root.unmount());
      destroyed = true;
      options.items.length = 0;
      options.onSetSelectedIndex(-1);
      options.setSuggestionsVisible(false);
    },
    getAutoHighlightIndex() {
      return options.items.findIndex(
        (item) => Boolean(item?._xIsAutocompleteTop)
      );
    },
    markAutocompleteTop(index) {
      options.items.forEach((item, itemIndex) => {
        item._xIsAutocompleteTop = itemIndex === index;
      });
    },
    getItems() {
      return options.items;
    }
  };
}

export function createSuggestionsViewApi(
  legacyApi?: LegacySuggestionsApi | null
) {
  return Object.freeze({
    implementation: 'react',
    createSuggestionsView(options?: SuggestionsViewOptions) {
      return createSuggestionsView(options, legacyApi);
    }
  });
}
