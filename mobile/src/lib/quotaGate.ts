// Pure decision layer for the freemium gates. The screens keep the side
// effects (paywall sheet, alert, navigation); this file owns only the verdict.
//
// It exists to be testable. StoreKit will not vend products until Apple
// approves the app — not to a device, not to sandbox, not to TestFlight — so
// before launch day `offeringReady` is always false and the closed-gate paths
// never execute. These functions are the only pre-launch verification that
// the gates close at the right numbers.
import {
  FREE_ANALYSIS_LIFETIME_LIMIT,
  PRO_MONTHLY_ANALYSES,
  PRO_MONTHLY_CHATS,
} from './limits';

export type GateDecision =
  | 'allow' // proceed
  | 'paywall' // free user at the wall: offer the upgrade
  | 'quota'; // paying user out of credits: say so, never upsell someone who already pays

/**
 * The analysis wall. Free tier gets FREE_ANALYSIS_LIFETIME_LIMIT ever (not per
 * month); premium gets PRO_MONTHLY_ANALYSES per calendar month.
 *
 * Fails OPEN when there is no sellable offering: a store outage or an
 * unconfigured dashboard must never trap a user behind a paywall they cannot
 * buy. That is deliberate, and `analysisGate.test.ts` pins it so it is never
 * "fixed" by accident.
 */
export function analysisGate(input: {
  isPro: boolean;
  offeringReady: boolean;
  lifetime: number;
  month: number;
}): GateDecision {
  const { isPro, offeringReady, lifetime, month } = input;
  if (!isPro && offeringReady && lifetime >= FREE_ANALYSIS_LIFETIME_LIMIT) return 'paywall';
  if (isPro && month >= PRO_MONTHLY_ANALYSES) return 'quota';
  return 'allow';
}

/** Ask Contry is premium-only, so the gate is on opening the screen at all. */
export function chatOpenGate(input: { isPro: boolean; offeringReady: boolean }): GateDecision {
  const { isPro, offeringReady } = input;
  if (!isPro && offeringReady) return 'paywall';
  return 'allow';
}

/**
 * Device calendar sync is premium-only, so the gate is on syncing at all.
 *
 * Fails OPEN for the same reason analysisGate does, and the stakes are higher
 * here: fetchProStatus() returns false on ANY throw, and PurchasesContext
 * re-runs it on every foreground, so an offline launch reads as "not premium".
 * A gate that deleted events on that verdict would wipe a user's calendar off
 * every device they own because a plane had no signal. So this gate only ever
 * PAUSES the sync. Entitlement state must never delete events; only the
 * toggle, sign-out and account deletion may.
 */
export function calendarSyncGate(input: { isPro: boolean; offeringReady: boolean }): GateDecision {
  const { isPro, offeringReady } = input;
  if (!isPro && offeringReady) return 'paywall';
  return 'allow';
}

/** Per-question check once inside. `used` is the month's count plus this session's. */
export function chatSendGate(input: { isPro: boolean; used: number }): GateDecision {
  const { isPro, used } = input;
  if (isPro && used >= PRO_MONTHLY_CHATS) return 'quota';
  return 'allow';
}
