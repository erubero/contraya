import { daysUntil } from './status';

// The one line on the dashboard that is supposed to notice something for the
// user. It used to notice nothing: it reflected three onboarding questionnaire
// answers back and read no contract data at all, so it said the same sentence
// to someone with forty contracts and someone with none.
//
// Two rules this file exists to hold:
//
// 1. It DESCRIBES. Every sentence states something the user's own dates say,
//    in the same voice as the rest of the app. Never what to do about it.
// 2. It does no arithmetic over money, ever. `total_value` is null whenever a
//    document states no total (the extraction prompt forbids computing one),
//    so any sum silently reports "the contracts that happened to mention a
//    figure". There is also no currency column, so a euro lease already
//    renders with a dollar sign, and lease totals, insurance coverage limits
//    and vendor prices are not the same quantity anyway. A portfolio total
//    would be a number appearing in no document, which is precisely the thing
//    the model is instructed never to invent.

export type Insight = { headline: string; body: string };

/** What the dashboard already computes, narrowed to what this needs. */
export type InsightOccurrence = {
  date: string; // yyyy-MM-dd
  label: string;
  contractTitle: string;
};

// Only speak up about something genuinely close. Further out, the Coming up
// list below says it better than a sentence can, and a card that restates the
// row underneath it is noise.
const SOON_DAYS = 14;

function describeWhen(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function describeAgo(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/**
 * A line about the user's own dates, or null when there is nothing worth
 * saying. Null is the signal to fall back to the onboarding reflection, which
 * is all a brand new account has.
 *
 * Overdue wins over upcoming: the dashboard tile shows a COUNT of past due
 * items and nothing anywhere names which one, so this is the only place that
 * says what it actually was.
 */
export function contractInsight(input: {
  overdue: InsightOccurrence[];
  comingUp: InsightOccurrence[];
}, now: Date = new Date()): Insight | null {
  const { overdue, comingUp } = input;

  if (overdue.length > 0) {
    const [first] = [...overdue].sort((a, b) => b.date.localeCompare(a.date));
    const days = Math.abs(daysUntil(first.date, now));
    return {
      headline: overdue.length === 1 ? 'One date has gone by' : `${overdue.length} dates have gone by`,
      body: `${first.label} for ${first.contractTitle} was due ${describeAgo(days)}.`,
    };
  }

  const next = [...comingUp]
    .filter((o) => daysUntil(o.date, now) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!next) return null;

  const days = daysUntil(next.date, now);
  if (days > SOON_DAYS) return null;

  return {
    headline: 'Coming up',
    body: `${next.label} for ${next.contractTitle} is due ${describeWhen(days)}.`,
  };
}
