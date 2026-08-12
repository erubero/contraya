import { Platform, Linking } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import {
  RestoreOutcome, restoreErrorOutcome, restoreResultOutcome,
} from '@/data/restoreOutcome';

// Thin wrapper around RevenueCat. The public SDK keys are safe to embed (like
// the Supabase anon key). Everything no-ops when no key is set for the platform,
// so the app still runs in demo mode and never traps a user behind a paywall it
// cannot actually sell.

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const KEY = Platform.OS === 'android' ? ANDROID_KEY : IOS_KEY;
const ENTITLEMENT = 'premium';

export const purchasesConfigured = KEY.length > 0;

function entitled(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT] !== undefined;
}

let started = false;

// Every call below fails open so a store outage never traps a paying user. That
// makes failures invisible by construction, so in dev we log them: a silent
// catch here is the difference between "error 23" on screen and knowing which
// product the store refused.
function trace(where: string, err: unknown): void {
  if (__DEV__) console.warn(`[purchases] ${where}`, err);
}

// Configure once, then bind purchases to the signed-in user so they restore
// across devices and stay tied to the account.
//
// configure() carries no appUserID ON PURPOSE, and identity always goes
// through logIn(). configure with an explicit id is a hard identity switch:
// the SDK adopts it without aliasing, so a purchase made under the previous
// account's UUID simply stops existing as far as this install can see. That
// is not hypothetical: the owner bought the annual, deleted the account (the
// E2E script said to), re-signed-in as a fresh UUID, and every cold start
// after that hard-configured onto the new id while StoreKit kept insisting
// the Apple ID was subscribed. logIn() is the aliasing path; running it on
// every start costs one network call and makes cross-account cold starts
// behave like the in-session account switches that were already correct.
export async function initPurchases(appUserId: string | null): Promise<void> {
  if (!purchasesConfigured) return;
  try {
    if (!started) {
      // Must precede configure() to capture the store handshake, which is where
      // configuration errors (bad key, bundle mismatch, unfetchable products)
      // actually surface. Native logs land in the Xcode console.
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      Purchases.configure({ apiKey: KEY });
      started = true;
    }
    if (appUserId) {
      await Purchases.logIn(appUserId);
    }
  } catch (err) {
    trace('initPurchases', err);
  }
}

// Detach the SDK from the account at sign-out or deletion, so the next
// sign-in starts from a neutral identity instead of silently inheriting the
// previous user's. Fire-and-forget by design: the account handoff must never
// hang on a store call.
export function logOutPurchases(): void {
  if (!purchasesConfigured || !started) return;
  Purchases.logOut().catch((err) => trace('logOutPurchases', err));
}

// The identity every entitlement check is scoped to. Surfaced in Settings
// because this bug class (Apple says subscribed, RevenueCat says no) turns
// entirely on WHICH App User ID is live, and that was unobservable on device.
export async function getAppUserId(): Promise<string | null> {
  if (!purchasesConfigured || !started) return null;
  try {
    return await Purchases.getAppUserID();
  } catch (err) {
    trace('getAppUserId', err);
    return null;
  }
}

export async function fetchProStatus(): Promise<boolean> {
  if (!purchasesConfigured) return false;
  try {
    return entitled(await Purchases.getCustomerInfo());
  } catch (err) {
    trace('fetchProStatus', err);
    return false;
  }
}

// True only when there is a real, sellable offering. The hard gate checks this
// so it never blocks a user before the dashboard offering has been set up.
export async function hasSellableOffering(): Promise<boolean> {
  if (!purchasesConfigured) return false;
  try {
    const offerings = await Purchases.getOfferings();
    // Falling back to `default` by name covers the likeliest dashboard slip:
    // the offering exists and its products vend, but it was never marked
    // Current. Without this, `current` is null, every gate opens, and the
    // reviewer sees unlimited Ask Contry while the App Store description
    // sells it as a subscription — Warraya's 2.3.2 rejection, exactly.
    const offering = offerings.current ?? offerings.all['default'] ?? null;
    const packages = offering?.availablePackages ?? [];
    if (__DEV__ && !offerings.current && offering) {
      console.warn(
        '[purchases] no Current offering; fell back to "default". ' +
          'Set the default offering Current in RevenueCat.',
      );
    }
    // An offering that resolves but carries zero packages is the signature of
    // products the store would not vend (rejected, or agreement not active).
    // It looks identical to "no offering configured" unless we say so.
    if (__DEV__ && packages.length === 0) {
      console.warn(
        `[purchases] offering "${offering?.identifier ?? 'none'}" has no packages; ` +
          'check the products are fetchable in App Store Connect',
      );
    }
    return packages.length > 0;
  } catch (err) {
    trace('hasSellableOffering', err);
    return false;
  }
}

// Returns whether the user has access, not whether a sheet was shown.
//
// Runs its own entitlement read BEFORE the sheet, for two reasons. First, the
// native bridge's internal pre-check is a hang: if its CustomerInfo fetch
// throws (offline), it logs and never calls the result handler, and the JS
// promise never settles — a gate that awaits it wedges forever. Doing the
// same read here first means the bridge's identical re-read runs against a
// warm cache and cannot realistically be the first failure. Second, a dead
// store FAILS OPEN, per this file's contract: a network blip must never
// sheet, trap, or eject a paying user. The server ceilings are what guard
// spend; this gate only ever guards the doorway.
//
// After the sheet, the result enum alone is NOT trusted for failure. The
// bridge seeds its result to CANCELLED at presentation and the purchase-
// failure delegate never updates it (the native enum has no error case), so
// "tapped buy, Apple said 'you're currently subscribed', dismissed the
// alert" comes back indistinguishable from "changed my mind". CustomerInfo
// is the truth, so on any non-success result the entitlement is re-read
// before this reports no-access — otherwise chat backs a subscribed user
// out of the screen, which is exactly the bug report this rewrite came from.
export async function presentPaywall(): Promise<boolean> {
  if (!purchasesConfigured) return false;
  try {
    if (entitled(await Purchases.getCustomerInfo())) return true;
  } catch (err) {
    trace('presentPaywall preflight', err);
    return true;
  }
  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT,
    });
    if (
      result === PAYWALL_RESULT.NOT_PRESENTED ||
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      return true;
    }
    return entitled(await Purchases.getCustomerInfo());
  } catch (err) {
    trace('presentPaywall', err);
    return false;
  }
}

// In-app Customer Center: manage or cancel, restore, request a refund, change
// plans, and see win-back offers without leaving the app. Falls back to the
// native App Store subscriptions page if the SDK isn't configured or it fails.
export async function presentCustomerCenter(): Promise<void> {
  if (!purchasesConfigured) {
    openManageSubscriptions();
    return;
  }
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    trace('presentCustomerCenter', err);
    openManageSubscriptions();
  }
}

// An outcome, not a boolean. "The receipt belongs to another account", "the
// store was unreachable" and "there is genuinely nothing" demand different
// copy, and collapsing them told the owner "no subscription exists" while
// Apple was simultaneously showing their active one. See data/restoreOutcome.
export async function restore(): Promise<RestoreOutcome> {
  if (!purchasesConfigured) return 'none';
  try {
    return restoreResultOutcome(entitled(await Purchases.restorePurchases()));
  } catch (err) {
    trace('restore', err);
    return restoreErrorOutcome(err);
  }
}

export function openManageSubscriptions(): void {
  const url =
    Platform.OS === 'android'
      ? 'https://play.google.com/store/account/subscriptions'
      : 'https://apps.apple.com/account/subscriptions';
  Linking.openURL(url).catch(() => {});
}

// Live updates (e.g. a purchase completing on the paywall) push a fresh status.
export function addProListener(cb: (pro: boolean) => void): () => void {
  if (!purchasesConfigured) return () => {};
  const listener = (info: CustomerInfo) => cb(entitled(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
