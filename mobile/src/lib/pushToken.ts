import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { isConfigured } from '@/api/supabase';
import { registerPushToken } from '@/api/pushTokens';

// Best-effort: fetch this device's NATIVE push token (APNs on iOS) and store
// it for the signed-in user so the server-side reminder cron can reach them
// straight through Apple. No Expo service sits in the chain: the cron signs
// its own APNs JWTs, so no expo.dev project or id exists anywhere. Silently
// no-ops in demo mode, on simulators, or when notification permission is not
// granted. Never throws into the caller, so it can sit next to the
// local-reminder sweep without affecting it.
export async function syncPushToken(): Promise<void> {
  try {
    if (!isConfigured || !Device.isDevice) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token !== 'string') return;

    await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
  } catch {
    // Best-effort; on-device local reminders still fire regardless.
  }
}
