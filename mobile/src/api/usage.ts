import { supabase } from './supabase';

// Current UTC month key (yyyy-MM), matching the analyze-contract edge
// function's period so the client reads the same counter the server writes.
export function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type AnalysisCounts = { lifetime: number; month: number };

// How many contract analyses this user has spent: lifetime (the free-tier
// gate) and this month (the premium gate). RLS scopes rows to the caller.
// Fails open (0) on any error so a read hiccup never blocks an analysis.
export async function getAnalysisCounts(): Promise<AnalysisCounts> {
  const { data, error } = await supabase.from('analysis_usage').select('period, count');
  if (error) return { lifetime: 0, month: 0 };
  const rows = (data ?? []) as { period: string; count: number }[];
  const lifetime = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
  const month = rows.find((r) => r.period === currentPeriod())?.count ?? 0;
  return { lifetime, month };
}
