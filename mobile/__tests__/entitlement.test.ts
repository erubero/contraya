import * as fs from 'fs';
import * as path from 'path';
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

// Asked by the owner on 2026-08-31, and worth answering in test names rather
// than leaving people to re-derive it from the SDK docs: granting on a product
// rather than only on the entitlement does NOT hand a churned subscriber the
// app forever. RevenueCat filters `activeSubscriptions` by expiry, so the
// lifecycle falls out of the same rule.
describe('hasPremium across the cancellation lifecycle', () => {
  const [, ANNUAL] = PREMIUM_PRODUCT_IDS;

  it('keeps access after a cancel, while the paid period is still running', () => {
    // Cancelling does not revoke: Apple runs the subscription to the end of the
    // period it was paid for, and RevenueCat reports it in BOTH lists until
    // then. Taking access away here would be taking away time already bought.
    expect(
      hasPremium({ entitlementIds: [ENTITLEMENT], subscriptions: [ANNUAL] })
    ).toBe(true);
  });

  it('drops access once the period has actually expired', () => {
    // At expiry RevenueCat clears the entitlement and the subscription
    // together, so this is the same input as "never subscribed" and the
    // paywall comes back on the next gate.
    expect(hasPremium({ entitlementIds: [], subscriptions: [] })).toBe(false);
  });

  it('still grants while only the entitlement remains, since it leads', () => {
    // The entitlement is the primary check and the product is the floor under
    // it, so either one alone is enough. Stated because the asymmetry is the
    // part people expect to be a bug.
    expect(hasPremium({ entitlementIds: [ENTITLEMENT], subscriptions: [] })).toBe(true);
  });
});

describe('the fallback reads "is paying", never "has ever paid"', () => {
  const read = (...parts: string[]) =>
    fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

  // CustomerInfo carries both of these, one word apart, on the same object:
  //   activeSubscriptions            "Set of active subscription skus"
  //   allPurchasedProductIdentifiers "Set of purchased skus, active and inactive"
  //
  // Swapping one for the other turns this fallback from "is paying" into "has
  // ever paid" and hands every churned subscriber the app free, forever. It
  // would break no test, throw nothing, and produce no symptom the owner could
  // ever see. That is why this assertion exists; do not delete it as pedantic.
  it.each([
    ['src/lib/purchases.ts', ['src', 'lib', 'purchases.ts']],
    ['src/data/entitlement.ts', ['src', 'data', 'entitlement.ts']],
  ])('%s never reaches for allPurchasedProductIdentifiers', (_name, parts) => {
    expect(read(...parts)).not.toMatch(/allPurchasedProductIdentifiers/);
  });
});
