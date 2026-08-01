import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

export type AuthorizedClients = {
  admin: SupabaseClient;
  user: User;
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

export async function authorizeRequest(request: Request): Promise<AuthorizedClients | null> {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const url = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey = readDefaultKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const secretKey = readDefaultKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishableKey || !secretKey) {
    throw new Error('Supabase function secrets are not configured');
  }

  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return {
    user: data.user,
    admin: createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  };
}
