import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';

// Save confirmation banner (the Docusign pattern): a small green strip that
// drops in at the top of the screen and dismisses itself. The parent owns the
// message state; this component calls onDone when its time is up:
//
//   {toast && <Toast message={toast} onDone={() => setToast(null)} />}
//
// Render it as a sibling AFTER the screen's ScrollView, inside a flex:1 View,
// so it overlays content instead of scrolling with it.
export default function Toast({
  message,
  onDone,
  duration = 2500,
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  const theme = useTheme();

  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 10,
        left: 16,
        right: 16,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: theme.statusActiveBg,
          borderColor: theme.statusActive,
          borderWidth: 1,
          borderRadius: RADIUS,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Ionicons name="checkmark-circle" size={18} color={theme.statusActive} />
        <Text style={{ color: theme.statusActive, fontSize: 14, fontWeight: '600' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}
