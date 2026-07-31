const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const repoRoot = path.join(__dirname, '..');
const backgroundBridge = require('../src/background/codex-debug-bridge.js');
const surfaceBridge = require('../src/shared/codex-debug-surface.js');
const manifest = require('../manifest.json');

const CODEX_STABLE_ID = 'hehggadaopoacecdllhhajmbjkdcmajg';
const CODEX_BETA_ID = 'lfkehkpjohcoelkpembgemeipeppanef';

function createEvent() {
  const listeners = [];
  return {
    listeners,
    addListener(listener) {
      listeners.push(listener);
    },
    emit(...args) {
      return listeners.map((listener) => listener(...args));
    }
  };
}

function createPort(sender) {
  const onMessage = createEvent();
  const onDisconnect = createEvent();
  const posted = [];
  return {
    name: backgroundBridge.SURFACE_PORT_NAME,
    sender: sender || {},
    onMessage,
    onDisconnect,
    posted,
    postMessage(message) {
      posted.push(message);
    }
  };
}

function createDebugChromeApi(runtimeOverrides) {
  return {
    runtime: {
      id: 'kkcjcneagmlhpeaafngjdlpcfjakejgb',
      getManifest() {
        return manifest;
      },
      onConnect: createEvent(),
      onMessageExternal: createEvent(),
      ...runtimeOverrides
    }
  };
}

async function runBackgroundBridgeTests() {
  assert.deepStrictEqual(
    manifest.externally_connectable.ids.slice().sort(),
    [CODEX_BETA_ID, CODEX_STABLE_ID].sort(),
    'source manifest should only allow the official stable and beta Codex extensions'
  );
  assert(!manifest.externally_connectable.ids.includes('*'), 'Codex debug bridge must not allow every extension');

  const chromeApi = createDebugChromeApi();
  const bridge = backgroundBridge.create({ chromeApi, requestTimeoutMs: 100 });
  assert.strictEqual(bridge.isEnabled(), true, 'source development manifest should enable the bridge');
  assert.strictEqual(bridge.attach(), true, 'bridge should attach to runtime events once');
  assert.strictEqual(bridge.attach(), false, 'bridge attachment should be idempotent');

  const port = createPort({
    tab: { id: 27, url: 'chrome-extension://lumno/src/newtab/newtab.html' },
    frameId: 0,
    documentId: 'doc-newtab'
  });
  chromeApi.runtime.onConnect.emit(port);
  port.onMessage.emit({
    channel: backgroundBridge.CHANNEL,
    version: backgroundBridge.VERSION,
    type: 'surface.register',
    surfaceId: 'surface-newtab',
    pageType: 'newtab',
    url: 'chrome-extension://lumno/src/newtab/newtab.html',
    title: 'New Tab',
    readyState: 'complete'
  });

  assert.deepStrictEqual(
    bridge.listSurfaces().map((surface) => ({
      surfaceId: surface.surfaceId,
      type: surface.type,
      tabId: surface.tabId,
      frameId: surface.frameId
    })),
    [{ surfaceId: 'surface-newtab', type: 'newtab', tabId: 27, frameId: 0 }],
    'registered page port should become a targetable debug surface'
  );

  let describeResponse = null;
  const describeAsync = bridge.handleExternalMessage({
    channel: backgroundBridge.CHANNEL,
    version: backgroundBridge.VERSION,
    requestId: 'describe-1',
    method: 'bridge.describe'
  }, { id: CODEX_STABLE_ID }, (response) => {
    describeResponse = response;
  });
  assert.strictEqual(describeAsync, false, 'describe response should be synchronous');
  assert.strictEqual(describeResponse.ok, true);
  assert(describeResponse.result.methods.includes('surface.snapshot'));
  assert.strictEqual(describeResponse.result.developmentOnly, true);

  let listResponse = null;
  bridge.handleExternalMessage({
    channel: backgroundBridge.CHANNEL,
    version: backgroundBridge.VERSION,
    method: 'surfaces.list'
  }, { id: CODEX_BETA_ID }, (response) => {
    listResponse = response;
  });
  assert.strictEqual(listResponse.result.surfaces[0].surfaceId, 'surface-newtab');

  let snapshotResponse = null;
  const snapshotAsync = bridge.handleExternalMessage({
    channel: backgroundBridge.CHANNEL,
    version: backgroundBridge.VERSION,
    requestId: 'snapshot-1',
    method: 'surface.snapshot',
    target: { tabId: 27, type: 'newtab' },
    params: { selector: 'body' }
  }, { id: CODEX_STABLE_ID }, (response) => {
    snapshotResponse = response;
  });
  assert.strictEqual(snapshotAsync, true, 'surface requests should keep the external response channel open');
  const forwarded = port.posted.at(-1);
  assert.strictEqual(forwarded.method, 'surface.snapshot');
  assert.strictEqual(forwarded.params.selector, 'body');
  port.onMessage.emit({
    channel: backgroundBridge.CHANNEL,
    version: backgroundBridge.VERSION,
    type: 'surface.response',
    requestId: forwarded.requestId,
    response: {
      ok: true,
      result: { title: 'New Tab', markup: '<body>ready</body>' }
    }
  });
  assert.strictEqual(snapshotResponse.ok, true);
  assert.strictEqual(snapshotResponse.requestId, 'snapshot-1');
  assert.strictEqual(snapshotResponse.result.title, 'New Tab');

  let unauthorizedResponse = null;
  const unauthorizedResult = bridge.handleExternalMessage({
    channel: backgroundBridge.CHANNEL,
    version: backgroundBridge.VERSION,
    method: 'surfaces.list'
  }, { id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }, (response) => {
    unauthorizedResponse = response;
  });
  assert.strictEqual(unauthorizedResult, false);
  assert.strictEqual(unauthorizedResponse, null, 'untrusted extensions should receive no debug response');

  port.onDisconnect.emit();
  assert.deepStrictEqual(bridge.listSurfaces(), [], 'disconnect should remove the page surface');

  const storeLikeManifest = { ...manifest };
  delete storeLikeManifest.key;
  delete storeLikeManifest.externally_connectable;
  const productionChromeApi = createDebugChromeApi({
    getManifest() {
      return storeLikeManifest;
    }
  });
  const productionBridge = backgroundBridge.create({ chromeApi: productionChromeApi });
  assert.strictEqual(productionBridge.isEnabled(), false, 'store manifest should disable the bridge');
  assert.strictEqual(productionBridge.attach(), false, 'store build should not attach external listeners');
}

async function runSurfaceBridgeTests() {
  const dom = new JSDOM(`<!doctype html>
    <html><head><title>New Tab</title></head><body data-lumno-page="newtab">
      <button id="action" aria-label="Run action">Run</button>
      <input id="query" value="before" />
      <input id="secret" type="password" value="do-not-return" />
      <img id="wallpaper" src="data:image/png;base64,large" />
      <script>window.fixtureScript = true;</script>
    </body></html>`, {
    url: 'chrome-extension://kkcjcneagmlhpeaafngjdlpcfjakejgb/src/newtab/newtab.html',
    pretendToBeVisual: true
  });
  const port = createPort();
  port.disconnect = () => {};
  const chromeApi = createDebugChromeApi({
    connect(connectInfo) {
      assert.strictEqual(connectInfo.name, surfaceBridge.SURFACE_PORT_NAME);
      return port;
    }
  });

  let clickCount = 0;
  dom.window.document.getElementById('action').addEventListener('click', () => {
    clickCount += 1;
  });
  let inputCount = 0;
  dom.window.document.getElementById('query').addEventListener('input', () => {
    inputCount += 1;
  });

  const agent = surfaceBridge.createSurfaceAgent({
    windowObj: dom.window,
    documentObj: dom.window.document,
    chromeApi
  });
  assert(agent, 'development page should create a debug surface agent');
  assert.strictEqual(agent.surfaceType, 'newtab');
  assert.strictEqual(dom.window.document.documentElement.dataset.lumnoCodexDebugReady, 'true');
  assert.strictEqual(port.posted[0].type, 'surface.register');
  assert.strictEqual(port.posted[0].pageType, 'newtab');

  const queryResult = agent.executeRequest('surface.query', { selector: '#action' });
  assert.strictEqual(queryResult.count, 1);
  assert.strictEqual(queryResult.elements[0].text, 'Run');
  assert.strictEqual(queryResult.elements[0].attributes['aria-label'], 'Run action');

  agent.executeRequest('surface.action', { selector: '#action', action: 'click' });
  assert.strictEqual(clickCount, 1, 'click action should invoke the real DOM control');

  const fillResult = agent.executeRequest('surface.action', {
    selector: '#query',
    action: 'fill',
    value: 'after'
  });
  assert.strictEqual(dom.window.document.getElementById('query').value, 'after');
  assert.strictEqual(fillResult.element.value, 'after');
  assert.strictEqual(inputCount, 1, 'fill should dispatch an input event for app state handlers');

  const passwordQuery = agent.executeRequest('surface.query', { selector: '#secret' });
  assert.strictEqual(passwordQuery.elements[0].value, '[redacted]');

  const snapshot = agent.executeRequest('surface.snapshot', { selector: 'body' });
  assert.strictEqual(snapshot.surfaceType, 'newtab');
  assert(!snapshot.markup.includes('<script'), 'snapshot should omit executable scripts');
  assert(!snapshot.markup.includes('do-not-return'), 'snapshot should redact password values');
  assert(snapshot.markup.includes('[omitted-url]'), 'snapshot should omit data and blob resource URLs');

  const waitResult = await agent.executeRequest('surface.waitFor', {
    selector: '#action',
    state: 'attached',
    timeoutMs: 50
  });
  assert.strictEqual(waitResult.state, 'attached');

  dom.window.dispatchEvent(new dom.window.ErrorEvent('error', {
    message: 'fixture runtime failure'
  }));
  const logResult = agent.executeRequest('surface.logs', {});
  assert(
    logResult.entries.some((entry) => entry.level === 'error' && entry.message.includes('fixture runtime failure')),
    'surface should expose captured runtime failures'
  );

  port.onMessage.emit({
    channel: surfaceBridge.CHANNEL,
    version: surfaceBridge.VERSION,
    type: 'surface.request',
    requestId: 'query-through-port',
    method: 'surface.query',
    params: { selector: '#query' }
  });
  await new Promise((resolve) => setImmediate(resolve));
  const portResponse = port.posted.find((message) => message.requestId === 'query-through-port');
  assert(portResponse, 'surface port should return external adapter requests');
  assert.strictEqual(portResponse.response.ok, true);
  assert.strictEqual(portResponse.response.result.elements[0].value, 'after');

  const storeLikeManifest = { ...manifest };
  delete storeLikeManifest.key;
  const disabledChromeApi = createDebugChromeApi({
    getManifest() {
      return storeLikeManifest;
    },
    connect() {
      throw new Error('production surface must not connect');
    }
  });
  const disabledAgent = surfaceBridge.createSurfaceAgent({
    windowObj: new JSDOM('<!doctype html><body></body>', { url: 'https://example.com/' }).window,
    documentObj: new JSDOM('<!doctype html><body></body>', { url: 'https://example.com/' }).window.document,
    chromeApi: disabledChromeApi
  });
  assert.strictEqual(disabledAgent, null, 'store page should not start a debug surface');

  dom.window.close();
}

function runWiringTests() {
  const pagePaths = [
    'src/newtab/newtab.html',
    'src/newtab/lumno-newtab.html',
    'src/options/options.html',
    'src/onboarding/onboarding.html'
  ];
  pagePaths.forEach((relativePath) => {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    assert(
      source.includes('../shared/codex-debug-surface.js'),
      `${relativePath} should load the shared Codex debug surface`
    );
  });

  const backgroundSource = fs.readFileSync(path.join(repoRoot, 'src/background/background.js'), 'utf8');
  assert(backgroundSource.includes("importScripts(chrome.runtime.getURL('src/background/codex-debug-bridge.js'))"));
  assert(
    (backgroundSource.match(/'src\/shared\/codex-debug-surface\.js'/g) || []).length >= 3,
    'search overlay, tab switcher, and document PiP injection paths should install the debug surface'
  );

  const packageSource = fs.readFileSync(path.join(repoRoot, 'scripts/package-store.js'), 'utf8');
  assert(
    packageSource.includes('delete storeManifest.externally_connectable;'),
    'store packaging should remove the development-only external connection declaration'
  );
}

(async () => {
  await runBackgroundBridgeTests();
  await runSurfaceBridgeTests();
  runWiringTests();
  console.log('Codex debug bridge tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
