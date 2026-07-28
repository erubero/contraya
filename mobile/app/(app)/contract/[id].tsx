import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBundle, deleteContract, updateContract, setObligationCompleted, listAllDates,
} from '@/data/repo';
import { CONTRACT_TYPE_LABELS, DATE_TYPE_LABELS, Severity } from '@/data/types';
import { rebuildAll } from '@/lib/notifications';
import { useAuth } from '@/lib/AuthContext';
import { Linking } from 'react-native';
import { useTheme, RADIUS } from '@/theme/colors';
import TypeIcon from '@/components/TypeIcon';
import StatusBadge from '@/components/StatusBadge';
import DocumentsSection from '@/components/DocumentsSection';

const DISCLAIMER = 'This explains what the contract says. It is not legal advice.';

export default function ContractDetail() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { userId } = useAuth();
  const { data: bundle, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => getBundle(id),
  });

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['contract-dates'] });
  };

  const rescheduleReminders = () =>
    listAllDates()
      .then((all) => rebuildAll(all.map((d) => ({ date: d, contractTitle: d.contracts.title }))))
      .catch(() => {});

  const remove = useMutation({
    mutationFn: async () => {
      await deleteContract(bundle!.contract);
      await rescheduleReminders();
    },
    onSuccess: () => {
      invalidateLists();
      router.back();
    },
    onError: () => Alert.alert("Couldn't delete", 'Please try again.'),
  });

  const setStatus = useMutation({
    mutationFn: async (status: 'active' | 'ended') => {
      await updateContract(bundle!.contract.id, { status });
      // Ended contracts drop out of the reminder query; reschedule now.
      await rescheduleReminders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      invalidateLists();
    },
    onError: () => Alert.alert("Couldn't update", 'Please try again.'),
  });

  const toggleObligation = useMutation({
    mutationFn: ({ obId, completed }: { obId: string; completed: boolean }) =>
      setObligationCompleted(obId, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract', id] }),
    onError: () => Alert.alert("Couldn't update", 'Please try again.'),
  });

  const confirmDelete = () =>
    Alert.alert(
      'Delete this contract?',
      `"${bundle?.contract.title}" and its documents will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
      ]
    );

  if (isLoading || !bundle) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.mutedForeground }}>{isLoading ? 'Loading…' : 'Not found'}</Text>
      </View>
    );
  }

  const { contract, dates, obligations, riskFlags } = bundle;

  const severityColor: Record<Severity, { fg: string; bg: string }> = {
    high: { fg: theme.statusExpired, bg: theme.statusExpiredBg },
    medium: { fg: theme.statusExpiring, bg: theme.statusExpiringBg },
    low: { fg: theme.mutedForeground, bg: theme.accent },
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={22} color={theme.destructive} />
            </Pressable>
          ),
        }}
      />

      <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TypeIcon type={contract.contract_type} size="lg" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.foreground, fontSize: 20, fontWeight: '700' }}>{contract.title}</Text>
            <Text style={{ color: theme.mutedForeground, marginTop: 2 }}>
              {CONTRACT_TYPE_LABELS[contract.contract_type]}
              {contract.party_other ? ` · ${contract.party_other}` : ''}
            </Text>
          </View>
        </View>
        {contract.status !== 'active' && (
          <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: '600' }}>
            This contract is marked as {contract.status}.
          </Text>
        )}
      </View>

      {/* The disclaimer rides with every analysis surface, always visible. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: theme.accent,
          borderRadius: RADIUS,
          padding: 12,
        }}
      >
        <Ionicons name="information-circle-outline" size={18} color={theme.mutedForeground} />
        <Text style={{ flex: 1, color: theme.mutedForeground, fontSize: 12 }}>{DISCLAIMER}</Text>
      </View>

      {contract.summary && (
        <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14, gap: 6 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
            In plain English
          </Text>
          <Text style={{ color: theme.foreground, fontSize: 15, lineHeight: 22 }}>{contract.summary}</Text>
        </View>
      )}

      <Pressable
        onPress={() => router.push(`/chat/${contract.id}`)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: theme.primary,
          borderRadius: RADIUS,
          padding: 14,
        }}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.primaryForeground} />
        <Text style={{ color: theme.primaryForeground, fontSize: 15, fontWeight: '600' }}>
          Ask Contry about this contract
        </Text>
      </Pressable>

      {(contract.total_value != null || contract.party_other_contact) && (
        <View style={{ gap: 10 }}>
          {contract.total_value != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14 }}>
              <Ionicons name="pricetag-outline" size={20} color={theme.mutedForeground} />
              <View>
                <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>Contract value</Text>
                <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '500' }}>
                  {`$${contract.total_value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                </Text>
              </View>
            </View>
          )}
          {contract.party_other_contact && (
            <Pressable
              onPress={() => {
                const c = contract.party_other_contact ?? '';
                // Validate as a bare email before mailto: the value is model
                // output from an attacker-plantable document, and mailto honors
                // ?cc/bcc/body, so an unvalidated string could pre-fill a hidden
                // recipient. A plain-email check drops anything with extras.
                const url = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)
                  ? `mailto:${c}`
                  : /^[+()\d][\d\s().-]{6,}$/.test(c)
                    ? `tel:${c.replace(/[^+\d]/g, '')}`
                    : null;
                if (url) Linking.openURL(url).catch(() => {});
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14 }}
            >
              <Ionicons name="call-outline" size={20} color={theme.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>Contact</Text>
                <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '500' }} numberOfLines={2}>
                  {contract.party_other_contact}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {contract.payment_terms && (
        <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14, gap: 6 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
            Payments
          </Text>
          <Text style={{ color: theme.foreground, fontSize: 15 }}>{contract.payment_terms}</Text>
        </View>
      )}

      {dates.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
            Dates
          </Text>
          <View style={{ gap: 10 }}>
            {dates.map((d) => (
              <View
                key={d.id}
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
                  <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>{d.label}</Text>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>
                    {format(parseISO(d.due_date), 'MMMM d, yyyy')}
                    {' · '}
                    {DATE_TYPE_LABELS[d.date_type]}
                    {d.recurrence !== 'none' ? ` · repeats ${d.recurrence}` : ''}
                  </Text>
                </View>
                <StatusBadge date={d.due_date} />
              </View>
            ))}
          </View>
        </View>
      )}

      {obligations.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
            Things to remember
          </Text>
          <View style={{ gap: 10 }}>
            {obligations.map((o) => {
              const done = o.completed_at !== null;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => toggleObligation.mutate({ obId: o.id, completed: !done })}
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
                  <Ionicons
                    name={done ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={done ? theme.statusActive : theme.mutedForeground}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: done ? theme.mutedForeground : theme.foreground,
                        fontSize: 15,
                        textDecorationLine: done ? 'line-through' : 'none',
                      }}
                    >
                      {o.description}
                    </Text>
                    <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }}>
                      {[o.who, o.due_note].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {riskFlags.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
            Worth a close look
          </Text>
          <View style={{ gap: 10 }}>
            {riskFlags.map((r) => {
              const c = severityColor[r.severity];
              return (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: RADIUS,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ color: c.fg, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                        {r.severity}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, color: theme.foreground, fontSize: 15, fontWeight: '600' }}>{r.title}</Text>
                  </View>
                  {r.quote && (
                    <Text style={{ color: theme.mutedForeground, fontSize: 13, fontStyle: 'italic' }}>
                      "{r.quote}"
                    </Text>
                  )}
                  <Text style={{ color: theme.foreground, fontSize: 14 }}>{r.why_it_matters}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {contract.notes && (
        <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14, gap: 6 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>Notes</Text>
          <Text style={{ color: theme.foreground }}>{contract.notes}</Text>
        </View>
      )}

      <DocumentsSection contract={contract} userId={userId} />

      {contract.status === 'active' ? (
        <Pressable
          onPress={() => setStatus.mutate('ended')}
          disabled={setStatus.isPending}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14 }}
        >
          <Ionicons name="archive-outline" size={20} color={theme.primary} />
          <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Mark as ended</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setStatus.mutate('active')}
          disabled={setStatus.isPending}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 14 }}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.primary} />
          <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Mark as active again</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
