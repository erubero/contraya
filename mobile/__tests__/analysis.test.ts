import { parseAnalysis, unresolvedDates, MAX_DATES } from '@/data/analysis';

describe('parseAnalysis', () => {
  it('decodes a well-formed analysis', () => {
    const out = parseAnalysis({
      title: 'Apartment lease',
      contract_type: 'lease',
      party_you: 'You (tenant)',
      party_other: 'Palm Grove LLC',
      summary: 'You rent the apartment for 12 months.',
      payment_terms: '$1,850 due the 1st.',
      key_dates: [
        { label: 'Rent payment', date: '2026-08-01', date_type: 'payment', recurrence: 'monthly', note: null },
      ],
      obligations: [{ who: 'You', description: 'Give 60 days notice.', due_note: null }],
      risk_flags: [
        { severity: 'high', title: 'Auto-renewal', quote: 'shall renew', why_it_matters: 'It continues a year.' },
      ],
    });
    expect(out.title).toBe('Apartment lease');
    expect(out.contract_type).toBe('lease');
    expect(out.key_dates).toHaveLength(1);
    expect(out.obligations).toHaveLength(1);
    expect(out.risk_flags[0].severity).toBe('high');
  });

  it('never throws on garbage', () => {
    expect(parseAnalysis(null).key_dates).toEqual([]);
    expect(parseAnalysis(undefined).contract_type).toBe('other');
    expect(parseAnalysis('string').summary).toBeNull();
    expect(parseAnalysis(42).obligations).toEqual([]);
  });

  it('coerces unknown enums to safe defaults', () => {
    const out = parseAnalysis({
      contract_type: 'spaceship',
      key_dates: [{ label: 'X', date: '2026-08-01', date_type: 'blood-oath', recurrence: 'hourly' }],
      risk_flags: [{ severity: 'catastrophic', title: 'T', why_it_matters: 'W' }],
    });
    expect(out.contract_type).toBe('other');
    expect(out.key_dates[0].date_type).toBe('custom');
    expect(out.key_dates[0].recurrence).toBe('none');
    expect(out.risk_flags[0].severity).toBe('low');
  });

  it('drops dates without a valid ISO date or label', () => {
    const out = parseAnalysis({
      key_dates: [
        { label: 'Bad date', date: 'next Tuesday', date_type: 'payment' },
        { label: '', date: '2026-08-01', date_type: 'payment' },
        { label: 'Good', date: '2026-08-01', date_type: 'payment' },
      ],
    });
    expect(out.key_dates).toHaveLength(1);
    expect(out.key_dates[0].label).toBe('Good');
  });

  it('truncates arrays at their caps', () => {
    const out = parseAnalysis({
      key_dates: Array.from({ length: 50 }, (_, i) => ({
        label: `Date ${i}`, date: '2026-08-01', date_type: 'custom',
      })),
    });
    expect(out.key_dates).toHaveLength(MAX_DATES);
  });

  it('decodes total_value and contact, rejecting junk', () => {
    expect(parseAnalysis({ total_value: 8500 }).total_value).toBe(8500);
    expect(parseAnalysis({ total_value: 49.999 }).total_value).toBe(50);
    expect(parseAnalysis({ total_value: -5 }).total_value).toBeNull();
    expect(parseAnalysis({ total_value: '8500' }).total_value).toBeNull();
    expect(parseAnalysis({ total_value: Infinity }).total_value).toBeNull();
    expect(parseAnalysis({ party_other_contact: ' events@casadelmar.com ' }).party_other_contact).toBe('events@casadelmar.com');
    expect(parseAnalysis({}).party_other_contact).toBeNull();
  });

  it('decodes the verification verdict, defaulting to unchecked', () => {
    const dates = (verified?: unknown) =>
      parseAnalysis({ key_dates: [{ label: 'X', date: '2026-08-01', date_type: 'payment', verified }] }).key_dates;
    expect(dates('confirmed')[0].verified).toBe('confirmed');
    expect(dates('corrected')[0].verified).toBe('corrected');
    expect(dates('not_found')[0].verified).toBe('not_found');
    expect(dates('definitely')[0].verified).toBe('unchecked');
    expect(dates(undefined)[0].verified).toBe('unchecked');
  });

  it('truncates oversized strings instead of dropping them', () => {
    const out = parseAnalysis({ summary: 'x'.repeat(10000) });
    expect(out.summary).toHaveLength(8000);
  });

  it('strips control and bidi-override chars from strings', () => {
    const out = parseAnalysis({
      summary: 'shall\u202Erenew\u200B',
      party_other: 'A\u2066cme LLC',
    });
    expect(out.summary).toBe('shallrenew');
    expect(out.party_other).toBe('Acme LLC');
  });

  it('drops dates outside the plausible year window', () => {
    const dates = (date: string) =>
      parseAnalysis({ key_dates: [{ label: 'X', date, date_type: 'payment' }] }).key_dates;
    expect(dates('0001-01-01')).toHaveLength(0);
    expect(dates('9999-12-31')).toHaveLength(0);
    expect(dates('2026-08-01')).toHaveLength(1);
  });
});

describe('unresolvedDates', () => {
  const rows = (...verified: string[]) =>
    verified.map((v) => ({ verified: v as 'confirmed' | 'corrected' | 'not_found' | 'unchecked' }));

  it('blocks a date the verification pass could not re-find', () => {
    expect(unresolvedDates(rows('not_found'))).toEqual([0]);
  });

  it('blocks a date the second read corrected', () => {
    expect(unresolvedDates(rows('corrected'))).toEqual([0]);
  });

  it('treats unchecked as neutral', () => {
    // The verify pass is best-effort against a time budget, and a date the
    // user typed is unchecked too. Blocking on it would stop a save for a
    // check that was never asked for.
    expect(unresolvedDates(rows('unchecked'))).toEqual([]);
  });

  it('lets a confirmed date through', () => {
    expect(unresolvedDates(rows('confirmed'))).toEqual([]);
  });

  it('returns the positions of every flagged row', () => {
    expect(unresolvedDates(rows('confirmed', 'not_found', 'unchecked', 'corrected'))).toEqual([1, 3]);
  });

  it('allows an empty list', () => {
    expect(unresolvedDates([])).toEqual([]);
  });

  it('clears once the human answers the flag', () => {
    // Editing a flagged date, or tapping Checked, resets it to 'unchecked'.
    // That is the whole mechanism: a date Contry could not stand behind
    // cannot become a 9:00 push until somebody looked at it.
    const answered = rows('not_found').map((r) => ({ ...r, verified: 'unchecked' as const }));
    expect(unresolvedDates(answered)).toEqual([]);
  });
});
