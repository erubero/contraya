import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getAvatarUrl } from '@/data/repo';
import { demo } from '@/lib/demo';
import { useTheme, RADIUS } from '@/theme/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useTabBarClearance } from '@/components/TabBar';
import { usePurchases } from '@/lib/PurchasesContext';
import { purchasesConfigured, presentPaywall, restore, presentCustomerCenter } from '@/lib/purchases';
import { SectionTitle, SettingsGroup, SettingsRow, settingsCard } from '@/components/SettingsRow';

// The Settings root is a map, not a workbench. Every control that needs more
// than one line of explanation lives on its own screen; what stays here is the
// shortest list that still tells you where everything is. Account deletion
// moved into Account for the same reason: destructive things should not share
// a scroll with the theme switcher.
export default function Settings() {
  const theme = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { email, displayName, avatarPath, isDemo, signOut } = useAuth();
  const { isPro, refresh: refreshPro } = usePurchases();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }
    getAvatarUrl(avatarPath)
      .then((url) => { if (!cancelled) setAvatarUrl(url || null); })
      .catch(() => { if (!cancelled) setAvatarUrl(null); });
    return () => { cancelled = true; };
  }, [avatarPath]);

  const onSignOut = async () => {
    if (isDemo) demo.reset();
    await signOut();
    queryClient.clear();
    router.replace('/signin');
  };

  const onUpgrade = async () => { await presentPaywall(); await refreshPro(); };
  const onRestore = async () => {
    const ok = await restore();
    await refreshPro();
    Alert.alert(
      ok ? 'Purchases restored' : 'Nothing to restore',
      ok ? 'Your Contraya Premium access is active.' : 'We could not find an active subscription for this account.',
    );
  };

  const initial = (displayName || email || '?').trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: clearance, gap: 20 }}
    >
      <ScreenHeader title="Settings" padded={false} />

      {/* Profile hero: one tap into everything about the account itself. */}
      <Pressable
        onPress={() => router.push('/account')}
        style={({ pressed }) => [
          settingsCard(theme),
          { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.brandText, fontSize: 24, fontWeight: '700' }}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
            {displayName || 'Your account'}
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 1 }} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.mutedForeground} />
      </Pressable>

      {/* Premium stays on the root. It is the one surface that should not be
          one tap further away than it has to be. */}
      {purchasesConfigured && (
        <View>
          <SectionTitle>Contraya Premium</SectionTitle>
          {isPro ? (
            <SettingsGroup>
              <SettingsRow
                icon="checkmark-circle"
                label="Premium is active"
                subtitle="Thanks for supporting Contraya."
                showChevron={false}
              />
              <SettingsRow icon="card-outline" label="Manage Subscription" onPress={presentCustomerCenter} />
            </SettingsGroup>
          ) : (
            <View style={[settingsCard(theme), { padding: 16, gap: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="sparkles" size={20} color={theme.brandText} />
                <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: '700' }}>
                  More contracts, more answers
                </Text>
              </View>
              <Text style={{ color: theme.mutedForeground, fontSize: 14, lineHeight: 20 }}>
                Premium reads up to 15 contracts a month, answers up to 50 questions, and unlocks
                email forwarding.
              </Text>
              <Pressable
                onPress={onUpgrade}
                style={{ backgroundColor: theme.brand, borderRadius: RADIUS, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: theme.brandForeground, fontSize: 15, fontWeight: '700' }}>
                  Upgrade to Premium
                </Text>
              </Pressable>
              <Pressable onPress={onRestore} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ color: theme.brandText, fontSize: 14, fontWeight: '600' }}>
                  Restore purchases
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View>
        <SectionTitle>Preferences</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <SettingsRow
            icon="mail-open-outline"
            label="Email a contract in"
            onPress={() => router.push('/email-in')}
          />
          <SettingsRow
            icon="color-palette-outline"
            label="Appearance"
            onPress={() => router.push('/appearance')}
          />
        </SettingsGroup>
      </View>

      <View>
        <SectionTitle>Support</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="help-buoy-outline"
            label="Help & Support"
            onPress={() => router.push('/support')}
          />
          <SettingsRow
            icon="information-circle-outline"
            label="About"
            onPress={() => router.push('/about')}
          />
        </SettingsGroup>
      </View>

      <Pressable
        onPress={onSignOut}
        style={({ pressed }) => [
          settingsCard(theme),
          {
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={theme.foreground} />
        <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}
