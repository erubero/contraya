import { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme, RADIUS } from '@/theme/colors';

// A static mock of the actual reminder notification, shown at the
// permission-priming moment so the ask isn't abstract. Copy is real, not
// invented: the title matches TITLES.renewal and the body matches the exact
// `${label} for ${contractTitle} is ${when(days)}.` template, both from
// src/lib/reminderPlanner.ts, continuing the same lease/9-days story
// welcome.tsx's mock card already tells.
export default function NotificationPreview() {
  const theme = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { duration: 300 });
  }, [opacity, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: RADIUS,
          padding: 12,
          gap: 4,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 16, height: 16, borderRadius: 4 }} />
        <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '700' }}>Contraya</Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>now</Text>
      </View>
      <Text style={{ color: theme.foreground, fontSize: 13, fontWeight: '700' }}>A renewal is coming up</Text>
      <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>
        Renewal notice deadline for Apartment lease, 12 Palm Ave is in 9 days.
      </Text>
    </Animated.View>
  );
}
