import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createFeedbackSupportApi,
  createFeedbackSupportController,
  type FeedbackSupportController,
  type FeedbackSupportRenderModel
} from './feedback-support';

let controllers: FeedbackSupportController[] = [];

const model: FeedbackSupportRenderModel = {
  heading: '反馈与支持',
  headingKey: 'settings_feedback_support_section_title',
  items: [
    {
      href: 'https://x.com/example',
      iconClass: 'ri-twitter-x-line',
      key: 'x',
      label: 'X',
      labelKey: 'newtab_feedback_x_label'
    },
    {
      href: 'https://github.com/example/issues/new',
      iconClass: 'ri-github-line',
      key: 'github-issue',
      label: 'GitHub Issue',
      labelKey: 'newtab_feedback_github_issue_label'
    },
    {
      href: 'https://chromewebstore.google.com/example/reviews',
      iconClass: 'ri-star-line',
      key: 'chrome-review',
      label: 'Chrome 评分',
      labelKey: 'newtab_feedback_chrome_review_label'
    },
    {
      href: 'https://example.com/qrcode.JPG',
      iconClass: 'ri-wechat-fill',
      key: 'wechat',
      label: '微信',
      labelKey: 'newtab_feedback_wechat_label'
    }
  ]
};

function createFixture() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const controller = createFeedbackSupportController(host);
  controllers.push(controller);
  return { controller, host };
}

afterEach(() => {
  act(() => {
    controllers.forEach((controller) => controller.destroy());
  });
  controllers = [];
  document.body.textContent = '';
});

describe('Options feedback support React island', () => {
  it('renders four visible icon, text, and external-link entries', () => {
    const { controller, host } = createFixture();
    act(() => controller.render(model));

    expect(createFeedbackSupportApi().implementation).toBe('react');
    expect(host.dataset.reactIsland).toBe('options-feedback-support');
    expect(host.querySelectorAll('a')).toHaveLength(4);
    expect(host.querySelectorAll('a > i:first-child')).toHaveLength(4);
    expect(host.querySelectorAll('a > span')).toHaveLength(4);
    expect(host.querySelectorAll('.ri-external-link-line')).toHaveLength(4);
  });

  it('uses secure external anchors and preserves the provided destinations', () => {
    const { controller, host } = createFixture();
    act(() => controller.render(model));

    const community = host.querySelector<HTMLAnchorElement>(
      '[data-feedback-support="wechat"]'
    );
    expect(community?.href).toBe('https://example.com/qrcode.JPG');
    expect(community?.target).toBe('_blank');
    expect(community?.rel).toContain('noopener');
  });

  it('updates the localized community entry in place', () => {
    const { controller, host } = createFixture();
    act(() => controller.render(model));
    act(() => controller.render({
      ...model,
      heading: 'Feedback & Support',
      items: model.items.map((item) => item.key === 'wechat'
        ? {
            ...item,
            href: 'https://discord.gg/example',
            iconClass: 'ri-discord-fill',
            key: 'discord',
            label: 'Discord',
            labelKey: 'newtab_feedback_discord_label'
          }
        : item)
    }));

    expect(host.querySelector('h2')?.textContent).toBe('Feedback & Support');
    expect(host.querySelector('[data-feedback-support="wechat"]')).toBeNull();
    expect(host.querySelector('[data-feedback-support="discord"]')?.textContent)
      .toContain('Discord');
  });
});
