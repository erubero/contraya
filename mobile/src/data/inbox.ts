// Email-in: pure helpers shared by the settings display, the dashboard inbox,
// and the tests. The token is minted server-side (see the
// get_or_create_email_token RPC); the address it forms is a secret — anyone
// who has it can put PDFs in the user's inbox (never contracts in the app;
// importing stays behind the in-app quota gates).

export const INGEST_DOMAIN = 'usecontraya.com';

export type InboxItem = {
  id: string;
  user_id?: string;
  storage_path: string;
  kind: 'pdf';
  original_filename: string | null;
  from_address: string | null;
  subject: string | null;
  received_at: string;
};

export function isIngestToken(token: string): boolean {
  return /^[a-f0-9]{32}$/.test(token);
}

export function ingestAddress(token: string): string {
  return `c-${token}@${INGEST_DOMAIN}`;
}

// What an inbox row is called in lists: filename first, then subject, then a
// generic fallback.
export function inboxItemTitle(item: Pick<InboxItem, 'original_filename' | 'subject'>): string {
  return item.original_filename?.trim() || item.subject?.trim() || 'Contract.pdf';
}
