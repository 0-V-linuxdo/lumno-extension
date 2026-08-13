import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../src/shared/suggestion-action-model.js';
import {
  createSuggestionsView,
  createSuggestionsViewApi,
  type Suggestion,
  type SuggestionElement,
  type SuggestionsViewController,
  type SuggestionsViewOptions
} from './suggestions';

let views: SuggestionsViewController[] = [];
const sharedSuggestionActionModel = (
  globalThis as typeof globalThis & {
    LumnoSuggestionActionModel: NonNullable<SuggestionsViewOptions['actionModel']>;
  }
).LumnoSuggestionActionModel;

function createOptions(
  overrides: Partial<SuggestionsViewOptions> = {}
): {
  options: SuggestionsViewOptions;
  container: HTMLElement;
  items: SuggestionElement[];
  getSelectedIndex: () => number;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const items: SuggestionElement[] = [];
  let selectedIndex = -1;
  const defaultTheme = {
    buttonText: '#111',
    buttonBg: '#eee',
    buttonBorder: '#ddd',
    tagBg: '#def',
    tagText: '#123',
    tagBorder: '#abc'
  };
  const actionModel = {
    ...sharedSuggestionActionModel,
    ...(overrides.actionModel || {})
  };
  const options: SuggestionsViewOptions = {
    document,
    container,
    items,
    t: (_key, fallback) => fallback,
    formatMessage: (_key, fallback, values = {}) =>
      Object.entries(values).reduce(
        (text, [key, value]) =>
          text.replace(`{${key}}`, value),
        fallback
      ),
    getRiSvg: (name, size = '') =>
      `<i class="${name} ${size}"></i>`,
    sanitizeDisplayText: (value) => String(value || ''),
    getHostFromUrl: (url) => {
      try {
        return new URL(url).hostname;
      } catch {
        return '';
      }
    },
    getThemeHostForSuggestion: (suggestion) => {
      try {
        return new URL(String(suggestion.url || '')).hostname;
      } catch {
        return '';
      }
    },
    getImmediateThemeForSuggestion: () => defaultTheme,
    getThemeForSuggestion: () =>
      new Promise(() => {
        // Keep async theme resolution pending for deterministic tests.
      }),
    getThemeForMode: (theme) =>
      (theme || defaultTheme) as typeof defaultTheme,
    getHoverColors: () => ({
      bg: '#eee',
      border: '#ddd'
    }),
    getNeutralHoverActionColors: () => ({
      bg: '#f5f5f5',
      border: '#ddd',
      text: '#555'
    }),
    applyThemeVariables: (item) => {
      item.dataset.themed = 'true';
    },
    applyMarkVariables: (item) => {
      item.dataset.markThemed = 'true';
    },
    getPageFaviconRenderCandidates: (_url, favicon) => ({
      primaryUrl: favicon
    }),
    attachFaviconWithFallbacks: (image, _url, _host, candidates) => {
      image.src =
        candidates.primaryUrl ||
        'data:image/png;base64,dGVzdA==';
    },
    onSetSelectedIndex: (index) => {
      selectedIndex = index;
    },
    getSelectedIndex: () => selectedIndex,
    ...overrides,
    actionModel
  };
  return {
    options,
    container,
    items,
    getSelectedIndex: () => selectedIndex
  };
}

function createView(
  overrides: Partial<SuggestionsViewOptions> = {}
) {
  const result = createOptions(overrides);
  const view = createSuggestionsView(result.options);
  views.push(view);
  return { view, ...result };
}

function render(
  view: SuggestionsViewController,
  suggestions: Suggestion[],
  extra: Record<string, unknown> = {}
): void {
  act(() => {
    view.render({
      suggestions,
      query: 'exa',
      primaryHighlightIndex: 0,
      primaryHighlightReason: 'default',
      ...extra
    });
  });
}

afterEach(() => {
  act(() => {
    views.forEach((view) => view.destroy());
  });
  views = [];
  document.body.textContent = '';
});

describe('Suggestions React island', () => {
  it('maps visible result rows to 0-9 on both search surfaces', () => {
    (['newtab', 'overlay'] as const).forEach((surface) => {
      const { view, container } = createView({ surface });
      const className = surface === 'overlay'
        ? '.x-ov-suggestion-number-shortcut'
        : '.x-nt-suggestion-number-shortcut';
      render(
        view,
        Array.from({ length: 11 }, (_, index) => ({
          type: 'history',
          title: `Result ${index}`,
          url: `https://example.com/${index}`
        }))
      );

      expect(
        Array.from(container.querySelectorAll(className)).map(
          (badge) => badge.textContent
        )
      ).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });
  });

  it('exposes the React API and renders legacy metadata synchronously', () => {
    const actionModel = {
      createSearchActionModel: () => ({
        actionTags: [{ action: 'search', keyLabel: 'Enter' }],
        visitButtonAction: 'openNewTab',
        alwaysHideVisitButton: false,
        hasActionTags: true,
        hasSwitchAction: false
      }),
      shouldShowVisitButton: (
        _model: unknown,
        active: boolean
      ) => !active
    };
    const { view, container, items } = createView({
      actionModel
    });

    render(view, [{
      type: 'history',
      title: 'Example result',
      url: 'https://example.com/page',
      favicon: 'data:image/png;base64,dGVzdA=='
    }]);

    expect(createSuggestionsViewApi().implementation).toBe('react');
    expect(container.dataset.reactIsland).toBe('suggestions');
    expect(items).toHaveLength(1);
    expect(items[0]._xIsSearchSuggestion).toBe(true);
    expect(items[0]._xIsAutocompleteTop).toBe(true);
    expect(items[0]._xThemeHost).toBe('example.com');
    expect(items[0]._xTitle?.textContent).toBe('Example result');
    expect(items[0].dataset.themed).toBe('true');
    expect(items[0].dataset.rowState).toBe('active');
    expect(items[0]._xTagContainer?.dataset.visible).toBe('true');
    expect(items[0]._xVisitButton).toBeUndefined();
    expect(items[0]._xTitle?.textContent).toBe('Example result');
  });

  it('does not highlight matched query text in row titles or URLs', () => {
    const { view, items } = createView();

    render(view, [{
      type: 'history',
      title: 'Codex workspace',
      url: 'https://example.com/最爱'
    }], {
      query: 'codex 最爱'
    });

    expect(items[0].querySelectorAll('mark')).toHaveLength(0);
    expect(items[0]._xTitle?.textContent).toBe('Codex workspace');
  });

  it('reports whether highlighted text belongs to the selected row', () => {
    const markStates = new Map<SuggestionElement, unknown>();
    const { view, items } = createView({
      applyMarkVariables: (...args: unknown[]) => {
        const [item, _theme, active] = args;
        markStates.set(item as SuggestionElement, active);
      }
    });

    render(view, [
      {
        type: 'history',
        title: 'Example selected',
        url: 'https://example.com/selected'
      },
      {
        type: 'history',
        title: 'Example passive',
        url: 'https://example.com/passive'
      }
    ]);

    expect(markStates.get(items[0])).toBe(true);
    expect(markStates.get(items[1])).toBe(false);
  });

  it('keeps existing row nodes during an incremental append', () => {
    const { view, items } = createView();
    const suggestions: Suggestion[] = [
      {
        type: 'history',
        title: 'Example one',
        url: 'https://example.com/1'
      },
      {
        type: 'bookmark',
        title: 'Example two',
        url: 'https://example.com/2'
      }
    ];
    render(view, suggestions);
    const first = items[0];
    const second = items[1];

    render(
      view,
      suggestions.concat({
        type: 'history',
        title: 'Example three',
        url: 'https://example.com/3'
      }),
      {
        canAppend: true,
        startIndex: 2
      }
    );

    expect(items).toHaveLength(3);
    expect(items[0]).toBe(first);
    expect(items[1]).toBe(second);
    expect(items[1].dataset.last).toBe('false');
    expect(items[2].dataset.last).toBe('true');
  });

  it('keeps the row and title node mounted when only the query changes', () => {
    const bindCursorTooltip = vi.fn();
    const onSetSelectedIndex = vi.fn();
    const { view, items } = createView({
      bindCursorTooltip,
      onSetSelectedIndex
    });
    const suggestion: Suggestion = {
      type: 'history',
      title: 'Example result',
      url: 'https://example.com/result'
    };

    render(view, [suggestion], {
      query: 'ex',
      updateKind: 'structure'
    });
    const row = items[0];
    const title = row._xTitle;
    bindCursorTooltip.mockClear();
    onSetSelectedIndex.mockClear();

    render(view, [{ ...suggestion }], {
      query: 'exam',
      updateKind: 'highlight'
    });

    expect(items[0]).toBe(row);
    expect(items[0]._xTitle).toBe(title);
    expect(title?.textContent).toBe('Example result');
    expect(bindCursorTooltip).not.toHaveBeenCalled();
    expect(onSetSelectedIndex).not.toHaveBeenCalledWith(-1);
  });

  it('keeps a direct URL action row mounted while its text grows', () => {
    const applyThemeVariables = vi.fn();
    const getImmediateThemeForSuggestion = vi.fn(() => ({
      accent: '#2563eb'
    }));
    const onActivateSuggestion = vi.fn();
    const onSetSelectedIndex = vi.fn();
    const { view, items } = createView({
      applyThemeVariables,
      getImmediateThemeForSuggestion,
      onActivateSuggestion,
      onSetSelectedIndex
    });
    const firstSuggestion: Suggestion = {
      type: 'directUrl',
      title: '打开 https://code.0h',
      url: 'https://code.0h',
      favicon: 'https://icons.example/first.png'
    };

    render(view, [firstSuggestion], {
      query: 'https://code.0h',
      updateKind: 'structure'
    });
    const row = items[0];
    const title = row._xTitle;
    const iconSlot = row.querySelector('.x-nt-suggestion-icon-slot');
    const inlineIcon = iconSlot?.firstElementChild;
    applyThemeVariables.mockClear();
    getImmediateThemeForSuggestion.mockClear();
    onSetSelectedIndex.mockClear();

    const nextSuggestion: Suggestion = {
      ...firstSuggestion,
      title: '打开 https://code.0htt',
      url: 'https://code.0htt',
      favicon: 'https://icons.example/second.png'
    };
    render(view, [nextSuggestion], {
      query: 'https://code.0htt',
      updateKind: 'content'
    });

    expect(items[0]).toBe(row);
    expect(items[0]._xTitle).toBe(title);
    expect(title?.textContent).toBe('打开 https://code.0htt');
    expect(row.querySelector('.x-nt-suggestion-icon-slot')).toBe(iconSlot);
    expect(iconSlot?.firstElementChild).toBe(inlineIcon);
    expect(iconSlot?.querySelector('img')).toBeNull();
    expect(iconSlot?.querySelector('.ri-link')).not.toBeNull();
    expect(items[0]._xSuggestion).toBe(nextSuggestion);
    expect(applyThemeVariables).not.toHaveBeenCalled();
    expect(getImmediateThemeForSuggestion).not.toHaveBeenCalled();
    expect(onSetSelectedIndex).not.toHaveBeenCalledWith(-1);

    act(() => {
      row.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0
      }));
    });
    expect(onActivateSuggestion).toHaveBeenLastCalledWith(
      nextSuggestion,
      'https://code.0htt',
      expect.any(MouseEvent),
      0,
      row
    );
  });

  it('keeps visible rows inert when only ranking metadata changes', () => {
    const applyThemeVariables = vi.fn();
    const attachFaviconWithFallbacks = vi.fn(
      (image: HTMLImageElement) => {
        image.src = 'data:image/png;base64,dGVzdA==';
      }
    );
    const bindCursorTooltip = vi.fn();
    const getThemeForSuggestion = vi.fn(
      () => new Promise<Record<string, unknown> | null>(() => {
        // Keep async theme resolution pending for deterministic tests.
      })
    );
    const onActivateSuggestion = vi.fn();
    const { view, items } = createView({
      applyThemeVariables,
      attachFaviconWithFallbacks,
      bindCursorTooltip,
      getThemeForSuggestion,
      onActivateSuggestion
    });
    const firstSuggestion: Suggestion = {
      type: 'history',
      title: 'Home - 0HTTP',
      url: 'https://code.0http.com/',
      favicon: 'https://code.0http.com/favicon.ico',
      score: 120,
      visitCount: 4,
      typedCount: 2,
      lastVisitTime: 100,
      reasons: ['标题前缀']
    };

    render(view, [firstSuggestion], {
      query: 'code.0h',
      updateKind: 'structure'
    });
    const row = items[0];
    const icon = row.querySelector('img');
    applyThemeVariables.mockClear();
    attachFaviconWithFallbacks.mockClear();
    bindCursorTooltip.mockClear();
    getThemeForSuggestion.mockClear();

    const nextSuggestion: Suggestion = {
      ...firstSuggestion,
      score: 260,
      visitCount: 9,
      typedCount: 5,
      lastVisitTime: 200,
      reasons: ['URL 前缀']
    };
    render(view, [nextSuggestion], {
      query: 'code.0h',
      updateKind: 'content'
    });

    expect(items[0]).toBe(row);
    expect(row.querySelector('img')).toBe(icon);
    expect(items[0]._xSuggestion).toBe(nextSuggestion);
    expect(applyThemeVariables).not.toHaveBeenCalled();
    expect(attachFaviconWithFallbacks).not.toHaveBeenCalled();
    expect(bindCursorTooltip).not.toHaveBeenCalled();
    expect(getThemeForSuggestion).not.toHaveBeenCalled();

    const latestSuggestion: Suggestion = {
      ...nextSuggestion,
      score: 300,
      reasons: ['站点直达']
    };
    render(view, [latestSuggestion], {
      query: 'code.0ht',
      updateKind: 'highlight'
    });
    expect(items[0]).toBe(row);
    expect(items[0]._xSuggestion).toBe(latestSuggestion);
    expect(applyThemeVariables).not.toHaveBeenCalled();
    expect(attachFaviconWithFallbacks).not.toHaveBeenCalled();
    expect(bindCursorTooltip).not.toHaveBeenCalled();
    expect(getThemeForSuggestion).not.toHaveBeenCalled();

    act(() => {
      row.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0
      }));
    });
    expect(onActivateSuggestion).toHaveBeenLastCalledWith(
      latestSuggestion,
      'code.0ht',
      expect.any(MouseEvent),
      0,
      row
    );
  });

  it('keeps existing row nodes when a remote result is inserted ahead of local results', () => {
    const { view, items } = createView();
    const firstLocal: Suggestion = {
      type: 'history',
      title: 'Example one',
      url: 'https://example.com/1'
    };
    const secondLocal: Suggestion = {
      type: 'bookmark',
      title: 'Example two',
      url: 'https://example.com/2'
    };
    render(view, [firstLocal, secondLocal]);
    const firstNode = items[0];
    const secondNode = items[1];

    render(view, [
      {
        type: 'googleSuggest',
        title: 'Example remote',
        url: 'https://search.example/?q=example'
      },
      firstLocal,
      secondLocal
    ]);

    expect(items).toHaveLength(3);
    expect(items[1]).toBe(firstNode);
    expect(items[2]).toBe(secondNode);
  });

  it('commits the primary highlight before layout effects run', () => {
    const rowStatesAtThemeApplication: Array<string | undefined> = [];
    const { view } = createView({
      applyThemeVariables: (item) => {
        rowStatesAtThemeApplication.push(item.dataset.rowState);
      }
    });

    render(view, [{
      type: 'history',
      title: 'Example',
      url: 'https://example.com/'
    }]);

    expect(rowStatesAtThemeApplication[0]).toBe('active');
  });

  it('updates action labels without remounting rows', () => {
    const actionModel = {
      createSearchActionModel: () => ({
        actionTags: [{ action: 'openNewTab', keyLabel: 'Enter' }],
        visitButtonAction: 'openNewTab',
        alwaysHideVisitButton: false,
        hasActionTags: true,
        hasSwitchAction: false
      }),
      getModifierAdjustedAction: (
        action: string,
        modifiers: { openInCurrentTab: boolean }
      ) =>
        modifiers.openInCurrentTab && action === 'openNewTab'
          ? 'go'
          : action
    };
    const { view, items } = createView({ actionModel });
    render(view, [{
      type: 'history',
      title: 'Example',
      url: 'https://example.com/'
    }]);
    const row = items[0];

    act(() => {
      view.setOpenInCurrentTabModifierActive(true);
    });

    expect(items[0]).toBe(row);
    expect(
      items[0]._xActionTags?.[0]._xActionLabel?.textContent
    ).toBe('前往');
  });

  it('keeps slash command rows mounted through mouse activation', () => {
    (['newtab', 'overlay'] as const).forEach((surface) => {
      const onActivateSuggestion = vi.fn();
      const { view, items } = createView({
        onActivateSuggestion,
        ...(surface === 'overlay' ? { surface } : {})
      });
      const suggestion: Suggestion = {
        type: 'commandSettings',
        title: 'Open Lumno settings',
        commandText: '/settings'
      };

      render(view, [suggestion]);
      const row = items[0];
      let mouseDownAccepted = true;
      act(() => {
        mouseDownAccepted = row.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          cancelable: true
        }));
        row.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          button: 0
        }));
      });

      expect(mouseDownAccepted, surface).toBe(false);
      expect(onActivateSuggestion).toHaveBeenCalledWith(
        suggestion,
        'exa',
        expect.any(MouseEvent),
        0,
        row
      );
    });
  });

  it('renders open tabs and preserves click and middle-click activation', () => {
    const onSwitchToTab = vi.fn();
    const onCopyUrl = vi.fn();
    const setSuggestionsVisible = vi.fn();
    const preloadIcon = vi.fn();
    const { view, items } = createView({
      onSwitchToTab,
      onCopyUrl,
      setSuggestionsVisible,
      preloadIcon
    });

    act(() => {
      view.renderTabs([{
        id: 42,
        title: 'Example tab',
        url: 'https://example.com/',
        favIconUrl: 'data:image/png;base64,dGVzdA=='
      }]);
    });
    const row = items[0];
    const button = row._xSwitchButton as HTMLButtonElement;
    const copyButton = row.querySelector(
      '.x-nt-suggestion-utility-button'
    ) as HTMLButtonElement;
    act(() => {
      row.dispatchEvent(new MouseEvent('mouseover', {
        bubbles: true
      }));
      button.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0
      }));
      row.dispatchEvent(new MouseEvent('auxclick', {
        bubbles: true,
        button: 1
      }));
      copyButton.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      }));
    });

    expect(items).toHaveLength(1);
    expect(items[0]._xIsSearchSuggestion).toBe(false);
    expect(preloadIcon).toHaveBeenCalledOnce();
    expect(onSwitchToTab).toHaveBeenCalledTimes(2);
    expect(onCopyUrl).toHaveBeenCalledWith('https://example.com/');
    expect(setSuggestionsVisible).toHaveBeenLastCalledWith(true);
  });

  it('keeps history deletion isolated from row activation', () => {
    const onActivateSuggestion = vi.fn();
    const onDeleteHistory = vi.fn();
    const { view, items } = createView({
      onActivateSuggestion,
      onDeleteHistory
    });
    const suggestion: Suggestion = {
      type: 'history',
      title: 'Example',
      url: 'https://example.com/'
    };
    render(view, [suggestion]);
    const button =
      items[0]._xHistoryDeleteButton as HTMLButtonElement;

    act(() => {
      button.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      }));
    });

    expect(onDeleteHistory).toHaveBeenCalledWith(
      suggestion,
      'exa'
    );
    expect(onActivateSuggestion).not.toHaveBeenCalled();
  });

  it('copies a result URL without activating or deleting the row', () => {
    const onActivateSuggestion = vi.fn();
    const onDeleteHistory = vi.fn();
    const onCopyUrl = vi.fn();
    const showTopActionTooltip = vi.fn();
    const { view, items } = createView({
      onActivateSuggestion,
      onDeleteHistory,
      onCopyUrl,
      showTopActionTooltip
    });
    const suggestion: Suggestion = {
      type: 'history',
      title: 'Example',
      url: 'https://example.com/path'
    };
    render(view, [suggestion]);
    const row = items[0];
    const utilityButtons = row.querySelectorAll<HTMLButtonElement>(
      '.x-nt-suggestion-utility-button'
    );
    const copyButton = utilityButtons[0];
    const deleteButton = row._xHistoryDeleteButton as HTMLButtonElement;

    act(() => {
      row.dispatchEvent(new MouseEvent('mouseover', {
        bubbles: true
      }));
      copyButton.dispatchEvent(new MouseEvent('mouseover', {
        bubbles: true
      }));
      copyButton.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      }));
    });

    expect(onCopyUrl).toHaveBeenCalledWith('https://example.com/path');
    expect(onActivateSuggestion).not.toHaveBeenCalled();
    expect(onDeleteHistory).not.toHaveBeenCalled();
    expect(utilityButtons).toHaveLength(2);
    expect(copyButton.className).toBe(deleteButton.className);
    expect(copyButton.dataset.visible).toBe('true');
    expect(deleteButton.dataset.visible).toBe('true');
    expect(copyButton.getAttribute('aria-label')).toBe('复制链接');
    expect(showTopActionTooltip).toHaveBeenCalledWith(
      copyButton,
      '复制链接'
    );
    [
      '--x-nt-suggestion-utility-color',
      '--x-nt-suggestion-utility-bg',
      '--x-nt-suggestion-utility-border'
    ].forEach((property) => {
      expect(copyButton.style.getPropertyValue(property)).toBe(
        deleteButton.style.getPropertyValue(property)
      );
    });
    expect(copyButton.compareDocumentPosition(deleteButton))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders copy only for result rows with a URL', () => {
    const { view, container, items } = createView();

    render(view, [{
      type: 'commandSettings',
      title: 'Settings',
      commandText: '/settings'
    }]);
    expect(container.querySelector('.x-nt-suggestion-utility-button'))
      .toBeNull();

    render(view, [{
      type: 'bookmark',
      title: 'Example',
      url: 'https://example.com/'
    }]);
    expect(container.querySelector('.x-nt-suggestion-utility-button'))
      .toBeInstanceOf(HTMLButtonElement);
  });

  it('renders empty state and clears external selection state', () => {
    const setSuggestionsVisible = vi.fn();
    const { view, container, items, getSelectedIndex } =
      createView({ setSuggestionsVisible });

    act(() => {
      view.render({
        suggestions: [],
        emptyMessage: 'No results'
      });
    });
    expect(container.querySelector('.x-nt-empty-state')?.textContent)
      .toContain('No results');
    expect(items).toHaveLength(0);
    expect(getSelectedIndex()).toBe(-1);
    expect(setSuggestionsVisible).toHaveBeenLastCalledWith(true);

    act(() => {
      view.clear();
    });
    expect(container.childElementCount).toBe(0);
    expect(setSuggestionsVisible).toHaveBeenLastCalledWith(false);
  });

  it('maps shared rows onto the Overlay class and state contract', () => {
    const { view, container, items } = createView({
      surface: 'overlay',
      enterAction: 'openNewTab',
      autoHighlightFirstTab: true,
      getHighlightColors: () => ({
        bg: '#eef',
        border: '#bbf'
      }),
      actionModel: {
        createSearchActionModel: () => ({
          actionTags: [{
            action: 'openNewTab',
            keyLabel: 'Enter'
          }],
          visitButtonAction: 'openNewTab',
          alwaysHideVisitButton: false,
          hasActionTags: true,
          hasSwitchAction: false
        })
      }
    });

    render(view, [{
      type: 'history',
      title: 'Overlay result',
      url: 'https://example.com/'
    }]);

    expect(container.dataset.reactIsland).toBe('suggestions');
    expect(items[0].className).toBe('x-ov-suggestion-item');
    expect(items[0].id).toBe(
      '_x_extension_suggestion_item_0_2024_unique_'
    );
    expect(items[0].style.getPropertyValue(
      '--x-ov-suggestion-row-bg'
    )).toBe('#eef');
    expect(
      items[0].querySelector('.x-ov-action-tag__label')
    ).not.toBeNull();
    expect(
      items[0].querySelector('.x-ov-suggestion-utility-button')
    ).not.toBeNull();

    act(() => {
      view.renderTabs([{
        id: 9,
        title: 'Overlay tab',
        url: 'https://example.com/tab'
      }]);
    });
    expect(items[0]._xIsAutocompleteTop).toBe(true);
    expect(items[0]._xTagContainer?.dataset.visible).toBe('true');
    expect(items[0]._xSwitchButton?.dataset.visible).toBe('false');
  });

  it('keeps a neutral row background when hovering search results, even with a brand theme', () => {
    const brandTheme = {
      _xIsBrand: true,
      buttonText: '#14532d',
      buttonBg: '#dcfce7',
      buttonBorder: '#86efac',
      tagBg: '#dcfce7',
      tagText: '#166534',
      tagBorder: '#86efac',
      markBg: '#bbf7d0',
      markText: '#14532d'
    };
    const { view, items } = createView({
      surface: 'overlay',
      getImmediateThemeForSuggestion: () => brandTheme,
      getThemeForMode: (theme) => theme || brandTheme,
      getHoverColors: () => ({
        bg: '#f0fdf4',
        border: '#86efac'
      }),
      actionModel: {
        createSearchActionModel: () => ({
          actionTags: [],
          visitButtonAction: 'openNewTab',
          alwaysHideVisitButton: true,
          hasActionTags: false,
          hasSwitchAction: false
        })
      }
    });

    render(view, [{
      type: 'history',
      title: 'Example result',
      url: 'https://example.com/'
    }], {
      primaryHighlightIndex: -1,
      updateKind: 'structure'
    });

    const row = items[0];

    act(() => {
      row.dispatchEvent(new MouseEvent('mouseover', {
        bubbles: true
      }));
    });

    expect(row.dataset.rowState).toBe('hover');
    expect(row.style.getPropertyValue('--x-ov-suggestion-row-bg'))
      .toBe('var(--x-ov-hover-bg, #F3F4F6)');
    expect(row._xVisitButton).toBeUndefined();
    expect(row.querySelector('[data-tag-type]')).toBeNull();
  });
});
