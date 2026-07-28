import { Contract, CONTRACT_TYPE_LABELS } from './types';

// Client-side contract search. Lives here (not in the list screen) so it can
// be unit-tested and shared by whichever surface owns the query — today the
// island search bar. Contract counts are capped server-side, so filtering the
// already-fetched list is deliberate; no server query needed.

// Split a raw query into lowercase tokens. Whitespace-only input yields [].
export function queryTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

// The text a contract exposes to search. Type matches by its DISPLAY label
// ("Lease"), since that is the word users see and type.
function searchableFields(c: Contract): string[] {
  return [
    c.title,
    c.party_you ?? '',
    c.party_other ?? '',
    c.notes ?? '',
    c.summary ?? '',
    CONTRACT_TYPE_LABELS[c.contract_type],
  ].map((f) => f.toLowerCase());
}

// Every token must substring-match at least one field (AND across tokens,
// OR across fields) — "venue wedding" finds the wedding venue contract.
export function matchesContract(c: Contract, tokens: string[]): boolean {
  const fields = searchableFields(c);
  return tokens.every((t) => fields.some((f) => f.includes(t)));
}

export function searchContracts(contracts: Contract[], query: string): Contract[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return contracts;
  return contracts.filter((c) => matchesContract(c, tokens));
}
