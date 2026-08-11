// Ask Contry: pure chat helpers shared by the screen, the API call, and the
// tests. The server re-validates everything; these caps just keep requests
// small and the UI honest.

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export const MAX_QUESTION_CHARS = 1000;
export const MAX_HISTORY_TURNS = 10;
export const MAX_TURN_CHARS = 2000;
// Mirrors the chat_messages_content_len DB constraint. Writes slice to this
// so a pathological answer can never make the persist insert throw.
export const MAX_STORED_CHARS = 20000;

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

// A persisted message row (chat_messages). seq is the sort key: an exchange
// inserts both rows in one statement so their created_at ties, and identity
// order is insert order.
export type ChatMessage = {
  id: string;
  contract_id: string;
  user_id?: string;
  seq: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

// Stored rows -> the screen's transcript shape. Defensive about order and
// content because stored data is still input: rows are re-sorted by seq (the
// API asks for that order, but this must not depend on it) and blank rows are
// dropped rather than rendered as empty bubbles.
export function turnsFromRows(rows: ChatMessage[]): ChatTurn[] {
  return [...rows]
    .sort((a, b) => a.seq - b.seq)
    .filter((r) => (r.role === 'user' || r.role === 'assistant') && r.content.trim().length > 0)
    .map((r) => ({ role: r.role, content: r.content }));
}
