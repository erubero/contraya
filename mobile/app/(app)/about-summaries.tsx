import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, RADIUS } from '@/theme/colors';
import { SUPPORT_EMAIL } from '@/lib/appMeta';

// The long-form version of the disclaimer that rides on every analysis
// surface. Linked from Settings and referenced in App Store review notes.
export default function AboutSummaries() {
  const theme = useTheme();

  const paragraphs = [
    'Contraya reads the documents you upload and describes what they say: the dates, the payments, the obligations, and the clauses people often want to know about. Everything you see comes from your own document, rewritten in everyday words.',
    'Contraya is not a law firm and does not give legal advice. The summaries do not tell you what you should do, whether a contract is good for you, or whether a clause is enforceable where you live. Laws vary by state and country, and only a licensed attorney who knows your situation can advise you.',
    'Summaries can also make mistakes. Always check the dates and details against your document before relying on them, and keep the original document — it is the only version that counts.',
    'If a contract involves a lot of money, your home, your health, or anything you cannot afford to get wrong, have a licensed attorney look at it.',
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
