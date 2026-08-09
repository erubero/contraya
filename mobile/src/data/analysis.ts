import {
  ContractType, CONTRACT_TYPES,
  DateType, DATE_TYPES,
  Recurrence, RECURRENCES,
  Severity, SEVERITIES,
} from './types';

// What the analyze-contract edge function returns, after tolerant decoding.
// The model's structured output should already conform, but this decoder is
// the trust boundary: every enum is checked, every string coerced, every
// array bounded, and anything malformed is dropped rather than thrown.

// How the server's verification pass judged an extracted date. 'unchecked'
// means the pass did not run (or a user typed the date themselves) — the
// review screen treats it as neutral, and flags the other non-confirmed kinds.
export type DateVerification = 'confirmed' | 'corrected' | 'not_found' | 'unchecked';
export const DATE_VERIFICATIONS: readonly DateVerification[] = ['confirmed', 'corrected', 'not_found', 'unchecked'];

export type AnalyzedDate = {
  label: string;
  date: string; // yyyy-MM-dd
  date_type: DateType;
  recurrence: Recurrence;
  note: string | null;
  verified: DateVerification;
};

/**
 * Dates the verification pass could not stand behind, which the human has not
 * looked at yet. The review screen blocks Save while this is non-empty.
 *
 * This is the whole reason the second model call is worth paying for. Without
 * it the pass runs, the screen shows a marker, and the verdict is dropped at
 * save: a date Contry could not re-find in the document becomes a 9:00 push
 * notification indistinguishable from one it confirmed twice. The review
 * screen is named as THE mitigation for date accuracy, the product's top
 * risk, and a mitigation nobody has to act on is not a mitigation.
 *
 * 'unchecked' is deliberately not blocking. It means the pass did not run (it
 * is best-effort against a time budget) or the user typed the date, and both
 * of those are neutral. Editing a flagged row resets it to 'unchecked'
 * because the human just did the check the marker asked for; the review
 * screen offers the same reset without an edit, since a flagged date is often
 * simply correct.
 */
export function unresolvedDates(dates: { verified: DateVerification }[]): number[] {
  return dates.reduce<number[]>((out, d, i) => {
    if (d.verified === 'not_found' || d.verified === 'corrected') out.push(i);
    return out;
  }, []);
}

export type AnalyzedObligation = {
  who: string;
  description: string;
  due_note: string | null;
};

export type AnalyzedRiskFlag = {
  severity: Severity;
  title: string;
  quote: string | null;
  why_it_matters: string;
};

export type ContractAnalysis = {
  title: string | null;
  contract_type: ContractType;
  party_you: string | null;
  party_other: string | null;
  summary: string | null;
  payment_terms: string | null;
  total_value: number | null;
  party_other_contact: string | null;
  key_dates: AnalyzedDate[];
  obligations: AnalyzedObligation[];
  risk_flags: AnalyzedRiskFlag[];
};

// Caps mirror what the detail screen can sensibly render; the DB CHECKs are
// the hard stop. Anything beyond is silently dropped.
export const MAX_DATES = 20;
export const MAX_OBLIGATIONS = 30;
export const MAX_RISK_FLAGS = 20;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Model output is displayed text. Strip control chars and bidi/zero-width
// overrides so a crafted document can't smuggle a U+202E into a quoted clause
// and visually reorder what the user reads.
const CONTROL_CHARS = /[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.replace(CONTROL_CHARS, '').trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function money(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1_000_000_000) return null;
  return Math.round(v * 100) / 100;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function isoDate(v: unknown): string | null {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return null;
  const parsed = new Date(`${v}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Plausibility window: contracts reference dates a few years back through
  // decades out. This blocks a crafted year 0001/9999 from scheduling an
  // absurd reminder even if it is a syntactically valid date.
  const year = Number(v.slice(0, 4));
  return year >= 2000 && year <= 2100 ? v : null;
}

/**
 * Decodes one date row from untrusted input.
 *
 * `allowPartial` exists for restoring a saved draft: the review screen
 * legitimately holds half-typed rows (a label with no date yet, or the blank row
 * the "Add a date" button inserts), and dropping those on restore would delete
 * the user's in-progress work. Model output never uses it, so a partial row can
 * never come from an analysis. Every other guard is identical either way.
 */
export function decodeDateRow(v: unknown, opts?: { allowPartial?: boolean }): AnalyzedDate | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const label = str(o.label, 200);
  const date = isoDate(o.date);
  const date_type = oneOf<DateType>(o.date_type, DATE_TYPES) ?? 'custom';
  if (!opts?.allowPartial && (!label || !date)) return null;
  return {
    label: label ?? '',
    date: date ?? '',
    date_type,
    recurrence: oneOf<Recurrence>(o.recurrence, RECURRENCES) ?? 'none',
    note: str(o.note, 200),
    verified: oneOf<DateVerification>(o.verified, DATE_VERIFICATIONS) ?? 'unchecked',
  };
}

function decodeObligation(v: unknown): AnalyzedObligation | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const description = str(o.description, 1000);
  if (!description) return null;
  return {
    who: str(o.who, 200) ?? 'You',
    description,
    due_note: str(o.due_note, 200),
  };
}

function decodeRiskFlag(v: unknown): AnalyzedRiskFlag | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const title = str(o.title, 200);
  const why = str(o.why_it_matters, 1000);
  if (!title || !why) return null;
  return {
    severity: oneOf<Severity>(o.severity, SEVERITIES) ?? 'low',
    title,
    quote: str(o.quote, 1000),
    why_it_matters: why,
  };
}

function decodeArray<T>(v: unknown, decode: (item: unknown) => T | null, max: number): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const d = decode(item);
    if (d) out.push(d);
    if (out.length >= max) break;
  }
  return out;
}

// Never throws on shape problems: a malformed field degrades to null/[] and
// the review screen lets the user fill the gap.
export function parseAnalysis(raw: unknown): ContractAnalysis {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    title: str(o.title, 200),
    contract_type: oneOf<ContractType>(o.contract_type, CONTRACT_TYPES) ?? 'other',
    party_you: str(o.party_you, 200),
    party_other: str(o.party_other, 200),
    summary: str(o.summary, 8000),
    payment_terms: str(o.payment_terms, 2000),
    total_value: money(o.total_value),
    party_other_contact: str(o.party_other_contact, 300),
    key_dates: decodeArray(o.key_dates, (v) => decodeDateRow(v), MAX_DATES),
    obligations: decodeArray(o.obligations, decodeObligation, MAX_OBLIGATIONS),
    risk_flags: decodeArray(o.risk_flags, decodeRiskFlag, MAX_RISK_FLAGS),
  };
}
