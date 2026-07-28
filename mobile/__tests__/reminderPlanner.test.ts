import { addDays, addMonths, format } from 'date-fns';
import {
  nextOccurrences, planReminders, planAll, contractIdFromNotificationId, PlannableDate,
} from '@/lib/reminderPlanner';
import { ContractDate } from '@/data/types';

const now = new Date('2026-07-10T12:00:00');
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const cd = (partial: Partial<ContractDate>): ContractDate => ({
  id: 'date-1', contract_id: 'contract-1', label: 'Rent payment',
  date_type: 'payment', due_date: iso(addDays(now, 45)), recurrence: 'none',
  reminder_windows: [30, 7], created_at: '2026-01-01T00:00:00Z',
  ...partial,
});

const item = (partial: Partial<ContractDate>, title = 'Apartment lease'): PlannableDate => ({
  date: cd(partial),
  contractTitle: title,
});

describe('nextOccurrences', () => {
  it('a non-recurring future date is its own single occurrence', () => {
    const due = iso(addDays(now, 10));
    expect(nextOccurrences(due, 'none', now).map(iso)).toEqual([due]);
  });

  it('a non-recurring past date yields nothing', () => {
    expect(nextOccurrences(iso(addDays(now, -1)), 'none', now)).toEqual([]);
  });

  it('monthly recurrence advances past occurrences into the future', () => {
    const firstOfLastYear = iso(addMonths(now, -13));
    const out = nextOccurrences(firstOfLastYear, 'monthly', now);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].getTime()).toBeGreaterThanOrEqual(new Date('2026-07-10T00:00:00').getTime());
  });

  it('monthly clamps month-end (Jan 31 -> Feb 28)', () => {
    const out = nextOccurrences('2026-01-31', 'monthly', new Date('2026-02-01T00:00:00'), 2);
    expect(iso(out[0])).toBe('2026-02-28');
  });

  it('yearly emits one occurrence within a 13-month horizon', () => {
    const out = nextOccurrences(iso(addDays(now, 20)), 'yearly', now);
    expect(out).toHaveLength(2); // this year's + next year's, 12mo apart, both inside 13mo
  });

  it('caps runaway occurrence counts', () => {
    const out = nextOccurrences(iso(addMonths(now, -240)), 'monthly', now, 240);
    expect(out.length).toBeLessThanOrEqual(24);
  });

  it('returns [] for a malformed date', () => {
    expect(nextOccurrences('not-a-date', 'monthly', now)).toEqual([]);
  });
});

describe('planReminders', () => {
  it('plans one reminder per window at 09:00 local', () => {
    const out = planReminders(item({ due_date: iso(addDays(now, 45)) }), now);
    expect(out).toHaveLength(2);
    for (const r of out) {
      expect(r.fireDate.getHours()).toBe(9);
      expect(r.contractId).toBe('contract-1');
    }
  });

  it('skips windows whose fire date already passed', () => {
    // 10 days out: the 30d window is behind us, the 7d window is ahead.
    const out = planReminders(item({ due_date: iso(addDays(now, 10)) }), now);
    expect(out).toHaveLength(1);
    expect(out[0].id).toMatch(/\.7d$/);
  });

  it('plans nothing for a past non-recurring date', () => {
    expect(planReminders(item({ due_date: iso(addDays(now, -3)) }), now)).toEqual([]);
  });

  it('recurring dates get reminders for each occurrence in the horizon', () => {
    const out = planReminders(
      item({ due_date: iso(addDays(now, 20)), recurrence: 'monthly', reminder_windows: [7] }),
      now
    );
    expect(out.length).toBeGreaterThanOrEqual(12);
  });

  it('body names the date and the contract, factually', () => {
    const out = planReminders(item({ due_date: iso(addDays(now, 45)) }), now);
    expect(out[0].body).toBe('Rent payment for Apartment lease is in 30 days.');
  });

  it('says tomorrow for 1-day windows', () => {
    const out = planReminders(
      item({ due_date: iso(addDays(now, 5)), reminder_windows: [1] }),
      now
    );
    expect(out[0].body).toContain('is tomorrow');
  });

  it('ignores windows outside 1..365', () => {
    const out = planReminders(
      item({ due_date: iso(addDays(now, 45)), reminder_windows: [0, 400, 7] }),
      now
    );
    expect(out).toHaveLength(1);
  });
});

describe('planAll', () => {
  it('sorts nearest first across contracts', () => {
    const near = item({ id: 'd-near', due_date: iso(addDays(now, 9)), reminder_windows: [7] });
    const far = item({ id: 'd-far', due_date: iso(addDays(now, 60)), reminder_windows: [30] });
    const out = planAll([far, near], now);
    expect(out[0].id).toContain('d-near');
  });
});

describe('notification ids', () => {
  it('round-trips the contract id', () => {
    const out = planReminders(item({ due_date: iso(addDays(now, 45)) }), now);
    expect(contractIdFromNotificationId(out[0].id)).toBe('contract-1');
  });

  it('rejects foreign ids', () => {
    expect(contractIdFromNotificationId('warranty.x.30d')).toBeNull();
    expect(contractIdFromNotificationId('anything-else')).toBeNull();
  });
});
