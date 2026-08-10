// What is past due, as a list the Tasks screen can render and the dashboard
// avatar can count. Pure: no Expo, no Supabase, no React. Derived at read time
// from the row's dates plus its one piece of user state,
// last_completed_occurrence, which is what lets a recurring row leave this
// list at all: a monthly rent always has an occurrence behind it, so before
// that column existed such a row was permanently, unclearably past due.
import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { ContractDate, DATE_TYPE_LABELS } from './types';
import { lastMissedOccurrence } from '@/lib/reminderPlanner';

// How far back a miss still counts as something worth showing. Not arbitrary:
// 90 is already the app's ceiling for "how far out a date matters", being the
// largest entry in ALLOWED_WINDOWS and the MAX_WINDOW_DAYS the reminder cron
// uses. Beyond it there is nothing left to do about the miss, and for a yearly
// row the next occurrence is already showing as upcoming anyway.
export const OVERDUE_LOOKBACK_DAYS = 90;

// Structural, deliberately NOT an import of DateWithContract from
// @/api/contracts: that module pulls in supabase-js and expo-file-system, which
// would drag the whole native stack into this file's tests. DateWithContract
// satisfies this shape.
export type TaskSource = ContractDate & { contracts: { title: string } };

export type Task = {
  dateId: string;
  contractId: string;
  contractTitle: string;
  label: string;
  typeLabel: string;
  /** yyyy-MM-dd of the missed occurrence, not of the row. */
  date: string;
  /** Always >= 1. Today is never overdue. */
  daysOverdue: number;
  recurring: boolean;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * One task per date row at most, newest miss first.
 *
 * Callers pass rows from listAllDates(), which already inner-joins on
 * contracts.status = 'active', so an ended or archived contract can never
 * produce a task. That filter is not repeated here.
 */
export function overdueTasks(
  dates: TaskSource[],
  now: Date = new Date(),
  lookbackDays: number = OVERDUE_LOOKBACK_DAYS
): Task[] {
  const today = startOfDay(now);
  const out: Task[] = [];

  for (const row of dates) {
    const missed = lastMissedOccurrence(
      row.due_date,
      row.recurrence,
      today,
      row.last_completed_occurrence
    );
    if (!missed) continue;

    const daysOverdue = differenceInCalendarDays(today, missed);
    if (daysOverdue > lookbackDays) continue;

    out.push({
      dateId: row.id,
      contractId: row.contract_id,
      contractTitle: row.contracts.title,
      label: row.label,
      typeLabel: DATE_TYPE_LABELS[row.date_type],
      date: iso(missed),
      daysOverdue,
      recurring: row.recurrence !== 'none',
    });
  }

  // Most recently missed first: it is the one still worth acting on, and the
  // list then reads as the calendar continuing backwards from today. Ties broken
  // on title then label purely so the order is deterministic for tests.
  return out.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.contractTitle.localeCompare(b.contractTitle) ||
      a.label.localeCompare(b.label)
  );
}
