import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CropRect } from '@/lib/cropRect';

// Receipts keep detail for the vision model; avatars can be tiny.
const RECEIPT_MAX_EDGE = 2048;
const AVATAR_MAX_EDGE = 512;

// Resize the longest edge to at most maxEdge and return a base64 JPEG. This
// keeps uploads small and well under the storage/edge-function size caps.
export async function downscaleToBase64(
  uri: string,
  width: number,
  height: number,
  maxEdge: number = RECEIPT_MAX_EDGE
): Promise<string> {
  const longest = Math.max(width, height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const actions =
    scale < 1
      ? [{ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } }]
      : [];
  const result = await manipulateAsync(uri, actions, {
    compress: 0.8,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return result.base64 ?? '';
}

// Convenience wrapper for profile pictures.
export function downscaleAvatar(uri: string, width: number, height: number): Promise<string> {
  return downscaleToBase64(uri, width, height, AVATAR_MAX_EDGE);
}

// Crop (from the avatar cropper's rect) then cap at avatar size, one pass.
export async function cropAvatarToBase64(uri: string, rect: CropRect): Promise<string> {
  const actions = [
    { crop: rect },
    ...(rect.width > AVATAR_MAX_EDGE
      ? [{ resize: { width: AVATAR_MAX_EDGE, height: AVATAR_MAX_EDGE } }]
      : []),
  ];
  const result = await manipulateAsync(uri, actions, {
    compress: 0.8,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return result.base64 ?? '';
}
