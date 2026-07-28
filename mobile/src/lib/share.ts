import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { DocumentKind } from '@/data/documents';

// Downloads a document (a Supabase signed URL, or a demo-mode data: URI) to
// a local temp file, then hands it to the native share sheet so the user can
// send it to anyone (Messages, Mail, AirDrop) or save it themselves. No
// expo-media-library or Photos permission needed: the share sheet's own
// "Save Image"/"Save to Files" options cover that without the app touching
// the Photos API directly.
export async function shareRemoteFile(
  url: string,
  kind: DocumentKind,
  filenameStem: string
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device');

  const ext = kind === 'pdf' ? 'pdf' : 'jpg';
  const mimeType = kind === 'pdf' ? 'application/pdf' : 'image/jpeg';
  const localUri = `${FileSystem.cacheDirectory}${filenameStem}.${ext}`;

  if (url.startsWith('data:')) {
    const base64 = url.slice(url.indexOf(',') + 1);
    await FileSystem.writeAsStringAsync(localUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  } else {
    await FileSystem.downloadAsync(url, localUri);
  }

  await Sharing.shareAsync(localUri, { mimeType });
}
