import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, AppState, Linking, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';
import { useAuth } from '@/lib/AuthContext';
import { usePurchases } from '@/lib/PurchasesContext';
import { presentPaywall } from '@/lib/purchases';
import { calendarSyncGate } from '@/lib/quotaGate';
import { HORIZON_MONTHS } from '@/lib/reminderPlanner';
import { refreshDeviceSchedules } from '@/lib/deviceSync';
import {
  CALENDAR_TITLE,
  SyncResult,
  calendarPermissionGranted,
  deleteCalendarFor,
  requestCalendarPermission,
  setCalendarSyncEnabled,
  setDiscreetTitles,
} from '@/lib/deviceCalendar';
import { readCalendarSync } from '@/lib/calendarSyncStore';
import {
  SectionTitle, SettingsGroup, SettingsSwitchRow, SettingsNote, settingsCard,
} from '@/components/SettingsRow';

// The opt-in for writing contract dates into Apple Calendar. Off until someone
// stands on this screen and says otherwise: this is the only place in the app
// that ever asks for calendar permission, and the only place that creates or
// deletes the Contraya calendar.
//
// Modelled on notifications.tsx, including the two things that screen gets
// right: the switch never claims to be on when iOS has denied the permission,
// and it never flashes a default the stored value is about to contradict. The
// extra piece here is a busy state, because the first sync writes real events
// and takes a moment.

function Banner({
  tone,
  children,
  action,
}: {
  tone: 'warn' | 'info';
  children: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  const color = tone === 'warn' ? theme.statusExpiring : theme.brandText;
  const background = tone === 'warn' ? theme.statusExpiringBg : theme.card;
  return (
    <View
      style={{
        backgroundColor: background,
        borderColor: color,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Ionicons name={tone === 'warn' ? 'alert-circle' : 'information-circle'} size={20} color={color} />
        <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
          {children}
        </Text>
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            borderColor: color,
            borderWidth: 1,
            borderRadius: RADIUS - 4,
            paddingHorizontal: 14,
            paddingVertical: 9,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color, fontSize: 14, fontWeight: '700' }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CalendarSyncSettings() {
  const theme = useTheme();
  const { userId } = useAuth();
  const { isPro, offeringReady, ready, refresh: refreshPro } = usePurchases();

  // null = not loaded yet; the switch renders disabled rather than guessing.
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [discreet, setDiscreet] = useState<boolean | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const refresh = useCallback(() => {
    readCalendarSync(userId)
      .then((s) => {
        setEnabled(s.enabled);
        setDiscreet(s.discreetTitles);
      })
      .catch(() => {});
    calendarPermissionGranted()
      .then((granted) => setDenied(!granted))
      .catch(() => {});
  }, [userId]);

  // Re-check on foreground: the user may have just come back from the iOS
  // Settings app, or deleted the calendar in the Calendar app.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // proNow, not the isPro in scope: a purchase completed moments ago has not
  // propagated into this closure yet, and the gate inside syncAll would read
  // the buyer as free and skip the very sync they just paid for.
  const runSync = async (proNow = isPro) => {
    setBusy(true);
    // force: nothing in the plan changed, so without this the fingerprint
    // short circuit would make turning the switch on look like a no-op.
    const r = await refreshDeviceSchedules(
      userId,
      { isPro: proNow, offeringReady, ready: true },
      { force: true }
    ).catch(() => 'failed' as SyncResult);
    setResult(r);
    if (r === 'calendar-gone') setEnabled(false);
    setBusy(false);
  };

  const toggleSync = async (value: boolean) => {
    if (busy) return;
    setResult(null);
    if (value) {
      let pro = isPro;
      if (calendarSyncGate({ isPro: pro, offeringReady }) !== 'allow') {
        const bought = await presentPaywall();
        await refreshPro();
        if (!bought) return;
        pro = true;
      }
      setEnabled(true);
      await setCalendarSyncEnabled(userId, true);
      const granted = await requestCalendarPermission();
      setDenied(!granted);
      if (granted) await runSync(pro);
      return;
    }
    setEnabled(false);
    setBusy(true);
    await setCalendarSyncEnabled(userId, false);
    const removed = await deleteCalendarFor(userId).catch(() => false);
    setBusy(false);
    if (!removed) {
      Alert.alert(
        'Sync is off, but the calendar is still here',
        `Contraya no longer has calendar access, so it could not remove the ${CALENDAR_TITLE} calendar. You can delete it yourself in the Calendar app.`
      );
    }
  };

  const toggleDiscreet = async (value: boolean) => {
    if (busy) return;
    setDiscreet(value);
    await setDiscreetTitles(userId, value);
    if (enabled && !denied) await runSync();
  };

  const locked = calendarSyncGate({ isPro, offeringReady }) !== 'allow';
  const showDenied = enabled === true && denied;
  const lapsed = enabled === true && locked;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'Apple Calendar' }} />

      {locked && enabled !== true ? (
        <View style={[settingsCard(theme), { padding: 16, gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="calendar" size={20} color={theme.brandText} />
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>
              Your dates, in your calendar
            </Text>
          </View>
          <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>
            Premium adds your contract dates to Apple Calendar and keeps them up to date, so
            payments and deadlines sit alongside everything else in your week.
          </Text>
          <Pressable
            onPress={async () => {
              const bought = await presentPaywall();
              await refreshPro();
              if (bought) await toggleSync(true);
            }}
            style={{
              backgroundColor: theme.brand,
              borderRadius: RADIUS,
              paddingVertical: 13,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.brandForeground, fontSize: 15, fontWeight: '700' }}>
              Upgrade to Premium
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <SectionTitle>Calendar</SectionTitle>
          <SettingsGroup>
            <SettingsSwitchRow
              icon="calendar-outline"
              label="Add dates to Apple Calendar"
              subtitle={
                busy && enabled === true
                  ? 'Adding your dates…'
                  : `Payments, renewals, notice deadlines, and end dates appear in a calendar called ${CALENDAR_TITLE}.`
              }
              value={enabled === true}
              onValueChange={enabled === null || busy ? () => {} : toggleSync}
            />
            <SettingsSwitchRow
              icon="eye-off-outline"
              label="Hide contract names"
              subtitle='Events read "Payment" or "Notice deadline" with no contract name.'
              value={discreet === true}
              onValueChange={discreet === null || busy ? () => {} : toggleDiscreet}
            />
          </SettingsGroup>
          <SettingsNote>
            {`Contraya creates its own calendar and only writes there. Your existing calendars are never changed. The events carry no alerts, because Contraya already reminds you at 9:00. Turning this off deletes the ${CALENDAR_TITLE} calendar and everything in it.`}
          </SettingsNote>
        </View>
      )}

      {showDenied && (
        <Banner
          tone="warn"
          action={{ label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }}
        >
          Calendar access is turned off for Contraya in your device Settings, so nothing can be
          added to your calendar right now.
        </Banner>
      )}

      {lapsed && !showDenied && (
        <Banner tone="warn">
          Your Premium subscription is not active, so the Contraya calendar has stopped updating.
          The events already in it are unchanged.
        </Banner>
      )}

      {result === 'calendar-gone' && (
        <Banner tone="info">
          {`The ${CALENDAR_TITLE} calendar is no longer on this device, so syncing was turned off. Turn it back on to recreate it.`}
        </Banner>
      )}

      {result === 'write-only' && (
        <Banner
          tone="warn"
          action={{ label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }}
        >
          Contraya can add events but cannot read them back, so it cannot keep your calendar
          correct. Give Contraya full calendar access in your device Settings.
        </Banner>
      )}

      {result === 'no-source' && (
        <Banner tone="warn">
          This device has no calendar account Contraya can write to. Open the Calendar app and
          make sure at least one calendar is set up, then try again.
        </Banner>
      )}

      {result === 'failed' && (
        <Banner tone="warn">
          Something went wrong writing to your calendar. Contraya will try again the next time you
          open the app.
        </Banner>
      )}

      {/* Rendered from the real constant so this screen cannot end up
          describing a horizon the planner does not actually use. */}
      <View>
        <SectionTitle>How it works</SectionTitle>
        <View style={[settingsCard(theme), { padding: 14, gap: 10 }]}>
          {[
            'One all day event for each date, on the day it is due.',
            `Recurring dates are added for the next ${HORIZON_MONTHS} months, and roll forward as you open the app.`,
            'Tap an event to open the contract in Contraya.',
            'This calendar is managed by Contraya. Changes you make to it are replaced the next time your contracts change.',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19 }}>•</Text>
              <Text
                style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19, flex: 1 }}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>
        <SettingsNote>
          Your calendar can be read by other apps you have given calendar access, and it follows
          your calendar account to your other Apple devices. If any of your contracts are
          sensitive, turn on Hide contract names.
        </SettingsNote>
      </View>
    </ScrollView>
  );
}
