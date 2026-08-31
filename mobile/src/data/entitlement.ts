// Whether a customer has paid for premium, decided from what RevenueCat
// reports. Pure: no RevenueCat import, no native anything, in the idiom of
// restoreOutcome.ts and for the same reason. `purchases.ts` cannot be imported
// in jest (native module), so a rule that lives there can only be tested by
// grepping its source, which does not test the rule at all.
//
// WHY THERE ARE TWO SOURCES OF TRUTH HERE, and why the second one is not a
// loosening of the first:
//
// On 2026-08-30 the owner's phone showed RevenueCat's own Customer Center
// saying "Contraya Premium, Active, renews Aug 31 2026" while the app showed
// "Upgrade to Premium", in the same session, on the same App User ID. Both were
// honest. RevenueCat held the SUBSCRIPTION at the product level and was not
// surfacing the `premium` ENTITLEMENT, because an entitlement is a mapping
// configured in a dashboard and the mapping was absent. The app read only the
// entitlement, so a paying customer was walled on every single Add, by a
// paywall that then told him "You're currently subscribed to this."
//
// An entitlement is a convenience layer over a receipt. When the two disagree,
// the receipt is the fact: somebody holding an active contraya_premium_annual
// is a paying customer whatever a dashboard mapping says. So the entitlement
// stays the primary check, and the product is the floor beneath it.
//
// Only OUR product ids count. An unrelated subscription grants nothing.
//
// This does NOT excuse a broken dashboard. `presentPaywallIfNeeded` re-checks
// the entitlement server-side, and any future surface that trusts it breaks the
// same way. The diagnostics footer prints both halves so the mismatch is read
// rather than inferred.

/** The entitlement configured in the RevenueCat dashboard. */
export const ENTITLEMENT = 'premium';

/**
 * The products that entitlement is meant to map to. Pinned because a typo here
 * silently disables the fallback, which would restore the exact bug this file
 * exists to prevent.
 */
export const PREMIUM_PRODUCT_IDS = [
  'contraya_premium_monthly',
  'contraya_premium_annual',
] as const;

/**
 * @param entitlementIds  keys of `CustomerInfo.entitlements.active`
 * @param subscriptions   `CustomerInfo.activeSubscriptions` (product ids)
 */
export function hasPremium(input: {
  entitlementIds: readonly string[];
  subscriptions: readonly string[];
}): boolean {
  if (input.entitlementIds.includes(ENTITLEMENT)) return true;
  return input.subscriptions.some((id) =>
    (PREMIUM_PRODUCT_IDS as readonly string[]).includes(id)
  );
}
