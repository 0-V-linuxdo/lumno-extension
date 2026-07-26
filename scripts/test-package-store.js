const assert = require('assert');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
const zipPath = path.join(repoRoot, 'dist', `lumno-store-v${manifest.version}.zip`);
const expectedDevExtensionId = 'kkcjcneagmlhpeaafngjdlpcfjakejgb';

function getExtensionIdFromManifestKey(key) {
  const publicKey = Buffer.from(String(key || ''), 'base64');
  const digestPrefix = crypto.createHash('sha256').update(publicKey).digest().subarray(0, 16);
  return Array.from(digestPrefix)
    .flatMap((byte) => [byte >> 4, byte & 0x0f])
    .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
    .join('');
}

assert.strictEqual(
  getExtensionIdFromManifestKey(manifest.key),
  expectedDevExtensionId,
  'source manifest should keep the dedicated development extension ID stable'
);

execFileSync(process.execPath, ['scripts/package-store.js'], {
  cwd: repoRoot,
  stdio: 'pipe'
});

const entries = execFileSync('zipinfo', ['-1', zipPath], {
  cwd: repoRoot,
  encoding: 'utf8'
}).split(/\r?\n/).filter(Boolean);
const packagedManifest = JSON.parse(execFileSync('unzip', ['-p', zipPath, 'manifest.json'], {
  cwd: repoRoot,
  encoding: 'utf8'
}));

assert(
  entries.every((entry) => !entry.startsWith('assets/images/readme/')),
  'store package should not include README-only images'
);
assert(
  entries.includes('src/react/newtab-islands.js') &&
    entries.includes('src/react/options-islands.js') &&
    entries.includes('src/react/onboarding-islands.js') &&
    entries.includes('src/react/react-shared.js') &&
    entries.includes('src/react/react-runtime.js') &&
    entries.includes('src/shared/react-page-bootstrap.js'),
  'store package should include both page entries, shared React chunks, and bootstrap'
);
assert(
  entries.includes('src/newtab/shortcuts-view.js'),
  'store package should include the shortcuts grid fallback'
);
assert(
  entries.every((entry) => !entry.startsWith('react-src/')),
  'store package should not include React source or test files'
);
assert(
  !Object.prototype.hasOwnProperty.call(packagedManifest, 'key'),
  'store package should not include the dedicated development key'
);
assert.strictEqual(
  packagedManifest.version,
  manifest.version,
  'store package should preserve the source manifest version'
);

console.log('package store tests passed');
