import { useEffect, useState } from 'react';
import {
  View, Text, Image, Pressable, TextInput, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { deleteAccount } from '@/api/account';
import { isConfigured } from '@/api/supabase';
import { uploadAvatar, getAvatarUrl } from '@/data/repo';
import { clearAll as clearScheduledReminders } from '@/lib/notifications';
import { downscaleAvatar } from '@/lib/downscale';
import { demo } from '@/lib/demo';
import { useTheme, RADIUS } from '@/theme/colors';
import AvatarCropper from '@/components/AvatarCropper';
import { SectionTitle, SettingsGroup, SettingsRow, SettingsNote, settingsCard } from '@/components/SettingsRow';

// Everything that belongs to the account itself: who you are, and the one
// button that erases all of it. Deletion lives here rather than on the
// Settings root so it is never a mis-tap away from the theme switcher.
export default function Account() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { email, userId, displayName, avatarPath, isDemo, updateProfile, signOut } = useAuth();

  const [name, setName] = useState(displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ uri: string; width: number; height: number } | null>(null);

  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName]);

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

  const onDeleteAccount = () =>
    Alert.alert('Delete your account?', 'Every contract and all account data will be permanently removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything',
        style: 'destructive',
        onPress: async () => {
          try {
            if (isConfigured) await deleteAccount();
            if (isDemo) demo.reset();
            // The row promises "erases every reminder": cancel everything
            // scheduled on this device before leaving.
            await clearScheduledReminders().catch(() => {});
            await signOut();
            queryClient.clear();
            router.replace('/signin');
          } catch {
            Alert.alert("Couldn't delete your account", 'Please try again or contact support.');
          }
        },
      },
    ]);

  const nameDirty = name.trim() !== (displayName ?? '');
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen options={{ title: 'Account' }} />

      <View style={[settingsCard(theme), { padding: 16, alignItems: 'center', gap: 12 }]}>
        <Pressable onPress={onChangeAvatar} style={{ position: 'relative' }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.accent }} />
          ) : (
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.brandText, fontSize: 34, fontWeight: '700' }}>{initial}</Text>
            </View>
          )}
          <View style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: theme.primary, borderRadius: 14, padding: 6, borderWidth: 2, borderColor: theme.card }}>
            {uploading ? (
              <ActivityIndicator size="small" color={theme.primaryForeground} />
            ) : (
              <Ionicons name="camera" size={14} color={theme.primaryForeground} />
            )}
          </View>
        </Pressable>
        <Pressable onPress={onChangeAvatar}>
          <Text style={{ color: theme.brandText, fontSize: 14, fontWeight: '600' }}>Change photo</Text>
        </Pressable>
      </View>

      <View>
        <SectionTitle>Display name</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={onSaveName}
            placeholder="Add your name"
            placeholderTextColor={theme.mutedForeground}
            style={{ flex: 1, borderColor: theme.border, borderWidth: 1, borderRadius: RADIUS, padding: 13, fontSize: 15, color: theme.foreground, backgroundColor: theme.card }}
          />
          {(nameDirty || savingName) && (
            <Pressable onPress={onSaveName} disabled={savingName} style={{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: RADIUS, backgroundColor: theme.primary }}>
              {savingName ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <Text style={{ color: theme.primaryForeground, fontWeight: '600' }}>Save</Text>
              )}
            </Pressable>
          )}
        </View>
        <SettingsNote>This is what Contry calls you. It is never shown to anyone else.</SettingsNote>
      </View>

      <View>
        <SectionTitle>Email</SectionTitle>
        <SettingsGroup>
          <SettingsRow icon="mail-outline" label={email ?? 'Not signed in'} showChevron={false} />
        </SettingsGroup>
        <SettingsNote>Your sign-in address. Contact support if you need to change it.</SettingsNote>
      </View>

      <View>
        <SectionTitle>Danger zone</SectionTitle>
        <SettingsGroup>
          <SettingsRow
            icon="trash-outline"
            label="Delete Account & Data"
            subtitle="Permanently erases every contract, document, and reminder."
            onPress={onDeleteAccount}
            destructive
            showChevron={false}
          />
        </SettingsGroup>
        <SettingsNote>This cannot be undone and there is no backup to restore from.</SettingsNote>
      </View>

      {cropTarget && (
        <AvatarCropper
          uri={cropTarget.uri}
          width={cropTarget.width}
          height={cropTarget.height}
          onCancel={() => setCropTarget(null)}
          onDone={(b64) => { setCropTarget(null); saveAvatar(b64); }}
        />
      )}
    </ScrollView>
  );
}
