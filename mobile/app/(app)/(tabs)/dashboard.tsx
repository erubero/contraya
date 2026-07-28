import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { listContracts, listAllDates, getAvatarUrl, listInbox, removeInboxItem } from '@/data/repo';
import { InboxItem, inboxItemTitle } from '@/data/inbox';
import { daysUntil } from '@/data/status';
import { nextOccurrences } from '@/lib/reminderPlanner';
import { useAuth } from '@/lib/AuthContext';
import { useTheme, RADIUS } from '@/theme/colors';
import ScreenHeader from '@/components/ScreenHeader';
import SearchButton from '@/components/SearchButton';
import { useTabBarClearance } from '@/components/TabBar';
import StatsOverview, { TileKey } from '@/components/StatsOverview';
import ContractCard from '@/components/ContractCard';
import LottieLoader from '@/components/LottieLoader';

export default function Dashboard() {
  const theme = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const { displayName, email, avatarPath } = useAuth();

  // Same avatar resolution as Settings: storage path -> displayable URL.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }
    getAvatarUrl(avatarPath)
      .then((url) => { if (!cancelled) setAvatarUrl(url || null); })
      .catch(() => { if (!cancelled) setAvatarUrl(null); });
    return () => { cancelled = true; };
  }, [avatarPath]);

  const initial = (displayName || email || '?').trim().charAt(0).toUpperCase();

  const { data: contracts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['contracts'],
    queryFn: listContracts,
  });
  const { data: allDates = [] } = useQuery({
    queryKey: ['contract-dates'],
    queryFn: listAllDates,
  });
  const { data: inbox = [] } = useQuery({
    queryKey: ['inbox'],
    queryFn: listInbox,
  });
  const queryClient = useQueryClient();
  const dismissInbox = useMutation({
    mutationFn: (item: InboxItem) => removeInboxItem(item, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox'] }),
    onError: () => Alert.alert("Couldn't dismiss", 'Please try again.'),
  });

  // Concrete occurrences (recurring rows expanded) so tiles and the "coming
  // up" list agree with the calendar.
  const occurrences = useMemo(() => {
    const now = new Date();
    return allDates.flatMap((d) =>
      nextOccurrences(d.due_date, d.recurrence, now).map((occ) => ({
        date: format(occ, 'yyyy-MM-dd'),
        label: d.label,
        contractId: d.contract_id,
        contractTitle: d.contracts.title,
      }))
    );
  }, [allDates]);

  // The next three things on the calendar, soonest first.
  const comingUp = useMemo(
    () =>
      [...occurrences]
        .filter((o) => daysUntil(o.date) >= 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3),
    [occurrences]
  );

  const openTile = (tile: TileKey) =>
    tile === 'contracts' ? router.push('/contracts') : router.push('/calendar');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: clearance }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <ScreenHeader
        title={displayName ? displayName : 'Dashboard'}
        subtitle={displayName ? 'Good to see you,' : undefined}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SearchButton />
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.accent,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.accent,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 18, fontWeight: '700' }}>{initial}</Text>
                </View>
              )}
            </Pressable>
          </View>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 20 }}>
        <StatsOverview contracts={contracts} occurrences={occurrences} onSelect={openTile} />

        {inbox.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>
              Received by email
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
                  <Ionicons name="mail-unread-outline" size={20} color={theme.primary} />
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

        {comingUp.length > 0 && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Coming up</Text>
              <Text
                style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}
                onPress={() => router.push('/calendar')}
              >
                View calendar
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {comingUp.map((o, i) => (
                <Pressable
                  key={`${o.contractId}-${o.date}-${i}`}
                  onPress={() => router.push(`/contract/${o.contractId}`)}
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
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
                      {o.label}
                    </Text>
                    <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                      {o.contractTitle}
                    </Text>
                  </View>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: '600' }}>
                    {daysUntil(o.date) === 0 ? 'Today' : daysUntil(o.date) === 1 ? 'Tomorrow' : `${daysUntil(o.date)}d`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {contracts.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Recent</Text>
            <View style={{ gap: 12 }}>
              {contracts.slice(0, 3).map((c) => (
                <ContractCard
                  key={c.id}
                  contract={c}
                  dates={allDates.filter((d) => d.contract_id === c.id)}
                  onPress={() => router.push(`/contract/${c.id}`)}
                />
              ))}
            </View>
          </View>
        )}

        {isLoading && contracts.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <LottieLoader size={120} />
          </View>
        )}

        {!isLoading && contracts.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Ionicons name="document-text-outline" size={40} color={theme.mutedForeground} />
            <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '600' }}>
              No contracts yet
            </Text>
            <Text style={{ color: theme.mutedForeground, textAlign: 'center', maxWidth: 280 }}>
              Tap the + button below to add your first contract. Upload the PDF or photograph the
              pages and Contry reads it for you.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
