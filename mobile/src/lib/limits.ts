// Freemium limits. The contract analysis is the only operation that costs
// money (a Claude API call at roughly 15-30x a receipt scan), so the free tier
// is 2 analyses EVER, not per month; contracts and reminders are free to
// store, so they are unlimited on both tiers. Premium gets a monthly analysis
// quota. The server enforces a separate, higher per-user monthly ceiling (in
// the analyze-contract edge function) as an abuse backstop, since it cannot
// see RevenueCat entitlement.
export const FREE_ANALYSIS_LIFETIME_LIMIT = 2;
export const PRO_MONTHLY_ANALYSES = 15;
// Ask Contry questions per month on premium (chat is premium-only). Each
// question is a cached model call (~$0.02-0.05); the chat-contract edge
// function backstops with its own 300/month ceiling.
export const PRO_MONTHLY_CHATS = 50;

// Keep in sync with Supabase Auth's minimum password length (dashboard
// setting; 6 is its default). Owner call: keep it low — the audience skews
// non-technical and longer minimums cost more sign-ups than they protect.
// Checked client-side at sign-up and password reset for UX; the server is
// the real enforcement.
export const MIN_PASSWORD = 6;
