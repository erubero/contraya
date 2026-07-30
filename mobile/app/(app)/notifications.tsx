import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, AppState, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';
import {
  remindersEnabled, setRemindersEnabled, disableAndClear, requestPermission, permissionGranted, rebuildAll,
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
// of sync with what the app really does. The switch never lies: when iOS has
// denied notification permission, a banner says so and links to Settings,
// because the switch alone cannot override a denial.

export default function NotificationSettings() {
  const theme = useTheme();
  // null = not loaded yet; render the switch disabled instead of flashing a
  // default that the stored value may immediately contradict.
  const [reminders, setReminders] = useState<boolean | null>(null);
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(() => {
    remindersEnabled().then(setReminders).catch(() => {});
    permissionGranted().then((granted) => setDenied(!granted)).catch(() => {});
  }, []);

  // Re-check on foreground: the user may have just returned from the iOS
  // Settings app after flipping the permission.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const toggleReminders = async (value: boolean) => {
    setReminders(value);
    if (value) {
      await setRemindersEnabled(true);
      const granted = await requestPermission();
      setDenied(!granted);
      if (granted) {
        await listAllDates()
          .then((all) => rebuildAll(all.map((d) => ({ date: d, contractTitle: d.contracts.title }))))
          .catch(() => {});
      }
    } else {
      await disableAndClear();
    }
  };

  const showDeniedBanner = reminders === true && denied;

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
            value={reminders === true}
            onValueChange={reminders === null ? () => {} : toggleReminders}
          />
        </SettingsGroup>
        <SettingsNote>
          Reminders arrive at 9:00 in your local time. Turning this off cancels every scheduled
          reminder; turning it back on rebuilds them from your contracts.
        </SettingsNote>
      </View>

      {showDeniedBanner && (
        <View
          style={{
            backgroundColor: theme.statusExpiringBg,
            borderColor: theme.statusExpiring,
            borderWidth: 1,
            borderRadius: RADIUS,
            padding: 14,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name="alert-circle" size={20} color={theme.statusExpiring} />
            <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
              Notifications are turned off for Contraya in your device Settings, so no reminder can
              reach you right now.
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openSettings().catch(() => {})}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              borderColor: theme.statusExpiring,
              borderWidth: 1,
              borderRadius: RADIUS - 4,
              paddingHorizontal: 14,
              paddingVertical: 9,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: theme.statusExpiring, fontSize: 14, fontWeight: '700' }}>
              Open Settings
            </Text>
          </Pressable>
        </View>
      )}

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

      {!showDeniedBanner && (
        <View>
          <SectionTitle>Not seeing reminders?</SectionTitle>
          <View style={[settingsCard(theme), { padding: 14 }]}>
            <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19 }}>
              Check that notifications are allowed for Contraya in your device Settings. If they were
              denied once, iOS will not ask again, and the switch above cannot override it.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
