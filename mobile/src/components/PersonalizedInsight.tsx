import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';
import { OnboardingAnswers, reflectOnAnswers } from '@/lib/onboarding';

// A short line reflecting the onboarding questionnaire back at the user,
// shown on the onboarding 'done' step and, dismissibly, on the dashboard.
// Renders nothing for a null/low-signal answer set (demo mode, old accounts,
// a user who skipped, or a neutral combination reflectOnAnswers declines to
// summarize) so callers never need to special-case the empty state.
export default function PersonalizedInsight({
  answers,
  dismissible = false,
  onDismiss,
}: {
  answers: OnboardingAnswers | null;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const insight = reflectOnAnswers(answers);
  if (!insight) return null;

  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: theme.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="sparkles-outline" size={17} color={theme.primary} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '700' }}>{insight.headline}</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>{insight.body}</Text>
      </View>
      {dismissible && (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close-circle" size={20} color={theme.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}
