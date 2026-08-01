const assert = require('assert');
const fs = require('fs');

const cloudConfig = require('../src/shared/cloud-config.js');

const resolved = cloudConfig.getConfig();
const source = fs.readFileSync('src/shared/cloud-config.js', 'utf8');

assert.equal(resolved.configured, true, 'production cloud config should be enabled');
assert.match(resolved.projectUrl, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
assert.match(resolved.publishableKey, /^sb_publishable_[A-Za-z0-9_-]+$/);
assert.equal(source.includes('sb_secret_'), false, 'server secret keys must never enter client config');
assert.equal(source.includes('service-role'), true, 'client config should retain its server-key warning');

console.log('cloud production config tests passed');
