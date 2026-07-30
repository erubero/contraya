// Risk filtering for the contracts list. Pure and structural, like search.ts
// beside it, so it can be unit-tested without pulling in Supabase. Contract
// counts are capped server side, so filtering an already-fetched list is
// deliberate: no extra query per filter change.
import { Contract, Severity } from './types';

// 'any' means no risk filter at all, not "has at least one flag".
export type RiskFilter = 'any' | Severity;

// Structural, so this file does not import from @/api/contracts.
export type FlagRef = { contract_id: string; severity: Severity };

/**
 * Contracts carrying AT LEAST ONE flag at the given level.
 *
 * Not "contracts whose worst flag is exactly this level": the question being
 * asked is "what has critical problems", and a contract with one Critical and
 * four Minor flags is very much an answer to it.
 */
export function filterByRisk<T extends Contract>(
  contracts: T[],
  flags: FlagRef[],
  filter: RiskFilter
): T[] {
  if (filter === 'any') return contracts;
  const matching = new Set(
    flags.filter((f) => f.severity === filter).map((f) => f.contract_id)
  );
  return contracts.filter((c) => matching.has(c.id));
}
