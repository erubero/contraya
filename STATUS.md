# Warraya — STATUS (source of truth)

Updated: 2026-07-27. Read this first when resuming work.

## 🟢 LIVE ON THE APP STORE — 1.0 approved; 2.0.0 (build 9) submitted 2026-07-27

- **1.0 is approved and live:** https://apps.apple.com/us/app/warraya-warranty-tracker/id6792513985
  (confirmed via the itunes lookup API, not just the ASC screenshot; ASC shows
  "1.0 Ready for Distribution"). The owner's metadata re-paste fixed the two
  rejections; the 🔴 section below is HISTORY, kept for the record and lessons.
- **2.0.0 (build 9) submitted for review 2026-07-27 by the owner.** Carries the
  floating island tab bar + Warry search, the avatar cropper, and the Warry
  Lottie loaders (all device-verified by the owner before submitting). Listing
  is ENGLISH ONLY (es-MX removed in ASC, section retired in STORE_LISTING.md),
  description/keywords refreshed for 2.0, EULA + subscription-disclosure blocks
  intact. `app.config.ts` already sits at buildNumber 10 for the next archive.
  Owner still owed Apple: the screen-recording reply + App Review Notes text.
- **Launch infrastructure, all verified 2026-07-27:** landing is a real launch
  page (App Store badge everywhere, SoftwareApplication JSON-LD, live-verified
  against the deployed bundle); daily reminder cron live at 13:00 GMT (owner
  manual trigger returned 200 ok on an empty table); scan pipeline E2E-verified
  in production (claude-sonnet-5, perfect extraction, probe account deleted).
- **OPEN WATCHES:** the 2.0.0 verdict; the first real push on hardware (needs a
  real warranty expiring within 30 days + the 13:00 GMT run or a manual
  trigger); a device glance at the paywall's real prices; then the post-launch
  list in "Next up" (Rate-button deep link, retire /login, Android, ESLint).

## 🔴 REJECTED AGAIN 2026-07-24 (2nd rejection) — RESOLVED by the 1.0 approval; history only — build **1.0 (8)**, metadata only, no rebuild needed
Same two guideline families as before, plus one new one. **Both subscriptions and the
subscription group were returned to Rejected again** — expected fallout of any app
rejection, not a new bug (see the Error 23 section: rejected products never vend).

Apple's mail cites:
- **3.1.2(c) again** — "the submission did not include all the required information...
  a functional link to the Terms of Use (EULA)... in the App Description." This is the
  **same finding as the 2026-07-22 rejection**, on the copy that commit `2a7d4c6` supposedly
  already fixed (the EULA link is the last line of both locales' descriptions in
  `mobile/STORE_LISTING.md`, verified still present in the file). Since the fixed text
  demonstrably exists in the repo and was reported pasted into ASC on 2026-07-22, a repeat
  of the exact same finding on the exact same copy means **the paste most likely did not
  take in App Store Connect** — or took in only one locale, or was applied to a metadata
  slot that was not carried onto this version's submission. This cannot be confirmed from
  here (no ASC access from this Mac/session); it needs an owner check in ASC, see below.
- **2.3.2, NEW this round** — "your app description references Subscription but does not
  inform users that a purchase is required." This points at the `WARRAYA PREMIUM
  SUBSCRIPTION` / `SUSCRIPCIÓN WARRAYA PREMIUM` header in the description — the only place
  in any metadata field where the word "Subscription" appears (checked: not in the app
  name, subtitle, promotional text, or keywords). **Hardened 2026-07-23** (no code change,
  metadata text only): the paragraph now opens with "Warraya Premium is an optional
  auto-renewing subscription: a paid upgrade, not a free feature" *before* describing what
  it unlocks, in both EN and es-MX, so the very first mention states it costs money. This
  is a belt-and-suspenders copy fix on top of the paste-didn't-take theory above — do both.

**Apple also wants a reply this time, which is new procedure for this app:** reply to the
message in App Store Connect with a **screen recording** confirming the app + metadata
carry all the required subscription info, and paste that confirmation into the **Notes
field of the App Review Information** section for future submissions. Do this after the
metadata fix below, not before.

**Build-number drift, side note:** this review is against **1.0 (8)**, not build 6.
`mobile/app.config.ts` still reads `buildNumber: '6'` and nothing under `ios/` is tracked
(gitignored), so builds 7 and 8 were archived/uploaded straight from Xcode without a
matching commit here — consistent with the auto-increment-at-export behavior already
flagged in the build 6 section below, not a new problem. **No new archive is needed for
this rejection** (it is metadata-only); when the next archive does happen, bump
`buildNumber` past whatever ASC shows as the highest build first.

### Owner action plan (metadata-only, in App Store Connect, no Terminal/Xcode)
1. Open the app record → the **1.0** version page (the one build 8 is attached to, not
   "App Information") and open **App Description** for **English (U.S.)**.
2. Select all, delete, and paste the entire EN description block fresh from
   `mobile/STORE_LISTING.md` section 2 (starts "You already paid for the warranty...",
   ends with the `Terms of Use (EULA):` / `Privacy Policy:` lines). Click **Save**.
3. Switch the locale selector to **Spanish (Mexico)** and repeat step 2 with the es-MX
   block from section 9 (starts "Ya pagaste por la garantía...", ends
   `Términos de uso (EULA):` / `Aviso de privacidad:`). Click **Save**.
4. While there, re-paste **Promotional Text** for both locales too from the same file —
   cheap insurance against the same "didn't take" failure mode on an adjacent field.
5. Confirm **App Information → License Agreement** still shows Apple's Standard EULA
   (not blank, not a custom doc) — section 1 of `mobile/STORE_LISTING.md` explains why.
6. Re-read both saved descriptions on screen top to bottom and confirm the
   `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` line is visibly
   present at the bottom of **each** locale before moving on.
7. Resubmit the version for review (subscriptions will need re-attaching if ASC dropped
   them — check the Subscriptions section of the version page shows both, not "None").
8. Record the short screen recording Apple asked for (scrolling through the saved EN and
   es-MX descriptions showing the EULA link and the price/subscription disclosure), reply
   to the review message in ASC with it attached, and paste the same confirmation text
   into the App Review Information **Notes** field.

### When the next verdict lands
- **If APPROVED:** (1) run the paywall on device and confirm the REAL $4.99/$29.99 render
  and a sandbox purchase flips Settings to "Premium is active" — this was impossible to
  test pre-approval, see Error 23 below; (2) do the landing-day swap, item 4 in "Next up";
  (3) schedule the reminder cron, item 3 — **reminders do not fire until that exists.**
- **If REJECTED again on 3.1.2 or 2.3.2:** that would mean steps 1-6 above were followed
  and it *still* didn't take — at that point stop guessing and get a screenshot of the
  live ASC field content before touching anything else, since two straight metadata-paste
  failures would be its own new bug worth investigating directly in the dashboard.
  - **2.1** → the reviewer could not load or buy on the paywall. Check both subscriptions
    are still attached to the version, then check the RevenueCat paywall editor's footer
    links (Terms must point at `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`,
    Privacy at `https://warraya.com/privacy`). A 2.1 with a crash report instead → see the
    never-tested-on-hardware risk note in the build 6 section.

**Full rejection history and root cause** (guideline 3.1.2, automated, metadata-only, no
code fault) is preserved in the Error 23 section below and in `mobile/STORE_LISTING.md`.

**🚨 BEFORE DIAGNOSING ANYTHING IN THIS REPO, RUN `git fetch`.** Cloud Claude Code sessions
push here and this Mac does not pull. `git status` prints a clean `## main...origin/main`
with no ahead/behind even when origin is 5 commits ahead, because without a fetch it only
compares against stale tracking refs. A whole session was once burned "recovering" a
migration that was already on GitHub.

## 🏝️ Floating island tab bar + Warry search (2026-07-27) — landed on main, NOT yet in any shipped build
Owner-requested UI batch, pure JS/TS, zero new native deps (reanimated was already a dep), so
**no prebuild was needed and `ios/` is untouched**. Ships whenever the next archive happens
(remember: bump `buildNumber` past whatever ASC shows first). Does not affect the pending
metadata-only resubmission.

What changed:
- **Tab bar is now a floating pill** (`mobile/src/components/TabBar.tsx` rewrite): detached
  from the screen bottom, rounded, bordered, shadowed; content scrolls underneath. **Owner
  settled the layout at exactly 5 items**: Dashboard, Warranties, the absolutely centered
  + FAB, Calendar, Settings (an earlier 6th in-pill Search cell was removed on owner
  feedback). Geometry lives in `mobile/src/lib/islandMetrics.ts` (pure, unit-tested).
  **Every tabs screen MUST pad its scroll content with `useTabBarClearance()`** (exported
  from TabBar.tsx) — the bar is absolutely positioned, so a screen that skips it hides its
  last rows under the pill. All four current screens do.
- **Search trigger is the loop in the screen headers** (`mobile/src/components/SearchButton.tsx`,
  a 44pt circle matching the dashboard avatar, shown on Dashboard next to the avatar and on
  Warranties + Calendar; not on Settings). Tapping it navigates to the vault tab if elsewhere
  and cross-fades the island pill into the search field, which rides above the keyboard via
  reanimated `useAnimatedKeyboard`. State in `mobile/src/lib/SearchContext.tsx` (provider
  wraps the tabs layout). Close = collapse + clear. The vault's old in-list search box was
  REMOVED (one source of truth); status chips remain and compose with search (AND).
- **Matching widened** (`mobile/src/data/search.ts`, pure + unit-tested): product, brand, store,
  serial number, notes, and category DISPLAY label; multi-token AND ("costco tv" works). Works
  in demo mode for free.
- **Warry the mascot** fronts search ("Warry, your warranties and receipt steward" — owner's
  concept: you know you have a Costco receipt, Warry finds it). Copy: placeholder "What should
  Warry find?", results count "Warry found N matches", empty state "Warry came up empty".
  **Art registry at `mobile/assets/mascot/index.ts`** (slots: search-idle, search-active,
  search-empty; see that folder's README for sizes). All slots null until the owner supplies
  art; `WarryFace.tsx` falls back to the plain search icon. NEVER ship placeholder art.
- Suite grew 62 → **75 tests** (search + islandMetrics); tsc strict clean.

**Simulator-verified 2026-07-27** (Release build, iPhone 17 Pro, temp overrides since simctl
cannot tap; all reverted before commit): floating pill light+dark on dashboard, FAB dead
center, expanded search with "electronics" → "Warry found 2 matches" + the 2 electronics demo
items, "costco" → Warry empty state in dark. The xcode-select link is still missing on this
Mac (owner sudo fix pending), so the simulator MCP tool remains blocked; screenshots were via
`simctl`.

**✅ DEVICE-VERIFIED BY OWNER 2026-07-27 (build 9 on real hardware): "the search loop
works perfectly as expected."** That covers the headline path (open from the loop, type,
results, close). Residual unchecked details, none blocking: an SE-class device (inset 0)
for pill position/clearance, and pull-to-refresh with search active.

## 📸 Avatar cropper + Warry Lottie loaders (2026-07-27, second batch) — landed on main, NOT in any shipped build
Same session as the island; still zero new native deps, no prebuild, `ios/` untouched.

- **In-app avatar cropper** replaces the OS "Move and Scale" screen: after Take Photo or
  Choose from Library, `src/components/AvatarCropper.tsx` (RN Modal, own
  GestureHandlerRootView inside) shows a circular mask with pinch-to-zoom (1..4x) and
  drag-to-pan, both hard-clamped live so the photo always covers the circle. The geometry
  is pure and unit-tested in `mobile/src/lib/cropRect.ts` (transform order
  [translateX, translateY, scale] is load-bearing; helpers carry 'worklet' directives).
  Save runs the rect through `cropAvatarToBase64` (`src/lib/downscale.ts`, legacy
  manipulateAsync kept deliberately) and feeds the existing 512px upload pipeline
  unchanged. Also fixed in passing: demo mode's Remove Photo was a no-op
  (`demo.updateProfile` dropped `avatarPath`).
- **Warry Lottie:** the owner's four shield variants (dropped 2026-07-27 as `Shield*.json`,
  verified distinct) are now `loading-warry-1..4.json` in the random loading pool (6 total).
  The mascot registry (`assets/mascot/index.ts`) is a tagged union accepting
  `{ kind: 'image' | 'lottie' }` per slot, `WarryFace` renders looping LottieView for
  lottie art (pointerEvents none so buttons keep their taps); the three search slots stay
  null until distinct art arrives. New guard test `__tests__/animationAssets.test.ts`
  validates every animation JSON (both folders) so replace-in-place drops cannot ship
  malformed. Both asset READMEs rewritten (real constraint: no external images, no fonts;
  shape-only and small is a preference, not a rule).
- Suite 75 → **97 tests**, tsc strict clean. Simulator-verified (Release + simctl, temp
  overrides reverted): cropper mask/chrome/cover layout with a bundled square image, and a
  Warry shield variant animating in the loader.

**✅ DEVICE-VERIFIED BY OWNER 2026-07-27 (build 9 on real hardware): "the profile pic
works perfectly as expected"** — gestures, clamping, save, and the avatar roundtrip, the
top crash risk of this batch, all confirmed by hand. Residual unchecked details, none
blocking: the CAMERA path with a portrait photo (EXIF orientation; fallback if ever wrong
is a no-op manipulateAsync normalize pass), demo-mode Remove Photo, and spotting all four
Warry loader variants rotate across launches.

## ✅ RevenueCat "Error 23" on device — CLOSED 2026-07-22, root cause CONFIRMED: the rejection itself
Device paywall died with `Error 23` (RevenueCat `ConfigurationError`). Verbose logging
(`ff5ae6a`) surfaced the concrete cause in the console: **"None of the products registered
in the RevenueCat dashboard could be fetched from App Store Connect."**

Diagnosis closed by elimination, no ASC visit needed:
- **Owner confirmed the paywall loaded the REAL $4.99/$29.99 prices on device BEFORE
  submission.** So products were fetchable and the whole RevenueCat + ASC setup was
  correct as of submission; nothing regressed in code (only dev-only logging changed).
- **Paid Applications agreement fine by proxy:** same Apple team (DYR4YB9FVL) as
  MyPursefolio, which sells live subscriptions today.
- Apple's rejection mail says both subscriptions were returned to **Rejected**, and
  StoreKit does not vend rejected products, even in sandbox.

**Fix = the resubmission already prepared. NOTHING to change in code, RevenueCat, or ASC
config — do not "fix" the paywall, the dashboard, or `purchases.ts`.** The device paywall
STAYS broken until the products leave Rejected; pre-approval Error 23 is expected, not a
bug. On submission the products flip to Waiting for Review and **App Review can purchase
in that state**, so the reviewer sees a working paywall — provided the IAPs are attached
(see ⚠️ below). Re-run the device price check only AFTER approval.

**⚠️ On a first submission the subscriptions must be attached to the version submission.**
If they are not selected alongside build 6, the reviewer hits this exact Error 23 dialog,
which is a guideline 2.1 rejection.

**Diagnosing it now works** (`ff5ae6a`): `mobile/src/lib/purchases.ts` used to swallow every
error in a bare `catch {}` because the gate fails open by design, so nothing ever reached a
log. It now sets `LOG_LEVEL.VERBOSE` before `configure()` in dev and traces every catch,
plus calls out the zero-package offering case explicitly (that is what unpurchasable
products look like, and it is otherwise indistinguishable from "no offering configured").
Grep the Xcode console for `[purchases]`. All of it is `__DEV__`-guarded and **verified
absent from the production Hermes bundle**, so nothing leaks to users.

## 🚢 BUILD 6 (v1.0.0) SHIPPED 2026-07-22 — archived, uploaded, submitted. Next archive is 7+
Owner chose to submit the new work rather than resubmit build 5 metadata-only, so build 6
carries service warranties + document sharing into the same review.

Claude did the prep: `npx expo prebuild --platform ios` (it cleared and recreated `ios/`,
pods reinstalled), tsc clean, **62/62 tests across 10 suites**, all 3 edge fns re-probed
401 and REST anon-denied. `ios/Warraya/Info.plist` now reads **1.0.0 (6)**, which finally
proves the `app.config.ts` version fix from `98c525d` took: it had been stale at 0.1.0 (5)
right up until this prebuild, so **build 6 is the first archive that will not be mislabeled.**
Team DYR4YB9FVL and both entitlements (push, Apple sign-in) survived the regeneration.
`ios/` is gitignored, so none of this shows in git status; that is expected, not a miss.

**Compile verified: BUILD SUCCEEDED, 0 errors, 0 warnings** (Debug/simulator, fresh
DerivedData). Product carries a real binary and Info.plist 1.0.0 (6). Pods resolved to
ExpoFileSystem **57.0.0** (the pin held), ExpoDocumentPicker 57.0.1, ExpoSharing 57.0.6.
Symbol-checked the dyld crash signature directly: zero undefined `decorateObject` refs in
ExpoFileSystem and zero unresolved ExpoModulesCore symbols. **Caveat: that was a Debug
simulator build, and the `[Expo] Switch ... XCFramework for build configuration` phase
picks a DIFFERENT artifact for Release, so it does not fully clear the Release archive.**
A device run is still the only thing that proves launch.

**Two xcodebuild gotchas cost time here, worth knowing:** (1) killing a build leaves
`XCBuildData/build.db` locked, and the next run dies with "database is locked / two
concurrent builds" which reads like a code error but is not; fix is a fresh
`-derivedDataPath`. (2) Wrapping xcodebuild as `xcodebuild ...; echo "EXIT=$?"` makes the
shell report exit 0 no matter what xcodebuild did, so a **BUILD FAILED was reported to the
session as success.** Always grep the log for the literal `** BUILD SUCCEEDED **`.

**⚠️ KNOWN RISK CARRIED INTO THIS REVIEW: build 6 ships code whose flows were never fully
exercised on hardware.** What IS device-proven: the app installs, launches, and renders
past the splash on a real iPhone, and the paywall path executes (that is how the Error 23
console log below was captured). What is NOT known to have been walked on hardware:
service warranties, document sharing, Apple sign-in, forgot-password, and scanning a real
service invoice — all simulator-only to date. If this review comes back 2.1 with a crash
or dead-button report, **start there**, and walk all five on a device before resubmitting.

## 🚢 SHIPPED — build 5 (v0.1.0) uploaded to App Store Connect on 2026-07-19
**HISTORY — superseded by build 6, see above.** Build 5 shipped from **`322be31`** (tsc clean, 61/61 tests) and is the binary Apple rejected on 3.1.2. It was replaced on the version by build 6 on 2026-07-22.

That build carried, on top of the landing rework: service warranties + document share, a TestFlight version fix, landing SEO copy, and a pricing section.

## What Warraya is
Warranty + receipt tracker. **Native Expo/React Native app (iOS + Android, one TypeScript codebase in `mobile/`)** — the product. The Vite/React web app at warraya.com is the marketing landing + interim dashboard (retired once the app ships). Backend = Supabase project `kwcxchyhssmqqrzmlzux` (us-east-2).

## ⚠️ Build rule (owner mandate)
**All builds go through Xcode. Never `eas build` or `eas submit`.**
1. Claude runs: `npx expo prebuild --platform ios` (+ pod install happens automatically) — regenerates `ios/` from `app.config.ts`. Never hand-edit files under `ios/`; prebuild overwrites them.
2. Owner opens `mobile/ios/Warraya.xcworkspace`, Team = **Renovatio, LLC** (DYR4YB9FVL), ▶ Run to test on device, **Product → Archive** + Organizer upload to ship.
3. Uploading a standalone `.ipa`: use **Transporter** (Mac App Store), not the CLI.

Toolchain for anything in `mobile/`:
`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` (Node 26 breaks Metro) and `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` (CocoaPods on Ruby 4). No custom babel.config.js. `.npmrc` has legacy-peer-deps. Never `npm dedupe`.

## Current state (all DONE and live)
- **main = `71998ce`**, clean, pushed. Mobile app unchanged since `322be31`: tsc clean (strict), 61/61 jest tests across 10 suites.
- **Reminders:** local 30/7-day notifications + server push (Expo Push API). Push key created + assigned (Developer Portal ID `DGZR5U3JTB`). Edge fn `send-expiry-reminders` deployed, `CRON_SECRET` set, manual trigger returns 200. **Email channel deferred** by owner (Resend key set but warraya.com not verified in Resend; function soft-skips it).
- **Freemium monetization:** free = 3 AI scans + 5 warranties (`mobile/src/lib/limits.ts`); Premium = unlimited @ **$4.99/mo or $29.99/yr, 3-day free trial**. Soft paywall at the walls in `add.tsx` (4th scan / 6th warranty), fails open until a RevenueCat offering exists (it does, set Current). Entitlement id = **`premium`**.
- **Server cost cap:** `scan_usage` table + 50-scans/user/month ceiling enforced in `extract-receipt` (redeployed, verified 401-guarded; table + `warranties.claimed_at` confirmed live in the remote db).
- **Retention:** "Mark claim filed" on the warranty detail + Coverage/Saved money tiles on the vault (`coverageSummary`, unit-tested).
- **RevenueCat:** App Store app linked (via the account-level In-App Purchase key shared with MyPursefolio). Products `warraya_premium_monthly` + `warraya_premium_annual`, both attached to entitlement `premium`; offering `default` is Current; branded paywall published ("Cover everything you own", SAVE 50% badge, "Start my 3-day free trial"); **Customer Center** wired to Settings → Manage Subscription. iOS public key `appl_uSLxbkbmdriIDfEIukLcuCNIhRo` lives in **EAS env vars** (production+preview) AND local `mobile/.env` (gitignored — Xcode builds inline it from there).
- **App Store Connect:** app record "Warraya: Warranty Tracker" created; listing metadata + App Privacy published (see `mobile/STORE_LISTING.md`, EN + es-MX); subscription group "Warraya Premium" with both products, each with a 3-day free-trial intro offer. Paid Apps agreement signed.
- **Brand/SEO:** official shield logo everywhere (source of truth `brand/`); landing title/meta lead with "warranty reminder app"; Help Center row in app Settings → warraya.com/#faq. Support email `hello@warraya.com` (Cloudflare Email Routing → forwards to info@prrenovatio.com; receive-only).
- **Builds:** 1 (EAS, pre-Xcode-rule), then 2, 3/4, and **5 shipped 2026-07-19 night** via Xcode Archive → upload, all v0.1.0. Xcode's "manage version and build number" AUTO-INCREMENTS at export (that is how 3 became 4), so after every archive check what actually shipped and set `ios.buildNumber` in `app.config.ts` one above it. **2026-07-20: TestFlight kept showing "0.1.0" even after the owner edited the version to 1.0.0 directly in Xcode** — same root cause as the build-number lesson above, one level up: `expo.version` in `app.config.ts` (not the Xcode field, which prebuild silently overwrites) is the source of truth for `CFBundleShortVersionString`. Fixed: `app.config.ts` now reads `version: '1.0.0'` and `ios.buildNumber: '6'`. **✅ CONFIRMED 2026-07-22:** the prebuilt Info.plist read `1.0.0 (6)` before the archive, so the version fix is proven to take. **✅ DONE 2026-07-27: bumped to `version: '2.0.0'` + `buildNumber: '9'` (past the shipped build 8), prebuild run, Info.plist verified reading 2.0.0 (9), Release compile BUILD SUCCEEDED from the fresh `ios/`, and the binary launch-verified on simulator. Ready for the owner to archive. As always, check what build number the archive actually EXPORTS as (auto-increment) and set `buildNumber` one above it afterwards.**

- **Clean Xcode builds:** `mobile/plugins/withCleanXcodeBuild.js` (registered in app.config.ts) keeps archives warning-free across prebuilds: Pods-only warning inhibit + libtool no-symbols flag + hermes phase always-run, hermesc `-w` wrapper (`mobile/scripts/hermesc-quiet.sh` via ios/.xcode.env), app-target `-Wl,-no_warn_duplicate_libraries` + `-Xcc -w`, LastUpgradeCheck pinned, and `ios.appleTeamId` DYR4YB9FVL baked in (no more signing-team error after prebuild). Verified: full Release device build with 0 real warnings.

- **Tab navigation (2026-07-19):** app restructured to bottom tabs — Dashboard / Warranties / center blue + FAB (opens add modal) / Calendar (NEW month grid + agenda, pure date-fns) / Settings (was modal, now tab). New: `app/(app)/(tabs)/` group, `src/components/TabBar.tsx` (custom bar w/ raised 64px FAB), `MonthCalendar.tsx`, `ScreenHeader.tsx`. Sign-in lands on `/dashboard`. Verified on simulator (Release demo build, all 4 tabs screenshotted) + tsc + 34 tests. Dashboard tiles deep-link into pre-filtered Warranties.

- **Sign in with Apple (2026-07-19):** native button on the sign-in screen, nonce-verified `signInWithIdToken`, `usesAppleSignIn` entitlement (code pushed `aa777d2`, tsc + 34 tests green). **Apple Developer + Supabase config CONFIRMED DONE by owner**: Services ID `com.warraya.app.signin` created (domain `kwcxchyhssmqqrzmlzux.supabase.co`, return URL `.../auth/v1/callback`), signing key `SNP29WP9P3` created (`.p8` saved at `~/Desktop/keys/warraya/AuthKey_SNP29WP9P3.p8` — do not lose this, Apple only lets you download it once; regenerating requires a new key + updated Supabase secret), Supabase Apple provider enabled with Client IDs `com.warraya.app,com.warraya.app.signin` + Secret Key saved. **Secret expires ~2027-01-19 (6mo)** — needs regenerating before then or web/Services-ID sign-in breaks (native ID-token flow is unaffected by secret expiry). **NOT YET on-device verified** — resume: owner taps "Sign in with Apple" on a real device build, confirms it completes and lands on Dashboard.

- **Auth = email+password (2026-07-19):** OTP/magic-code sign-in REMOVED at owner's request ("creates friction"). `signin.tsx` is now one screen with Apple button + email/password fields + a Sign In ⇄ Create Account toggle; `AuthContext` exposes `signUp`/`signIn` (`supabase.auth.signUp` / `signInWithPassword`) instead of `sendCode`/`verifyCode`. Supabase `mailer_autoconfirm: true` was verified live, so sign-up returns a session instantly with NO confirmation email. **Forgot password: SHIPPED 2026-07-19** — see below.

- **Forgot password (2026-07-19):** "Forgot password?" link on `signin.tsx` (sign-in mode only) reuses the typed email and calls `resetPasswordForEmail` with `redirectTo: Linking.createURL('reset-password')`; it always shows the same "check your email" message so the response can't be used to probe which addresses have accounts. New screen `app/reset-password.tsx` consumes the link, establishes the recovery session, and calls `updateUser({ password })`, then lands on Dashboard (the link itself proves mailbox ownership, so signing them in is intended). Link parsing lives in `src/lib/recoveryLink.ts` and handles BOTH the fragment tokens (implicit flow — the supabase-js default this app uses, verified in node_modules) and `?code=` (pkce), so a future `flowType` change won't break it; covered by 8 unit tests (`__tests__/recoveryLink.test.ts`, suite now 42 tests). Simulator-verified: routing, expired-link message, no-link fallback, and the password form. **⚠️ OWNER MUST ADD THE REDIRECT ALLOW-LIST ENTRY IN SUPABASE OR THIS SILENTLY FAILS — see "Forgot-password: owner setup" below.** Caveat: some email clients prefetch links and can burn the single-use token, showing "link expired"; if that becomes common, switch to the `{{ .Token }}` 6-digit code + `verifyOtp({ type: 'recovery' })` instead.

## Forgot-password: owner setup (Supabase dashboard)
1. ✅ **DONE 2026-07-19** — **Authentication → URL Configuration → Redirect URLs:** `warraya://**` added and confirmed present (wildcard covers both `warraya://reset-password` and the `warraya:///reset-password` triple-slash form `Linking.createURL` can emit).
2. **Authentication → Emails → "Reset Password" template:** the default is fine — just confirm it links to `{{ .ConfirmationURL }}`. Do NOT swap it to `{{ .Token }}` unless we also switch the app to the code-based flow.
3. Test: on a device build, tap "Forgot password?", open the email, confirm the app opens on "Choose a new password", set one, and confirm it signs in.

- **Security audit + hardening (2026-07-19):** full audit done (repo exploration + live anon-key probes). VERDICT: foundation solid — RLS on all 4 tables w/ auth.uid ownership incl. WITH CHECKs (anon fully revoked, probes 42501), private buckets w/ per-user folder policies (public URL probes 404), all 3 edge fns auth-guarded live (401 probes), timing-safe CRON_SECRET, deletion bound to token's user id, git history clean of secrets. GAPS FIXED (cost-abuse class, not data-leak): (1) server warranty cap — new migration `20260719040000_warranty_cap.sql` BEFORE INSERT trigger, ceiling 200/user; (2) scan-counter race (parallel scans pinned count near 1, voiding the 50/mo Anthropic cost cap) — new migration `20260719050000_atomic_scan_counter.sql` w/ `try_consume_scan`/`refund_scan` (service-role-only), extract-receipt now consumes atomically BEFORE calling Anthropic (fail-CLOSED 503 if counter unavailable) and refunds failed extractions; (3) delete-account logs purge failures + returns generic errors (deployed); (4) `MIN_PASSWORD = 6` shared client constant, checked at sign-up + reset (sign-IN never gated) — owner explicitly chose 6 over 8 ("think about the old people"; audience skews non-technical), which matches Supabase's server default so the dashboard needs no change; (5) stale `.db-password.local` deleted from disk. DEFERRED (post-launch nice-to-have): RevenueCat webhook → server-side entitlement so ceilings could distinguish free/premium; the blunt ceilings (50 scans, 200 warranties) are fine pre-launch. **⚠️ SEQUENCING: extract-receipt was NOT redeployed yet — it calls the new RPCs, so deploying before the migrations land would 503 every scan. Owner pushes migrations first (steps below), THEN Claude deploys extract-receipt.**

## Security hardening: owner steps — ✅ ALL DONE 2026-07-19
1. ✅ `supabase db push` run by owner; both migrations live (RPCs verified to exist and to deny anon).
2. ✅ Claude deployed `extract-receipt`; all guards re-probed (functions 401, tables/RPCs 42501).
3. ~~Raise minimum password length to 8~~ — **DROPPED by owner (6 is friendlier for non-technical users)**; matches Supabase's default, nothing to change.

- **Growth + docs batch (2026-07-19 late):** five features shipped together.
  (1) **Welcome screen** `app/welcome.tsx`, first open only (AsyncStorage `warraya.welcomeSeen`), headline "Somewhere in a drawer, a warranty you paid for is quietly expiring" (owner-picked), Start free → `/signin?mode=signUp`.
  (2) **Onboarding** `app/onboarding.tsx`: account = 25%, three questions walk to 100% (animated `ProgressBar` w/ percent), Q3 fires the OS push-permission dialog on "Yes, remind me", confetti finish → "Add your first warranty". Gate = `!onboarding_complete AND (account <10 min old OR warraya.onboardingPending)` in `src/lib/onboarding.ts` (unit-tested); old accounts silently backfilled; demo mode never onboards; answers land in `user_metadata.onboarding_answers` (zero migration).
  (3) **Documents**: NEW `warranty_documents` table (migration `20260720000000`, RLS per-op + uid-prefixed path + own-warranty WITH CHECK, backfills `receipt_path` rows idempotently; column kept, web dashboard still writes it, client renders it via `mergeLegacyReceipt` fallback). Detail screen has a thumbnail grid (images in-app via signed URLs + full-screen pinch-zoom `ImageViewer`; PDFs open in Safari; long-press deletes), Add tile = Take Photo / Choose Photo / Choose PDF (`expo-document-picker` + `expo-file-system` added → prebuild done). add.tsx saves warranty FIRST then attaches (failure soft-alerted); manual mode can attach a photo; `deleteWarranty` purges all objects. Uploads stay base64→ArrayBuffer (NEVER RN Blob — silent 0-byte gotcha).
  (4) **Extraction**: `warranty_type` added to the edge-fn schema + prompt nudge to prefer the transaction date; client parses/applies it.
  (5) **Lottie**: `mobile/assets/animations/` is the canonical folder (see its README for slot conventions); hand-authored `success-check.json` (save beat) + `celebrate-confetti.json` (onboarding finish); dashboard/vault first load show `LottieLoader`.
  Suite 61 tests. **DONE 2026-07-19 late: owner pushed the documents migration (verified live: `warranty_documents` exists, anon denied 42501) and Claude deployed extract-receipt; all guards re-probed 401/42501.** Loading animations are now the owner's own two files (`loading-main.json`, `loading-pulse-core.json`, random per mount, verified rendering + animating on simulator); the three placeholders were deleted (recoverable from git history). The save checkmark + onboarding confetti are still Claude-generated placeholders — swap when the owner supplies art.
  **⚠️ NEXT XCODE BUILD MUST START WITH Product → Clean Build Folder (Cmd+Shift+K)** — new native deps landed (expo-document-picker) and stale DerivedData caused a dyld launch crash during verification.
  **`expo-file-system` is PINNED to exactly 57.0.0** — 57.0.1 builds the pod from source against APIs the precompiled ExpoModulesCore artifact does not export, crashing at launch ("Symbol not found: ..._decorateObject..."). Do not bump it without testing a launch.
  **🚨 `npx expo install --check` NOW ARGUES WITH THAT PIN. DO NOT OBEY IT.** As of 2026-07-22 the check reports 10 packages "outdated" and wants `expo-file-system` at `~57.0.1`, which is precisely the version documented one line above as crashing this app at launch. Running `expo install --fix` before an archive would ship a build that dies on open to App Review. The versions currently in `package.json` are the ones build 5 shipped and ran on. **Leave them alone.** Treat the whole `--check` report as advisory-only for this project until someone deliberately tests a launch on hardware after bumping, one package at a time.

## Landing rework (2026-07-20) — all live on warraya.com

Three commits, **landing only**, `mobile/` untouched. Lint + build green, tree clean, each verified live in the served bundle.

- **`f805d59` — favicon cache-bust.** The old teal document-shield logo was still showing in browser tabs long after `e4f208c` replaced it with the blue clock-shield. The server was never wrong: live bytes were md5-identical to the repo, served with `max-age=0, must-revalidate` + ETag. The cause is that Chrome keys its favicon database by URL and refreshes on its own slow schedule, and the logo swap wrote the new image to the **same** `/icons/favicon.png` path, so nothing told the browser to refetch. Fixed by versioning the href in `index.html`: `/icons/favicon.png?v=2` and `/icons/apple-touch-icon.png?v=2`. **Bump `v` on every future logo change** or returning visitors keep the stale mark.

- **`6d288c3` — merged the two mid-page sections into one.** The old "Why Warraya" problem strip (four problem cards) and the "Features" grid (three cards topped with Unsplash stock photos) made the same argument across a section break. Owner: *"those pictures serve no purpose ... a more clear message explaining the features and the purpose together."* Now a single `#features` section on `#dbeafe`: sticky left column carrying the headline **"You already paid for protection. / Warraya makes sure you use it."** (second line in `#2563eb`, mirroring the hero's two-tone `h1`), and a white panel on the right whose rows pair each pain with the fix that kills it — Receipt → *reads the receipt from a photo*, Clock → *reminds you 30 days before coverage ends*, Search → *finds any receipt in one search* — closing on a tinted `#eff6ff` payoff row that carries the old "Claims never filed" money line. All three stock photos deleted.
  - **Deliberately NOT a 3-col card grid.** "How it works" directly below is already three columns of icon + title + text; a card grid above it reads as the same module twice. The white-panel-with-hairline-dividers shape is borrowed from the FAQ block further down the same file, so it is not an invented pattern.
  - **Row icons are `Receipt`/`Clock`/`Search`, not `Camera`/`Bell`/`Archive`**, because `Bell` and `Archive` also appear in "How it works" immediately below. `Camera` was pruned from the lucide import — `eslint.config.js` sets `unused-imports/no-unused-imports: "error"`, so a missed prune fails lint.
  - **Copy numbers are deliberately consistent with the `faqs` array in the same file** (30/7-day reminders, "about thirty seconds", every warranty keeps its receipt attached). Keep them in sync if either side changes.
  - Cleanups the photo removal unlocked: dead `images.unsplash.com` preconnect deleted from `index.html`, and that origin dropped from `img-src` in `public/_headers`.
  - Feature headings are now literal `Warraya + verb + object`, replacing the abstract "Quiet help when you need it most". Net SEO gain on the canonical `/`: three keyword-carrying `h3`s where there were none.

- **`71998ce`** — eyebrow changed "Why Warraya" → "Features" so it matches the nav link that jumps to `#features`.

## Service warranties + document share (2026-07-20, mobile — ✅ DEPLOYED + SHIPPED in build 6)

Two features, requested by owner, planned and implemented in one session:

- **Service warranties:** `category` gained a `'service'` value (alongside electronics/appliances/.../other) so a warranty can cover a SERVICE performed (e.g. an AC repair with a 30-day labor warranty), not just a purchased product. No new column/table — reuses `product_name`/`store` with UI relabeling: `mobile/app/(app)/add.tsx` shows "What Was Serviced *" / "Service Provider" placeholders when category = service; `mobile/app/(app)/warranty/[id].tsx` relabels the store row the same way on display. `mobile/src/data/types.ts` (`CATEGORIES`/`CATEGORY_LABELS`) and `mobile/src/components/CategoryIcon.tsx` (icon `build-outline`) updated. New migration `supabase/migrations/20260720010000_service_category.sql` adds `'service'` to the `warranties_category_enum` CHECK constraint. `supabase/functions/extract-receipt/index.ts` extended (schema + prompt) to recognize paid service/repair invoices during photo-scan and auto-set category=service — owner explicitly chose to include scan support now rather than defer it, accepting extraction risk on unfamiliar invoice layouts since no real service invoice has been tested against it yet.
- **Download/share a document:** added `expo-sharing` (`~57.0.0`, resolved 57.0.6) — no new permission string, since it opens the native iOS share sheet (Messages/Mail/AirDrop/Save Image/Save to Files) instead of touching Photos directly (owner's explicit choice over a dedicated expo-media-library "Save to Photos" button). New `mobile/src/lib/share.ts` (`shareRemoteFile`) downloads via `expo-file-system`'s `/legacy` API (matches the existing pinned-57.0.0 import convention) or decodes a `data:` URI directly for demo mode, then calls `Sharing.shareAsync`. Wired via `shareDocument()` in `mobile/src/data/repo.ts` (dispatches live vs demo like every other repo function). UI: a small share-icon badge on every document tile in `mobile/src/components/DocumentsSection.tsx` (new, alongside existing tap-to-view/long-press-to-delete, unchanged), and a share button next to Close in the full-screen `mobile/src/components/ImageViewer.tsx`.

`cd mobile && npm run typecheck && npm test` green (62/62, one new test added for the service-category extraction path). Lint not run (no ESLint configured for `mobile/` yet — tracked below).

**Deployment status (updated 2026-07-21 from a Mac session):**
1. ✅ **Migration landed.** `20260720010000_service_category` is applied on the remote. `supabase migration list --linked` shows 10 migrations, 0 mismatched.
2. ✅ **`extract-receipt` deployed, v10**, from this exact committed source, then re-probed 401-guarded. All three edge functions verified 401.
3. ✅ **Built and shipped 2026-07-22.** `npx expo prebuild --platform ios` (new native module `expo-sharing`) ran, pods reinstalled, Clean Build Folder + Archive done, uploaded as **build 6**. Remember `mobile/ios` is gitignored and regenerated fresh each time, so this repeats for every archive.

**Two open quality notes on the scan path, neither blocking:**
- **No service default for duration.** `emptyDraft()` seeds `warranty_duration_months: '12'` and the prompt gives no service-specific fallback, so a repair invoice that does not state its guarantee lands on **12 months**, which would tell someone they have a year of coverage on an AC repair. Consider instructing the model to default service work to about 3 months.
- **Partial relabeling.** `add.tsx` and `warranty/[id].tsx` relabel Product Name and Store when category = service, but "Purchase Date" and "Purchase Price" keep their product wording. "Service Date" and "Amount Paid" would finish the thought.

## Next up (RESUME HERE) — build 8 is REJECTED (2nd time, metadata only); most of this is gated on the verdict

**Nothing is blocked on code. These are owner/dashboard tasks, roughly in order.**
**Read the "🔴 REJECTED AGAIN" section at the top of this file first** — the owner action
plan there (re-paste both locales' metadata, resubmit, reply with a screen recording) comes
before anything below. Items 1 and 4 below should not start until Apple rules on the
resubmission, and the paywall parts of item 1 CANNOT pass before approval (rejected
products do not vend; see the Error 23 section).

0. ~~Land the service-warranty + document-share feature.~~ **DONE and shipped in build 6.**
   Server side was already live (migration applied, `extract-receipt` v10 deployed
   2026-07-21); prebuild + archive + upload completed 2026-07-22. **Still untested on
   hardware** (see the risk note in the build 6 section) — add a "Service" warranty and
   confirm the relabeled fields, open a document and confirm the share icon opens the iOS
   share sheet, and **scan a REAL service invoice** (never once done).
1. **Smoke-test build 6 on a real device via TestFlight.** Never-yet-tested-on-hardware paths, in priority order:
   - **Sign in with Apple** (configured end to end, only simulator-verified).
   - **Forgot password** (tap the link in the real email; simulator can't do the Mail round-trip. Watch for "link expired" from email-client prefetch — fallback plan is the `{{ .Token }}` 6-digit flow, noted above).
   - Welcome + onboarding (delete the app first so it counts as a fresh install), documents (attach a PDF, pinch-zoom an image), push permission granted.
   - **⛔ PAYWALL SUB-ITEMS ARE GATED ON APPROVAL** — paywall at the 4th scan showing REAL $4.99/$29.99, and a sandbox trial flipping Settings to "Premium is active". Both are IMPOSSIBLE while the subscriptions sit in Rejected: StoreKit will not vend them to device, sandbox, **or TestFlight**. Error 23 before approval is expected and is not a bug. Re-run these the day the app is approved.
2. **App Store review notes:** create a real account and put its email + password in App Store Connect review notes (this is what unblocked review; reviewers cannot receive OTP emails).
3. ~~Schedule the daily reminder cron~~ **✅ DONE 2026-07-27, verified in the jobs list.**
   Job `send-expiry-reminders-daily`, `0 13 * * *` (13:00 GMT = 9:00 AM Puerto Rico;
   the dashboard shows next run 28 Jul 09:00 -0400), type Supabase Edge Function →
   POST `send-expiry-reminders`, timeout 5000 (dashboard max; only caps how long the
   cron WAITS, the function still finishes), Authorization header = Bearer secret.
   **CRON_SECRET was ROTATED by the owner the same day** (the old value was
   unrecoverable: Supabase shows only digests, never values) and the function
   redeployed; wrong-secret probe still bounces 401. The owner holds the only copy.
   **Setup gotcha, cost one failed attempt:** the Cron UI needs TWO extensions and
   only offers to install one. The in-dialog button installs `pg_net` (HTTP calls),
   but `pg_cron` (the scheduler itself) must be enabled separately in Database →
   Extensions, or job creation fails with `42P01 relation "cron.job" does not exist`.
   Also: the dashboard caps the timeout field at 5000 ms, and the job name cannot be
   renamed later. **Manual trigger VERIFIED by the owner 2026-07-27:** HTTP 200,
   `{"ok":true,"considered":0,"pushSent":0,"emailSent":0}` — secret, auth, and the
   full function path work; the zeros just mean the prod table has no warranty
   expiring within 30 days yet. **Remaining proof: a push arriving on a real
   device** — add a real warranty expiring ~3 weeks out on a phone with
   notifications allowed, re-run the curl, expect considered/pushSent >= 1 and the
   notification within seconds. If considered is 1 but pushSent stays 0, the gap
   is the device's push token (permission or registration), debug there. Note: a
   manual send consumes that warranty's reminder window (dedupe table), so the
   next 13:00 GMT run correctly will not repeat it.
4. ~~Launch-day landing swap~~ **✅ DONE + LIVE-VERIFIED 2026-07-27 (`b134d1a`).** Every
   `ComingSoonPill` is now an `AppStoreBadge` (inline-SVG Apple badge) linking to the live
   listing `https://apps.apple.com/us/app/warraya-warranty-tracker/id6792513985` (URL
   independently confirmed via the itunes lookup API: version 1.0, Free, live). The head
   JSON-LD upgraded WebApplication → SoftwareApplication with installUrl + the three
   offers (0 / 4.99 / 29.99 USD); FAQ #6 and its JSON-LD mirror now say "available on the
   App Store today. Android is next." Verified on production with the PRESENT-strings
   method against the real `index-B960v4XN.js` bundle (and yes, the SPA-fallback trap
   fired again during verification: the stale asset name returned index.html with a 200
   and content-type text/html — always re-read the CURRENT asset name from `/` first).
   Pricing was already on the page from the 2026-07-20 rework, so nothing to add there.
   Still open, later: retire the unlinked `/login` + web dashboard.
5. **Post-launch code work** (none urgent): add ESLint (only real gap for first-party warnings); RevenueCat webhook → server-side entitlement so ceilings can tell free from premium; swap the two Claude-generated placeholder animations (`success-check.json`, `celebrate-confetti.json`) for real art; Android build (needs FCM).
6. **Calendar reminders:** owner mentioned wanting to add calendar integration; not started, not scoped.

### Diary dates (do not miss)
- **~2027-01-19:** the Apple Sign-In client secret expires (6-month Apple limit). Regenerate from `~/Desktop/keys/warraya/AuthKey_SNP29WP9P3.p8` (key ID `SNP29WP9P3`, team `DYR4YB9FVL`) and paste into Supabase → Auth → Providers → Apple. The native ID-token flow keeps working, but the web/Services-ID flow breaks.
- **2027-05-29:** Apple Distribution certificate expires.
- **2027-07-19:** provisioning profile expires.

## Build-warning audit (2026-07-19, measured — don't re-litigate)
Archive-config Release build: **0 errors, 0 warnings**. (The one "warning:" line is `Bundler cache is empty, rebuilding`, a JS-bundler message, not a compiler warning.) 77 Xcode *notes* remain, all benign: ~50 are RevenueCat's "detected encoding UTF-8" on its `Localizable.strings`, 13 are "script phase runs during every build" (which is CORRECT config — the RN bundle phase must run every build or the app ships a stale JS bundle; acknowledging it is what turns that warning into a note), rest are include-context lines.
**What `withCleanXcodeBuild.js` hides:** rebuilt with `GCC_WARN_INHIBIT_ALL_WARNINGS=NO SWIFT_SUPPRESS_WARNINGS=NO` → **972 warnings, 100% third-party** (184 Pods headers, 31 expo-image-picker, 26 gesture-handler, 22 expo, 22 expo-apple-authentication, 17 expo-router, 11 expo-document-picker, …). **ZERO in `mobile/src`, `mobile/app`, or the app target.** Kinds: 116 doc-deprecated-sync, 33 nullability-completeness, 30 unused-function, 14 deprecated-declarations, rest trivial. Only the 14 deprecated-API uses carry any long-term risk and they are all inside libraries, fixable only upstream. Conclusion: suppression hides library noise, not app defects; nothing here blocks shipping.
**Warraya has no hand-written native code** (only Expo-generated `AppDelegate.swift`); all first-party code is TypeScript under `strict: true`, `tsc` clean, 61 tests. **Gap: no ESLint configured** — worth adding post-launch for first-party code-quality warnings.

## Gotchas learned (don't relearn)
- **⚠️ THIS HAS TWO SYMPTOMS AND ONLY ONE IS A RED SCREEN.** With `--dev-client` the app can instead **hang forever on the navy splash (`#0a1440` + shield), with no red screen, no error, and no crash** — observed 2026-07-22 and initially misread as an app bug. Nothing in the React tree can cause that: the splash is native and auto-hides on the first committed frame (the app calls no `preventAutoHideAsync`), so a stuck splash means **JS never executed at all**, which means the bundle never loaded. **Before debugging any launch hang, check Metro first:** `curl -s localhost:8081/status` should print `packager-status:running`; if it prints nothing, that is your answer and the app code is irrelevant.
- **"No script URL provided … unsanitizedScriptURLString = (null)" red screen after ▶ Run in Xcode** = Metro wasn't running when the app launched. Expo SDK 57 dropped the auto-start-packager build phase, and Xcode's ▶ Run uses the **Debug** config, which fetches JS from Metro instead of an embedded bundle (a Debug `.app` has no `main.jsbundle` — verified). **`RCTBundleURLProvider` probes `localhost:8081/status` ONCE at launch and caches the miss, so tapping Reload does NOT help — the app must be RELAUNCHED.** Fix, in order: (1) `cd mobile && npx expo start` with the node@22 PATH export, in a Terminal you leave open; (2) wait for "Waiting on http://localhost:8081"; (3) in Xcode press ▶ Run again (or Stop then Run). Verified end-to-end 2026-07-19: same Debug build that red-screened loaded fine on relaunch. Archives/TestFlight are unaffected — Release embeds the bundle, which is why `xcodebuild -configuration Release` and Archive both work with no packager.
- `eas init` cannot write to the dynamic `app.config.ts` — projectId `d8804a1c-1cfe-4103-925d-e0dffff4e8a2` was added by hand. Builds read the config fine.
- `.db-password.local` was deleted 2026-07-19 (held a stale password in plaintext). Only the owner holds the DB password; only `supabase db push` needs it (owner-run). Claude CAN deploy edge functions from its shell.
- **🚨 Run `git fetch` BEFORE diagnosing anything in this repo. Work lands on `origin/main` from cloud Claude Code sessions that this Mac has never pulled.** On 2026-07-21 `supabase db push` failed with *"Remote migration versions not found in local migrations directory ... try `supabase migration repair --status reverted 20260720010000`"*. That reads like phantom drift on production. It only meant the local clone was **5 commits behind** and had never pulled the migration file. **`git status` alone will not reveal this**: against stale tracking refs it happily prints `## main...origin/main` with no ahead/behind while origin is 5 commits ahead. An entire session was spent reconstructing a "lost" migration that was sitting on GitHub the whole time. **Never run the `migration repair --status reverted` the CLI suggests** — it makes the history table forget a migration without undoing its schema changes, which is how you turn a stale checkout into real, permanent drift. Fetch, pull, then re-run the push. (If a migration ever genuinely is gone, its exact SQL is recoverable in the SQL editor: `select unnest(statements) from supabase_migrations.schema_migrations where version = '<version>';` — verified byte-identical against the real file.)
- Entitlement must be exactly `premium` (code checks `entitlements.active['premium']`).
- iOS app icon must be opaque (no alpha) — the generator already flattens it.
- Web dashboard sign-in works (Cloudflare VITE_ vars are set); web is landing-first, app-first future.
- **The landing auto-deploys on Cloudflare from a push to `main`, in about 30 seconds.** There IS a `deploy` script in `package.json` (`vite build && wrangler deploy`) but you do not need it, and it fails here anyway: this machine has no wrangler credentials (nothing at `~/.wrangler/config` or `~/Library/Preferences/.wrangler`, no `CLOUDFLARE_API_TOKEN`). Push and wait. Do not conclude "it needs a manual deploy" from the presence of that script — that assumption was made and was wrong.
- **Verifying a landing deploy: assert the NEW strings are PRESENT, never just that the old ones are absent.** `wrangler.jsonc` sets `not_found_handling: "single-page-application"`, so any missed `/assets/...` path returns **HTTP 200 with index.html**, not a 404. In the brief window where an edge-cached `index.html` still points at the previous bundle hash, fetching that asset yields HTML, and an absence-only grep passes trivially against it. This produced a false "deployed" verdict once. Correct method: fetch `/`, read the `index-*.js` name out of it, fetch that asset, grep for strings that MUST exist.
- **The Browser pane will not repaint the landing page after any scroll** — dev server or production build, either one. It renders correctly at scroll 0 and then goes blank on scroll. To screenshot a mid-page section, hide the preceding `<section>` elements via `javascript_tool` so the target sits at the top, screenshot, then reload to restore. Also: `resize_window` with explicit width/height broke painting entirely; the `desktop`/`mobile` presets plus a reload are what work.
- ~~OTP email templates carry `{{ .Token }}`~~ — moot since 2026-07-19: OTP sign-in was removed in favour of email+password (owner: OTP "creates friction for users"). Templates are unused unless a password-reset flow is added later.
