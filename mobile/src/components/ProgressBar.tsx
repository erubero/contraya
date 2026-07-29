import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/theme/colors';

// Animated progress bar (0..1), same visual DNA as the coverage bar on the
// contract detail screen. The percent label is the point: people like
// watching the number go up.
export default function ProgressBar({
  value,
  showPercent = true,
}: {
  value: number;
  showPercent?: boolean;
}) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value)), {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, height: 8, backgroundColor: theme.accent, borderRadius: 999, overflow: 'hidden' }}>
        {/* Lime fill: a progress bar is pure fill, no text on it. */}
        <Animated.View style={[{ height: '100%', backgroundColor: theme.brand, borderRadius: 999 }, fillStyle]} />
      </View>
      {showPercent && (
        <Text style={{ color: theme.mutedForeground, fontSize: 12, fontWeight: '600', width: 38, textAlign: 'right' }}>
          {Math.round(Math.max(0, Math.min(1, value)) * 100)}%
        </Text>
      )}
    </View>
  );
}
