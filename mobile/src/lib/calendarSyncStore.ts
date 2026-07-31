// AsyncStorage IO for device calendar sync. Thin on purpose: every decision
// lives in calendarPlanner.ts, which is pure and tested.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Namespaced PER ACCOUNT, like contraya.contractDraft. and unlike
// contraya.remindersEnabled. It matters more here than anywhere else: an
// unnamespaced flag means account B's first sweep on a shared phone deletes
// account A's events and writes B's contract titles in their place, and the
// user watches one account's leases turn into another's.
export const CALENDAR_SYNC_PREFIX = 'contraya.calendarSync.';

export type CalendarSyncState = {
  enabled: boolean;
  discreetTitles: boolean;
  /** The calendar Contraya created for this account, once it exists. */
  calendarId: string | null;
  /** Fingerprint of the plan last written INTO that calendar. */
  fingerprint: string | null;
};

export const DISABLED: CalendarSyncState = {
  enabled: false,
  discreetTitles: false,
  calendarId: null,
  fingerprint: null,
};

export function calendarSyncKey(userId: string): string {
  return `${CALENDAR_SYNC_PREFIX}${userId}`;
}

function decode(raw: string): CalendarSyncState | null {
  try {
    const v = JSON.parse(raw) as Partial<CalendarSyncState>;
    if (!v || typeof v !== 'object') return null;
    return {
      enabled: v.enabled === true,
      discreetTitles: v.discreetTitles === true,
      calendarId: typeof v.calendarId === 'string' ? v.calendarId : null,
      fingerprint: typeof v.fingerprint === 'string' ? v.fingerprint : null,
    };
  } catch {
    return null;
  }
}

/**
 * This account's sync state, or DISABLED.
 *
 * Every failure path returns DISABLED: no user, no key, unreadable storage,
 * corrupt blob. That is the "never automatic" rule made structural rather than
 * remembered. Note this is the deliberate INVERSE of remindersEnabled() in
 * notifications.ts, which reads `v !== 'false'` and so defaults ON. That file
 * is otherwise the template for this feature, and copying its default here
 * would silently write contract titles into the calendar of every user who
 * merely installed an update.
 */
export async function readCalendarSync(userId: string | null): Promise<CalendarSyncState> {
  if (!userId) return DISABLED;
  try {
    const raw = await AsyncStorage.getItem(calendarSyncKey(userId));
    if (raw === null) return DISABLED;
    const state = decode(raw);
    if (!state) {
      await AsyncStorage.removeItem(calendarSyncKey(userId)).catch(() => {});
      return DISABLED;
    }
    return state;
  } catch {
    return DISABLED;
  }
}

/**
 * Read, merge, write. One blob rather than four keys so a crash can never
 * leave `enabled: true` sitting beside a calendarId that was never stored.
 *
 * Any patch touching enabled, discreetTitles or calendarId also clears the
 * fingerprint. That is what makes a fingerprint match mean "this exact plan is
 * in this exact calendar" rather than merely "the plan has not changed", so
 * the sync's fast path can never skip work that genuinely needs doing.
 */
export async function writeCalendarSync(
  userId: string | null,
  patch: Partial<CalendarSyncState>
): Promise<void> {
  if (!userId) return;
  const invalidates =
    patch.enabled !== undefined ||
    patch.discreetTitles !== undefined ||
    patch.calendarId !== undefined;
  try {
    const current = await readCalendarSync(userId);
    const next: CalendarSyncState = {
      ...current,
      ...patch,
      ...(invalidates && patch.fingerprint === undefined ? { fingerprint: null } : {}),
    };
    await AsyncStorage.setItem(calendarSyncKey(userId), JSON.stringify(next));
  } catch {
    // Storage full or unavailable. The worst case is one redundant sync.
  }
}

/**
 * Every account's calendar id on this device.
 *
 * Takes no userId deliberately, the same reason clearAllDrafts does not:
 * signOut() nulls the id, so a per-account lookup placed alongside it would be
 * a silent no-op depending on call order. It also mops up an account whose
 * sign-out was interrupted.
 */
export async function allSyncedCalendarIds(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(CALENDAR_SYNC_PREFIX));
    if (mine.length === 0) return [];
    const rows = await AsyncStorage.multiGet(mine);
    return rows
      .map(([, raw]) => (raw ? decode(raw)?.calendarId : null))
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export async function clearAllCalendarSync(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(CALENDAR_SYNC_PREFIX));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  } catch {
    // ignored
  }
}
