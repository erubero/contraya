// Daily cron: reminds users before each contract date (payments, renewals,
// notice deadlines, expiries), over two channels, native push (DIRECT APNs:
// this function signs its own ES256 JWTs and talks to api.push.apple.com; no
// Expo or other push service sits in the chain) and email (Resend). Guarded
// by CRON_SECRET, so deploy with --no-verify-jwt. Every (date row,
// occurrence, window, channel) reminder is sent at most once via the
// contract_date_reminders ledger. Push is skipped entirely when the APNS_*
// secrets are unset, and email when RESEND_API_KEY is unset, so either
// channel can ship first.
//
// A date row carries its own reminder_windows (e.g. {60,30,7} for a notice
// deadline) and may recur monthly or yearly; the cron reminds about the NEXT
// occurrence. Copy states what the contract says and when — never advice.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DAY_MS = 24 * 60 * 60 * 1000;
const APNS_PROD = 'https://api.push.apple.com';
const APNS_SANDBOX = 'https://api.sandbox.push.apple.com';
// APNs routes by the app's bundle id.
const APNS_TOPIC = 'com.contraya.app';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Contraya <hello@usecontraya.com>';
// Longest supported window (see contract_dates_windows_bounds in the schema).
const MAX_WINDOW_DAYS = 90;

// Constant-time compare so the cron secret can't be probed byte by byte.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

type DateRow = {
  id: string;
  contract_id: string;
  user_id: string;
  label: string;
  date_type: string;
  due_date: string;
  recurrence: 'none' | 'monthly' | 'yearly';
  reminder_windows: number[];
  contracts: { title: string; status: string };
};

// Next occurrence of a date row on or after `fromStr` (both yyyy-MM-dd).
// Mirrors the on-device planner's month-end clamping (Jan 31 + 1mo = Feb 28);
// the two must agree or users get double or missing reminders.
function nextOccurrence(dueDate: string, recurrence: DateRow['recurrence'], fromStr: string): string | null {
  if (recurrence === 'none') {
    return dueDate >= fromStr ? dueDate : null;
  }
  const from = new Date(`${fromStr}T00:00:00Z`);
  const first = new Date(`${dueDate}T00:00:00Z`);
  if (Number.isNaN(first.getTime())) return null;
  const day = first.getUTCDate();
  for (let i = 0; i < 1500; i++) {
    const occ = new Date(first);
    if (recurrence === 'monthly') {
      occ.setUTCDate(1);
      occ.setUTCMonth(first.getUTCMonth() + i);
      const monthEnd = new Date(Date.UTC(occ.getUTCFullYear(), occ.getUTCMonth() + 1, 0)).getUTCDate();
      occ.setUTCDate(Math.min(day, monthEnd));
    } else {
      occ.setUTCFullYear(first.getUTCFullYear() + i);
    }
    if (occ >= from) return occ.toISOString().slice(0, 10);
  }
  return null;
}

const TITLES: Record<string, string> = {
  payment: 'A payment is coming up',
  renewal: 'A renewal is coming up',
  termination_notice: 'A notice deadline is coming up',
  expiry: 'A contract is ending soon',
  start: 'A contract starts soon',
  custom: 'A contract date is coming up',
};

function when(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// Labels and titles are user-entered (or model-extracted) text landing in an
// HTML body; escape them so markup in a title renders as text.
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function reminderEmailHtml(label: string, contractTitle: string, daysLeft: number): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a1440;">
  <div style="max-width:480px;margin:0 auto;padding:36px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e8ecff;">
    <div style="font-size:22px;font-weight:700;color:#ffffff;margin-bottom:24px;">Contraya</div>
    <div style="background:#111a4a;border-radius:14px;padding:24px;">
      <p style="margin:0 0 12px;font-size:18px;color:#ffffff;font-weight:600;">${escapeHtml(label)} is ${when(daysLeft)}.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#c7d0f5;">Your contract "${escapeHtml(contractTitle)}" has this date coming up. The details are in the app, in the contract's own words.</p>
      <a href="https://usecontraya.com" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px;">Open Contraya</a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#8b96c9;">You are getting this because you saved this contract in Contraya. You can turn reminders off anytime in the app under Settings.</p>
  </div></body></html>`;
}

// ---- Direct APNs ------------------------------------------------------------

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

// The APNS_P8_BASE64 secret is the base64 of the .p8 file; tolerate a raw PEM
// pasted directly too. Either way it decodes to a PKCS8 EC P-256 key.
async function importApnsKey(secret: string): Promise<CryptoKey> {
  const pem = secret.includes('BEGIN')
    ? secret
    : new TextDecoder().decode(Uint8Array.from(atob(secret.replace(/\s+/g, '')), (c) => c.charCodeAt(0)));
  const der = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(der), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

// One provider token per run (APNs wants them between 20 and 60 minutes old;
// a daily run always mints fresh).
async function mintApnsJwt(key: CryptoKey, keyId: string, teamId: string): Promise<string> {
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: 'ES256', kid: keyId })));
  const payload = b64url(enc.encode(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })));
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

async function apnsReason(res: Response): Promise<string | null> {
  try {
    const j = await res.json();
    return typeof j?.reason === 'string' ? j.reason : null;
  } catch {
    return null;
  }
}

// Sends one push per token, straight to Apple. Debug builds register SANDBOX
// device tokens, so a prod BadDeviceToken retries the sandbox host before the
// token is treated as dead. Dead tokens (Unregistered / BadDeviceToken on
// both hosts) are pruned. Returns true if at least one delivery was accepted.
async function sendPush(
  supabase: SupabaseClient,
  apnsJwt: string,
  tokens: string[],
  title: string,
  body: string,
  contractId: string,
): Promise<boolean> {
  // contractId rides top-level AND under the `body` custom key, which is the
  // field expo-notifications surfaces as content.data for third-party APNs
  // payloads; the app's tap router reads data.contractId either way.
  const payload = JSON.stringify({
    aps: { alert: { title, body }, sound: 'default' },
    contractId,
    body: { contractId },
  });
  const send = (host: string, token: string) =>
    fetch(`${host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${apnsJwt}`,
        'apns-topic': APNS_TOPIC,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: payload,
    });

  let delivered = false;
  for (const token of tokens) {
    try {
      let res = await send(APNS_PROD, token);
      let reason = res.ok ? null : await apnsReason(res);
      if (reason === 'BadDeviceToken') {
        res = await send(APNS_SANDBOX, token);
        reason = res.ok ? null : await apnsReason(res);
      }
      if (res.ok) {
        delivered = true;
        continue;
      }
      if (res.status === 410 || reason === 'Unregistered' || reason === 'BadDeviceToken') {
        await supabase.from('push_tokens').delete().eq('token', token);
      } else {
        // Never log the token itself.
        console.error('apns send failed', res.status, reason);
      }
    } catch (e) {
      console.error('apns send error', e);
    }
  }
  return delivered;
}

async function sendEmail(
  apiKey: string,
  to: string,
  label: string,
  contractTitle: string,
  daysLeft: number,
): Promise<boolean> {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      reply_to: 'hello@usecontraya.com',
      subject: `${label} (${contractTitle}) is ${when(daysLeft)}`,
      html: reminderEmailHtml(label, contractTitle, daysLeft),
    }),
  });
  if (!res.ok) {
    console.error('resend failed', res.status, await res.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  const provided = req.headers.get('Authorization') ?? '';
  if (!secret || !timingSafeEqual(provided, `Bearer ${secret}`)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const resendKey = Deno.env.get('RESEND_API_KEY');

  // Push soft-skips until all three APNS secrets exist (mirrors the email
  // channel's RESEND_API_KEY behavior), so the cron can run without either.
  let apnsJwt: string | null = null;
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
  const apnsKeyId = Deno.env.get('APNS_KEY_ID');
  const apnsP8 = Deno.env.get('APNS_P8_BASE64');
  if (apnsTeamId && apnsKeyId && apnsP8) {
    try {
      apnsJwt = await mintApnsJwt(await importApnsKey(apnsP8), apnsKeyId, apnsTeamId);
    } catch (e) {
      console.error('apns key setup failed; push channel skipped this run', e);
    }
  }

  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const horizonStr = new Date(Date.now() + MAX_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10);

    // Non-recurring dates can be bounded in SQL; recurring rows must all be
    // fetched because their next occurrence isn't in the due_date column.
    const select = 'id, contract_id, user_id, label, date_type, due_date, recurrence, reminder_windows, contracts!inner(title, status)';
    const [oneShot, recurring] = await Promise.all([
      supabase.from('contract_dates').select(select)
        .eq('contracts.status', 'active')
        .eq('recurrence', 'none')
        .gte('due_date', todayStr)
        .lte('due_date', horizonStr),
      supabase.from('contract_dates').select(select)
        .eq('contracts.status', 'active')
        .neq('recurrence', 'none'),
    ]);
    if (oneShot.error) throw oneShot.error;
    if (recurring.error) throw recurring.error;
    const rows = [...(oneShot.data ?? []), ...(recurring.data ?? [])] as unknown as DateRow[];

    // Work out what's actually due a reminder today.
    type Due = { row: DateRow; occurrence: string; window: number; daysLeft: number };
    const due: Due[] = [];
    for (const row of rows) {
      const occurrence = nextOccurrence(row.due_date, row.recurrence, todayStr);
      if (!occurrence) continue;
      const daysLeft = Math.round(
        (new Date(`${occurrence}T00:00:00Z`).getTime() - new Date(`${todayStr}T00:00:00Z`).getTime()) / DAY_MS,
      );
      // Smallest window that has opened: windows {60,30,7} at 45 days out
      // means the 60-day reminder; at 20 days out, the 30-day one.
      const openWindows = (row.reminder_windows ?? []).filter((w) => daysLeft <= w);
      if (openWindows.length === 0) continue;
      due.push({ row, occurrence, window: Math.min(...openWindows), daysLeft });
    }

    if (due.length === 0) {
      return Response.json({ ok: true, considered: 0, pushSent: 0, emailSent: 0 });
    }

    const dateIds = [...new Set(due.map((d) => d.row.id))];
    const { data: sentRows } = await supabase
      .from('contract_date_reminders')
      .select('contract_date_id, occurrence, reminder_window, channel')
      .in('contract_date_id', dateIds);
    const alreadySent = new Set(
      (sentRows ?? []).map((r) => `${r.contract_date_id}:${r.occurrence}:${r.reminder_window}:${r.channel}`),
    );

    const userIds = [...new Set(due.map((d) => d.row.user_id))];
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('user_id, token, platform')
      .in('user_id', userIds);
    const tokensByUser = new Map<string, string[]>();
    for (const t of tokenRows ?? []) {
      // APNs only: Android (FCM) tokens must never be POSTed to Apple, where
      // BadDeviceToken would get a perfectly valid token pruned. FCM delivery
      // lands with the Android release (roadmap item 4).
      if (t.platform !== 'ios') continue;
      tokensByUser.set(t.user_id, [...(tokensByUser.get(t.user_id) ?? []), t.token]);
    }

    // Per-run cache of auth users, for the reminders-off preference and email.
    const userCache = new Map<string, { email: string | null; enabled: boolean }>();
    async function getUser(id: string) {
      if (!userCache.has(id)) {
        const { data } = await supabase.auth.admin.getUserById(id);
        const meta = data?.user?.user_metadata ?? {};
        userCache.set(id, {
          email: data?.user?.email ?? null,
          enabled: meta.reminders_enabled !== false, // default on unless explicitly off
        });
      }
      return userCache.get(id)!;
    }

    let pushSent = 0;
    let emailSent = 0;

    for (const d of due) {
      const user = await getUser(d.row.user_id);
      if (!user.enabled) continue;

      const title = TITLES[d.row.date_type] ?? TITLES.custom;
      const body = `${d.row.label} for ${d.row.contracts.title} is ${when(d.daysLeft)}.`;
      const ledger = {
        contract_date_id: d.row.id,
        occurrence: d.occurrence,
        reminder_window: d.window,
      };

      const tokens = tokensByUser.get(d.row.user_id) ?? [];
      if (apnsJwt && tokens.length && !alreadySent.has(`${d.row.id}:${d.occurrence}:${d.window}:push`)) {
        if (await sendPush(supabase, apnsJwt, tokens, title, body, d.row.contract_id)) {
          await supabase.from('contract_date_reminders').insert({ ...ledger, channel: 'push' });
          pushSent++;
        }
      }

      if (resendKey && user.email && !alreadySent.has(`${d.row.id}:${d.occurrence}:${d.window}:email`)) {
        if (await sendEmail(resendKey, user.email, d.row.label, d.row.contracts.title, d.daysLeft)) {
          await supabase.from('contract_date_reminders').insert({ ...ledger, channel: 'email' });
          emailSent++;
        }
      }
    }

    return Response.json({ ok: true, considered: due.length, pushSent, emailSent });
  } catch (e) {
    console.error('send-date-reminders error', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});
