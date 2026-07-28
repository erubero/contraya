import { Platform, Linking } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

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
export async function initPurchases(appUserId: string | null): Promise<void> {
  if (!purchasesConfigured) return;
  try {
    if (!started) {
      // Must precede configure() to capture the store handshake, which is where
      // configuration errors (bad key, bundle mismatch, unfetchable products)
      // actually surface. Native logs land in the Xcode console.
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      Purchases.configure({ apiKey: KEY, appUserID: appUserId ?? null });
      started = true;
    } else if (appUserId) {
      await Purchases.logIn(appUserId);
    }
  } catch (err) {
    trace('initPurchases', err);
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
    const packages = offerings.current?.availablePackages ?? [];
    // An offering that resolves but carries zero packages is the signature of
    // products the store would not vend (rejected, or agreement not active).
    // It looks identical to "no offering configured" unless we say so.
    if (__DEV__ && packages.length === 0) {
      console.warn(
        `[purchases] current offering "${offerings.current?.identifier ?? 'none'}" has no packages; ` +
          'check the products are fetchable in App Store Connect',
      );
    }
    return packages.length > 0;
  } catch (err) {
    trace('hasSellableOffering', err);
    return false;
  }
}

export async function presentPaywall(): Promise<boolean> {
  if (!purchasesConfigured) return false;
  try {
    const result = await RevenueCatUI.presentPaywall();
    return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
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

export async function restore(): Promise<boolean> {
  if (!purchasesConfigured) return false;
  try {
    return entitled(await Purchases.restorePurchases());
  } catch (err) {
    trace('restore', err);
    return false;
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
