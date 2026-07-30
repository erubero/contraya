import { View, Text, Linking, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/theme/colors';
import { APP_VERSION, TERMS_URL, PRIVACY_URL } from '@/lib/appMeta';
import { SectionTitle, SettingsGroup, SettingsRow, SettingsNote, settingsCard } from '@/components/SettingsRow';

export default function About() {
  const theme = useTheme();
  const router = useRouter();
  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'About' }} />

      <View>
        <SectionTitle>How Contraya works</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="reader-outline"
            label="About These Summaries"
            subtitle="What Contry can and cannot tell you."
            onPress={() => router.push('/about-summaries')}
          />
        </SettingsGroup>
        <SettingsNote>
          Worth two minutes before you rely on a summary for anything expensive.
        </SettingsNote>
      </View>

      <View>
        <SectionTitle>Legal</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => openUrl(TERMS_URL)}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openUrl(PRIVACY_URL)}
          />
        </SettingsGroup>
      </View>

      <View>
        <SectionTitle>Your data</SectionTitle>
        <View style={[settingsCard(theme), { padding: 14 }]}>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19 }}>
            Your contracts sit in private storage that only your account can reach, encrypted in
            transit and at rest. They are never sold and never shared. You can delete your account
            and everything in it at any time, from Account.
          </Text>
        </View>
      </View>

      <View>
        <SectionTitle>App</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="information-circle-outline"
            label="Version"
            value={APP_VERSION}
            showChevron={false}
          />
        </SettingsGroup>
        <SettingsNote>Contraya by Renovatio, LLC.</SettingsNote>
      </View>
    </ScrollView>
  );
}
