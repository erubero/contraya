import { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/colors';

// In-screen title for tab screens (the tab navigator hides native headers).
export default function ScreenHeader({
  title,
  subtitle,
  right,
  padded = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode; // e.g. the avatar on the dashboard
  padded?: boolean; // false when the parent already pads horizontally
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: padded ? 16 : 0,
        paddingBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View>
        {subtitle ? (
          <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{subtitle}</Text>
        ) : null}
        <Text style={{ color: theme.foreground, fontSize: 28, fontWeight: '800' }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
