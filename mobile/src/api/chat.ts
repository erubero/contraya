import { supabase } from './supabase';
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
  if (error) throw error;
  const answer = (data as { answer?: unknown })?.answer;
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('Empty answer');
  return answer.trim();
}
