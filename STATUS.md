# Contraya — STATUS (source of truth)

Updated: 2026-07-29. Read this first when resuming work.

## 🚧 PRE-LAUNCH — code complete and backend live; not yet run on a device

The backend is no longer a plan: project `tzqjnbcbrcfltnjutels` is up, all
seven migrations are applied, verify.sql returns 34/34 PASS, and all five
edge functions are deployed and reject unauthenticated calls with 401. What
has *not* happened is a single real run: nobody has built the app in Xcode,
signed up, or pushed a real contract through `analyze-contract`. Everything
below marked DONE is verified in this repo or in the Supabase dashboard;
nothing is verified on a phone.

### What is actually left, in order

1. **Create `mobile/.env` FIRST.** It is gitignored, so it does not exist on
   the Mac yet. Copy `mobile/.env.example` to `mobile/.env` and fill:
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
2. **First device build.** `cd mobile && npx expo prebuild --platform ios`,
   open `mobile/ios/Contraya.xcworkspace` in Xcode, Run. `npx expo start` in
   a second tab for Metro. Nothing else can be trusted until this happens.
3. **First real analysis.** Sign up live, put a real lease PDF through it.
   This is the go/no-go on the two things no amount of code review can
   settle: how long the analysis actually takes, and whether the extracted
   dates are right. See "Device E2E smoke" below for the full sequence.
4. **Logo** — DONE 2026-07-29. Real mark committed, all nine icons
   regenerated, brand navy aligned to `#04193E`. See blocker 12 below.
5. **`CRON_SECRET`** — set it in Edge Functions → Secrets. Until it is,
   `send-date-reminders` cannot run, so no push reminders. (`ANTHROPIC_API_KEY`
   is already set, which is why analysis works and reminders do not.)
6. **Deploy the landing.** Never deployed. The App Store listing needs a live
   Privacy Policy URL, so this blocks submission too.
7. **Attorney review** of Terms + Privacy (item 3b), **RevenueCat setup**,
   **screenshots**. All submission-time, none blocking a build today.

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

- **Mobile app compiles and tests green:** tsc strict clean, **113 tests across 16 suites** (`cd mobile && npm run typecheck && npm test`). Demo mode boots
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
  summed across periods), PRO_MONTHLY_ANALYSES=15 (client gate; hard alert,
  no paywall, when a premium user hits it). Contracts + reminders unlimited
  on both tiers.
- **Landing** (repo root): full marketing page mirroring Warraya's landing
  structure (nav, gradient hero with a floating lease-card mock, pain/fix
  features panel, how-it-works, contract-type chips, pricing, FAQ, CTA,
  footer), adapted for pre-launch: the only CTA is the early-access mailto
  (hello@usecontraya.com) — swap in the App Store badge at launch. Advertised
  pricing is **$7.99/mo or $49.99/yr** (middle of the approved $6.99-9.99
  range; align the RevenueCat products with this or tell Claude the final
  number and the page gets updated). Not-legal-advice line appears under the
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
    freezing `contract_id`/`user_id`. Also pinned `alter table storage.objects
    enable row level security` explicitly, and gave `contract_obligations`
    UPDATE the same parent-ownership `with check` for parity.
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
2. **Secrets:** `ANTHROPIC_API_KEY` **DONE** (2026-07-28, owner set it as a
   Supabase edge secret; it is a new key so Contraya's token spend tracks
   separately from Warraya's). Still to set: `CRON_SECRET` (owner-held,
   needed before the reminder cron can run), `INGEST_SECRET` (see item 10),
   `RESEND_API_KEY` (later; the email channel soft-skips without it).
3. **Deploy functions** — **DONE (2026-07-29).** All five are live in the
   dashboard: `analyze-contract`, `chat-contract`, `delete-account` (normal
   JWT), `send-date-reminders` and `ingest-email` (`--no-verify-jwt`, they
   carry their own shared-secret header check instead). The JWT posture is
   **Redeploy needed:** `chat-contract` changed on 2026-07-29 (a rule was added
   so Contry answers plainly that it is not a lawyer and that no attorney-client
   privilege exists). The deployed copy predates it. Run
   `supabase functions deploy chat-contract` and re-probe.
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
11. **Trademark/handles** (from the plan): USPTO first-pass for "Contraya",
    social handles. Runners-up if a conflict surfaces: Firmaya, Inkaya, Duly.
12. **Logo: RESOLVED 2026-07-29.** The official mark (white document, lime
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

## Device E2E smoke (after setup, before TestFlight)

Demo boot with blank env → live sign-up → analyze a real lease PDF → edit a
date in review → save → pending local notifications visible → cron dry-run
curl with a date seeded ~2 weeks out → push arrives → tap routes to the
contract → sandbox purchase past the 2-analysis wall → account deletion wipes
rows + storage.

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
