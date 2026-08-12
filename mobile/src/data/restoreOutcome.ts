// What a restore attempt actually meant, as copy can state it. Pure: no
// RevenueCat import, no native anything, so the mapping is testable.
//
// This exists because restore() used to collapse every path into one boolean,
// and Settings then told a user with a receipt bound to ANOTHER account that
// no subscription exists. That is false, and it sent the one person who most
// needed the real answer in circles. The SDK reports that case precisely
// (receipt-already-in-use), so the copy can too.

export type RestoreOutcome = 'restored' | 'none' | 'other-account' | 'error';

// RevenueCat error codes arrive as a string-valued enum ("7"), but the native
// bridge has been seen handing back numbers; normalize before comparing.
// 7 = RECEIPT_ALREADY_IN_USE, 13 = RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER: both
// mean the store receipt is bound to a different App User ID and the backend
// declined to move it (project Restore Behavior).
const OTHER_ACCOUNT_CODES = new Set(['7', '13']);

/** Map a restore that THREW to an outcome. */
export function restoreErrorOutcome(err: unknown): RestoreOutcome {
  const code = (err as { code?: unknown } | null)?.code;
  if (code === undefined || code === null) return 'error';
  return OTHER_ACCOUNT_CODES.has(String(code)) ? 'other-account' : 'error';
}

/** Map a restore that RETURNED to an outcome. */
export function restoreResultOutcome(entitledAfter: boolean): RestoreOutcome {
  // A clean call that ends not-entitled is a true "nothing to restore": the
  // receipt either synced and unlocks nothing, or there is no receipt. Both
  // read the same to the user; the dashboard is where they differ.
  return entitledAfter ? 'restored' : 'none';
}
