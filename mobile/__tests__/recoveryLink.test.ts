import 'react-native-url-polyfill/auto';
import { parseRecoveryParams, isExpiredLinkError } from '@/lib/recoveryLink';

describe('parseRecoveryParams', () => {
  it('reads the session out of the fragment (implicit flow, the default)', () => {
    const p = parseRecoveryParams(
      'contraya://reset-password#access_token=abc.def.ghi&refresh_token=rrr&expires_in=3600&token_type=bearer&type=recovery'
    );
    expect(p.accessToken).toBe('abc.def.ghi');
    expect(p.refreshToken).toBe('rrr');
    expect(p.error).toBeNull();
    expect(p.code).toBeNull();
  });

  it('reads the code out of the query string (pkce flow)', () => {
    const p = parseRecoveryParams('contraya://reset-password?code=some-auth-code');
    expect(p.code).toBe('some-auth-code');
    expect(p.accessToken).toBeNull();
    expect(p.error).toBeNull();
  });

  it('surfaces an expired-link error from the fragment', () => {
    const p = parseRecoveryParams(
      'contraya://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );
    expect(p.error).toBe('Email link is invalid or has expired');
    expect(isExpiredLinkError(p.error!)).toBe(true);
    expect(p.accessToken).toBeNull();
  });

  it('surfaces an error from the query string too', () => {
    const p = parseRecoveryParams('contraya://reset-password?error=access_denied');
    expect(p.error).toBe('access_denied');
  });

  it('prefers the human-readable description over the error code', () => {
    const p = parseRecoveryParams(
      'contraya://reset-password#error=access_denied&error_description=Something+went+wrong'
    );
    expect(p.error).toBe('Something went wrong');
  });

  it('returns all-null for a bare link with nothing attached', () => {
    const p = parseRecoveryParams('contraya://reset-password');
    expect(p).toEqual({ error: null, accessToken: null, refreshToken: null, code: null });
  });

  it('handles the triple-slash form expo-linking can produce', () => {
    const p = parseRecoveryParams('contraya:///reset-password#access_token=t&refresh_token=r');
    expect(p.accessToken).toBe('t');
    expect(p.refreshToken).toBe('r');
  });

  it('does not treat a non-expiry error as expired', () => {
    expect(isExpiredLinkError('access_denied')).toBe(false);
  });
});
