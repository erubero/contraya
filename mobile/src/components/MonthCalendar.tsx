import { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { statusKind } from '@/data/status';
import { useTheme, RADIUS } from '@/theme/colors';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A dot on the grid: any dated thing. The calendar screen materializes
// recurring contract dates into concrete occurrences before passing them in.
export type CalendarEvent = { date: string };

// Month grid with proximity-colored dots on days that have contract dates.
// Pure date-fns; no calendar dependency.
export default function MonthCalendar({
  events,
  month,
  onChangeMonth,
  selected,
  onSelectDay,
}: {
  events: CalendarEvent[];
  month: Date;
  onChangeMonth: (next: Date) => void;
  selected: Date;
  onSelectDay: (day: Date) => void;
}) {
  const theme = useTheme();

  // 'yyyy-MM-dd' -> dot colors for that day (max 3 shown).
  const dots = useMemo(() => {
    const map = new Map<string, string[]>();
    const color = { upcoming: theme.statusActive, soon: theme.statusExpiring, overdue: theme.statusExpired };
    for (const e of events) {
      if (!e.date) continue;
      const list = map.get(e.date) ?? [];
      if (list.length < 3) list.push(color[statusKind(e.date)]);
      map.set(e.date, list);
    }
    return map;
  }, [events, theme]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 12,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => onChangeMonth(addMonths(month, -1))} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={20} color={theme.foreground} />
        </Pressable>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>
          {format(month, 'MMMM yyyy')}
        </Text>
        <Pressable onPress={() => onChangeMonth(addMonths(month, 1))} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="chevron-forward" size={20} color={theme.foreground} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d, i) => (
          <Text
            key={i}
            style={{ flex: 1, textAlign: 'center', color: theme.mutedForeground, fontSize: 11, fontWeight: '600' }}
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isSelected = isSameDay(day, selected);
          const dayDots = dots.get(format(day, 'yyyy-MM-dd')) ?? [];
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onSelectDay(day)}
              style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? theme.primary : 'transparent',
                  borderWidth: !isSelected && isToday(day) ? 1 : 0,
                  borderColor: theme.primary,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected || isToday(day) ? '700' : '400',
                    color: isSelected ? '#FFFFFF' : inMonth ? theme.foreground : theme.mutedForeground,
                    opacity: inMonth ? 1 : 0.5,
                  }}
                >
                  {format(day, 'd')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 1 }}>
                {dayDots.map((c, i) => (
                  <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
