import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isConfigured } from '@/api/supabase';

// First-open welcome + post-signup onboarding gating.
//
// The welcome screen is per-install (AsyncStorage). Onboarding completion is
// per-account (user_metadata, so it syncs across devices with zero migration).
// Apple sign-in cannot tell us "this was a signup", so the gate uses account
// age: a brand-new account (however it was created) onboards; an old account
// skips and gets onboarding_complete backfilled silently.

export const WELCOME_SEEN_KEY = 'contraya.welcomeSeen';
export const ONBOARDING_PENDING_KEY = 'contraya.onboardingPending';
export const FRESH_ACCOUNT_WINDOW_MS = 10 * 60_000;

export type OnboardingAnswers = {
  forgets?: 'always' | 'sometimes' | 'rarely';
  missed_claim?: 'yes' | 'unsure' | 'no';
  reminders?: 'yes' | 'later';
  push_granted?: boolean;
  skipped?: true;
};

export function needsOnboarding(input: {
  onboardingComplete: boolean;
  accountCreatedAt: string | null;
  localPending: boolean;
  now?: Date;
}): boolean {
  if (input.onboardingComplete) return false;
  if (input.localPending) return true;
  if (!input.accountCreatedAt) return false;
  const created = Date.parse(input.accountCreatedAt);
  if (Number.isNaN(created)) return false;
  const now = (input.now ?? new Date()).getTime();
  return now - created < FRESH_ACCOUNT_WINDOW_MS;
}

export async function getWelcomeSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) === 'true';
  } catch {
    return true; // fail toward the normal flow, never trap users on welcome
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true');
  } catch {}
}

export async function getOnboardingPending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_PENDING_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingPending(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_PENDING_KEY, 'true');
  } catch {}
}

export async function clearOnboardingPending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_PENDING_KEY);
  } catch {}
}

// Both writers swallow network errors: the age rule self-heals on the next
// launch, and blocking the user over analytics metadata would be absurd.
export async function completeOnboarding(answers: OnboardingAnswers): Promise<void> {
  await clearOnboardingPending();
  if (!isConfigured) return;
  try {
    await supabase.auth.updateUser({
      data: {
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_answers: answers,
      },
    });
  } catch {}
}

export async function backfillOnboardingComplete(): Promise<void> {
  await clearOnboardingPending();
  if (!isConfigured) return;
  try {
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
  } catch {}
}
