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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'documents';
const MAX_PDF_BYTES = 10 * 1024 * 1024; // mirrors the bucket cap
// Emails accepted per user per rolling day. Generous for humans, a wall for
// anyone who leaks their address to a mailing list.
const DAILY_LIMIT = 20;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

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

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
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
    });
    if (insertError) {
      // Don't leave an orphaned object when the row insert fails.
      await service.storage.from(BUCKET).remove([path]).catch(() => {});
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
        const name = clean(body.filename, 80) ?? 'A contract';
        const from = clean(body.from_address, 80);
        await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(
            tokens.map((to) => ({
              to,
              title: 'A contract arrived by email',
              body: from ? `${name} arrived from ${from}. Open Contraya to read it.` : `${name} arrived. Open Contraya to read it.`,
              sound: 'default',
              data: { inbox: true },
            }))
          ),
        });
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
