import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFeatureHintView,
  type FeatureHintViewController
} from './feature-hint-view';

let controllers: FeatureHintViewController[] = [];

afterEach(() => {
  act(() => controllers.forEach((controller) => controller.destroy()));
  controllers = [];
  document.body.innerHTML = '';
});

describe('Feature hint React view', () => {
  it('owns the hint structure, labels, and actions', () => {
    const onDismiss = vi.fn();
    const onLinkClick = vi.fn();
    let controller: FeatureHintViewController | null = null;
    act(() => {
      controller = createFeatureHintView({
        labels: {
          badge: 'New',
          close: 'Dismiss',
          link: 'Details',
          text: 'A new feature'
        },
        model: {
          alignMode: 'auto',
          arrowAlign: 'center',
          arrowSide: 'top',
          badgeIconHtml:
            '<i class="ri-icon ri-asterisk" aria-hidden="true"></i>',
          className: 'feature-placement',
          dismissStorage: 'sync',
          elementId: 'hint',
          hasLink: true,
          hintId: 'feature',
          roundedArrowTip: true,
          textId: 'hint-text',
          widthMode: 'content'
        },
        onDismiss,
        onLinkClick
      });
    });
    expect(controller).not.toBeNull();
    const view = controller as unknown as FeatureHintViewController;
    controllers.push(view);
    document.body.appendChild(view.element);

    expect(view.element.dataset.reactIsland).toBe('feature-hint');
    expect(view.element.classList.contains('feature-placement')).toBe(true);
    expect(view.arrowTip?.getAttribute('aria-hidden')).toBe('true');
    expect(view.text.textContent).toBe('A new feature');
    expect(view.linkButton?.textContent).toContain('Details');

    act(() => view.linkButton?.click());
    expect(onLinkClick).toHaveBeenCalledTimes(1);
    act(() => view.closeButton.click());
    expect(onDismiss).toHaveBeenCalledTimes(1);

    act(() => {
      view.updateLabels({
        badge: 'Updated',
        close: 'Close',
        link: 'Read',
        text: 'Updated copy'
      });
    });
    expect(view.text.textContent).toBe('Updated copy');
    expect(view.badge.getAttribute('aria-label')).toBe('Updated');
    expect(view.closeButton.getAttribute('aria-label')).toBe('Close');
  });
});
