jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

import { reflectOnAnswers } from '@/lib/onboarding';

describe('reflectOnAnswers', () => {
  it('returns null for no answers', () => {
    expect(reflectOnAnswers(null)).toBeNull();
    expect(reflectOnAnswers(undefined)).toBeNull();
    expect(reflectOnAnswers({})).toBeNull();
  });

  it('prioritizes missed_claim yes over everything else', () => {
    const r = reflectOnAnswers({ missed_claim: 'yes', forgets: 'always', reminders: 'later' });
    expect(r?.headline).toBe('You told us it happened before.');
  });

  it('reflects missed_claim unsure', () => {
    const r = reflectOnAnswers({ missed_claim: 'unsure' });
    expect(r?.headline).toBe('You said you were never sure.');
  });

  it('reflects forgets rarely when missed_claim does not fire', () => {
    const r = reflectOnAnswers({ forgets: 'rarely', missed_claim: 'no' });
    expect(r?.headline).toBe('You said you do not always get to the fine print.');
  });

  it('reflects a careful reader who never missed anything', () => {
    const r = reflectOnAnswers({ forgets: 'always', missed_claim: 'no' });
    expect(r?.headline).toBe('You said you read everything already.');
  });

  it('falls back to reminders yes as the last signal', () => {
    const r = reflectOnAnswers({ forgets: 'sometimes', missed_claim: 'no', reminders: 'yes' });
    expect(r?.headline).toBe('You asked for a heads up.');
  });

  it('returns null for a low-signal combination', () => {
    expect(reflectOnAnswers({ forgets: 'sometimes', missed_claim: 'no', reminders: 'later' })).toBeNull();
    expect(reflectOnAnswers({ skipped: true })).toBeNull();
  });
});
