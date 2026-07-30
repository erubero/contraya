import { filterByRisk, FlagRef } from '@/data/filters';
import { searchContracts } from '@/data/search';
import { Contract } from '@/data/types';

const contract = (id: string, title: string, contract_type: Contract['contract_type']): Contract => ({
  id,
  user_id: 'u1',
  title,
  contract_type,
  status: 'active',
  party_you: null,
  party_other: null,
  party_other_contact: null,
  effective_date: null,
  end_date: null,
  total_value: null,
  payment_terms: null,
  summary: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
});

// Distinct types on purpose: searchContracts also matches the contract-type
// label, so giving them all 'lease' would make a search for "lease" match
// everything and quietly weaken the composition test below.
const lease = contract('c1', 'Apartment lease', 'lease');
const gym = contract('c2', 'Gym membership', 'subscription');
const clean = contract('c3', 'Cleaning service', 'vendor');

const flags: FlagRef[] = [
  { contract_id: 'c1', severity: 'high' },
  { contract_id: 'c1', severity: 'low' },
  { contract_id: 'c2', severity: 'medium' },
];

describe('filterByRisk', () => {
  it('returns everything when no risk filter is set', () => {
    expect(filterByRisk([lease, gym, clean], flags, 'any')).toHaveLength(3);
  });

  it('matches a contract with at least one flag at that level', () => {
    expect(filterByRisk([lease, gym, clean], flags, 'high').map((c) => c.id)).toEqual(['c1']);
    expect(filterByRisk([lease, gym, clean], flags, 'medium').map((c) => c.id)).toEqual(['c2']);
  });

  it('matches on ANY flag, not only the worst one', () => {
    // c1 carries both a high and a low. It must answer to both, because the
    // question is "what has a problem at this level", not "what is worst here".
    expect(filterByRisk([lease, gym, clean], flags, 'low').map((c) => c.id)).toEqual(['c1']);
  });

  it('excludes contracts with no flags at all', () => {
    for (const level of ['high', 'medium', 'low'] as const) {
      expect(filterByRisk([clean], flags, level)).toEqual([]);
    }
    expect(filterByRisk([clean], flags, 'any')).toEqual([clean]);
  });

  it('preserves the incoming order', () => {
    const many: FlagRef[] = [
      { contract_id: 'c3', severity: 'high' },
      { contract_id: 'c1', severity: 'high' },
    ];
    expect(filterByRisk([lease, gym, clean], many, 'high').map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('handles an empty flag list without throwing', () => {
    expect(filterByRisk([lease], [], 'high')).toEqual([]);
    expect(filterByRisk([lease], [], 'any')).toEqual([lease]);
  });

  it('composes with search rather than replacing it', () => {
    // The list screen chains searchContracts -> status -> risk. Pinning the
    // composition here catches a future refactor that drops one of the three.
    const searched = searchContracts([lease, gym, clean], 'lease');
    expect(filterByRisk(searched, flags, 'high').map((c) => c.id)).toEqual(['c1']);
    expect(filterByRisk(searched, flags, 'medium')).toEqual([]);
  });
});
