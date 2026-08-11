import { supabase } from './supabase';
import { toEdgeError } from './functionError';
import { ChatMessage, ChatTurn, boundHistory, MAX_STORED_CHARS } from '@/data/chat';

// How much history one screen-load pulls. The model only ever sees the last
// MAX_HISTORY_TURNS anyway; this bounds what scrolls.
const MAX_LOADED_MESSAGES = 200;

// One question about one contract. The edge function proves ownership via
// RLS, meters the call, and answers from the stored analysis + the document.
export async function askContract(
  contractId: string,
  question: string,
  history: ChatTurn[]
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('chat-contract', {
    body: { contract_id: contractId, question, history: boundHistory(history) },
  });
  // Keeps the status so the screen can tell a monthly-limit refusal apart from
  // a transient one. See src/api/functionError.ts.
  if (error) throw await toEdgeError(error);
  const answer = (data as { answer?: unknown })?.answer;
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('Empty answer');
  return answer.trim();
}

// The newest MAX_LOADED_MESSAGES of a contract's conversation, oldest first.
// Newest-first in SQL so the limit keeps the RECENT end, then reversed so the
// screen renders top-down.
export async function listChatMessages(contractId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('contract_id', contractId)
    .order('seq', { ascending: false })
    .limit(MAX_LOADED_MESSAGES);
  if (error) throw error;
  return ((data ?? []) as ChatMessage[]).reverse();
}

// One completed exchange, both rows in one insert so seq orders them user
// then assistant. Called only after the answer arrived: a failed question is
// rolled back on screen and never stored, matching the quota refund.
export async function saveChatExchange(
  contractId: string,
  question: string,
  answer: string
): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert([
    { contract_id: contractId, role: 'user', content: question.slice(0, MAX_STORED_CHARS) },
    { contract_id: contractId, role: 'assistant', content: answer.slice(0, MAX_STORED_CHARS) },
  ]);
  if (error) throw error;
}

// Clear conversation: the delete grant exists for exactly this.
export async function clearChatMessages(contractId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('contract_id', contractId);
  if (error) throw error;
}
