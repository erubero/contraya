import { Children, ReactNode, isValidElement } from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, RADIUS, Palette } from '@/theme/colors';

// Shared chrome for the Settings tab and its six sub-screens. Everything here
// exists so a row looks and behaves identically wherever it appears: one
// definition of a card, a group, a tappable row, and a toggle row.

export const settingsCard = (theme: Palette) => ({
  backgroundColor: theme.card,
  borderColor: theme.border,
  borderWidth: 1,
  borderRadius: RADIUS,
});

export function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.mutedForeground,
        fontSize: 12,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.4,
        marginBottom: 8,
        marginLeft: 2,
      }}
    >
      {children}
    </Text>
  );
}

// A card that draws its own hairlines between children, so call sites list
// rows without hand-placing dividers (the old settings screen had 7 of them
// interleaved by hand, which is exactly how one goes missing).
export function SettingsGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[settingsCard(theme), { overflow: 'hidden' }]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 50 }} />}
          {child}
        </View>
      ))}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  subtitle,
  value,
  onPress,
  destructive = false,
  showChevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  const theme = useTheme();
  const tint = destructive ? theme.destructive : theme.brandText;
  const labelColor = destructive ? theme.destructive : theme.foreground;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: subtitle ? 12 : 14,
        minHeight: 52,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Ionicons name={icon} size={20} color={tint} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: labelColor, fontSize: 15, fontWeight: destructive ? '600' : '400' }}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? (
          <Text style={{ color: theme.mutedForeground, fontSize: 15 }}>{value}</Text>
        ) : null}
        {onPress && showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={theme.mutedForeground} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? theme.accent : 'transparent' })}
    >
      {body}
    </Pressable>
  );
}

export function SettingsSwitchRow({
  icon,
  label,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        minHeight: 52,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Ionicons name={icon} size={20} color={theme.brandText} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '500' }}>{label}</Text>
          {subtitle ? (
            <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

// Explanatory paragraph under a group. Sub-screens lean on this: with one
// control per screen there is room to say why it exists.
export function SettingsNote({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.mutedForeground,
        fontSize: 13,
        lineHeight: 19,
        marginTop: 8,
        marginHorizontal: 2,
      }}
    >
      {children}
    </Text>
  );
}
