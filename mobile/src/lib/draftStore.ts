// AsyncStorage IO for the unfinished-contract draft. Thin on purpose: every
// decision lives in data/draft.ts, which is pure and tested.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ContractDraft, decodeDraft, encodeDraft } from '@/data/draft';

// Namespaced PER ACCOUNT. `contraya.personalizedInsightDismissed` is not, and
// that is already logged as a cross-account bleed bug (STATUS.md item 8). A
// half-finished contract leaking between accounts would be considerably worse
// than a dismissed tip.
export const DRAFT_PREFIX = 'contraya.contractDraft.';

export function draftKey(userId: string): string {
  return `${DRAFT_PREFIX}${userId}`;
}

/** Returns null and deletes the key when the stored draft is invalid or expired. */
export async function readDraft(userId: string | null): Promise<ContractDraft | null> {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId));
    if (raw === null) return null;
    const draft = decodeDraft(raw, userId);
    if (!draft) {
      await AsyncStorage.removeItem(draftKey(userId)).catch(() => {});
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export async function writeDraft(userId: string | null, draft: ContractDraft): Promise<void> {
  if (!userId) return;
  const json = encodeDraft(draft);
  if (!json) return;
  try {
    await AsyncStorage.setItem(draftKey(userId), json);
  } catch {
    // Storage full or unavailable. Losing the draft is bad but not worth
    // crashing the review screen over.
  }
}

export async function clearDraft(userId: string | null): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(draftKey(userId));
  } catch {
    // ignored
  }
}

/**
 * Every account's draft. Used on sign-out and account deletion.
 *
 * Takes no userId deliberately: `signOut()` nulls the id, so a
 * `clearDraft(userId)` placed after it would be a silent no-op depending on call
 * order. This cannot be defeated that way, and it also mops up keys left behind
 * by an interrupted sign-out.
 */
export async function clearAllDrafts(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const drafts = keys.filter((k) => k.startsWith(DRAFT_PREFIX));
    if (drafts.length > 0) await AsyncStorage.multiRemove(drafts);
  } catch {
    // ignored
  }
}
