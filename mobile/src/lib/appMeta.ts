import Constants from 'expo-constants';

// Static app metadata surfaced in the Settings "About" section.

export const APP_VERSION = Constants.expoConfig?.version ?? '';

export const SUPPORT_EMAIL = 'hello@usecontraya.com';

export const HELP_URL = 'https://usecontraya.com/#faq';
export const TERMS_URL = 'https://usecontraya.com/terms';
export const PRIVACY_URL = 'https://usecontraya.com/privacy';

// Shared when the user taps "Share Contraya".
export const SHARE_MESSAGE =
  'Contraya reads your contracts, puts them in plain English, and reminds you before payments, renewals, and deadlines. https://usecontraya.com';

// Email-in: forward a PDF to a private address and it lands in your inbox.
//
// OFF for 1.0 (owner decision, 2026-08-09). The feature is finished on both
// sides, but the half that lives outside this repo is not: INGEST_SECRET is
// unset in Supabase, the Cloudflare worker in email-worker/ has never been
// deployed, and there is no catch-all routing rule. Shipping the screen in
// that state would print an address that silently swallows every document
// sent to it, which is worse than not offering it. It also keeps App Review
// from finding a dead advertised feature, and retires audit finding 35 (the
// demo mode's fake ingest address, which a reviewer might well email).
//
// Turning it back on in 1.0.1 is this one constant, once the three owner
// items above are done. Nothing else is gated on it, and the server side
// stays deployed and tested in the meantime.
export const EMAIL_IN_ENABLED = false;
