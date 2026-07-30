import { splitLeadIn, describeWindows } from '@/lib/textFormat';

describe('splitLeadIn', () => {
  it('splits the first sentence from the rest', () => {
    expect(splitLeadIn('Yes, it renews automatically. Give 60 days notice to stop it.')).toEqual({
      lead: 'Yes, it renews automatically.',
      rest: 'Give 60 days notice to stop it.',
    });
  });

  it('returns the whole string as lead when there is no sentence break', () => {
    expect(splitLeadIn('No period here')).toEqual({ lead: 'No period here', rest: '' });
  });

  it('handles a single-sentence answer with no remainder', () => {
    expect(splitLeadIn('Yes.')).toEqual({ lead: 'Yes.', rest: '' });
  });

  it('only scans the first 160 characters for a sentence break', () => {
    const long = 'x'.repeat(200) + '. tail';
    const { lead } = splitLeadIn(long);
    expect(lead.length).toBeLessThanOrEqual(161);
  });
});

describe('describeWindows', () => {
  it('renders the real payment default', () => {
    expect(describeWindows([7, 1])).toBe('7 days and 1 day before');
  });

  it('renders the real renewal / notice default', () => {
    expect(describeWindows([60, 30, 7])).toBe('60 days, 30 days and 7 days before');
  });

  it('sorts furthest-out first regardless of input order', () => {
    expect(describeWindows([7, 60, 30])).toBe('60 days, 30 days and 7 days before');
  });

  it('singularises one day', () => {
    expect(describeWindows([1])).toBe('1 day before');
  });

  it('handles a single multi-day window', () => {
    expect(describeWindows([30])).toBe('30 days before');
  });

  it('does not crash on an empty set', () => {
    expect(describeWindows([])).toBe('No reminders');
  });
});
