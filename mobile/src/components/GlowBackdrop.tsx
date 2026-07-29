import { View, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/colors';
import { withOpacity } from '@/theme/withOpacity';

// A soft colored wash built from stacked translucent circles, standing in
// for a native gradient (expo-linear-gradient isn't installed). Caller
// positions it via `style` (usually absolute, behind other content) and
// picks a `size` for the outermost ring; inner rings shrink and darken
// toward the center for a glow rather than a flat tinted disc.
export default function GlowBackdrop({
  size = 320,
  color,
  style,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const base = color ?? theme.brand;
  const rings = [
    { scale: 1, alpha: 0.05 },
    { scale: 0.7, alpha: 0.09 },
    { scale: 0.42, alpha: 0.14 },
  ];
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      {rings.map((ring, i) => {
        const d = size * ring.scale;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              left: (size - d) / 2,
              top: (size - d) / 2,
              backgroundColor: withOpacity(base, ring.alpha),
            }}
          />
        );
      })}
    </View>
  );
}
