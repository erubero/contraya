jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

import { needsOnboarding, FRESH_ACCOUNT_WINDOW_MS } from '@/lib/onboarding';

const now = new Date('2026-07-19T12:00:00Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

describe('needsOnboarding', () => {
  it('never onboards a completed account', () => {
    expect(
      needsOnboarding({ onboardingComplete: true, accountCreatedAt: minutesAgo(1), localPending: true, now })
    ).toBe(false);
  });

  it('onboards a freshly created account', () => {
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: minutesAgo(1), localPending: false, now })
    ).toBe(true);
  });

  it('skips an old account with no pending flag (returning user)', () => {
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: minutesAgo(60 * 24), localPending: false, now })
    ).toBe(false);
  });

  it('resumes an old account when the local pending flag is set (mid-flow kill)', () => {
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: minutesAgo(60), localPending: true, now })
    ).toBe(true);
  });

  it('treats exactly the window boundary as no longer fresh', () => {
    const created = new Date(now.getTime() - FRESH_ACCOUNT_WINDOW_MS).toISOString();
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: created, localPending: false, now })
    ).toBe(false);
  });

  it('falls back to the pending flag when created_at is missing or junk', () => {
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: null, localPending: false, now })
    ).toBe(false);
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: 'not-a-date', localPending: false, now })
    ).toBe(false);
    expect(
      needsOnboarding({ onboardingComplete: false, accountCreatedAt: null, localPending: true, now })
    ).toBe(true);
  });
});
