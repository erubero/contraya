import { addDays, addMonths, format } from 'date-fns';
import {
  DELETE_SLACK_MONTHS, MAX_EVENTS, PLAN_VERSION, calendarWindow, dayEnd, dayStart,
  eventMatchKey, fingerprint, localDay, planAllCalendarEvents, planCalendarEvents,
} from '@/lib/calendarPlanner';
import { HORIZON_MONTHS, PlannableDate, nextOccurrences } from '@/lib/reminderPlanner';
import { ContractDate } from '@/data/types';

const now = new Date('2026-07-10T12:00:00');
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const cd = (partial: Partial<ContractDate>): ContractDate => ({
  id: 'date-1', contract_id: 'contract-1', label: 'Rent payment',
  date_type: 'payment', due_date: iso(addDays(now, 45)), recurrence: 'none',
  reminder_windows: [7, 1], created_at: '2026-01-01T00:00:00Z',
  ...partial,
});

const item = (partial: Partial<ContractDate>, title = 'Apartment lease'): PlannableDate => ({
  date: cd(partial),
  contractTitle: title,
});

const loud = { discreetTitles: false };
const quiet = { discreetTitles: true };

describe('planCalendarEvents', () => {
  it('plans one event per occurrence', () => {
    const due = iso(addDays(now, 10));
    expect(planCalendarEvents(item({ due_date: due }), loud, now).map((e) => e.day)).toEqual([due]);
  });

  it('a non-recurring past date plans nothing', () => {
    expect(planCalendarEvents(item({ due_date: iso(addDays(now, -1)) }), loud, now)).toEqual([]);
  });

  it('a monthly row plans an event a month across the horizon', () => {
    const out = planCalendarEvents(item({ recurrence: 'monthly' }), loud, now);
    expect(out.length).toBeGreaterThan(10);
    expect(new Set(out.map((e) => e.day)).size).toBe(out.length);
  });

  it('names the date and the contract', () => {
    expect(planCalendarEvents(item({}), loud, now)[0].title).toBe('Rent payment · Apartment lease');
  });

  it('states what the contract says and never advises', () => {
    // The reminder copy holds to this and so must the calendar: Contraya
    // describes the contract, it does not tell anyone what to do about it.
    const { notes } = planCalendarEvents(item({ recurrence: 'monthly' }), loud, now)[0];
    expect(notes).toContain('Payment from your Apartment lease contract.');
    expect(notes).toContain('Repeats monthly.');
    expect(notes).not.toMatch(/should|must|don't|remember to|make sure|be sure|need to/i);
  });

  it('renders the reminder windows through describeWindows', () => {
    // Retyping this sentence instead of reusing describeWindows is how the
    // calendar ends up promising a schedule the planner does not run.
    const { notes } = planCalendarEvents(item({ reminder_windows: [7, 1] }), loud, now)[0];
    expect(notes).toContain('Contraya reminds you 7 days and 1 day before.');
  });

  it('omits the reminder line when a row carries no windows', () => {
    const { notes } = planCalendarEvents(item({ reminder_windows: [] }), loud, now)[0];
    expect(notes).not.toContain('Contraya reminds you');
  });

  it('carries the contract deep link', () => {
    expect(planCalendarEvents(item({}), loud, now)[0].url).toBe('contraya://contract/contract-1');
  });

  it('discreet mode leaks neither the contract name nor the row label', () => {
    // This is the whole point of the option: a calendar can be read by a
    // spouse, a work Mac, or any other app holding calendar access.
    const out = planCalendarEvents(
      item({ label: 'Divorce settlement payment', date_type: 'payment' }, 'Rivera settlement'),
      quiet,
      now
    );
    expect(out[0].title).toBe('Payment');
    for (const field of [out[0].title, out[0].notes]) {
      expect(field).not.toContain('Rivera');
      expect(field).not.toContain('Divorce');
    }
  });

  it('falls back to the type label when a row has a blank label', () => {
    expect(planCalendarEvents(item({ label: '   ' }), loud, now)[0].title)
      .toBe('Payment · Apartment lease');
  });

  it('plans nothing for a malformed date', () => {
    expect(planCalendarEvents(item({ due_date: 'not-a-date' }), loud, now)).toEqual([]);
  });
});

describe('the device calendar never disagrees with the app', () => {
  // Every occurrence comes from nextOccurrences, the same function the
  // Calendar tab and the reminder scheduler use. Do NOT "optimize" this into a
  // single event carrying a native recurrenceRule: EKRecurrenceRule repeating
  // on the 31st SKIPS months that have no 31st, while nextOccurrences clamps
  // to the 28th. The app would say rent is due Feb 28 and the phone's calendar
  // would show nothing in February.
  const spread = ['2019-01-31', '2020-02-29', '2024-12-31', '2026-07-09'];

  it('plans exactly the occurrences the rest of the app shows', () => {
    for (const due of spread) {
      for (const recurrence of ['none', 'monthly', 'yearly'] as const) {
        const planned = planCalendarEvents(item({ due_date: due, recurrence }), loud, now);
        expect(planned.map((e) => e.day)).toEqual(
          nextOccurrences(due, recurrence, now).map(iso)
        );
      }
    }
  });

  it('clamps a month end rather than skipping the month', () => {
    const feb = new Date('2026-02-01T00:00:00');
    const days = planCalendarEvents(item({ due_date: '2026-01-31', recurrence: 'monthly' }), loud, feb)
      .map((e) => e.day);
    expect(days[0]).toBe('2026-02-28');
  });

  it('lands a leap day yearly row on Feb 28 in a common year', () => {
    const days = planCalendarEvents(
      item({ due_date: '2024-02-29', recurrence: 'yearly' }),
      loud,
      new Date('2026-01-01T00:00:00')
    ).map((e) => e.day);
    expect(days[0]).toBe('2026-02-28');
  });

  it('never plans a day before today', () => {
    const days = planAllCalendarEvents(
      spread.flatMap((due) => [
        item({ due_date: due, recurrence: 'monthly' }),
        item({ due_date: due, recurrence: 'yearly' }),
        item({ due_date: due, recurrence: 'none' }),
      ]),
      loud,
      now
    ).map((e) => e.day);
    for (const day of days) expect(day >= iso(now)).toBe(true);
  });
});

describe('planAllCalendarEvents', () => {
  it('sorts soonest first across contracts', () => {
    const out = planAllCalendarEvents(
      [
        item({ id: 'b', contract_id: 'c2', due_date: iso(addDays(now, 40)) }, 'Gym'),
        item({ id: 'a', contract_id: 'c1', due_date: iso(addDays(now, 5)) }, 'Lease'),
      ],
      loud,
      now
    );
    expect(out.map((e) => e.day)).toEqual([iso(addDays(now, 5)), iso(addDays(now, 40))]);
  });

  it('is stable when the same rows arrive in a different order', () => {
    // Postgres returns rows sharing a due_date in either order. Without the
    // secondary sort on key, the fingerprint would flip between foregrounds
    // and rewrite every event in the calendar for nothing.
    const day = iso(addDays(now, 20));
    const rows = [
      item({ id: 'z', contract_id: 'c1', due_date: day }, 'Zed'),
      item({ id: 'a', contract_id: 'c2', due_date: day }, 'Ada'),
      item({ id: 'm', contract_id: 'c3', due_date: day }, 'Mid'),
    ];
    const forward = planAllCalendarEvents(rows, loud, now);
    const reversed = planAllCalendarEvents([...rows].reverse(), loud, now);
    expect(fingerprint(reversed)).toBe(fingerprint(forward));
  });

  it('caps at MAX_EVENTS and keeps the nearest', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      item({ id: `d${i}`, contract_id: `c${i}`, recurrence: 'monthly' })
    );
    const out = planAllCalendarEvents(many, loud, now);
    expect(out.length).toBe(MAX_EVENTS);
    expect(out[0].day <= out[out.length - 1].day).toBe(true);
  });
});

describe('fingerprint', () => {
  const base = () => planAllCalendarEvents([item({ recurrence: 'monthly' })], loud, now);

  it('is identical for identical plans', () => {
    expect(fingerprint(base())).toBe(fingerprint(base()));
  });

  it('carries the plan version so a copy change forces one rebuild', () => {
    expect(fingerprint(base()).startsWith(`${PLAN_VERSION}:`)).toBe(true);
  });

  it('changes when a contract is renamed', () => {
    const renamed = planAllCalendarEvents([item({ recurrence: 'monthly' }, 'New name')], loud, now);
    expect(fingerprint(renamed)).not.toBe(fingerprint(base()));
  });

  it('changes when a date row is added', () => {
    const more = planAllCalendarEvents(
      [item({ recurrence: 'monthly' }), item({ id: 'date-2', due_date: iso(addDays(now, 3)) })],
      loud,
      now
    );
    expect(fingerprint(more)).not.toBe(fingerprint(base()));
  });

  it('changes when a date row is removed', () => {
    expect(fingerprint([])).not.toBe(fingerprint(base()));
  });

  it('changes when a due date moves', () => {
    const moved = planAllCalendarEvents(
      [item({ recurrence: 'monthly', due_date: iso(addDays(now, 46)) })],
      loud,
      now
    );
    expect(fingerprint(moved)).not.toBe(fingerprint(base()));
  });

  it('changes when contract names are hidden', () => {
    const hidden = planAllCalendarEvents([item({ recurrence: 'monthly' })], quiet, now);
    expect(fingerprint(hidden)).not.toBe(fingerprint(base()));
  });

  it('does not change when a field we never write changes', () => {
    // The hash covers exactly what lands on the event. Anything wider and the
    // sweep rewrites the whole calendar because a created_at came back
    // different, which is a lot of iCloud traffic for no visible change.
    const noisy = planAllCalendarEvents(
      [item({ recurrence: 'monthly', created_at: '2020-05-05T00:00:00Z', user_id: 'someone' })],
      loud,
      now
    );
    expect(fingerprint(noisy)).toBe(fingerprint(base()));
  });
});

describe('calendarWindow', () => {
  it('starts at local midnight today and never earlier', () => {
    const { start } = calendarWindow(now);
    expect(iso(start)).toBe(iso(now));
    expect(start.getHours()).toBe(0);
  });

  it('writes to the same horizon the planner uses', () => {
    const { start, writeEnd } = calendarWindow(now);
    expect(iso(writeEnd)).toBe(iso(addMonths(start, HORIZON_MONTHS)));
  });

  it('deletes past the write horizon so nothing is ever stranded', () => {
    const { writeEnd, deleteEnd } = calendarWindow(now);
    expect(deleteEnd.getTime()).toBeGreaterThan(writeEnd.getTime());
    expect(DELETE_SLACK_MONTHS).toBeGreaterThan(0);
  });
});

describe('dayStart, dayEnd and localDay', () => {
  it('reads a day as local midnight, not UTC', () => {
    // new Date('2026-08-15') is UTC midnight and lands on the 14th everywhere
    // west of Greenwich. Rent would show on the wrong day for the Americas.
    expect(dayStart('2026-08-15').getHours()).toBe(0);
    expect(iso(dayStart('2026-08-15'))).toBe('2026-08-15');
  });

  it('ends an all day event on the following midnight', () => {
    expect(iso(dayEnd('2026-08-15'))).toBe('2026-08-16');
  });

  it('round-trips a planned day through what EventKit hands back', () => {
    expect(localDay(dayStart('2026-08-15'))).toBe('2026-08-15');
    expect(localDay('2026-08-15')).toBe('2026-08-15');
    expect(localDay(new Date('2026-08-15T00:00:00'))).toBe('2026-08-15');
  });

  it('survives an unreadable date instead of throwing', () => {
    expect(localDay('nonsense')).toBe('');
    expect(localDay(new Date('nonsense'))).toBe('');
  });
});

describe('eventMatchKey', () => {
  it('separates two events on the same day', () => {
    expect(eventMatchKey('2026-08-15', 'Rent · Lease'))
      .not.toBe(eventMatchKey('2026-08-15', 'Premium · Insurance'));
  });

  it('matches a planned event to the same event read back off the device', () => {
    const planned = planCalendarEvents(item({}), loud, now)[0];
    expect(eventMatchKey(localDay(dayStart(planned.day)), planned.title))
      .toBe(eventMatchKey(planned.day, planned.title));
  });
});
