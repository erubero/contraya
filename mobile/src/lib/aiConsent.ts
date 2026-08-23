import { supabase, isConfigured } from '@/api/supabase';

// Whether the user has agreed to have their documents sent to the AI provider.
//
// Exists because App Review rejected 1.0 (6) under guideline 5.1.2(i): the app
// transmitted every uploaded contract to a third-party AI service with no
// disclosure of who, no list of what, and no permission asked. The copy lives
// in `legal.ts`; this file is only the record of the answer.
//
// Stored in Supabase `user_metadata`, the same place and the same way
// `onboarding.ts` stores its flags: per account rather than per install, so
// consent follows the user to a second device and, more importantly, so the
// edge functions can read it off the authenticated user with no extra table
// and no migration.
//
// ONE DELIBERATE DIFFERENCE from onboarding.ts: that file swallows write
// errors, because failing to record a questionnaire answer must never block
// anybody. This one must NOT. A consent the server never received is a consent
// that does not exist, and the edge functions will 403 on it. Letting the error
// through is what keeps the client's belief and the server's record honest, so
// grant/revoke both throw and the gate treats a throw as "not consented".

// Bump when what is sent materially changes. `hasAiConsent` then reads the old
// stamp as stale and the sheet asks again, which is cheaper and more honest
// than migrating consent records. An OLDER binary reading a NEWER stamp is
// still covered, since it can only send less than what was agreed to.
export const AI_CONSENT_VERSION = 1;

export type AiConsentMeta = Record<string, unknown> | null | undefined;

/**
 * Pure, so the rule is testable without a session. True only when the stored
 * stamp is a real timestamp AND was given for this version of the disclosure.
 */
export function hasAiConsent(meta: AiConsentMeta): boolean {
  if (!meta) return false;
  const at = meta.ai_consent_at;
  if (typeof at !== 'string' || at.trim() === '') return false;
  const version = meta.ai_consent_version;
  return typeof version === 'number' && version >= AI_CONSENT_VERSION;
}

/** Records consent. Throws if the record does not land; see the note above. */
export async function grantAiConsent(): Promise<string> {
  const at = new Date().toISOString();
  // Demo builds have no backend to record anything on. The caller holds the
  // answer in memory so the reviewer's no-Supabase build never dead-ends.
  if (!isConfigured) return at;
  const { error } = await supabase.auth.updateUser({
    data: { ai_consent_version: AI_CONSENT_VERSION, ai_consent_at: at },
  });
  if (error) throw error;
  return at;
}

/** Withdraws consent. The next analysis or question asks again. */
export async function revokeAiConsent(): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.auth.updateUser({
    data: { ai_consent_version: null, ai_consent_at: null },
  });
  if (error) throw error;
}
