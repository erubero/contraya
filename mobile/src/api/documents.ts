import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { ContractDocument, buildDocumentPath } from '@/data/documents';

// Documents live in the private `documents` bucket, whose per-user folder RLS
// covers them (paths are `${uid}/...`). Uploads are always base64 →
// ArrayBuffer: passing an RN Blob to supabase-js is the classic silent
// 0-byte-upload bug, so never "simplify" this to fetch(uri).blob().

export async function listDocuments(contractId: string): Promise<ContractDocument[]> {
  const { data, error } = await supabase
    .from('contract_documents')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContractDocument[];
}

async function insertRow(
  contractId: string,
  path: string,
  kind: 'image' | 'pdf',
  label: string | null,
  pageNumber: number | null
): Promise<ContractDocument> {
  const { data, error } = await supabase
    .from('contract_documents')
    .insert({ contract_id: contractId, storage_path: path, kind, label, page_number: pageNumber })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned object when the row insert fails.
    await supabase.storage.from('documents').remove([path]).catch(() => {});
    throw error;
  }
  return data as ContractDocument;
}

// Attach an already-uploaded storage object (the analyze flow uploads before
// the contract row exists, then attaches after save).
export async function attachDocument(
  contractId: string,
  path: string,
  kind: 'image' | 'pdf',
  label: string | null,
  pageNumber: number | null
): Promise<ContractDocument> {
  return insertRow(contractId, path, kind, label, pageNumber);
}

export async function uploadDocumentImage(
  contractId: string,
  base64: string,
  userId: string
): Promise<ContractDocument> {
  const path = buildDocumentPath(userId, Crypto.randomUUID(), 'image');
  const { error } = await supabase.storage.from('documents').upload(path, decodeBase64(base64), {
    contentType: 'image/jpeg',
  });
  if (error) throw error;
  return insertRow(contractId, path, 'image', null, null);
}

export async function uploadDocumentPdf(
  contractId: string,
  fileUri: string,
  userId: string,
  label: string | null
): Promise<ContractDocument> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = buildDocumentPath(userId, Crypto.randomUUID(), 'pdf');
  const { error } = await supabase.storage.from('documents').upload(path, decodeBase64(base64), {
    contentType: 'application/pdf',
  });
  if (error) throw error;
  return insertRow(contractId, path, 'pdf', label, null);
}

export async function deleteDocument(doc: ContractDocument): Promise<void> {
  const { error } = await supabase.from('contract_documents').delete().eq('id', doc.id);
  if (error) throw error;
  await supabase.storage.from('documents').remove([doc.storage_path]).catch(() => {});
}

export async function getDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
