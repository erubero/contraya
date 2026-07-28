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
