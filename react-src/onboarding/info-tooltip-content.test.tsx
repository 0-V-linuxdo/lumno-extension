import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createInfoTooltipContentApi } from './info-tooltip-content';
import {
  createTooltipElement,
  destroyTooltipElement
} from '../shared/tooltip-view';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Onboarding info tooltip content', () => {
  it('shares the tooltip React root for browser avatars and plain copy', () => {
    let host: HTMLDivElement | null = null;
    act(() => {
      host = createTooltipElement({
        documentObj: document,
        kind: 'onboarding-info'
      });
    });
    expect(host).not.toBeNull();
    const tooltip = host as HTMLDivElement;
    const api = createInfoTooltipContentApi();
    act(() => api.render(tooltip, {
      browsers: [
        { id: 'chrome', name: 'Chrome', src: '/chrome.svg' },
        { id: 'dia', name: 'Dia' }
      ],
      browserAvatarSuffix: 'and more',
      type: 'browser-avatars'
    }));

    expect(tooltip.dataset.reactIsland).toBe(
      'onboarding-info-tooltip-content'
    );
    expect(tooltip.classList.contains('onboarding-browser-tooltip')).toBe(true);
    expect(tooltip.querySelectorAll('.browser-avatar')).toHaveLength(2);
    expect(tooltip.querySelector('[role="img"]')?.getAttribute('aria-label'))
      .toBe('Chrome, Dia and more');

    act(() => api.render(tooltip, { text: 'Details' }));
    expect(tooltip.classList.contains('onboarding-browser-tooltip')).toBe(false);
    expect(tooltip.textContent).toBe('Details');
    expect(
      tooltip.querySelector('._x_extension_tooltip_line_2026_unique_')
    ).not.toBeNull();

    act(() => api.destroy(tooltip));
    expect(tooltip.textContent).toBe('');
    act(() => destroyTooltipElement(tooltip));
  });
});
