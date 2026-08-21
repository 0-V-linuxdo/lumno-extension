const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sandbox = {
  console,
  URL
};
sandbox.globalThis = sandbox;

vm.runInNewContext(fs.readFileSync('src/shared/url-guards.js', 'utf8'), sandbox, {
  filename: 'src/shared/url-guards.js'
});

const guards = sandbox.LumnoUrlGuards;
assert.ok(guards, 'LumnoUrlGuards should be exported');

assert.strictEqual(guards.isBrowserExtensionProtocol('chrome-extension:'), true);
assert.strictEqual(guards.isBrowserExtensionProtocol('moz-extension:'), true);
assert.strictEqual(guards.isBrowserExtensionProtocol('https:'), false);

assert.strictEqual(guards.isBrowserNewtabUrl('chrome://newtab/'), true);
assert.strictEqual(guards.isBrowserNewtabUrl('about:newtab'), true);
assert.strictEqual(guards.isBrowserNewtabUrl('about:home'), true);
assert.strictEqual(guards.isBrowserNewtabUrl('chrome://new-tab-page/'), true);
assert.strictEqual(guards.isBrowserNewtabUrl('edge://newtab/'), true);
assert.strictEqual(guards.isBrowserNewtabUrl('chrome://extensions/'), false);
assert.strictEqual(guards.isBrowserInternalUrl('chrome://extensions/'), true);
assert.strictEqual(guards.isBrowserInternalUrl('about:blank'), true);
assert.strictEqual(guards.isBrowserInternalUrl('https://example.com/'), false);

const newtabJs = fs.readFileSync('src/newtab/newtab.js', 'utf8');
assert.ok(
  newtabJs.includes('isBrowserNewtabUrl(url)'),
  'newtab recent-site filtering should use the precise browser newtab guard'
);
assert.ok(
  newtabJs.includes('shouldPrioritizeTabUrl: isBrowserPageRecentUrl'),
  'newtab recent-site merging should prioritize non-newtab browser pages from open tabs'
);

assert.strictEqual(guards.isRestrictedUrl('chrome://extensions/'), true);
assert.strictEqual(guards.isRestrictedUrl('chrome-extension://abc/src/newtab/newtab.html'), true);
assert.strictEqual(guards.isRestrictedUrl('https://chromewebstore.google.com/detail/example/abc'), true);
assert.strictEqual(guards.isRestrictedUrl('https://chrome.google.com/webstore/detail/example/abc'), true);
assert.strictEqual(guards.isRestrictedUrl('https://microsoftedge.microsoft.com/addons/detail/example/abc'), true);
assert.strictEqual(guards.isRestrictedUrl('https://addons.mozilla.org/firefox/addon/example'), true);
assert.strictEqual(guards.canOpenOverlayOnUrl('https://addons.mozilla.org/firefox/addon/example'), false);
assert.strictEqual(guards.canOpenOverlayOnUrl('moz-extension://abc/src/newtab/newtab.html'), false);

const geckoRuntime = {
  runtime: {
    id: 'lumno@0-v-linuxdo.github.io',
    getURL(path) {
      return `moz-extension://uuid-123/${path || ''}`;
    }
  }
};
assert.strictEqual(
  guards.isOwnExtensionUrl('moz-extension://uuid-123/src/newtab/newtab.html', geckoRuntime),
  true,
  'Firefox own pages use the moz-extension UUID origin, not the gecko id hostname'
);
assert.strictEqual(
  guards.isOwnExtensionUrl('moz-extension://other-id/src/newtab/newtab.html', geckoRuntime),
  false
);
assert.strictEqual(
  guards.isOwnExtensionUrl('https://example.com/', geckoRuntime),
  false
);

assert.strictEqual(guards.canOpenOverlayOnUrl('file:///Users/kevinxu/test.html'), true);
assert.strictEqual(guards.canOpenOverlayOnUrl('https://x.com/home'), true);
assert.strictEqual(guards.canOpenOverlayOnUrl('https://chromewebstore.google.com/detail/example/abc'), false);

assert.strictEqual(guards.canFetchPageForFavicon('https://example.com/'), true);
assert.strictEqual(guards.canFetchPageForFavicon('https://chromewebstore.google.com/detail/example/abc'), false);
assert.strictEqual(guards.canFetchPageForFavicon('https://chrome.google.com/webstore/devconsole/abc'), false);
assert.strictEqual(guards.canFetchPageForFavicon('file:///Users/kevinxu/test.html'), false);

console.log('url guards ok');
