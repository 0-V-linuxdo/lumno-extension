import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

export type VerifiedJwtClaims = {
  sub: string;
  session_id: string;
  iat: number;
  exp: number;
  amr?: unknown;
  [key: string]: unknown;
};

export type VerifiedAccessToken = {
  accessToken: string;
  claims: VerifiedJwtClaims;
  user: User;
};

export type AuthorizedClients = {
  admin: SupabaseClient;
  accessToken: string;
  claims: VerifiedJwtClaims;
  user: User;
};

type AuthConfiguration = {
  publishableKey: string;
  secretKey: string;
  url: string;
};

function readDefaultKey(dictionaryName: string, legacyName: string): string {
  const dictionary = Deno.env.get(dictionaryName) || '';
  if (dictionary) {
    try {
      const parsed = JSON.parse(dictionary) as Record<string, unknown>;
      const value = String(parsed.default || '').trim();
      if (value) return value;
    } catch (_error) {
      throw new Error(`${dictionaryName} is malformed`);
    }
  }
  return String(Deno.env.get(legacyName) || '').trim();
}

function readAuthConfiguration(): AuthConfiguration {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey = readDefaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const secretKey = readDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishableKey || !secretKey) {
    throw new Error('Supabase function secrets are not configured');
  }
  return { url, publishableKey, secretKey };
}

async function verifyAccessTokenWithConfiguration(
  accessToken: string,
  configuration: AuthConfiguration
): Promise<VerifiedAccessToken | null> {
  const token = String(accessToken || '').trim();
  if (!token) return null;

  const userClient = createClient(configuration.url, configuration.publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const [claimsResult, userResult] = await Promise.all([
    userClient.auth.getClaims(token),
    userClient.auth.getUser()
  ]);
  const claims = claimsResult.data?.claims;
  const user = userResult.data?.user;
  if (
    claimsResult.error ||
    userResult.error ||
    !claims ||
    !user ||
    claims.sub !== user.id ||
    typeof claims.session_id !== 'string' ||
    !claims.session_id
  ) {
    return null;
  }

  return {
    accessToken: token,
    claims,
    user
  };
}

export async function verifyAccessToken(accessToken: string): Promise<VerifiedAccessToken | null> {
  return verifyAccessTokenWithConfiguration(accessToken, readAuthConfiguration());
}

export async function authorizeRequest(request: Request): Promise<AuthorizedClients | null> {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const configuration = readAuthConfiguration();
  const verified = await verifyAccessTokenWithConfiguration(
    authorization.slice('bearer '.length),
    configuration
  );
  if (!verified) return null;

  return {
    ...verified,
    admin: createClient(configuration.url, configuration.secretKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  };
}
