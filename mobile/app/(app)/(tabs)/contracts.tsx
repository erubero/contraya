import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { listContracts, listAllDates } from '@/data/repo';
import { searchContracts } from '@/data/search';
import { ContractStatus } from '@/data/types';
import { useSearch } from '@/lib/SearchContext';
import { useTheme } from '@/theme/colors';
import ScreenHeader from '@/components/ScreenHeader';
import SearchButton from '@/components/SearchButton';
import { useTabBarClearance } from '@/components/TabBar';
import ContractCard from '@/components/ContractCard';
import ContryFace from '@/components/ContryFace';
import LottieLoader from '@/components/LottieLoader';

type Filter = 'all' | ContractStatus;

const CHIPS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'ended', label: 'Ended' },
  { key: 'archived', label: 'Archived' },
];

export default function Contracts() {
  const theme = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  // The search query lives in the island tab bar (SearchContext).
  const { query } = useSearch();
  const [filter, setFilter] = useState<Filter>('all');

  // Consume the one-shot filter deep-link from the Dashboard tiles.
  useEffect(() => {
    const incoming = params.filter;
    if (incoming === 'active' || incoming === 'ended' || incoming === 'archived') {
      setFilter(incoming);
      router.setParams({ filter: undefined });
    }
  }, [params.filter, router]);

  const { data: contracts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['contracts'],
    queryFn: listContracts,
  });
  const { data: allDates = [] } = useQuery({
    queryKey: ['contract-dates'],
    queryFn: listAllDates,
  });

  const filtered = useMemo(() => {
    const searched = searchContracts(contracts, query);
    if (filter === 'all') return searched;
    return searched.filter((c) => c.status === filter);
  }, [contracts, query, filter]);

  const searching = query.trim() !== '';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader title="Contracts" right={<SearchButton />} />
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: clearance, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CHIPS.map((c) => {
                const active = filter === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setFilter(c.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: active ? theme.primary : theme.card,
                      borderColor: active ? theme.primary : theme.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : theme.mutedForeground,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {searching && filtered.length > 0 && (
              <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: '600' }}>
                {filtered.length === 1 ? 'Contry found 1 match' : `Contry found ${filtered.length} matches`}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ContractCard
            contract={item}
            dates={allDates.filter((d) => d.contract_id === item.id)}
            onPress={() => router.push(`/contract/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <LottieLoader size={120} />
            </View>
          ) : contracts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 64, gap: 8 }}>
              <Ionicons name="document-text-outline" size={40} color={theme.mutedForeground} />
              <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '600' }}>
                No contracts yet
              </Text>
              <Text style={{ color: theme.mutedForeground, textAlign: 'center', maxWidth: 280 }}>
                Tap the + button below to add your first contract. Upload the PDF or photograph the
                pages and Contry reads it for you.
              </Text>
            </View>
          ) : searching ? (
            <View style={{ alignItems: 'center', paddingVertical: 64, gap: 8 }}>
              <ContryFace slot="search-empty" size={64} fallbackIcon="search" color={theme.mutedForeground} />
              <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '600' }}>
                Contry came up empty
              </Text>
              <Text style={{ color: theme.mutedForeground, textAlign: 'center', maxWidth: 280 }}>
                No matches for "{query.trim()}". Contry checks titles, parties, types, summaries,
                and notes. Try fewer words or a different spelling.
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 64, gap: 8 }}>
              <Ionicons name="document-text-outline" size={40} color={theme.mutedForeground} />
              <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '600' }}>
                Nothing here
              </Text>
              <Text style={{ color: theme.mutedForeground, textAlign: 'center', maxWidth: 280 }}>
                Try a different filter.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
