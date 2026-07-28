# Warraya — working rules

**Read `STATUS.md` first** — it is the source of truth for current state, next steps, and gotchas.

- The product is the **Expo/React Native app in `mobile/`** (iOS + Android). The web app at the repo root is the marketing landing + interim dashboard.
- **Builds go through Xcode, never `eas build`/`eas submit`:** Claude runs `npx expo prebuild --platform ios`, owner opens `mobile/ios/Warraya.xcworkspace` (Team: Renovatio, LLC), Runs or Archives. Never hand-edit `ios/` — prebuild regenerates it from `app.config.ts`.
- Shell env for `mobile/` work: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` and `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. Never `npm dedupe`.
- Checks: `cd mobile && npm run typecheck && npm test`. Landing: `npm run build` at repo root.
- Supabase: owner runs `supabase db push` (has the password); Claude writes migrations + can deploy edge functions. Explicit GRANTs in every migration (default privileges are unreliable under db push).
- "Commit" always means commit AND push.
- Copy rules: never say "AI" in user-facing copy (describe what it does: "scan a receipt"); no em dashes; support email is hello@warraya.com — never a personal address.
- RevenueCat entitlement id is exactly `premium`. Public keys live in `mobile/.env` (gitignored) + EAS env; never commit keys.
