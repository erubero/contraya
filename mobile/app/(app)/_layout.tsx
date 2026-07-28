import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { listAllDates } from '@/data/repo';
import { rebuildAll } from '@/lib/notifications';
import { syncPushToken } from '@/lib/pushToken';
import { contractIdFromNotificationId } from '@/lib/reminderPlanner';
import { useTheme } from '@/theme/colors';

export default function AppLayout() {
  const { status } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useTheme();

  // Rebuild reminders on every foreground so edits and clock drift self-heal.
  useEffect(() => {
    if (status !== 'signedIn') return;
    const sweep = () => {
      listAllDates()
        .then((dates) =>
          rebuildAll(dates.map((d) => ({ date: d, contractTitle: d.contracts.title })))
        )
        .catch(() => {});
      syncPushToken();
    };
    sweep();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') sweep();
    });
    return () => sub.remove();
  }, [status]);

  // Tapping a reminder opens that contract.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = contractIdFromNotificationId(response.notification.request.identifier);
      if (id) router.push(`/contract/${id}`);
    });
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
    </Stack>
  );
}
