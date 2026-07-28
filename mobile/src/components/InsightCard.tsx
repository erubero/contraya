import { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS } from '@/theme/colors';

// A labeled card for presenting something Contry found or answered: a small
// uppercase header (with an optional icon), the content, and an optional
// footer below a divider. Used for the review screen's summary and the
// first turn of an Ask Contry answer, so both surfaces read as the same kind
// of moment instead of one being a plain bordered box and the other a chat
// bubble.
export default function InsightCard({
  label,
  icon,
  children,
  footer,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  footer?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon && <Ionicons name={icon} size={14} color={theme.primary} />}
        <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' }}>
          {label}
        </Text>
      </View>
      {typeof children === 'string' ? (
        <Text style={{ color: theme.foreground, fontSize: 15, lineHeight: 22 }}>{children}</Text>
      ) : (
        children
      )}
      {footer && (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginTop: 2 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{footer}</Text>
        </View>
      )}
    </View>
  );
}
