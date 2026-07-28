import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSuggestionsView,
  createSuggestionsViewApi,
  type Suggestion,
  type SuggestionElement,
  type SuggestionsViewController,
  type SuggestionsViewOptions
} from './suggestions';

let views: SuggestionsViewController[] = [];

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
    ...overrides
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
    expect(items[0]._xVisitButton?.dataset.visible).toBe('false');
    expect(
      items[0].querySelector('mark')?.textContent
    ).toBe('Exa');
  });

  it('uses the themed Overlay mark class for matched query text', () => {
    const { view, items } = createView({
      surface: 'overlay'
    });

    render(view, [{
      type: 'history',
      title: 'Example result',
      url: 'https://example.com/page'
    }]);

    expect(
      items[0].querySelector('mark')?.className
    ).toBe('x-ov-suggestion-mark');
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
    expect(items[0]._xVisitButtonLabel?.textContent).toBe('前往');
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
    const setSuggestionsVisible = vi.fn();
    const preloadIcon = vi.fn();
    const { view, items } = createView({
      onSwitchToTab,
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
    act(() => {
      button.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        button: 0
      }));
      row.dispatchEvent(new MouseEvent('auxclick', {
        bubbles: true,
        button: 1
      }));
    });

    expect(items).toHaveLength(1);
    expect(items[0]._xIsSearchSuggestion).toBe(false);
    expect(preloadIcon).toHaveBeenCalledOnce();
    expect(onSwitchToTab).toHaveBeenCalledTimes(2);
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
      items[0].querySelector('.x-ov-suggestion-source-tag')
    ).not.toBeNull();
    expect(
      items[0].querySelector('.x-ov-action-tag__label')
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
});
