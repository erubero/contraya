// Ask Contry: pure chat helpers shared by the screen, the API call, and the
// tests. The server re-validates everything; these caps just keep requests
// small and the UI honest.

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export const MAX_QUESTION_CHARS = 1000;
export const MAX_HISTORY_TURNS = 10;
export const MAX_TURN_CHARS = 2000;

// What the empty state offers. Every question is answerable by describing the
// contract; none of them asks for advice.
export const SUGGESTED_QUESTIONS = [
  'When does this renew?',
  'What is the cancellation window?',
  'What happens if a payment is late?',
  'What did I agree to do?',
] as const;

// Bound the history we replay to the server: last N turns, trimmed and
// length-capped, and never starting with an assistant half-pair (the server
// folds the first turn into the document-carrying message, so it must be a
// user turn).
export function boundHistory(history: ChatTurn[]): ChatTurn[] {
  const cleaned = history
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && t.content.trim().length > 0)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_TURN_CHARS) }));
  const bounded = cleaned.slice(-MAX_HISTORY_TURNS);
  while (bounded.length > 0 && bounded[0].role !== 'user') bounded.shift();
  return bounded;
}
