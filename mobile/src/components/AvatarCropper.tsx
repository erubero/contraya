import { useState } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/colors';
import { clamp, coverScale, maxTranslate, cropRect } from '@/lib/cropRect';
import { cropAvatarToBase64 } from '@/lib/downscale';

// Full-screen circular avatar cropper: pinch to zoom (1..4x, center-anchored),
// drag to pan, both hard-clamped live so the photo always covers the circle.
// Save converts the gesture state to a source-pixel rect (cropRect, unit
// tested) and hands back a 512px JPEG base64 ready for uploadAvatar.
// Like ImageViewer, the surface is black in both themes.
export default function AvatarCropper({
  uri,
  width,
  height,
  onCancel,
  onDone,
}: {
  uri: string;
  width: number;
  height: number;
  onCancel: () => void;
  onDone: (base64: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [processing, setProcessing] = useState(false);

  const cropSize = screenW - 64;
  const base = coverScale(width, height, cropSize);
  const dispW = width * base;
  const dispH = height * base;
  // The border IS the scrim; its transparent inner circle is the crop hole.
  const scrimBorder = Math.max(screenW, screenH);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const m = maxTranslate(width, height, cropSize, scale.value);
      tx.value = clamp(startTx.value + e.translationX, -m.x, m.x);
      ty.value = clamp(startTy.value + e.translationY, -m.y, m.y);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, 1, 4);
      // Zooming out shrinks the legal pan range; keep the circle covered.
      const m = maxTranslate(width, height, cropSize, scale.value);
      tx.value = clamp(tx.value, -m.x, m.x);
      ty.value = clamp(ty.value, -m.y, m.y);
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  // Order is load-bearing: scale last means it happens around the image
  // center, so translations stay in unscaled screen points (cropRect math).
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const onSave = async () => {
    setProcessing(true);
    try {
      const rect = cropRect({
        imageWidth: width,
        imageHeight: height,
        cropSize,
        scale: scale.value,
        translateX: tx.value,
        translateY: ty.value,
      });
      onDone(await cropAvatarToBase64(uri, rect));
    } catch {
      Alert.alert("Couldn't crop your photo", 'Please try again.');
      setProcessing(false);
    }
  };

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onCancel}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
        <GestureDetector gesture={gesture}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.Image
              source={{ uri }}
              style={[{ width: dispW, height: dispH }, imageStyle]}
              resizeMode="cover"
            />
          </View>
        </GestureDetector>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: cropSize + scrimBorder * 2,
              height: cropSize + scrimBorder * 2,
              borderRadius: (cropSize + scrimBorder * 2) / 2,
              borderWidth: scrimBorder,
              borderColor: 'rgba(0, 0, 0, 0.6)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: cropSize,
              height: cropSize,
              borderRadius: cropSize / 2,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.6)',
            }}
          />
        </View>
        <Text
          style={{
            position: 'absolute',
            top: insets.top + 8,
            alignSelf: 'center',
            color: '#FFFFFF',
            fontSize: 17,
            fontWeight: '600',
          }}
        >
          Adjust your photo
        </Text>
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: 24,
            right: 24,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={onCancel}
            disabled={processing}
            accessibilityRole="button"
            style={{
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              opacity: processing ? 0.5 : 1,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            disabled={processing}
            accessibilityRole="button"
            style={{
              paddingHorizontal: 28,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: theme.primary,
              opacity: processing ? 0.7 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {processing && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Save</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
