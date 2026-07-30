// Bolds the first sentence of a block of text (used for the lead-in on an
// Ask Contry answer) without parsing the rest as markdown. A cheap
// approximation of a "structured answer" without touching model output.
// A short answer with no sentence-ending punctuation is bolded whole; a long
// one is left unbolded rather than forcing the entire paragraph bold.
export function splitLeadIn(text: string): { lead: string; rest: string } {
  const window = text.slice(0, 160);
  const m = window.match(/^.*?[.!?](?=\s|$)/);
  if (m) return { lead: m[0], rest: text.slice(m[0].length).trim() };
  if (text.length <= 160) return { lead: text, rest: '' };
  return { lead: '', rest: text };
}

// Renders a set of reminder windows (days before a date) as a sentence, for
// the Notifications screen's "when Contry reminds you" schedule. The screen
// feeds this straight from DEFAULT_WINDOWS so what a user reads there is
// always what the planner actually does.
export function describeWindows(days: number[]): string {
  const sorted = [...days].sort((a, b) => b - a);
  const parts = sorted.map((d) => (d === 1 ? '1 day' : `${d} days`));
  if (parts.length === 0) return 'No reminders';
  if (parts.length === 1) return `${parts[0]} before`;
  const last = parts.pop() as string;
  return `${parts.join(', ')} and ${last} before`;
}
