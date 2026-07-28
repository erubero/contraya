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

// Uploads a base64 JPEG (from the downscale step) to a stable path so each user
// keeps exactly one avatar object, overwritten in place on change.
export async function uploadAvatar(base64: string, userId: string): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, decodeBase64(base64), {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function getAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
