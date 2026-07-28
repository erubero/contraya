import { useMemo } from 'react';
import LottieView from 'lottie-react-native';

// Owner-supplied loading animations, bundled. One is picked per mount.
const animations = [
  require('../../assets/animations/loading-main.json'),
  require('../../assets/animations/loading-pulse-core.json'),
];

export default function LottieLoader({ size = 160 }: { size?: number }) {
  const source = useMemo(
    () => animations[Math.floor(Math.random() * animations.length)],
    []
  );
  return <LottieView source={source} autoPlay loop style={{ width: size, height: size }} />;
}
