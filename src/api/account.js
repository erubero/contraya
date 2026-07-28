import { supabase } from '@/api/supabaseClient';

// Permanently deletes the signed-in user: auth record, warranties,
// push subscriptions, and stored receipts (handled server side).
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
}
