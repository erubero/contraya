import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { deleteAccount } from '@/api/account';
import { isConfigured } from '@/api/supabase';
import { clearDeviceSchedules } from '@/lib/deviceSync';
import { clearAllDrafts } from '@/lib/draftStore';
import { demo } from '@/lib/demo';
import { useTheme, RADIUS } from '@/theme/colors';
import { settingsCard } from '@/components/SettingsRow';

// Deleting an account deserves a screen, not an alert (the Docusign Close
// Account pattern): who you are, exactly what happens, and a way out that is
// just as prominent as the way through. The busy state guards the double-tap
// the old alert allowed.
export default function DeleteAccount() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { email, displayName, isDemo, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const consequences = [
    'Every contract, document, date, obligation, and reminder is erased, including anything that arrived by email.',
    'The Contraya calendar is removed from this device, along with every event in it.',
    'Your private email-in address stops working immediately.',
    'This cannot be undone. There is no backup to restore from.',
    'If you want to use Contraya again, you will start over with a new account.',
  ];

  const onDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isConfigured) await deleteAccount();
      if (isDemo) demo.reset();
      // The promise on the row that led here: no reminder survives deletion,
      // and neither does the Contraya calendar. Leaving that behind would be a
      // straight breach of the line above, and on an iCloud calendar the
      // contract titles would still be sitting on the user's Mac.
      await clearDeviceSchedules().catch(() => {});
      await clearAllDrafts();
      await signOut();
      queryClient.clear();
      router.replace('/signin');
    } catch {
      setBusy(false);
      Alert.alert("Couldn't delete your account", 'Please try again or contact support.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
    >
      <Stack.Screen options={{ title: 'Delete Account' }} />

      <View style={[settingsCard(theme), { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Ionicons name="person-circle-outline" size={34} color={theme.mutedForeground} />
        <View style={{ flex: 1 }}>
          {displayName ? (
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
              {displayName}
            </Text>
          ) : null}
          <Text style={{ color: theme.mutedForeground, fontSize: 14 }} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.foreground, fontSize: 22, fontWeight: '800' }}>
          This is permanent
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>
          Before you decide, here is exactly what deleting your account does.
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {consequences.map((line) => (
          <View key={line} style={{ flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.destructive,
                marginTop: 7,
              }}
            />
            <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20, flex: 1 }}>
              {line}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 8 }}>
        <Pressable
          onPress={onDelete}
          disabled={busy}
          style={({ pressed }) => ({
            backgroundColor: theme.destructive,
            borderRadius: RADIUS,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: busy ? 0.7 : pressed ? 0.85 : 1,
          })}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
              Delete Everything
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          style={({ pressed }) => [
            settingsCard(theme),
            { paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>
            Keep My Account
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
