# Contraya — STATUS (source of truth)

Updated: 2026-07-28. Read this first when resuming work.

## 🚧 PRE-LAUNCH — codebase forked from Warraya and fully retargeted; no backend exists yet

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

## What is DONE (in this repo, verified)

- **Mobile app compiles and tests green:** tsc strict clean, **100 tests across 14 suites** (`cd mobile && npm run typecheck && npm test`). Demo mode boots
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
- **Edge function `analyze-contract`** written (NOT deployed): Warraya's
  security skeleton (auth 401 → validate → download → atomic quota consume →
  model → refund on failure → 422 on refusal/not-a-contract → no upstream
  leaks). claude-sonnet-5, max_tokens 8000, adaptive thinking at
  `effort: 'low'` (raise to 'medium' if date accuracy disappoints — the one
  tuning knob), nested json_schema via output_config.format, PDF document
  block or ordered image blocks BEFORE the text block, base64 without
  newlines, 120s upstream timeout → refund + 504. **Security-critical check:
  every storage path must start with `${user.id}/`** (the function downloads
  with the service role, which bypasses storage RLS). Server ceiling
  ANALYSIS_CEILING=40/user/month, fail-closed 503. Token usage logged per
  call — watch cost from day one.
- **Migrations** written (NOT pushed): `20260728000000_init` (5 tables +
  documents bucket + per-user 200-contract cap + per-contract 100-child-row
  caps), `20260728000100_reminders` (push_tokens + register_push_token +
  contract_date_reminders ledger), `20260728000200_analysis_usage`
  (atomic try_consume_analysis/refund_analysis, service-role only),
  `20260728000300_avatars`. Same conventions as Warraya throughout (RLS,
  revoke anon, explicit GRANTs, CHECKs, `(select auth.uid())`).
- **Monetization wiring:** entitlement `premium`, fail-open philosophy,
  soft paywall at the analysis wall. FREE_ANALYSIS_LIFETIME_LIMIT=2 (lifetime,
  summed across periods), PRO_MONTHLY_ANALYSES=15 (client gate; hard alert,
  no paywall, when a premium user hits it). Contracts + reminders unlimited
  on both tiers.
- **Landing** (repo root): one-page pre-launch Contraya page + adapted
  Privacy/Terms (Terms now carries a "Not Legal Advice" section), builds
  clean. Web dashboard, guides, service worker all deleted — landing only.
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
  CHAT_CEILING=300/mo server, PRO_MONTHLY_CHATS=50 client). Screen
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
- **Mascot:** Contry (registry at `mobile/assets/mascot/index.ts`, slots
  search-idle/search-active/search-empty/reading, all null — icon fallbacks
  render until the owner supplies art; NEVER ship placeholder art). Warry's
  four shield Lotties were removed from the loader pool (wrong brand); the
  pool is the 2 generic loaders until Contry art arrives.

## Owner setup checklist (nothing works live until these)

1. **Supabase project** (new, separate from Warraya): create it, then
   `supabase link` + `supabase db push` (owner has the password). After push,
   verify anon probes bounce 42501 on every table.
2. **Secrets:** `ANTHROPIC_API_KEY` (new key, separate cost tracking from
   Warraya), `CRON_SECRET` (owner-held), `RESEND_API_KEY` (later; email
   channel soft-skips without it).
3. **Deploy functions** (Claude can do this once the project exists):
   `analyze-contract`, `chat-contract`, `delete-account` (normal),
   `send-date-reminders` (`--no-verify-jwt`, see its SETUP.md),
   `ingest-email` (`--no-verify-jwt`). Probe all: 401 unauthed.
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
   offering `default` set Current, paywall + Customer Center. Pricing decision
   from the plan: **$6.99-9.99/mo tier** (analysis costs ~15-30x a receipt
   scan; do NOT copy Warraya's $4.99 without checking the math).
8. **App Store Connect:** new app record, bundle id `com.contraya.app`,
   name availability check for "Contraya". Review notes MUST say: summaries
   are informational descriptions of the user's own documents, not legal
   advice; a disclaimer is shown on every analysis screen; demo-mode
   instructions + a sample contract PDF attached. Sign in with Apple: create
   the Services ID + key for THIS bundle id (Warraya's `SNP29WP9P3` key is
   Warraya's; follow the same steps).
9. **Cloudflare:** point usecontraya.com at the worker (auto-deploys on push
   like warraya.com), Email Routing for hello@usecontraya.com.
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
10. **Trademark/handles** (from the plan): USPTO first-pass for "Contraya",
    social handles. Runners-up if a conflict surfaces: Firmaya, Inkaya, Duly.

## Device E2E smoke (after setup, before TestFlight)

Demo boot with blank env → live sign-up → analyze a real lease PDF → edit a
date in review → save → pending local notifications visible → cron dry-run
curl with a date seeded ~2 weeks out → push arrives → tap routes to the
contract → sandbox purchase past the 2-analysis wall → account deletion wipes
rows + storage.

## Post-launch roadmap (owner-approved order, from the v1.1 brief review)

1. .docx support (add flow + email-in; edge fn extracts text server-side)
2. Device calendar sync — expo-calendar, premium toggle (native dep, prebuild)
3. Biometric app lock — expo-local-authentication (native dep)
4. Chat transcript persistence; regenerate email-in address; storage orphan
   cleanup; Android.

## NOT in MVP (agreed cuts — do not scope-creep)

Email reminder channel (schema keeps the enum) · Android · web dashboard ·
clause chat/Q&A · jurisdiction-specific analysis · e-signing/redlining ·
re-analysis on edit · version comparison · PDF export of the analysis ·
per-date custom reminder-windows UI (column exists, defaults only) ·
streaming/job-polling progress · sharing/household · localization · SEO guide
pages. Pre-authorized fallback cut if anything overruns: recurrence (coerce
to 'none'; schema stays).

## Known gaps / risks (carried from the plan, plus new ones from the build)

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
