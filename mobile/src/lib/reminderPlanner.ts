import { addMonths, addYears, set, startOfDay, subDays } from 'date-fns';
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

  const step = recurrence === 'monthly'
    ? (d: Date, n: number) => addMonths(d, n)
    : (d: Date, n: number) => addYears(d, n);

  const out: Date[] = [];
  for (let i = 0; out.length < MAX_OCCURRENCES; i++) {
    const occ = step(first, i);
    if (occ > horizon) break;
    if (occ >= floor) out.push(occ);
  }
  return out;
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

const iso = (d: Date) =>
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
        id: `contract.${date.contract_id}.${date.id}.${iso(occ)}.${days}d`,
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
