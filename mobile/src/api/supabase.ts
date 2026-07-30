import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// No backend configured yet -> the app runs in demo mode with seeded data.
export const isConfigured = Boolean(url && anonKey);

// Session lives in AsyncStorage; no URL-based session detection on native.
// The key is pinned so clearStoredSession below can remove it directly.
const AUTH_STORAGE_KEY = 'contraya.auth.session';

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      storageKey: AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Force-remove the persisted session. signOut() returns an error BEFORE
// removing the stored session when the access token is expired and the
// refresh fails (offline), which would silently sign the user back in on the
// next online launch. Callers use this whenever signOut() errors.
export async function clearStoredSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Nothing else to do; the next signOut attempt will try again.
  }
}

// Supabase's recommended RN pattern: only refresh tokens while foregrounded.
if (isConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
