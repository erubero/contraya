import { View, Text, Linking } from 'react-native';
import { useTheme } from '@/theme/colors';
import { PRIVACY_URL } from '@/lib/appMeta';
import {
  AI_PROVIDER,
  AI_PROVIDER_PRIVACY_URL,
  AI_CONSENT_WHO,
  AI_CONSENT_SENT,
  AI_CONSENT_SENT_HEADING,
  AI_CONSENT_NOT_SENT,
  AI_CONSENT_NOT_SENT_HEADING,
  AI_CONSENT_HANDLING,
  AI_CONSENT_HANDLING_HEADING,
  AI_CONSENT_REVOKE,
} from '@/lib/legal';

// The four things guideline 5.1.2(i) wants said, rendered once.
//
// This is a component for the same reason DisclaimerNote is: the consent sheet
// and the Settings screen have to show the SAME disclosure, because the second
// one is where a user goes to check what they agreed to. Two hand-written
// copies would drift, and the drift would be between what was consented to and
// what is claimed to have been consented to, which is the whole subject.
//
// `showRevoke` is off inside Settings, where the toggle sitting underneath is
// the revocation and a sentence pointing at Settings would be pointing at
// itself.
export default function AiDisclosure({ showRevoke = true }: { showRevoke?: boolean }) {
  const theme = useTheme();

  return (
    <View style={{ gap: 16 }}>
      <Text style={{ color: theme.foreground, fontSize: 15, lineHeight: 22 }}>{AI_CONSENT_WHO}</Text>

      <Section heading={AI_CONSENT_SENT_HEADING} items={AI_CONSENT_SENT} />
      <Section heading={AI_CONSENT_NOT_SENT_HEADING} items={AI_CONSENT_NOT_SENT} />
      <Section heading={AI_CONSENT_HANDLING_HEADING} items={[AI_CONSENT_HANDLING]} />

      {showRevoke && (
        <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>
          {AI_CONSENT_REVOKE}
        </Text>
      )}

      <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19 }}>
        Read the{' '}
        <Text
          accessibilityRole="link"
          onPress={() => Linking.openURL(PRIVACY_URL)}
          style={{ color: theme.brandText, textDecorationLine: 'underline' }}
        >
          Contraya Privacy Policy
        </Text>{' '}
        or{' '}
        <Text
          accessibilityRole="link"
          onPress={() => Linking.openURL(AI_PROVIDER_PRIVACY_URL)}
          style={{ color: theme.brandText, textDecorationLine: 'underline' }}
        >
          {`the ${AI_PROVIDER} Privacy Policy`}
        </Text>
        .
      </Text>
    </View>
  );
}

function Section({ heading, items }: { heading: string; items: readonly string[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: theme.mutedForeground,
          fontSize: 12,
          textTransform: 'uppercase',
          fontWeight: '700',
          letterSpacing: 0.4,
        }}
      >
        {heading}
      </Text>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 15, lineHeight: 22 }}>{'•'}</Text>
          <Text style={{ color: theme.foreground, fontSize: 15, lineHeight: 22, flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
