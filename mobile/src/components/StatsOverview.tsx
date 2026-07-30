import { View, Text, Pressable } from 'react-native';
import { Contract } from '@/data/types';
import { daysUntil } from '@/data/status';
import { useTheme, RADIUS } from '@/theme/colors';

// Occurrences of contract dates, pre-materialized by the caller (recurring
// rows expanded), so the tiles count what the calendar shows.
export type OverviewOccurrence = { date: string };

export type TileKey = 'contracts' | 'overdue' | 'soon';

export default function StatsOverview({
  contracts,
  occurrences,
  overdueCount,
  onSelect,
}: {
  contracts: Contract[];
  occurrences: OverviewOccurrence[];
  // Passed in rather than derived here. `occurrences` comes from
  // nextOccurrences, which floors at today and therefore can never contain a
  // past date: counting `d < 0` over it made this tile structurally always
  // zero. Taking the number from the same source as the Tasks screen makes the
  // tile and the list provably agree.
  overdueCount: number;
  onSelect: (tile: TileKey) => void;
}) {
  const theme = useTheme();
  const active = contracts.filter((c) => c.status === 'active').length;
  let soon = 0;
  for (const o of occurrences) {
    const d = daysUntil(o.date);
    if (d >= 0 && d <= 30) soon += 1;
  }

  const tiles: { key: TileKey; label: string; value: number; color: string }[] = [
    { key: 'contracts', label: 'Active', value: active, color: theme.statusActive },
    { key: 'soon', label: 'Next 30 days', value: soon, color: theme.statusExpiring },
    { key: 'overdue', label: 'Past due', value: overdueCount, color: theme.statusExpired },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {tiles.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onSelect(t.key)}
          style={{
            flex: 1,
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: RADIUS,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: t.color, fontSize: 24, fontWeight: '700' }}>{t.value}</Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
