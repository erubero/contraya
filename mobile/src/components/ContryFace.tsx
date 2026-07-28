import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
// Relative path: the @/ alias only maps src/, in code and in jest alike.
import { MASCOT, MascotSlot } from '../../assets/mascot';

// Renders Contry's art for a slot (static image or looping Lottie), or the
// given icon until the owner wires art into the mascot registry. Consumers
// never know which one they got.
export default function ContryFace({
  slot,
  size,
  fallbackIcon,
  color,
}: {
  slot: MascotSlot;
  size: number;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  const art = MASCOT[slot];
  if (!art) {
    return <Ionicons name={fallbackIcon} size={size} color={color} />;
  }
  if (art.kind === 'lottie') {
    // pointerEvents none so the native Lottie view can never swallow taps
    // meant for a wrapping Pressable (the 22pt slot lives in SearchButton).
    return (
      <View pointerEvents="none" style={{ width: size, height: size }}>
        <LottieView source={art.source} autoPlay loop style={{ width: size, height: size }} />
      </View>
    );
  }
  return <Image source={art.source} style={{ width: size, height: size }} resizeMode="contain" />;
}
