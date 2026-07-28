// Pure helpers for the contract-documents feature. Everything with logic
// lives here so it can be unit-tested; the network calls are in
// src/api/documents.ts.

export type DocumentKind = 'image' | 'pdf';

export type ContractDocument = {
  id: string;
  contract_id: string;
  user_id?: string;
  storage_path: string;
  kind: DocumentKind;
  label: string | null;
  page_number: number | null;
  created_at: string;
};

// Mirrors the documents bucket cap.
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function isSizeAllowed(bytes?: number): boolean {
  // Unknown size: allow and let the bucket enforce the cap server-side.
  if (bytes === undefined || bytes === null) return true;
  return bytes <= MAX_DOCUMENT_BYTES;
}

export function documentKindFromMime(mime?: string): DocumentKind | null {
  if (!mime) return null;
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

// Storage RLS requires the caller's uid as the first path segment.
export function buildDocumentPath(userId: string, uuid: string, kind: DocumentKind): string {
  return `${userId}/${uuid}.${kind === 'pdf' ? 'pdf' : 'jpg'}`;
}
