import { View, Text } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { statusKind, daysUntil } from '@/data/status';
import { useTheme } from '@/theme/colors';

// Proximity badge for a contract date: how soon it is and how urgently it
// should read. Reuses the warranty status palette (active/expiring/expired
// slots map to upcoming/soon/overdue).
export default function StatusBadge({ date }: { date: string }) {
  const theme = useTheme();
  const kind = statusKind(date);
  const d = daysUntil(date);

  const label =
    kind === 'overdue'
      ? 'Past due'
      : d === 0
        ? 'Today'
        : d === 1
          ? 'Tomorrow'
          : kind === 'soon'
            ? `${d}d`
            : format(parseISO(date), 'MMM d');

  const config = {
    upcoming: { bg: theme.statusActiveBg, fg: theme.statusActive, icon: 'calendar-outline' as const },
    soon: { bg: theme.statusExpiringBg, fg: theme.statusExpiring, icon: 'alert-circle' as const },
    overdue: { bg: theme.statusExpiredBg, fg: theme.statusExpired, icon: 'close-circle' as const },
  }[kind];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: config.bg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
      }}
    >
      <Ionicons name={config.icon} size={13} color={config.fg} />
      <Text style={{ color: config.fg, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
