import { addDays, addMonths, startOfDay } from 'date-fns';
import { DATE_TYPE_LABELS, Recurrence } from '@/data/types';
import { describeWindows } from './textFormat';
import { HORIZON_MONTHS, PlannableDate, isoDay, nextOccurrences } from './reminderPlanner';

// What Contraya writes into the user's Apple Calendar, decided entirely here.
//
// This module is pure on purpose. deviceCalendar.ts is the only file that
// touches EventKit and it is untestable in this repo (there are no native
// mocks anywhere), so every decision that can be WRONG lives here instead:
// which days get an event, what the event says, whether anything changed since
// last time, and which slice of the calendar we are allowed to delete from.
//
// It expands recurrence through nextOccurrences rather than reimplementing it.
// That is the load-bearing choice: the Calendar tab, the reminder scheduler and
// the device calendar all read from that one function, so they cannot tell the
// user three different things about the same lease.

/**
 * Bump when the shape of an event changes (title, notes, url). Every device
 * then rebuilds exactly once, because the version is hashed into the
 * fingerprint. Events already in the past keep their old shape, which is
 * correct: they are a record of what happened, not live data.
 */
export const PLAN_VERSION = 1;

/**
 * Ceiling on events written in one sync. Not a platform limit (EventKit has
 * none, unlike the 64 pending notifications iOS allows). It bounds sync time
 * and keeps the calendar readable for someone with dozens of monthly rows.
 */
export const MAX_EVENTS = 400;

/**
 * How far past the write horizon the delete window reaches. Lowering
 * HORIZON_MONTHS later would otherwise strand events beyond the new edge with
 * nothing left to clean them up.
 */
export const DELETE_SLACK_MONTHS = 2;

export type PlanOptions = {
  /** Titles carry the date type only, with no contract name anywhere. */
  discreetTitles: boolean;
};

export type PlannedCalendarEvent = {
  /** Stable identity for hashing and debugging. Not stored on the event. */
  key: string;
  /** 'yyyy-MM-dd', LOCAL. A string, never a Date: see localDay below. */
  day: string;
  title: string;
  notes: string;
  url: string;
  contractId: string;
};

const RECURRENCE_LINE: Record<Recurrence, string> = {
  none: '',
  monthly: 'Repeats monthly.',
  yearly: 'Repeats every year.',
};

// Local midnight of a 'yyyy-MM-dd' day. The T00:00:00 suffix is what keeps
// `new Date` in local time; without it the string parses as UTC and lands on
// the previous day everywhere west of Greenwich (data/status.ts:6-7 documents
// the same trap for the in-app views).
export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

// Local midnight of the NEXT day. EventKit all-day events are half open, so
// this is the end instant of a single-day event. addDays rather than +86400000
// so a day containing a DST change is still one day.
export function dayEnd(day: string): Date {
  return addDays(dayStart(day), 1);
}

/**
 * The local calendar day of an event we read back from EventKit, which hands
 * dates over as either a Date or a string depending on the platform. A bare
 * 'yyyy-MM-dd' is taken literally instead of parsed, for the reason above.
 */
export function localDay(value: string | Date): string {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : isoDay(parsed);
  }
  return Number.isNaN(value.getTime()) ? '' : isoDay(value);
}

/**
 * How an event on the device is matched to an event we planned.
 *
 * Day plus title is enough ONLY because Contraya owns the whole calendar it
 * writes to and never writes anywhere else, so there is no foreign event to
 * collide with. Do not reuse this scheme against a calendar we did not create.
 */
export function eventMatchKey(day: string, title: string): string {
  return `${day}|${title}`;
}

function titleFor(item: PlannableDate, opts: PlanOptions): string {
  const typeLabel = DATE_TYPE_LABELS[item.date.date_type];
  if (opts.discreetTitles) return typeLabel;
  const label = item.date.label.trim() || typeLabel;
  const contract = item.contractTitle.trim();
  // Middle dot, matching how the Calendar tab already pairs these two
  // (calendar.tsx:47). Label first because iOS truncates hard in a month grid
  // and the label is the half that says which date this is.
  return contract ? `${label} · ${contract}` : label;
}

// States what the contract says and when. Never what to do about it, the same
// discipline the reminder copy holds to in reminderPlanner's TITLES map.
// describeWindows is reused rather than retyped so this text and the schedule
// on the Notifications screen cannot end up claiming different things.
function notesFor(item: PlannableDate, opts: PlanOptions): string {
  const { date, contractTitle } = item;
  const lines: string[] = [];
  if (!opts.discreetTitles) {
    const contract = contractTitle.trim();
    lines.push(
      contract
        ? `${DATE_TYPE_LABELS[date.date_type]} from your ${contract} contract.`
        : `${DATE_TYPE_LABELS[date.date_type]} from one of your contracts.`
    );
  }
  const repeats = RECURRENCE_LINE[date.recurrence];
  if (repeats) lines.push(repeats);
  if (date.reminder_windows.length > 0) {
    lines.push(`Contraya reminds you ${describeWindows(date.reminder_windows)}.`);
  }
  return lines.join('\n');
}

/** One all-day event per occurrence of a date row, from today forward. */
export function planCalendarEvents(
  item: PlannableDate,
  opts: PlanOptions,
  now: Date = new Date()
): PlannedCalendarEvent[] {
  const { date } = item;
  const title = titleFor(item, opts);
  const notes = notesFor(item, opts);
  return nextOccurrences(date.due_date, date.recurrence, now).map((occ) => {
    const day = isoDay(occ);
    return {
      key: `contract.${date.contract_id}.${date.id}.${day}`,
      day,
      title,
      notes,
      url: `contraya://contract/${date.contract_id}`,
      contractId: date.contract_id,
    };
  });
}

/**
 * Every planned event across every date row, soonest first, capped.
 *
 * Sorting by key as well as day is not cosmetic. Two rows falling on the same
 * day come back from Postgres in either order, and an order-sensitive
 * fingerprint would read that as "the plan changed" and rewrite the entire
 * calendar on an arbitrary foreground.
 */
export function planAllCalendarEvents(
  items: PlannableDate[],
  opts: PlanOptions,
  now: Date = new Date(),
  max: number = MAX_EVENTS
): PlannedCalendarEvent[] {
  return items
    .flatMap((item) => planCalendarEvents(item, opts, now))
    .sort((a, b) => (a.day === b.day ? a.key.localeCompare(b.key) : a.day.localeCompare(b.day)))
    .slice(0, Math.max(0, max));
}

// FNV-1a, 32 bit. Deliberately not expo-crypto: its digest is async and
// native, which would drag this module (and every test of it) onto the bridge
// and defeat the whole point of keeping the decisions out here.
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * A short stable digest of a plan. When it matches what was last written, the
 * sync makes ZERO EventKit calls, which matters because the sweep runs on
 * every single foreground (returning from Settings, the share sheet, Face ID).
 *
 * Covers exactly the five fields we write and nothing else, so an unrelated
 * column changing never churns the calendar.
 *
 * Today's date is deliberately NOT in here. The plan is recomputed from `now`
 * on every sweep, so its contents already change on the day an occurrence
 * rolls into the past or a new one enters the horizon. Hashing the literal
 * date instead would rewrite every event once per calendar day, which on an
 * iCloud calendar is hundreds of pointless sync operations daily.
 */
export function fingerprint(events: PlannedCalendarEvent[]): string {
  const body = events
    .map((e) => [e.key, e.day, e.title, e.notes, e.url].join('|'))
    .join(' ');
  const hex = fnv1a(`${PLAN_VERSION} ${events.length} ${body}`);
  // Length alongside the hash: a collision would have to match both.
  return `${PLAN_VERSION}:${events.length}:${hex}`;
}

/**
 * The slice of the calendar Contraya owns.
 *
 * `start` is today and NEVER earlier. nextOccurrences floors at `from` and
 * never yields a past date (see the comment block it carries), so a delete
 * window reaching backwards would erase last month's rent on every sync and
 * have nothing to recreate it from. On an iCloud calendar that deletion would
 * follow the user to their Mac. Everything before today is left alone forever,
 * and the Contraya calendar accumulates a real record of what was due.
 *
 * `deleteEnd` runs past `writeEnd` so nothing is ever stranded beyond the edge.
 */
export function calendarWindow(now: Date = new Date()): {
  start: Date;
  writeEnd: Date;
  deleteEnd: Date;
} {
  const start = startOfDay(now);
  return {
    start,
    writeEnd: addMonths(start, HORIZON_MONTHS),
    deleteEnd: addMonths(start, HORIZON_MONTHS + DELETE_SLACK_MONTHS),
  };
}
