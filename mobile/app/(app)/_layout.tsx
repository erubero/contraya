import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePurchases } from '@/lib/PurchasesContext';
import { refreshDeviceSchedules } from '@/lib/deviceSync';
import { syncPushToken } from '@/lib/pushToken';
import { contractIdFromResponse } from '@/lib/reminderPlanner';
import { useTheme } from '@/theme/colors';

// A tap can reach us twice (cold-start read + live listener); route it once.
let lastHandledTap: string | null = null;

function routeNotificationTap(
  response: Notifications.NotificationResponse,
  push: (path: `/contract/${string}`) => void
) {
  const key = `${response.notification.date}.${response.notification.request.identifier}`;
  if (key === lastHandledTap) return;
  const id = contractIdFromResponse({
    identifier: response.notification.request.identifier,
    data: response.notification.request.content.data,
  });
  if (!id) return;
  lastHandledTap = key;
  push(`/contract/${id}`);
}

export default function AppLayout() {
  const { status, userId } = useAuth();
  const { isPro, offeringReady, ready } = usePurchases();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Rebuild reminders on every foreground so edits and clock drift self-heal,
  // and reconcile the Apple Calendar mirror alongside them. The calendar leg
  // costs nothing when nothing changed: it hashes the plan and returns before
  // touching EventKit, which matters because this fires on every trip back
  // from Settings, the share sheet or Face ID.
  useEffect(() => {
    if (status !== 'signedIn') return;
    const sweep = () => {
      refreshDeviceSchedules(userId, { isPro, offeringReady, ready }).catch(() => {});
      syncPushToken();
    };
    sweep();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sweep();
    });
    return () => sub.remove();
  }, [status, userId, isPro, offeringReady, ready]);

  // Tapping a reminder opens that contract. The listener covers taps while
  // the app is alive; the cold-start read covers taps that LAUNCHED the app
  // (the listener mounts too late for those). Both go through the same
  // dedupe so a tap never routes twice.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeNotificationTap(response, (path) => router.push(path));
    });
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) routeNotificationTap(response, (path) => router.push(path));
      })
      .catch(() => {});
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['contract-dates'] });
  }, [status, queryClient]);

  if (status === 'signedOut') return <Redirect href="/signin" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.foreground,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add" options={{ title: 'Add Contract', presentation: 'modal' }} />
      <Stack.Screen name="contract/[id]" options={{ title: 'Contract' }} />
      <Stack.Screen name="chat/[id]" options={{ title: 'Ask Contry' }} />
    </Stack>
  );
}
