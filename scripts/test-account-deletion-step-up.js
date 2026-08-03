const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const { build } = require('esbuild');

const repoRoot = path.join(__dirname, '..');
const authSource = fs.readFileSync(path.join(repoRoot, 'supabase/functions/_shared/auth.ts'), 'utf8');
const deletionSource = fs.readFileSync(
  path.join(repoRoot, 'supabase/functions/delete-account/index.ts'),
  'utf8'
);
const nowSeconds = Math.floor(Date.now() / 1000);

function claims(userId, sessionId, amr, issuedAt = nowSeconds) {
  return {
    iss: 'https://project.example/auth/v1',
    sub: userId,
    aud: 'authenticated',
    exp: nowSeconds + 3600,
    iat: issuedAt,
    role: 'authenticated',
    aal: 'aal1',
    session_id: sessionId,
    amr
  };
}

const tokenFixtures = {
  primary: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-primary', [{ method: 'oauth', timestamp: nowSeconds - 3600 }])
  },
  same_session: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-primary', [{ method: 'oauth', timestamp: nowSeconds - 5 }])
  },
  other_user: {
    user: { id: 'user-b' },
    claims: claims('user-b', 'session-other-user', [{ method: 'oauth', timestamp: nowSeconds - 5 }])
  },
  stale_oauth: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-stale', [{ method: 'oauth', timestamp: nowSeconds - 3600 }])
  },
  non_oauth: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-password', [{ method: 'password', timestamp: nowSeconds - 5 }])
  },
  oauth_code_only: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-oauth-code', [{
      method: 'oauth_provider/authorization_code',
      timestamp: nowSeconds - 5
    }])
  },
  refresh_only: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-refreshed', [{ method: 'oauth', timestamp: nowSeconds - 3600 }], nowSeconds)
  },
  valid_step_up: {
    user: { id: 'user-a' },
    claims: claims('user-a', 'session-step-up', [{ method: 'oauth', timestamp: nowSeconds - 5 }])
  }
};

function createSupabaseMock() {
  const activeSessions = new Set(
    Object.values(tokenFixtures).map((fixture) => fixture.claims.session_id)
  );
  const consumedStepUpSessions = new Set();
  const operations = [];

  function readToken(options, explicitToken) {
    if (explicitToken) return explicitToken;
    const authorization = options?.global?.headers?.Authorization || '';
    return authorization.toLowerCase().startsWith('bearer ')
      ? authorization.slice('bearer '.length)
      : '';
  }

  function createClient(_url, key, options = {}) {
    if (key === 'secret-key') {
      return {
        auth: {
          admin: {
            async signOut(token, scope) {
              const fixture = tokenFixtures[token];
              operations.push(`signOut:${token}:${scope}`);
              if (!fixture) {
                return { error: new Error('session_not_found') };
              }
              return { error: null };
            },
            async deleteUser(userId, softDelete) {
              operations.push(`deleteUser:${userId}:${softDelete}`);
              return { error: null };
            }
          }
        },
        async rpc(name, args) {
          assert.strictEqual(name, 'lumno_consume_delete_step_up_session');
          const key = `${args.p_user_id}:${args.p_step_up_session_id}`;
          const consumed = !consumedStepUpSessions.has(key);
          if (consumed) consumedStepUpSessions.add(key);
          operations.push(`consume:${args.p_step_up_session_id}:${consumed}`);
          return { data: consumed, error: null };
        },
        storage: {
          from(bucket) {
            assert.strictEqual(bucket, 'lumno-user-media');
            return {
              async list(prefix, listOptions) {
                operations.push(`list:${prefix}:${listOptions.offset}`);
                return {
                  data: listOptions.offset === 0
                    ? [{ id: 'object-id', name: 'wallpaper.webp' }]
                    : [],
                  error: null
                };
              },
              async remove(paths) {
                operations.push(`remove:${paths.join(',')}`);
                return { error: null };
              }
            };
          }
        }
      };
    }

    assert.strictEqual(key, 'publishable-key');
    return {
      auth: {
        async getClaims(explicitToken) {
          const token = readToken(options, explicitToken);
          const fixture = tokenFixtures[token];
          return fixture
            ? { data: { claims: fixture.claims }, error: null }
            : { data: null, error: new Error('invalid_token') };
        },
        async getUser(explicitToken) {
          const token = readToken(options, explicitToken);
          const fixture = tokenFixtures[token];
          if (!fixture || !activeSessions.has(fixture.claims.session_id)) {
            return { data: { user: null }, error: new Error('session_not_found') };
          }
          return { data: { user: fixture.user }, error: null };
        }
      }
    };
  }

  return { activeSessions, consumedStepUpSessions, createClient, operations };
}

async function loadHandler() {
  let handler = null;
  global.Deno = {
    env: {
      get(name) {
        return {
          SUPABASE_URL: 'https://project.example',
          SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'publishable-key' }),
          SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'secret-key' })
        }[name] || '';
      }
    },
    serve(candidate) {
      handler = candidate;
    }
  };

  const result = await build({
    entryPoints: [path.join(repoRoot, 'supabase/functions/delete-account/index.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    write: false,
    plugins: [{
      name: 'mock-supabase',
      setup(builder) {
        builder.onResolve({ filter: /^jsr:@supabase\/supabase-js@2$/ }, () => ({
          path: 'supabase-mock',
          namespace: 'account-deletion-test'
        }));
        builder.onLoad({ filter: /.*/, namespace: 'account-deletion-test' }, () => ({
          contents: 'export const createClient = (...args) => globalThis.__accountDeletionSupabase.createClient(...args);',
          loader: 'js'
        }));
      }
    }]
  });
  const compiledModule = new Module('account-deletion-edge-function-test');
  compiledModule.filename = path.join(repoRoot, '.account-deletion-edge-function-test.cjs');
  compiledModule.paths = Module._nodeModulePaths(repoRoot);
  compiledModule._compile(result.outputFiles[0].text, compiledModule.filename);
  assert.strictEqual(typeof handler, 'function', 'the bundled Edge Function should register a handler');
  return handler;
}

async function invoke(handler, mock, stepUpAccessToken) {
  global.__accountDeletionSupabase = mock;
  const body = { confirmation: 'DELETE' };
  if (stepUpAccessToken !== undefined) body.step_up_access_token = stepUpAccessToken;
  const response = await handler(new Request('https://project.example/functions/v1/delete-account', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer primary',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }));
  return { response, data: await response.json() };
}

function assertNoDeletion(mock, label) {
  assert.strictEqual(
    mock.operations.some((operation) => operation.startsWith('list:') ||
      operation.startsWith('remove:') || operation.startsWith('deleteUser:')),
    false,
    `${label} must not reach account data deletion`
  );
}

async function assertRejected(handler, token, label) {
  const mock = createSupabaseMock();
  const { response, data } = await invoke(handler, mock, token);
  assert.strictEqual(response.status, 403, `${label} should require a new step-up proof`);
  assert.deepStrictEqual(data, { ok: false, error: 'step_up_required' });
  assertNoDeletion(mock, label);
}

async function run() {
  assert.match(authSource, /auth\.getClaims\(token\)/,
    'JWT claims must be verified through the Supabase claims API');
  assert.match(authSource, /auth\.getUser\(\)/,
    'the verified JWT must also resolve to an active Supabase session');
  assert.doesNotMatch(authSource, /atob\(|decodeJWT|\.split\(['"]\.['"]\)/,
    'authentication decisions must not use locally decoded, unverified JWT payloads');
  assert.match(deletionSource, /STEP_UP_MAX_AGE_SECONDS = 5 \* 60/);
  assert.match(deletionSource, /lumno_consume_delete_step_up_session/,
    'the delete proof must be consumed through the database replay barrier');
  assert.match(deletionSource, /\.signOut\(proof\.accessToken, 'local'\)/,
    'the independent proof session should also be signed out after atomic consumption');

  const handler = await loadHandler();

  await assertRejected(handler, undefined, 'a missing second token');
  await assertRejected(handler, 'primary', 'the primary token reused as proof');
  await assertRejected(handler, 'same_session', 'a refreshed token from the primary session');
  await assertRejected(handler, 'other_user', 'a proof for a different user');
  await assertRejected(handler, 'stale_oauth', 'stale OAuth authentication');
  await assertRejected(handler, 'non_oauth', 'non-OAuth authentication');
  await assertRejected(handler, 'oauth_code_only',
    'an authorization-code exchange without provider reauthentication');
  await assertRejected(handler, 'refresh_only', 'a newly issued token carrying old OAuth evidence');

  const validMock = createSupabaseMock();
  const valid = await invoke(handler, validMock, 'valid_step_up');
  assert.strictEqual(valid.response.status, 200);
  assert.deepStrictEqual(valid.data, { ok: true });
  assert.deepStrictEqual(validMock.operations, [
    'consume:session-step-up:true',
    'signOut:valid_step_up:local',
    'list:user-a:0',
    'remove:user-a/wallpaper.webp',
    'deleteUser:user-a:false'
  ], 'valid proof should be consumed before storage and user deletion, in that order');

  const replay = await invoke(handler, validMock, 'valid_step_up');
  assert.strictEqual(replay.response.status, 403, 'a consumed proof token must not be replayable');
  assert.deepStrictEqual(replay.data, { ok: false, error: 'step_up_required' });
  assert.strictEqual(
    validMock.operations.filter((operation) => operation.startsWith('deleteUser:')).length,
    1,
    'replaying the consumed proof must not reach deletion again'
  );
  assert.strictEqual(validMock.consumedStepUpSessions.size, 1,
    'the same step-up session should be consumed exactly once');

  console.log('account deletion step-up tests passed');
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
