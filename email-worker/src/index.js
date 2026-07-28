// Contraya inbound-email worker. Bound as the CATCH-ALL on usecontraya.com's
// Email Routing (specific addresses like hello@ keep their forwarding rules
// and take precedence). It accepts mail only for c-<32 hex>@usecontraya.com,
// extracts PDF attachments, and hands each to the ingest-email edge function,
// which owns the real validation (token lookup, rate limit, storage, push).
//
// Everything else bounces with setReject, so senders get a normal SMTP
// failure instead of silence. The worker holds no Supabase credentials —
// only INGEST_URL and the shared INGEST_SECRET.
import PostalMime from 'postal-mime';

const MAX_PDF_BYTES = 10 * 1024 * 1024; // ingest-email enforces this too
const MAX_ATTACHMENTS = 3; // per email; more than this is never a contract

// Chunked base64 so a 10MB attachment doesn't blow the argument limit.
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isPdf(attachment) {
  const mime = (attachment.mimeType ?? '').toLowerCase();
  const name = (attachment.filename ?? '').toLowerCase();
  return mime === 'application/pdf' || (mime === 'application/octet-stream' && name.endsWith('.pdf'));
}

export default {
  async email(message, env) {
    const match = /^c-([a-f0-9]{32})@/.exec((message.to ?? '').toLowerCase());
    if (!match) {
      message.setReject('No such address');
      return;
    }

    // Parsing runs on hostile, possibly malformed MIME. A thrown parse rejects
    // the email() promise, which Cloudflare treats as a transient failure and
    // the sender's MTA retries; reject cleanly instead so one crafted message
    // can't drive retry amplification.
    let parsed;
    try {
      parsed = await PostalMime.parse(message.raw);
    } catch {
      message.setReject('Could not read this email');
      return;
    }
    const pdfs = (parsed.attachments ?? []).filter(isPdf).slice(0, MAX_ATTACHMENTS);
    if (pdfs.length === 0) {
      message.setReject('No contract found. Attach the contract as a PDF and send again.');
      return;
    }

    let stored = 0;
    for (const attachment of pdfs) {
      const content = attachment.content;
      if (!(content instanceof ArrayBuffer) || content.byteLength === 0 || content.byteLength > MAX_PDF_BYTES) {
        continue;
      }
      const res = await fetch(env.INGEST_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.INGEST_SECRET}`,
        },
        body: JSON.stringify({
          token: match[1],
          filename: attachment.filename ?? null,
          from_address: parsed.from?.address ?? null,
          subject: parsed.subject ?? null,
          data: toBase64(content),
        }),
      });
      if (res.status === 404) {
        // Token doesn't belong to any account: bounce so the sender knows.
        message.setReject('No such address');
        return;
      }
      if (res.status === 429) {
        message.setReject('This inbox has reached its daily limit. Try again tomorrow.');
        return;
      }
      if (res.ok) stored++;
    }

    if (stored === 0) {
      message.setReject('Could not accept this contract. PDFs up to 10 MB are supported.');
    }
  },
};
