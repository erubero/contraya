import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isConfigured } from '@/api/supabase';
import { planAll, PlannableDate } from './reminderPlanner';

const CHANNEL_ID = 'contract-reminders';
const ENABLED_KEY = 'contraya.remindersEnabled';
// iOS allows at most 64 pending notifications; keep headroom.
const MAX_PENDING = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Contract reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Asked lazily on first successful save, never at launch.
export async function requestPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function remindersEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ENABLED_KEY);
  return v !== 'false';
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  // Mirror the choice to the server so the push reminder cron respects it too.
  // Local-only would leave the server sending to users who opted out.
  if (isConfigured) {
    try {
      await supabase.auth.updateUser({ data: { reminders_enabled: enabled } });
    } catch {
      // The local setting still applies; the cron defaults to enabled if unset.
    }
  }
}

async function clearAll(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.identifier ?? '').startsWith('contract.'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// Wipe and reschedule all contract reminders from scratch. Runs after saves,
// deletes, and on app foreground so edits and clock drift self-heal.
export async function rebuildAll(items: PlannableDate[]): Promise<void> {
  await clearAll();
  if (!(await remindersEnabled())) return;
  const granted = await requestPermissionSilently();
  if (!granted) return;
  await ensureAndroidChannel();

  for (const r of planAll(items).slice(0, MAX_PENDING)) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { contractId: r.contractId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.fireDate,
        channelId: CHANNEL_ID,
      },
    });
  }
}

// Reschedule without prompting (used by the foreground sweep).
async function requestPermissionSilently(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function disableAndClear(): Promise<void> {
  await setRemindersEnabled(false);
  await clearAll();
}
