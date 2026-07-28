# Contraya

Your contracts, in plain English, with reminders before payments, renewals,
and notice deadlines.

Contraya reads a contract you upload (PDF or page photos), describes what it
says in everyday words, pulls out every date it creates, lists the things you
promised to do, and points at the clauses people commonly want to know about
(auto-renewals, fees, deposit rules). Then it keeps working: local + push
reminders before each date. It describes what contracts say; it is not legal
advice.

Sibling product to [Warraya](https://warraya.com) (warranty tracker), built on
the same stack: Expo/React Native (iOS first) in `mobile/`, Supabase backend
in `supabase/`, Vite marketing landing at the repo root (usecontraya.com).

Start with `STATUS.md` (current state + setup checklist) and `CLAUDE.md`
(working rules).

## Layout

    mobile/          the product: Expo/React Native app (iOS first)
    supabase/        migrations + edge functions (analyze, chat, reminders, email-in)
    email-worker/    Cloudflare Email Worker for the forwarding addresses
    src/ + public/   the Vite marketing landing (usecontraya.com)
    brand/           source logo art (see its README: Contraya has no logo yet)

## Working on this locally (Mac)

Claude works in a cloud container and pushes to GitHub; nothing lands on the
Mac by itself. Clone it next to Warraya to get it locally:

    cd ~/Developer/sppa
    git clone https://github.com/erubero/contraya.git
    cd contraya

After that, `git pull` in that folder brings down whatever Claude pushed.

Every shell that touches `mobile/` needs Node 22 on the PATH and a UTF-8
locale, or Metro and Expo misbehave in ways that are hard to diagnose:

    export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
    export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

Install (never run `npm dedupe` in `mobile/`, it breaks the Expo dep tree):

    npm install                      # landing, at the repo root
    cd mobile && npm install         # the app

### Run the app

    cd mobile && npx expo start

With `mobile/.env` absent or blank the app boots in **demo mode** with a
seeded lease and wedding-vendor contract, no backend needed. This is also the
path App Review uses. To run against the real backend, copy
`mobile/.env.example` to `mobile/.env` and fill in the Supabase URL and anon
key. The landing needs no environment variables at all.

### Run the landing

    npm run dev                      # repo root

### Checks before committing

    cd mobile && npm run typecheck && npm test
    npm run build                    # repo root, landing
    npm run lint                     # repo root

### Building for the App Store

Builds go through Xcode, never `eas build` / `eas submit`:

    cd mobile && npx expo prebuild --platform ios

Then open `mobile/ios/Contraya.xcworkspace` (Team: Renovatio, LLC) and Run or
Archive. Never hand-edit anything under `mobile/ios/`; prebuild regenerates it
from `app.config.ts`.
