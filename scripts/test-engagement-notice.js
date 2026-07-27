const assert = require('assert');
const fs = require('fs');

const engagementNotice = require('../src/shared/engagement-notice.js');

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

function createEligibleState(surface, now) {
  const state = engagementNotice.normalizeEngagementState(null);
  state[surface] = {
    activeDays: ['2026-07-01', '2026-07-03', '2026-07-05', '2026-07-07'],
    firstSeenAt: now - 8 * engagementNotice.DAY_MS,
    meaningfulUses: surface === 'newtab' ? 5 : 0,
    opens: surface === 'newtab' ? 8 : 10
  };
  return state;
}

(async () => {
  const now = Date.UTC(2026, 6, 20, 8);
  const overlayState = createEligibleState('overlay', now);
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(overlayState, 'overlay', now),
    true,
    'an overlay-only user should become eligible after 10 opens across 4 days and one week'
  );
  overlayState.overlay.opens = 9;
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(overlayState, 'overlay', now),
    false,
    'overlay users should not see the prompt before the tenth intentional invocation'
  );

  const newtabState = createEligibleState('newtab', now);
  newtabState.newtab.meaningfulUses = 4;
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(newtabState, 'newtab', now),
    false,
    'newtab visits alone should not qualify without meaningful search input'
  );
  newtabState.newtab.meaningfulUses = 5;
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(newtabState, 'newtab', now),
    true,
    'newtab users should qualify only after repeated meaningful search use'
  );
  newtabState.exposureCount = 1;
  newtabState.lastShownAt = now - 13 * engagementNotice.DAY_MS;
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(newtabState, 'newtab', now),
    false,
    'an ignored prompt should cool down for two weeks'
  );
  newtabState.lastShownAt = now - 15 * engagementNotice.DAY_MS;
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(newtabState, 'newtab', now),
    true,
    'one quiet retry should be allowed after the cooldown'
  );
  newtabState.exposureCount = engagementNotice.MAX_EXPOSURES;
  assert.strictEqual(
    engagementNotice.shouldShowEngagementNotice(newtabState, 'newtab', now),
    false,
    'the prompt should never expose more than twice'
  );

  assert.strictEqual(
    engagementNotice.getCommunityUrl('zh_CN'),
    engagementNotice.WECHAT_QR_URL,
    'Simplified Chinese users should be guided to the WeChat QR code'
  );
  assert.strictEqual(
    engagementNotice.getCommunityUrl('en'),
    engagementNotice.DISCORD_URL,
    'other locales should be guided to Discord'
  );

  const localStore = {
    [engagementNotice.ENGAGEMENT_NOTICE_STORAGE_KEY]: createEligibleState(
      'overlay',
      now
    )
  };
  let storageGetCalls = 0;
  let storageSetCalls = 0;
  const chromeApi = {
    runtime: { lastError: null },
    storage: {
      local: {
        get(keys, callback) {
          storageGetCalls += 1;
          const result = {};
          keys.forEach((key) => {
            result[key] = localStore[key];
          });
          callback(result);
        },
        set(values, callback) {
          storageSetCalls += 1;
          Object.assign(localStore, values);
          if (callback) {
            callback();
          }
        }
      }
    }
  };
  let featureHintOptions = null;
  let reviewClicks = 0;
  const elementAttributes = {};
  const element = {
    setAttribute(name, value) {
      elementAttributes[name] = String(value);
    }
  };
  const featureHints = {
    createFeatureHint(options) {
      featureHintOptions = options;
      let dismissed = false;
      return {
        destroy() {},
        dismiss() {
          if (dismissed) {
            return;
          }
          dismissed = true;
          options.onDismiss();
        },
        element,
        isDismissed() {
          return dismissed;
        },
        setVisible(visible) {
          elementAttributes['data-visible'] = visible ? 'true' : 'false';
        },
        updateLanguage() {}
      };
    }
  };
  const fakeWindow = {
    clearTimeout() {},
    setTimeout(callback) {
      callback();
      return 1;
    }
  };
  const disabledController = engagementNotice.createEngagementNotice({
    chromeApi,
    documentObj: { defaultView: fakeWindow },
    featureHints,
    surface: 'overlay'
  });
  assert.strictEqual(
    engagementNotice.ENGAGEMENT_NOTICE_ENABLED,
    false,
    'the production engagement mechanism should remain centrally paused'
  );
  assert.strictEqual(
    disabledController,
    null,
    'a paused production caller should not create an engagement controller'
  );
  assert.strictEqual(
    featureHintOptions,
    null,
    'the paused mechanism should not create hint DOM'
  );
  assert.strictEqual(
    storageGetCalls,
    0,
    'the paused mechanism should not read engagement storage'
  );
  assert.strictEqual(
    storageSetCalls,
    0,
    'the paused mechanism should not write engagement storage'
  );
  const controller = engagementNotice.createEngagementNotice({
    chromeApi,
    delayMs: 0,
    documentObj: { defaultView: fakeWindow },
    featureHints,
    forceEnabledForTesting: true,
    now: () => now,
    onReview() {
      reviewClicks += 1;
    },
    surface: 'overlay'
  });
  assert(controller, 'engagement notice controller should be created');
  await flushMicrotasks();
  await flushMicrotasks();
  assert.strictEqual(
    elementAttributes['data-visible'],
    'true',
    'an eligible idle overlay invocation should reveal the prompt'
  );
  assert.strictEqual(
    featureHintOptions.actions.length,
    2,
    'the reused hint component should expose rating and community actions'
  );
  assert.strictEqual(
    featureHintOptions.definition.inlineActions,
    true,
    'the engagement prompt should render its actions inside one sentence'
  );
  assert(
    featureHintOptions.badgeIconImageSrc.endsWith('/assets/images/lumno.png') &&
      featureHintOptions.badgeWordmarkImageSrc.endsWith(
        '/assets/images/lumno-wordmark.svg'
      ),
    'the engagement prompt should reuse the Lumno icon and new-tab wordmark'
  );
  featureHintOptions.actions[0].onClick({});
  await flushMicrotasks();
  assert.strictEqual(reviewClicks, 1, 'the rating action should reach the surface');
  assert(
    localStore[engagementNotice.ENGAGEMENT_NOTICE_STORAGE_KEY].completedAt > 0,
    'acting on the prompt should permanently complete the local lifecycle'
  );

  const storedStateBeforePreview = JSON.stringify(
    localStore[engagementNotice.ENGAGEMENT_NOTICE_STORAGE_KEY]
  );
  const previewController = engagementNotice.createEngagementNotice({
    chromeApi,
    delayMs: 0,
    documentObj: { defaultView: fakeWindow },
    featureHints,
    forceEnabledForTesting: true,
    now: () => now,
    previewMode: true,
    surface: 'newtab'
  });
  assert(previewController, 'preview engagement notice controller should be created');
  await flushMicrotasks();
  await flushMicrotasks();
  assert.strictEqual(
    elementAttributes['data-visible'],
    'true',
    'preview mode should reveal the prompt even after the production lifecycle completed'
  );
  assert.strictEqual(
    JSON.stringify(localStore[engagementNotice.ENGAGEMENT_NOTICE_STORAGE_KEY]),
    storedStateBeforePreview,
    'preview mode should not mutate persisted engagement state'
  );
  previewController.destroy();

  const newtabSource = fs.readFileSync('src/newtab/newtab.js', 'utf8');
  const overlaySource = fs.readFileSync('src/overlay/search-panel.js', 'utf8');
  assert(
    newtabSource.includes('engagementNoticeController.recordMeaningfulUse()'),
    'newtab input should suppress the prompt and count meaningful use'
  );
  assert(
    overlaySource.includes('overlayEngagementNoticeController.recordMeaningfulUse()'),
    'overlay input should suppress the prompt for the active invocation'
  );
  assert(
    overlaySource.includes("action: 'createTab'") &&
      overlaySource.includes('ENGAGEMENT_NOTICE.getCommunityUrl(targetLocale)'),
    'overlay community guidance should open the locale-appropriate destination'
  );
  assert(
    !newtabSource.includes('previewMode: true') &&
      !overlaySource.includes('previewMode: true'),
    'production surfaces should not force the paused prompt into preview mode'
  );

  console.log('engagement notice tests passed');
})();
