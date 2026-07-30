import { addDays, addMonths, format } from 'date-fns';
import { overdueTasks, OVERDUE_LOOKBACK_DAYS, TaskSource } from '@/data/tasks';
import { daysUntil } from '@/data/status';

const now = new Date('2026-07-10T12:00:00');
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const row = (partial: Partial<TaskSource>, title = 'Apartment lease'): TaskSource => ({
  id: 'date-1',
  contract_id: 'contract-1',
  label: 'Rent payment',
  date_type: 'payment',
  due_date: iso(addDays(now, -3)),
  recurrence: 'none',
  reminder_windows: [30, 7],
  created_at: '2026-01-01T00:00:00Z',
  contracts: { title },
  ...partial,
});

describe('overdueTasks', () => {
  it('lists a date that has passed', () => {
    const out = overdueTasks([row({})], now);
    expect(out).toHaveLength(1);
    expect(out[0].daysOverdue).toBe(3);
    expect(out[0].contractTitle).toBe('Apartment lease');
    expect(out[0].typeLabel).toBe('Payment');
  });

  it('a date due today is not a task', () => {
    expect(overdueTasks([row({ due_date: iso(now) })], now)).toEqual([]);
  });

  it('a future date is not a task', () => {
    expect(overdueTasks([row({ due_date: iso(addDays(now, 5)) })], now)).toEqual([]);
  });

  it('a monthly row overdue by a year is ONE task, not twelve', () => {
    // The headline rule. An unpaid rent is one thing to deal with, and since
    // contract_dates has no completion column a longer list could never be
    // cleared.
    const out = overdueTasks(
      [row({ due_date: iso(addMonths(now, -12)), recurrence: 'monthly' })],
      now
    );
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe(iso(addMonths(now, -1)));
    expect(out[0].recurring).toBe(true);
  });

  it('drops a miss older than the lookback, at the exact boundary', () => {
    const at = (days: number) => overdueTasks([row({ due_date: iso(addDays(now, -days)) })], now);
    expect(at(OVERDUE_LOOKBACK_DAYS)).toHaveLength(1);
    expect(at(OVERDUE_LOOKBACK_DAYS + 1)).toEqual([]);
  });

  it('daysOverdue always agrees with daysUntil, so the badge cannot lie', () => {
    const out = overdueTasks(
      [
        row({ id: 'a', due_date: iso(addDays(now, -1)) }),
        row({ id: 'b', due_date: iso(addDays(now, -45)) }),
        row({ id: 'c', due_date: iso(addMonths(now, -7)), recurrence: 'monthly' }),
      ],
      now
    );
    expect(out).toHaveLength(3);
    for (const t of out) {
      expect(t.daysOverdue).toBe(-daysUntil(t.date, now));
      expect(t.daysOverdue).toBeGreaterThanOrEqual(1);
    }
  });

  it('sorts most recently missed first, deterministically', () => {
    const out = overdueTasks(
      [
        row({ id: 'old', due_date: iso(addDays(now, -30)) }, 'Gym'),
        row({ id: 'new', due_date: iso(addDays(now, -2)) }, 'Storage'),
        row({ id: 'mid', due_date: iso(addDays(now, -9)) }, 'Phone'),
      ],
      now
    );
    expect(out.map((t) => t.dateId)).toEqual(['new', 'mid', 'old']);
  });

  it('breaks same-day ties on contract title then label', () => {
    const due = iso(addDays(now, -4));
    const out = overdueTasks(
      [
        row({ id: '1', due_date: due, label: 'Zebra' }, 'Beta'),
        row({ id: '2', due_date: due, label: 'Alpha' }, 'Beta'),
        row({ id: '3', due_date: due }, 'Alpha'),
      ],
      now
    );
    expect(out.map((t) => t.dateId)).toEqual(['3', '2', '1']);
  });

  it('skips malformed dates rather than throwing', () => {
    expect(overdueTasks([row({ due_date: 'not-a-date' })], now)).toEqual([]);
  });

  it('is empty for an empty input', () => {
    expect(overdueTasks([], now)).toEqual([]);
  });

  // Not tested here on purpose: ended and archived contracts. listAllDates()
  // inner-joins on contracts.status = 'active', so those rows never reach this
  // function. Faking one would test a filter that lives in SQL.
});
