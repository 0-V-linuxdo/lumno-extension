const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(repoRoot, 'src/background/dev-extension-startup.js'),
  'utf8'
);

function loadRuntime() {
  const sandbox = { Promise };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'dev-extension-startup.js' });
  return sandbox.LumnoDevExtensionStartup;
}

async function run() {
  const runtime = loadRuntime();
  assert.strictEqual(runtime.isDevelopmentInstall({ installType: 'development' }), true);
  assert.strictEqual(runtime.isDevelopmentInstall({ installType: 'normal' }), false);
  assert.strictEqual(runtime.isSameVersionReload({ reason: 'update', previousVersion: '0.9.21' }, '0.9.21'), true);
  assert.strictEqual(runtime.isSameVersionReload({ reason: 'update', previousVersion: '0.9.20' }, '0.9.21'), false);
  assert.strictEqual(runtime.isSameVersionReload({ reason: 'chrome_update', previousVersion: '0.9.21' }, '0.9.21'), false);

  let reloadCount = 0;
  const developmentResult = await runtime.reloadDevelopmentExtensionOnStartup({
    management: {
      getSelf() {
        return Promise.resolve({ installType: 'development' });
      }
    },
    runtime: {
      reload() {
        reloadCount += 1;
      }
    }
  });
  assert.strictEqual(developmentResult.reloaded, true);
  assert.strictEqual(reloadCount, 1);

  const storeResult = await runtime.reloadDevelopmentExtensionOnStartup({
    management: {
      getSelf() {
        return Promise.resolve({ installType: 'normal' });
      }
    },
    runtime: {
      reload() {
        reloadCount += 1;
      }
    }
  });
  assert.strictEqual(storeResult.reloaded, false);
  assert.strictEqual(storeResult.reason, 'not-development');
  assert.strictEqual(reloadCount, 1);

  const unavailableResult = await runtime.reloadDevelopmentExtensionOnStartup({});
  assert.strictEqual(unavailableResult.reason, 'api-unavailable');

  const failedResult = await runtime.reloadDevelopmentExtensionOnStartup({
    management: {
      getSelf() {
        return Promise.reject(new Error('unavailable'));
      }
    },
    runtime: { reload() {} }
  });
  assert.strictEqual(failedResult.reloaded, false);
  assert.strictEqual(failedResult.reason, 'get-self-failed');

  const backgroundSource = fs.readFileSync(
    path.join(repoRoot, 'src/background/background.js'),
    'utf8'
  );
  assert.match(backgroundSource, /importScripts\(chrome\.runtime\.getURL\('src\/background\/dev-extension-startup\.js'\)\)/);
  assert.match(backgroundSource, /DEV_EXTENSION_STARTUP\.isSameVersionReload\(details, chrome\.runtime\.getManifest\(\)\.version\)/);
}

run().then(() => {
  console.log('development extension startup tests passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
