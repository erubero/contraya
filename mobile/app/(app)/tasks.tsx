import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAllDates, listInbox, removeInboxItem, setDateCompleted } from '@/data/repo';
import { InboxItem, inboxItemTitle } from '@/data/inbox';
import { overdueTasks, Task } from '@/data/tasks';
import { clearDraft, readDraft } from '@/lib/draftStore';
import { refreshDeviceSchedules } from '@/lib/deviceSync';
import { useAuth } from '@/lib/AuthContext';
import { usePurchases } from '@/lib/PurchasesContext';
import { useTheme, RADIUS } from '@/theme/colors';
import StatusBadge from '@/components/StatusBadge';
import Toast from '@/components/Toast';

// Everything waiting on the user, in one place. Two sources: dates that have
// already gone by, and documents that arrived by email and were never turned
// into contracts.
//
// A past-due date leaves here one of two ways: the underlying thing changes
// (the contract ends, the row is deleted), or the user says it is handled,
// which writes contract_dates.last_completed_occurrence. That column is the
// only reason a recurring row can leave at all — a monthly rent always has an
// occurrence behind it, so it used to sit here forever.
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
  // An unfinished contract is the most valuable thing that can be waiting here:
  // the analysis behind it was paid for and re-doing it costs again.
  const { userId } = useAuth();
  const { isPro, offeringReady, ready } = usePurchases();
  const [toast, setToast] = useState<string | null>(null);
  const { data: draft = null } = useQuery({
    queryKey: ['draft', userId],
    queryFn: () => readDraft(userId),
  });

  const overdue = useMemo(() => overdueTasks(allDates), [allDates]);

  const dismissInbox = useMutation({
    mutationFn: (item: InboxItem) => removeInboxItem(item, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox'] }),
    onError: () => Alert.alert("Couldn't dismiss", 'Please try again.'),
  });

  // Records the missed occurrence as handled. The row then leaves this screen
  // and the badge drops, because overdueTasks reads the same column.
  //
  // refreshDeviceSchedules is not optional here: without it a rent already
  // paid keeps its scheduled local notification and fires anyway, which is
  // exactly the bug toggleObligation still has on the detail screen.
  const markDone = useMutation({
    mutationFn: async (task: Task) => {
      await setDateCompleted(task.dateId, task.date);
      await refreshDeviceSchedules(userId, { isPro, offeringReady, ready }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-dates'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setToast('Marked done');
    },
    onError: () => Alert.alert("Couldn't mark that done", 'Please try again.'),
  });

  const empty = overdue.length === 0 && inbox.length === 0 && !draft;

  return (
    <>
      <Stack.Screen options={{ title: 'Tasks' }} />
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.background }}
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}
        >
          {draft && (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Unfinished</Text>
              <Pressable
                onPress={() => router.push('/add?draft=1')}
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
                <Ionicons name="document-text-outline" size={20} color={theme.brandText} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                    {draft.fields.title.trim() || draft.sourceName?.trim() || 'A contract you started'}
                  </Text>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                    {draft.analysis ? 'Already read. Tap to finish adding it.' : 'Tap to finish adding it.'}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Discard the unfinished contract?',
                      'The reading Contry already did will be lost.',
                      [
                        { text: 'Keep it', style: 'cancel' },
                        {
                          text: 'Discard',
                          style: 'destructive',
                          onPress: async () => {
                            await clearDraft(userId);
                            queryClient.invalidateQueries({ queryKey: ['draft'] });
                          },
                        },
                      ]
                    )
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Discard unfinished contract"
                >
                  <Ionicons name="close-circle" size={20} color={theme.mutedForeground} />
                </Pressable>
              </Pressable>
            </View>
          )}

          {overdue.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Past due</Text>
              <View style={{ gap: 10 }}>
                {overdue.map((task) => (
                  <OverdueRow
                    key={task.dateId}
                    task={task}
                    onPress={() => router.push(`/contract/${task.contractId}`)}
                    onDone={() => markDone.mutate(task)}
                    busy={markDone.isPending}
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
        {/* Sibling AFTER the ScrollView inside a flex:1 View, so it
            overlays rather than scrolling away. */}
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </View>
    </>
  );
}

// States what happened and when. Never what to do about it: that would be
// advice, and this app describes rather than advises. "Done" is not advice —
// it records something the user did.
function OverdueRow({
  task,
  onPress,
  onDone,
  busy,
}: {
  task: Task;
  onPress: () => void;
  onDone: () => void;
  busy: boolean;
}) {
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
      {/* A check, not the close-circle the draft and inbox rows use: those
          discard something, this records that it was handled. */}
      <Pressable
        onPress={onDone}
        disabled={busy}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${task.label} done`}
        style={{ opacity: busy ? 0.4 : 1 }}
      >
        <Ionicons name="checkmark-circle-outline" size={26} color={theme.statusActive} />
      </Pressable>
    </Pressable>
  );
}
