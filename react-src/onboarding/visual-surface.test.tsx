import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createVisualSurfaceApi,
  createVisualSurfaceController,
  type VisualSurfaceController,
  type VisualSurfaceRenderModel
} from './visual-surface';

let controllers: VisualSurfaceController[] = [];

function createFixture() {
  const stage = document.createElement('div');
  stage.id = 'onboarding-visual-stage';
  document.body.appendChild(stage);
  const controller = createVisualSurfaceController(stage);
  controllers.push(controller);
  return { controller, stage };
}

function createModel(
  overrides: Partial<VisualSurfaceRenderModel> = {}
): VisualSurfaceRenderModel {
  return {
    ariaLabel: 'Lumno',
    butterflyDValues: 'flutter;rest;flutter',
    butterflyRestPath: 'M4 17 L10 20 Z',
    featureAwards: [],
    featureCards: [],
    homepagePipArtSrc: '/assets/onboarding-auto-pip.svg',
    kind: 'lumno-web-wordmark-surface',
    newtabFiltersArtSrc: '/assets/onboarding-newtab-filters.webp',
    siteSearchCases: [],
    siteSearchDemoAriaLabel: 'Site search demo',
    siteSearchOpenLabel: 'Open',
    siteSearchSettingsLabel: 'Settings',
    siteSearchTabHintTemplate: 'Search with {provider}',
    wordmarkSrc: '/assets/lumno-web-textlogo.svg',
    ...overrides
  };
}

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
  controllers = [];
  document.body.textContent = '';
});

describe('Onboarding visual surface React island', () => {
  it('renders the Lumno wordmark and both SVG wing animations', () => {
    const { controller, stage } = createFixture();
    let handled = false;
    act(() => {
      handled = controller.render(createModel());
    });

    expect(createVisualSurfaceApi().implementation).toBe('react');
    expect(handled).toBe(true);
    const surface = stage.querySelector<HTMLElement>(
      '.lumno-web-wordmark-surface'
    );
    expect(surface?.dataset.reactIsland).toBe(
      'onboarding-lumno-wordmark-surface'
    );
    expect(surface?.getAttribute('aria-label')).toBe('Lumno');
    expect(
      surface?.querySelector<HTMLImageElement>('.logo-wordmark')?.getAttribute(
        'src'
      )
    ).toBe('/assets/lumno-web-textlogo.svg');
    expect(surface?.querySelectorAll('.logo-butterfly')).toHaveLength(2);
    expect(surface?.querySelectorAll('animate')).toHaveLength(2);
    expect(surface?.querySelectorAll('animateTransform')).toHaveLength(1);
    expect(
      surface?.querySelector('animate')?.getAttribute('values')
    ).toBe('flutter;rest;flutter');
    expect(surface?.querySelector('.seo-wordmark-text')?.textContent).toBe(
      'Lumno'
    );
  });

  it('returns unsupported scenes to the legacy renderer', () => {
    const { controller, stage } = createFixture();
    let handled = true;
    act(() => {
      controller.render(createModel());
      handled = controller.render(
        createModel({ kind: 'newtab-preview-surface' })
      );
    });

    expect(handled).toBe(false);
    expect(stage.childElementCount).toBe(0);
  });

  it('renders localized feature awards, cards, delays, and artwork variants', () => {
    const { controller, stage } = createFixture();
    act(() => {
      controller.render(createModel({
        featureAwards: [
          { lines: ['Open source', 'Privacy safe'] },
          { lines: ['Free forever'] }
        ],
        featureCardAriaJoiner: ' — ',
        featureCards: [
          {
            art: 'homepage-pip',
            body: 'Starts when switching tabs',
            title: 'Automatic PiP',
            tone: 'pip'
          },
          {
            art: 'newtab-filters',
            body: 'Wallpapers and filters',
            title: 'Custom new tab',
            tone: 'newtab'
          },
          {
            art: 'placeholder',
            artSize: { width: 240, height: 96 },
            title: 'Coming soon'
          }
        ],
        kind: 'feature-cards-surface',
        practicalFeaturesAriaLabel: 'Practical features',
        principlesAriaLabel: 'Product principles'
      }));
    });

    const surface = stage.querySelector<HTMLElement>(
      '.feature-cards-surface'
    );
    expect(surface?.dataset.reactIsland).toBe(
      'onboarding-feature-cards-surface'
    );
    expect(surface?.getAttribute('aria-label')).toBe('Practical features');
    expect(
      surface?.querySelector('.feature-cards-surface__awards')
        ?.getAttribute('aria-label')
    ).toBe('Product principles');
    expect(surface?.querySelectorAll('.feature-award')).toHaveLength(2);
    expect(surface?.querySelectorAll('.feature-award__wheat')).toHaveLength(4);
    const cards = surface?.querySelectorAll<HTMLElement>('.feature-card');
    expect(cards).toHaveLength(3);
    expect(cards?.[0]?.getAttribute('aria-label')).toBe(
      'Automatic PiP — Starts when switching tabs'
    );
    expect(cards?.[1]?.style.getPropertyValue('--feature-card-delay')).toBe(
      '350ms'
    );
    expect(
      surface?.querySelector<HTMLImageElement>(
        '[data-art="homepage-pip"] img'
      )?.getAttribute('src')
    ).toBe('/assets/onboarding-auto-pip.svg');
    expect(
      surface?.querySelector<HTMLImageElement>(
        '[data-art="newtab-filters"] img'
      )?.getAttribute('src')
    ).toBe('/assets/onboarding-newtab-filters.webp');
    const blank = surface?.querySelector<HTMLElement>('[data-art="blank"]');
    expect(blank?.dataset.artWidth).toBe('240');
    expect(blank?.dataset.artHeight).toBe('96');
  });

  it('unmounts the React root before a legacy scene replaces the stage', () => {
    const { controller, stage } = createFixture();
    act(() => {
      controller.render(createModel());
      controller.clear();
    });

    expect(stage.childElementCount).toBe(0);
    expect(stage.querySelector('[data-react-island]')).toBeNull();
  });

  it('renders themed site-search cases, typing tokens, and query highlights', () => {
    const { controller, stage } = createFixture();
    act(() => {
      controller.render(createModel({
        kind: 'site-search-demo-surface',
        siteSearchCases: [
          {
            actionLabel: 'Search GitHub',
            favicon: '/assets/github.png',
            iconClass: 'ri-github-fill',
            kind: 'site',
            label: 'Site search',
            modeLabel: 'GitHub',
            prefixLabel: 'GitHub',
            promptQuery: 'lumno',
            promptWidth: '8ch',
            resultDetail: 'github.com',
            resultTag: 'Site',
            resultTitle: 'Search GitHub for lumno',
            theme: {
              accentRgb: [36, 41, 46],
              buttonBg: [240, 241, 242],
              buttonBorder: [180, 181, 182],
              buttonText: [36, 41, 46],
              highlightBg: [224, 226, 228],
              highlightBorder: [160, 162, 164],
              keyBg: [248, 249, 250],
              keyBorder: [120, 122, 124],
              keyText: '#111827',
              markBg: [230, 232, 234],
              markText: '#111827'
            },
            triggerQuery: 'github'
          },
          {
            actionLabel: 'Open ChatGPT',
            iconClass: 'ri-sparkling-2-line',
            kind: 'ai',
            label: 'AI',
            modeLabel: 'ChatGPT',
            promptQuery: 'Review this PR',
            resultTitle: 'Ask ChatGPT to Review this PR',
            theme: { accentRgb: [16, 163, 127] },
            triggerQuery: 'chatgpt'
          }
        ],
        siteSearchDemoAriaLabel: 'Lumno site-search demo',
        siteSearchSettingsLabel: 'Demo settings',
        siteSearchTabHintTemplate: 'Use {provider} to search'
      }));
    });

    const surface = stage.querySelector<HTMLElement>(
      '.site-search-demo-surface'
    );
    expect(surface?.dataset.reactIsland).toBe(
      'onboarding-site-search-demo-surface'
    );
    expect(surface?.getAttribute('aria-label')).toBe(
      'Lumno site-search demo'
    );
    const cards = surface?.querySelectorAll<HTMLElement>(
      '.site-search-demo-card'
    );
    expect(cards).toHaveLength(2);
    expect(cards?.[1]?.style.getPropertyValue('--case-delay')).toBe('760ms');
    expect(
      cards?.[0]?.style.getPropertyValue('--site-search-demo-accent')
    ).toBe('rgb(36, 41, 46)');
    expect(cards?.[0]?.style.getPropertyValue('--x-ext-mark-text')).toBe(
      '#111827'
    );
    expect(
      cards?.[0]?.querySelectorAll(
        '.site-search-demo-query-token--trigger .onboarding-typing-char'
      )
    ).toHaveLength(6);
    expect(
      cards?.[0]?.querySelector<HTMLElement>(
        '.site-search-demo-query-token--prompt'
      )?.style.getPropertyValue('--typed-width')
    ).toBe('calc(8ch + var(--typed-width-buffer, 0.65em))');
    expect(cards?.[0]?.querySelector('mark')?.textContent).toBe('lumno');
    expect(
      cards?.[0]?.querySelector('.site-search-demo-tab-hint__label')
        ?.textContent
    ).toBe('Use GitHub to search');
    expect(
      cards?.[0]?.querySelector('.x-lumno-search-input__right-icon')
        ?.getAttribute('aria-label')
    ).toBe('Demo settings');
    expect(
      cards?.[1]?.querySelector('.site-search-demo-mode-prefix__icon')
    ).not.toBeNull();
  });
});
