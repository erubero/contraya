import { splitLeadIn } from '@/lib/textFormat';

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
