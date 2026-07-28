import { supabase } from './supabase';

// Registers (or reassigns) this device's Expo push token to the signed-in user
// through the security-definer RPC, so the daily reminder cron can reach them.
// The RPC drops any stale mapping of the same token to a different account, so a
// shared device never delivers one user's reminders to another.
export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: platform,
  });
  if (error) throw error;
}
