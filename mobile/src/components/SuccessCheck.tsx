import LottieView from 'lottie-react-native';

// One-shot success checkmark. Parent decides what happens when it finishes.
export default function SuccessCheck({
  size = 120,
  onDone,
}: {
  size?: number;
  onDone?: () => void;
}) {
  return (
    <LottieView
      source={require('../../assets/animations/success-check.json')}
      autoPlay
      loop={false}
      onAnimationFinish={onDone}
      style={{ width: size, height: size }}
    />
  );
}
