import {
  addDays, addMonths, differenceInCalendarMonths, differenceInCalendarYears, format,
} from 'date-fns';
import {
  nextOccurrences, lastMissedOccurrence, currentOccurrence, planReminders, planAll,
  contractIdFromNotificationId, PlannableDate,
} from '@/lib/reminderPlanner';
import { ContractDate } from '@/data/types';

const now = new Date('2026-07-10T12:00:00');
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const cd = (partial: Partial<ContractDate>): ContractDate => ({
  id: 'date-1', contract_id: 'contract-1', label: 'Rent payment',
  date_type: 'payment', due_date: iso(addDays(now, 45)), recurrence: 'none',
  reminder_windows: [30, 7], last_completed_occurrence: null,
  created_at: '2026-01-01T00:00:00Z',
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

// These exist because the Tasks screen needs past occurrences and the obvious
// way to give it them (letting nextOccurrences return them) silently starves
// MAX_OCCURRENCES and stops old rows producing reminders at all. Overdue lookup
// lives in its own function precisely so these stay green.
describe('the scheduler never looks backwards', () => {
  const OLD_DATES = ['2019-01-31', '2020-02-29', '2024-12-31', '2026-07-09'];
  const RECURRENCES: ContractDate['recurrence'][] = ['none', 'monthly', 'yearly'];

  it('an ancient monthly row still plans a full horizon of reminders', () => {
    // The starvation regression. A row this old has ~90 past occurrences; if any
    // of them consumed the cap, this drops to zero and every long-tenured user
    // silently stops being reminded.
    const out = planReminders(
      item({ due_date: '2019-01-15', recurrence: 'monthly', reminder_windows: [7] }),
      now
    );
    expect(out.length).toBeGreaterThanOrEqual(12);
  });

  it('plans no reminder in the past, for any age or recurrence', () => {
    for (const due_date of OLD_DATES) {
      for (const recurrence of RECURRENCES) {
        const out = planReminders(
          item({ due_date, recurrence, reminder_windows: [90, 30, 7, 1] }),
          now
        );
        for (const r of out) {
          expect(r.fireDate.getTime()).toBeGreaterThan(now.getTime());
        }
      }
    }
  });

  it('nextOccurrences never returns a day before today', () => {
    const today = new Date('2026-07-10T00:00:00').getTime();
    for (const due of OLD_DATES) {
      for (const recurrence of RECURRENCES) {
        for (const occ of nextOccurrences(due, recurrence, now)) {
          expect(occ.getTime()).toBeGreaterThanOrEqual(today);
        }
      }
    }
  });

  it('a completion in the past cannot drag the floor backwards', () => {
    // completedThrough moves the floor, and the whole safety argument is that
    // a floor only ever moves FORWARD. A stale completion (the normal case,
    // since people tick off dates that have already passed) must leave the
    // series starting at today, not reopen the months behind it.
    const today = new Date('2026-07-10T00:00:00').getTime();
    for (const due of OLD_DATES) {
      for (const recurrence of RECURRENCES) {
        const occs = nextOccurrences(due, recurrence, now, undefined, '2020-03-31');
        for (const occ of occs) {
          expect(occ.getTime()).toBeGreaterThanOrEqual(today);
        }
        // And it must not have cost the row its schedule either.
        expect(occs).toEqual(nextOccurrences(due, recurrence, now));
      }
    }
  });

  it('an ancient monthly row with an old completion still plans a full horizon', () => {
    // The starvation regression again, this time via the new parameter: if
    // completion were a post-filter instead of a floor, the cap would fill
    // with skipped occurrences and this would collapse to zero.
    const out = planReminders(
      item({
        due_date: '2019-01-15',
        recurrence: 'monthly',
        reminder_windows: [7],
        last_completed_occurrence: '2019-06-15',
      }),
      now
    );
    expect(out.length).toBeGreaterThanOrEqual(12);
  });

  it('plans nothing for an occurrence already marked handled', () => {
    const due = iso(addDays(now, 10));
    expect(
      planReminders(item({ due_date: due, recurrence: 'none', reminder_windows: [7] }), now)
    ).toHaveLength(1);
    expect(
      planReminders(
        item({
          due_date: due,
          recurrence: 'none',
          reminder_windows: [7],
          last_completed_occurrence: due,
        }),
        now
      )
    ).toEqual([]);
  });
});

describe('lastMissedOccurrence', () => {
  it('a non-recurring date yesterday is the miss', () => {
    const due = iso(addDays(now, -1));
    expect(iso(lastMissedOccurrence(due, 'none', now)!)).toBe(due);
  });

  it('today is not yet missed', () => {
    // Boundary shared with statusKind: a date is overdue the day AFTER it.
    expect(lastMissedOccurrence(iso(now), 'none', now)).toBeNull();
    expect(lastMissedOccurrence(iso(now), 'monthly', now)).toBeNull();
  });

  it('a future date has missed nothing', () => {
    expect(lastMissedOccurrence(iso(addDays(now, 10)), 'none', now)).toBeNull();
    expect(lastMissedOccurrence(iso(addDays(now, 10)), 'monthly', now)).toBeNull();
  });

  it('monthly clamps month-end the same way forwards and backwards', () => {
    expect(iso(lastMissedOccurrence('2026-01-31', 'monthly', new Date('2026-03-01T00:00:00'))!))
      .toBe('2026-02-28');
    // Anchored at the original date, so the series recovers to the 30th/31st
    // rather than sticking at the 28th.
    expect(iso(lastMissedOccurrence('2026-01-31', 'monthly', now)!)).toBe('2026-06-30');
  });

  it('handles a leap-day yearly row', () => {
    expect(iso(lastMissedOccurrence('2020-02-29', 'yearly', now)!)).toBe('2026-02-28');
  });

  it('returns null for a malformed date', () => {
    expect(lastMissedOccurrence('not-a-date', 'monthly', now)).toBeNull();
  });

  it('sits exactly one step behind the next occurrence', () => {
    // The drift guard. Expressed as a calendar difference rather than by adding
    // a month, because clamping means addMonths(missed, 1) is not always the
    // next occurrence.
    for (const due of ['2026-01-31', '2019-01-15', '2024-12-31']) {
      const next = nextOccurrences(due, 'monthly', now)[0];
      const missed = lastMissedOccurrence(due, 'monthly', now)!;
      expect(differenceInCalendarMonths(next, missed)).toBe(1);
    }
    const nextYear = nextOccurrences('2020-02-29', 'yearly', now)[0];
    const missedYear = lastMissedOccurrence('2020-02-29', 'yearly', now)!;
    expect(differenceInCalendarYears(nextYear, missedYear)).toBe(1);
  });

  it('still sits one step behind once a completion moves the floor', () => {
    // The same drift guard with the new parameter in play. Both functions read
    // completedThrough through resumeAfter, so a completion anywhere in the
    // series must shift the past and future views together. If only one of
    // them honoured it, the Tasks screen and the scheduler would disagree
    // about which occurrence is outstanding.
    for (const completed of ['2026-05-31', '2026-06-30', '2026-08-31']) {
      const next = nextOccurrences('2026-01-31', 'monthly', now, undefined, completed)[0];
      const missed = lastMissedOccurrence('2026-01-31', 'monthly', now, completed);
      if (!missed) continue;
      expect(differenceInCalendarMonths(next, missed)).toBe(1);
    }
  });

  it('a handled miss is not a miss', () => {
    const missed = lastMissedOccurrence('2026-01-31', 'monthly', now)!;
    expect(lastMissedOccurrence('2026-01-31', 'monthly', now, iso(missed))).toBeNull();
  });

  it('ignores a malformed completion rather than hiding the miss', () => {
    expect(lastMissedOccurrence(iso(addDays(now, -1)), 'none', now, 'nonsense')).not.toBeNull();
  });
});

describe('currentOccurrence', () => {
  it('is the miss when there is one', () => {
    const due = iso(addDays(now, -3));
    expect(iso(currentOccurrence(due, 'none', now)!)).toBe(due);
  });

  it('is the next one due when nothing has been missed', () => {
    const due = iso(addDays(now, 10));
    expect(iso(currentOccurrence(due, 'none', now)!)).toBe(due);
  });

  it('advances a step once the current one is marked handled', () => {
    // What the Done control relies on: tick the row and it starts asking
    // about the following occurrence rather than the same one again.
    const first = currentOccurrence('2026-01-31', 'monthly', now)!;
    const second = currentOccurrence('2026-01-31', 'monthly', now, iso(first))!;
    expect(differenceInCalendarMonths(second, first)).toBe(1);
  });

  it('is null once a one-off date is handled', () => {
    const due = iso(addDays(now, -3));
    expect(currentOccurrence(due, 'none', now, due)).toBeNull();
  });
});
