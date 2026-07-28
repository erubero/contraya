// Daily cron: reminds users 30 days and 7 days before a warranty expires, over
// two channels, native push (Expo Push API) and email (Resend). Guarded by
// CRON_SECRET, so deploy with --no-verify-jwt. Every (warranty, window, channel)
// reminder is sent at most once via the warranty_reminders ledger. Email is
// skipped entirely when RESEND_API_KEY is not set, so push can ship first.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'Warraya <hello@warraya.com>';

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

function reminderEmailHtml(productName: string, daysLeft: number): string {
  const dayWord = daysLeft === 1 ? 'day' : 'days';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a1440;">
  <div style="max-width:480px;margin:0 auto;padding:36px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e8ecff;">
    <div style="font-size:22px;font-weight:700;color:#ffffff;margin-bottom:24px;">Warraya</div>
    <div style="background:#111a4a;border-radius:14px;padding:24px;">
      <p style="margin:0 0 12px;font-size:18px;color:#ffffff;font-weight:600;">Your ${productName} warranty is almost up.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#c7d0f5;">It is covered for ${daysLeft} more ${dayWord}. If anything is wrong with it, test it now and file a claim while the coverage still counts. That repair or replacement is something you already paid for.</p>
      <a href="https://warraya.com" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px;">Open Warraya</a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#8b96c9;">You are getting this because you saved this warranty in Warraya. You can turn reminders off anytime in the app under Settings.</p>
  </div></body></html>`;
}

// Sends one push to every token for a user. Prunes tokens Expo reports as dead.
// Returns true if at least one delivery ticket came back ok.
async function sendPush(
  supabase: SupabaseClient,
  tokens: string[],
  title: string,
  body: string,
  warrantyId: string,
): Promise<boolean> {
  const messages = tokens.map((to) => ({ to, title, body, sound: 'default', data: { warrantyId } }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error('expo push failed', res.status, await res.text());
    return false;
  }
  const json = await res.json();
  const tickets: Array<{ status?: string; details?: { error?: string } }> = json.data ?? [];
  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered') {
      await supabase.from('push_tokens').delete().eq('token', tokens[i]);
    }
  }
  return tickets.some((t) => t?.status === 'ok');
}

async function sendEmail(apiKey: string, to: string, productName: string, daysLeft: number): Promise<boolean> {
  const dayWord = daysLeft === 1 ? 'day' : 'days';
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      reply_to: 'hello@warraya.com',
      subject: `Your ${productName} warranty ends in ${daysLeft} ${dayWord}`,
      html: reminderEmailHtml(productName, daysLeft),
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

  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in30Str = new Date(today.getTime() + 30 * DAY_MS).toISOString().slice(0, 10);

    const { data: warranties, error } = await supabase
      .from('warranties')
      .select('id, user_id, product_name, warranty_end_date')
      .gte('warranty_end_date', todayStr)
      .lte('warranty_end_date', in30Str);
    if (error) throw error;
    if (!warranties?.length) {
      return Response.json({ ok: true, considered: 0, pushSent: 0, emailSent: 0 });
    }

    const warrantyIds = warranties.map((w) => w.id);
    const { data: sentRows } = await supabase
      .from('warranty_reminders')
      .select('warranty_id, reminder_window, channel')
      .in('warranty_id', warrantyIds);
    const alreadySent = new Set((sentRows ?? []).map((r) => `${r.warranty_id}:${r.reminder_window}:${r.channel}`));

    const userIds = [...new Set(warranties.map((w) => w.user_id))];
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds);
    const tokensByUser = new Map<string, string[]>();
    for (const t of tokenRows ?? []) {
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

    for (const w of warranties) {
      const daysLeft = Math.round(
        (new Date(w.warranty_end_date).getTime() - new Date(todayStr).getTime()) / DAY_MS,
      );
      const windowDays = daysLeft <= 7 ? 7 : 30;
      const user = await getUser(w.user_id);
      if (!user.enabled) continue;

      const title = 'Warranty expiring soon';
      const body = `${w.product_name} is covered for ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'}. Check it before the warranty ends.`;

      const tokens = tokensByUser.get(w.user_id) ?? [];
      if (tokens.length && !alreadySent.has(`${w.id}:${windowDays}:push`)) {
        if (await sendPush(supabase, tokens, title, body, w.id)) {
          await supabase.from('warranty_reminders').insert({ warranty_id: w.id, reminder_window: windowDays, channel: 'push' });
          pushSent++;
        }
      }

      if (resendKey && user.email && !alreadySent.has(`${w.id}:${windowDays}:email`)) {
        if (await sendEmail(resendKey, user.email, w.product_name, daysLeft)) {
          await supabase.from('warranty_reminders').insert({ warranty_id: w.id, reminder_window: windowDays, channel: 'email' });
          emailSent++;
        }
      }
    }

    return Response.json({ ok: true, considered: warranties.length, pushSent, emailSent });
  } catch (e) {
    console.error('send-expiry-reminders error', e);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
});
