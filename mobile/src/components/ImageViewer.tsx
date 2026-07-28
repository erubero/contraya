import { Modal, View, Image, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Full-screen image viewer. ScrollView zoom is native on iOS (pinch and
// double-tap), which keeps this dependency-free; if Android ever ships,
// swap the internals for a gesture-handler pinch without changing the API.
export default function ImageViewer({
  url,
  visible,
  onClose,
  onShare,
}: {
  url: string;
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ width, height }}
          minimumZoomScale={1}
          maximumZoomScale={4}
          centerContent
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <Image source={{ uri: url }} style={{ width, height }} resizeMode="contain" />
        </ScrollView>
        {onShare && (
          <Pressable
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Share"
            hitSlop={12}
            style={{
              position: 'absolute',
              top: insets.top + 8,
              right: 64,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </Pressable>
        )}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}
