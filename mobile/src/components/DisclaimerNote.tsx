import { Text, StyleProp, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/colors';
import { DISCLAIMER, DISCLAIMER_CHAT, DISCLAIMER_MORE } from '@/lib/legal';

// The legal note that rides every analysis surface: the review screen, the
// contract detail, and Ask Contry. It exists as a component rather than three
// copies of <Text>{DISCLAIMER}</Text> because the trailing link is the half
// that is easy to forget, and forgetting it is what put the app in breach of
// its own rule in legal.ts for ten days (audit finding 12).
//
// The link is a nested Text, not a Pressable, so it wraps inline with the
// sentence instead of breaking the footer into two rows. About These Summaries
// is where claim 3 (no attorney-client relationship, no privilege) lives in
// full, alongside the "AI can be wrong, keep the original" paragraph.
export default function DisclaimerNote({
  variant = 'analysis',
  style,
}: {
  variant?: 'analysis' | 'chat';
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Text style={[{ color: theme.mutedForeground, fontSize: 12 }, style]}>
      {variant === 'chat' ? DISCLAIMER_CHAT : DISCLAIMER}{' '}
      <Text
        onPress={() => router.push('/about-summaries')}
        accessibilityRole="link"
        accessibilityLabel={`${DISCLAIMER_MORE} Read what Contraya is not.`}
        style={{ color: theme.brandText, textDecorationLine: 'underline' }}
      >
        {DISCLAIMER_MORE}
      </Text>
    </Text>
  );
}
