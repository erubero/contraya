import { supabase } from './supabase';
import { InboxItem, ingestAddress, isIngestToken } from '@/data/inbox';

// The user's email-in address, minted server-side on first ask.
export async function getIngestAddress(): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_email_token');
  if (error) throw error;
  if (typeof data !== 'string' || !isIngestToken(data)) throw new Error('Bad token');
  return ingestAddress(data);
}

export async function listInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .order('received_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InboxItem[];
}

export async function getInboxItem(id: string): Promise<InboxItem> {
  const { data, error } = await supabase.from('inbox_items').select('*').eq('id', id).single();
  if (error) throw error;
  return data as InboxItem;
}

// Importing keeps the object (it becomes the contract's document); dismissing
// deletes it.
export async function removeInboxItem(item: InboxItem, deleteObject: boolean): Promise<void> {
  const { error } = await supabase.from('inbox_items').delete().eq('id', item.id);
  if (error) throw error;
  if (deleteObject) {
    await supabase.storage.from('documents').remove([item.storage_path]).catch(() => {});
  }
}
