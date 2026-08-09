import { addDays, format } from 'date-fns';
import { InsightOccurrence, contractInsight } from '@/data/insight';

const now = new Date('2026-07-10T12:00:00');
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

const occ = (offsetDays: number, partial: Partial<InsightOccurrence> = {}): InsightOccurrence => ({
  date: iso(addDays(now, offsetDays)),
  label: 'Rent payment',
  contractTitle: 'Apartment lease',
  ...partial,
});

describe('contractInsight', () => {
  it('says nothing for an empty portfolio', () => {
    // Null is what falls the card back to the onboarding reflection, which is
    // all a brand new account has.
    expect(contractInsight({ overdue: [], comingUp: [] }, now)).toBeNull();
  });

  it('names the overdue date, which no other surface does', () => {
    const insight = contractInsight({ overdue: [occ(-3)], comingUp: [] }, now);
    expect(insight?.headline).toBe('One date has gone by');
    expect(insight?.body).toBe('Rent payment for Apartment lease was due 3 days ago.');
  });

  it('counts several overdue dates and names the most recent', () => {
    const insight = contractInsight(
      { overdue: [occ(-30, { label: 'Deposit' }), occ(-1, { label: 'Rent payment' })], comingUp: [] },
      now
    );
    expect(insight?.headline).toBe('2 dates have gone by');
    expect(insight?.body).toContain('Rent payment');
    expect(insight?.body).toContain('yesterday');
  });

  it('prefers overdue over upcoming', () => {
    // The Past due tile shows a count and nothing anywhere says which one, so
    // this is the only place that names it.
    const insight = contractInsight({ overdue: [occ(-2)], comingUp: [occ(1)] }, now);
    expect(insight?.headline).toBe('One date has gone by');
  });

  it('names a date that is close', () => {
    const insight = contractInsight({ overdue: [], comingUp: [occ(3)] }, now);
    expect(insight?.headline).toBe('Coming up');
    expect(insight?.body).toBe('Rent payment for Apartment lease is due in 3 days.');
  });

  it('reads today and tomorrow as words', () => {
    expect(contractInsight({ overdue: [], comingUp: [occ(0)] }, now)?.body).toContain('due today');
    expect(contractInsight({ overdue: [], comingUp: [occ(1)] }, now)?.body).toContain('due tomorrow');
  });

  it('stays quiet when the next date is far off', () => {
    // The Coming up list right below says it better than a sentence can, and a
    // card restating the row underneath it is noise.
    expect(contractInsight({ overdue: [], comingUp: [occ(40)] }, now)).toBeNull();
  });

  it('picks the soonest when several are close', () => {
    const insight = contractInsight(
      { overdue: [], comingUp: [occ(9, { label: 'Renewal' }), occ(2, { label: 'Rent payment' })] },
      now
    );
    expect(insight?.body).toContain('Rent payment');
  });

  it('ignores past entries that reached comingUp', () => {
    expect(contractInsight({ overdue: [], comingUp: [occ(-5)] }, now)).toBeNull();
  });

  it('never states a figure', () => {
    // total_value is null whenever a document states no total, carries no
    // currency, and sums quantities that are not the same kind. A portfolio
    // number would appear in no document, which is exactly what the
    // extraction prompt forbids inventing. Nothing here may drift into it.
    const cases = [
      contractInsight({ overdue: [occ(-2)], comingUp: [] }, now),
      contractInsight({ overdue: [], comingUp: [occ(4)] }, now),
    ];
    for (const insight of cases) {
      expect(`${insight?.headline} ${insight?.body}`).not.toMatch(/[$€£]|\d+\.\d{2}/);
    }
  });

  it('describes and never advises', () => {
    const insight = contractInsight({ overdue: [occ(-2)], comingUp: [] }, now);
    expect(`${insight?.headline} ${insight?.body}`).not.toMatch(
      /should|must|don't|remember to|make sure|be sure|need to|pay now/i
    );
  });
});
