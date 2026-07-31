import {
  addMonths,
  addYears,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  set,
  startOfDay,
  subDays,
} from 'date-fns';
import { ContractDate, DateType } from '@/data/types';

export type PlannedReminder = {
  id: string;
  fireDate: Date;
  title: string;
  body: string;
  contractId: string;
};

// A date row paired with its contract's title, which the notification copy
// needs and the row itself does not carry.
export type PlannableDate = {
  date: ContractDate;
  contractTitle: string;
};

const REMINDER_HOUR = 9;
// How far ahead occurrences of a recurring date are materialized. 13 months
// covers a full year plus the next cycle's first hit.
export const HORIZON_MONTHS = 13;
// Hard cap per row so a malformed recurrence can never flood the schedule.
const MAX_OCCURRENCES = 24;

// Shared by nextOccurrences and lastMissedOccurrence so month-end clamping can
// never drift between the future and the past view of the same series. Every
// occurrence is stepped from the ORIGINAL date, never re-added to the previous
// one: that is what makes "due on the 31st" go Jan 31, Feb 28, Mar 31 instead
// of collapsing to the 28th forever.
function stepper(recurrence: Exclude<ContractDate['recurrence'], 'none'>) {
  return recurrence === 'monthly'
    ? (d: Date, n: number) => addMonths(d, n)
    : (d: Date, n: number) => addYears(d, n);
}

// Occurrences of a date row on or after `from`, capped at the horizon. A
// non-recurring date is its own single occurrence (skipped once past).
// date-fns addMonths clamps month-end (Jan 31 + 1mo = Feb 28), which is the
// behavior people expect from "due on the 31st".
export function nextOccurrences(
  dueDate: string,
  recurrence: ContractDate['recurrence'],
  from: Date,
  horizonMonths: number = HORIZON_MONTHS
): Date[] {
  const first = startOfDay(new Date(`${dueDate}T00:00:00`));
  if (Number.isNaN(first.getTime())) return [];
  const floor = startOfDay(from);
  const horizon = addMonths(floor, horizonMonths);

  if (recurrence === 'none') {
    return first >= floor && first <= horizon ? [first] : [];
  }

  const step = stepper(recurrence);

  const out: Date[] = [];
  for (let i = 0; out.length < MAX_OCCURRENCES; i++) {
    const occ = step(first, i);
    if (occ > horizon) break;
    if (occ >= floor) out.push(occ);
  }
  return out;
}

// The most recent occurrence STRICTLY before today, or null. UI only.
//
// Never call this from planReminders or planAll. Notifications must only ever
// be scheduled forward, and the reason that is guaranteed today is that
// nextOccurrences floors at `from` and never yields a past date at all. Keeping
// the past lookup in a separate function preserves that guarantee structurally
// rather than by argument.
//
// Specifically, do NOT be tempted to "simplify" this by making nextOccurrences
// return past occurrences and filtering at the call sites. MAX_OCCURRENCES caps
// the array, and it currently counts future occurrences only because the push
// is gated on `occ >= floor`. Drop that gate and an old monthly row fills all
// 24 slots with dates from years ago, the loop breaks before reaching a single
// future one, and that row silently stops producing reminders forever. It would
// hit the longest-tenured users first and would be close to undetectable.
//
// Returns a single Date rather than an array on purpose: one overdue task per
// row. A monthly rent row twelve months late is one unpaid rent, not twelve
// tasks, and contract_dates has no completion column so a longer list could
// never be cleared.
export function lastMissedOccurrence(
  dueDate: string,
  recurrence: ContractDate['recurrence'],
  now: Date = new Date()
): Date | null {
  const first = startOfDay(new Date(`${dueDate}T00:00:00`));
  if (Number.isNaN(first.getTime())) return null;
  const today = startOfDay(now);
  // Nothing has been missed yet. Today itself is never overdue, which matches
  // statusKind in data/status.ts.
  if (first >= today) return null;

  if (recurrence === 'none') return first;

  const step = stepper(recurrence);
  // Jump straight to the occurrence in today's own month/year, then walk back
  // at most one step. Avoids iterating from the contract's start date.
  const approx =
    recurrence === 'monthly'
      ? differenceInCalendarMonths(today, first)
      : differenceInCalendarYears(today, first);
  let i = approx;
  while (i >= 0 && step(first, i) >= today) i -= 1;
  return i < 0 ? null : step(first, i);
}

const TITLES: Record<DateType, string> = {
  payment: 'A payment is coming up',
  renewal: 'A renewal is coming up',
  termination_notice: 'A notice deadline is coming up',
  expiry: 'A contract is ending soon',
  start: 'A contract starts soon',
  custom: 'A contract date is coming up',
};

function when(days: number): string {
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

// A Date as its LOCAL calendar day. Built by hand rather than via toISOString,
// which converts to UTC and hands back the wrong day for most of the planet.
// Exported because calendarPlanner keys device calendar events off the same
// day string, and two spellings of "which day is this" would drift.
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Fire dates at 09:00 local, `w` days before each occurrence, for every window
// the row carries. Copy states what the contract says and when — never advice.
export function planReminders(item: PlannableDate, now: Date = new Date()): PlannedReminder[] {
  const { date, contractTitle } = item;
  const out: PlannedReminder[] = [];

  // Occurrences still ahead of us; a window whose fire date already passed is
  // skipped below, so an occurrence 10 days out gets its 7d reminder but not
  // its 30d one.
  for (const occ of nextOccurrences(date.due_date, date.recurrence, now)) {
    for (const days of [...date.reminder_windows].sort((a, b) => b - a)) {
      if (days <= 0 || days > 365) continue;
      const fireDate = set(subDays(occ, days), {
        hours: REMINDER_HOUR,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });
      if (fireDate.getTime() <= now.getTime()) continue;
      out.push({
        id: `contract.${date.contract_id}.${date.id}.${isoDay(occ)}.${days}d`,
        fireDate,
        title: TITLES[date.date_type],
        body: `${date.label} for ${contractTitle} is ${when(days)}.`,
        contractId: date.contract_id,
      });
    }
  }
  return out;
}

// All reminders across every date row, nearest first (so the scheduler can
// respect the platform's pending-notification cap by taking the closest ones).
export function planAll(items: PlannableDate[], now: Date = new Date()): PlannedReminder[] {
  return items
    .flatMap((item) => planReminders(item, now))
    .sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime());
}

const ID_RE = /^contract\.([^.]+)\.([^.]+)\.(\d{4}-\d{2}-\d{2})\.(\d+)d$/;

// Parse a notification id back to its contract id (for tap routing).
export function contractIdFromNotificationId(id: string): string | null {
  const m = ID_RE.exec(id);
  return m ? m[1] : null;
}

// Contract id carried by any reminder notification, local or push. Local
// notifications encode it in the identifier; the server push cron sends a
// platform-random identifier and puts the id in `data.contractId`, so the
// payload wins and the identifier is the fallback.
const CONTRACT_ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export function contractIdFromResponse(input: {
  identifier: string;
  data?: unknown;
}): string | null {
  if (input.data && typeof input.data === 'object') {
    const raw = (input.data as Record<string, unknown>).contractId;
    if (typeof raw === 'string' && CONTRACT_ID_RE.test(raw)) return raw;
  }
  return contractIdFromNotificationId(input.identifier);
}
