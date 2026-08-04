const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const migrationDirectory = path.join(__dirname, '..', 'supabase', 'migrations');
const manifestPath = path.join(__dirname, '..', 'supabase', 'deployed-migration-checksums.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const checksums = manifest.sha256 && typeof manifest.sha256 === 'object'
  ? manifest.sha256
  : {};
const migrationFiles = fs.readdirSync(migrationDirectory)
  .filter((file) => /^\d{12}_.+\.sql$/.test(file))
  .sort();

assert(migrationFiles.includes(manifest.lockedThrough),
  'the deployed migration boundary must name an existing migration');
const lockedThroughIndex = migrationFiles.indexOf(manifest.lockedThrough);

migrationFiles.forEach((file, index) => {
  if (index <= lockedThroughIndex) {
    assert.strictEqual(typeof checksums[file], 'string',
      `deployed migration ${file} must have a locked checksum`);
  } else {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(checksums, file), false,
      `undeployed migration ${file} must not be added to the lock manifest early`);
  }
});

Object.entries(checksums).forEach(([file, expected]) => {
  const contents = fs.readFileSync(path.join(migrationDirectory, file));
  const actual = crypto.createHash('sha256').update(contents).digest('hex');
  assert.strictEqual(actual, expected,
    `${file} was already deployed and is immutable; add a new forward migration instead`);
});

console.log(`migration immutability tests passed (${Object.keys(checksums).length} locked)`);
