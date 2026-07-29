import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import {
  OnboardingAnswers, completeOnboarding, setOnboardingPending,
} from '@/lib/onboarding';
import { requestPermission } from '@/lib/notifications';
import { useTheme, RADIUS } from '@/theme/colors';
import ProgressBar from '@/components/ProgressBar';
import PersonalizedInsight from '@/components/PersonalizedInsight';
import NotificationPreview from '@/components/NotificationPreview';

type Step = 'intro' | 'q1' | 'q2' | 'q3' | 'done';

const STEP_PROGRESS: Record<Step, number> = { intro: 0, q1: 0.25, q2: 0.5, q3: 0.75, done: 1 };

// Post-signup questionnaire. Creating the account was 25%; each answer adds
// 25 more. Answers are engagement-grade data stored in user_metadata.
export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [selected, setSelected] = useState<string | null>(null);
  const answers = useRef<OnboardingAnswers>({});
  const completed = useRef(false);

  // Icon pop-in on the intro screen only.
  const introIconScale = useSharedValue(0.8);
  useEffect(() => {
    if (step === 'intro') introIconScale.value = withSequence(withTiming(0.8, { duration: 0 }), withSpring(1));
  }, [step, introIconScale]);
  const introIconStyle = useAnimatedStyle(() => ({ transform: [{ scale: introIconScale.value }] }));

  // Resume flag: if the app dies mid-flow, the next launch comes back here.
  useEffect(() => {
    setOnboardingPending();
  }, []);


  useEffect(() => {
    if (step === 'done' && !completed.current) {
      completed.current = true;
      completeOnboarding(answers.current);
    }
  }, [step]);

  const advance = (next: Step, key: string) => {
    setSelected(key);
    setTimeout(() => {
      setSelected(null);
      setStep(next);
    }, 220);
  };

  const skip = async () => {
    if (!completed.current) {
      completed.current = true;
      await completeOnboarding({ ...answers.current, skipped: true });
    }
    router.replace('/dashboard');
  };

  const finishToAdd = () => {
    router.replace('/dashboard');
    router.push('/add');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, padding: 24 }}>
        {step === 'intro' && (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={skip} hitSlop={10}>
                <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>Skip</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 8 }}>
              <Animated.View
                style={[
                  {
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    backgroundColor: theme.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  introIconStyle,
                ]}
              >
                <Ionicons name="sparkles-outline" size={36} color={theme.brandText} />
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(120).duration(350)} style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ color: theme.foreground, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
                  Before you start, three quick questions
                </Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
                  It won't take more than a minute. Nothing here is graded. Contry just wants to
                  know what it's dealing with.
                </Text>
              </Animated.View>
            </View>
            <Animated.View entering={FadeIn.delay(300).duration(300)}>
              <Pressable
                onPress={() => setStep('q1')}
                style={{ backgroundColor: theme.primary, borderRadius: RADIUS, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '700' }}>Let's go</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {step !== 'intro' && (
          <View style={{ gap: 10, marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: '600' }}>
                Let's set up your vault
              </Text>
              {step !== 'done' && (
                <Pressable onPress={skip} hitSlop={10}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>Skip</Text>
                </Pressable>
              )}
            </View>
            <ProgressBar value={STEP_PROGRESS[step]} />
            {step === 'q1' && (
              <Text style={{ color: theme.brandText, fontSize: 13, fontWeight: '600' }}>
                Account created. You're already 25% of the way there.
              </Text>
            )}
          </View>
        )}

        {step === 'q1' && (
          <Question
            title="Do you actually read the contracts you sign?"
            subtitle="Be honest. Almost nobody does."
            options={[
              { key: 'always', label: 'All the time' },
              { key: 'sometimes', label: 'Sometimes' },
              { key: 'rarely', label: "Rarely, I'm organized" },
            ]}
            selected={selected}
            onSelect={(key) => {
              answers.current.forgets = key as OnboardingAnswers['forgets'];
              advance('q2', key);
            }}
          />
        )}

        {step === 'q2' && (
          <Question
            title="Ever been surprised by a renewal, a fee, or a deadline you never knew about?"
            subtitle="It was in the contract the whole time. Nobody told you."
            options={[
              { key: 'yes', label: 'Yes, and it stung' },
              { key: 'unsure', label: 'Probably, I never checked' },
              { key: 'no', label: 'Not that I know of' },
            ]}
            selected={selected}
            onSelect={(key) => {
              answers.current.missed_claim = key as OnboardingAnswers['missed_claim'];
              advance('q3', key);
            }}
          />
        )}

        {step === 'q3' && (
          <Question
            title="Want a heads up before a payment, renewal, or deadline?"
            subtitle="A reminder while there is still time to act. That is the whole point of Contraya."
            extra={<NotificationPreview />}
            options={[
              { key: 'yes', label: 'Yes, remind me' },
              { key: 'later', label: 'Maybe later' },
            ]}
            selected={selected}
            onSelect={async (key) => {
              answers.current.reminders = key as OnboardingAnswers['reminders'];
              if (key === 'yes') {
                // The OS permission dialog lands at peak motivation.
                const granted = await requestPermission().catch(() => false);
                answers.current.push_granted = granted;
              }
              advance('done', key);
            }}
          />
        )}

        {step === 'done' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <LottieView
              source={require('../assets/animations/celebrate-confetti.json')}
              autoPlay
              loop={false}
              style={{ width: 180, height: 180 }}
            />
            <Text style={{ color: theme.foreground, fontSize: 26, fontWeight: '800' }}>You're all set</Text>
            <View style={{ alignSelf: 'stretch' }}>
              <PersonalizedInsight answers={answers.current} />
            </View>
            <Text style={{ color: theme.mutedForeground, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
              You're ready. Add your first contract and Contraya starts watching the dates for
              you.
            </Text>
            <Pressable
              onPress={finishToAdd}
              style={{ backgroundColor: theme.primary, borderRadius: RADIUS, padding: 16, alignSelf: 'stretch', alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ color: theme.primaryForeground, fontSize: 16, fontWeight: '700' }}>
                Add your first contract
              </Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/dashboard')} style={{ padding: 8 }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>Go to my dashboard</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Question({
  title,
  subtitle,
  extra,
  options,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  extra?: React.ReactNode;
  options: { key: string; label: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ color: theme.foreground, fontSize: 24, fontWeight: '800', lineHeight: 30 }}>{title}</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 15, lineHeight: 22 }}>{subtitle}</Text>
      </View>
      {extra}
      <View style={{ gap: 12 }}>
        {options.map((o) => {
          const active = selected === o.key;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              disabled={selected !== null}
              onPress={() => onSelect(o.key)}
              style={{
                backgroundColor: active ? theme.accent : theme.card,
                borderColor: active ? theme.primary : theme.border,
                borderWidth: 1,
                borderRadius: RADIUS,
                padding: 18,
              }}
            >
              <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '600' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
