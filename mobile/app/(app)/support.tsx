import { View, Text, Alert, Share, Linking, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useTheme } from '@/theme/colors';
import { SUPPORT_EMAIL, HELP_URL, SHARE_MESSAGE } from '@/lib/appMeta';
import { SectionTitle, SettingsGroup, SettingsRow, SettingsNote, settingsCard } from '@/components/SettingsRow';

export default function Support() {
  const theme = useTheme();

  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});
  const contactSupport = () => openUrl(`mailto:${SUPPORT_EMAIL}?subject=Contraya%20Support`);
  const onShare = () => Share.share({ message: SHARE_MESSAGE }).catch(() => {});

  const onRate = async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      } else {
        Alert.alert('Thanks!', 'Rating will be available once Contraya is on the store.');
      }
    } catch {
      // Non-fatal; the review prompt is best-effort.
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'Help & Support' }} />

      <View>
        <SectionTitle>Get help</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="help-circle-outline"
            label="Help Center"
            subtitle="Guides and answers to common questions."
            onPress={() => openUrl(HELP_URL)}
          />
          <SettingsRow
            icon="mail-outline"
            label="Contact Support"
            subtitle={SUPPORT_EMAIL}
            onPress={contactSupport}
          />
        </SettingsGroup>
        <SettingsNote>
          A real person reads these. Tell us what contract you were working on and what happened,
          and please do not paste anything from the document itself.
        </SettingsNote>
      </View>

      <View>
        <SectionTitle>Spread the word</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="star-outline"
            label="Rate Contraya"
            subtitle="Ratings are how people find us."
            onPress={onRate}
          />
          <SettingsRow
            icon="share-outline"
            label="Share Contraya"
            subtitle="Send it to someone about to sign something."
            onPress={onShare}
          />
        </SettingsGroup>
      </View>

      <View style={[settingsCard(theme), { padding: 14 }]}>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19 }}>
          Contraya explains what your contracts say. It is not a law firm and cannot tell you what
          to do. For advice about your situation, talk to a licensed attorney.
        </Text>
      </View>
    </ScrollView>
  );
}
