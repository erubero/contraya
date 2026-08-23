import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';
import AiDisclosure from '@/components/AiDisclosure';
import { AI_CONSENT_TITLE, AI_CONSENT_ALLOW, AI_CONSENT_DECLINE } from '@/lib/legal';

// The permission ask required by guideline 5.1.2(i). It is deliberately a
// blocking sheet and not a banner: the guideline wants an affirmative tap, and
// Apple's rejection letter for 1.0 (6) said in as many words that a line in the
// Terms does not count.
//
// Nothing here is pre-answered. There is no pre-checked box, "Not now" is a
// real button rather than a dismissal gesture, and the caller treats a swipe
// away as a decline. Whoever edits this: the ONLY safe default is no.
export default function AiConsentSheet({
  visible,
  busy,
  onAllow,
  onDecline,
}: {
  visible: boolean;
  busy: boolean;
  onAllow: () => void;
  onDecline: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onDecline}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          <View style={{ gap: 12 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="lock-closed-outline" size={28} color={theme.brandText} />
            </View>
            <Text style={{ color: theme.foreground, fontSize: 24, fontWeight: '800', lineHeight: 30 }}>
              {AI_CONSENT_TITLE}
            </Text>
          </View>

          <AiDisclosure />
        </ScrollView>

        <View
          style={{
            padding: 24,
            paddingTop: 12,
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          }}
        >
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onAllow}
            style={{
              backgroundColor: theme.primary,
              borderRadius: RADIUS,
              padding: 16,
              alignItems: 'center',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '700' }}>
                {AI_CONSENT_ALLOW}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onDecline}
            style={{ padding: 14, alignItems: 'center' }}
          >
            <Text style={{ color: theme.mutedForeground, fontSize: 15, fontWeight: '600' }}>
              {AI_CONSENT_DECLINE}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
