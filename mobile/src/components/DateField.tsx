import { useState } from 'react';
import { View, Text, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useTheme, RADIUS } from '@/theme/colors';

// A tap-to-open native date picker that reads and writes yyyy-MM-dd strings,
// the format the draft and Postgres date columns use.
export default function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = value ? parseISO(value) : new Date();

  const commit = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && date) onChange(format(date, 'yyyy-MM-dd'));
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.foreground, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: RADIUS,
          padding: 13,
          backgroundColor: theme.card,
        }}
      >
        <Text style={{ fontSize: 15, color: value ? theme.foreground : theme.mutedForeground }}>
          {value ? format(parseISO(value), 'MMMM d, yyyy') : 'Select a date'}
        </Text>
      </Pressable>

      {Platform.OS === 'android' && open && (
        <DateTimePicker value={current} mode="date" onChange={commit} />
      )}

      {Platform.OS === 'ios' && (
        <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            onPress={() => setOpen(false)}
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 12, paddingBottom: 28 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setOpen(false)} style={{ padding: 8 }}>
                  <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 16 }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={current}
                mode="date"
                display="inline"
                onChange={(_e, date) => date && onChange(format(date, 'yyyy-MM-dd'))}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
