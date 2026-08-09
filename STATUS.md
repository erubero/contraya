# Contraya — STATUS (source of truth)

Updated: 2026-08-09, submission-readiness audit. Read this first.

## 2026-08-09 — submission-readiness audit, and the LEAN 1.0 decision

Everything below this section was written on or before 2026-07-31 and several
of its claims had gone stale. Verified live against DNS, the Supabase API and
the built plist on 2026-08-09:

| Claim below | Actual state |
|---|---|
| "NO MX records, hello@ bounces" (handoff 9, item 6, checklist 9) | **WRONG, now live.** Three `route*.mx.cloudflare.net` records answer for usecontraya.com. |
| "`CRON_SECRET` — set it" (item 5) | **Already set** 2026-07-29. Checklist item 2 had this right; item 5 was never updated. |
| "new app record" (checklist 8) | **Already created** as version 1.0, per commit `ba1a8ba`. |
| "the site has never been deployed" (STORE_LISTING prerequisite 1) | **Live.** `/`, `/privacy`, `/terms`, `/support` all return 200. |
| "live equals repo, byte-verified" (checklist 3) | **False as of 2026-07-31.** See below. |

New findings from this audit, none of them previously recorded:

- **The three `APNS_*` secrets and `INGEST_SECRET` are confirmed ABSENT** from
  `supabase secrets list`. Only `CLAUDE_API_KEY` and `CRON_SECRET` are set;
  everything else in that list is Supabase's own injection. Push and email-in
  are not partly working, they are dead.
- **The deployed edge functions are behind the repo.** All five last deployed
  2026-07-31 07:40, which predates the `_shared/apns.ts` refactor and the
  `max_tokens` guard. The byte-identical guarantee in checklist 3 is void until
  they are redeployed.
- **`eslint.config.js` matches only root `src/**/*.js`.** It lints the
  marketing site and zero lines of the mobile app. A green lint is not coverage.
- **`NSMicrophoneUsageDescription` is still expo-image-picker boilerplate**
  ("Allow $(PRODUCT_NAME) to access your microphone"), a documented 5.1.1 flag.
- **`MARKETING_VERSION` is 1.0 while the Info.plist literal is 1.0.0.** The
  plist wins because `INFOPLIST_FILE` is set, so the binary is correct, but
  Xcode's General tab lies and editing the version there changes nothing.
- **No App Store screenshots exist anywhere on disk.**
- **The per-subscription review screenshot** that ASC requires on a first
  subscription submission is named in neither this file nor STORE_LISTING.md.
- `PrivacyInfo.xcprivacy` is present **and** in the Resources build phase, so
  it genuinely ships. Icon is 1024x1024 with no alpha. Export compliance is
  declared. Those three are fine.

**LEAN 1.0 decided by the owner 2026-08-09.** Ship with on-device local
reminders only. APNs push, the daily cron, and email-in all move to 1.0.1.
This takes the largest block of dashboard work off the critical path and makes
finding 37 moot for this release, because there is no second channel to
collide with. Email-in is hidden behind one constant rather than removed.
Four findings get fixed first: 12, 7, 22, 6.

**Session handoff (2026-07-30 — the biggest day this project has had).**
What happened, in order, all committed and pushed:

1. **Full-app audit** (five parallel deep reviews + every mechanical gate):
   37 ranked findings, codified below under "2026-07-30 audit findings".
   Every mechanical claim re-verified (backend byte-identical to repo, 401
   probes, Hermes export, landing render).
2. **The audit's top five bugs FIXED** (inbox-retry data loss, notification
   tap routing incl. cold start + push payloads with a regression suite,
   sign-out force-clears the stored session, deletion/sign-out cancel
   scheduled reminders).
3. **Push redesigned to DIRECT APNs on owner direction — no Expo services
   anywhere, ever.** Client registers the raw device token; the cron signs
   its own ES256 JWTs to api.push.apple.com (sandbox retry for Debug
   tokens, iOS-only filter). APNs key exists (`AuthKey_9QH4GR7D82.p8` in
   `~/Developer/keys/`); the three APNS dashboard secrets are STILL NOT
   SAVED (checklist item 13).
4. **Production-breaking catch: the Anthropic key was saved as
   CLAUDE_API_KEY but the functions read ANTHROPIC_API_KEY — analysis was
   dead in prod.** Both functions now accept either name; redeployed,
   byte-verified. `deno check supabase/functions/*/index.ts` is now a
   standard gate (found two latent type errors too).
5. **THE APP RAN ON A REAL PHONE FOR THE FIRST TIME** (owner's iPhone 15
   Pro, Xcode ⌘R, first try).
6. **Docusign-informed settings/profile pass** (Mobbin study): dedicated
   delete-account screen, save toasts, denied-notifications banner,
   premium-pitch fix, email-in error state, support disclaimer from
   legal.ts (audit findings 13/14/15/17/33 closed).
7. **Brand v2**: new lime C-and-fine-print mark everywhere, brand navy
   re-aligned to `#01132F` in all four mirrors, native AppIcon verified.
8. **SEO launch-readiness**: FAQPage schema from the live FAQ array,
   offers + publisher in the app schema, honest pricing bullets, real 404
   with noindex, font loading unblocked. Full verdict in checklist 9b.
9. **THE LANDING IS LIVE at usecontraya.com** — verified from outside
   (latest build, sitemap/robots/og-image, CSP/HSTS). Search Console
   domain-verified, sitemap submitted, indexing requested. In-app legal
   links now resolve (finding 16 closed). Found the same day: no MX records.
   **That is now fixed — MX verified live 2026-08-09.**
10. **Pricing DECIDED and codified: $9.99/mo, $69.99/yr, 3-day free trial
    on both; quotas 10 analyses + 40 Ask Contry questions/month** (priced
    against measured token cost; math in `mobile/src/lib/limits.ts`).
    Landing, store listing, JSON-LD, and limits all aligned; the quota
    gates got a pure tested module (`quotaGate.ts`). Sign in with Apple
    RESOLVED config-side (native path needs no Services ID; Supabase
    provider live).

**Next session, in order:** (a) the FIRST REAL ANALYSIS — sign up live on
the phone, put a real lease PDF through, watch latency vs the 150s wall
clock and date accuracy, confirm `cache_read_input_tokens > 0` on the
verify turn, probe chat with "can I sue them?"; (b) owner dashboard items:
Email Routing MX (top: the CTA bounces today), APNS secrets, RevenueCat at
the NEW prices with the trial on both products, pg_cron, INGEST_SECRET +
email worker, ASC record, attorney review; (c) the remaining findings
backlog (6-12, 18-26 + LOW batch); (d) screenshots once the UI settles,
then TestFlight. Decide finding 37 (double-channel reminders) before push
goes live.

## 🚧 PRE-LAUNCH — runs on a device; first real analysis still pending

The backend is live (project `tzqjnbcbrcfltnjutels`, all seven migrations,
verify.sql 34/34, five functions deployed + byte-verified + 401-gated), the
landing is LIVE at usecontraya.com, and the app has run on real hardware
(2026-07-30). What has *not* happened: a real signup and a real contract
through `analyze-contract` end to end on the phone. That first analysis is
the remaining go/no-go; nothing below substitutes for it.

### What is actually left, in order

1. **Create `mobile/.env` FIRST.** DONE — verified on the Mac 2026-07-30:
   URL + anon key filled for `tzqjnbcbrcfltnjutels`, RevenueCat keys blank
   (deliberate: no paywall until RevenueCat exists). Kept here because the
   trap description still applies to any fresh machine:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://tzqjnbcbrcfltnjutels.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<Supabase → Settings → API → anon public>
   ```
   Leave the two RevenueCat keys blank for now (blank = no paywall, which is
   what you want until RevenueCat is set up). **This is the easy one to skip
   and the worst one to skip:** with a blank `.env` the app boots into demo
   mode with seeded contracts and behaves like a finished product, so the
   first build can look like a total success while never once touching the
   live backend. Tell them apart by signing up: demo mode accepts anything
   and never sends a real email.
2. **First device build.** On the Mac, the full pickup ritual (the
   `npm install` is NOT optional anymore: `expo-font` became a direct
   dependency on 2026-07-29, and an ios/ generated before the icon swap still
   carries Warraya's shield):
   `git pull origin main && cd mobile && npm install &&
   npx expo prebuild --platform ios && open ios/Contraya.xcworkspace`,
   then Run IN Xcode (⌘R). `npx expo start` in a second tab for Metro.
   Nothing else can be trusted until this happens.
3. **First real analysis.** Sign up live, put a real lease PDF through it.
   This is the go/no-go on the two things no amount of code review can
   settle: how long the analysis actually takes, and whether the extracted
   dates are right. See "Device E2E smoke" below for the full sequence.
4. **Logo** — DONE 2026-07-29. Real mark committed, all nine icons
   regenerated, brand navy aligned to `#04193E`. See blocker 12 below.
5. **`CRON_SECRET`** — **DONE, set 2026-07-29** and re-verified in the secrets
   list 2026-08-09. This item said "set it" for ten days after it was already
   set; checklist item 2 had it right the whole time. What actually blocks
   `send-date-reminders` is the three missing `APNS_*` secrets, and under the
   lean-1.0 decision that is deferred to 1.0.1.
6. **Deploy the landing. DONE, LIVE 2026-07-30** and verified from outside:
   usecontraya.com serves the LATEST build (v2 brand + SEO commit,
   new-string asserted per the deploy-verification rule), sitemap and
   robots fetch, og-image serves, /privacy SPA-fallback works, CSP/HSTS
   headers present. Google Search Console: domain property verified (TXT
   in DNS), sitemap submitted, homepage indexing requested (owner,
   2026-07-30). This also un-404s the in-app Terms/Privacy/Help links
   (audit finding 16 resolved) and unblocks the App Review Privacy Policy
   URL. **The MX hole found the same day is CLOSED: verified 2026-08-09,
   three `route*.mx.cloudflare.net` records answer for the domain, so
   Cloudflare Email Routing is enabled and hello@usecontraya.com resolves.**
7. **Attorney review** of Terms + Privacy (item 3b), **RevenueCat setup**,
   **screenshots**. All submission-time, none blocking a build today.

## 2026-07-30 audit findings (five parallel deep reviews; all file:line verified)

Every finding below was traced in code, not guessed. The previous audits'
security claims were re-verified: all nine documented backend properties
hold (two deviations became findings 19 and 20), and the schema, the edge
functions' json_schema, and the client decoder were compared field by field
with zero drift. Live = repo was proven by downloading and diffing all five
deployed functions.

### Fix before real users (the top five)

**Status, same day (owner said go):** items 1, 2, 4 and 5 are **FIXED** in
this session's follow-up commit — code plus a new regression suite (125
tests / 17 suites green, typecheck clean, Hermes export verified). Item 3
was first wired through Expo's push service, then **REDESIGNED the same day
on owner direction (no Expo anywhere):** the Expo service is gone from the
chain entirely. The client now registers the raw APNs device token
(`getDevicePushTokenAsync`, no project id needed) and the cron signs its own
ES256 JWTs and POSTs straight to `api.push.apple.com` (sandbox retry for
Debug-build tokens, dead-token pruning, iOS-only filtering so future FCM
tokens are never sent to Apple). No expo.dev account, project, or id exists
anywhere in the app. Activation = checklist item 13 (Apple .p8 + three
Supabase secrets). The five entries below are kept as written for the
record. **Later the same day, a Docusign-informed settings/profile pass
(Mobbin study, owner-approved plan) also FIXED findings 13 (denied-state
banner + Open Settings), 14 (premium pitch de-falsified + limits imported),
15 (email-in error state + retry), 17 (support disclaimer now sourced from
legal.ts), and 33 (deletion moved from an Alert to a dedicated
confirmation screen, delete-account.tsx, with a busy guard — the Docusign
Close Account pattern). Same pass: success toasts on profile saves
(Toast.tsx), email folded into the Account identity card, pencil
affordance on the name field, 52pt minimum row height in SettingsRow,
destructive-tinted isolated Sign Out.**

1. **FIXED — Inbox retry destroys the emailed PDF (data loss).** A failed inbox
   analysis leaves `inboxItem` set (`add.tsx:106-136`); the save branch
   checks `inboxItem` FIRST (`add.tsx:308-331`), so a fresh source then
   saves under the email's title (photos: only page 1 attached), and
   `removeInboxItem` deletes the inbox row. If attach fails,
   `documents.ts:34-38` deletes the stored object too — the only copy of an
   emailed contract is gone while the alert says "add it again". Fix: clear
   `inboxItem` when its analysis fails, and never let the inbox branch
   shadow a freshly picked source.
2. **FIXED — Notification taps only work warm + local.** The single response
   listener (`(app)/_layout.tsx:38-44`) parses local-notification ids only;
   the cron's pushes carry `data.contractId`
   (`send-date-reminders/index.ts:116`) which nothing reads, and there is no
   `getLastNotificationResponseAsync`, so cold-start taps drop even for
   local reminders. Server-push taps will never deep-link.
3. **FIXED BY REDESIGN (direct APNs, no Expo) — Push tokens can never mint.** `app.config.ts` has no
   `extra.eas.projectId`; `pushToken.ts:20-21` silently returns. The daily
   cron has nobody to push to — MovePact's exact open trap. Owner item:
   create the Expo project id, then wire it in. (Once fixed, decide finding
   37 first or users get double reminders.)
4. **FIXED (sign-out half) — Sign-out can silently not sign out.** `AuthContext.tsx:213-214`
   ignores `signOut()`'s error; with an expired access token while offline,
   auth-js returns an error BEFORE removing the stored session, the UI
   shows signed-out, and the next online launch silently signs back in.
   Bad on a handed-over phone. Cousin: offline cold boot with an expired
   token shows the sign-in screen to a genuinely signed-in user.
5. **FIXED — Account deletion and sign-out leave scheduled reminders alive.**
   `account.tsx:117-135` and `settings.tsx:43-48` never call
   `clearAll`/`disableAndClear` — after deletion, up to 60 reminders keep
   firing with contract titles, deep-linking into a signed-out app, while
   the row promised "erases every reminder". One line in both paths.

### Real product bugs (fix before launch)

6. `createContract` is not transactional: parent row commits, child insert
   fails, retry inserts a DUPLICATE contract (`contracts.ts:49-73`). Needs
   an RPC transaction or parent cleanup on child failure.
7. Analysis/chat error copy is unreachable: `FunctionsHttpError.message`
   never contains the status code, so `msg.includes('422')` etc. never
   match (`contracts.ts:156-160`, `add.tsx:242-251`, `chat/[id].tsx:75-78`).
   A user at the monthly ceiling (429) is told "try again". Read the
   response status/body instead of matching the message.
8. Per-device AsyncStorage bleeds across accounts: `remindersEnabled`,
   insight-dismissed, `onboardingPending` are never namespaced or cleared
   (`notifications.ts:8,38-41`, `onboarding.ts:141`). Worst case: a new
   user answers "Yes, remind me" on q3 but `rebuildAll` early-returns on a
   previous account's OFF flag, and q3's yes-handler never re-enables it
   (`onboarding.tsx:185-193`) — zero reminders despite the promise.
9. The "Past due" dashboard tile and the calendar's overdue dot are
   structurally always zero: occurrences floor at today
   (`reminderPlanner.ts:38-53`, `StatsOverview.tsx:23-29`).
10. Recurring dates read "Past due" forever on the detail screen and lose
    the card's next-up chip (`contract/[id].tsx:252`, `status.ts:23-28`
    ignore recurrence) — contradicts calendar/dashboard, which expand
    occurrences.
11. Analyzed contracts never get `end_date` (not in the analysis schema;
    review shows the date fields only in manual mode, `add.tsx:478-483`),
    so the "ends soon" badge is inert on the app's primary flow.
12. The disclaimer trio is 2-of-3 on analysis surfaces: `DISCLAIMER` and
    `DISCLAIMER_CHAT` (`legal.ts:17-30`) omit the no-attorney-client
    claim the house rule says travels together. Extend the constants or
    amend the rule — as written the rule is violated on add/detail/chat.
13. Reminders toggle shows ON when iOS permission is denied: the
    `requestPermission()` result is discarded (`notifications.tsx:28-39`),
    no denied-state UI, no `Linking.openSettings()` shortcut.
14. Premium card sells "email forwarding" but forwarding is free for
    everyone (`settings.tsx:118-121` vs ungated RPC and email-in's own
    "Arriving in your inbox is free"). Fix the pitch or gate the mint.
15. email-in renders RPC failure as "Your address is being set up."
    forever (`email-in.tsx:43-81`; retry 1, staleTime Infinity, no error
    state, no retry button).
16. RESOLVED 2026-07-30 by the landing deploy — every in-app web link now
    resolves (Terms, Privacy, Help, share message all live at
    usecontraya.com).
17. `support.tsx:74-79` hand-writes a third disclaimer wording instead of
    importing from `legal.ts` (drops the AI-disclosure and no-privilege
    claims); `about.tsx:53-57` data-handling claims are inline too.
18. ~~Email worker duplicates on retry~~ **FIXED 2026-07-31.** The ingest
    POST is unwrapped (`email-worker/src/index.js:63`), a rejected
    `email()` makes the MTA redeliver, and `ingest-email` mints a fresh
    UUID path per call, so the same contract filed two or three times.
    Now the PDF bytes are SHA-256'd and the digest stored on `inbox_items`
    (migration `20260731000000_inbox_dedupe.sql`, partial unique index on
    `(user_id, content_sha256)`); a repeat returns 200 `deduped` without
    uploading, and the unique index catches the concurrent race. Scoped to
    rows still IN the inbox, because importing deletes the row, so
    re-forwarding the same PDF later still works. **Owner must run
    `supabase db push`.**
19. The reminder ledger claim is not atomic: read → send → insert with the
    insert error swallowed (`send-date-reminders/index.ts:216-275`), while
    `reminders.sql:79-81` documents an upsert-claim. Overlapping runs
    (manual curl during the cron, pg_net retry) double-send; send-before-
    record re-delivers next day after an insert failure.
20. Yearly recurrence anchored on Feb 29 diverges: cron rolls to Mar 1
    (`setUTCFullYear`, `index.ts:62`), client clamps to Feb 28 (date-fns
    `addYears`). Ledger keys the wrong occurrence; channels disagree.
21. **HALF FIXED 2026-07-31 (analyze; chat still open).** Truncation used
    to surface as the same 422 "Couldn't read this document" as garbage
    input, with the slot consumed. `analyze-contract` now checks
    `stop_reason === 'max_tokens'` and says what actually happened.
    **Deliberately still not refunded:** at that point there is no parsed
    body, so `is_contract` is unknowable, and refunding would let any
    document that reliably truncates be looped for unbounded spend, which
    is exactly what the no-refund-past-this-point rule exists to stop. It
    now logs `usage`, so the first real analyses will show whether
    `MAX_TOKENS = 8000` is simply too low for a dense 50-page contract;
    raising the cap costs nothing until it is used. `chat-contract` has
    the same gap and its 1500 is tighter.
22. A password-recovery link opened while signed in swaps the session
    without invalidating cached contracts (`reset-password.tsx:49-56`;
    the layout invalidates only on status TRANSITIONS) — account A's data
    renders under account B's session until a refetch.
23. Dark-mode cold boot flashes white: `index.tsx` spinner View has no
    background and the root Stack sets no `contentStyle`/nav theme.
24. Android: the add-document Alert has four buttons; Android renders at
    most three, dropping Cancel, and RN Android alerts are not cancelable
    (`DocumentsSection.tsx:92-98`).
25. Photo-pages mode is a one-way door (`add.tsx:398-406`): can't switch
    back to PDF, the tray's add tile is camera-only even for
    library-picked flows, and "Done, read it" with zero pages hits the
    generic error via a server 400.
26. `NotificationPreview.tsx:41-44` is a hand copy of `reminderPlanner`
    strings (`TITLES` is not exported, no test locks them) — first copy
    edit strands the onboarding preview showing a notification the app
    will never send.

### Polish (LOW — batch when convenient)

27. Sign-in network failure reads as wrong credentials
    (`signin.tsx:106-109`); forgot-password claims "sent" even when the
    request never left the device.
28. Apple sign-in: a failed display-name save rejects a SUCCESSFUL
    sign-in (wrong alert over the redirect; name unrecoverable —
    `AuthContext.tsx:180-186`), and the Apple button is not disabled
    while busy.
29. Onboarding q1's "Rarely, I'm organized" is drifted copy and the
    `forgets` metadata key is semantically inverted (means "reads") —
    owner call, before any analytics build on it.
30. No `returnKeyType`/`onSubmitEditing` chaining on signin/reset forms;
    keyboard can clip the Apple button on small phones.
31. Flashes: dismissed insight re-appears for a frame on every dashboard
    mount; reminders switch defaults ON before the stored value loads;
    onboarding Skip awaits a network write with no busy state.
32. Toggle-off during a mid-flight rebuild can leave reminders scheduled
    with the switch OFF (self-heals on next signed-in foreground).
33. Delete-account has no in-flight guard/spinner; a lost response leaves
    "Couldn't delete" shown for an already-deleted account.
34. Detail screen shows terminal "Not found" for transient fetch errors;
    dead `/contracts?filter=` deep-link (dashboard pushes the bare
    route); date rows with a label but no date are silently dropped on
    save; the inbox-failure alert promises "stays in your inbox" but a
    later save consumes it.
35. a11y labels missing on the detail trash, month chevrons, and page-add
    tile; two hardcoded `#FFFFFF` bypassing `theme.primaryForeground`
    (`contracts.tsx:93`, `MonthCalendar.tsx:122`); demo mode shows a
    fake-but-plausible ingest address App Review may try to email
    (`demo.ts:331-333`) — add a review-notes line.
36. Premium pitch hardcodes 15/50 instead of importing `limits.ts`;
    mailto dead-taps silently with no mail client; `delete-account` lists
    storage non-recursively (moot with today's flat paths — breaks on the
    first future subfolder); reminder-email subject interpolates raw
    label/title (Resend-dependent, self-harm only).
37. **Design decision needed before push works:** local 9:00 notification
    + 13:00 UTC cron push for the same (date, window) with no
    cross-channel dedup = two near-identical banners the same morning on
    every healthy device in the Americas.

### Verified solid by the same audit (no action)

All nine backend security properties (auth gating, `${user.id}/` path
checks, atomic fail-closed quotas, RLS + grants, cascade deletion,
timing-safe secrets, verify-pass clamping, no upstream leakage, config.toml
posture); three-way schema/edge/decoder consistency; blank-RevenueCat
degradation everywhere (no crash, no lockout, entitlement `premium` exact);
demo mode's full loop for App Review; timezone-safe occurrence math and
identical monthly clamping on both sides; tab-bar clearance on all tabs;
chat optimistic-send rollback; brand and copy rules (no em dashes in
user-facing strings, no E2EE claims, hello@ only, lime rules, "AI" said
plainly, Terms/Privacy links on welcome and signin).

The full plan (market research, architecture decisions, phases) lives in the
planning doc from the 2026-07-28 session; the decisions that matter are
restated here.

**What Contraya is:** the user uploads a contract (one PDF or up to 12 page
photos). The `analyze-contract` edge function has claude-sonnet-5 read it and
return: a plain-English summary, parties, payment terms, key_dates[] (typed:
payment/renewal/termination_notice/expiry/start/custom, with recurrence and
per-type reminder windows), obligations[], and risk_flags[] (severity + clause
quote + why it matters). The user reviews and corrects the dates (the accuracy
safety valve), saves, and from then on the app reminds them before every date:
local notifications on-device plus a daily push cron. **Describe, never
advise** — every analysis surface carries "This explains what the contract
says. It is not legal advice."

**Differentiator:** every consumer competitor is a one-shot reader
(scan → report → done). Contraya keeps working after the analysis — the
contract lifecycle (payments, renewals, notice windows) lives on the calendar
with reminders. That is Warraya's proven DNA pointed at contracts.

**Separate-app decision is FINAL (owner confirmed 2026-07-28):** Contraya
stays its own app/repo/brand, not a Warraya feature or rebrand. Reasons on
record: token economics don't fit under Warraya's $4.99 sub (an analysis
costs 15-30x a receipt scan), "warranty tracker" and "contract reader" are
different App Store search intents, contract analysis is the legally
sensitive surface and must not put Warraya releases at risk, and Warraya's
tab bar has no room for a parallel contracts universe. Mitigation for the
zero-install cold start: cross-promote from Warraya at launch (see launch
checklist). Fallback if Contraya finds no audience: fold it into Warraya as
a premium add-on later — that door stays open in this direction only.
Harvey AI was evaluated and ruled out as a backend: enterprise-only, no
public API, built for lawyers doing legal work (wrong fit for
describe-never-advise). claude-sonnet-5 via the Claude API stays.

## What is DONE (in this repo, verified)

- **Agentic follow-through, slice 1 (2026-07-31).** Direction chosen by the
  owner: the app may act between sessions on facts the user has ALREADY
  CONFIRMED, and interprets nothing. "Describe, never advise" stays absolute
  (no drafting, no recommendations, no positions). Calendar sync is the
  template. Four changes, each independent, each fixing a verified defect:
  1. **The email-in push was dead and is fixed.** `ingest-email` was POSTing
     to Expo's push service (`exp.host`) long after commit `8d288d7` moved
     push to direct APNs, and `push_tokens` holds RAW APNs device tokens,
     which that endpoint cannot accept. **Every document that arrived by
     email landed in the inbox silently, since 2026-07-30.** The APNs signer
     is now `supabase/functions/_shared/apns.ts` (`createApnsSender`), used by
     both `ingest-email` and `send-date-reminders`; the cron's payload is
     byte-identical to before. The fixed, non-interpolated push body stays
     exactly as it was, for the spoofing reason its comment gives. Dead until
     the APNS_* secrets land (checklist item 13), same as the cron.
  2. **`stop_reason === 'max_tokens'` guard** in `analyze-contract`. See
     audit finding 21 for why it deliberately does not refund.
  3. **The review screen is now a mechanism, not a claim.** The verification
     pass ran, the screen showed a marker, and the verdict was dropped at
     save, so a date Contry could not re-find became a 9:00 push
     indistinguishable from one it confirmed twice. Save is now blocked while
     any date is `not_found` or `corrected` (`unresolvedDates` in
     `src/data/analysis.ts`, pure and tested), and a "Checked" tap clears a
     flag without forcing the user to retype a value that was already right.
     **The verdict is still not persisted, on purpose:** storing "we could
     not verify this" would put a judgment ABOUT the document on a contract
     screen, which is the failure mode `legal.ts:32-37` guards against and
     Terms §3 disclaims. It acts at the only moment it can act honestly.
  4. **Inbound email dedupes by content hash.** See finding 18.
  Plus `PersonalizedInsight` now reads real data (`src/data/insight.ts`,
  pure and tested) instead of reflecting three onboarding answers back at
  everyone. **It performs no arithmetic over money and a test pins that:**
  `total_value` is null whenever a document states no total, there is no
  currency column, and lease totals / coverage limits / vendor prices are not
  the same quantity, so a portfolio sum would be a figure appearing in no
  document.
- **Apple Calendar sync (2026-07-31, roadmap item 2, NOT yet device tested):**
  opt-in and Premium-only switch at `app/(app)/calendar-sync.tsx` that mirrors
  contract dates into a calendar Contraya creates via EventKit
  (`expo-calendar` 57.0.1, new class API). Owner decisions, locked: never
  automatic (default OFF, and the toggle is the ONLY place calendar permission
  is ever requested), no alarms on the events (Contraya already reminds twice),
  Premium-gated, created on the user's DEFAULT calendar source so an iCloud
  user gets it on their Mac and iPad, full titles by default with a "Hide
  contract names" switch for sensitive contracts.
  - Pure and tested: `src/lib/calendarPlanner.ts` (expands via the SAME
    `nextOccurrences` the Calendar tab and reminders use, plans the copy,
    hashes the plan, owns the window) and `src/lib/calendarSyncStore.ts`
    (per-account AsyncStorage, defaults DISABLED on every failure path — the
    deliberate INVERSE of `remindersEnabled()`, which defaults ON).
  - Native and untested: `src/lib/deviceCalendar.ts`, the only EventKit
    importer. `src/lib/deviceSync.ts` fans out to reminders + calendar so no
    call site can update one and forget the other; it replaced the repeated
    `listAllDates().then(rebuildAll)` idiom at all four sites, and
    `clearDeviceSchedules()` replaced `clearScheduledReminders()` on sign-out
    and account deletion.
  - **Load-bearing choices, do not "optimize" away:** events are materialized
    one per occurrence, NOT a native `recurrenceRule` — EKRecurrenceRule
    repeating on the 31st SKIPS months without a 31st while `nextOccurrences`
    clamps to the 28th, so the app and the phone would contradict each other.
    Reconcile is a diff on (local day, title) rather than wipe-and-rebuild, to
    keep iCloud churn down. The delete window starts at TODAY so past events
    are never destroyed. The fingerprint does NOT include today's date (that
    would rewrite every event daily). The fingerprint is written LAST so a
    partial write self-heals on the next sweep.
  - `app.config.ts` carries the plugin with FULL access (write-only cannot
    create or delete calendars, and its empty reads would turn the reconcile
    into a duplicate generator) and `remindersPermission: false` so no unused
    NSReminders string ships. `PrivacyInfo.xcprivacy` needs nothing: calendar
    is not a required-reason API and nothing is collected.
  - **Owed: the device checklist in the plan.** The simulator exercises none
    of what matters here (no iCloud source, no iOS 17 permission split, no
    second device). Watch specifically: all-day events rendering as ONE day
    not two, whether Calendar.app opens the `contraya://contract/<id>` URL
    (drop the field if not), and whether iOS Default Alert Times adds an alert
    despite `alarms: []`.
- **Mobile app compiles and tests green:** tsc strict clean, **240 tests across 24 suites** (`cd mobile && npm run typecheck && npm test`), lint clean. Demo mode boots
  with blank env vars and seeds a lease (auto-renewal risk flag, recurring
  rent) + a wedding-vendor contract (obligations) — this doubles as the App
  Store reviewer path.
- **Screens:** island tab bar (Dashboard / Contracts / centered + FAB /
  Calendar / Settings — same `TabBar.tsx`/`islandMetrics.ts` as Warraya, all
  screens keep `useTabBarClearance()`); contracts list with status chips +
  Contry search; calendar fed by materialized occurrences (recurring dates
  expanded via `nextOccurrences`); add flow (PDF picker | multi-shot page
  camera with thumbnail tray → staged "Contry is reading" spinner → review
  screen with editable dates → save); contract detail (summary, disclaimer
  banner, dates timeline, obligations checklist with completed toggles,
  severity-badged risk flags with quotes, documents shelf, mark ended);
  settings (reminders toggle, premium section, About These Summaries
  long-form disclaimer page, account deletion).
- **Data layer:** `contracts` + `contract_dates` (reminder_windows int[] per
  row) + `contract_obligations` + `contract_risk_flags` + `contract_documents`;
  `repo.ts` live/demo dispatch preserved; tolerant analysis decoder
  (`src/data/analysis.ts`, unit-tested) is the trust boundary for model output.
- **Reminder stack:** `reminderPlanner.ts` rewritten (pure + unit-tested):
  occurrences × windows at 09:00 local, id
  `contract.<contractId>.<dateId>.<occurrence>.<w>d`, MAX_PENDING=60
  nearest-first, tap routing to `/contract/[id]`. Cron
  `send-date-reminders` written (clone of Warraya's, widened ledger keyed
  (date row, occurrence, window, channel), month-end clamping matches the
  planner). Windows default by type: payment {7,1},
  renewal/termination_notice {60,30,7}, expiry {30,7}.
- **Edge function `analyze-contract`** (deployed 2026-07-29): Warraya's
  security skeleton (auth 401 → validate → download → atomic quota consume →
  model → refund on failure → 422 on refusal/not-a-contract → no upstream
  leaks). claude-sonnet-5, max_tokens 8000, adaptive thinking at
  `effort: 'low'` (raise to 'medium' if date accuracy disappoints — the one
  tuning knob), nested json_schema via output_config.format, PDF document
  block or ordered image blocks BEFORE the text block, base64 without
  newlines, 120s upstream timeout → refund + 504. **Security-critical check:
  every storage path must start with `${user.id}/`** (the function downloads
  with the service role, which bypasses storage RLS). Server ceiling
  ANALYSIS_CEILING=20/user/month (tightened 2026-07-28), fail-closed 503. Token usage logged per
  call — watch cost from day one.
- **Migrations** (all applied 2026-07-28): `20260728000000_init` (5 tables +
  documents bucket + per-user 200-contract cap + per-contract 100-child-row
  caps), `20260728000100_reminders` (push_tokens + register_push_token +
  contract_date_reminders ledger), `20260728000200_analysis_usage`
  (atomic try_consume_analysis/refund_analysis, service-role only),
  `20260728000300_avatars`. Same conventions as Warraya throughout (RLS,
  revoke anon, explicit GRANTs, CHECKs, `(select auth.uid())`).
- **Monetization wiring:** entitlement `premium`, fail-open philosophy,
  soft paywall at the analysis wall. FREE_ANALYSIS_LIFETIME_LIMIT=2 (lifetime,
  summed across periods), PRO_MONTHLY_ANALYSES=10 (client gate; hard alert,
  no paywall, when a premium user hits it). Contracts + reminders unlimited
  on both tiers. Gate verdicts now live in `mobile/src/lib/quotaGate.ts` as
  pure functions (`analysisGate`, `chatOpenGate`, `chatSendGate`) with the
  screens keeping only the side effects, covered by
  `__tests__/quotaGate.test.ts` (13 cases). That suite is the ONLY pre-launch
  verification of the gates, because StoreKit vends nothing before approval.
- **PRICING DECIDED 2026-07-30: $9.99/mo, $69.99/yr (42% off), 3-day free
  trial on both products. Premium = 10 analyses + 40 Ask Contry questions a
  month.** This replaces the advertised $7.99/$49.99 with 15/50, which had
  never been checked against unit cost. The math the old note demanded:
  - `claude-sonnet-5` intro pricing ($2/$10) **ends 2026-08-31**, stepping to
    $3/$15. All figures below are post-step-up, since the app launches into
    the higher rate.
  - Per analysis (two calls, whole document inlined, no OCR service): ~$0.10
    for a typical 5-page PDF, ~$0.18 for 12 photographed pages, ~$0.56 for a
    50-page PDF at the byte cap.
  - Old quota worst case: 15 x $0.50 + 50 x $0.05 = **$10.00/mo COGS** against
    $6.79 net of Apple's 15%. Underwater by $3.21 for anyone who used what was
    advertised, and far worse on the old $49.99 annual.
  - New quota worst case: 10 x $0.50 + 40 x $0.05 = **$7.00** against $8.49
    net. Positive at the ceiling; ~91% margin at the realistic median of 2-4
    contracts a month (~$0.75/mo COGS).
  - Server ceilings stay 20/60, giving 2x headroom on analyses and 1.5x on
    chats. `quotaGate.test.ts` asserts ceiling > product limit so a future
    quota bump cannot silently start 429-ing paying users.
  - **Trial exposure, accepted by owner:** a trialist is `isPro`, so 3 days
    buys the full 10-analysis quota at zero revenue, ~$5 of tokens each, very
    roughly $16 per acquired subscriber at a 30% conversion rate.
  - **Cost risk still open:** `chat-contract` re-sends the whole document per
    question against a 5-minute ephemeral cache, so a user asking one question
    a day pays cache WRITES (1.25x), not reads (0.1x). The "~$0.02-0.05 a
    question" estimate holds for short contracts and bursty sessions only; on
    a 50-page contract it is nearer $0.30. Does not change the price, but it
    is the biggest remaining unknown in COGS. Measure from the logged usage
    numbers before raising PRO_MONTHLY_CHATS.
- **Landing** (repo root): full marketing page mirroring Warraya's landing
  structure (nav, gradient hero with a floating lease-card mock, pain/fix
  features panel, how-it-works, contract-type chips, pricing, FAQ, CTA,
  footer), adapted for pre-launch: the only CTA is the early-access mailto
  (hello@usecontraya.com) — swap in the App Store badge at launch. Advertised
  pricing is **$9.99/mo or $69.99/yr, 3-day free trial** (owner decision
  2026-07-30, see "Pricing decided" below; the Premium badge now reads
  "3-day free trial" where it read "Early access"). Not-legal-advice line appears under the
  hero CTA, in the features closer, in the FAQ, and in the footer. Adapted
  Privacy/Terms (Terms carries a "Not Legal Advice" section), builds clean.
  Web dashboard, guides, service worker all deleted — landing only.
  **Dependency prune (2026-07-28):** the dashboard was deleted but its deps
  and components were not. Removed 15 dead files (all 12 shadcn
  `src/components/ui/*`, `JsonLd.jsx`, `PageNotFound.jsx`, `lib/utils.js`)
  plus `components.json`, and 16 unused runtime dependencies (all six
  `@radix-ui/*`, `@supabase/supabase-js`, `@tanstack/react-query`,
  `class-variance-authority`, `clsx`, `date-fns`, `framer-motion`,
  `lottie-react`, `sonner`, `tailwind-merge`, `vaul`). Each was verified
  unreferenced by every surviving file before removal. Runtime deps went
  21 → 5 (react, react-dom, react-router-dom, lucide-react,
  tailwindcss-animate); bundled CSS dropped 52.8 kB → 38.4 kB. CSP tightened
  to match: `img-src`/`connect-src` no longer whitelist `*.supabase.co`,
  since the landing makes no network calls at all.
  **The same pass over `mobile/` (2026-07-28) found no dead code**, which is
  the expected result since the app was written for Contraya rather than
  inherited: an import-graph walk from all 33 route/test entry points reaches
  all 59 `src/` files, every dependency is imported or referenced by
  `app.config.ts`/jest, and every exported symbol flagged as
  "unreferenced elsewhere" turned out to be a type, cap, or helper used inside
  its own file. Only stragglers removed: four unreferenced icon files
  (`android-icon-background/foreground/monochrome.png`, `favicon.png`) that
  `app.config.ts` never consumed and that were Warraya art anyway. Also fixed
  `assets/animations/README.md`, which still listed four deleted
  `loading-contry-*.json` files as current and described the success animation
  as firing "after a warranty saves".
  **Open question, not acted on:** `mobile/eas.json` is a complete EAS build
  config, but CLAUDE.md and `app.config.ts` both say builds go through Xcode
  and never `eas build`. Left in place rather than deleted, but it is a
  contradiction someone could act on by mistake; delete it if EAS is truly
  never coming back.
  **Known, deliberate:** `react-router-dom` 6.30.4 carries two moderate
  advisories (open-redirect→XSS, SSR `deserializeErrors`) whose fix requires
  the v7 major. Neither is reachable here — static SPA, no SSR, three fixed
  routes, no user input feeding the router — so the major upgrade was left
  as a separate decision rather than folded into a cleanup pass. `postcss`
  was patched. Remaining dev-only advisories all come through `wrangler`.
- **Email-in ingestion (2026-07-28):** every user gets a secret forwarding
  address `c-<32 hex>@usecontraya.com` (minted server-side by the
  `get_or_create_email_token` RPC; the token IS the credential — senders are
  spoofable and stored as metadata only). Chain: Cloudflare **Email Worker**
  (`email-worker/`, bound as the domain catch-all; hello@ keeps its explicit
  forward, which takes precedence) parses the message with postal-mime,
  extracts up to 3 PDF attachments (10MB cap, PDF-only on purpose — inline
  images in email are signature logos, not contracts), and POSTs each to the
  **`ingest-email` edge function** (shared INGEST_SECRET, timing-safe), which
  validates (token lookup, 20/day rolling rate limit + 200-row DB trigger
  backstop, %PDF magic bytes), stores under the user's folder, inserts an
  `inbox_items` row, and sends a push ("A contract arrived by email").
  **Ingestion never calls the model** — spam can cost storage only. In-app:
  Settings shows the address (share + treat-like-a-key warning), the
  Dashboard shows a "Received by email" section (tap → `/add?inbox=<id>`
  which runs the normal quota gate → analysis → review → save, attaching the
  already-stored PDF; dismiss deletes row + file). Non-PDF or unknown-token
  mail bounces with a clear SMTP rejection. Migration
  `20260728000400_email_ingest.sql`. Demo mode seeds one inbox item.
- **v1.1 "Contract Assistant" deltas (2026-07-28):** owner supplied a product
  brief; gap analysis showed ~80% already built. Added: **Ask Contry** —
  per-contract Q&A, premium-only. `chat-contract` edge fn (analyze-contract
  skeleton; ownership proven by fetching the contract with the USER-JWT
  client so foreign ids 404 before any spend; per-call layout puts system +
  document + stored-analysis notes as a byte-stable cached prefix with
  `cache_control` on the notes block, so follow-up questions cost ~10% —
  verify `cache_read_input_tokens > 0` in the logs on question 2).
  `chat_usage` migration `20260728000500` (atomic consume/refund,
  CHAT_CEILING=60/mo server (tightened 2026-07-28), PRO_MONTHLY_CHATS=50 client). Screen
  `/chat/[id]`: pinned disclaimer, suggestion chips, session-only transcript
  (persistence = roadmap), paywall on open for non-premium. Entry button on
  the contract detail. Demo mode answers canned lease questions offline.
  Also added (migration `20260728000600`): `total_value` +
  `party_other_contact` extraction (schema + prompt + decoder + detail rows,
  contact row taps to mailto/tel) and the derived "ends soon" badge on
  ContractCard. Deferred to roadmap by owner: .docx support, expo-calendar
  sync, Face ID lock. **Copy rule added: never claim end-to-end encryption**
  (incompatible with server-side analysis; say encrypted in transit/at rest).
- **v1.2 date verification pass (2026-07-28):** owner flagged hallucination
  as the top product risk (correct: a wrong renewal/notice date is the exact
  harm the app exists to prevent). `analyze-contract` now sets
  `cache_control` on the analysis call's first turn and, when there is wall
  clock left (<90s used), runs a SECOND turn of the same conversation asking
  the model to re-locate every extracted date in the document. Verdicts merge
  onto `key_dates[].verified`: confirmed / corrected (date replaced with the
  second read's value) / not_found; any verify failure degrades every date to
  'unchecked' and never fails the analysis (one quota slot covers both
  calls). The review screen shows an amber "check it" line under corrected /
  not_found dates, and editing a flagged date clears the flag (the human did
  the check). Cost: ~10% extra thanks to the cached prefix — **on the first
  live run, confirm the 'verify usage' log line shows
  cache_read_input_tokens > 0**; if it reads 0, the format switch is busting
  the cache and the fallback is plain-text JSON output for the verify turn.
  **Chat legal-conclusion hardening (same day, owner example: "can I sue
  the tenant?"):** the chat system prompt now carries an explicit no-yes-no-no
  rule for sue/evict/win/enforceable/legal questions (attorney-referral
  sentence + what the contract itself says, quoted), an anti-sycophancy rule
  ("you are on the document's side"; the asker's hopes never change the
  answer), and a worked wrong-vs-right example of exactly the sue question —
  worked examples are what make prompts hold against this trap. Demo mode
  mirrors the behavior so App Review sees it. Include a "can I sue them?"
  probe in the live chat smoke test and confirm the answer contains no
  yes/no and ends at the attorney referral + quoted clauses.
  Remaining hallucination roadmap (owner-deferred): deterministic review
  validators (impossible windows, notice-after-end, duplicates), risk-flag
  quote verification via PDF text extraction, chat
  stored-dates-are-authoritative instruction, eval harness with real
  contracts.
- **Onboarding + "answers and knowledge" redesign (2026-07-28):** studied
  Docusign/Chime/Monese/Klarna onboarding via Mobbin, then closed nine gaps
  between what the app already did well and what those apps do better, using
  only already-installed tools (Reanimated 4, Lottie, plain Views — no new
  dependency; glows are layered translucent circles, not
  `expo-linear-gradient`, since this session's sandbox could not install a
  new native package). No mascot art invented anywhere; every new
  `ContryFace` usage still falls through to its designed icon fallback.
  - **Onboarding answers now come back to the user** (previously captured
    into `user_metadata` and never shown again): `AuthContext` now exposes
    `onboardingAnswers`; a pure `reflectOnAnswers()` in `onboarding.ts` turns
    the q1-q3 answers into one of five short reflective lines, rendered by
    the new `PersonalizedInsight` component on the onboarding 'done' step and
    (dismissibly, persisted via AsyncStorage) on the dashboard right under
    `StatsOverview`.
  - **New 'intro' onboarding step** before q1: "Before you start, three quick
    questions" framing screen (Monese-inspired), chrome-free, Skip still
    available.
  - **NotificationPreview**: a static mock of the actual reminder
    notification shown on q3, copy sourced exactly from
    `reminderPlanner.ts`'s `TITLES`/body template, continuing the same
    lease/9-days story `welcome.tsx`'s mock card already tells.
  - **The analysis review screen reveal** (`add.tsx`) now stages in
    (Reanimated `entering` shorthand) instead of appearing flat, wrapped in a
    new `InsightCard` component with a `GlowBackdrop` halo; the risk-flags
    tease line became real severity-colored pills showing each flag's actual
    title, reusing a new `theme/severity.ts` (also now the single source for
    the contract-detail screen's severity colors). The `reading` mascot slot
    (defined, unwired since launch) is now wired into the analyzing screen
    with a breathing-pulse animation on its icon fallback.
  - **Ask Contry's first answer** in a conversation renders in the same
    `InsightCard` treatment, with the first sentence bolded
    (`textFormat.ts`'s `splitLeadIn`); later turns keep the plain bubble.
  - **welcome.tsx**: `GlowBackdrop` hero wash + halo behind the mock card, a
    "Nobody reads the fine print. Contry does." tagline under the wordmark,
    staggered entrance animation (previously none).
  - The always-render-regardless-of-summary disclaimer guarantee in `add.tsx`
    and the pinned disclaimer strip in chat are both unchanged (verified
    byte-identical `DISCLAIMER` strings); no "AI" wording, no em dashes in
    any new copy.
- **Whole-app security audit round 2 (2026-07-28):** six parallel adversarial
  audits (mobile client, edge functions, DB/RLS, LLM/prompt-injection, email
  pipeline, deps/landing/hygiene). Fixed the same day:
  - **HIGH — denial-of-wallet:** analyze/chat refunded the cost-ceiling
    counter on `is_contract:false` / refusal / parse-fail, all AFTER the model
    billed for the read, so anyone could loop large non-contract PDFs for
    unbounded Anthropic spend. Now `refund` is nulled the instant a 2xx comes
    back; only pre-billing failures (upstream non-2xx, pre-response timeout)
    refund. Tradeoff: a genuine non-contract upload now costs a slot (the read
    was paid for); error copy says so. A separate non-refundable "attempt"
    counter (to spare honest mistakes without reopening the hole) is on the
    roadmap alongside server-side receipt validation.
  - **MEDIUM — DB re-parenting → cron DoS:** the child-cap trigger is BEFORE
    INSERT only, so a client could re-parent owned `contract_dates` rows
    between owned contracts and grow rows without bound (swelling the
    all-users scan in send-date-reminders). Added a BEFORE UPDATE trigger
    freezing `contract_id`/`user_id`. Storage RLS stays guaranteed by
    verify.sql's live check, NOT by a migration statement — `alter table
    storage.objects enable row level security` cannot run under db push
    (see the gotcha in checklist item 1) and no migration contains it. Also
    gave `contract_obligations` UPDATE the same parent-ownership
    `with check` for parity.
  - **MEDIUM — email push phishing:** the ingest push interpolated the
    spoofable sender + filename into a notification carrying the app's title
    ("invoice.pdf arrived from billing@yourbank.com"). Push body is now a
    fixed string; `clean()` strips control/bidi chars; the inbox row labels
    the sender "Unverified sender:".
  - **MEDIUM — LLM hardening:** analyze + chat system prompts now state that
    document text is content to describe, never instructions to follow; chat
    additionally tells the model that prior assistant turns are client-supplied
    and may be fabricated (the durable fix, server-persisted transcripts, stays
    roadmap). The client decoder strips control/bidi chars and clamps dates to
    a 2000-2100 window; the server verify pass clamps corrected dates the same
    way so a crafted 0001/9999 can't schedule an absurd reminder.
  - **LOW batch:** `party_other_contact` validated as a bare email before
    `mailto:` (no hidden bcc/body pre-fill); UUID regex tightened in
    chat-contract; email-worker `PostalMime.parse` wrapped so malformed mail
    bounces instead of driving MTA retries; committed a `package-lock.json`
    for email-worker (postal-mime parses hostile MIME — was unpinned);
    `*.keystore`/`*.pem` added to mobile gitignore.
  - **Accepted / documented, not fixed:** RevenueCat fail-open (cost only,
    bounded by the server ceiling; note the free wall is inert until a
    RevenueCat offering is live); signup email-enumeration via "already
    registered" (LOW, standard UX tradeoff); ingest daily-limit TOCTOU (200-row
    trigger is the hard stop); PDF polyglots (same risk as any uploaded PDF);
    npm audit advisories (all dev/build tooling, none runtime-reachable — left
    for a deliberate maintenance bump, not `--force`d). **Verified sound:**
    no committed secrets across full git history, strong landing CSP, RLS on
    every table, atomic fail-closed quotas, correct IDOR/path-traversal gating,
    no SSRF/ReDoS, complete delete-account cascade.
  - **Deferred to owner machine (see checklist):** move the Supabase session
    from plaintext AsyncStorage to expo-secure-store — a native module the
    agent proxy can't install here, and it needs prebuild.
- **Launch-readiness audit + fixes (2026-07-28):** three-way audit (legal
  pages/landing, in-app disclaimer surfaces, backend security) ran and every
  found gap was fixed the same day:
  - **Terms** now carries Subscriptions and Billing (auto-renew via Apple ID,
    3.1.2 language), Governing Law (**Puerto Rico** — owner confirmed
    Renovatio, LLC is registered there), age/capacity, indemnification,
    severability, and hello@usecontraya.com contact. **Privacy** now
    discloses email forwarding (sender/subject/attachments stored, body not),
    the third-party document-processing provider, push tokens + Sign in with
    Apple data, and at-rest encryption. Both docs: deletion unified to
    "promptly, residual copies within 30 days" and **hardcoded LAST_UPDATED
    constants (bump by hand on every text change — never `new Date()`)**.
  - **App:** review-screen disclaimer no longer gated on a non-null summary
    (renders on every review state); welcome + signin carry "By continuing
    you agree to the Terms of Service and Privacy Policy" links; welcome's
    example card de-Warrayafied (lease/renewal, not espresso/refund);
    STORE_LISTING.md rewritten for Contraya (was wholesale Warraya) incl.
    the App Review notes block and App Privacy declarations.
  - **Backend:** contract_dates UPDATE policy re-proves parent ownership
    (was re-parentable onto a foreign contract UUID); ceilings tightened
    ANALYSIS 40→20, CHAT 300→60 (paid limits are client-side only, so the
    ceilings are the real cost gate); chat appends a RULES_REMINDER to the
    final user turn (forged client history can no longer bury the
    no-legal-conclusions rules); reminder-email HTML escapes label/title;
    delete-account POST-only; ingest-email rejects (not truncates) over-long
    tokens; model-output JSON.parse isolated so document-derived text can't
    reach error logs; `supabase/config.toml` codifies verify_jwt per
    function. Accepted risks (documented, not fixed): register_push_token
    takeover-by-design, ingest daily-limit TOCTOU (trigger backstops), PDF
    page-count bypass (byte cap + Anthropic's 100-page limit backstop),
    unverified sender rendered in inbox UI.
- **Palette: navy + lime, not blue (2026-07-28).** Contraya was using
  Warraya's exact primary `#3B82F6` in both modes; with the shared icon the
  two apps were visually the same product. Lime is now the brand accent and
  deep navy carries structure. Lime was chosen by measurement, not vibes, and
  the split matters: bright lime `#A3E635` is **1.5:1 under white text** and
  **11.5:1 under dark ink**, so there are three tokens with distinct jobs, in
  `mobile/src/theme/colors.ts` and mirrored in `src/index.css`:
  `primary` (navy `#0F2060` light / `#1A3A8F` dark, for filled buttons, white
  labels at 15:1 and 10:1), `brand` (`#A3E635`, fills and glows ONLY, paired
  with `brandForeground` ink), and `brandText` (`#4D7C0F` in light mode at
  4.99:1 on white, the bright lime in dark mode at 12:1 — for links, active
  tabs, accent icons). **Never put white text on `brand`; never use `brand`
  as text on a light surface.** Lime earns a full fill in exactly three
  places: the add FAB (dark ink on lime), the progress fill, and the
  GlowBackdrop wash. Status colors are deliberately untouched — green means on
  track, amber soon, red overdue, and those meanings outrank the brand color
  in an app about deadlines. All four bundled Lotties were recoloured (two
  held the old brand blue, two held a different indigo ramp `#2e31ff`/
  `#575aff`/`#1517d0`/`#180ad0` that would have clashed); the guard test still
  passes. Also fixed a real leak: `app.config.ts` set the **Android
  notification tint** to Warraya blue, visible on every reminder.
  **Residual to eyeball on device:** in dark mode the lime accent and the
  mint "on track" badge (`#34D399`) sit close in tone (1.27 apart). Status
  badges are pills with their own tinted backgrounds and text labels, so
  context should carry it, but this is the one thing worth a real look.
  The recoloured loader animations are owner-supplied art that was hue-mapped
  programmatically, so those deserve a glance too.
- **Mascot:** Contry (registry at `mobile/assets/mascot/index.ts`, slots
  search-idle/search-active/search-empty/reading, all null — icon fallbacks
  render until the owner supplies art; NEVER ship placeholder art). Warry's
  four shield Lotties were removed from the loader pool (wrong brand); the
  pool is the 2 generic loaders until Contry art arrives.

## Owner setup checklist (nothing works live until these)

1. **Supabase project** — **CREATED** (2026-07-28). Project ref
   **`tzqjnbcbrcfltnjutels`**, name `contraya`, region Canada (Central), so
   the API URL is `https://tzqjnbcbrcfltnjutels.supabase.co`. (Not a secret:
   it ships in the app bundle. Warraya's is `kwcxchyhssmqqrzmlzux` — never
   push Contraya migrations to that one.) Still to run, from the Mac:
   `supabase link --project-ref tzqjnbcbrcfltnjutels`, then
   **`supabase db push` DONE (2026-07-28)** — all seven migrations applied
   clean on the first successful run, so the schema, RLS, triggers, quota
   RPCs and both storage buckets are live. Functions deployed too (item 3).
   **Schema verified live (2026-07-29):** `supabase/verify.sql` run in the
   SQL Editor returned 34/34 PASS. Confirmed in production, not just in the
   migration files: all 11 tables with RLS on, anon holding zero table
   grants, all 10 functions, the four metered quota RPCs unreachable by
   `authenticated`, all 7 triggers including `contract_dates_freeze_parent`,
   and both buckets private at 10MB/2MB. Two results that look wrong but are
   correct: `contract_date_reminders` has 0 policies (RLS on + revoked from
   authenticated = service-role only, the strictest state), and
   storage.objects has 7 policies (3 documents, no UPDATE by design, + 4
   avatars). Re-run verify.sql after any future migration.
   Gotcha burned on the first attempt: an `alter table storage.objects
   enable row level security` in init.sql aborted the whole migration.
   That table is owned by supabase_storage_admin and the migration role
   cannot ALTER it. Creating policies on it is fine; toggling its RLS is
   not. Do not add that statement back.
2. **Secrets:** the Anthropic key is **DONE but lives under the name
   `CLAUDE_API_KEY`** (owner named it that on 2026-07-28; it is a new key so
   Contraya's token spend tracks separately from Warraya's). **Caught
   2026-07-30:** the functions read `ANTHROPIC_API_KEY`, which does not
   exist in the dashboard, so the very first real analysis would have
   502'd. Both functions now accept either name (`ANTHROPIC_API_KEY` first,
   `CLAUDE_API_KEY` fallback), redeployed and byte-verified the same day.
   `CRON_SECRET` **DONE** (verified in the secrets list, set 2026-07-29;
   STATUS previously said it was missing). Still to set: `APNS_TEAM_ID` +
   `APNS_KEY_ID` + `APNS_P8_BASE64` (item 13), `INGEST_SECRET` (item 10),
   `RESEND_API_KEY` (later; the email channel soft-skips without it).
3. **Deploy functions** — **DONE (2026-07-29).** All five are live in the
   dashboard: `analyze-contract`, `chat-contract`, `delete-account` (normal
   JWT), `send-date-reminders` and `ingest-email` (`--no-verify-jwt`, they
   carry their own shared-secret header check instead).
   **Redeploy CLOSED 2026-07-30:** the 2026-07-29 chat rule (Contry answers
   plainly that it is not a lawyer, no attorney-client privilege) IS live.
   All five deployed functions were downloaded with
   `supabase functions download` and diffed byte-identical to the repo, and
   the deploy timestamps postdate the rule commit. The JWT posture is
   codified in `supabase/config.toml`, so a plain `supabase functions deploy`
   got it right. **Unauthenticated probe passed:** all five returned `401`,
   including the two `--no-verify-jwt` ones, which proves their in-function
   secret checks fire and that flipping off JWT verification did not leave
   them open. Re-run the probe after any redeploy:
   ```
   for f in analyze-contract chat-contract delete-account \
            send-date-reminders ingest-email; do
     printf '%-22s ' "$f"
     curl -s -o /dev/null -w '%{http_code}\n' -X POST \
       "https://tzqjnbcbrcfltnjutels.supabase.co/functions/v1/$f"
   done
   ```
3b. **Attorney review of Terms + Privacy before launch.** NOW ALSO COVERS THE
   CREDENTIAL CLAIM. On 2026-07-29 the owner added "Built by a lawyer, for
   everyday people" to the welcome screen, the landing, the store description,
   and About These Summaries. This was done against advice: a credential claim
   used to market a service is attorney advertising in most jurisdictions, and
   naming no jurisdiction of licensure is what several bars specifically flag.
   It also raises the odds a user reads output as advice, which is why the
   attorney-client disclaimers were strengthened at the same time. The reviewing
   attorney should be asked directly whether this phrasing is permissible for
   the licensing jurisdiction, and whether it needs "licensed in <state>"
   attached. Do not add a name, a firm, or a jurisdiction before then. Both documents
   were generated and audited in-repo, but nobody licensed has read them.
   Cheap flat-fee review is enough; when the text changes, bump the
   hardcoded LAST_UPDATED constants in both page files.
3c. **Session storage to Keychain (security audit round 2, needs your Mac +
   network + prebuild).** Today `mobile/src/api/supabase.ts` persists the
   Supabase session (incl. refresh token) in plaintext AsyncStorage; a
   jailbroken device or unencrypted backup yields a durable takeover token.
   Fix (pre-launch, so no session-migration concern): `npx expo install
   expo-secure-store`, add a chunked Keychain adapter (SecureStore values are
   ~2KB-capped on some Android, the session JSON exceeds that), set it as the
   auth `storage`, then prebuild. Sketch:
   ```ts
   // mobile/src/api/secureStorage.ts
   import * as SecureStore from 'expo-secure-store';
   const CHUNK = 1800;
   export const SecureStorage = {
     async getItem(k: string) {
       const meta = await SecureStore.getItemAsync(`${k}.n`);
       if (meta === null) return SecureStore.getItemAsync(k);
       let out = ''; const n = Number(meta);
       for (let i = 0; i < n; i++) out += (await SecureStore.getItemAsync(`${k}.${i}`)) ?? '';
       return out;
     },
     async setItem(k: string, v: string) {
       const prev = Number((await SecureStore.getItemAsync(`${k}.n`)) ?? '0');
       const n = Math.ceil(v.length / CHUNK);
       for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k}.${i}`, v.slice(i*CHUNK,(i+1)*CHUNK));
       for (let i = n; i < prev; i++) await SecureStore.deleteItemAsync(`${k}.${i}`); // drop stale chunks
       await SecureStore.setItemAsync(`${k}.n`, String(n));
     },
     async removeItem(k: string) {
       const n = Number((await SecureStore.getItemAsync(`${k}.n`)) ?? '0');
       for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
       await SecureStore.deleteItemAsync(`${k}.n`); await SecureStore.deleteItemAsync(k);
     },
   };
   ```
   Then in `supabase.ts` set `auth: { storage: SecureStorage, ... }`. Verify
   sign-in/refresh/sign-out on a device after prebuild.
4. **Edge smoke test BEFORE any UI polish** (go/no-go from the plan): curl
   `analyze-contract` with a real signed-in JWT + a real lease PDF path —
   verify 401 unauthed / 400 foreign path / 429 at ceiling / 422 on a cat
   photo / valid JSON on a real lease / **elapsed < 120s on a 30-page PDF**.
   If real PDFs blow the wall clock, the fallback is a job row + client
   polling (scoped post-MVP).
5. **`mobile/.env`:** `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   from the new project (+ `EXPO_PUBLIC_REVENUECAT_IOS_KEY` when it exists).
6. **pg_cron:** schedule `send-date-reminders-daily`, `0 13 * * *`, per
   `supabase/functions/send-date-reminders/SETUP.md` (remember: pg_cron AND
   pg_net both needed; the dialog only installs pg_net).
7. **RevenueCat:** new app, products `contraya_premium_monthly` +
   `contraya_premium_annual` attached to entitlement exactly `premium`,
   offering `default` set Current, paywall + Customer Center. **Price is
   DECIDED (2026-07-30): $9.99/mo, $69.99/yr, 3-day free trial as an ASC
   introductory offer on BOTH products.** The math the old note asked for has
   now been run, see "Pricing decided" below. Paywall prices must come from
   StoreKit variables, never typed literals. Paywall footer links (a Warraya
   rejection vector): Terms to Apple's standard EULA URL, Privacy to
   `https://usecontraya.com/privacy`.
8. **App Store Connect:** the app record **already exists**, created as
   version 1.0 (commit `ba1a8ba`), bundle id `com.contraya.app`. What is left
   on this item is metadata, not creation. **Screenshots do not exist anywhere
   on disk** (6.9-inch, 1320x2868, spec in STORE_LISTING.md §7), and a
   **per-subscription review screenshot** is required on a first subscription
   submission and is named nowhere else in this repo. Review notes MUST say: summaries
   are informational descriptions of the user's own documents, not legal
   advice; a disclaimer is shown on every analysis screen; demo-mode
   instructions + a sample contract PDF attached. Review notes must also say
   how to reach the paywall, or a reviewer who taps Ask Contry hits an
   unexplained wall. **Subscriptions must be ATTACHED to the version
   submission** — on a first submission this is manual, and omitting it hands
   the reviewer RevenueCat Error 23, which cost Warraya a 2.1 rejection.
   Confirm the version page Subscriptions section lists two products, not
   "None". Sign in with Apple is DONE, see below.
8b. **Sign in with Apple: DONE 2026-07-30.** App ID capability enabled on
   `com.contraya.app` (Xcode Signing & Capabilities shows it clean, so the
   profile carries the entitlement), and the Supabase Apple provider is
   enabled with Client IDs `com.contraya.app` — verified live via
   `GET /auth/v1/settings` returning `"apple": true`. **No Services ID and no
   signing key were created, and none are needed.** Those exist only for the
   browser OAuth flow; this app uses native `signInWithIdToken`, which
   verifies Apple's token `aud` against the Client IDs list. The old note here
   said to copy Warraya's Services-ID setup — that was over-scoped, and
   skipping it also avoids inheriting Warraya's 6-month secret-expiry chore.
   Still unverified on hardware: the Client IDs string itself is only proven
   by a real sign-in, where a typo surfaces as an audience mismatch.
9. **Cloudflare: DONE.** usecontraya.com points at the worker (auto-deploys on
   push like warraya.com) and Email Routing for hello@usecontraya.com is live,
   MX verified 2026-08-09. The inbound-ingest catch-all route is a separate
   thing and is deferred to 1.0.1 with the rest of email-in.
9b. **After the landing deploys: put it in front of Google (added by the
    2026-07-30 SEO audit).** The on-page work is DONE and launch-complete
    (per-route meta, robots.txt, sitemap.xml, SoftwareApplication schema
    with offers, FAQPage schema generated from the visible FAQ, real 404
    page with noindex, font loading unblocked; the audit also caught the
    landing's Premium card selling email forwarding, which is free — same
    as app finding 14 — now fixed). What only the owner can do, in order:
    1. In a browser: search.google.com/search-console → Add property →
       **Domain** → `usecontraya.com` → it shows a TXT record → Cloudflare
       DNS offers a one-click add for it → back in Search Console, Verify.
    2. Search Console → Sitemaps → submit `https://usecontraya.com/sitemap.xml`.
    3. Search Console → URL inspection → `https://usecontraya.com/` →
       Request indexing.
    4. Optional, two minutes: bing.com/webmasters → Import from Search
       Console.
    Expectations, honestly: "Contraya" ranks within days; generic terms
    ("contract analyzer", "lease review") need the post-launch SEO guide
    pages (deliberately cut from MVP) plus backlinks and time.
10. **Email-in setup:** deploy `ingest-email` (normal JWT mode is OFF — it
    auths via INGEST_SECRET; deploy with `--no-verify-jwt`) and set
    `INGEST_SECRET` (long random, owner-held) in Supabase secrets. Deploy the
    email worker: Cloudflare dashboard → Workers → create from git (this
    repo, project root `email-worker/`) or `cd email-worker && npm i && npx
    wrangler deploy`; set worker var `INGEST_URL` =
    `https://<ref>.supabase.co/functions/v1/ingest-email` and secret
    `INGEST_SECRET` (same value). Then Email Routing → Routing rules →
    **Catch-all → Send to Worker → contraya-email-ingest** (hello@'s explicit
    forward rule stays and takes precedence). Verify: email a PDF to your
    address from Settings → expect the push + the Dashboard row; email with
    no attachment → expect a bounce.
11. **Trademark/handles** (from the plan): USPTO first-pass for "Contraya",
    social handles. Runners-up if a conflict surfaces: Firmaya, Inkaya, Duly.
12. **Logo: v2 mark landed 2026-07-30** (owner-supplied lime C wrapping
    fine-print bars; replaced the document-and-magnifier v1 below). All nine
    outputs regenerated, brand navy re-aligned `#04193E` → `#01132F`
    (generator constant + app.config splash/adaptive + index.html
    theme-color + manifest, per the README's change-together rule), web
    icon cache-bust bumped to `?v=2`, prebuild re-run and the native
    AppIcon visually verified as the new mark. Same 900x900 upscale caveat
    as v1. History of v1 follows:
    **v1: RESOLVED 2026-07-29.** The official mark (white document, lime
    magnifier and check, on `#04193E` navy) is committed at
    `brand/contraya-logo.png`, and all nine icons were regenerated from it by
    `brand/generate-icons.py`: `mobile/assets/{icon,adaptive-icon,splash-icon}.png`,
    `public/icons/{favicon,apple-touch-icon,icon-192,icon-512}.png`, and
    `public/og-image.png`. Warraya's shield is gone from the tree. Verified by
    eye in the generated `ios/.../AppIcon.appiconset`, not just by filename.
    The brand navy was also aligned from the old `#0a1440` to the logo's real
    `#04193E` in app.config.ts (splash + Android adaptive), manifest.webmanifest
    and index.html, so nothing shows a seam.
    Caveat carried forward: the source is 900x900, under Apple's 1024 minimum,
    so the generator upscales. Fine for flat art, but re-export at 1024+ if the
    design tool is ever opened again. See `brand/README.md`.
13. **APNs secrets (gate push reminders; reworked 2026-07-30, NO Expo).**
    The key EXISTS: `AuthKey_9QH4GR7D82.p8` at `~/Developer/keys/`, Key ID
    `9QH4GR7D82`, registered Sandbox & Production, Team Scoped. But as of
    the last `supabase secrets list` check the three APNS secrets were NOT
    in the dashboard (a save step likely got missed); only steps 2-3 below
    remain.
    Push goes device → Supabase cron → Apple directly. Tokens mint with no
    setup at all (the app registers the raw APNs device token); these three
    secrets are only about the cron being able to SEND. Steps:
    1. In a browser: developer.apple.com → Account → Certificates,
       Identifiers & Profiles → Keys. If a key with "Apple Push
       Notifications service (APNs)" enabled already exists and you still
       have its `.p8` file, reuse it and note its 10-character Key ID.
       Otherwise: the plus button → name `Renovatio Push` → check Apple
       Push Notifications service (APNs) → Continue → Register → Download
       (the file downloads ONCE; keep it in a safe place that is not
       Desktop/Documents, those folders sync to iCloud) → note the Key ID.
       One APNs key serves every app on the team, Warraya included.
    2. On the Mac, in Terminal (swap the path if the .p8 lives elsewhere):
       ```
       base64 -i ~/Downloads/AuthKey_XXXXXXXXXX.p8 | pbcopy
       ```
       Success looks like: no output, and your clipboard now holds one long
       line of text.
    3. In a browser: supabase.com/dashboard → project `contraya` → Edge
       Functions → Secrets → add three secrets:
       - `APNS_TEAM_ID` = `DYR4YB9FVL`
       - `APNS_KEY_ID` = the 10-character Key ID from step 1
       - `APNS_P8_BASE64` = paste from the clipboard
    4. Nothing else: no rebuild is needed for the secrets, and the client
       change ships with the next normal Xcode run. Debug builds register
       sandbox tokens and the sender retries the sandbox host, so testing
       on your phone works before TestFlight.
    5. **Before going live with push, decide finding 37** (local 9:00 +
       cron push the same morning with no cross-channel dedup).

## Xcode pre-flight (audited 2026-07-29, `npx expo-doctor`)

Run `npx expo-doctor` from `mobile/` before any archive. Current state is
17/20, and the three that fail are each understood:

- **Expo config schema** and **React Native Directory** both fail only in
  Claude's sandbox, where the proxy blocks those two lookups (the error is
  literally "Host not in allowlist" arriving where JSON was expected). They
  pass on a normal network. Ignore them here, believe them on the Mac.
- **Duplicate react** is a FALSE ALARM for this layout and must not be
  "fixed". `mobile/` is its own npm project nested inside the landing's
  folder, so doctor sees react@19.2.3 in `mobile/node_modules` and
  react@18.3.1 in `../node_modules`. Node and Metro both resolve
  nearest-first, verified directly: from `mobile/` react resolves to 19.2.3,
  from the repo root to 18.3.1. They never share a resolution context.
  **Do not add a metro.config.js to force this.** That was tried on
  2026-07-29 with `resolver.disableHierarchicalLookup = true`, and it broke
  the bundle outright: `@expo/metro-runtime` stopped resolving and
  `expo export` failed at the entry point. The default config bundles clean
  (7MB Hermes, verified via `npx expo export --platform ios`).

Fixed during the same audit: **`expo-font` was missing.** `@expo/vector-icons`
needs it as a direct dependency, and the app uses Ionicons on nearly every
screen. It was present transitively, so tests and typecheck passed, but a
native build can drop an undeclared native peer and crash at launch. Now
pinned at `~57.0.0`.

Also removed the `ios` and `android` npm scripts, which were `expo run:ios` /
`expo run:android`. Those compile through the terminal, which the repo rule
forbids, and they sat one `npm run ios` away from being triggered by muscle
memory. `npm run prebuild` replaces them.

Verified present in the generated project: bundle id `com.contraya.app`, team
`DYR4YB9FVL`, entitlements for Sign in with Apple and push, camera and photo
permission strings, `CFBundleShortVersionString` 1.0.0, and the real Contraya
app icon at 1024 opaque.

## Device E2E smoke (after setup, before TestFlight)

Demo boot with blank env → live sign-up → analyze a real lease PDF → edit a
date in review → save → pending local notifications visible → cron dry-run
curl with a date seeded ~2 weeks out → push arrives → tap routes to the
contract → sandbox purchase past the 2-analysis wall → account deletion wipes
rows + storage.

Added 2026-07-31: forward a PDF to the ingest address and confirm **a push
actually arrives** (it could not before, see the DONE section); forward the
identical PDF again and confirm no second inbox row; confirm Save is blocked
while a flagged date is unanswered and unblocks on Checked.

**While running the first real analyses, record two numbers.** Both decide
open questions and neither costs an extra run:

1. `usage.output_tokens` per analysis, and whether `stop_reason` ever comes
   back `max_tokens`. Answers whether `MAX_TOKENS = 8000` is too low
   (finding 21). Raising the cap costs nothing until it is used.
2. Across ~10 real contracts, **how many `due_note`s carry a resolvable
   anchor AND do not already exist as a `contract_dates` row.** This is the
   go/no-go on "obligations get a clock" (see the roadmap). The prompt at
   `analyze-contract/index.ts:194` tells the model to compute a concrete date
   when the anchor is in the document and put the rule in an obligation
   OTHERWISE, so `due_note` is by construction the residue of what the first
   pass could not resolve. `demo.ts:74-77` and `:105-109` also show the
   duplicate case: one notice deadline expressed as both a date row and an
   obligation. If the count is under roughly 2 per 10 contracts, the money
   goes to `output_config.effort: 'low' → 'medium'` instead, so the FIRST
   pass resolves more rules into `key_dates` where the whole pipeline already
   works. One line against a multi-week feature.

## Post-launch roadmap (owner-approved order, from the v1.1 brief review)

0. At launch: cross-promote from Warraya — "New from us: Contraya" row in
   Warraya's Settings + swap this landing's early-access mailto CTA for the
   App Store badge (change lives in the Warraya repo + this repo's
   `src/pages/Landing.jsx`).
0b. Server-side RevenueCat receipt validation in analyze-contract +
   chat-contract (paid limits are client-side only today; the tightened
   server ceilings 20/60 are the interim cost gate). Raise the ceilings
   back once entitlement is checked server-side.
1. .docx support (add flow + email-in; edge fn extracts text server-side)
2. ~~Device calendar sync~~ **SHIPPED 2026-07-31, see below. Device testing owed.**
3. Biometric app lock — expo-local-authentication (native dep)
4. Chat transcript persistence; regenerate email-in address; storage orphan
   cleanup; Android.
5. **Obligations get a clock — GATED on the `due_note` count in the Device
   E2E smoke above, not scheduled.** `contract_obligations.due_note` holds a
   deadline in the contract's own words and nothing converts it to a date, so
   obligations never reach reminders, the calendar or the Tasks screen. If
   the measurement says it is worth building, these are prerequisites and not
   niceties: **edit-after-save** for dates and obligations (nothing in
   `mobile/` updates `contract_dates` today, so a wrong resolved date would
   be permanent short of deleting the contract and paying another slot); a
   real obligations section on the review screen rather than the count at
   `add.tsx:812`; anchoring by stable key, never array index, since
   `add.tsx:723` reindexes on delete; writing any resolved date at INSERT
   rather than widening the deliberately narrow `update (completed_at)` grant
   (`chat-contract` folds `description`/`due_note` into the model's context,
   so a client-writable text column there is a prompt-injection channel);
   reserving the `MAX_PENDING = 60` notification budget for `contract_dates`
   first, or one wedding contract's 20 obligations evicts rent reminders; and
   `contract/[id].tsx:69-73` calling `refreshSchedules()` on toggle, which it
   does not, so ticking an obligation off would not cancel its notification.
   Decide finding 37 (local/push double-notify) before any of it.

## NOT in MVP (agreed cuts — do not scope-creep)

Email reminder channel (schema keeps the enum) · Android · web dashboard ·
clause chat/Q&A · jurisdiction-specific analysis · e-signing/redlining ·
re-analysis on edit · version comparison · PDF export of the analysis ·
per-date custom reminder-windows UI (column exists, defaults only) ·
streaming/job-polling progress · sharing/household · localization · SEO guide
pages. Pre-authorized fallback cut if anything overruns: recurrence (coerce
to 'none'; schema stays).

## Known gaps / risks (carried from the plan, plus new ones from the build)

0. **Apple Calendar sync, accepted limitations (2026-07-31).** Recorded, not
   to be fixed: the 13-month horizon runs dry if the app is not opened for
   over a year, and an empty calendar reads as "nothing is due" (the screen
   copy is the mitigation, so never promise more than "keeps about the next
   year"); user edits inside the Contraya calendar are replaced on the next
   dirty sync, and an event dragged to another calendar becomes invisible to
   the reconcile so it gets recreated as a second copy (chasing it would mean
   scanning every calendar, a much larger privacy ask); deleting the app does
   NOT delete the calendar, because EventKit data is not sandboxed the way
   notifications are; there is no history, since `nextOccurrences` never looks
   backwards, so events only accumulate from the day sync was turned on;
   `MAX_EVENTS` caps a sync at 400, nearest first; Android is out of scope and
   gated off at both the settings row and the module.
1. **Analysis latency vs the 150s edge wall clock** — the smoke test above is
   the go/no-go. Mitigations already in: effort low, 8k max_tokens, 10MB/50p
   caps, 120s upstream timeout with refund.
2. **Date accuracy** — mandatory review screen is the mitigation; budget one
   tuning loop (effort low → medium) against 5-10 real contracts.
3. **Email-in has no sender verification by design** — the address is the
   secret. If a user leaks it, anyone can fill their inbox (20/day cap,
   storage-only cost). Post-MVP option: a "regenerate address" button
   (delete + re-mint the token row).
4. **Orphaned uploads:** the add flow uploads sources BEFORE analysis; if the
   user abandons before save, objects stay in storage with no row. Private
   bucket, so no exposure — clean up with a periodic job later, or on next
   session.
5. **Sonnet intro pricing ends 2026-08-31** — budget at sticker $3/$15.
6. **Everything is simulator/CI-verified only.** Nothing has run on hardware;
   the camera multi-shot loop, PDF picker, and notification tap-routing are
   the highest-risk untested paths. The `expo-file-system` pin at exactly
   57.0.0 is inherited from Warraya (57.0.1 crashes at launch — do NOT let
   `expo install --check` "fix" it).
7. **Two-repo maintenance:** shared-code fixes (uploads, auth, purchases)
   must be applied in both repos by hand. Files were copied verbatim where
   possible so diffs stay portable.

## Gotchas inherited from Warraya (do not relearn)

- `git fetch` BEFORE diagnosing anything — cloud sessions push here and the
  Mac does not pull.
- Uploads are base64 → ArrayBuffer; an RN Blob silently uploads 0 bytes.
- Entitlement id must be exactly `premium`.
- iOS app icon must be opaque.
- Xcode auto-increments build numbers at export; check what shipped and bump
  `app.config.ts` past it.
- Landing deploy verification: assert NEW strings are PRESENT in the served
  bundle (SPA fallback returns 200 + index.html for missing assets).
- Never run `supabase migration repair --status reverted` on a "missing"
  migration — fetch/pull first; the file is probably on GitHub.
