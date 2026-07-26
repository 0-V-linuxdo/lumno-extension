import { useState } from 'react';
import {
  renderTooltipContent,
  renderTooltipText
} from '../shared/tooltip-view';

interface BrowserAvatar {
  id?: string;
  name?: string;
  src?: string;
}

export interface InfoTooltipContentModel {
  browsers?: BrowserAvatar[];
  browserNameSeparator?: string;
  browserAvatarSuffix?: string;
  text?: string;
  type?: string;
}

const browserClassById: Record<string, string> = {
  chrome: 'browser-avatar--chrome',
  edge: 'browser-avatar--edge',
  dia: 'browser-avatar--dia',
  comet: 'browser-avatar--comet'
};

function BrowserAvatarItem({ browser }: { browser: BrowserAvatar }) {
  const id = String(browser.id || '').trim().toLowerCase();
  const name = String(browser.name || '').trim();
  const src = String(browser.src || '').trim();
  const [failed, setFailed] = useState(false);
  const fallback = (name || id || '?').slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`browser-avatar ${
        browserClassById[id] || 'browser-avatar--fallback'
      }`}
      title={name || undefined}
    >
      {src && !failed ? (
        <img
          alt=""
          aria-hidden="true"
          className="browser-avatar-image"
          decoding="async"
          onError={() => setFailed(true)}
          src={src}
        />
      ) : fallback}
    </span>
  );
}

function BrowserAvatarTooltipContent({
  model
}: {
  model: InfoTooltipContentModel;
}) {
  const browsers = Array.isArray(model.browsers) ? model.browsers : [];
  const names = browsers
    .map((browser) => String(browser.name || '').trim())
    .filter(Boolean);
  const separator = String(model.browserNameSeparator || ', ');
  const suffix = String(model.browserAvatarSuffix || 'and more');
  return (
    <span
      aria-label={
        names.length > 0
          ? `${names.join(separator)} ${suffix}`.trim()
          : undefined
      }
      className="browser-avatar-group"
      role="img"
    >
      {browsers.map((browser, index) => (
        <BrowserAvatarItem
          browser={browser}
          key={`${String(browser.id || '')}:${index}`}
        />
      ))}
      <span aria-hidden="true" className="browser-avatar-ellipsis">…</span>
    </span>
  );
}

export function createInfoTooltipContentApi() {
  return Object.freeze({
    implementation: 'react',
    render(element: HTMLElement | null, model: InfoTooltipContentModel = {}) {
      if (!element) {
        return;
      }
      const isBrowserAvatarTooltip = model.type === 'browser-avatars';
      element.classList.toggle('onboarding-browser-tooltip', isBrowserAvatarTooltip);
      element.dataset.reactIsland = 'onboarding-info-tooltip-content';
      if (isBrowserAvatarTooltip) {
        renderTooltipContent(
          element,
          <BrowserAvatarTooltipContent model={model} />
        );
        return;
      }
      renderTooltipText(element, String(model.text || ''));
    },
    destroy(element: HTMLElement | null) {
      if (!element) {
        return;
      }
      element.classList.remove('onboarding-browser-tooltip');
      renderTooltipContent(element, null);
    }
  });
}
