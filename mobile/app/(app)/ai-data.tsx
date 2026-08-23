import { useState } from 'react';
import { ScrollView, Text, View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, RADIUS } from '@/theme/colors';
import { useAuth } from '@/lib/AuthContext';
import { grantAiConsent, revokeAiConsent } from '@/lib/aiConsent';
import { SettingsGroup, SettingsSwitchRow } from '@/components/SettingsRow';
import AiDisclosure from '@/components/AiDisclosure';
import {
  AI_DATA_SCREEN_TITLE,
  AI_DATA_TOGGLE_LABEL,
  AI_DATA_TOGGLE_OFF_NOTE,
  NO_ATTORNEY_RELATIONSHIP,
} from '@/lib/legal';

// Where consent given in the sheet can be taken back. Guideline 5.1.1(i) asks
// the privacy policy to describe how a user revokes consent, and a policy that
// describes a control the app does not have would be a lie, so this screen is
// the control the policy describes.
//
// It shows the SAME disclosure the consent sheet showed, through the same
// component. A user coming here to check what they agreed to has to find what
// they agreed to, not a paraphrase of it.
export default function AiData() {
  const theme = useTheme();
  const { aiConsentGranted, setAiConsentGranted } = useAuth();
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    // Optimistic, then reverted on failure: the switch has to move under the
    // finger, but it must never end up claiming a consent state the server
    // does not hold, because the server is what the edge functions read.
    setAiConsentGranted(next);
    try {
      if (next) await grantAiConsent();
      else await revokeAiConsent();
    } catch {
      setAiConsentGranted(!next);
      Alert.alert(
        'That did not save',
        'Contry could not reach the server to record your choice. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Stack.Screen options={{ title: AI_DATA_SCREEN_TITLE }} />

      <View
        style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: RADIUS,
          padding: 16,
        }}
      >
        <AiDisclosure showRevoke={false} />
      </View>

      <SettingsGroup>
        <SettingsSwitchRow
          icon="cloud-upload-outline"
          label={AI_DATA_TOGGLE_LABEL}
          value={aiConsentGranted}
          onValueChange={toggle}
        />
      </SettingsGroup>

      <Text
        style={{
          color: theme.mutedForeground,
          fontSize: 13,
          lineHeight: 19,
          paddingHorizontal: 4,
        }}
      >
        {AI_DATA_TOGGLE_OFF_NOTE}
      </Text>

      <Text
        style={{
          color: theme.mutedForeground,
          fontSize: 13,
          lineHeight: 19,
          paddingHorizontal: 4,
        }}
      >
        {NO_ATTORNEY_RELATIONSHIP}
      </Text>
    </ScrollView>
  );
}
