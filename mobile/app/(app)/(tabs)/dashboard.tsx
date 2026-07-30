import { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { listContracts, listAllDates, getAvatarUrl, listInbox } from '@/data/repo';
import { overdueTasks } from '@/data/tasks';
import { readDraft } from '@/lib/draftStore';
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
import PersonalizedInsight from '@/components/PersonalizedInsight';
import { getPersonalizedInsightDismissed, dismissPersonalizedInsight } from '@/lib/onboarding';

export default function Dashboard() {
  const theme = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const { displayName, email, avatarPath, onboardingAnswers, userId } = useAuth();

  // Same avatar resolution as Settings: storage path -> displayable URL.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [insightDismissed, setInsightDismissed] = useState(false);
  useEffect(() => {
    getPersonalizedInsightDismissed().then(setInsightDismissed);
  }, []);
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
  // Kept for the avatar badge count only. The lists themselves live on /tasks.
  const { data: inbox = [] } = useQuery({
    queryKey: ['inbox'],
    queryFn: listInbox,
  });
  const { data: draft = null } = useQuery({
    queryKey: ['draft', userId],
    queryFn: () => readDraft(userId),
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

  // What is waiting on the user: dates already gone by, plus documents emailed
  // in and never added. Drives both the Past due tile and the avatar badge, so
  // the two can never disagree with the /tasks list.
  const overdue = useMemo(() => overdueTasks(allDates), [allDates]);
  const taskCount = overdue.length + inbox.length + (draft ? 1 : 0);

  const openTile = (tile: TileKey) =>
    tile === 'contracts'
      ? router.push('/contracts')
      : tile === 'overdue'
        ? router.push('/tasks')
        : router.push('/calendar');

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
            {/* The avatar doubles as the task button. A count badge sits on it
                when something is waiting; with nothing waiting it looks and
                behaves exactly as it always has. Settings is still one tap away
                in the tab bar, which is what this used to open. */}
            <Pressable
              onPress={() => router.push('/tasks')}
              accessibilityRole="button"
              accessibilityLabel={
                taskCount === 0
                  ? 'Open tasks. Nothing needs your attention.'
                  : `Open tasks. ${taskCount} ${taskCount === 1 ? 'item needs' : 'items need'} your attention.`
              }
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
                  <Text style={{ color: theme.brandText, fontSize: 18, fontWeight: '700' }}>{initial}</Text>
                </View>
              )}
              {/* Same geometry as the camera badge on the Account screen avatar,
                  so the two read as the same object. The card-colored ring
                  punches it out of the photo underneath. Red, not lime: lime is
                  reserved as a full fill for the add button. Capped at 9+ so the
                  circle can never grow and knock the header out of alignment
                  with the search button beside it. */}
              {taskCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: -2,
                    top: -2,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 5,
                    borderRadius: 10,
                    backgroundColor: theme.statusExpired,
                    borderWidth: 2,
                    borderColor: theme.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    {taskCount > 9 ? '9+' : taskCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 20 }}>
        <StatsOverview
          contracts={contracts}
          occurrences={occurrences}
          overdueCount={overdue.length}
          onSelect={openTile}
        />

        {!insightDismissed && (
          <PersonalizedInsight
            answers={onboardingAnswers}
            dismissible
            onDismiss={() => {
              dismissPersonalizedInsight();
              setInsightDismissed(true);
            }}
          />
        )}

        {/* "Received by email" used to render here. It moved to /tasks, which is
            where everything waiting on the user now lives; the avatar badge is
            what surfaces it. */}

        {comingUp.length > 0 && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Coming up</Text>
              <Text
                style={{ color: theme.brandText, fontSize: 13, fontWeight: '600' }}
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
                  <Ionicons name="calendar-outline" size={20} color={theme.brandText} />
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
