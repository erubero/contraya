import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';
import { OnboardingAnswers, reflectOnAnswers } from '@/lib/onboarding';
import { Insight } from '@/data/insight';

// A short line about the user, shown on the onboarding 'done' step and,
// dismissibly, on the dashboard.
//
// `insight` is the real one, derived from the user's own dates. It wins when
// present. `answers` is the onboarding reflection, which is all a brand new
// account has to go on and is what this component used to show exclusively:
// the dashboard said the same sentence to someone with forty contracts and
// someone with none.
//
// Renders nothing when neither has anything to say (demo mode, old accounts,
// a user who skipped, an empty portfolio with a neutral answer set) so callers
// never need to special-case the empty state.
export default function PersonalizedInsight({
  answers,
  insight: fromData,
  dismissible = false,
  onDismiss,
}: {
  answers: OnboardingAnswers | null;
  insight?: Insight | null;
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const insight = fromData ?? reflectOnAnswers(answers);
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
        <Ionicons name="sparkles-outline" size={17} color={theme.brandText} />
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
