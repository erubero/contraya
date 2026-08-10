import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth } from 'date-fns';
import { listAllDates } from '@/data/repo';
import { daysUntil } from '@/data/status';
import { DATE_TYPE_LABELS } from '@/data/types';
import { nextOccurrences } from '@/lib/reminderPlanner';
import { useTheme, RADIUS } from '@/theme/colors';
import ScreenHeader from '@/components/ScreenHeader';
import SearchButton from '@/components/SearchButton';
import { useTabBarClearance } from '@/components/TabBar';
import MonthCalendar from '@/components/MonthCalendar';
import StatusBadge from '@/components/StatusBadge';

type Occurrence = {
  date: string;
  label: string;
  typeLabel: string;
  contractId: string;
  contractTitle: string;
};

function OccurrenceRow({ occ, onPress }: { occ: Occurrence; onPress: () => void }) {
  const theme = useTheme();
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
          {occ.label}
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {occ.typeLabel} · {occ.contractTitle}
        </Text>
      </View>
      <StatusBadge date={occ.date} />
    </Pressable>
  );
}

export default function Calendar() {
  const theme = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const { data: allDates = [] } = useQuery({
    queryKey: ['contract-dates'],
    queryFn: listAllDates,
  });

  // Concrete occurrences (recurring rows expanded) across the horizon.
  const occurrences: Occurrence[] = useMemo(() => {
    const now = new Date();
    return allDates.flatMap((d) =>
      nextOccurrences(d.due_date, d.recurrence, now, undefined, d.last_completed_occurrence).map(
        (occ) => ({
          date: format(occ, 'yyyy-MM-dd'),
          label: d.label,
          typeLabel: DATE_TYPE_LABELS[d.date_type],
          contractId: d.contract_id,
          contractTitle: d.contracts.title,
        })
      )
    );
  }, [allDates]);

  const selectedKey = format(selected, 'yyyy-MM-dd');
  const onSelectedDay = useMemo(
    () => occurrences.filter((o) => o.date === selectedKey),
    [occurrences, selectedKey]
  );

  // Future dates, soonest first.
  const upcoming = useMemo(
    () =>
      [...occurrences]
        .filter((o) => daysUntil(o.date) >= 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10),
    [occurrences]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: clearance }}
    >
      <ScreenHeader title="Calendar" right={<SearchButton />} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 20 }}>
        <MonthCalendar
          events={occurrences}
          month={month}
          onChangeMonth={setMonth}
          selected={selected}
          onSelectDay={setSelected}
        />

        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>
            {format(selected, 'MMMM d')}
          </Text>
          {onSelectedDay.length > 0 ? (
            <View style={{ gap: 12 }}>
              {onSelectedDay.map((o, i) => (
                <OccurrenceRow
                  key={`${o.contractId}-${o.date}-${i}`}
                  occ={o}
                  onPress={() => router.push(`/contract/${o.contractId}`)}
                />
              ))}
            </View>
          ) : (
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>
              Nothing happens on this day.
            </Text>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }}>Upcoming</Text>
          {upcoming.length > 0 ? (
            <View style={{ gap: 12 }}>
              {upcoming.map((o, i) => (
                <View key={`${o.contractId}-${o.date}-${i}`} style={{ gap: 4 }}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 12, fontWeight: '600' }}>
                    {format(parseISO(o.date), 'EEE, MMM d, yyyy')}
                  </Text>
                  <OccurrenceRow occ={o} onPress={() => router.push(`/contract/${o.contractId}`)} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Ionicons name="calendar-outline" size={36} color={theme.mutedForeground} />
              <Text style={{ color: theme.mutedForeground, textAlign: 'center', maxWidth: 280 }}>
                Nothing coming up. Contracts you add will show their payments, renewals, and
                deadlines here.
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
