import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isConfigured } from '@/api/supabase';
import { TERMS_VERSION } from '@/lib/legal';

// Whether the user has affirmatively accepted the Terms and Privacy Policy.
//
// Shaped to read like `lib/aiConsent.ts`, with one structural difference that
// drives everything here: the acceptance happens BEFORE an account exists. The
// user ticks the box on the welcome screen, and only afterwards creates the
// account it should be recorded against. So the tick is written to AsyncStorage
// first, and `AuthContext` stamps it onto the account on the next signed-in
// render.
//
// The other difference from aiConsent: this one SWALLOWS write errors, like
// `onboarding.ts` does. Nothing server-side gates on it, the tick plus the
// local record is the evidence, and refusing somebody entry to their own
// account over a metadata write would be a worse failure than a missing stamp
// that the next launch will retry anyway.

export const TERMS_ACCEPTED_KEY = 'contraya.termsAcceptedVersion';

export type TermsMeta = Record<string, unknown> | null | undefined;

/**
 * Pure, so the rule is testable without a session or a device. True only when
 * the account carries a real timestamp AND accepted at least this version.
 */
export function hasAcceptedTerms(meta: TermsMeta): boolean {
  if (!meta) return false;
  const at = meta.terms_accepted_at;
  if (typeof at !== 'string' || at.trim() === '') return false;
  const version = meta.terms_version;
  return typeof version === 'number' && version >= TERMS_VERSION;
}

/** The version accepted on THIS device, or null. Signed-out screens read this. */
export async function getLocalTermsAcceptance(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    if (raw === null) return null;
    const version = Number.parseInt(raw, 10);
    return Number.isNaN(version) ? null : version;
  } catch {
    // Fail toward asking again. A second tick costs one tap; a missed
    // acceptance costs the record that the tick ever happened.
    return null;
  }
}

/** Records the tick locally. Called the moment the user proceeds past the box. */
export async function recordTermsAcceptance(): Promise<void> {
  try {
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, String(TERMS_VERSION));
  } catch {}
}

/** Stamps the acceptance onto the account. Best effort; see the note above. */
export async function stampTermsAcceptance(): Promise<void> {
  if (!isConfigured) return;
  try {
    await supabase.auth.updateUser({
      data: { terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
    });
  } catch {}
}
