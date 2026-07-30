// An unfinished contract, serializable. Pure: no AsyncStorage, no Expo, no
// React, so it unit-tests without mocks (same split as data/tasks.ts).
//
// Why this exists: the add flow uploads a document, runs a PAID analysis, then
// holds the whole result in React state on the review screen. `add` is a modal
// with drag-to-dismiss and nothing intercepts it. Losing that state does not
// just lose the user's work, it burns an analysis: the quota is consumed before
// the model call, the refund path is disarmed the moment the model returns, and
// nothing deduplicates by document. A free user with two lifetime analyses can
// spend both on one contract they never managed to save.
import {
  ContractAnalysis,
  AnalyzedDate,
  MAX_DATES,
  parseAnalysis,
  decodeDateRow,
} from './analysis';
import { ContractType, CONTRACT_TYPES } from './types';

export const DRAFT_VERSION = 1;
// A draft protects a paid reading of a document at a point in time, not the
// document. A week covers "tonight" and "this weekend"; past that, resurfacing a
// stale summary of a file the user may have replaced is worse than redoing it.
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60_000;
export const DRAFT_DEBOUNCE_MS = 700;
// Backstop only. A realistic worst case is ~90 KB; this fires only if someone
// later adds a field to the shape that does not belong in it.
export const MAX_DRAFT_BYTES = 256 * 1024;

export type DraftStep = 'review' | 'manual';

export type DraftFields = {
  title: string;
  type: ContractType;
  partyOther: string;
  effectiveDate: string;
  endDate: string;
  notes: string;
  dates: AnalyzedDate[];
};

export type ContractDraft = {
  v: number;
  userId: string;
  savedAt: string;
  step: DraftStep;
  analysis: ContractAnalysis | null;
  sourceKind: 'pdf' | 'images' | null;
  sourceName: string | null;
  sourcePaths: string[];
  // ID ONLY. Never the InboxItem row: see decodeDraft.
  inboxItemId: string | null;
  fields: DraftFields;
};

const STEPS: readonly DraftStep[] = ['review', 'manual'];

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

export function isDraftExpired(
  savedAt: string,
  now: Date = new Date(),
  ttlMs: number = DRAFT_TTL_MS
): boolean {
  const t = Date.parse(savedAt);
  // An unreadable timestamp is treated as expired, never as fresh. Failing the
  // other way would make a corrupt draft immortal.
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > ttlMs;
}

/**
 * Is there anything here worth offering back?
 *
 * Returns true whenever an analysis exists, regardless of the edit fields. A
 * user who clears the title on a restored draft must not thereby destroy the
 * paid analysis behind it. False for an untouched manual form, so abandoning a
 * blank one never plants a phantom row on the Tasks screen.
 */
export function isDraftWorthKeeping(d: ContractDraft): boolean {
  if (d.analysis) return true;
  const f = d.fields;
  return Boolean(
    f.title.trim() ||
      f.partyOther.trim() ||
      f.notes.trim() ||
      f.effectiveDate.trim() ||
      f.endDate.trim() ||
      f.dates.some((x) => x.label.trim() || x.date.trim())
  );
}

export function encodeDraft(d: ContractDraft): string | null {
  try {
    const json = JSON.stringify(d);
    return json.length > MAX_DRAFT_BYTES ? null : json;
  } catch {
    return null;
  }
}

/**
 * Untrusted input from disk. Everything routes through the same hardened
 * decoders the model output uses, so control-character stripping, the year
 * window, enum coercion and length caps all apply here too rather than being
 * reimplemented and drifting.
 */
export function decodeDraft(
  raw: string | null,
  userId: string,
  now: Date = new Date()
): ContractDraft | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;

  // Version first, before touching anything else. There is deliberately no
  // migration ladder at v1: a lost draft is an inconvenience, a crash from a
  // hand-written migration is a bug. Add `case 2` when a v2 ships.
  if (o.v !== DRAFT_VERSION) return null;

  // Belt and braces with the namespaced storage key. A key collision or a
  // botched future migration must never hand one account another's contract.
  if (typeof o.userId !== 'string' || o.userId !== userId) return null;

  if (typeof o.savedAt !== 'string' || isDraftExpired(o.savedAt, now)) return null;

  const step = STEPS.find((s) => s === o.step);
  // A manual draft restored as 'review' would silently drop the user's typed end
  // date, because only the manual branch renders that field and converts it to a
  // tracked row. So an unrecognised step is fatal, not defaulted.
  if (!step) return null;

  const rawFields =
    typeof o.fields === 'object' && o.fields !== null
      ? (o.fields as Record<string, unknown>)
      : {};

  const dates = Array.isArray(rawFields.dates)
    ? rawFields.dates
        .slice(0, MAX_DATES)
        .map((v) => decodeDateRow(v, { allowPartial: true }))
        .filter((d): d is AnalyzedDate => d !== null)
    : [];

  // Inbox pairing is ATOMIC: an id without paths, or paths without an id where
  // one was claimed, drops the whole attachment rather than half of it. A
  // partial reset is exactly what let a later save consume an inbox row whose
  // file was never attached, which destroyed users' only copy of an emailed PDF
  // (STATUS.md item 1). The runtime restore re-checks this against the server;
  // this is the codec-level half of the same rule.
  const paths = Array.isArray(o.sourcePaths)
    ? o.sourcePaths.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : [];
  const claimedInbox = typeof o.inboxItemId === 'string' && o.inboxItemId.length > 0;
  const pairingIntact = !claimedInbox || paths.length > 0;

  const sourceKind =
    o.sourceKind === 'pdf' || o.sourceKind === 'images' ? o.sourceKind : null;

  return {
    v: DRAFT_VERSION,
    userId,
    savedAt: o.savedAt,
    step,
    analysis: o.analysis == null ? null : parseAnalysis(o.analysis),
    sourceKind: pairingIntact ? sourceKind : null,
    sourceName: typeof o.sourceName === 'string' ? o.sourceName.slice(0, 200) : null,
    sourcePaths: pairingIntact ? paths : [],
    inboxItemId: pairingIntact && claimedInbox ? (o.inboxItemId as string) : null,
    fields: {
      title: str(rawFields.title, 200),
      type: (CONTRACT_TYPES as readonly string[]).includes(rawFields.type as string)
        ? (rawFields.type as ContractType)
        : 'other',
      partyOther: str(rawFields.partyOther, 200),
      effectiveDate: str(rawFields.effectiveDate, 10),
      endDate: str(rawFields.endDate, 10),
      notes: str(rawFields.notes, 2000),
      dates,
    },
  };
}
