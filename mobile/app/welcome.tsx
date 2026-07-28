import { View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { markWelcomeSeen } from '@/lib/onboarding';
import { useTheme, RADIUS } from '@/theme/colors';

// First-open pitch. Shown once per install; both CTAs mark it seen and
// replace the route so there is no back-swipe into it.
export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();

  const start = async () => {
    await markWelcomeSeen();
    router.replace('/signin?mode=signUp');
  };
  const signIn = async () => {
    await markWelcomeSeen();
    router.replace('/signin');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <Image
            source={require('../assets/icon.png')}
            style={{ width: 44, height: 44, borderRadius: 11 }}
          />
          <Text style={{ color: theme.foreground, fontSize: 20, fontWeight: '800' }}>Contraya</Text>
        </View>

        <View style={{ gap: 18 }}>
          <Text style={{ color: theme.foreground, fontSize: 34, fontWeight: '800', lineHeight: 40 }}>
            Somewhere in that contract you signed, a deadline is quietly coming due
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 16, lineHeight: 24 }}>
            Contraya puts every contract in plain English and reminds you before payments, renewals,
            and notice deadlines. No surprises hiding in the fine print.
          </Text>

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
              <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>
                Espresso machine
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
                  Refund window closes in 9 days
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={start}
            style={{ backgroundColor: theme.primary, borderRadius: RADIUS, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '700' }}>Start free</Text>
          </Pressable>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, textAlign: 'center' }}>
            Takes about a minute
          </Text>
          <Pressable onPress={signIn} style={{ padding: 8, alignItems: 'center' }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>
              I already have an account.{' '}
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
