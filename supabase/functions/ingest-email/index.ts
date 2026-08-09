// Receives a PDF attachment from the Cloudflare Email Worker and files it
// into the recipient's Contraya inbox: store the object under the user's
// folder, insert an inbox_items row, send a push. NO model call happens here
// — analysis runs in-app behind the normal quota gates, so spammed email can
// cost storage only, never tokens.
//
// Auth is a shared secret (INGEST_SECRET) known only to the Email Worker,
// compared timing-safe like CRON_SECRET. The recipient token is the user
// credential: 128 bits, minted server-side, never derived from the sender
// (sender addresses are spoofable and are stored as metadata only).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { decodeBase64 } from 'jsr:@std/encoding@1/base64';
import { createApnsSender } from '../_shared/apns.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'documents';
const MAX_PDF_BYTES = 10 * 1024 * 1024; // mirrors the bucket cap
// Emails accepted per user per rolling day. Generous for humans, a wall for
// anyone who leaks their address to a mailing list.
const DAILY_LIMIT = 20;

// Constant-time compare so the shared secret can't be probed byte by byte.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  // Strip control chars and bidi/zero-width overrides: these fields (sender,
  // subject, filename) are attacker-controlled and rendered in the inbox UI,
  // where a U+202E could visually reorder a filename or a newline could break
  // the row. Keep it to printable text.
  const t = v.replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const secret = Deno.env.get('INGEST_SECRET');
  const provided = req.headers.get('Authorization') ?? '';
  if (!secret || !timingSafeEqual(provided, `Bearer ${secret}`)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Reject, never truncate: an over-long value must not match on a prefix.
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const data = typeof body.data === 'string' ? body.data : '';
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return Response.json({ error: 'Invalid token' }, { status: 404, headers: corsHeaders });
    }
    // 10MB of PDF is ~13.7M base64 chars; anything bigger is rejected before
    // decoding.
    if (!data || data.length > Math.ceil((MAX_PDF_BYTES * 4) / 3) + 4) {
      return Response.json({ error: 'Attachment missing or too large' }, { status: 413, headers: corsHeaders });
    }

    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: addr, error: addrError } = await service
      .from('email_ingest_addresses')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();
    if (addrError) throw addrError;
    if (!addr) {
      return Response.json({ error: 'Unknown address' }, { status: 404, headers: corsHeaders });
    }
    const userId = addr.user_id as string;

    // Rolling-day rate limit (the DB trigger backstops the absolute cap).
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await service
      .from('inbox_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('received_at', dayAgo);
    if (countError) throw countError;
    if ((count ?? 0) >= DAILY_LIMIT) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429, headers: corsHeaders });
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(data);
    } catch {
      return Response.json({ error: 'Invalid attachment encoding' }, { status: 400, headers: corsHeaders });
    }
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) {
      return Response.json({ error: 'Attachment missing or too large' }, { status: 413, headers: corsHeaders });
    }
    // Cheap magic-number check: a PDF starts with %PDF.
    if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
      return Response.json({ error: 'Not a PDF' }, { status: 415, headers: corsHeaders });
    }

    // Same document, already waiting in this user's inbox. The email worker
    // has no idempotency key and an MTA re-delivers when it does not see a
    // timely 2xx, so without this the same contract files two or three times.
    // Checked before the upload so a duplicate never orphans a storage object;
    // the unique index is the race-safe backstop below.
    //
    // 200, not an error: a non-2xx tells the sending MTA to try again, which
    // is how one duplicate becomes a queue of them.
    // Copied into a freshly allocated buffer rather than passed directly:
    // decodeBase64 hands back a view whose backing buffer type does not
    // satisfy BufferSource under Deno's lib, and a view with a non-zero offset
    // would hash the wrong bytes. A 10MB memcpy at most, once per email.
    const owned = new Uint8Array(bytes.byteLength);
    owned.set(bytes);
    const digest = toHex(await crypto.subtle.digest('SHA-256', owned));
    const { data: dupe, error: dupeError } = await service
      .from('inbox_items')
      .select('id')
      .eq('user_id', userId)
      .eq('content_sha256', digest)
      .maybeSingle();
    if (dupeError) throw dupeError;
    if (dupe) {
      return Response.json({ ok: true, deduped: true }, { headers: corsHeaders });
    }

    const path = `${userId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await service.storage.from(BUCKET).upload(path, bytes, {
      contentType: 'application/pdf',
    });
    if (uploadError) throw uploadError;

    const { error: insertError } = await service.from('inbox_items').insert({
      user_id: userId,
      storage_path: path,
      kind: 'pdf',
      original_filename: clean(body.filename, 200),
      from_address: clean(body.from_address, 320),
      subject: clean(body.subject, 500),
      content_sha256: digest,
    });
    if (insertError) {
      // Don't leave an orphaned object when the row insert fails.
      await service.storage.from(BUCKET).remove([path]).catch(() => {});
      // Two copies raced past the check above and the unique index caught the
      // loser. That is a successful dedupe, not a failure: reporting it as one
      // would have the MTA redeliver the copy we just declined.
      if (insertError.code === '23505') {
        return Response.json({ ok: true, deduped: true }, { headers: corsHeaders });
      }
      throw insertError;
    }

    // Best-effort push; ingestion succeeds even if every token is stale.
    try {
      const { data: tokenRows } = await service
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId);
      const tokens = (tokenRows ?? []).map((t) => t.token as string);
      if (tokens.length > 0) {
        // The push body is a fixed string on purpose. The sender address and
        // filename are attacker-controlled (the sender is spoofable and never
        // authenticated), so interpolating them into a notification that
        // carries the app's own title would let anyone who knows a forwarding
        // address push a convincing spoofed alert ("invoice.pdf arrived from
        // billing@yourbank.com") to the victim's lock screen. The real sender
        // is shown, labeled unverified, only inside the app.
        //
        // Straight to Apple. This used to POST to Expo's push service, which
        // silently could not deliver: push_tokens holds RAW APNs device
        // tokens and that endpoint only accepts ExponentPushToken[...], so
        // every emailed document arrived with no notification at all. Null
        // when the APNS_* secrets are unset, exactly like the reminder cron.
        const pushTo = await createApnsSender(service);
        if (pushTo) {
          await pushTo(tokens, 'A document arrived by email', 'Open Contraya to review it.', {
            inbox: true,
          });
        }
      }
    } catch (e) {
      console.error('inbox push failed', e);
    }

    console.log('email ingested', JSON.stringify({ user: userId, bytes: bytes.byteLength }));
    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('ingest-email error', error);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders });
  }
});
