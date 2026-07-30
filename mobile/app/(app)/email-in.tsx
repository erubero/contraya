import { View, Text, Pressable, Share, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { getIngestAddress } from '@/data/repo';
import { useTheme, RADIUS } from '@/theme/colors';
import { SectionTitle, SettingsNote, settingsCard } from '@/components/SettingsRow';

// Contracts arrive by email far more often than they arrive as a file on a
// phone, so this address is a real feature and deserves the room to explain
// itself: what it does, what it costs, and why it should be guarded.
export default function EmailIn() {
  const theme = useTheme();
  const { data: ingestAddress, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['ingest-address'],
    queryFn: getIngestAddress,
    staleTime: Infinity,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'Email a contract in' }} />

      <View style={[settingsCard(theme), { padding: 16, gap: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="mail-open-outline" size={22} color={theme.brandText} />
          <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>
            Forward it, and it is here
          </Text>
        </View>
        <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>
          Send any contract to your private address and it lands on your dashboard, ready for Contry
          to read. PDF attachments up to 10 MB.
        </Text>
      </View>

      <View>
        <SectionTitle>Your private address</SectionTitle>
        <View style={[settingsCard(theme), { padding: 14 }]}>
          {isLoading || isRefetching ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <ActivityIndicator size="small" color={theme.mutedForeground} />
              <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>
                Your address is being set up.
              </Text>
            </View>
          ) : isError ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20 }}>
                Couldn't set up your address. This usually means the connection dropped; your
                address is waiting on the server, not lost.
              </Text>
              <Pressable
                onPress={() => refetch()}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  borderColor: theme.brandText,
                  borderWidth: 1,
                  borderRadius: RADIUS - 4,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: theme.brandText, fontSize: 14, fontWeight: '700' }}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : ingestAddress ? (
            <>
              <Text
                selectable
                style={{
                  color: theme.foreground,
                  fontSize: 15,
                  fontWeight: '600',
                  padding: 12,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: RADIUS - 4,
                }}
              >
                {ingestAddress}
              </Text>
              <Pressable
                onPress={() => Share.share({ message: ingestAddress }).catch(() => {})}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}
              >
                <Ionicons name="share-outline" size={16} color={theme.brandText} />
                <Text style={{ color: theme.brandText, fontWeight: '600', fontSize: 14 }}>
                  Share address
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>
              Your address is being set up.
            </Text>
          )}
        </View>
        <SettingsNote>Long press the address to copy it.</SettingsNote>
      </View>

      <View>
        <SectionTitle>Two things to know</SectionTitle>
        <View style={[settingsCard(theme), { padding: 14, gap: 14 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Ionicons name="key-outline" size={20} color={theme.statusExpiring} />
            <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19, flex: 1 }}>
              Anyone who has this address can put documents in your inbox, so treat it like a key.
              Share it with forwarding rules and people you trust, not publicly.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Ionicons name="wallet-outline" size={20} color={theme.brandText} />
            <Text style={{ color: theme.mutedForeground, fontSize: 13, lineHeight: 19, flex: 1 }}>
              Arriving in your inbox is free. A document only counts against your plan when you
              choose to have it read.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
