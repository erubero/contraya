import { supabase } from './supabase';
import { toEdgeError } from './functionError';
import { ChatTurn, boundHistory } from '@/data/chat';

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
