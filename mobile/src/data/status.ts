import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ContractDate } from './types';

export type StatusKind = 'upcoming' | 'soon' | 'overdue';

// parseISO reads a yyyy-MM-dd string as local midnight (new Date() would read
// it as UTC and drift a day in negative-offset timezones).
export function daysUntil(date: string, now: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(date), now);
}

// How a date reads in lists: overdue < 0 days, soon within 30, upcoming beyond.
export function statusKind(date: string, now: Date = new Date()): StatusKind {
  const d = daysUntil(date, now);
  if (d < 0) return 'overdue';
  if (d <= 30) return 'soon';
  return 'upcoming';
}

// The next date at or after now across a contract's date rows, for the list
// card's "next up" chip. Ignores recurrence (the planner owns occurrences);
// a recurring row's stored due_date is its first occurrence.
export function nextDate(dates: ContractDate[], now: Date = new Date()): ContractDate | null {
  const future = dates
    .filter((d) => daysUntil(d.due_date, now) >= 0)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1));
  return future[0] ?? null;
}
