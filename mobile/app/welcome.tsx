import { View, Text, Image, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { markWelcomeSeen } from '@/lib/onboarding';
import { useTheme, RADIUS } from '@/theme/colors';
import GlowBackdrop from '@/components/GlowBackdrop';
import TermsAgreement, { useTermsAcceptance } from '@/components/TermsAgreement';
import { BUILT_BY, DISCLAIMER } from '@/lib/legal';

// First-open pitch. Shown once per install; both CTAs mark it seen and
// replace the route so there is no back-swipe into it.
export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();

  const terms = useTermsAcceptance();

  // Both CTAs run this first. A blocked tap is not swallowed: it surfaces the
  // inline error under the box, which teaches the gate better than a dead
  // button does. Acceptance is written as the user PROCEEDS, not as they tick,
  // so a tick they then back away from records nothing.
  const passTerms = async (): Promise<boolean> => {
    if (terms.blocked) {
      terms.flagBlocked();
      return false;
    }
    await terms.accept();
    await markWelcomeSeen();
    return true;
  };

  const start = async () => {
    if (await passTerms()) router.replace('/signin?mode=signUp');
  };
  const signIn = async () => {
    if (await passTerms()) router.replace('/signin');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -80 }}>
          <GlowBackdrop size={280} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', top: -60, left: -100 }}>
          <GlowBackdrop size={220} />
        </View>

        <Animated.View entering={FadeIn.duration(300)} style={{ gap: 4, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
              source={require('../assets/icon.png')}
              style={{ width: 44, height: 44, borderRadius: 11 }}
            />
            <Text style={{ color: theme.foreground, fontSize: 20, fontWeight: '800' }}>Contraya</Text>
          </View>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, marginLeft: 54 }}>
            Nobody reads the fine print. Contry does.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ gap: 18 }}>
          <Text style={{ color: theme.foreground, fontSize: 34, fontWeight: '800', lineHeight: 40 }}>
            Somewhere in that contract you signed, a deadline is quietly coming due
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 16, lineHeight: 24 }}>
            Contry uses AI to put every contract in plain English and reminds you before
            payments, renewals, and notice deadlines. No surprises hiding in the fine print.
          </Text>

          <View style={{ position: 'relative' }}>
            <GlowBackdrop size={220} style={{ position: 'absolute', top: -30, left: '50%', marginLeft: -110 }} />
            <View
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: RADIUS,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: theme.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="document-text" size={22} color={theme.brandText} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>
                  Apartment lease
                </Text>
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: theme.statusExpiringBg,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: theme.statusExpiring, fontSize: 12, fontWeight: '600' }}>
                    Renewal notice due in 9 days
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400).duration(350)} style={{ gap: 12 }}>
          <TermsAgreement state={terms} />
          <Pressable
            onPress={start}
            style={{
              backgroundColor: theme.primary,
              borderRadius: RADIUS,
              padding: 16,
              alignItems: 'center',
              opacity: terms.blocked ? 0.5 : 1,
            }}
          >
            <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '700' }}>Start free</Text>
          </Pressable>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textAlign: 'center' }}>
            Takes about a minute
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
            {`${BUILT_BY} ${DISCLAIMER}`}
          </Text>
          <Pressable onPress={signIn} style={{ padding: 8, alignItems: 'center' }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>
              I already have an account.{' '}
              <Text style={{ color: theme.brandText, fontWeight: '600' }}>Sign in</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
