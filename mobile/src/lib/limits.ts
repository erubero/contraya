// Freemium limits. The contract analysis is the only operation that costs
// money (a Claude API call at roughly 15-100x a receipt scan: Warraya logs
// $0.005-0.01 a scan, an analysis here logs $0.15-0.50), so the free tier is
// 2 analyses EVER, not per month; contracts and reminders are free to store,
// so they are unlimited on both tiers. Premium gets a monthly analysis quota.
// The server enforces a separate, higher per-user monthly ceiling (in the
// analyze-contract edge function) as an abuse backstop, since it cannot see
// RevenueCat entitlement.
//
// The quotas below are priced, not guessed (owner decision 2026-07-30, at
// $9.99/mo or $69.99/yr). Worst case is 10 x $0.50 + 40 x $0.05 = $7.00 of
// tokens against $8.49 net of Apple's 15%, so even a subscriber who uses
// every credit on 50-page contracts stays gross-margin positive. Raising
// either number reopens that math, and both are advertised in the App Store
// description, so they cannot be quietly lowered later.
export const FREE_ANALYSIS_LIFETIME_LIMIT = 2;
export const PRO_MONTHLY_ANALYSES = 10;
// Ask Contry questions per month on premium (chat is premium-only). Roughly
// $0.02-0.05 a question on a short contract, but chat-contract re-sends the
// whole document every time against a 5-minute ephemeral cache, so a user
// asking one question a day pays cache WRITES (1.25x) rather than reads
// (0.1x). On a 50-page contract that is closer to $0.30 a question. The
// chat-contract edge function backstops with its own 60/month ceiling.
export const PRO_MONTHLY_CHATS = 40;

// Keep in sync with Supabase Auth's minimum password length (dashboard
// setting; 6 is its default). Owner call: keep it low — the audience skews
// non-technical and longer minimums cost more sign-ups than they protect.
// Checked client-side at sign-up and password reset for UX; the server is
// the real enforcement.
export const MIN_PASSWORD = 6;
