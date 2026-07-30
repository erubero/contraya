import { View, Text, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS, Palette } from '@/theme/colors';
import { useThemePreference, ThemePreference } from '@/theme/ThemeContext';
import { SectionTitle, SettingsNote, settingsCard } from '@/components/SettingsRow';

// A theme switcher earns its own screen only if it shows you the consequence.
// The preview below is a real contract card built from the same tokens the
// contracts list uses, so the choice is made against actual content instead of
// against the word "Dark".
export default function Appearance() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  const options: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap; note: string }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline', note: 'Always light, whatever the phone is set to.' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline', note: 'Always dark, whatever the phone is set to.' },
    { value: 'system', label: 'System', icon: 'phone-portrait-outline', note: 'Follows your phone, including its schedule.' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'Appearance' }} />

      <View>
        <SectionTitle>Preview</SectionTitle>
        <PreviewCard theme={theme} />
        <SettingsNote>This is how a contract looks with the theme you have chosen.</SettingsNote>
      </View>

      <View>
        <SectionTitle>Theme</SectionTitle>
        <View style={{ gap: 10 }}>
          {options.map((o) => {
            const active = preference === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => setPreference(o.value)}
                style={[
                  settingsCard(theme),
                  {
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderColor: active ? theme.brandText : theme.border,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                <Ionicons name={o.icon} size={22} color={active ? theme.brandText : theme.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: active ? '700' : '500' }}>
                    {o.label}
                  </Text>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>{o.note}</Text>
                </View>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.brandText} />
                ) : (
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.border }} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function PreviewCard({ theme }: { theme: Palette }) {
  return (
    <View style={[settingsCard(theme), { padding: 14, gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>
            Apartment lease
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>
            12 Palm Ave
          </Text>
        </View>
        <View style={{ backgroundColor: theme.statusActiveBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ color: theme.statusActive, fontSize: 12, fontWeight: '700' }}>Active</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: theme.border }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: RADIUS - 6, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.brandText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: '600' }}>
            Renewal notice deadline
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>In 9 days</Text>
        </View>
      </View>
    </View>
  );
}
