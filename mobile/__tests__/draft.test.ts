import {
  ContractDraft, DRAFT_TTL_MS, DRAFT_VERSION,
  decodeDraft, encodeDraft, isDraftExpired, isDraftWorthKeeping, MAX_DRAFT_BYTES,
} from '@/data/draft';
import { ContractAnalysis } from '@/data/analysis';

const now = new Date('2026-07-30T12:00:00Z');
const USER = 'user-1';

const analysis: ContractAnalysis = {
  title: 'Apartment lease',
  contract_type: 'lease',
  party_you: 'Edgardo',
  party_other: 'Sunset Properties',
  party_other_contact: null,
  summary: 'A one year lease.',
  payment_terms: '$1,800 on the 1st',
  total_value: 21600,
  key_dates: [
    { label: 'Rent', date: '2026-08-01', date_type: 'payment', recurrence: 'monthly', note: null, verified: 'confirmed' },
  ],
  obligations: [],
  risk_flags: [],
};

const draft = (over: Partial<ContractDraft> = {}): ContractDraft => ({
  v: DRAFT_VERSION,
  userId: USER,
  savedAt: now.toISOString(),
  step: 'review',
  analysis,
  sourceKind: 'pdf',
  sourceName: 'lease.pdf',
  sourcePaths: ['user-1/abc.pdf'],
  inboxItemId: null,
  fields: {
    title: 'Apartment lease',
    type: 'lease',
    partyOther: 'Sunset Properties',
    effectiveDate: '',
    endDate: '',
    notes: 'Ask about the parking spot',
    dates: analysis.key_dates,
  },
  ...over,
});

const round = (d: ContractDraft, at: Date = now) => decodeDraft(encodeDraft(d), USER, at);

describe('decodeDraft round-trip', () => {
  it('preserves a full review draft', () => {
    const out = round(draft());
    expect(out).not.toBeNull();
    expect(out!.step).toBe('review');
    expect(out!.analysis?.title).toBe('Apartment lease');
    expect(out!.fields.notes).toBe('Ask about the parking spot');
    expect(out!.fields.dates).toHaveLength(1);
    expect(out!.sourcePaths).toEqual(['user-1/abc.pdf']);
    expect(out!.sourceName).toBe('lease.pdf');
  });

  it('preserves a manual draft as manual', () => {
    // Restoring manual work as 'review' would silently drop the typed end date,
    // because only the manual branch renders that field and converts it to a row.
    const out = round(
      draft({
        step: 'manual',
        analysis: null,
        sourceKind: null,
        sourcePaths: [],
        fields: { ...draft().fields, endDate: '2027-07-31' },
      })
    );
    expect(out!.step).toBe('manual');
    expect(out!.analysis).toBeNull();
    expect(out!.fields.endDate).toBe('2027-07-31');
  });

  it('keeps partially typed date rows that the strict decoder drops', () => {
    const out = round(
      draft({
        fields: {
          ...draft().fields,
          dates: [
            { label: 'Notice', date: '', date_type: 'termination_notice', recurrence: 'none', note: null, verified: 'unchecked' },
            { label: '', date: '', date_type: 'custom', recurrence: 'none', note: null, verified: 'unchecked' },
          ],
        },
      })
    );
    expect(out!.fields.dates).toHaveLength(2);
    expect(out!.fields.dates[0].label).toBe('Notice');
  });
});

describe('decodeDraft rejection', () => {
  it('returns null for garbage', () => {
    for (const raw of [null, '', 'not json', '[]', '42', '"a string"', '{}']) {
      expect(decodeDraft(raw, USER, now)).toBeNull();
    }
  });

  it('returns null on a missing or unknown version', () => {
    expect(decodeDraft(JSON.stringify({ ...draft(), v: undefined }), USER, now)).toBeNull();
    expect(decodeDraft(JSON.stringify({ ...draft(), v: 99 }), USER, now)).toBeNull();
    expect(decodeDraft(JSON.stringify({ ...draft(), v: '1' }), USER, now)).toBeNull();
  });

  it('returns null when the draft belongs to another account', () => {
    expect(decodeDraft(encodeDraft(draft({ userId: 'someone-else' })), USER, now)).toBeNull();
  });

  it('returns null for a step it does not recognise', () => {
    for (const step of ['source', 'analyzing', '', 'REVIEW']) {
      expect(decodeDraft(JSON.stringify({ ...draft(), step }), USER, now)).toBeNull();
    }
  });
});

describe('expiry', () => {
  const at = (ms: number) => new Date(now.getTime() + ms);

  it('accepts a draft just inside the window and rejects one just outside', () => {
    expect(round(draft(), at(DRAFT_TTL_MS - 1))).not.toBeNull();
    expect(round(draft(), at(DRAFT_TTL_MS))).not.toBeNull();
    expect(round(draft(), at(DRAFT_TTL_MS + 1))).toBeNull();
  });

  it('treats an unreadable timestamp as expired, never as fresh', () => {
    // Failing the other way would make a corrupt draft immortal.
    expect(isDraftExpired('not-a-date', now)).toBe(true);
    expect(isDraftExpired('', now)).toBe(true);
    expect(decodeDraft(JSON.stringify({ ...draft(), savedAt: 'nope' }), USER, now)).toBeNull();
  });
});

describe('the inbox pairing rule', () => {
  // These two are the codec-level half of the invariant that a partial reset of
  // the inbox linkage is what destroyed users' only copy of an emailed PDF.
  // DO NOT DELETE.
  it('never restores an inbox row object, only an id', () => {
    const raw = JSON.stringify({
      ...draft({ inboxItemId: 'inbox-1' }),
      inboxItem: { id: 'inbox-1', storage_path: 'user-1/abc.pdf', kind: 'pdf' },
    });
    const out = decodeDraft(raw, USER, now);
    expect(out!.inboxItemId).toBe('inbox-1');
    expect(out as unknown as Record<string, unknown>).not.toHaveProperty('inboxItem');
  });

  it('drops the id AND the paths together when either is missing', () => {
    const noPaths = round(draft({ inboxItemId: 'inbox-1', sourcePaths: [] }));
    expect(noPaths!.inboxItemId).toBeNull();
    expect(noPaths!.sourcePaths).toEqual([]);
    expect(noPaths!.sourceKind).toBeNull();

    // The converse: paths with no inbox id is a normal picked source and stays.
    const noId = round(draft({ inboxItemId: null }));
    expect(noId!.inboxItemId).toBeNull();
    expect(noId!.sourcePaths).toEqual(['user-1/abc.pdf']);
  });

  it('keeps the analysis even when the attachment is dropped', () => {
    // The paid artifact must survive losing its file: that is the whole point.
    const out = round(draft({ inboxItemId: 'inbox-1', sourcePaths: [] }));
    expect(out!.analysis?.title).toBe('Apartment lease');
  });
});

describe('isDraftWorthKeeping', () => {
  it('is true whenever an analysis exists, however empty the fields', () => {
    // Clearing the title on a restored draft must not destroy the paid analysis.
    const blank = draft({
      fields: { title: '', type: 'other', partyOther: '', effectiveDate: '', endDate: '', notes: '', dates: [] },
    });
    expect(isDraftWorthKeeping(blank)).toBe(true);
  });

  it('is false for an untouched manual form', () => {
    const empty = draft({
      step: 'manual',
      analysis: null,
      fields: { title: '', type: 'other', partyOther: '', effectiveDate: '', endDate: '', notes: '', dates: [] },
    });
    expect(isDraftWorthKeeping(empty)).toBe(false);
  });

  it('is true once any manual field has content', () => {
    const base = draft({ step: 'manual', analysis: null });
    const blank = { title: '', type: 'other' as const, partyOther: '', effectiveDate: '', endDate: '', notes: '', dates: [] };
    expect(isDraftWorthKeeping({ ...base, fields: { ...blank, title: 'Gym' } })).toBe(true);
    expect(isDraftWorthKeeping({ ...base, fields: { ...blank, notes: 'later' } })).toBe(true);
    expect(isDraftWorthKeeping({ ...base, fields: { ...blank, endDate: '2027-01-01' } })).toBe(true);
  });
});

describe('encodeDraft', () => {
  it('refuses to write something absurdly large', () => {
    const huge = draft({ fields: { ...draft().fields, notes: 'x'.repeat(MAX_DRAFT_BYTES + 1) } });
    expect(encodeDraft(huge)).toBeNull();
  });

  it('writes a normal draft', () => {
    expect(typeof encodeDraft(draft())).toBe('string');
  });
});
