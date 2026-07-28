// Parsing for the password-recovery deep link Supabase sends people back on.
//
// Supabase returns the recovery session in the URL *fragment* when the client
// uses the implicit flow (the supabase-js default, and what this app uses), or
// as a ?code= query param under pkce. Failures come back as error params in
// either position. Parse both so this survives a flowType change.

export type RecoveryParams = {
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
};

export function parseRecoveryParams(url: string): RecoveryParams {
  const merged = new URLSearchParams();
  const [beforeHash, hash = ''] = url.split('#');
  const q = beforeHash.indexOf('?');
  if (q >= 0) new URLSearchParams(beforeHash.slice(q + 1)).forEach((v, k) => merged.set(k, v));
  if (hash) new URLSearchParams(hash).forEach((v, k) => merged.set(k, v));

  return {
    error: merged.get('error_description') ?? merged.get('error'),
    accessToken: merged.get('access_token'),
    refreshToken: merged.get('refresh_token'),
    code: merged.get('code'),
  };
}

export function isExpiredLinkError(error: string): boolean {
  return /expired/i.test(error);
}
