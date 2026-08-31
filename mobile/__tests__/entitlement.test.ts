import { hasPremium, ENTITLEMENT, PREMIUM_PRODUCT_IDS } from '@/data/entitlement';

// The rule that decides whether somebody has paid. It is two-sourced, and the
// second source exists because of a real incident: on 2026-08-30 RevenueCat's
// own Customer Center said "Contraya Premium, Active" on the owner's phone
// while the app said "Upgrade to Premium", same session, same App User ID. The
// subscription was real and on the right account; the dashboard had not mapped
// the product to the `premium` entitlement, and the app read only the
// entitlement. Every Add hit a paywall that then said "You're currently
// subscribed to this."
describe('hasPremium', () => {
  it('grants on the entitlement, which stays the primary check', () => {
    expect(hasPremium({ entitlementIds: [ENTITLEMENT], subscriptions: [] })).toBe(true);
  });

  it.each(PREMIUM_PRODUCT_IDS.map((id) => [id]))(
    'grants on an active %s even with NO entitlement mapped',
    (productId) => {
      // The regression test for the incident above. If this ever goes red
      // because someone "tightened" the rule, read data/entitlement.ts first.
      expect(hasPremium({ entitlementIds: [], subscriptions: [productId] })).toBe(true);
    }
  );

  it('refuses when there is neither an entitlement nor a subscription', () => {
    expect(hasPremium({ entitlementIds: [], subscriptions: [] })).toBe(false);
  });

  it('refuses on a subscription that is not one of ours', () => {
    // The fallback is a floor under OUR products, not a blanket "has paid
    // for something, somewhere" check.
    expect(
      hasPremium({ entitlementIds: [], subscriptions: ['com.someoneelse.pro'] })
    ).toBe(false);
  });

  it('refuses on an entitlement that is not ours', () => {
    // Guards the case-sensitivity trap: a dashboard entitlement named
    // "Premium" is not `premium`, and that alone reproduces the incident.
    expect(hasPremium({ entitlementIds: ['Premium'], subscriptions: [] })).toBe(false);
  });
});
