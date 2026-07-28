import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractType } from '@/data/types';
import { useTheme } from '@/theme/colors';

const iconMap: Record<ContractType, keyof typeof Ionicons.glyphMap> = {
  lease: 'home-outline',
  freelance: 'briefcase-outline',
  vendor: 'storefront-outline',
  phone_internet: 'wifi-outline',
  subscription: 'repeat-outline',
  wedding_event: 'heart-outline',
  insurance: 'umbrella-outline',
  employment: 'id-card-outline',
  other: 'document-text-outline',
};

export default function TypeIcon({
  type,
  size = 'md',
}: {
  type: ContractType | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const box = size === 'lg' ? 56 : size === 'sm' ? 32 : 44;
  const glyph = size === 'lg' ? 28 : size === 'sm' ? 16 : 22;
  const name = iconMap[type ?? 'other'] ?? iconMap.other;

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 12,
        backgroundColor: theme.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={glyph} color={theme.primary} />
    </View>
  );
}
