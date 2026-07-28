import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { isConfigured } from '@/api/supabase';
import { registerPushToken } from '@/api/pushTokens';

// Best-effort: fetch this device's Expo push token and store it for the signed-in
// user so the server-side reminder cron can reach them. Silently no-ops in demo
// mode, on simulators, when notification permission is not granted, or before the
// push-enabled build carries the APNs entitlement. Never throws into the caller,
// so it can sit next to the local-reminder sweep without affecting it.
export async function syncPushToken(): Promise<void> {
  try {
    if (!isConfigured || !Device.isDevice) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
  } catch {
    // Best-effort; on-device local reminders still fire regardless.
  }
}
