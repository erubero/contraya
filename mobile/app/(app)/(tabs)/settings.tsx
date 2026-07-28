import { useEffect, useState } from 'react';
import {
  View, Text, Image, Switch, Pressable, TextInput, Alert, Share, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { deleteAccount } from '@/api/account';
import { isConfigured } from '@/api/supabase';
import {
  remindersEnabled, setRemindersEnabled, disableAndClear, requestPermission, rebuildAll,
} from '@/lib/notifications';
import { listAllDates, uploadAvatar, getAvatarUrl } from '@/data/repo';
import { downscaleAvatar } from '@/lib/downscale';
import { demo } from '@/lib/demo';
import { APP_VERSION, SUPPORT_EMAIL, HELP_URL, TERMS_URL, PRIVACY_URL, SHARE_MESSAGE } from '@/lib/appMeta';
import { useTheme, RADIUS, Palette } from '@/theme/colors';
import AvatarCropper from '@/components/AvatarCropper';
import ScreenHeader from '@/components/ScreenHeader';
import { useTabBarClearance } from '@/components/TabBar';
import { useThemePreference, ThemePreference } from '@/theme/ThemeContext';
import { usePurchases } from '@/lib/PurchasesContext';
import { purchasesConfigured, presentPaywall, restore, presentCustomerCenter } from '@/lib/purchases';

export default function Settings() {
  const theme = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { email, userId, displayName, avatarPath, isDemo, updateProfile, signOut } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const { isPro, refresh: refreshPro } = usePurchases();

  const [reminders, setReminders] = useState(true);
  const [name, setName] = useState(displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    remindersEnabled().then(setReminders);
  }, []);

  // Keep the name field in sync when the stored value changes.
  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName]);

  // Resolve the avatar path to a displayable URL (signed URL in live mode).
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

  const toggleReminders = async (value: boolean) => {
    setReminders(value);
    if (value) {
      await setRemindersEnabled(true);
      await requestPermission();
      await listAllDates()
        .then((all) => rebuildAll(all.map((d) => ({ date: d, contractTitle: d.contracts.title }))))
        .catch(() => {});
    } else {
      await disableAndClear();
    }
  };

  const pickAvatar = async (source: 'camera' | 'library') => {
    const picker =
      source === 'camera'
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;
    const perm = await picker();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to set a profile picture.');
      return;
    }
    const launch =
      source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    // No allowsEditing: the in-app AvatarCropper replaces the OS crop screen.
    const result = await launch({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled) return;
    const asset = result.assets[0];

    if (asset.width && asset.height) {
      setCropTarget({ uri: asset.uri, width: asset.width, height: asset.height });
      return;
    }
    // Missing dimensions (shouldn't happen): fall back to a plain downscale.
    await saveAvatar(await downscaleAvatar(asset.uri, asset.width, asset.height));
  };

  const saveAvatar = async (b64: string) => {
    setUploading(true);
    try {
      const uid = userId ?? 'demo-user';
      const path = await uploadAvatar(b64, uid);
      await updateProfile({ avatarPath: path });
    } catch {
      Alert.alert("Couldn't update your photo", 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onCroppedAvatar = (b64: string) => {
    setCropTarget(null);
    saveAvatar(b64);
  };

  const onChangeAvatar = () => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Take Photo', onPress: () => pickAvatar('camera') },
      { text: 'Choose from Library', onPress: () => pickAvatar('library') },
    ];
    if (avatarPath) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: async () => { await updateProfile({ avatarPath: null }); },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile picture', undefined, options);
  };

  const onSaveName = async () => {
    const trimmed = name.trim();
    if (trimmed === (displayName ?? '')) return;
    setSavingName(true);
    try {
      await updateProfile({ displayName: trimmed });
    } catch {
      Alert.alert("Couldn't save your name", 'Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const onSignOut = async () => {
    if (isDemo) demo.reset();
    await signOut();
    queryClient.clear();
    router.replace('/signin');
  };

  const onDeleteAccount = () =>
    Alert.alert('Delete your account?', 'Every contract and all account data will be permanently removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isConfigured) await deleteAccount();
            await onSignOut();
          } catch {
            Alert.alert("Couldn't delete your account", 'Please try again or contact support.');
          }
        },
      },
    ]);

  const onRate = async () => {
    try {
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
      } else {
        Alert.alert('Thanks!', 'Rating will be available once Contraya is on the store.');
      }
    } catch {
      // Non-fatal; the review prompt is best-effort.
    }
  };

  const onShare = () => Share.share({ message: SHARE_MESSAGE }).catch(() => {});
  const openUrl = (url: string) => Linking.openURL(url).catch(() => {});
  const contactSupport = () => openUrl(`mailto:${SUPPORT_EMAIL}?subject=Contraya%20Support`);

  const onUpgrade = async () => { await presentPaywall(); await refreshPro(); };
  const onRestore = async () => {
    const ok = await restore();
    await refreshPro();
    Alert.alert(
      ok ? 'Purchases restored' : 'Nothing to restore',
      ok ? 'Your Contraya Premium access is active.' : 'We could not find an active subscription for this account.',
    );
  };

  const nameDirty = name.trim() !== (displayName ?? '');
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: clearance, gap: 20 }}>
      <ScreenHeader title="Settings" padded={false} />
      {/* Profile */}
      <View style={cardStyle(theme)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={onChangeAvatar} style={{ position: 'relative' }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.accent }} />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.primary, fontSize: 26, fontWeight: '700' }}>{initial}</Text>
              </View>
            )}
            <View style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: theme.primary, borderRadius: 12, padding: 4, borderWidth: 2, borderColor: theme.card }}>
              {uploading ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <Ionicons name="camera" size={13} color={theme.primaryForeground} />
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>Signed in as</Text>
            <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '500' }} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 14 }} />

        <Text style={{ color: theme.foreground, fontWeight: '600', fontSize: 14, marginBottom: 6 }}>Display name</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={onSaveName}
            placeholder="Add your name"
            placeholderTextColor={theme.mutedForeground}
            style={{ flex: 1, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 12, fontSize: 15, color: theme.foreground, backgroundColor: theme.background }}
          />
          {(nameDirty || savingName) && (
            <Pressable onPress={onSaveName} disabled={savingName} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS, backgroundColor: theme.primary }}>
              {savingName ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <Text style={{ color: theme.primaryForeground, fontWeight: '600' }}>Save</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Contraya Premium */}
      {purchasesConfigured && (
        <View>
          <SectionTitle theme={theme}>Contraya Premium</SectionTitle>
          {isPro ? (
            <View style={[cardStyle(theme), { padding: 0, overflow: 'hidden' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <Ionicons name="checkmark-circle" size={22} color={theme.statusActive} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '600' }}>Premium is active</Text>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>Thanks for supporting Contraya.</Text>
                </View>
              </View>
              <Divider theme={theme} />
              <LinkRow theme={theme} icon="card-outline" label="Manage Subscription" onPress={presentCustomerCenter} />
            </View>
          ) : (
            <View style={[cardStyle(theme), { padding: 0, overflow: 'hidden' }]}>
              <LinkRow theme={theme} icon="sparkles-outline" label="Upgrade to Contraya Premium" onPress={onUpgrade} />
              <Divider theme={theme} />
              <LinkRow theme={theme} icon="refresh-outline" label="Restore Purchases" onPress={onRestore} />
            </View>
          )}
        </View>
      )}

      {/* Notifications */}
      <View>
        <SectionTitle theme={theme}>Notifications</SectionTitle>
        <View style={[cardStyle(theme), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '500' }}>Contract reminders</Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 2 }}>
              We remind you before payments, renewals, and notice deadlines.
            </Text>
          </View>
          <Switch value={reminders} onValueChange={toggleReminders} />
        </View>
      </View>

      {/* Appearance */}
      <View>
        <SectionTitle theme={theme}>Appearance</SectionTitle>
        <View style={cardStyle(theme)}>
          <ThemeSegmented theme={theme} value={preference} onChange={setPreference} />
        </View>
      </View>

      {/* About */}
      <View>
        <SectionTitle theme={theme}>About</SectionTitle>
        <View style={[cardStyle(theme), { padding: 0, overflow: 'hidden' }]}>
          <LinkRow theme={theme} icon="star-outline" label="Rate Contraya" onPress={onRate} />
          <Divider theme={theme} />
          <LinkRow theme={theme} icon="share-outline" label="Share Contraya" onPress={onShare} />
          <Divider theme={theme} />
          <LinkRow theme={theme} icon="help-circle-outline" label="Help Center" onPress={() => openUrl(HELP_URL)} />
          <Divider theme={theme} />
          <LinkRow theme={theme} icon="mail-outline" label="Contact Support" onPress={contactSupport} />
          <Divider theme={theme} />
          <LinkRow theme={theme} icon="reader-outline" label="About These Summaries" onPress={() => router.push('/about-summaries')} />
          <Divider theme={theme} />
          <LinkRow theme={theme} icon="document-text-outline" label="Terms of Service" onPress={() => openUrl(TERMS_URL)} />
          <Divider theme={theme} />
          <LinkRow theme={theme} icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => openUrl(PRIVACY_URL)} />
          <Divider theme={theme} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="information-circle-outline" size={20} color={theme.mutedForeground} />
              <Text style={{ color: theme.foreground, fontSize: 15 }}>Version</Text>
            </View>
            <Text style={{ color: theme.mutedForeground, fontSize: 15 }}>{APP_VERSION}</Text>
          </View>
        </View>
      </View>

      {/* Sign out */}
      <Pressable
        onPress={onSignOut}
        style={[cardStyle(theme), { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
      >
        <Ionicons name="log-out-outline" size={20} color={theme.foreground} />
        <Text style={{ color: theme.foreground, fontSize: 15, fontWeight: '500' }}>Sign Out</Text>
      </Pressable>

      {/* Danger zone */}
      <View style={{ gap: 8 }}>
        <SectionTitle theme={theme}>Danger Zone</SectionTitle>
        <Pressable
          onPress={onDeleteAccount}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.statusExpiredBg, borderRadius: RADIUS, padding: 14 }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.destructive} />
          <Text style={{ color: theme.destructive, fontSize: 15, fontWeight: '600' }}>Delete Account & Data</Text>
        </Pressable>
      </View>
      {cropTarget && (
        <AvatarCropper
          uri={cropTarget.uri}
          width={cropTarget.width}
          height={cropTarget.height}
          onCancel={() => setCropTarget(null)}
          onDone={onCroppedAvatar}
        />
      )}
    </ScrollView>
  );
}

const cardStyle = (theme: Palette) => ({
  backgroundColor: theme.card,
  borderColor: theme.border,
  borderWidth: 1,
  borderRadius: RADIUS,
  padding: 14,
});

function SectionTitle({ theme, children }: { theme: Palette; children: string }) {
  return (
    <Text style={{ color: theme.mutedForeground, fontSize: 12, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8, marginLeft: 2 }}>
      {children}
    </Text>
  );
}

function Divider({ theme }: { theme: Palette }) {
  return <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 46 }} />;
}

function LinkRow({
  theme, icon, label, onPress,
}: {
  theme: Palette;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: pressed ? theme.accent : 'transparent' })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={20} color={theme.primary} />
        <Text style={{ color: theme.foreground, fontSize: 15 }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}

function ThemeSegmented({
  theme, value, onChange,
}: {
  theme: Palette;
  value: ThemePreference;
  onChange: (v: ThemePreference) => void;
}) {
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 4 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: RADIUS - 4, alignItems: 'center', backgroundColor: active ? theme.primary : 'transparent' }}
          >
            <Text style={{ color: active ? theme.primaryForeground : theme.mutedForeground, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
