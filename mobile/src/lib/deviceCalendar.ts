import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { PlannableDate } from './reminderPlanner';
import {
  PlannedCalendarEvent,
  calendarWindow,
  dayEnd,
  dayStart,
  eventMatchKey,
  fingerprint,
  localDay,
  planAllCalendarEvents,
} from './calendarPlanner';
import {
  allSyncedCalendarIds,
  clearAllCalendarSync,
  readCalendarSync,
  writeCalendarSync,
} from './calendarSyncStore';
import { calendarSyncGate } from './quotaGate';

// The only file in the app that touches EventKit. Shaped to mirror
// notifications.ts so the two read as siblings: a stored flag, a permission
// check that never prompts, a reconcile that only ever touches what we own,
// and a clear-everything for sign-out.
//
// The one thing it does NOT share with notifications.ts is the blast radius
// rule. clearAll() there is safe because it cancels only identifiers in the
// `contract.` namespace. Here the namespace is the CALENDAR: Contraya creates
// its own and never reads, writes or deletes outside it. Do not relax that.

export const CALENDAR_TITLE = 'Contraya';
// theme.brand, and identical in light and dark, which matters for a value the
// OS bakes in once at creation time and the user may then recolor themselves.
export const CALENDAR_COLOR = '#a3e635';

export type SyncResult =
  | 'skipped' // disabled, not premium, no permission, wrong platform
  | 'clean' // nothing changed since last time, zero EventKit calls
  | 'synced'
  | 'calendar-gone' // the user deleted our calendar; sync turned itself off
  | 'no-source' // no writable calendar account on the device
  | 'write-only' // iOS 17 partial access, which cannot work (see below)
  | 'failed';

export type SyncOptions = {
  /** Bypass the fingerprint short circuit. The settings toggle passes this. */
  force?: boolean;
  isPro: boolean;
  offeringReady: boolean;
  ready: boolean;
};

const WRITABLE_SOURCES: string[] = [
  Calendar.SourceType.LOCAL,
  Calendar.SourceType.CALDAV,
  Calendar.SourceType.EXCHANGE,
  Calendar.SourceType.MOBILEME,
];

const isWritableSource = (source?: Calendar.Source | null): boolean =>
  !!source && WRITABLE_SOURCES.includes(source.type as string);

export function calendarSyncSupported(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Asked ONLY from the calendar settings toggle, never from a save or a sweep.
 * That is the whole "never automatic" rule in one line: a user who has not
 * opened this screen is never asked for calendar access and never has anything
 * written to their calendar.
 */
export async function requestCalendarPermission(): Promise<boolean> {
  if (!calendarSyncSupported()) return false;
  try {
    const current = await Calendar.getCalendarPermissions();
    if (current.granted) return true;
    const req = await Calendar.requestCalendarPermissions();
    return req.granted;
  } catch {
    return false;
  }
}

/** Never prompts. Exported so the screen can render an honest denied state. */
export async function calendarPermissionGranted(): Promise<boolean> {
  if (!calendarSyncSupported()) return false;
  try {
    const { granted } = await Calendar.getCalendarPermissions();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Whether we have FULL access, not iOS 17's "Add Events Only".
 *
 * This matters more than it looks. Write-only access does not permit creating,
 * updating or deleting calendars, and reads come back empty. A reconcile that
 * cannot see what is already there degrades to append-only, so every single
 * foreground would add another copy of every event and the user's calendar
 * would be unusable within a day.
 *
 * PermissionResponse carries no full-versus-write-only field, so the only way
 * to tell is to try reading. An empty list or a throw both mean we cannot
 * reconcile. A real iPhone always has at least one event calendar; a simulator
 * that has never opened Calendar.app may not, and refusing there is also
 * correct, since there would be no source to create a calendar on either.
 */
export async function fullAccessGranted(): Promise<boolean> {
  if (!(await calendarPermissionGranted())) return false;
  try {
    const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    return cals.length > 0;
  } catch {
    return false;
  }
}

export async function calendarSyncEnabled(userId: string | null): Promise<boolean> {
  return (await readCalendarSync(userId)).enabled;
}

export async function setCalendarSyncEnabled(
  userId: string | null,
  enabled: boolean
): Promise<void> {
  await writeCalendarSync(userId, { enabled });
}

export async function setDiscreetTitles(userId: string | null, on: boolean): Promise<void> {
  await writeCalendarSync(userId, { discreetTitles: on });
}

/**
 * The account to create the Contraya calendar on.
 *
 * First choice is whatever account the user's default calendar lives on, which
 * for most people is iCloud. That is deliberate: the calendar then rides iCloud
 * to their Mac and iPad, and Contraya itself is iPhone only, so that is the
 * only way their contract dates reach a desktop.
 *
 * The writable filter is what makes the fallbacks reachable. A default calendar
 * sitting on a subscribed or birthdays source is read-only and createCalendar
 * throws against it.
 */
function pickSource(): Calendar.Source | null {
  try {
    const source = Calendar.getDefaultCalendarSync()?.source;
    if (isWritableSource(source)) return source;
  } catch {
    // No default calendar configured on this device.
  }
  let sources: Calendar.Source[] = [];
  try {
    sources = Calendar.getSourcesSync();
  } catch {
    return null;
  }
  return (
    sources.find((s) => s.type === Calendar.SourceType.LOCAL) ??
    sources.find((s) => s.type === Calendar.SourceType.CALDAV) ??
    sources.find((s) => isWritableSource(s)) ??
    null
  );
}

// getCalendars().find() rather than ExpoCalendar.get(id), which is documented
// to resolve a calendar but not what it does with an id that no longer exists.
// This has one unambiguous failure mode: not in the list, so it is gone.
// allowsModifications is part of "gone" for our purposes: an account that has
// turned read-only is a calendar we can no longer reconcile.
async function resolveCalendar(id: string | null): Promise<Calendar.ExpoCalendar | null> {
  if (!id) return null;
  try {
    const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    const found = cals.find((c) => c.id === id);
    return found && found.allowsModifications ? found : null;
  } catch {
    return null;
  }
}

/**
 * Adopt an existing Contraya calendar before creating another one.
 *
 * Without this step, anything that clears local storage while leaving the
 * calendar behind produces a duplicate: a reinstall (AsyncStorage is wiped, an
 * iCloud calendar is not), or a second iPhone on the same Apple Account. The
 * user ends up with two or three calendars all called Contraya and every date
 * showing two or three times.
 *
 * Matching by title is only used HERE, for adoption. Everything afterwards
 * keys off the stored id, which is what makes a user renaming the calendar
 * harmless, and it is why nothing in this file can ever delete a calendar
 * Contraya did not create.
 */
async function adoptOrCreateCalendar(): Promise<Calendar.ExpoCalendar | null> {
  try {
    const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    const mine = cals.find(
      (c) => c.title === CALENDAR_TITLE && c.allowsModifications && isWritableSource(c.source)
    );
    if (mine) return mine;
  } catch {
    return null;
  }

  const source = pickSource();
  if (!source) return null;
  try {
    return await Calendar.createCalendar({
      title: CALENDAR_TITLE,
      color: CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
      source,
    });
  } catch {
    // The chosen account refused. Fall back to the device itself once rather
    // than giving up, so an unusual calendar setup still gets the feature.
    let local: Calendar.Source | undefined;
    try {
      local = Calendar.getSourcesSync().find((s) => s.type === Calendar.SourceType.LOCAL);
    } catch {
      return null;
    }
    if (!local || local.id === source.id) return null;
    try {
      return await Calendar.createCalendar({
        title: CALENDAR_TITLE,
        color: CALENDAR_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: local.id,
        source: local,
      });
    } catch {
      return null;
    }
  }
}

async function writeEvent(
  cal: Calendar.ExpoCalendar,
  event: PlannedCalendarEvent,
  allowsFree: boolean
): Promise<void> {
  await cal.createEvent({
    title: event.title,
    allDay: true,
    startDate: dayStart(event.day),
    // Half open: local midnight of the NEXT day is a one day banner.
    endDate: dayEnd(event.day),
    notes: event.notes,
    url: event.url,
    // Explicitly empty, not omitted. Contraya already fires a local
    // notification at 09:00 and the server cron sends a push, so an alert here
    // would be a third copy of the same sentence.
    alarms: [],
    // An all-day busy event makes the user look unavailable all day to anyone
    // reading their free/busy. Only set it when the account supports it.
    ...(allowsFree ? { availability: Calendar.Availability.FREE } : {}),
    // timeZone is deliberately left unset. All-day events float, and pinning a
    // zone is the standard way to make one slide a day when the user travels.
  });
}

// One sync at a time. The foreground sweep fires on every `active` transition,
// including the trip back from iOS Settings and the share sheet, and two
// overlapping reconciles against the same calendar would fight.
let inFlight: Promise<SyncResult> | null = null;

/**
 * Bring the Contraya calendar in line with the user's contract dates.
 *
 * Reconciles by diff rather than wiping and rewriting. Wipe and rewrite is
 * simpler, but on an iCloud calendar it means deleting and recreating every
 * event on every change: hundreds of sync operations, visible churn on every
 * device the calendar reaches. The diff touches only what actually moved, and
 * it self-heals the same way, because an event the user deleted by hand has no
 * match and gets recreated.
 */
export async function syncAll(
  userId: string | null,
  items: PlannableDate[],
  opts: SyncOptions
): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = runSync(userId, items, opts).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(
  userId: string | null,
  items: PlannableDate[],
  opts: SyncOptions
): Promise<SyncResult> {
  if (!calendarSyncSupported()) return 'skipped';
  // Pro status has not resolved yet (the sweep runs on sign-in, before
  // PurchasesContext answers). Never act on a guess.
  if (!opts.ready) return 'skipped';

  const state = await readCalendarSync(userId);
  if (!state.enabled) return 'skipped';
  // Lapsed or unresolvable subscription: stop writing, delete nothing. See the
  // comment on calendarSyncGate for why this can never be a delete.
  if (calendarSyncGate(opts) !== 'allow') return 'skipped';
  if (!(await calendarPermissionGranted())) return 'skipped';

  const now = new Date();
  const events = planAllCalendarEvents(items, { discreetTitles: state.discreetTitles }, now);
  const fp = fingerprint(events);
  // The fast path, and the reason the sweep is free: when nothing has changed
  // this returns before a single EventKit call.
  if (!opts.force && fp === state.fingerprint) return 'clean';

  if (!(await fullAccessGranted())) return 'write-only';

  let cal = await resolveCalendar(state.calendarId);
  if (!cal && state.calendarId) {
    // We had a calendar and it is no longer there, so the user deleted it in
    // the Calendar app. Silently recreating something someone deliberately
    // threw away is the hostile read of that; take it as the answer it is.
    await setCalendarSyncEnabled(userId, false);
    return 'calendar-gone';
  }
  if (!cal) {
    cal = await adoptOrCreateCalendar();
    if (!cal) return 'no-source';
    await writeCalendarSync(userId, { calendarId: cal.id });
  }

  try {
    const { start, deleteEnd } = calendarWindow(now);
    const observed = await cal.listEvents(start, deleteEnd);

    const desired = new Map(events.map((e) => [eventMatchKey(e.day, e.title), e]));
    const matched = new Set<string>();

    // Sequential, not Promise.all: hundreds of concurrent EventKit round trips
    // jank the JS thread, and rebuildAll loops serially for the same reason.
    for (const ev of observed) {
      const key = eventMatchKey(localDay(ev.startDate), ev.title);
      // Keep the first match and drop the rest, which also cleans up any
      // duplicates an interrupted earlier run left behind.
      if (desired.has(key) && !matched.has(key)) {
        matched.add(key);
        continue;
      }
      await ev.delete();
    }

    const allowsFree = (cal.allowedAvailabilities ?? []).includes(Calendar.Availability.FREE);
    for (const [key, event] of desired) {
      if (matched.has(key)) continue;
      await writeEvent(cal, event, allowsFree);
    }

    // LAST, and only on a complete pass. A throw anywhere above leaves the old
    // fingerprint in place, so the next sweep reconciles again. Repeating a
    // diff is harmless; skipping one leaves the calendar quietly wrong.
    await writeCalendarSync(userId, { fingerprint: fp });
    return 'synced';
  } catch {
    return 'failed';
  }
}

/**
 * Delete this account's Contraya calendar and forget it. Returns false when
 * the calendar is still on the device, which happens if calendar permission
 * was revoked before the user turned sync off, so the screen can say so
 * instead of claiming a cleanup that did not happen.
 */
export async function deleteCalendarFor(userId: string | null): Promise<boolean> {
  const { calendarId } = await readCalendarSync(userId);
  if (!calendarSyncSupported() || !calendarId) {
    await writeCalendarSync(userId, { calendarId: null });
    return true;
  }
  const cal = await resolveCalendar(calendarId);
  let removed = true;
  if (cal) {
    try {
      await cal.delete();
    } catch {
      removed = false;
    }
  }
  if (removed) await writeCalendarSync(userId, { calendarId: null });
  return removed;
}

/**
 * Every account's Contraya calendar on this device, for sign-out and account
 * deletion. Takes no userId for the reason clearAllDrafts does not: signOut()
 * nulls it, so a per-account call placed there is a silent no-op depending on
 * ordering. A device must not keep showing a departed account's contract
 * titles, and on an iCloud calendar those are also on the user's Mac.
 */
export async function removeAllCalendars(): Promise<void> {
  if (calendarSyncSupported()) {
    const ids = await allSyncedCalendarIds();
    if (ids.length > 0) {
      try {
        const cals = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
        for (const id of ids) {
          const cal = cals.find((c) => c.id === id);
          if (cal) await cal.delete().catch(() => {});
        }
      } catch {
        // Permission is gone, so the calendars are beyond our reach. The local
        // state is still cleared below so nothing claims they are synced.
      }
    }
  }
  await clearAllCalendarSync();
}
