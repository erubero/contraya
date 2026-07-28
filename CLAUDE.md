# Contraya — working rules

**Read `STATUS.md` first** — it is the source of truth for current state, next steps, and gotchas.

- The product is the **Expo/React Native app in `mobile/`** (iOS + Android). The web app at the repo root is the marketing landing only (no web dashboard, ever).
- Contraya is Warraya's sibling (same owner, same stack, same conventions). When in doubt about a pattern, the Warraya repo is the reference implementation.
- **Builds go through Xcode, never `eas build`/`eas submit`:** Claude runs `npx expo prebuild --platform ios`, owner opens `mobile/ios/Contraya.xcworkspace` (Team: Renovatio, LLC), Runs or Archives. Never hand-edit `ios/` — prebuild regenerates it from `app.config.ts`.
- Shell env for `mobile/` work on the owner's Mac: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` and `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. Never `npm dedupe`.
- Checks: `cd mobile && npm run typecheck && npm test`. Landing: `npm run build` at repo root.
- Supabase: owner runs `supabase db push` (has the password); Claude writes migrations + can deploy edge functions. Explicit GRANTs in every migration (default privileges are unreliable under db push).
- "Commit" always means commit AND push.
- Copy rules: never say "AI" in user-facing copy (the mascot **Contry** "reads your contract and explains it"); **legal-conclusion questions get no yes and no no** — "can I sue/evict/win/is this legal" is always answered with "that is a question for a licensed attorney" plus what the contract itself says, quoted, and the answer never bends toward what the asker wants to hear; **describe, never advise** — every analysis surface states what the contract SAYS, never what the user should do, and carries the disclaimer "This explains what the contract says. It is not legal advice."; no em dashes; support email is hello@usecontraya.com — never a personal address.
- RevenueCat entitlement id is exactly `premium`. Public keys live in `mobile/.env` (gitignored) — never commit keys.
- Free tier: 2 analyses LIFETIME (`FREE_ANALYSIS_LIFETIME_LIMIT`); premium 15 analyses/month (`PRO_MONTHLY_ANALYSES`) + 50 Ask Contry questions/month (`PRO_MONTHLY_CHATS`, chat is premium-only); server ceilings 20 analyses + 60 questions/month in the edge functions (tightened 2026-07-28: paid limits are client-side only, so the ceilings are the real cost gate until server-side receipt validation ships). An analysis costs ~$0.15-0.50 in tokens; a chat question ~$0.02-0.05 after the cache write.
- **Never claim "end-to-end encryption"** in any copy or store listing. Server-side analysis requires the server to read the document, so E2EE would be a false claim. Correct claims: encrypted in transit and at rest, private storage only you can access, delete everything anytime.
