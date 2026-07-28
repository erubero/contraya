import { supabase } from '@/api/supabaseClient';

export async function listWarranties() {
  const { data, error } = await supabase
    .from('warranties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getWarranty(id) {
  const { data, error } = await supabase
    .from('warranties')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createWarranty(warranty) {
  const { data, error } = await supabase
    .from('warranties')
    .insert(warranty)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Takes the full row so the attached receipt can be cleaned up with it.
export async function deleteWarranty(warranty) {
  const { error } = await supabase
    .from('warranties')
    .delete()
    .eq('id', warranty.id);
  if (error) throw error;

  if (warranty.receipt_path) {
    // Best effort: the row is already gone, a stray file is not worth failing over.
    await supabase.storage.from('receipts').remove([warranty.receipt_path]);
  }
}

export async function uploadReceipt(file, userId) {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('receipts').upload(path, file);
  if (error) throw error;
  return path;
}

export async function getReceiptUrl(path) {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const SCAN_MAX_EDGE = 2048;
const SCAN_MAX_RAW_BYTES = 5 * 1024 * 1024;

// Downscale the photo to a reasonable size before sending it for reading.
// Falls back to the raw file when the browser can't decode it into a canvas.
async function prepareScanImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SCAN_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) {
      return { image: await fileToBase64(blob), mediaType: 'image/jpeg' };
    }
  } catch {
    // Fall through to the raw file below.
  }

  if (file.size > SCAN_MAX_RAW_BYTES) {
    throw new Error('image-too-large');
  }
  return { image: await fileToBase64(file), mediaType: file.type };
}

export async function extractReceipt(file) {
  const { image, mediaType } = await prepareScanImage(file);
  const { data, error } = await supabase.functions.invoke('extract-receipt', {
    body: { image, media_type: mediaType },
  });
  if (error) throw error;
  return data.extracted;
}
