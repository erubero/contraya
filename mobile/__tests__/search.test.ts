import { queryTokens, searchContracts } from '@/data/search';
import { Contract } from '@/data/types';

function c(partial: Partial<Contract>): Contract {
  return {
    id: 'x', title: 'C', contract_type: 'other',
    party_you: null, party_other: null, summary: null, payment_terms: null,
    total_value: null, party_other_contact: null,
    effective_date: null, end_date: null, status: 'active', notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('queryTokens', () => {
  it('splits on whitespace and lowercases', () => {
    expect(queryTokens('  Foo   BAR ')).toEqual(['foo', 'bar']);
  });

  it('returns [] for empty or whitespace-only input', () => {
    expect(queryTokens('')).toEqual([]);
    expect(queryTokens('   ')).toEqual([]);
  });
});

describe('searchContracts', () => {
  it('returns the input array unchanged for an empty query', () => {
    const list = [c({ title: 'Lease' })];
    expect(searchContracts(list, '')).toBe(list);
    expect(searchContracts(list, '   ')).toBe(list);
  });

  it('matches each searchable field', () => {
    expect(searchContracts([c({ title: 'Apartment lease' })], 'apartment')).toHaveLength(1);
    expect(searchContracts([c({ party_other: 'Palm Grove LLC' })], 'palm')).toHaveLength(1);
    expect(searchContracts([c({ party_you: 'You (tenant)' })], 'tenant')).toHaveLength(1);
    expect(searchContracts([c({ notes: 'signed at the office' })], 'office')).toHaveLength(1);
    expect(searchContracts([c({ summary: 'renews by itself' })], 'renews')).toHaveLength(1);
  });

  it('matches the type by its display label', () => {
    expect(searchContracts([c({ contract_type: 'wedding_event' })], 'wedding')).toHaveLength(1);
    expect(searchContracts([c({ contract_type: 'phone_internet' })], 'internet')).toHaveLength(1);
  });

  it('ANDs tokens across fields', () => {
    const venue = c({ title: 'Venue', contract_type: 'wedding_event' });
    const lease = c({ title: 'Venue lease', contract_type: 'lease' });
    expect(searchContracts([venue, lease], 'venue wedding')).toEqual([venue]);
  });

  it('is case-insensitive', () => {
    expect(searchContracts([c({ title: 'GYM Membership' })], 'gym')).toHaveLength(1);
  });
});
