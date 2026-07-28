import { supabase } from './supabase';

// Real account deletion via the service-role edge function.
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
}
