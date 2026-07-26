const assert = require('assert');
const fs = require('fs');
const path = require('path');
const faviconTheme = require('../src/newtab/favicon-theme.js');

require('../src/shared/suggestion-action-model.js');
require('../src/newtab/suggestions-view.js');
const suggestionsView = globalThis.LumnoNewtabSuggestionsView;
const repoRoot = path.resolve(__dirname, '..');

function getRuleBlock(source, pattern, message) {
  const match = source.match(pattern);
  assert.ok(match, message);
  return match[0];
}

class FakeStyle {
  constructor() {
    this.props = new Map();
  }

  setProperty(name, value) {
    this.props.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.props.get(name) || '';
  }

  removeProperty(name) {
    this.props.delete(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.childNodes = [];
    this.children = this.childNodes;
    this.attributes = new Map();
    this.style = new FakeStyle();
    this.parentNode = null;
    this.isConnected = false;
    this.className = '';
    this.eventListeners = new Map();
    this._textContent = '';
    this._innerHTML = '';
  }

  appendChild(child) {
    this.childNodes.push(child);
    child.parentNode = this;
    child.setConnected(this.isConnected);
    return child;
  }

  replaceChild(nextChild, previousChild) {
    const index = this.childNodes.indexOf(previousChild);
    if (index >= 0) {
      this.childNodes[index] = nextChild;
      previousChild.parentNode = null;
      previousChild.setConnected(false);
      nextChild.parentNode = this;
      nextChild.setConnected(this.isConnected);
    }
    return previousChild;
  }

  setConnected(value) {
    this.isConnected = Boolean(value);
    this.childNodes.forEach((child) => {
      if (child && typeof child.setConnected === 'function') {
        child.setConnected(this.isConnected);
      }
    });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(name, handler) {
    if (!this.eventListeners.has(name)) {
      this.eventListeners.set(name, []);
    }
    this.eventListeners.get(name).push(handler);
  }

  set textContent(value) {
    this._textContent = String(value || '');
    this.childNodes.length = 0;
  }

  get textContent() {
    if (this.childNodes.length > 0) {
      return this.childNodes.map((child) => child.textContent || '').join('');
    }
    return this._textContent;
  }

  set innerHTML(value) {
    this._innerHTML = String(value || '');
    this.childNodes.length = 0;
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

class FakeTextNode extends FakeElement {
  constructor(text) {
    super('#text');
    this._textContent = String(text || '');
  }

  set textContent(value) {
    this._textContent = String(value || '');
  }

  get textContent() {
    return this._textContent;
  }
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    createTextNode(text) {
      return new FakeTextNode(text);
    }
  };
}

function triggerEvent(element, name, event) {
  const handlers = element && element.eventListeners ? element.eventListeners.get(name) : null;
  if (!handlers) {
    return;
  }
  handlers.forEach((handler) => handler.call(element, event || {}));
}

function findDescendantByClass(root, className) {
  if (!root) {
    return null;
  }
  if (root.className === className) {
    return root;
  }
  const children = Array.isArray(root.childNodes) ? root.childNodes : [];
  for (const child of children) {
    const match = findDescendantByClass(child, className);
    if (match) {
      return match;
    }
  }
  return null;
}

function getHostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

function shouldBlockFaviconForHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.endsWith('.local');
}

function isLocalNetworkHost(hostname) {
  return shouldBlockFaviconForHost(hostname);
}

function applyThemeVariables(target, theme, defaultTheme) {
  const resolvedTheme = faviconTheme.getThemeForMode(theme, {
    defaultTheme,
    isDarkMode: () => false
  });
  if (!resolvedTheme || !resolvedTheme._xIsBrand) {
    target.style.setProperty('--x-nt-suggestion-active-bg', 'var(--x-nt-hover-bg, #F3F4F6)');
    target.style.setProperty('--x-nt-suggestion-active-border', 'transparent');
    return;
  }
  target.style.setProperty('--x-nt-suggestion-active-bg', resolvedTheme.highlightBg);
  target.style.setProperty('--x-nt-suggestion-active-border', resolvedTheme.highlightBorder);
}

function testSiteSearchProviderIconsUsePageFaviconCandidates() {
  const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.ok(
    /function getProviderIcon\(provider\)[\s\S]*getPageFaviconCandidateUrl\(providerIconPageUrl\)/.test(newtabJs),
    'newtab site-search provider icons should convert proxy icon URLs into page favicon candidates'
  );
  assert.ok(
    /function getProviderFaviconPageUrl\(provider\)[\s\S]*return `\$\{parsed\.origin\}\/`;/.test(newtabJs),
    'newtab site-search provider icons should use the provider origin instead of a synthetic search query'
  );
  assert.ok(
    /function getProviderIcon\(provider\)[\s\S]*getPageFaviconCandidateUrl\(providerIconPageUrl\)/.test(overlayJs),
    'overlay site-search provider icons should convert proxy icon URLs into page favicon candidates'
  );
  assert.ok(
    /function getProviderFaviconPageUrl\(provider\)[\s\S]*return `\$\{parsed\.origin\}\/`;/.test(overlayJs),
    'overlay site-search provider icons should use the provider origin instead of a synthetic search query'
  );
}

function testSiteSearchTabHintRequiresExplicitTrigger() {
  const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.ok(
    /const resolvedProvider = siteSearchTrigger;/.test(newtabJs),
    'newtab Tab site-search hint should be driven only by explicit provider triggers'
  );
  assert.ok(
    /const resolvedProvider = siteSearchTrigger;/.test(overlayJs),
    'overlay Tab site-search hint should be driven only by explicit provider triggers'
  );
  assert.ok(
    !/const resolvedProvider = mergedProvider \|\| siteSearchTrigger;/.test(newtabJs),
    'newtab should not infer the Tab site-search hint from the highlighted result provider'
  );
  assert.ok(
    !/const resolvedProvider = mergedProvider \|\| siteSearchTrigger;/.test(overlayJs),
    'overlay should not infer the Tab site-search hint from the highlighted result provider'
  );
}

function testSuggestionActionColumnAlignmentContract() {
  const overlayCss = fs.readFileSync(path.join(repoRoot, 'src/overlay/suggestions-view.css'), 'utf8');
  const newtabHtml = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.html'), 'utf8');
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  const newtabSuggestionsJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/suggestions-view.js'), 'utf8');
  const onboardingJs = fs.readFileSync(path.join(repoRoot, 'src/onboarding/onboarding.js'), 'utf8');

  assert.match(
    overlayCss,
    /--x-ov-suggestion-action-column-width:\s*200px;/,
    'overlay suggestions should define enough max action-column width for search-engine action tags with Enter keycaps'
  );
  const overlayActionColumnRule = getRuleBlock(
    overlayCss,
    /\.x-ov-suggestion-right\[data-action-column="true"\]\s*\{[\s\S]*?\}/,
    'overlay suggestions should reserve the action column only on marked right-side containers'
  );
  assert.match(
    overlayActionColumnRule,
    /flex:\s*0 1 auto;/,
    'overlay action column should shrink to compact actions instead of reserving empty space'
  );
  assert.match(
    overlayActionColumnRule,
    /max-width:\s*min\(56%,\s*var\(--x-ov-suggestion-action-column-width,\s*200px\)\);/,
    'overlay action column should cap long action tags without forcing short actions to reserve a blank column'
  );
  assert.doesNotMatch(
    overlayActionColumnRule,
    /(^|\n)\s*width:\s*min\(56%,\s*var\(--x-ov-suggestion-action-column-width,\s*200px\)\);/,
    'overlay action column should not reserve the full capped width when compact actions are visible'
  );
  assert.match(
    overlayActionColumnRule,
    /justify-content:\s*flex-end;/,
    'overlay action column should right-align compact action groups'
  );
  assert.match(
    overlayCss,
    /\.x-ov-suggestion-action-button\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?max-width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?white-space:\s*nowrap;/,
    'overlay action buttons should stay inside the capped action column'
  );
  assert.match(
    overlayCss,
    /\.x-ov-suggestion-action-button \.x-ov-inline-label\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
    'overlay action button labels should ellipsize instead of pushing the column left'
  );
  const overlayActionButtonLabelRule = getRuleBlock(
    overlayCss,
    /\.x-ov-suggestion-action-button \.x-ov-inline-label\s*\{[\s\S]*?\}/,
    'overlay action button labels should have a dedicated line-height rule'
  );
  assert.match(
    overlayActionButtonLabelRule,
    /line-height:\s*1\.35;/,
    'overlay action button labels should reserve enough vertical glyph space'
  );
  assert.match(
    overlayCss,
    /\.x-ov-suggestion-right\[data-action-column="true"\] \.x-ov-suggestion-action-button\[data-visible="true"\]\s*\{[\s\S]*?max-width:\s*100%;/,
    'overlay visible action buttons should cap at the compact column instead of forcing a full-width label/arrow gap'
  );
  assert.match(
    overlayCss,
    /\.x-ov-suggestion-right\[data-action-column="true"\] \.x-ov-suggestion-action-tags\[data-visible="true"\],\s*[\s\S]*?\.x-ov-suggestion-right\[data-action-column="true"\] \.x-ov-suggestion-action-button\[data-visible="true"\]\s*\{[\s\S]*?flex:\s*0 1 auto;[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/,
    'overlay action tags and buttons should shrink inside the capped action column without stretching away from the right edge'
  );
  assert.match(
    overlayCss,
    /\.x-ov-suggestion-right\[data-action-column="true"\] \.x-ov-suggestion-action-tags\[data-visible="true"\] \.x-ov-action-tag\s*\{[\s\S]*?max-width:\s*100%;/,
    'overlay action tags should ellipsize within the remaining right-aligned space'
  );
  const overlayActionTagLabelRule = getRuleBlock(
    overlayCss,
    /\.x-ov-action-tag__label\s*\{[\s\S]*?\}/,
    'overlay action tag labels should have a dedicated line-height rule'
  );
  assert.match(
    overlayActionTagLabelRule,
    /line-height:\s*1\.35;/,
    'overlay action tag labels should reserve enough vertical glyph space'
  );
  assert.match(
    overlayCss,
    /\.x-ov-action-tag__key\s*\{[\s\S]*?flex:\s*0 0 auto;/,
    'overlay action tag keycaps should not shrink when the action label is long'
  );
  assert.doesNotMatch(
    overlayCss,
    /\.x-ov-suggestion-right\[data-action-column="true"\][^{]+\.x-ov-suggestion-action-button[^{]*\{[\s\S]*?justify-content:\s*space-between;/,
    'overlay action buttons should not split label and arrow across the full action column'
  );

  assert.match(
    newtabHtml,
    /--x-nt-suggestion-action-column-width:\s*200px;/,
    'newtab suggestions should define enough max action-column width for search-engine action tags with Enter keycaps'
  );
  const newtabActionColumnRule = getRuleBlock(
    newtabHtml,
    /\.x-nt-suggestion-right\[data-action-column="true"\]\s*\{[\s\S]*?\}/,
    'newtab suggestions should reserve the action column only on marked right-side containers'
  );
  assert.match(
    newtabActionColumnRule,
    /flex:\s*0 1 auto;/,
    'newtab action column should shrink to compact actions instead of reserving empty space'
  );
  assert.match(
    newtabActionColumnRule,
    /max-width:\s*min\(56%,\s*var\(--x-nt-suggestion-action-column-width,\s*200px\)\);/,
    'newtab action column should cap long action tags without forcing short actions to reserve a blank column'
  );
  assert.doesNotMatch(
    newtabActionColumnRule,
    /(^|\n)\s*width:\s*min\(56%,\s*var\(--x-nt-suggestion-action-column-width,\s*200px\)\);/,
    'newtab action column should not reserve the full capped width when compact actions are visible'
  );
  assert.match(
    newtabActionColumnRule,
    /justify-content:\s*flex-end;/,
    'newtab action column should right-align compact action groups'
  );
  assert.match(
    newtabHtml,
    /\.x-nt-suggestion-action-button\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?max-width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?white-space:\s*nowrap;/,
    'newtab action buttons should stay inside the capped action column'
  );
  assert.match(
    newtabHtml,
    /\.x-nt-suggestion-action-button__label\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
    'newtab action button labels should ellipsize instead of pushing the column left'
  );
  const newtabActionButtonLabelRule = getRuleBlock(
    newtabHtml,
    /\.x-nt-suggestion-action-button__label\s*\{[\s\S]*?\}/,
    'newtab action button labels should have a dedicated line-height rule'
  );
  assert.match(
    newtabActionButtonLabelRule,
    /line-height:\s*1\.35;/,
    'newtab action button labels should reserve enough vertical glyph space'
  );
  assert.match(
    newtabHtml,
    /\.x-nt-suggestion-right\[data-action-column="true"\] \.x-nt-suggestion-action-button\[data-visible="true"\][\s\S]*?\{[\s\S]*?max-width:\s*100%;/,
    'newtab visible action buttons should cap at the compact column instead of forcing a full-width label/arrow gap'
  );
  assert.match(
    newtabHtml,
    /\.x-nt-suggestion-right\[data-action-column="true"\] \.x-nt-suggestion-action-tags\[data-visible="true"\],\s*[\s\S]*?\.x-nt-suggestion-right\[data-action-column="true"\] \.x-nt-suggestion-action-button\[data-visible="true"\]\s*\{[\s\S]*?flex:\s*0 1 auto;[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/,
    'newtab action tags and buttons should shrink inside the capped action column without stretching away from the right edge'
  );
  assert.match(
    newtabHtml,
    /\.x-nt-suggestion-right\[data-action-column="true"\] \.x-nt-suggestion-action-tags\[data-visible="true"\] \.x-nt-suggestion-action-tag\s*\{[\s\S]*?max-width:\s*100%;/,
    'newtab action tags should ellipsize within the remaining right-aligned space'
  );
  const newtabActionTagLabelRule = getRuleBlock(
    newtabHtml,
    /\.x-nt-suggestion-action-tag__label\s*\{[\s\S]*?\}/,
    'newtab action tag labels should have a dedicated line-height rule'
  );
  assert.match(
    newtabActionTagLabelRule,
    /line-height:\s*1\.35;/,
    'newtab action tag labels should reserve enough vertical glyph space'
  );
  assert.match(
    newtabHtml,
    /\.x-nt-suggestion-action-tag__key\s*\{[\s\S]*?flex:\s*0 0 auto;/,
    'newtab action tag keycaps should not shrink when the action label is long'
  );
  assert.doesNotMatch(
    newtabHtml,
    /\.x-nt-suggestion-right\[data-action-column="true"\][^{]+(?:\.x-nt-suggestion-action-button|\.x-nt-tab-switch-button)[^{]*\{[\s\S]*?justify-content:\s*space-between;/,
    'newtab action buttons should not split label and arrow across the full action column'
  );

  assert.ok(
    (overlayJs.match(/setAttribute\('data-action-column', 'true'\)/g) || []).length >= 3,
    'overlay render paths with actions should mark their right-side action column'
  );
  assert.match(
    overlayJs,
    /if \(!itemActionModel\.alwaysHideVisitButton \|\| itemActionModel\.hasActionTags\) \{\s*rightSide\.setAttribute\('data-action-column', 'true'\);/,
    'overlay search results should not reserve action-column space for rows with no actions'
  );
  assert.ok(
    (newtabSuggestionsJs.match(/setAttribute\('data-action-column', 'true'\)/g) || []).length >= 2,
    'newtab render paths with actions should mark their right-side action column'
  );
  assert.match(
    newtabSuggestionsJs,
    /if \(!itemActionModel\.alwaysHideVisitButton \|\| itemActionModel\.hasActionTags\) \{\s*rightSide\.setAttribute\('data-action-column', 'true'\);/,
    'newtab search results should not reserve action-column space for rows with no actions'
  );
  assert.ok(
    (onboardingJs.match(/setAttribute\('data-action-column', 'true'\)/g) || []).length >= 3,
    'onboarding previews should use the same marked action column as production suggestions'
  );
}

function testHistoryDeleteEntrypointsUseNonBubblingDeleteAction() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  const newtabSuggestionsJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/suggestions-view.js'), 'utf8');

  assert.match(
    newtabSuggestionsJs,
    /function bindHistoryDeleteButtonEvents\(button,\s*item,\s*suggestion,\s*query,\s*tooltipText\)[\s\S]*?button\.addEventListener\('click', function\(event\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?onDeleteHistory\(suggestion,\s*query\);/,
    'newtab history delete should prevent row activation and call the shared delete callback'
  );
  assert.match(
    newtabSuggestionsJs,
    /function createHistoryDeleteControl\(suggestion,\s*item,\s*query\)[\s\S]*?bindHistoryDeleteButtonEvents\(button,\s*item,\s*suggestion,\s*query,\s*tooltipText\);/,
    'newtab history delete control creation should route events through the shared binder'
  );
  assert.match(
    overlayJs,
    /function bindHistoryDeleteButtonEvents\(button,\s*item,\s*suggestion,\s*tooltipText\)[\s\S]*?button\.addEventListener\('click', function\(event\) \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?deleteHistorySuggestionUrl\(suggestion\);/,
    'overlay history delete should prevent row activation, delete the URL, and refresh suggestions'
  );
  assert.match(
    overlayJs,
    /function deleteHistorySuggestionUrl\(suggestion\)[\s\S]*?action:\s*'deleteHistoryUrl'[\s\S]*?refreshOverlaySuggestionsAfterHistoryDelete\(\);/,
    'overlay history delete should refresh suggestions after the background confirms deletion'
  );
}

function testOverlayTruncatedTitleCursorTooltipContract() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /const suggestionTitleCursorTooltipController = window\.LumnoCursorTooltip[\s\S]*?LumnoCursorTooltip\.createController/,
    'overlay should create a cursor tooltip controller for truncated suggestion titles'
  );
  assert.match(
    overlayJs,
    /function isSuggestionTitleOverflowing\(title\)[\s\S]*?scrollWidth[\s\S]*?clientWidth/,
    'overlay should check actual rendered overflow before showing title detail tooltip'
  );
  assert.match(
    overlayJs,
    /function renderSuggestionTitleTooltipContent\(element,\s*text,\s*query\)[\s\S]*?setProtectedHighlightedText\(element,\s*text,\s*query/,
    'overlay title tooltip content should reuse matched-query highlighting'
  );
  assert.match(
    overlayJs,
    /bindSuggestionTitleCursorTooltip\(title,\s*suggestion,\s*query\);/,
    'overlay should bind cursor tooltip behavior to rendered suggestion titles'
  );
  assert.match(
    overlayJs,
    /function getSuggestionTextCursorTooltipOptions\(extraOptions\)[\s\S]*?shouldShow:\s*isSuggestionTitleOverflowing[\s\S]*?preserveVisibleOnTargetSwitch:\s*true/,
    'overlay shared text tooltip options should show only for overflow and switch without replaying the reveal animation'
  );
  assert.match(
    overlayJs,
    /function bindSuggestionUrlCursorTooltip\(urlLine,\s*url\)[\s\S]*?getSuggestionTextCursorTooltipOptions\(\)/,
    'overlay should bind URL cursor tooltips that show only for truncated URL text and switch without replaying the reveal animation'
  );
  assert.match(
    overlayJs,
    /function buildUrlLine\(url\)[\s\S]*?bindSuggestionUrlCursorTooltip\(urlLine,\s*url\);/,
    'overlay URL rows should bind their own cursor tooltip'
  );
}

async function testLocalUrlSuggestionUsesFallbackTheme() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const urlHighlightTheme = faviconTheme.createUrlHighlightTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    isLocalNetworkHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    defaultTheme,
    urlHighlightTheme
  });

  view.render({
    query: '127.0.0.1',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'topSite',
    suggestions: [{
      type: 'topSite',
      title: 'Lumno',
      url: 'http://127.0.0.1:4321/',
      isTopSite: true,
      favicon: ''
    }]
  });
  view.updateSelection(-1);
  await Promise.resolve();

  const item = view.getItems()[0];
  assert.ok(item, 'local URL suggestion should render');
  assert.strictEqual(
    item._xTheme,
    urlHighlightTheme,
    'local URL suggestions should use the URL fallback highlight theme'
  );
  assert.strictEqual(
    item.style.getPropertyValue('--x-nt-suggestion-active-bg'),
    urlHighlightTheme.highlightBg,
    'local URL active row should use the fallback theme highlight background'
  );
}

async function testDirectUrlSuggestionUsesFaviconWhenAvailable() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const attached = [];

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    formatMessage: (key, fallback, params) => String(fallback || key).replace('{name}', params && params.name ? params.name : ''),
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    isLocalNetworkHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    getChromeFaviconUrl: (url) => `chrome://favicon2/?pageUrl=${encodeURIComponent(url)}&size=128`,
    attachFaviconWithFallbacks: (img, url, host, options) => {
      attached.push({
        img,
        url,
        host,
        primaryUrl: options && options.primaryUrl,
        browserUrl: options && options.browserUrl
      });
    },
    defaultTheme
  });

  view.render({
    query: '192.168.1.8',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'navigation',
    suggestions: [{
      type: 'directUrl',
      title: '打开 http://192.168.1.8/',
      url: 'http://192.168.1.8/',
      favicon: 'chrome-extension://abc/_favicon/?pageUrl=http%3A%2F%2F192.168.1.8%2F&size=128'
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item, 'direct URL suggestion should render');
  assert.strictEqual(item._xIconIsFavicon, true, 'direct URL suggestion with favicon should render an image icon');
  assert.strictEqual(attached.length, 1, 'direct URL favicon should be attached through the fallback chain');
  assert.strictEqual(attached[0].url, 'http://192.168.1.8/');
  assert.strictEqual(attached[0].host, '192.168.1.8');
  assert.strictEqual(
    attached[0].primaryUrl,
    'chrome-extension://abc/_favicon/?pageUrl=http%3A%2F%2F192.168.1.8%2F&size=128'
  );
  assert.strictEqual(
    attached[0].browserUrl,
    'chrome://favicon2/?pageUrl=http%3A%2F%2F192.168.1.8%2F&size=128'
  );
}

async function testTruncatedSuggestionTitleUsesCursorTooltipWithHighlight() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const tooltipBindings = [];

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    formatMessage: (key, fallback, params) => String(fallback || key).replace('{name}', params && params.name ? params.name : ''),
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    isLocalNetworkHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    bindCursorTooltip: (target, getText, options) => {
      tooltipBindings.push({ target, getText, options });
      return target;
    },
    defaultTheme
  });

  view.render({
    query: '我觉得',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'topSite',
    suggestions: [{
      type: 'history',
      title: 'X 上的 TenSteps：“肥水不流外人田，我觉得可以稍微再抽象一点”',
      url: 'https://x.com/example/status/1',
      favicon: ''
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item && item._xTitle, 'history suggestion title should render');
  assert.strictEqual(tooltipBindings.length, 2, 'search suggestion title and URL should bind separate cursor tooltips');
  const binding = tooltipBindings.find((entry) => entry.target === item._xTitle);
  assert.ok(binding, 'cursor tooltip should bind to the title text node');
  assert.strictEqual(binding.options.deferHideVisibility, true, 'title tooltip should defer hide so adjacent URL handoff does not animate');
  assert.strictEqual(binding.options.preserveVisibleOnTargetSwitch, true, 'title tooltip should preserve visibility during text-target switching');
  assert.strictEqual(
    binding.getText(item._xTitle),
    'X 上的 TenSteps：“肥水不流外人田，我觉得可以稍微再抽象一点”',
    'cursor tooltip should expose the full untruncated title'
  );
  item._xTitle.clientWidth = 160;
  item._xTitle.scrollWidth = 320;
  assert.strictEqual(
    binding.options.shouldShow(item._xTitle),
    true,
    'cursor tooltip should show only when the rendered title is truncated'
  );
  item._xTitle.scrollWidth = 160;
  assert.strictEqual(
    binding.options.shouldShow(item._xTitle),
    false,
    'cursor tooltip should stay hidden when the full title fits'
  );

  const tooltipContent = document.createElement('div');
  binding.options.renderContent(tooltipContent, binding.getText(item._xTitle));
  const mark = tooltipContent.childNodes.find((child) => child.tagName === 'MARK');
  assert.ok(mark, 'cursor tooltip detail should include a mark for the matched query');
  assert.strictEqual(mark.textContent, '我觉得', 'cursor tooltip mark should preserve the matched query text');
  assert.strictEqual(
    tooltipContent.textContent,
    'X 上的 TenSteps：“肥水不流外人田，我觉得可以稍微再抽象一点”',
    'cursor tooltip detail should render the complete title text'
  );

  const urlLine = findDescendantByClass(item, 'x-nt-suggestion-url-line');
  assert.ok(urlLine, 'history suggestion URL line should render');
  const urlBinding = tooltipBindings.find((entry) => entry.target === urlLine);
  assert.ok(urlBinding, 'cursor tooltip should bind to the URL text node');
  assert.strictEqual(urlBinding.options.deferHideVisibility, true, 'URL tooltip should defer hide so adjacent title handoff does not animate');
  assert.strictEqual(urlBinding.options.preserveVisibleOnTargetSwitch, true, 'URL tooltip should preserve visibility during text-target switching');
  assert.strictEqual(
    urlBinding.getText(urlLine),
    'https://x.com/example/status/1',
    'URL cursor tooltip should expose the full URL'
  );
  urlLine.clientWidth = 96;
  urlLine.scrollWidth = 220;
  assert.strictEqual(
    urlBinding.options.shouldShow(urlLine),
    true,
    'URL cursor tooltip should show only when the rendered URL is truncated'
  );
  urlLine.scrollWidth = 96;
  assert.strictEqual(
    urlBinding.options.shouldShow(urlLine),
    false,
    'URL cursor tooltip should stay hidden when the full URL fits'
  );
}

async function testAppendRenderKeepsOnlyFinalSuggestionMarkedLast() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    defaultTheme
  });

  const suggestions = Array.from({ length: 7 }, (_, index) => ({
    type: 'history',
    title: `Result ${index + 1}`,
    url: `https://example.com/${index + 1}`,
    favicon: ''
  }));

  view.render({
    query: 'result',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'default',
    suggestions: suggestions.slice(0, 6)
  });

  assert.strictEqual(view.getItems()[5].getAttribute('data-last'), 'true');

  view.render({
    query: 'result',
    canAppend: true,
    startIndex: 6,
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'default',
    suggestions
  });

  assert.strictEqual(view.getItems().length, 7, 'append render should create the seventh suggestion');
  assert.strictEqual(
    view.getItems()[5].getAttribute('data-last'),
    'false',
    'append render should clear data-last from the previous final suggestion'
  );
  assert.strictEqual(
    view.getItems()[6].getAttribute('data-last'),
    'true',
    'append render should mark only the true final suggestion as last'
  );
}

async function testBrowserNewtabSuggestionUsesFallbackIconWhenFaviconMissing() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const attached = [];
  const fallbackImages = [];

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: (iconName) => iconName,
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    getChromeFaviconUrl: (url) => `chrome://favicon2/?pageUrl=${encodeURIComponent(url)}&size=128`,
    applyFallbackIcon: (img) => {
      fallbackImages.push(img);
      if (img) {
        img.setAttribute('data-fallback-icon', 'true');
      }
    },
    attachFaviconWithFallbacks: (img, url, host, options) => {
      attached.push({ img, url, host, browserUrl: options && options.browserUrl });
    },
    defaultTheme
  });

  view.renderTabs([{
    title: '新标签页',
    url: 'chrome://newtab/',
    favIconUrl: ''
  }]);

  const item = view.getItems()[0];
  assert.ok(item, 'tab suggestion should render');
  assert.strictEqual(item._xIconIsFavicon, false, 'new-tab suggestion should render an inline fallback icon');
  assert.strictEqual(attached.length, 0, 'new-tab suggestion should not request a browser favicon when none exists');
  assert.strictEqual(fallbackImages.length, 0, 'new-tab suggestion should not rely on the image fallback pipeline');
  assert.ok(item._xIconWrap, 'new-tab suggestion should render an icon slot');
  assert.strictEqual(item._xIconWrap.childNodes[0].tagName, 'SPAN');
  assert.strictEqual(item._xIconWrap.childNodes[0].innerHTML, 'ri-link');
}

async function testBrowserPageTabUsesBrowserPageFaviconPrimaryCandidate() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const attached = [];
  const browserPageIcon = 'chrome-extension://abc/_favicon/?pageUrl=chrome%3A%2F%2Fextensions%2F&size=128';

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    getChromeFaviconUrl: (url) => `chrome://favicon2/?pageUrl=${encodeURIComponent(url)}&size=128`,
    getBrowserPageFaviconUrl: () => browserPageIcon,
    attachFaviconWithFallbacks: (img, url, host, options) => {
      attached.push({
        img,
        url,
        host,
        primaryUrl: options && options.primaryUrl,
        browserUrl: options && options.browserUrl
      });
    },
    defaultTheme
  });

  view.renderTabs([{
    title: '扩展程序',
    url: 'chrome://extensions/',
    favIconUrl: browserPageIcon
  }]);

  const item = view.getItems()[0];
  assert.ok(item, 'browser page tab suggestion should render');
  assert.strictEqual(item._xIconIsFavicon, true, 'browser page tab should try the favicon chain first');
  assert.strictEqual(attached.length, 1, 'browser page tab favicon should be attached through the fallback chain');
  assert.strictEqual(
    attached[0].primaryUrl,
    browserPageIcon,
    'browser page tabs should keep the extension _favicon URL as the primary favicon candidate'
  );
  assert.strictEqual(
    attached[0].browserUrl,
    'chrome://favicon2/?pageUrl=chrome%3A%2F%2Fextensions%2F&size=128',
    'browser page tabs should keep chrome://favicon2 as a fallback candidate'
  );
}

async function testBrowserPageSuggestionUsesBrowserPageFaviconWhenFaviconMissing() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const attached = [];

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: (iconName) => iconName,
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    getChromeFaviconUrl: (url) => `chrome://favicon2/?pageUrl=${encodeURIComponent(url)}&size=128`,
    getBrowserPageFaviconUrl: (url) => `chrome-extension://abc/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`,
    attachFaviconWithFallbacks: (img, url, host, options) => {
      attached.push({
        img,
        url,
        host,
        primaryUrl: options && options.primaryUrl,
        browserUrl: options && options.browserUrl
      });
    },
    defaultTheme
  });

  view.render({
    query: 'extensions',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'browserPage',
    suggestions: [{
      type: 'browserPage',
      title: '扩展程序',
      url: 'chrome://extensions/',
      favicon: ''
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item, 'browser page suggestion should render');
  assert.strictEqual(item._xIconIsFavicon, true, 'browser page suggestions should render a favicon image');
  assert.strictEqual(attached.length, 1, 'browser page suggestions should attach a favicon even without suggestion.favicon');
  assert.strictEqual(
    attached[0].primaryUrl,
    'chrome-extension://abc/_favicon/?pageUrl=chrome%3A%2F%2Fextensions%2F&size=128',
    'browser page suggestions should use the extension _favicon URL when no favicon was supplied'
  );
  assert.strictEqual(
    attached[0].browserUrl,
    'chrome://favicon2/?pageUrl=chrome%3A%2F%2Fextensions%2F&size=128',
    'browser page suggestions should keep chrome://favicon2 as a fallback candidate'
  );
}

async function testHighlightedSiteSearchUsesFaviconFallbackChain() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const providerFavicon = 'https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=https%3A%2F%2Fgithub.com%2F&size=128';
  const attached = [];

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: (iconName) => iconName,
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    attachFaviconWithFallbacks: (img, url, host, options) => {
      attached.push({
        img,
        url,
        host,
        primaryUrl: options && options.primaryUrl,
        browserUrl: options && options.browserUrl
      });
    },
    defaultTheme
  });

  view.render({
    query: 'react',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'none',
    suggestions: [{
      type: 'siteSearch',
      title: '在 GitHub 中搜索 "react"',
      url: 'https://github.com/search?q=react',
      favicon: providerFavicon,
      provider: {
        key: 'gh',
        name: 'GitHub',
        template: 'https://github.com/search?q={query}'
      },
      searchQuery: 'react'
    }]
  });

  const item = view.getItems()[0];
  const iconSlot = item && item._xIconWrap;
  assert.ok(iconSlot, 'site search suggestion should render an icon slot');
  assert.strictEqual(item._xIconIsFavicon, true, 'highlighted site search should use an image favicon');
  assert.strictEqual(attached.length, 1, 'highlighted site search favicon should use the shared fallback chain');
  assert.strictEqual(attached[0].url, 'https://github.com/search?q=react');
  assert.strictEqual(attached[0].host, 'github.com');
  assert.strictEqual(attached[0].primaryUrl, providerFavicon);
  assert.strictEqual(attached[0].browserUrl, '');
}

async function testAiSiteSearchUsesFaviconFallbackChain() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const providerFavicon = 'https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=https%3A%2F%2Fwww.doubao.com%2F&size=128';
  const attached = [];

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    isAiSiteSearchProvider: (provider) => Boolean(provider && provider.action === 'openAndSubmit'),
    attachFaviconWithFallbacks: (img, url, host, options) => {
      attached.push({
        img,
        url,
        host,
        primaryUrl: options && options.primaryUrl,
        browserUrl: options && options.browserUrl
      });
    },
    defaultTheme
  });

  view.render({
    query: '阿萨德',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'none',
    suggestions: [{
      type: 'siteSearch',
      title: '向 豆包 提问 "阿萨德"',
      url: 'https://www.doubao.com/chat/',
      favicon: providerFavicon,
      provider: {
        key: 'dbai',
        name: '豆包',
        template: 'https://www.doubao.com/chat/',
        action: 'openAndSubmit',
        submitStrategy: 'doubaoPrompt'
      },
      searchQuery: '阿萨德'
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item, 'AI site search suggestion should render');
  assert.strictEqual(item._xIconIsFavicon, true, 'AI site search should use an image favicon');
  assert.strictEqual(attached.length, 1, 'AI site search favicon should use the shared fallback chain');
  assert.strictEqual(attached[0].url, 'https://www.doubao.com/chat/');
  assert.strictEqual(attached[0].host, 'www.doubao.com');
  assert.strictEqual(attached[0].primaryUrl, providerFavicon);
  assert.strictEqual(attached[0].browserUrl, '');
}

async function testModeSwitchImageFallbackUsesLinkIcon() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: (iconName) => iconName,
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    defaultTheme
  });

  view.render({
    query: 'settings',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'modeSwitch',
    suggestions: [{
      type: 'modeSwitch',
      title: '切换搜索模式',
      url: '',
      favicon: 'https://example.com/missing.png'
    }]
  });

  const item = view.getItems()[0];
  const iconSlot = item && item._xIconWrap;
  assert.ok(iconSlot, 'mode switch suggestion should render an icon slot');
  const image = iconSlot.childNodes[0];
  assert.strictEqual(image.tagName, 'IMG', 'mode switch suggestion should start with a favicon image');
  assert.strictEqual(typeof image.onerror, 'function', 'favicon image should install an error fallback');
  image.onerror();
  assert.strictEqual(iconSlot.childNodes[0].innerHTML, 'ri-link');
}

async function testCommandSuggestionRendersFixedHeightTwoLineHierarchy() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: (iconName) => iconName,
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost: () => false,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    defaultTheme
  });

  view.render({
    query: '/',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'command',
    suggestions: [{
      type: 'commandNewTab',
      title: '新建标签页',
      commandText: '/new',
      commandAliases: ['/n'],
      url: ''
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item, 'command suggestion should render');
  assert.strictEqual(item.getAttribute('data-command-row'), 'true');
  assert.ok(item._xCommandLabel, 'command suggestion should expose its primary command label');
  assert.strictEqual(item._xCommandLabel.textContent, '/new');
  assert.strictEqual(item._xTitle, item._xCommandLabel, 'selection emphasis should target the command line');
  const textWrapper = item._xCommandLabel.parentNode;
  assert.ok(textWrapper, 'command label should be mounted inside the text wrapper');
  assert.strictEqual(textWrapper.childNodes[0], item._xCommandLabel, 'command should be the first line');
  assert.strictEqual(
    textWrapper.childNodes[1].className,
    'x-nt-suggestion-title x-nt-suggestion-command-description',
    'the existing result title should become the smaller second line'
  );
  assert.strictEqual(textWrapper.childNodes[1].textContent, '新建标签页');
  assert.strictEqual(
    item._xVisitButton.getAttribute('data-visible'),
    'false',
    'command suggestion should not render a redundant arrow-and-label action button'
  );
}

async function testCommandEmptyStateDoesNotCreateSelectableSuggestion() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  let visible = false;
  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: (iconName) => iconName,
    sanitizeDisplayText: (value) => String(value || ''),
    setSuggestionsVisible: (nextVisible) => {
      visible = Boolean(nextVisible);
    }
  });

  view.render({
    query: '/unknown',
    suggestions: [],
    emptyMessage: '无匹配命令'
  });

  assert.strictEqual(items.length, 0, 'command empty state should not become a selectable result');
  assert.strictEqual(container.childNodes.length, 1, 'command empty state should render one status row');
  assert.strictEqual(container.childNodes[0].className, 'x-nt-empty-state');
  assert.strictEqual(container.childNodes[0].childNodes[1].textContent, '无匹配命令');
  assert.strictEqual(visible, true, 'command empty state should keep the result panel visible');

  view.render({
    query: '/unknown',
    suggestions: [],
    emptyMessage: '无匹配命令',
    canAppend: true
  });
  assert.strictEqual(container.childNodes.length, 1,
    're-rendering the same New Tab command empty state should replace rather than append it');
}

async function testProxyFallbackFaviconUsesFallbackTheme() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const urlHighlightTheme = faviconTheme.createUrlHighlightTheme();
  const proxyFallbackFavicon = 'https://t2.gstatic.cn/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE%2CSIZE%2CURL&url=https%3A%2F%2Fdyjs.cuc.edu.cn%2F&size=128';
  let requestedTheme = false;

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: (suggestion) => {
      requestedTheme = true;
      assert.strictEqual(suggestion.favicon, proxyFallbackFavicon);
      return Promise.resolve(defaultTheme);
    },
    shouldUseUrlFallbackThemeForSuggestion: (suggestion, theme) =>
      Boolean(theme && theme._xIsDefault && suggestion && suggestion.favicon === proxyFallbackFavicon),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    defaultTheme,
    urlHighlightTheme
  });

  view.render({
    query: '研究生',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'topSite',
    suggestions: [{
      type: 'topSite',
      title: '研究生应用管理平台',
      url: 'https://dyjs.cuc.edu.cn/gsapp/sys/emaphome/portal/',
      isTopSite: true,
      favicon: proxyFallbackFavicon
    }]
  });
  view.updateSelection(-1);
  await Promise.resolve();

  const item = view.getItems()[0];
  assert.ok(requestedTheme, 'remote URL suggestion should resolve its theme');
  assert.ok(item, 'remote URL suggestion should render');
  assert.strictEqual(
    item._xTheme,
    urlHighlightTheme,
    'proxy fallback favicon suggestions should use the URL fallback highlight theme'
  );
  assert.strictEqual(
    item.style.getPropertyValue('--x-nt-suggestion-active-bg'),
    urlHighlightTheme.highlightBg,
    'proxy fallback active row should use the fallback theme highlight background'
  );
}

async function testVisitButtonAndEnterTagShareOverlayVisibilityRules() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    formatMessage: (key, fallback, params) => String(fallback || key).replace('{name}', params && params.name ? params.name : ''),
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    actionModel: globalThis.LumnoSuggestionActionModel,
    defaultTheme
  });

  view.render({
    query: 'lumno',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'topSite',
    suggestions: [{
      type: 'topSite',
      title: 'Lumno',
      url: 'https://lumno.example/',
      isTopSite: true,
      favicon: ''
    }, {
      type: 'history',
      title: 'Lumno docs',
      url: 'https://docs.example/lumno',
      favicon: ''
    }]
  });
  view.updateSelection(-1);

  const [primaryItem, secondaryItem] = view.getItems();
  assert.ok(primaryItem._xVisitButton, 'primary suggestion should render a visit button');
  assert.strictEqual(
    primaryItem.childNodes[1].getAttribute('data-action-column'),
    'true',
    'primary suggestion should mark the right-side action column for aligned action labels'
  );
  assert.ok(primaryItem._xTagContainer, 'primary suggestion should render an action tag container');
  assert.strictEqual(
    primaryItem._xTagContainer.getAttribute('data-visible'),
    'true',
    'primary top-site suggestion should show its Enter action tag'
  );
  assert.strictEqual(
    primaryItem._xVisitButton.getAttribute('data-visible'),
    'false',
    'primary suggestion should hide the visit button while the Enter tag is visible'
  );
  assert.ok(secondaryItem._xVisitButton, 'secondary suggestion should render a visit button');
  assert.strictEqual(
    secondaryItem.childNodes[1].getAttribute('data-action-column'),
    'true',
    'secondary suggestion should mark the right-side action column for aligned action labels'
  );
  assert.strictEqual(
    secondaryItem._xVisitButton.getAttribute('data-visible'),
    'true',
    'non-active suggestions should keep the right-side visit button visible'
  );
}

async function testRemovableSearchSuggestionsUseHoverDeleteAction() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const deleted = [];
  let activateCount = 0;
  const eventState = {
    preventDefaultCount: 0,
    stopPropagationCount: 0
  };

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => {
      if (key === 'search_remove_top_site_tooltip') {
        return '移除该常用';
      }
      return fallback || key;
    },
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    onActivateSuggestion: () => {
      activateCount += 1;
    },
    onDeleteHistory: (suggestion, query) => {
      deleted.push({ suggestion, query });
    },
    actionModel: globalThis.LumnoSuggestionActionModel,
    defaultTheme
  });

  const topSiteSuggestion = {
    type: 'topSite',
    title: 'Lumno',
    url: 'https://lumno.example/',
    isTopSite: true,
    favicon: ''
  };
  view.render({
    query: 'lumno',
    primaryHighlightIndex: -1,
    primaryHighlightReason: 'none',
    suggestions: [topSiteSuggestion]
  });

  const item = view.getItems()[0];
  assert.ok(item, 'top-site suggestion should render');
  assert.strictEqual(
    item._xHasHistoryDeleteButton,
    true,
    'top-site suggestions should render the same hover delete control as history suggestions'
  );
  assert.strictEqual(
    item._xHistoryDeleteButton.getAttribute('aria-label'),
    '移除该常用',
    'top-site delete control should describe removing a frequent result'
  );

  triggerEvent(item, 'mouseenter');
  assert.strictEqual(
    item.getAttribute('data-history-delete-visible'),
    'true',
    'hovering a top-site suggestion should reveal the delete control'
  );

  triggerEvent(item._xHistoryDeleteButton, 'click', {
    preventDefault() {
      eventState.preventDefaultCount += 1;
    },
    stopPropagation() {
      eventState.stopPropagationCount += 1;
    }
  });

  assert.strictEqual(eventState.preventDefaultCount, 1, 'top-site delete click should prevent row activation');
  assert.strictEqual(eventState.stopPropagationCount, 1, 'top-site delete click should not bubble to the result row');
  assert.strictEqual(activateCount, 0, 'top-site delete click should not open the result');
  assert.strictEqual(deleted.length, 1, 'top-site delete click should request URL removal');
  assert.strictEqual(deleted[0].suggestion, topSiteSuggestion, 'top-site delete should pass the clicked suggestion');
  assert.strictEqual(deleted[0].query, 'lumno', 'top-site delete should preserve the current query');

  deleted.length = 0;
  activateCount = 0;
  eventState.preventDefaultCount = 0;
  eventState.stopPropagationCount = 0;

  const historySuggestion = {
    type: 'history',
    title: '阿鼎控制台',
    url: 'https://example.com/history-a-ding',
    favicon: ''
  };
  view.render({
    query: '阿鼎',
    primaryHighlightIndex: -1,
    primaryHighlightReason: 'none',
    suggestions: [historySuggestion]
  });

  const historyItem = view.getItems()[0];
  assert.ok(historyItem, 'history suggestion should render');
  assert.strictEqual(
    historyItem._xHasHistoryDeleteButton,
    true,
    'history suggestions should render the hover delete control'
  );
  assert.strictEqual(
    historyItem._xHistoryDeleteButton.getAttribute('aria-label'),
    '移除该历史',
    'history delete control should describe removing a history result'
  );

  triggerEvent(historyItem, 'mouseenter');
  assert.strictEqual(
    historyItem.getAttribute('data-history-delete-visible'),
    'true',
    'hovering a history suggestion should reveal the delete control'
  );

  triggerEvent(historyItem._xHistoryDeleteButton, 'click', {
    preventDefault() {
      eventState.preventDefaultCount += 1;
    },
    stopPropagation() {
      eventState.stopPropagationCount += 1;
    }
  });

  assert.strictEqual(eventState.preventDefaultCount, 1, 'history delete click should prevent row activation');
  assert.strictEqual(eventState.stopPropagationCount, 1, 'history delete click should not bubble to the result row');
  assert.strictEqual(activateCount, 0, 'history delete click should not open the result');
  assert.strictEqual(deleted.length, 1, 'history delete click should request URL removal');
  assert.strictEqual(deleted[0].suggestion, historySuggestion, 'history delete should pass the clicked suggestion');
  assert.strictEqual(deleted[0].query, '阿鼎', 'history delete should preserve the current query');
}

async function testAiProviderVisitButtonUsesWebAppLabel() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    formatMessage: (key, fallback, params) => String(fallback || key).replace(/\{(\w+)\}/g, (match, name) => {
      return params && Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match;
    }),
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    getSearchActionLabel: () => '在 Google 中搜索',
    getSiteSearchDisplayName: (provider) => provider && provider.name ? provider.name : '',
    isAiSiteSearchProvider: (provider) => Boolean(provider && provider.action === 'openAndSubmit'),
    actionModel: globalThis.LumnoSuggestionActionModel,
    defaultTheme
  });

  view.render({
    query: '阿萨德',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'none',
    suggestions: [{
      type: 'siteSearch',
      title: '向 豆包 提问 "阿萨德"',
      url: 'https://www.doubao.com/chat/',
      favicon: '',
      provider: {
        key: 'dbai',
        name: '豆包',
        action: 'openAndSubmit',
        submitStrategy: 'doubaoPrompt'
      },
      searchQuery: '阿萨德'
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item && item._xVisitButton, 'AI provider suggestion should render a visit button');
  assert.strictEqual(
    item._xVisitButton.textContent,
    '打开 豆包 网页版',
    'AI provider visit button should use the provider web app label instead of default search engine'
  );
}

async function testOpenNewTabVisitButtonReflectsCurrentTabModifier() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    formatMessage: (key, fallback, params) => String(fallback || key).replace('{name}', params && params.name ? params.name : ''),
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    actionModel: globalThis.LumnoSuggestionActionModel,
    defaultTheme
  });

  view.render({
    query: 'lumno',
    primaryHighlightIndex: -1,
    primaryHighlightReason: 'none',
    suggestions: [{
      type: 'history',
      title: 'Lumno docs',
      url: 'https://docs.example/lumno',
      favicon: ''
    }]
  });

  const item = view.getItems()[0];
  assert.ok(item && item._xVisitButton, 'history suggestion should render a visit button');
  assert.strictEqual(
    item._xVisitButton.textContent,
    '新开',
    'default open-new-tab result should show the new-tab action label'
  );

  view.setOpenInCurrentTabModifierActive(true);
  assert.strictEqual(
    item._xVisitButton.textContent,
    '前往',
    'Alt/Option state should change open-new-tab visit button copy to current-tab navigation'
  );

  view.setOpenInCurrentTabModifierActive(false);
  assert.strictEqual(
    item._xVisitButton.textContent,
    '新开',
    'releasing Alt/Option should restore the new-tab action label'
  );
}

async function testMatchedOpenTabActionReflectsShiftModifier() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => fallback || key,
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    actionModel: globalThis.LumnoSuggestionActionModel,
    shouldSwitchMatchedTabSuggestion: (suggestion) => Boolean(suggestion && suggestion._xMatchedTabId === 42),
    defaultTheme
  });

  view.render({
    query: 'lumno',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'openTab',
    suggestions: [{
      type: 'history',
      title: 'Lumno docs',
      url: 'https://docs.example/lumno',
      favicon: '',
      _xMatchedTabId: 42
    }]
  });
  view.updateSelection(-1);

  const item = view.getItems()[0];
  const actionTag = item && item._xActionTags ? item._xActionTags[0] : null;
  assert.ok(actionTag && actionTag._xActionLabel, 'matched open tab should render an Enter action tag');
  assert.strictEqual(
    actionTag._xActionLabel.textContent,
    '切换',
    'matched open tab should default Enter to switching to the open tab'
  );

  assert.strictEqual(
    typeof view.setOpenSwitchInNewTabModifierActive,
    'function',
    'newtab suggestions view should expose Shift modifier state for matched open-tab actions'
  );
  view.setOpenSwitchInNewTabModifierActive(true);
  assert.strictEqual(
    actionTag._xActionLabel.textContent,
    '新开',
    'Shift should change the matched open-tab Enter action label to opening in a new tab'
  );
}

async function testCommandModifierShowsBackgroundOpenActionLabel() {
  const document = createFakeDocument();
  const container = document.createElement('div');
  container.setConnected(true);
  const items = [];
  const defaultTheme = faviconTheme.createDefaultTheme();
  const requestedKeys = new Set();
  const translations = {
    action_open_background_new_tab: '在后台新开'
  };

  const view = suggestionsView.createSuggestionsView({
    document,
    container,
    items,
    t: (key, fallback) => {
      requestedKeys.add(key);
      return translations[key] || fallback || key;
    },
    getRiSvg: () => '',
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl,
    getThemeHostForSuggestion: (suggestion) => getHostFromUrl(suggestion && suggestion.url),
    shouldBlockFaviconForHost,
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () => Promise.resolve(defaultTheme),
    getThemeForMode: (theme) => faviconTheme.getThemeForMode(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    getHoverColors: (theme) => faviconTheme.getHoverColors(theme, {
      defaultTheme,
      isDarkMode: () => false
    }),
    applyThemeVariables: (target, theme) => applyThemeVariables(target, theme, defaultTheme),
    applyMarkVariables: () => {},
    actionModel: globalThis.LumnoSuggestionActionModel,
    defaultTheme
  });

  view.render({
    query: 'lumno',
    primaryHighlightIndex: 0,
    primaryHighlightReason: 'topSite',
    suggestions: [{
      type: 'topSite',
      title: 'Lumno',
      url: 'https://lumno.example/',
      favicon: ''
    }]
  });
  view.updateSelection(-1);

  const item = view.getItems()[0];
  const actionTag = item && item._xActionTags ? item._xActionTags[0] : null;
  assert.ok(actionTag && actionTag._xActionLabel, 'primary result should render an Enter action tag');
  assert.strictEqual(
    typeof view.setOpenInBackgroundTabModifierActive,
    'function',
    'newtab suggestions view should expose Command/Ctrl modifier state for background action labels'
  );
  view.setOpenInBackgroundTabModifierActive(true);
  assert.strictEqual(
    actionTag._xActionLabel.textContent,
    '在后台新开',
    'Command/Ctrl should change focused result Enter tag copy to background new-tab opening'
  );
  assert.ok(
    requestedKeys.has('action_open_background_new_tab'),
    'background new-tab action label should be resolved through i18n'
  );
  view.setOpenInCurrentTabModifierActive(true);
  assert.strictEqual(
    actionTag._xActionLabel.textContent,
    '前往',
    'Alt/Option should keep current-tab label priority over Command/Ctrl background label'
  );
}

function testNewtabShiftEnterOpensMatchedTabInNewTab() {
  const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
  assert.ok(
    /let openSwitchInNewTabModifierActive = false;/.test(newtabJs),
    'newtab should track whether Shift is active for matched open-tab actions'
  );
  assert.ok(
    /function syncSuggestionActionModifiersFromEvent\(event\)[\s\S]*Boolean\(event && event\.altKey\)[\s\S]*Boolean\(event && event\.shiftKey\)/.test(newtabJs),
    'newtab should sync both Alt and Shift modifier state from keyboard events'
  );
  assert.ok(
    /function openMatchedTabSuggestion\(suggestion,\s*event,\s*item,\s*query\)[\s\S]*shouldUseNewTabForSwitchAction\(suggestion,\s*event,\s*item\)[\s\S]*action:\s*'createTab'[\s\S]*disposition:\s*getSearchResultNewTabDisposition\(event\)[\s\S]*action:\s*'switchToTab'/.test(newtabJs),
    'newtab Shift+Enter on a matched open-tab result should create a new tab instead of switching'
  );
  assert.ok(
    /const executeSuggestion = \(selectedSuggestion,\s*event,\s*activeSuggestionIndex\) =>/.test(newtabJs) &&
      /shouldSwitchMatchedTabSuggestion\(selectedSuggestion,\s*activeSuggestionIndex\)[\s\S]*openMatchedTabSuggestion\(selectedSuggestion,\s*event,\s*activeItem,\s*query\)/.test(newtabJs),
    'newtab Enter handling should route matched open-tab results through the Shift-aware opener'
  );
}

function testNewtabCommandEnterOpensFocusedResultInBackgroundTab() {
  const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
  const suggestionsViewJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/suggestions-view.js'), 'utf8');
  const backgroundJs = fs.readFileSync(path.join(repoRoot, 'src/background/background.js'), 'utf8');
  assert.ok(
    /function shouldOpenSearchResultInBackgroundTab\(event\)[\s\S]*event\.metaKey \|\| event\.ctrlKey[\s\S]*event\.altKey/.test(newtabJs),
    'newtab should treat Command/Ctrl, but not Alt/Option, as the background-open modifier'
  );
  assert.ok(
    /function openSearchResultUrl\(suggestion,\s*query,\s*event\)[\s\S]*shouldOpenSearchResultInBackgroundTab\(event\)[\s\S]*action:\s*'createTab'[\s\S]*disposition:\s*'backgroundTab'[\s\S]*navigateToUrl\(suggestion\.url\)/.test(newtabJs),
    'newtab should open Command/Ctrl activated URL search results in a background tab'
  );
  assert.ok(
    /function openMatchedTabSuggestion\(suggestion,\s*event,\s*item,\s*query\)[\s\S]*disposition:\s*getSearchResultNewTabDisposition\(event\)/.test(newtabJs),
    'newtab matched open-tab results should use the same foreground/background tab disposition helper'
  );
  assert.ok(
    /suggestionItem\.addEventListener\('auxclick',[\s\S]*Number\(event\.button\) !== 1[\s\S]*activateSuggestionItem\(event\)/.test(suggestionsViewJs) &&
      /visitButton\.addEventListener\('auxclick',[\s\S]*Number\(event\.button\) !== 1[\s\S]*activateVisitButton\(event\)/.test(suggestionsViewJs),
    'newtab result rows and action buttons should support middle-click activation'
  );
  assert.ok(
    /const activateOpenTabSuggestion = function\(event\)[\s\S]*onSwitchToTab\(tab, event\)[\s\S]*switchButton\.addEventListener\('auxclick'[\s\S]*suggestionItem\.addEventListener\('auxclick'/.test(suggestionsViewJs) &&
      /onSwitchToTab: \(tab, event\) =>[\s\S]*shouldOpenSearchResultInBackgroundTab\(event\)[\s\S]*action: 'createTab'[\s\S]*disposition: 'backgroundTab'[\s\S]*action: 'switchToTab'/.test(newtabJs),
    'newtab open-tab rows should duplicate in the background on middle-click instead of switching'
  );
  assert.ok(
    /(?:chrome\.tabs\.create|createTabWithSourceGroup)\(\{\s*url:\s*targetUrl,\s*active:\s*request\.disposition !== 'backgroundTab'/.test(backgroundJs),
    'background createTab should support backgroundTab by creating an inactive tab'
  );
  assert.ok(
    /resolveQuickNavigation\(query\)\.then\(\(targetUrl\) => \{[\s\S]*if \(targetUrl\)[\s\S]*if \(backgroundOpen\)[\s\S]*action:\s*'searchOrNavigate'[\s\S]*disposition:\s*'backgroundTab'[\s\S]*navigateToQuery\(query\)/.test(newtabJs),
    'newtab Cmd/Ctrl fallback should run shortcut parsing before requesting a background search'
  );
  assert.ok(
    /case 'searchOrNavigate':[\s\S]*request\.disposition === 'backgroundTab'[\s\S]*loadShortcutRules\(\)\.then[\s\S]*getShortcutUrl\(query,\s*rules\)[\s\S]*createResolvedTab\(shortcutUrl[\s\S]*buildDefaultSearchUrl\(query\)/.test(backgroundJs),
    'background searchOrNavigate should resolve configured shortcuts before applying background-tab creation'
  );
}

function testOverlayCommandEnterOpensFocusedResultInBackgroundTab() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.ok(
    /let openInBackgroundTabModifierActive = false;/.test(overlayJs) &&
      /case 'openBackgroundTab':[\s\S]*action_open_background_new_tab/.test(overlayJs) &&
      /function syncSuggestionActionModifiersFromEvent\(event\)[\s\S]*event\.metaKey \|\| event\.ctrlKey/.test(overlayJs),
    'overlay focused search result action tags should show the background-open i18n label while Command/Ctrl is held'
  );
  assert.ok(
    /function shouldOpenSearchResultInBackgroundTab\(event\)[\s\S]*event\.metaKey \|\| event\.ctrlKey[\s\S]*event\.altKey/.test(overlayJs),
    'overlay should treat Command/Ctrl, but not Alt/Option, as the background-open modifier'
  );
  assert.ok(
    /visitButton\.addEventListener\('auxclick',[\s\S]*Number\(event\.button\) !== 1[\s\S]*activateVisitButton\(event\)/.test(overlayJs) &&
      /suggestionItem\.addEventListener\('auxclick',[\s\S]*Number\(event\.button\) !== 1[\s\S]*activateSuggestionItem\(event\)/.test(overlayJs),
    'overlay result rows and action buttons should support middle-click activation'
  );
  assert.ok(
    /const activateRenderedTabSuggestion = function\(event\)[\s\S]*switchButton\.addEventListener\('auxclick'[\s\S]*suggestionItem\.addEventListener\('auxclick'/.test(overlayJs),
    'overlay open-tab rows should support middle-click background duplication'
  );
  assert.ok(
    /function getSearchResultCreateDisposition\(suggestion,\s*event,\s*item\)[\s\S]*shouldUseCurrentTabForOpenNewTabAction\(suggestion,\s*event,\s*item\)[\s\S]*getSearchResultNewTabDisposition\(event\)/.test(overlayJs),
    'overlay should preserve Alt/Option current-tab behavior before applying Command/Ctrl background opening'
  );
  assert.ok(
    /function openMatchedTabSuggestion\(suggestion,\s*event,\s*item,\s*query\)[\s\S]*shouldOpenSearchResultInBackgroundTab\(event\)[\s\S]*disposition:\s*getSearchResultNewTabDisposition\(event\)/.test(overlayJs),
    'overlay matched open-tab results should use the shared foreground/background disposition helper'
  );
  assert.ok(
    /disposition:\s*getSearchResultCreateDisposition\(selectedSuggestion,\s*e,\s*activeItem\)/.test(overlayJs) &&
      /disposition:\s*getSearchResultCreateDisposition\(suggestion,\s*event,\s*suggestionItem\)/.test(overlayJs),
    'overlay Enter and click activation should use the background-aware create disposition helper'
  );
  assert.ok(
    /resolveQuickNavigation\(query\)\.then\(\(targetUrl\) => \{[\s\S]*if \(targetUrl\)[\s\S]*else if \(shouldOpenSearchResultInBackgroundTab\(e\)\)[\s\S]*action:\s*'searchOrNavigate'[\s\S]*disposition:\s*'backgroundTab'[\s\S]*action:\s*'searchOrNavigate'[\s\S]*query:\s*query/.test(overlayJs),
    'overlay Cmd/Ctrl fallback should defer to searchOrNavigate so shortcut parsing still runs first'
  );
}

function testOverlayDirectOpenTabsUseShiftAwareSwitchAction() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.ok(
    /suggestionItem\._xIsRenderedTabSuggestion = true;[\s\S]*suggestionItem\._xSuggestion = \{[\s\S]*type:\s*'openTab'[\s\S]*_xMatchedTabId:\s*tab && typeof tab\.id === 'number' \? tab\.id : null/.test(overlayJs),
    'overlay directly rendered open-tab rows should carry matched-tab suggestion metadata'
  );
  assert.ok(
    /function updateModifierActionLabels\(\)[\s\S]*!item\._xIsSearchSuggestion && !item\._xIsRenderedTabSuggestion[\s\S]*const actionButton = item\._xVisitButton \|\| item\._xSwitchButton/.test(overlayJs),
    'overlay should refresh modifier labels for directly rendered open-tab rows'
  );
  assert.ok(
    /const switchActionTag = createActionTag\(t\('action_switch', '切换'\), 'Enter'\);[\s\S]*switchActionTag\._xAction = 'switch';[\s\S]*suggestionItem\._xActionTags = \[switchActionTag\];/.test(overlayJs),
    'overlay directly rendered open-tab rows should expose switch action tags for Shift label updates'
  );
  assert.ok(
    /const activateRenderedTabSuggestion = function\(event\) \{[\s\S]*openMatchedTabSuggestion\(suggestionItem\._xSuggestion,\s*event,\s*suggestionItem,\s*searchInput\.value\.trim\(\)\)/.test(overlayJs),
    'overlay clicks on directly rendered open-tab rows should use the Shift-aware matched-tab opener'
  );
  assert.ok(
    /activeItem && activeItem\._xIsRenderedTabSuggestion && activeItem\._xSuggestion[\s\S]*openMatchedTabSuggestion\(activeItem\._xSuggestion,\s*e,\s*activeItem,\s*query\)/.test(overlayJs),
    'overlay Enter on directly rendered open-tab rows should use the Shift-aware matched-tab opener'
  );
}

function testOverlayFocusedInputIsolatesUnmodifiedKeyboardEvents() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.ok(
    /function handleSearchInputKeydown\(e\)[\s\S]*searchInput\.addEventListener\('keydown', handleSearchInputKeydown\)/.test(overlayJs),
    'overlay search input keydown behavior should be reusable from the capture-phase isolation handler'
  );
  assert.ok(
    /overlayKeyCaptureHandler = function\(e\)[\s\S]*document\.activeElement !== searchInput && activeInRoot !== searchInput[\s\S]*e\.metaKey \|\| e\.ctrlKey \|\| e\.altKey[\s\S]*e\.type === 'keydown'[\s\S]*handleSearchInputKeydown\(e\)[\s\S]*e\.type === 'keyup'[\s\S]*syncSuggestionActionModifiersFromEvent\(e\)[\s\S]*e\.stopImmediatePropagation\(\)/.test(overlayJs),
    'focused overlay input should stop unmodified keyboard events during window capture before page or extension shortcuts run'
  );
  ['keydown', 'keypress', 'keyup'].forEach((eventName) => {
    assert.ok(
      overlayJs.includes(`window.addEventListener('${eventName}', overlayKeyCaptureHandler, true);`),
      `overlay should capture ${eventName} while its search input is focused`
    );
    assert.ok(
      overlayJs.includes(`window.removeEventListener('${eventName}', overlayKeyCaptureHandler, true);`),
      `overlay should remove its ${eventName} capture listener when it closes`
    );
  });
}

function testOverlayBackgroundActivationKeepsSearchOpen() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function finishOverlayResultActivation\(event, canOpenInBackground\)[\s\S]*?shouldOpenSearchResultInBackgroundTab\(event\)[\s\S]*?searchInput\.focus\(\{ preventScroll: true \}\);[\s\S]*?return false;[\s\S]*?removeOverlay\(overlay\);/,
    'background result activation should refocus the overlay instead of removing it'
  );
  assert.match(
    overlayJs,
    /const activateRenderedTabSuggestion = function\(event\)[\s\S]*?openMatchedTabSuggestion\([\s\S]*?finishOverlayResultActivation\(event, Boolean\(/,
    'direct open-tab rows should preserve the overlay when opened in the background'
  );
  assert.match(
    overlayJs,
    /const activateVisitButton = function\(e\)[\s\S]*?finishOverlayResultActivation\([\s\S]*?e,[\s\S]*?!\(suggestion\.forceSearch && !suggestion\.url\)/,
    'visit-button background activation should preserve the overlay'
  );
  assert.match(
    overlayJs,
    /const activateSuggestionItem = function\(event\)[\s\S]*?finishOverlayResultActivation\([\s\S]*?event,[\s\S]*?!\(suggestion\.forceSearch && !suggestion\.url\)/,
    'row background activation should preserve the overlay'
  );
}

function testOverlayDelayedCompletionPreservesVisualState() {
  const overlayJs = fs.readFileSync(path.join(repoRoot, 'src/overlay/search-panel.js'), 'utf8');
  assert.match(
    overlayJs,
    /function captureSuggestionVisualStateByIdentity\(suggestions, items\)[\s\S]*?theme: item\._xTheme \|\| null,[\s\S]*?favicon: faviconHadAppeared \? favicon : null/,
    'same-query overlay refreshes should capture the resolved row theme and reusable favicon'
  );
  assert.match(
    overlayJs,
    /const shouldPreserveVisualState = !canAppend &&[\s\S]*?!forceFullRerender &&[\s\S]*?query === lastRenderedQuery;[\s\S]*?captureSuggestionVisualStateByIdentity\(currentSuggestions, suggestionItems\)/,
    'overlay should preserve visual state only for a same-query delayed completion refresh'
  );
  assert.match(
    overlayJs,
    /const favicon = reusableFavicon \|\| document\.createElement\('img'\);[\s\S]*?renderOptions\.preserveLoadedState === true[\s\S]*?data-favicon-has-appeared/,
    'reused overlay favicons should keep their loaded state instead of replaying the first-appearance animation'
  );
  assert.match(
    overlayJs,
    /let immediateTheme = \(preservedVisualState && preservedVisualState\.theme\) \|\|[\s\S]*?getImmediateThemeForSuggestion\(suggestion\)/,
    'same-query overlay rows should keep their resolved theme while delayed results are merged'
  );
  assert.match(
    overlayJs,
    /const previousScrollTop = shouldPreserveVisualState[\s\S]*?suggestionsContainer\.scrollTop = previousScrollTop;/,
    'same-query overlay refreshes should not reset the visible result position'
  );
}

function testNewtabIncrementalSearchSuggestionContract() {
  const newtabJs = fs.readFileSync(path.join(repoRoot, 'src/newtab/newtab.js'), 'utf8');
  assert.ok(
    /let remoteSuggestionDebounceTimer = null;/.test(newtabJs),
    'newtab should keep remote suggestion debounce state separate from the local request'
  );
  assert.ok(
    /function requestSuggestions\(query, options\)[\s\S]*action: 'getSearchSuggestions'[\s\S]*renderSuggestions\(localSuggestions, requestQuery\)[\s\S]*action: 'getSearchEngineSuggestions'[\s\S]*localSuggestions:/.test(newtabJs),
    'newtab should render local suggestions before requesting the remote incremental merge'
  );
  assert.ok(
    /requestSeq !== suggestionRequestSeq \|\| requestQuery !== latestQuery/.test(newtabJs),
    'newtab should ignore remote callbacks from an older query generation'
  );
  assert.ok(
    /remoteResponse\.hasRemoteSuggestions !== true/.test(newtabJs),
    'newtab should keep the existing local render when the remote request adds no suggestions'
  );
  assert.match(
    newtabJs,
    /siteSearchProvidersCache = items;\s*renderSuggestions\(lastSuggestionResponse, query\);/,
    'newtab provider reload should re-render the latest incremental response instead of the captured local response'
  );
  assert.doesNotMatch(
    newtabJs,
    /refreshTabsForSearchContext\(\(\) => \{[\s\S]{0,500}renderSuggestions\(localSuggestions, requestQuery\)/,
    'newtab should not wait for a second tab refresh before showing the local background response'
  );
  assert.match(
    newtabJs,
    /addEventListener\('compositionstart'[\s\S]*suggestionRequestSeq \+= 1;[\s\S]*clearTimeout\(remoteSuggestionDebounceTimer\)/,
    'newtab should invalidate pending incremental responses when IME composition starts'
  );
}

testSiteSearchProviderIconsUsePageFaviconCandidates();
testSiteSearchTabHintRequiresExplicitTrigger();
testSuggestionActionColumnAlignmentContract();
testHistoryDeleteEntrypointsUseNonBubblingDeleteAction();
testOverlayTruncatedTitleCursorTooltipContract();
testNewtabShiftEnterOpensMatchedTabInNewTab();
testNewtabCommandEnterOpensFocusedResultInBackgroundTab();
testOverlayCommandEnterOpensFocusedResultInBackgroundTab();
testOverlayDirectOpenTabsUseShiftAwareSwitchAction();
testOverlayFocusedInputIsolatesUnmodifiedKeyboardEvents();
testOverlayBackgroundActivationKeepsSearchOpen();
testOverlayDelayedCompletionPreservesVisualState();
testNewtabIncrementalSearchSuggestionContract();

testLocalUrlSuggestionUsesFallbackTheme()
  .then(testDirectUrlSuggestionUsesFaviconWhenAvailable)
  .then(testTruncatedSuggestionTitleUsesCursorTooltipWithHighlight)
  .then(testAppendRenderKeepsOnlyFinalSuggestionMarkedLast)
  .then(testBrowserNewtabSuggestionUsesFallbackIconWhenFaviconMissing)
  .then(testBrowserPageTabUsesBrowserPageFaviconPrimaryCandidate)
  .then(testBrowserPageSuggestionUsesBrowserPageFaviconWhenFaviconMissing)
  .then(testHighlightedSiteSearchUsesFaviconFallbackChain)
  .then(testAiSiteSearchUsesFaviconFallbackChain)
  .then(testModeSwitchImageFallbackUsesLinkIcon)
  .then(testCommandSuggestionRendersFixedHeightTwoLineHierarchy)
  .then(testCommandEmptyStateDoesNotCreateSelectableSuggestion)
  .then(testProxyFallbackFaviconUsesFallbackTheme)
  .then(testVisitButtonAndEnterTagShareOverlayVisibilityRules)
  .then(testRemovableSearchSuggestionsUseHoverDeleteAction)
  .then(testAiProviderVisitButtonUsesWebAppLabel)
  .then(testOpenNewTabVisitButtonReflectsCurrentTabModifier)
  .then(testMatchedOpenTabActionReflectsShiftModifier)
  .then(testCommandModifierShowsBackgroundOpenActionLabel)
  .then(() => {
    console.log('newtab suggestions view tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
