const assert = require('assert');

const manifestResources = require('./check-manifest-resources.js');

assert.strictEqual(
  manifestResources.normalizeManifestResourcePath('assets\\images\\site-search\\google.svg'),
  'assets/images/site-search/google.svg'
);
assert.strictEqual(
  manifestResources.manifestResourcePatternMatchesPath(
    'assets/images/site-search/*.svg',
    'assets\\images\\site-search\\google.svg'
  ),
  true,
  'manifest wildcard resources should match Windows filesystem paths'
);
assert.strictEqual(
  manifestResources.manifestResourcePatternMatchesPath(
    'assets/images/site-search/*.png',
    'assets\\images\\site-search\\google.svg'
  ),
  false
);

console.log('manifest resource path tests passed');
