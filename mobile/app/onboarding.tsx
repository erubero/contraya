import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import {
  OnboardingAnswers, completeOnboarding, setOnboardingPending,
} from '@/lib/onboarding';
import { requestPermission } from '@/lib/notifications';
import { useTheme, RADIUS } from '@/theme/colors';
import ProgressBar from '@/components/ProgressBar';

type Step = 'q1' | 'q2' | 'q3' | 'done';

const STEP_PROGRESS: Record<Step, number> = { q1: 0.25, q2: 0.5, q3: 0.75, done: 1 };

// Post-signup questionnaire. Creating the account was 25%; each answer adds
// 25 more. Answers are engagement-grade data stored in user_metadata.
export default function Onboarding() {
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>('q1');
  const [selected, setSelected] = useState<string | null>(null);
  const answers = useRef<OnboardingAnswers>({});
  const completed = useRef(false);

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
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
              Account created. You're already 25% of the way there.
            </Text>
          )}
        </View>

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
  options,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
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
