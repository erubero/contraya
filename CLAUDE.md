# Contraya — working rules

**Read `STATUS.md` first** — it is the source of truth for current state, next steps, and gotchas.

- The product is the **Expo/React Native app in `mobile/`** (iOS + Android). The web app at the repo root is the marketing landing only (no web dashboard, ever).
- Contraya is Warraya's sibling (same owner, same stack, same conventions). When in doubt about a pattern, the Warraya repo is the reference implementation.
- **Builds go through Xcode, never `eas build`/`eas submit`:** Claude runs `npx expo prebuild --platform ios`, owner opens `mobile/ios/Contraya.xcworkspace` (Team: Renovatio, LLC), Runs or Archives. Never hand-edit `ios/` — prebuild regenerates it from `app.config.ts`.
- Shell env for `mobile/` work on the owner's Mac: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` and `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. Never `npm dedupe`.
- Checks: `cd mobile && npm run typecheck && npm test`. Landing: `npm run build` at repo root.
- Supabase: owner runs `supabase db push` (has the password); Claude writes migrations + can deploy edge functions. Explicit GRANTs in every migration (default privileges are unreliable under db push).
- "Commit" always means commit AND push.
- Copy rules: never say "AI" in user-facing copy (the mascot **Contry** "reads your contract and explains it"); **describe, never advise** — every analysis surface states what the contract SAYS, never what the user should do, and carries the disclaimer "This explains what the contract says. It is not legal advice."; no em dashes; support email is hello@usecontraya.com — never a personal address.
- RevenueCat entitlement id is exactly `premium`. Public keys live in `mobile/.env` (gitignored) — never commit keys.
- Free tier: 2 analyses LIFETIME (`FREE_ANALYSIS_LIFETIME_LIMIT`); premium 15/month (`PRO_MONTHLY_ANALYSES`); server ceiling 40/month in `analyze-contract`. An analysis costs ~$0.15-0.50 in Claude tokens — 15-30x a Warraya receipt scan — which is why the free tier is lifetime, not monthly.
