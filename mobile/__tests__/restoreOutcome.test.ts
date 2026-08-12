import { restoreErrorOutcome, restoreResultOutcome } from '@/data/restoreOutcome';

describe('restoreErrorOutcome', () => {
  it('maps both receipt-in-use codes to other-account', () => {
    // 7 = RECEIPT_ALREADY_IN_USE, 13 = RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER.
    // These are the codes the backend returns when the receipt is bound to a
    // different App User ID; telling that user "no subscription exists" is
    // the lie this module was written to stop.
    expect(restoreErrorOutcome({ code: '7' })).toBe('other-account');
    expect(restoreErrorOutcome({ code: '13' })).toBe('other-account');
  });

  it('accepts numeric codes from the native bridge', () => {
    expect(restoreErrorOutcome({ code: 7 })).toBe('other-account');
    expect(restoreErrorOutcome({ code: 13 })).toBe('other-account');
  });

  it('any other coded failure is an error, not "nothing"', () => {
    expect(restoreErrorOutcome({ code: '10' })).toBe('error'); // network
    expect(restoreErrorOutcome({ code: '0' })).toBe('error');
  });

  it('a shapeless throw is an error', () => {
    expect(restoreErrorOutcome(new Error('boom'))).toBe('error');
    expect(restoreErrorOutcome(undefined)).toBe('error');
    expect(restoreErrorOutcome(null)).toBe('error');
    expect(restoreErrorOutcome('nope')).toBe('error');
  });
});

describe('restoreResultOutcome', () => {
  it('entitled after the call is restored', () => {
    expect(restoreResultOutcome(true)).toBe('restored');
  });

  it('clean call but not entitled is a true nothing-to-restore', () => {
    expect(restoreResultOutcome(false)).toBe('none');
  });
});
