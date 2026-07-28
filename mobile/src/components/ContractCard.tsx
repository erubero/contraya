import { Pressable, View, Text } from 'react-native';
import { Contract, ContractDate, CONTRACT_TYPE_LABELS } from '@/data/types';
import { nextDate } from '@/data/status';
import { useTheme, RADIUS } from '@/theme/colors';
import TypeIcon from './TypeIcon';
import StatusBadge from './StatusBadge';

export default function ContractCard({
  contract,
  dates = [],
  onPress,
}: {
  contract: Contract;
  dates?: ContractDate[];
  onPress: () => void;
}) {
  const theme = useTheme();
  const next = nextDate(dates);
  const subtitle = [
    CONTRACT_TYPE_LABELS[contract.contract_type],
    next ? next.label : contract.party_other ?? undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.card,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: RADIUS,
        padding: 14,
      }}
    >
      <TypeIcon type={contract.contract_type} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          {contract.title}
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {next ? <StatusBadge date={next.due_date} /> : null}
    </Pressable>
  );
}
