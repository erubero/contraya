import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getAvatarUrl } from '@/data/repo';
import { releaseAccountState } from '@/lib/accountHandoff';
import { EMAIL_IN_ENABLED } from '@/lib/appMeta';
import { AI_DATA_SCREEN_TITLE } from '@/lib/legal';
import { demo } from '@/lib/demo';
import { useTheme, RADIUS } from '@/theme/colors';
import ScreenHeader from '@/components/ScreenHeader';
import { useTabBarClearance } from '@/components/TabBar';
import { usePurchases } from '@/lib/PurchasesContext';
import {
  purchasesConfigured, presentPaywall, restore, presentCustomerCenter, getAppUserId,
} from '@/lib/purchases';
import { PRO_MONTHLY_ANALYSES, PRO_MONTHLY_CHATS } from '@/lib/limits';
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

  // For the diagnostics footer. Re-read when entitlement state moves, since
  // that is exactly when an identity switch would have happened.
  const [appUserId, setAppUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getAppUserId().then((id) => { if (!cancelled) setAppUserId(id); });
    return () => { cancelled = true; };
  }, [isPro]);

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
    // The device must not keep firing this account's reminders after it
    // leaves, or keep its contract titles sitting in the Calendar app where
    // the next person to hold this phone can read them. The next sign-in
    // rebuilds both from that account's data. releaseAccountState owns the
    // order; the drafts clear takes no userId on purpose, because signOut()
    // nulls it and a per-account clear would become a silent no-op.
    await releaseAccountState(queryClient, async () => {
      if (isDemo) demo.reset();
      await signOut();
    });
    router.replace('/signin');
  };

  const onUpgrade = async () => { await presentPaywall(); await refreshPro(); };
  // Four outcomes, four honest messages. The old boolean told a user whose
  // receipt is bound to a DIFFERENT account that no subscription exists,
  // which is false, and it is precisely the user who most needs the truth.
  const onRestore = async () => {
    const outcome = await restore();
    await refreshPro();
    if (outcome === 'restored') {
      Alert.alert('Purchases restored', 'Your Contraya Premium access is active.');
    } else if (outcome === 'other-account') {
      Alert.alert(
        'Subscription found, but on another account',
        'This purchase is attached to a different Contraya account. Sign in with the account you subscribed on, or write to hello@usecontraya.com and we will sort it out.',
      );
    } else if (outcome === 'error') {
      Alert.alert("Couldn't reach the App Store", 'Please try again in a moment.');
    } else {
      Alert.alert('Nothing to restore', 'We could not find an active subscription for this account.');
    }
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
                {`Premium reads up to ${PRO_MONTHLY_ANALYSES} contracts a month and answers up to ${PRO_MONTHLY_CHATS} questions about them.`}
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
              {/* Deliberately shown to NON-subscribers too. Whoever needs to
                  check or cancel a subscription is often precisely the person
                  the entitlement check reads as free: bought on another
                  device, or under a different Apple Account. Gating this
                  behind isPro hides it from the only people who need it. The
                  Customer Center handles "no subscription" on its own, and
                  falls back to Apple's native subscriptions page. */}
              <Pressable onPress={presentCustomerCenter} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ color: theme.mutedForeground, fontSize: 14, fontWeight: '600' }}>
                  Manage Subscription
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
          {/* Guideline 5.1.2(i): consent given in the analysis sheet has to be
              revocable somewhere findable, and the privacy policy names this
              exact path. */}
          <SettingsRow
            icon="cloud-upload-outline"
            label={AI_DATA_SCREEN_TITLE}
            onPress={() => router.push('/ai-data')}
          />
          {/* iOS only (EventKit), and hidden in demo mode: the sample
              contracts are fabricated, and writing them into somebody's real
              calendar to show off a feature would be indefensible. */}
          {Platform.OS === 'ios' && !isDemo ? (
            <SettingsRow
              icon="calendar-outline"
              label="Apple Calendar"
              onPress={() => router.push('/calendar-sync')}
            />
          ) : null}
          {/* The only doorway to email-in. Off for 1.0 because the worker
              that receives the mail is not deployed; see EMAIL_IN_ENABLED. */}
          {EMAIL_IN_ENABLED ? (
            <SettingsRow
              icon="mail-open-outline"
              label="Email a contract in"
              onPress={() => router.push('/email-in')}
            />
          ) : null}
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
        <Ionicons name="log-out-outline" size={20} color={theme.destructive} />
        <Text style={{ color: theme.destructive, fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
      </Pressable>

      {/* Diagnostics footer. The store identity line exists because the last
          billing bug turned entirely on WHICH App User ID was live, and there
          was no way to see it without a debugger: Apple said subscribed,
          RevenueCat said no, and the difference was invisible on device. The
          id is the user's own account id, not a secret. */}
      <View style={{ alignItems: 'center', gap: 2, paddingTop: 4 }}>
        <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
          {`Contraya ${Constants.expoConfig?.version ?? ''} (${Constants.expoConfig?.ios?.buildNumber ?? ''})`}
        </Text>
        {appUserId ? (
          <Text style={{ color: theme.mutedForeground, fontSize: 10 }} numberOfLines={1}>
            {`Store identity: ${appUserId}`}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
