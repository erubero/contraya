jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

import { hasAiConsent, AI_CONSENT_VERSION } from '@/lib/aiConsent';

// The rule that decides whether a document may be sent to the AI provider at
// all (App Store guideline 5.1.2(i)). Pure, and tested exhaustively, because
// every branch here is a branch where getting it backwards means either
// sending somebody's lease without asking or refusing to read one they did
// agree to.
describe('hasAiConsent', () => {
  const stamp = '2026-08-23T10:00:00.000Z';

  it('refuses an account that has never been asked', () => {
    expect(hasAiConsent({})).toBe(false);
    expect(hasAiConsent(null)).toBe(false);
    expect(hasAiConsent(undefined)).toBe(false);
  });

  it('accepts a consent recorded at the current version', () => {
    expect(hasAiConsent({ ai_consent_at: stamp, ai_consent_version: AI_CONSENT_VERSION })).toBe(true);
  });

  it('refuses a revoked consent, which is stored as nulls not as a missing key', () => {
    expect(hasAiConsent({ ai_consent_at: null, ai_consent_version: null })).toBe(false);
  });

  it('refuses a stamp with no version, which is what a hand-edited record looks like', () => {
    expect(hasAiConsent({ ai_consent_at: stamp })).toBe(false);
  });

  it('refuses a version with no stamp', () => {
    expect(hasAiConsent({ ai_consent_version: AI_CONSENT_VERSION })).toBe(false);
  });

  it('refuses an empty or blank stamp', () => {
    expect(hasAiConsent({ ai_consent_at: '', ai_consent_version: AI_CONSENT_VERSION })).toBe(false);
    expect(hasAiConsent({ ai_consent_at: '   ', ai_consent_version: AI_CONSENT_VERSION })).toBe(false);
  });

  it('re-asks when the disclosure has moved on since the consent was given', () => {
    expect(hasAiConsent({ ai_consent_at: stamp, ai_consent_version: AI_CONSENT_VERSION - 1 })).toBe(false);
  });

  it('still honours a consent given to a LATER disclosure, which an older binary can only under-use', () => {
    expect(hasAiConsent({ ai_consent_at: stamp, ai_consent_version: AI_CONSENT_VERSION + 1 })).toBe(true);
  });

  it('refuses junk types rather than coercing them', () => {
    expect(hasAiConsent({ ai_consent_at: 1, ai_consent_version: 1 })).toBe(false);
    expect(hasAiConsent({ ai_consent_at: stamp, ai_consent_version: '1' })).toBe(false);
    expect(hasAiConsent({ ai_consent_at: true, ai_consent_version: true })).toBe(false);
  });
});
