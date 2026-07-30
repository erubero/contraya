import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAllDates, listInbox, removeInboxItem } from '@/data/repo';
import { InboxItem, inboxItemTitle } from '@/data/inbox';
import { overdueTasks, Task } from '@/data/tasks';
import { useTheme, RADIUS } from '@/theme/colors';
import StatusBadge from '@/components/StatusBadge';

// Everything waiting on the user, in one place. Two sources: dates that have
// already gone by, and documents that arrived by email and were never turned
// into contracts. Both are derived, so there is nothing to mark read: an item
// leaves this screen when the underlying thing is dealt with.
//
// Same query keys as the dashboard, so opening this screen reads from cache
// rather than refetching.
export default function Tasks() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: allDates = [] } = useQuery({
    queryKey: ['contract-dates'],
    queryFn: listAllDates,
  });
  const { data: inbox = [] } = useQuery({
    queryKey: ['inbox'],
    queryFn: listInbox,
  });

  const overdue = useMemo(() => overdueTasks(allDates), [allDates]);

  const dismissInbox = useMutation({
    mutationFn: (item: InboxItem) => removeInboxItem(item, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox'] }),
    onError: () => Alert.alert("Couldn't dismiss", 'Please try again.'),
  });

  const empty = overdue.length === 0 && inbox.length === 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Tasks' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}
      >
        {overdue.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Past due</Text>
            <View style={{ gap: 10 }}>
              {overdue.map((task) => (
                <OverdueRow
                  key={task.dateId}
                  task={task}
                  onPress={() => router.push(`/contract/${task.contractId}`)}
                />
              ))}
            </View>
          </View>
        )}

        {inbox.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>
              Waiting to be imported
            </Text>
            <View style={{ gap: 10 }}>
              {inbox.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/add?inbox=${item.id}`)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: RADIUS,
                    padding: 14,
                  }}
                >
                  <Ionicons name="mail-unread-outline" size={20} color={theme.brandText} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                      {inboxItemTitle(item)}
                    </Text>
                    <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                      {/* Sender is unauthenticated (email is spoofable), so it is
                          labeled, never presented as a verified identity. */}
                      {item.from_address ? `Unverified sender: ${item.from_address}` : 'Tap to have Contry read it'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Dismiss this document?', 'The file will be deleted.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Dismiss', style: 'destructive', onPress: () => dismissInbox.mutate(item) },
                      ])
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss document"
                  >
                    <Ionicons name="close-circle" size={20} color={theme.mutedForeground} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {empty && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={40} color={theme.statusActive} />
            <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '600' }}>
              Nothing needs your attention
            </Text>
            <Text style={{ color: theme.mutedForeground, textAlign: 'center', maxWidth: 280 }}>
              Dates that have already gone by, and documents emailed in but not yet added, show up
              here.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

// States what happened and when. Never what to do about it: that would be
// advice, and this app describes rather than advises.
function OverdueRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const theme = useTheme();
  const ago =
    task.daysOverdue === 1 ? 'was due yesterday' : `was due ${task.daysOverdue} days ago`;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 14,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {task.label}
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {task.typeLabel} · {task.contractTitle}
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>
          {ago}
          {task.recurring ? ', repeats' : ''}
        </Text>
      </View>
      <StatusBadge date={task.date} />
    </Pressable>
  );
}
