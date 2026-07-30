import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/colors';
import {
  remindersEnabled, setRemindersEnabled, disableAndClear, requestPermission, rebuildAll,
} from '@/lib/notifications';
import { listAllDates } from '@/data/repo';
import { DATE_TYPES, DATE_TYPE_LABELS, DEFAULT_WINDOWS, DateType } from '@/data/types';
import { describeWindows } from '@/lib/textFormat';
import {
  SectionTitle, SettingsGroup, SettingsSwitchRow, SettingsNote, settingsCard,
} from '@/components/SettingsRow';

// Turns "will you actually tell me in time?" into something the user can read.
// The schedule below is rendered straight from DEFAULT_WINDOWS, the same
// constant the planner and the DB CHECK use, so this screen cannot drift out
// of sync with what the app really does.

export default function NotificationSettings() {
  const theme = useTheme();
  const [reminders, setReminders] = useState(true);

  useEffect(() => {
    remindersEnabled().then(setReminders);
  }, []);

  const toggleReminders = async (value: boolean) => {
    setReminders(value);
    if (value) {
      await setRemindersEnabled(true);
      await requestPermission();
      await listAllDates()
        .then((all) => rebuildAll(all.map((d) => ({ date: d, contractTitle: d.contracts.title }))))
        .catch(() => {});
    } else {
      await disableAndClear();
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'Notifications' }} />

      <View>
        <SectionTitle>Reminders</SectionTitle>
        <SettingsGroup>
          <SettingsSwitchRow
            icon="notifications-outline"
            label="Contract reminders"
            subtitle="Get a heads up before payments, renewals, and notice deadlines."
            value={reminders}
            onValueChange={toggleReminders}
          />
        </SettingsGroup>
        <SettingsNote>
          Reminders arrive at 9:00 in your local time. Turning this off cancels every scheduled
          reminder; turning it back on rebuilds them from your contracts.
        </SettingsNote>
      </View>

      <View>
        <SectionTitle>When Contry reminds you</SectionTitle>
        <View style={[settingsCard(theme), { padding: 14, gap: 12 }]}>
          {DATE_TYPES.map((type: DateType) => (
            <View key={type} style={{ gap: 2 }}>
              <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>
                {DATE_TYPE_LABELS[type]}
              </Text>
              <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
                {describeWindows(DEFAULT_WINDOWS[type])}
              </Text>
            </View>
          ))}
        </View>
        <SettingsNote>
          Renewal and notice deadlines get the longest runway on purpose. Those are the ones that
          cost money when they pass, and you usually need weeks, not days, to act on them.
        </SettingsNote>
      </View>

      <View>
        <SectionTitle>Not seeing reminders?</SectionTitle>
        <View style={[settingsCard(theme), { padding: 14 }]}>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19 }}>
            Check that notifications are allowed for Contraya in your device Settings. If they were
            denied once, iOS will not ask again, and the switch above cannot override it.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
