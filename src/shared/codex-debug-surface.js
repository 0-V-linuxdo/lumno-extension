(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.LumnoCodexDebugSurface = api;
    api.start({
      windowObj: typeof window !== 'undefined' ? window : null,
      documentObj: typeof document !== 'undefined' ? document : null,
      chromeApi: typeof chrome !== 'undefined' ? chrome : null
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const CHANNEL = 'lumno.codex.debug';
  const VERSION = 1;
  const SURFACE_PORT_NAME = 'lumno-codex-debug-surface-v1';
  const MAX_QUERY_RESULTS = 50;
  const MAX_LOG_ENTRIES = 200;
  const MAX_PERFORMANCE_ENTRIES = 200;
  const OFFICIAL_CODEX_EXTENSION_IDS = Object.freeze([
    'hehggadaopoacecdllhhajmbjkdcmajg',
    'lfkehkpjohcoelkpembgemeipeppanef'
  ]);

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.min(maximum, Math.max(minimum, Math.trunc(number)));
  }

  function truncate(value, maximum) {
    const stringValue = String(value == null ? '' : value);
    if (stringValue.length <= maximum) {
      return stringValue;
    }
    return `${stringValue.slice(0, Math.max(0, maximum - 1))}…`;
  }

  function roundMetric(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
  }

  function getPerformanceNow(windowObj) {
    const performanceObj = windowObj && windowObj.performance;
    return performanceObj && typeof performanceObj.now === 'function'
      ? performanceObj.now()
      : Date.now();
  }

  function getPerformanceEntries(performanceObj, type) {
    if (!performanceObj || typeof performanceObj.getEntriesByType !== 'function') {
      return [];
    }
    try {
      return Array.from(performanceObj.getEntriesByType(type) || []);
    } catch (error) {
      return [];
    }
  }

  function sanitizePerformanceResourceName(value) {
    const rawValue = String(value || '');
    if (!rawValue) {
      return '';
    }
    if (/^(?:data:|blob:)/i.test(rawValue)) {
      return '[omitted-url]';
    }
    try {
      const url = new URL(rawValue);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch (error) {
      return truncate(rawValue.split(/[?#]/)[0], 1000);
    }
  }

  function createPerformanceCollector(windowObj, documentObj, surfaceType) {
    const performanceObj = windowObj && windowObj.performance;
    const longTasks = [];
    const events = [];
    const layoutShifts = [];
    const observers = [];
    const observerSupport = {};
    const longTaskStats = { count: 0, duration: 0, maxDuration: 0, sequence: 0 };
    const eventStats = { count: 0, duration: 0, maxDuration: 0, sequence: 0 };
    let cumulativeLayoutShift = 0;
    let largestContentfulPaint = null;
    let readyAtMs = null;
    let readyObserver = null;

    function appendBounded(list, entry) {
      list.push(entry);
      if (list.length > MAX_PERFORMANCE_ENTRIES) {
        list.splice(0, list.length - MAX_PERFORMANCE_ENTRIES);
      }
    }

    function isSurfaceReady() {
      if (!documentObj) {
        return false;
      }
      if (surfaceType === 'newtab') {
        return Boolean(documentObj.body &&
          documentObj.body.getAttribute('data-nt-ready') === '1');
      }
      if (surfaceType === 'options') {
        return Boolean(documentObj.documentElement &&
          documentObj.documentElement.getAttribute('data-lumno-options-ready') === 'true');
      }
      return documentObj.readyState === 'complete';
    }

    function captureReadyTime() {
      if (readyAtMs !== null || !isSurfaceReady()) {
        return false;
      }
      readyAtMs = roundMetric(getPerformanceNow(windowObj));
      if (readyObserver) {
        readyObserver.disconnect();
        readyObserver = null;
      }
      return true;
    }

    function observe(type, observeOptions, onEntries) {
      const PerformanceObserverClass = windowObj && windowObj.PerformanceObserver;
      if (typeof PerformanceObserverClass !== 'function') {
        return false;
      }
      const supportedTypes = Array.isArray(PerformanceObserverClass.supportedEntryTypes)
        ? PerformanceObserverClass.supportedEntryTypes
        : null;
      if (supportedTypes && !supportedTypes.includes(type)) {
        return false;
      }
      try {
        const observer = new PerformanceObserverClass((list) => {
          const entries = list && typeof list.getEntries === 'function'
            ? list.getEntries()
            : [];
          onEntries(Array.from(entries || []));
        });
        observer.observe(observeOptions);
        observers.push(observer);
        return true;
      } catch (error) {
        return false;
      }
    }

    observerSupport.longtask = observe('longtask', { type: 'longtask', buffered: true }, (entries) => {
      entries.forEach((entry) => {
        const duration = roundMetric(entry.duration);
        longTaskStats.count += 1;
        longTaskStats.duration += duration;
        longTaskStats.maxDuration = Math.max(longTaskStats.maxDuration, duration);
        longTaskStats.sequence += 1;
        appendBounded(longTasks, {
          sequence: longTaskStats.sequence,
          name: String(entry.name || 'longtask'),
          startTime: roundMetric(entry.startTime),
          duration
        });
      });
    });
    observerSupport.event = observe('event', {
      type: 'event',
      buffered: true,
      durationThreshold: 16
    }, (entries) => {
      entries.forEach((entry) => {
        const duration = roundMetric(entry.duration);
        eventStats.count += 1;
        eventStats.duration += duration;
        eventStats.maxDuration = Math.max(eventStats.maxDuration, duration);
        eventStats.sequence += 1;
        appendBounded(events, {
          sequence: eventStats.sequence,
          name: String(entry.name || 'event'),
          startTime: roundMetric(entry.startTime),
          duration,
          processingStart: roundMetric(entry.processingStart),
          processingEnd: roundMetric(entry.processingEnd),
          interactionId: Number(entry.interactionId) || 0
        });
      });
    });
    observerSupport.layoutShift = observe('layout-shift', { type: 'layout-shift', buffered: true }, (entries) => {
      entries.forEach((entry) => {
        const value = roundMetric(entry.value);
        const hadRecentInput = Boolean(entry.hadRecentInput);
        if (!hadRecentInput) {
          cumulativeLayoutShift += value;
        }
        appendBounded(layoutShifts, {
          startTime: roundMetric(entry.startTime),
          value,
          hadRecentInput
        });
      });
    });
    observerSupport.largestContentfulPaint = observe(
      'largest-contentful-paint',
      { type: 'largest-contentful-paint', buffered: true },
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) {
          return;
        }
        largestContentfulPaint = {
          startTime: roundMetric(entry.startTime),
          renderTime: roundMetric(entry.renderTime),
          loadTime: roundMetric(entry.loadTime),
          size: roundMetric(entry.size)
        };
      }
    );

    captureReadyTime();
    const MutationObserverClass = windowObj && windowObj.MutationObserver;
    if (readyAtMs === null && typeof MutationObserverClass === 'function') {
      readyObserver = new MutationObserverClass(captureReadyTime);
      if (documentObj && documentObj.documentElement) {
        readyObserver.observe(documentObj.documentElement, {
          attributes: true,
          attributeFilter: ['data-lumno-options-ready']
        });
      }
      if (documentObj && documentObj.body) {
        readyObserver.observe(documentObj.body, {
          attributes: true,
          attributeFilter: ['data-nt-ready']
        });
      }
    }

    function getBaseline() {
      return {
        longTaskCount: longTaskStats.count,
        longTaskDuration: longTaskStats.duration,
        longTaskSequence: longTaskStats.sequence,
        eventCount: eventStats.count,
        eventDuration: eventStats.duration,
        eventSequence: eventStats.sequence,
        cumulativeLayoutShift
      };
    }

    function getDelta(baseline) {
      const start = baseline && typeof baseline === 'object' ? baseline : {};
      const newLongTasks = longTasks.filter((entry) =>
        entry.sequence > (Number(start.longTaskSequence) || 0)
      );
      const newEvents = events.filter((entry) =>
        entry.sequence > (Number(start.eventSequence) || 0)
      );
      return {
        longTasks: {
          count: Math.max(0, longTaskStats.count - (Number(start.longTaskCount) || 0)),
          totalDurationMs: roundMetric(
            longTaskStats.duration - (Number(start.longTaskDuration) || 0)
          ),
          longestMs: roundMetric(Math.max(0, ...newLongTasks.map((entry) => entry.duration)))
        },
        events: {
          count: Math.max(0, eventStats.count - (Number(start.eventCount) || 0)),
          totalDurationMs: roundMetric(
            eventStats.duration - (Number(start.eventDuration) || 0)
          ),
          longestMs: roundMetric(Math.max(0, ...newEvents.map((entry) => entry.duration)))
        },
        cumulativeLayoutShift: roundMetric(
          cumulativeLayoutShift - (Number(start.cumulativeLayoutShift) || 0)
        )
      };
    }

    function snapshot(params) {
      captureReadyTime();
      const config = params && typeof params === 'object' ? params : {};
      const maximum = clamp(config.maxEntries, 0, 100, 20);
      const navigation = getPerformanceEntries(performanceObj, 'navigation')[0] || null;
      const paintEntries = getPerformanceEntries(performanceObj, 'paint').map((entry) => ({
        name: String(entry.name || ''),
        startTime: roundMetric(entry.startTime)
      }));
      const resources = getPerformanceEntries(performanceObj, 'resource');
      const slowestResources = resources
        .map((entry) => ({
          name: sanitizePerformanceResourceName(entry.name),
          initiatorType: String(entry.initiatorType || ''),
          startTime: roundMetric(entry.startTime),
          duration: roundMetric(entry.duration),
          transferSize: Math.max(0, Number(entry.transferSize) || 0)
        }))
        .sort((left, right) => right.duration - left.duration)
        .slice(0, maximum);
      const userTiming = [
        ...getPerformanceEntries(performanceObj, 'mark'),
        ...getPerformanceEntries(performanceObj, 'measure')
      ].filter((entry) => /^lumno-/i.test(String(entry.name || ''))).map((entry) => ({
        entryType: String(entry.entryType || ''),
        name: String(entry.name || ''),
        startTime: roundMetric(entry.startTime),
        duration: roundMetric(entry.duration)
      }));
      const rootElement = documentObj && documentObj.documentElement;
      const body = documentObj && documentObj.body;
      const memory = performanceObj && performanceObj.memory;
      const result = {
        surfaceType,
        capturedAtMs: roundMetric(getPerformanceNow(windowObj)),
        environment: {
          hardwareConcurrency: Math.max(0, Number(windowObj.navigator &&
            windowObj.navigator.hardwareConcurrency) || 0),
          deviceMemoryGb: Math.max(0, Number(windowObj.navigator &&
            windowObj.navigator.deviceMemory) || 0),
          visibilityState: String(documentObj && documentObj.visibilityState || ''),
          viewport: {
            width: Number(windowObj.innerWidth) || 0,
            height: Number(windowObj.innerHeight) || 0,
            devicePixelRatio: Number(windowObj.devicePixelRatio) || 1
          }
        },
        document: {
          readyState: String(documentObj && documentObj.readyState || ''),
          nodeCount: documentObj && typeof documentObj.querySelectorAll === 'function'
            ? documentObj.querySelectorAll('*').length
            : 0,
          bookmarkCards: documentObj && typeof documentObj.querySelectorAll === 'function'
            ? documentObj.querySelectorAll('.x-nt-bookmark-card').length
            : 0,
          shortcutTiles: documentObj && typeof documentObj.querySelectorAll === 'function'
            ? documentObj.querySelectorAll('.x-nt-shortcut-tile').length
            : 0,
          suggestionRows: documentObj && typeof documentObj.querySelectorAll === 'function'
            ? documentObj.querySelectorAll('.x-nt-suggestion-item, .x-ov-suggestion-item').length
            : 0
        },
        startup: {
          readyAtMs,
          ready: isSurfaceReady(),
          storage: {
            requests: Number(rootElement && rootElement.getAttribute(
              'data-lumno-newtab-bootstrap-storage-requests'
            )) || 0,
            reads: Number(rootElement && rootElement.getAttribute(
              'data-lumno-newtab-bootstrap-storage-reads'
            )) || 0,
            keys: String(rootElement && rootElement.getAttribute(
              'data-lumno-newtab-bootstrap-storage-keys'
            ) || '')
          },
          navigation: navigation ? {
            type: String(navigation.type || ''),
            duration: roundMetric(navigation.duration),
            responseEnd: roundMetric(navigation.responseEnd),
            domInteractive: roundMetric(navigation.domInteractive),
            domContentLoaded: roundMetric(navigation.domContentLoadedEventEnd),
            loadEnd: roundMetric(navigation.loadEventEnd)
          } : null,
          paints: paintEntries,
          largestContentfulPaint,
          userTiming
        },
        responsiveness: {
          longTasks: {
            count: longTaskStats.count,
            totalDurationMs: roundMetric(longTaskStats.duration),
            longestMs: roundMetric(longTaskStats.maxDuration),
            entries: (maximum > 0 ? longTasks.slice(-maximum) : [])
              .map(({ sequence, ...entry }) => entry)
          },
          events: {
            count: eventStats.count,
            totalDurationMs: roundMetric(eventStats.duration),
            longestMs: roundMetric(eventStats.maxDuration),
            entries: (maximum > 0 ? events.slice(-maximum) : [])
              .map(({ sequence, ...entry }) => entry)
          },
          observerSupport: { ...observerSupport },
          cumulativeLayoutShift: roundMetric(cumulativeLayoutShift),
          layoutShifts: maximum > 0 ? layoutShifts.slice(-maximum) : []
        },
        resources: {
          count: resources.length,
          totalDurationMs: roundMetric(resources.reduce(
            (total, entry) => total + (Number(entry.duration) || 0),
            0
          )),
          slowest: slowestResources
        },
        memory: memory ? {
          usedJsHeapBytes: Math.max(0, Number(memory.usedJSHeapSize) || 0),
          totalJsHeapBytes: Math.max(0, Number(memory.totalJSHeapSize) || 0),
          jsHeapLimitBytes: Math.max(0, Number(memory.jsHeapSizeLimit) || 0)
        } : null,
        pageState: {
          newtabReady: String(body && body.getAttribute('data-nt-ready') || ''),
          newtabEntry: String(body && body.getAttribute('data-nt-enter') || '')
        }
      };
      if (config.clear === true) {
        longTasks.length = 0;
        events.length = 0;
        layoutShifts.length = 0;
        longTaskStats.count = 0;
        longTaskStats.duration = 0;
        longTaskStats.maxDuration = 0;
        eventStats.count = 0;
        eventStats.duration = 0;
        eventStats.maxDuration = 0;
        cumulativeLayoutShift = 0;
      }
      return result;
    }

    function destroy() {
      observers.forEach((observer) => observer.disconnect());
      observers.length = 0;
      if (readyObserver) {
        readyObserver.disconnect();
        readyObserver = null;
      }
    }

    return Object.freeze({ destroy, getBaseline, getDelta, snapshot });
  }

  function getManifest(chromeApi) {
    try {
      if (chromeApi && chromeApi.runtime && typeof chromeApi.runtime.getManifest === 'function') {
        return chromeApi.runtime.getManifest() || {};
      }
    } catch (error) {
      return {};
    }
    return {};
  }

  function isDevelopmentBridgeEnabled(chromeApi) {
    const manifest = getManifest(chromeApi);
    const externallyConnectable = manifest.externally_connectable || {};
    const clientIds = Array.isArray(externallyConnectable.ids) ? externallyConnectable.ids : [];
    return Boolean(
      String(manifest.key || '').trim() &&
      clientIds.some((id) => OFFICIAL_CODEX_EXTENSION_IDS.includes(String(id || '')))
    );
  }

  function inferSurfaceType(locationLike, documentObj) {
    const bodyType = documentObj && documentObj.body && documentObj.body.dataset
      ? String(documentObj.body.dataset.lumnoPage || '').trim()
      : '';
    if (bodyType) {
      return bodyType;
    }
    let pathname = '';
    let protocol = '';
    try {
      pathname = String(locationLike && locationLike.pathname || '').toLowerCase();
      protocol = String(locationLike && locationLike.protocol || '').toLowerCase();
    } catch (error) {
      pathname = '';
    }
    if (pathname.includes('/newtab/lumno-newtab.html')) {
      return 'newtab-fallback';
    }
    if (pathname.includes('/newtab/')) {
      return 'newtab';
    }
    if (pathname.includes('/options/')) {
      return 'options';
    }
    if (pathname.includes('/onboarding/')) {
      return 'onboarding';
    }
    return protocol === 'chrome-extension:' ? 'extension-page' : 'overlay';
  }

  function createSurfaceId(windowObj) {
    try {
      if (windowObj && windowObj.crypto && typeof windowObj.crypto.randomUUID === 'function') {
        return windowObj.crypto.randomUUID();
      }
    } catch (error) {
      // Fall through to a local, page-lifetime identifier.
    }
    return `surface-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function stringifyLogValue(value) {
    if (value instanceof Error) {
      return truncate(value.stack || value.message || String(value), 4000);
    }
    if (typeof value === 'string') {
      return truncate(value, 4000);
    }
    if (value == null || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return truncate(JSON.stringify(value), 4000);
    } catch (error) {
      return truncate(String(value), 4000);
    }
  }

  function getElementValue(element) {
    if (!element) {
      return null;
    }
    const tagName = String(element.tagName || '').toLowerCase();
    const inputType = tagName === 'input' ? String(element.type || '').toLowerCase() : '';
    if (inputType === 'password') {
      return '[redacted]';
    }
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return truncate(element.value, 5000);
    }
    if (element.isContentEditable) {
      return truncate(element.textContent || '', 5000);
    }
    return null;
  }

  function getElementAttributes(element) {
    const attributes = {};
    if (!element || !element.attributes) {
      return attributes;
    }
    Array.from(element.attributes).slice(0, 40).forEach((attribute) => {
      const name = String(attribute.name || '').toLowerCase();
      if (!name || name.startsWith('on') || name === 'style' || name === 'srcdoc') {
        return;
      }
      if (
        name === 'id' ||
        name === 'class' ||
        name === 'role' ||
        name === 'name' ||
        name === 'type' ||
        name === 'href' ||
        name === 'src' ||
        name === 'title' ||
        name === 'placeholder' ||
        name === 'tabindex' ||
        name === 'disabled' ||
        name === 'checked' ||
        name === 'selected' ||
        name.startsWith('aria-') ||
        name.startsWith('data-')
      ) {
        const rawValue = String(attribute.value || '');
        attributes[name] = /^(?:data:|blob:)/i.test(rawValue)
          ? '[omitted-url]'
          : truncate(rawValue, 1000);
      }
    });
    return attributes;
  }

  function getElementRect(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
      return null;
    }
    const rect = element.getBoundingClientRect();
    return {
      x: Number(rect.x) || 0,
      y: Number(rect.y) || 0,
      width: Number(rect.width) || 0,
      height: Number(rect.height) || 0,
      top: Number(rect.top) || 0,
      right: Number(rect.right) || 0,
      bottom: Number(rect.bottom) || 0,
      left: Number(rect.left) || 0
    };
  }

  function isElementVisible(element, windowObj) {
    if (!element || element.hidden) {
      return false;
    }
    try {
      const style = windowObj && typeof windowObj.getComputedStyle === 'function'
        ? windowObj.getComputedStyle(element)
        : null;
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')) {
        return false;
      }
    } catch (error) {
      // Geometry below remains a useful fallback in partial DOM implementations.
    }
    const tagName = String(element.tagName || '').toLowerCase();
    if (tagName === 'html' || tagName === 'body') {
      return true;
    }
    const rect = getElementRect(element);
    return Boolean(rect && (rect.width > 0 || rect.height > 0));
  }

  function describeElement(element, windowObj) {
    if (!element) {
      return null;
    }
    return {
      tag: String(element.tagName || '').toLowerCase(),
      id: String(element.id || ''),
      classes: element.classList ? Array.from(element.classList).slice(0, 30) : [],
      role: String(element.getAttribute && element.getAttribute('role') || ''),
      text: truncate(element.innerText || element.textContent || '', 2000),
      value: getElementValue(element),
      checked: typeof element.checked === 'boolean' ? element.checked : null,
      disabled: Boolean(element.disabled),
      visible: isElementVisible(element, windowObj),
      rect: getElementRect(element),
      attributes: getElementAttributes(element)
    };
  }

  function queryElements(documentObj, selector, maximum) {
    const normalizedSelector = String(selector || '').trim();
    if (!normalizedSelector || normalizedSelector.length > 1000) {
      throw new Error('A non-empty CSS selector of at most 1000 characters is required.');
    }
    const all = Array.from(documentObj.querySelectorAll(normalizedSelector));
    return {
      all,
      selected: all.slice(0, clamp(maximum, 1, MAX_QUERY_RESULTS, 20))
    };
  }

  function resolveActionElement(documentObj, params) {
    const query = queryElements(documentObj, params && params.selector, MAX_QUERY_RESULTS);
    const index = clamp(params && params.index, 0, Math.max(0, query.all.length - 1), 0);
    const element = query.all[index] || null;
    if (!element) {
      const error = new Error('No element matches the requested selector and index.');
      error.code = 'element_not_found';
      throw error;
    }
    return element;
  }

  function setNativeValue(element, value, windowObj) {
    const tagName = String(element.tagName || '').toLowerCase();
    const prototype = tagName === 'input'
      ? windowObj.HTMLInputElement && windowObj.HTMLInputElement.prototype
      : (tagName === 'textarea'
        ? windowObj.HTMLTextAreaElement && windowObj.HTMLTextAreaElement.prototype
        : (tagName === 'select' ? windowObj.HTMLSelectElement && windowObj.HTMLSelectElement.prototype : null));
    const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(element, value);
      return;
    }
    element.value = value;
  }

  function setNativeChecked(element, checked, windowObj) {
    const prototype = windowObj.HTMLInputElement && windowObj.HTMLInputElement.prototype;
    const descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, 'checked');
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(element, checked);
      return;
    }
    element.checked = checked;
  }

  function dispatchInputEvents(element, windowObj) {
    element.dispatchEvent(new windowObj.Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new windowObj.Event('change', { bubbles: true, composed: true }));
  }

  function performAction(documentObj, windowObj, params) {
    const action = String(params && params.action || '').trim();
    const element = resolveActionElement(documentObj, params);
    if (action === 'click') {
      if (typeof element.click !== 'function') {
        throw new Error('The target element does not support click().');
      }
      element.click();
    } else if (action === 'focus') {
      if (typeof element.focus !== 'function') {
        throw new Error('The target element does not support focus().');
      }
      element.focus({ preventScroll: Boolean(params.preventScroll) });
    } else if (action === 'scrollIntoView') {
      if (typeof element.scrollIntoView !== 'function') {
        throw new Error('The target element does not support scrollIntoView().');
      }
      element.scrollIntoView({
        behavior: 'instant',
        block: String(params.block || 'center'),
        inline: String(params.inline || 'nearest')
      });
    } else if (action === 'fill') {
      const tagName = String(element.tagName || '').toLowerCase();
      if (tagName !== 'input' && tagName !== 'textarea' && !element.isContentEditable) {
        throw new Error('fill is only supported for inputs, textareas, and contenteditable elements.');
      }
      const value = truncate(params.value, 100000);
      if (element.isContentEditable && tagName !== 'input' && tagName !== 'textarea') {
        element.textContent = value;
      } else {
        setNativeValue(element, value, windowObj);
      }
      dispatchInputEvents(element, windowObj);
    } else if (action === 'setChecked') {
      const tagName = String(element.tagName || '').toLowerCase();
      const inputType = String(element.type || '').toLowerCase();
      if (tagName !== 'input' || (inputType !== 'checkbox' && inputType !== 'radio')) {
        throw new Error('setChecked is only supported for checkbox and radio inputs.');
      }
      const checked = Boolean(params.checked);
      if (element.checked !== checked) {
        setNativeChecked(element, checked, windowObj);
        dispatchInputEvents(element, windowObj);
      }
    } else if (action === 'selectOption') {
      if (String(element.tagName || '').toLowerCase() !== 'select') {
        throw new Error('selectOption is only supported for select elements.');
      }
      setNativeValue(element, String(params.value == null ? '' : params.value), windowObj);
      dispatchInputEvents(element, windowObj);
    } else if (action === 'key') {
      const init = {
        key: String(params.key || ''),
        code: String(params.code || ''),
        altKey: Boolean(params.altKey),
        ctrlKey: Boolean(params.ctrlKey),
        metaKey: Boolean(params.metaKey),
        shiftKey: Boolean(params.shiftKey),
        bubbles: true,
        cancelable: true,
        composed: true
      };
      element.dispatchEvent(new windowObj.KeyboardEvent('keydown', init));
      element.dispatchEvent(new windowObj.KeyboardEvent('keyup', init));
    } else {
      const error = new Error('Unsupported surface action.');
      error.code = 'unsupported_action';
      throw error;
    }
    return describeElement(element, windowObj);
  }

  function sanitizeSnapshotClone(rootElement) {
    const clone = rootElement.cloneNode(true);
    if (!clone.querySelectorAll) {
      return clone;
    }
    const omittedSelector = 'script, style, noscript, template';
    if (typeof clone.matches === 'function' && clone.matches(omittedSelector)) {
      const placeholder = clone.ownerDocument.createElement('span');
      placeholder.setAttribute(
        'data-lumno-omitted-element',
        String(clone.tagName || '').toLowerCase()
      );
      placeholder.textContent = '[omitted-element]';
      return placeholder;
    }
    clone.querySelectorAll(omittedSelector).forEach((element) => element.remove());
    [clone, ...clone.querySelectorAll('*')].forEach((element) => {
      Array.from(element.attributes || []).forEach((attribute) => {
        const name = String(attribute.name || '').toLowerCase();
        const value = String(attribute.value || '');
        if (name.startsWith('on') || name === 'srcdoc') {
          element.removeAttribute(attribute.name);
          return;
        }
        if ((name === 'src' || name === 'href') && /^(?:data:|blob:)/i.test(value)) {
          element.setAttribute(attribute.name, '[omitted-url]');
        }
      });
      if (String(element.tagName || '').toLowerCase() === 'input' &&
          String(element.type || '').toLowerCase() === 'password') {
        element.setAttribute('value', '[redacted]');
      }
    });
    return clone;
  }

  function createSnapshot(documentObj, windowObj, params, surfaceType) {
    const selector = String(params && params.selector || 'body').trim();
    let rootElement = null;
    try {
      rootElement = selector === ':document' ? documentObj.documentElement : documentObj.querySelector(selector);
    } catch (error) {
      const invalidError = new Error('The snapshot selector is not valid CSS.');
      invalidError.code = 'invalid_selector';
      throw invalidError;
    }
    if (!rootElement) {
      const error = new Error('The snapshot root element was not found.');
      error.code = 'element_not_found';
      throw error;
    }
    const clone = sanitizeSnapshotClone(rootElement);
    const maxMarkup = clamp(params && params.maxMarkup, 1000, 500000, 120000);
    const maxText = clamp(params && params.maxText, 1000, 100000, 40000);
    const markup = truncate(clone.outerHTML || '', maxMarkup);
    const text = truncate(clone.innerText || clone.textContent || '', maxText);
    return {
      surfaceType,
      url: String(windowObj.location && windowObj.location.href || ''),
      title: String(documentObj.title || ''),
      readyState: String(documentObj.readyState || ''),
      viewport: {
        width: Number(windowObj.innerWidth) || 0,
        height: Number(windowObj.innerHeight) || 0,
        devicePixelRatio: Number(windowObj.devicePixelRatio) || 1
      },
      selector,
      truncated: markup.endsWith('…') || text.endsWith('…'),
      markup,
      text,
      activeElement: describeElement(documentObj.activeElement, windowObj)
    };
  }

  function createSurfaceAgent(options) {
    const agentOptions = options && typeof options === 'object' ? options : {};
    const windowObj = agentOptions.windowObj;
    const documentObj = agentOptions.documentObj;
    const chromeApi = agentOptions.chromeApi;
    if (!windowObj || !documentObj || !chromeApi || !chromeApi.runtime) {
      return null;
    }
    if (!isDevelopmentBridgeEnabled(chromeApi)) {
      return null;
    }
    if (windowObj.__lumnoCodexDebugSurfaceAgentV1) {
      return windowObj.__lumnoCodexDebugSurfaceAgentV1;
    }
    if (typeof chromeApi.runtime.connect !== 'function') {
      return null;
    }

    const surfaceId = createSurfaceId(windowObj);
    const surfaceType = inferSurfaceType(windowObj.location, documentObj);
    const performanceCollector = createPerformanceCollector(windowObj, documentObj, surfaceType);
    const logs = [];
    let port = null;
    let reconnectTimer = null;
    let closed = false;

    function pushLog(level, values) {
      logs.push({
        at: Date.now(),
        level,
        message: Array.from(values || []).map(stringifyLogValue).join(' ')
      });
      if (logs.length > MAX_LOG_ENTRIES) {
        logs.splice(0, logs.length - MAX_LOG_ENTRIES);
      }
    }

    function captureConsole() {
      const consoleObj = windowObj.console;
      if (!consoleObj || consoleObj.__lumnoCodexDebugWrapped) {
        return;
      }
      ['warn', 'error'].forEach((level) => {
        const original = typeof consoleObj[level] === 'function' ? consoleObj[level].bind(consoleObj) : null;
        if (!original) {
          return;
        }
        consoleObj[level] = function(...args) {
          pushLog(level, args);
          return original(...args);
        };
      });
      try {
        Object.defineProperty(consoleObj, '__lumnoCodexDebugWrapped', {
          value: true,
          configurable: false,
          enumerable: false
        });
      } catch (error) {
        consoleObj.__lumnoCodexDebugWrapped = true;
      }
      windowObj.addEventListener('error', (event) => {
        pushLog('error', [event && (event.error || event.message) || 'Window error']);
      }, true);
      windowObj.addEventListener('unhandledrejection', (event) => {
        pushLog('error', [event && event.reason || 'Unhandled promise rejection']);
      }, true);
    }

    function createRegistration(type) {
      return {
        channel: CHANNEL,
        version: VERSION,
        type: type || 'surface.register',
        surfaceId,
        url: String(windowObj.location && windowObj.location.href || ''),
        title: String(documentObj.title || ''),
        readyState: String(documentObj.readyState || ''),
        pageType: surfaceType
      };
    }

    function postRegistration(type) {
      if (!port) {
        return;
      }
      const message = createRegistration(type);
      try {
        port.postMessage(message);
      } catch (error) {
        // The disconnect listener schedules reconnection while the page remains alive.
      }
    }

    function createSuccess(result) {
      return { ok: true, result };
    }

    function createFailure(error) {
      return {
        ok: false,
        error: {
          code: error && error.code ? String(error.code) : 'surface_error',
          message: error && error.message ? String(error.message) : 'The Lumno debug surface request failed.'
        }
      };
    }

    function waitFor(params) {
      const timeoutMs = clamp(params && params.timeoutMs, 0, 3000, 2000);
      const state = String(params && params.state || 'attached');
      const startedAt = Date.now();
      return new Promise((resolve, reject) => {
        function check() {
          let query = null;
          try {
            query = queryElements(documentObj, params && params.selector, 1);
          } catch (error) {
            reject(error);
            return;
          }
          const element = query.all[0] || null;
          const matched = state === 'detached'
            ? !element
            : (state === 'visible' ? isElementVisible(element, windowObj) : Boolean(element));
          if (matched) {
            resolve({
              state,
              elapsedMs: Date.now() - startedAt,
              element: describeElement(element, windowObj)
            });
            return;
          }
          if (Date.now() - startedAt >= timeoutMs) {
            const error = new Error('Timed out waiting for the requested element state.');
            error.code = 'wait_timeout';
            reject(error);
            return;
          }
          windowObj.setTimeout(check, 50);
        }
        check();
      });
    }

    function waitForAnimationFrames(params) {
      const frameCount = clamp(params && params.frames, 1, 4, 2);
      const timeoutMs = clamp(params && params.timeoutMs, 100, 2000, 750);
      const startedAt = getPerformanceNow(windowObj);
      let frameRequestId = null;
      let cancelPendingFrame = null;
      let timer = null;
      let settled = false;
      let completedFrames = 0;
      let firstFrameMs = null;

      return new Promise((resolve) => {
        function finish(timedOut) {
          if (settled) {
            return;
          }
          settled = true;
          if (timer !== null) {
            windowObj.clearTimeout(timer);
            timer = null;
          }
          if (cancelPendingFrame) {
            cancelPendingFrame();
            cancelPendingFrame = null;
            frameRequestId = null;
          }
          const elapsedMs = roundMetric(getPerformanceNow(windowObj) - startedAt);
          resolve({
            requestedFrames: frameCount,
            completedFrames,
            timedOut,
            elapsedMs,
            firstFrameMs,
            averageFrameMs: completedFrames > 0
              ? roundMetric(elapsedMs / completedFrames)
              : null
          });
        }

        function onFrame() {
          frameRequestId = null;
          cancelPendingFrame = null;
          if (settled) {
            return;
          }
          completedFrames += 1;
          if (firstFrameMs === null) {
            firstFrameMs = roundMetric(getPerformanceNow(windowObj) - startedAt);
          }
          if (completedFrames >= frameCount) {
            finish(false);
            return;
          }
          requestFrame();
        }

        function requestFrame() {
          if (typeof windowObj.requestAnimationFrame === 'function') {
            frameRequestId = windowObj.requestAnimationFrame(onFrame);
            cancelPendingFrame = () => {
              if (typeof windowObj.cancelAnimationFrame === 'function') {
                windowObj.cancelAnimationFrame(frameRequestId);
              }
            };
            return;
          }
          frameRequestId = windowObj.setTimeout(onFrame, 16);
          cancelPendingFrame = () => windowObj.clearTimeout(frameRequestId);
        }

        timer = windowObj.setTimeout(() => finish(true), timeoutMs);
        requestFrame();
      });
    }

    async function profileAction(params) {
      const baseline = performanceCollector.getBaseline();
      const startedAt = getPerformanceNow(windowObj);
      const element = performAction(documentObj, windowObj, params || {});
      const actionCompletedAt = getPerformanceNow(windowObj);
      const presentation = await waitForAnimationFrames(params || {});
      const completedAt = getPerformanceNow(windowObj);
      const syncDurationMs = roundMetric(actionCompletedAt - startedAt);
      return {
        action: String(params && params.action || ''),
        syncDurationMs,
        interactionToFirstFrameMs: presentation.firstFrameMs === null
          ? null
          : roundMetric(syncDurationMs + presentation.firstFrameMs),
        interactionToSettledFramesMs: roundMetric(completedAt - startedAt),
        presentation,
        performanceDelta: performanceCollector.getDelta(baseline),
        element,
        activeElement: describeElement(documentObj.activeElement, windowObj)
      };
    }

    function executeRequest(method, params) {
      if (method === 'surface.snapshot') {
        return createSnapshot(documentObj, windowObj, params, surfaceType);
      }
      if (method === 'surface.query') {
        const query = queryElements(documentObj, params && params.selector, params && params.limit);
        return {
          selector: String(params.selector),
          count: query.all.length,
          elements: query.selected.map((element) => describeElement(element, windowObj))
        };
      }
      if (method === 'surface.action') {
        const element = performAction(documentObj, windowObj, params || {});
        return {
          action: String(params && params.action || ''),
          element,
          activeElement: describeElement(documentObj.activeElement, windowObj)
        };
      }
      if (method === 'surface.profileAction') {
        return profileAction(params || {});
      }
      if (method === 'surface.performance') {
        return performanceCollector.snapshot(params || {});
      }
      if (method === 'surface.waitFor') {
        return waitFor(params || {});
      }
      if (method === 'surface.logs') {
        const result = { entries: logs.slice() };
        if (params && params.clear) {
          logs.splice(0, logs.length);
        }
        return result;
      }
      const error = new Error('The requested surface method is not supported.');
      error.code = 'unknown_method';
      throw error;
    }

    function respondToRequest(request) {
      Promise.resolve()
        .then(() => executeRequest(String(request.method || ''), request.params || {}))
        .then((result) => createSuccess(result))
        .catch((error) => createFailure(error))
        .then((response) => {
          if (!port) {
            return;
          }
          try {
            port.postMessage({
              channel: CHANNEL,
              version: VERSION,
              type: 'surface.response',
              requestId: String(request.requestId || ''),
              response
            });
          } catch (error) {
            // The background timeout reports a disconnected surface to the client.
          }
        });
    }

    function scheduleReconnect() {
      if (closed || reconnectTimer) {
        return;
      }
      reconnectTimer = windowObj.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 500);
    }

    function connect() {
      if (closed || port) {
        return;
      }
      try {
        port = chromeApi.runtime.connect({ name: SURFACE_PORT_NAME });
      } catch (error) {
        scheduleReconnect();
        return;
      }
      if (!port || !port.onMessage || !port.onDisconnect) {
        port = null;
        scheduleReconnect();
        return;
      }
      port.onMessage.addListener((request) => {
        if (!request || request.channel !== CHANNEL || request.version !== VERSION ||
            request.type !== 'surface.request') {
          return;
        }
        respondToRequest(request);
      });
      port.onDisconnect.addListener(() => {
        port = null;
        scheduleReconnect();
      });
      postRegistration('surface.register');
    }

    const agent = Object.freeze({
      surfaceId,
      surfaceType,
      describeElement: (element) => describeElement(element, windowObj),
      executeRequest,
      getPerformanceSnapshot: (params) => performanceCollector.snapshot(params || {}),
      getLogs: () => logs.slice()
    });
    windowObj.__lumnoCodexDebugSurfaceAgentV1 = agent;
    if (documentObj.documentElement && documentObj.documentElement.dataset) {
      documentObj.documentElement.dataset.lumnoCodexDebugReady = 'true';
      documentObj.documentElement.dataset.lumnoCodexDebugSurface = surfaceType;
    }
    captureConsole();
    windowObj.addEventListener('load', () => postRegistration('surface.update'), { once: true });
    windowObj.addEventListener('pagehide', () => {
      closed = true;
      performanceCollector.destroy();
      if (reconnectTimer) {
        windowObj.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (port && typeof port.disconnect === 'function') {
        try {
          port.disconnect();
        } catch (error) {
          // Page teardown is already in progress.
        }
      }
      port = null;
    }, { once: true });
    connect();
    return agent;
  }

  function start(options) {
    return createSurfaceAgent(options);
  }

  return Object.freeze({
    CHANNEL,
    VERSION,
    SURFACE_PORT_NAME,
    OFFICIAL_CODEX_EXTENSION_IDS,
    createPerformanceCollector,
    createSurfaceAgent,
    describeElement,
    inferSurfaceType,
    isDevelopmentBridgeEnabled,
    start
  });
});
