import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, RADIUS } from '@/theme/colors';
import { SUPPORT_EMAIL } from '@/lib/appMeta';
import { ABOUT_SUMMARIES_PARAGRAPHS } from '@/lib/legal';

// The long-form version of the disclaimer that rides on every analysis
// surface. Linked from Settings and referenced in App Store review notes.
export default function AboutSummaries() {
  const theme = useTheme();

  const paragraphs = [
    ...ABOUT_SUMMARIES_PARAGRAPHS,
    `Questions? Write to ${SUPPORT_EMAIL}.`,
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <Stack.Screen options={{ title: 'About These Summaries' }} />
      <View
        style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: RADIUS,
          padding: 16,
          gap: 14,
        }}
      >
        {paragraphs.map((p, i) => (
          <Text key={i} style={{ color: theme.foreground, fontSize: 15, lineHeight: 22 }}>
            {p}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}
