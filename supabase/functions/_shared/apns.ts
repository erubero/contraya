// Direct APNs, shared by every function that pushes. Contraya signs its own
// ES256 provider tokens and talks to api.push.apple.com; no Expo push service
// or any other relay sits in the chain (owner rule, and push_tokens holds raw
// APNs device tokens because of it).
//
// This module exists because it did not, and the two callers drifted.
// ingest-email kept POSTing those raw device tokens to Expo's push endpoint
// long after send-date-reminders moved to direct APNs, so every document that
// arrived by email landed in the inbox silently. One implementation, two
// callers, so the next change cannot reach one and miss the other.
//
// Folders prefixed with _ are not deployed as functions; this is bundled into
// whichever function imports it.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const APNS_PROD = 'https://api.push.apple.com';
const APNS_SANDBOX = 'https://api.sandbox.push.apple.com';
// APNs routes by the app's bundle id.
const APNS_TOPIC = 'com.contraya.app';

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

// One provider token per invocation (APNs wants them between 20 and 60
// minutes old; neither caller lives long enough to age one out).
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
  message: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  // `data` rides top-level AND under the `body` custom key, which is the field
  // expo-notifications surfaces as content.data for third-party APNs payloads;
  // the app's tap router reads data.contractId either way.
  const payload = JSON.stringify({
    aps: { alert: { title, body: message }, sound: 'default' },
    ...data,
    body: data,
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

export type ApnsSender = (
  tokens: string[],
  title: string,
  message: string,
  data: Record<string, unknown>,
) => Promise<boolean>;

/**
 * Mints one provider token and hands back a sender.
 *
 * Returns null when any APNS_* secret is unset or the key will not import, so
 * a caller soft-skips the push channel rather than failing its real work. Both
 * callers do something the user paid for besides pushing: the cron still sends
 * reminder email, and ingest-email still files the document.
 */
export async function createApnsSender(supabase: SupabaseClient): Promise<ApnsSender | null> {
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const p8 = Deno.env.get('APNS_P8_BASE64');
  if (!teamId || !keyId || !p8) return null;
  try {
    const jwt = await mintApnsJwt(await importApnsKey(p8), keyId, teamId);
    return (tokens, title, message, data) => sendPush(supabase, jwt, tokens, title, message, data);
  } catch (e) {
    console.error('apns key setup failed; push channel skipped', e);
    return null;
  }
}
