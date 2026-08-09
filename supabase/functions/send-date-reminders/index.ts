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
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createApnsSender } from '../_shared/apns.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
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
  // Null when they are unset or the key will not import.
  const pushTo = await createApnsSender(supabase);

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
      if (pushTo && tokens.length && !alreadySent.has(`${d.row.id}:${d.occurrence}:${d.window}:push`)) {
        if (await pushTo(tokens, title, body, { contractId: d.row.contract_id })) {
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
