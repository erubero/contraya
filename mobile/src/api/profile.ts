import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase } from './supabase';

// Profile lives in Supabase auth user_metadata (display_name + avatar_path),
// so there is no extra table. The avatar image itself is stored in the private
// `avatars` bucket under the owner's folder, mirroring the receipts pattern.

export type ProfilePatch = { displayName?: string; avatarPath?: string | null };

export async function updateProfile(patch: ProfilePatch): Promise<void> {
  const data: Record<string, unknown> = {};
  if (patch.displayName !== undefined) data.display_name = patch.displayName;
  if (patch.avatarPath !== undefined) data.avatar_path = patch.avatarPath;
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}

// Uploads a base64 JPEG (from the downscale step) to a NEW path every time.
//
// The filename carries a timestamp on purpose, and changing this back to one
// stable "avatar.jpg" key would quietly break avatar updates app-wide. The
// path is not just a locator: avatar_path in auth metadata is the ONLY change
// signal the UI has. With a fixed key the new metadata equals the old string,
// setAvatarPath() bails under Object.is, none of the [avatarPath] effects
// re-run, and every screen keeps the signed URL it minted at mount — the old
// photo, until the app restarts. A changed path also gives the Supabase CDN
// (default max-age 3600, keyed on object path) and RN's URL-keyed image cache
// a key they have never seen, so the fresh bytes cannot be cached over.
export async function uploadAvatar(base64: string, userId: string): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decodeBase64(base64), {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  // One avatar object per user is still the contract; the versioned name only
  // exists to make the change visible. Best-effort: a failed cleanup must
  // never fail a save that already succeeded, so this swallows everything.
  // Also sweeps the legacy fixed-key avatar.jpg and any orphan a previous
  // Remove Photo left behind.
  await removeAvatarObjects(userId, path).catch(() => {});
  return path;
}

// Deletes every object in the user's avatars folder except `keep`. The bucket
// RLS policies gate on the folder, not the filename, so no migration was
// needed for the versioned names.
export async function removeAvatarObjects(userId: string, keep?: string): Promise<void> {
  const { data, error } = await supabase.storage.from('avatars').list(userId);
  if (error) throw error;
  const stale = (data ?? [])
    .map((o) => `${userId}/${o.name}`)
    .filter((p) => p !== keep);
  if (stale.length === 0) return;
  const { error: removeError } = await supabase.storage.from('avatars').remove(stale);
  if (removeError) throw removeError;
}

export async function getAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
