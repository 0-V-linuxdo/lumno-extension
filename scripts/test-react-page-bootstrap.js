const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(repoRoot, 'src/shared/react-page-bootstrap.js'),
  'utf8'
);
const executableSource = source.replace(
  'import(reactEntryUrl)',
  '__importReact(reactEntryUrl)'
);
assert.notStrictEqual(
  executableSource,
  source,
  'test harness should intercept the bootstrap dynamic import'
);

const NEWTAB_CONFIG = Object.freeze({
  reactEntry: '../react/newtab-islands.js',
  pageEntry: '../newtab/newtab.js',
  reactState: 'LumnoNewtabReactBootstrap',
  pageRuntime: 'newtab'
});
const OPTIONS_CONFIG = Object.freeze({
  reactEntry: '../react/options-islands.js',
  pageEntry: '../options/options.js',
  reactState: 'LumnoOptionsReactBootstrap',
  pageRuntime: 'options'
});
const ONBOARDING_CONFIG = Object.freeze({
  reactEntry: '../react/onboarding-islands.js',
  pageEntry: '../onboarding/onboarding.js',
  reactState: 'LumnoOnboardingReactBootstrap',
  pageRuntime: 'onboarding'
});

async function runBootstrap({ config, importResult }) {
  const appendedScripts = [];
  const warnings = [];
  const timers = new Map();
  let nextTimerId = 1;

  const sandbox = {
    URL,
    console: {
      warn(...args) {
        warnings.push(args);
      }
    },
    document: {
      currentScript: {
        src: 'chrome-extension://lumno/src/shared/react-page-bootstrap.js',
        dataset: { ...config }
      },
      documentElement: {
        dataset: {}
      },
      createElement(tagName) {
        return {
          dataset: {},
          src: '',
          tagName: String(tagName).toUpperCase()
        };
      },
      body: {
        appendChild(node) {
          appendedScripts.push(node);
        }
      }
    },
    setTimeout(callback) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    __importReact(specifier) {
      assert.strictEqual(
        String(specifier),
        `chrome-extension://lumno/src/react/${config.pageRuntime}-islands.js`,
        'bootstrap should resolve the configured React entry relative to itself'
      );
      if (importResult === 'success') {
        sandbox[config.reactState].reactReady = true;
        return Promise.resolve({});
      }
      if (importResult === 'failure') {
        return Promise.reject(new Error('fixture import failure'));
      }
      return new Promise(() => {});
    }
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const script = new vm.Script(executableSource, {
    filename: 'react-page-bootstrap.js'
  });

  script.runInContext(context);
  for (let turn = 0; turn < 4; turn += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  return {
    appendedScripts,
    context,
    timers,
    warnings
  };
}

function assertInjectedPage(result, config, expectedMode) {
  assert.strictEqual(
    result.context.document.documentElement.dataset.lumnoReactRuntime,
    expectedMode
  );
  assert.strictEqual(result.appendedScripts.length, 1);
  assert.strictEqual(
    result.appendedScripts[0].src,
    `chrome-extension://lumno/src/${config.pageRuntime}/${config.pageRuntime}.js`
  );
  assert.strictEqual(
    result.appendedScripts[0].dataset.lumnoPageRuntime,
    config.pageRuntime
  );
}

(async () => {
  const newtabSuccess = await runBootstrap({
    config: NEWTAB_CONFIG,
    importResult: 'success'
  });
  assert.deepStrictEqual(newtabSuccess.warnings, []);
  assertInjectedPage(newtabSuccess, NEWTAB_CONFIG, 'react');
  assert.strictEqual(newtabSuccess.timers.size, 0);

  const optionsSuccess = await runBootstrap({
    config: OPTIONS_CONFIG,
    importResult: 'success'
  });
  assert.deepStrictEqual(optionsSuccess.warnings, []);
  assertInjectedPage(optionsSuccess, OPTIONS_CONFIG, 'react');
  assert.strictEqual(optionsSuccess.timers.size, 0);

  const onboardingSuccess = await runBootstrap({
    config: ONBOARDING_CONFIG,
    importResult: 'success'
  });
  assert.deepStrictEqual(onboardingSuccess.warnings, []);
  assertInjectedPage(onboardingSuccess, ONBOARDING_CONFIG, 'react');
  assert.strictEqual(onboardingSuccess.timers.size, 0);

  const failure = await runBootstrap({
    config: NEWTAB_CONFIG,
    importResult: 'failure'
  });
  assertInjectedPage(failure, NEWTAB_CONFIG, 'legacy');
  assert.strictEqual(failure.warnings.length, 1);
  assert.strictEqual(failure.timers.size, 0);

  const timeout = await runBootstrap({
    config: OPTIONS_CONFIG,
    importResult: 'pending'
  });
  assert.strictEqual(timeout.appendedScripts.length, 0);
  assert.strictEqual(timeout.timers.size, 1);
  Array.from(timeout.timers.values())[0]();
  assertInjectedPage(timeout, OPTIONS_CONFIG, 'legacy');
  assert.strictEqual(
    timeout.context.LumnoOptionsReactBootstrap.allowReactUpgrade,
    false,
    'a timed-out React entry should not replace fallback APIs after the page starts'
  );

  console.log('shared React page bootstrap tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
