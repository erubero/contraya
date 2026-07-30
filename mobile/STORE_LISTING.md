# Contraya — App Store listing package (iOS)

Everything needed to create the App Store Connect record and get to TestFlight.
Copy fields verbatim. Character limits are noted. The copy now says "AI"
plainly (rule reversed 2026-07-29: on a legally sensitive product, disclosing
the mechanism beats sounding magical). No dashes in the copy. English (U.S.) is the primary language; a Spanish
mirror can be added later (see section 10).

Lessons inherited from Warraya's submissions are kept: the EULA link inside
the description is mandatory for auto-renew subscriptions (3.1.2 rejection,
2026-07-22), and the paid subscription must be described as a paid upgrade,
not a free feature.

---

## Before any of this can be submitted (hard prerequisites, in order)

The text below is finished and paste-ready. These are the things that block
actually submitting, roughly in the order they bite:

1. **The landing must be deployed.** App Store Connect requires a working
   **Privacy Policy URL** and Apple does check it. `usecontraya.com/privacy`
   and `usecontraya.com` are both used in this listing, and the site has never
   been deployed (STATUS.md checklist item 9). A 404 there is a rejection.
   This is the first domino: deploy the landing, then point the domain.
2. **The app icon.** RESOLVED (v2 mark, 2026-07-30): the tree carries the
   lime C-and-fine-print mark on navy, 1024x1024 opaque, regenerated across
   app and web by `brand/generate-icons.py`. See `brand/README.md`.
3. **Screenshots** (section 7). Cannot be captured until the app runs, and
   the palette just changed to lime, so any earlier captures are stale.
4. **The price must be real.** The description below states $7.99 / $49.99.
   Once that text ships, the RevenueCat products and the ASC subscription
   prices have to match it exactly. Decide the number, then configure it.
5. **Sign in with Apple** needs its own Services ID + key for
   `com.contraya.app`. Warraya's key does not carry over.
6. **hello@usecontraya.com must receive mail** (Cloudflare Email Routing) or
   the support contact is dead on arrival.

Nothing here is code. All six are account-and-dashboard work that only the
owner can do.

---

## 0. Decisions (locked)

- **App name:** Contraya: Contract Analyzer (changed from "Contract Reader"
  2026-07-29). "Reader" collided with PDF-viewer searches, which pulls the
  wrong intent, and it undersold a product whose whole job is extracting dates
  and flagging clauses. "Analyzer" also matches the codebase, where the edge
  function is literally `analyze-contract`. Deliberately NOT "Contract Review":
  that phrase means attorney work, and this app describes rather than advises.
- **Support email:** hello@usecontraya.com (Cloudflare Email Routing must be
  live before submission so this mailbox receives mail; owner checklist item)
- **Languages:** English (U.S.) only at launch.
- **Pricing shown below ($7.99 / $49.99)** matches the landing page and
  STATUS.md; align the RevenueCat products with it before submission.

---

## 1. App Information (set once)

- **Name:** Contraya: Contract Analyzer  (27 of 30 chars)
- **Subtitle (30 max):** Plain English, every deadline  (29 of 30)
- **Bundle ID:** com.contraya.app  (already set in app.config.ts)
- **SKU:** contraya-ios-1
- **Primary language:** English (U.S.)
- **Primary category:** Productivity
- **Secondary category:** Utilities
- **Content rights (third-party content?):** No
- **Privacy Policy URL:** https://usecontraya.com/privacy
- **User access:** Full Access
- **License Agreement:** leave as Apple's Standard EULA. Because the app sells
  auto-renewable subscriptions, guideline 3.1.2 requires a *functional link*
  to that EULA inside the App Description itself. That link is the last block
  of the description below. Removing it gets the build rejected (proven on
  Warraya, 2026-07-22).

---

## 2. Version fields (1.0.0)

**Promotional text (170 max):**
Somewhere in that contract is a deadline that will cost you money. Contraya puts it in plain English and reminds you before payments, renewals, and notice dates.

**Keywords (100 max, comma separated, single words on purpose: Apple combines
them into phrases. "contract" and "analyzer" already live in the name, so they
are deliberately not repeated. "reader" is here precisely because it left the
name: it still has search volume, and as an invisible keyword it catches that
traffic without the name promising a plain document viewer. Exactly 100 of 100
characters, so anything added has to displace something. ASO judgment, not
data; revisit once real search data exists):**
lease,agreement,renewal,deadline,reminder,vendor,wedding,freelance,gym,landlord,tenant,clause,reader

**Support URL:** https://usecontraya.com
**Marketing URL (optional):** https://usecontraya.com
**Copyright:** 2026 Renovatio, LLC

**Description:**

You signed it. Contraya makes sure you know what it says.

Every lease, phone plan, gym membership, and vendor agreement is full of dates, obligations, and clauses that cost real money when they catch you off guard. Contraya uses AI to read the contract, explain it in plain English, and remind you before every deadline. Built by a lawyer, for everyday people.

IN PLAIN ENGLISH
Add a contract as a photo or a PDF and Contry uses AI to read the whole thing. You get a short summary of what you are agreeing to, what you pay, and what happens if you want out, in words you would use with a friend.

EVERY DATE ON YOUR CALENDAR
Payment deadlines, notice windows, renewal dates, end dates. Contry pulls each one out of the document, you confirm it, and it lands on your calendar with reminders attached.

RISKY CLAUSES, QUOTED
Anything that locks you in, charges you extra, or takes away an option gets flagged and quoted word for word, so you can find it in the document and read it yourself.

ASK CONTRY
Can I have a cat? What happens if I pay late? Contry answers from your document and quotes the lines the answer came from.

FORWARD IT FROM YOUR EMAIL
Contracts arrive by email. Contraya gives you a private forwarding address, and the PDF lands in the app ready to read.

WHAT PEOPLE KEEP IN CONTRAYA
Apartment leases, phone and internet plans, gym memberships, wedding and event vendors, freelance client contracts, contractors and home repairs, storage units, auto loans. If you signed it, it belongs here.

WHAT CONTRAYA IS NOT
Contraya describes what your documents say. It is an informational tool, not a law firm, and nothing in the app is legal advice. Using Contraya does not create an attorney-client relationship, and nothing you put in it is protected by attorney-client privilege. Summaries are generated by AI and are not reviewed by a person, so check them against your original document. Every analysis screen says all of this. For legal advice, talk to a licensed attorney of your own.

PRIVATE BY DESIGN
Your contracts are stored in private storage only your account can access, encrypted in transit and at rest, and never sold or shared. You can delete your account and everything in it at any time.

CONTRAYA PREMIUM SUBSCRIPTION
Contraya Premium is an optional auto-renewing subscription: a paid upgrade, not a free feature. Contraya itself is free to use, and your first 2 contract readings are included. Contraya Premium includes up to 15 contract readings each month, up to 50 Ask Contry questions each month, and email forwarding.

Contraya Premium Monthly: $7.99 per month
Contraya Premium Annual: $49.99 per year

Payment is charged to your Apple Account when you confirm the purchase. The subscription renews automatically at the same price unless you turn off auto renew at least 24 hours before the current period ends, and your account is charged for the renewal within the 24 hours before the period ends. You can manage the subscription and turn off auto renew in your Apple Account settings after purchase.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://usecontraya.com/privacy

**What's New in this version (1.0.0):**
Say hello to Contraya. Add a contract as a photo, a PDF, or a forwarded email, get it explained in plain English, and let Contry remind you before every payment, renewal, and notice deadline.

---

## 3. App Privacy (App Store Connect → App Privacy)

Contraya differs from Warraya here in three ways: push tokens ARE stored
server side (the daily reminder cron), forwarded email metadata is stored
(the email-in feature), and uploaded documents are processed by a third-party
document-processing service provider to produce the summaries. Declare:

**Data collected and linked to the user (all for App Functionality, none for tracking):**
- Contact Info → Email Address — account creation and sign-in
- User Content → Emails or Text Messages — ONLY messages the user forwards to
  their own Contraya address (sender, subject, and PDF attachments are stored;
  the message body is not). NOTE: this sits under **User Content** in Apple's
  taxonomy, not Contact Info. An earlier draft of this doc filed it under
  Contact Info, which does not exist as an option and will send you hunting.
- User Content → Photos or Videos — contract page photos and the avatar
- User Content → Other User Content — contract records, uploaded PDFs, chat
  questions
- Identifiers → User ID — account identity, and the RevenueCat app user ID
- Identifiers → Device ID — the push notification token, stored to deliver
  reminders
- Purchases → Purchase History — RevenueCat. `src/lib/purchases.ts` configures
  the SDK with `appUserID` set to the Supabase user id, so a third party
  receives subscription transactions tied to an identifiable account. Apple's
  own StoreKit purchases would not need declaring; routing them through
  RevenueCat does. Declare this even if the RevenueCat keys are still blank at
  first submission, because the SDK ships in the binary and the description
  sells a subscription. Under-declaring here is the failure mode that gets
  flagged, and it is invisible until it is not.

**For every item above:** Used for App Functionality = Yes; Linked to identity = Yes; Used for Tracking = No.
**Data used to track you:** None.
**Data shared with third parties:** None for marketing or tracking. Documents
are processed by a service provider on our behalf to produce summaries (this
is App Functionality, not tracking; say so in review notes if asked).

(If crash reporting or analytics is added later, update this section.)

---

## 4. Age rating

Answer every content question **None / No**. Result: **4+**. (Contract
summaries are informational content about the user's own documents; nothing
in the questionnaire covers them.)

## 5. Export compliance

The app declares `ITSAppUsesNonExemptEncryption: false` in app.config.ts (it
only uses standard HTTPS, which is exempt), so uploads will not prompt export
questions. No documents required.

---

## 6. App Review notes (paste into the Review Notes field)

> Contraya uses AI to read contract documents the user uploads and produce
> plain English descriptions of what those documents say: a summary, key
> dates, obligations, and clauses worth attention, each quoted from the
> document. These are informational descriptions of the user's own documents,
> not legal advice.
>
> The disclaimer "Contry uses AI to explain what your contract says. This is
> not legal advice." is shown on the analysis review screen and on every
> contract detail screen. The chat carries the same disclaimer worded for
> that surface. The full version, including that using Contraya creates no
> attorney-client relationship and no attorney-client privilege, appears at
> the end of onboarding and in a long form page at Settings, About, About
> These Summaries. The chat also declines to answer questions that ask for
> legal conclusions (for example "can I sue?") and refers the user to a
> licensed attorney.
>
> To test: create an account with any email and password (no confirmation
> email, you are signed in right away). Add a contract using the attached
> sample PDF, review the dates it found, and save. A sample contract PDF is
> attached to this submission for that purpose.

Attach a sample contract PDF (a fictional 2-3 page lease works) to the
review notes. Do not attach a real contract.

---

## 7. Screenshots (required before public submission)

Not needed for internal TestFlight. Required to submit for review. Minimum is
the **6.9-inch iPhone set at 1320 x 2868 portrait**; 3 to 6 images is the
sweet spot, 10 is the cap. Apple scales this set down for smaller devices, so
one set is enough.

Capture these in **demo mode** (blank `mobile/.env`), which seeds the
apartment lease and the wedding-vendor contract, so no real contract data
appears in a public screenshot. Ever.

Shot order matters: most people only see the first two in search results, so
lead with the payoff, not the empty state.

1. **The reveal** — the review screen right after an analysis: the "Contry
   finished reading. Here's what it found." line, the plain-English card, and
   the severity-colored risk pills below it.
   Caption: *"Every contract, in plain English."*
2. **The dates** — the review screen's date list, or the contract detail
   timeline, showing the renewal-notice and payment dates.
   Caption: *"Every deadline, found and dated."*
3. **A reminder** — the dashboard with "Coming up" populated, or a
   notification mock.
   Caption: *"A heads up while there is still time to act."*
4. **Ask Contry** — the chat with the labeled answer card and a bolded lead
   sentence.
   Caption: *"Ask anything. Answers come from your document."*
5. **The risky clauses** — the contract detail highlights, severity badges and
   quoted clause text visible.
   Caption: *"The fine print, quoted word for word."*
6. *(optional)* **Calendar** — the month view with dates marked.
   Caption: *"Everything you signed, on one calendar."*

Copy rules apply to captions exactly as they do in the app: say "AI" plainly
where the mechanism comes up (rule reversed 2026-07-29), no em dashes, and
nothing that implies advice. Do not put the not-legal-advice disclaimer in a
caption; it is on the screens themselves, which is the point.

---

## 8. TestFlight

**Internal testing (up to 100 of your own team): no review needed.** You only
need the app record + an uploaded build. This is the fastest path.

**External testing (public / email links, up to 10,000): needs Beta App Review.**
Fill these:

- **Beta App Description:** Contraya reads your contracts, explains them in plain English, and reminds you before payments, renewals, and notice deadlines.
- **What to Test:**
  1. Create an account with your email and a password (no confirmation email, you are signed in right away).
  2. Add a contract by uploading a PDF, then one by taking photos of pages.
  3. Review the summary and the dates Contry found; fix one date and save.
  4. Open the contract, check the dates list, the highlights, and the documents.
  5. Ask Contry a question about the contract (Premium path).
  6. Confirm you receive a date reminder notification.
  7. In Settings, find your email forwarding address and forward a PDF to it.
- **Feedback email:** hello@usecontraya.com
- **Marketing URL:** https://usecontraya.com
- **Beta App Review contact:** your name, phone, email.

---

## 9. Order of operations to reach TestFlight

Builds go through Xcode, never `eas build` / `eas submit` (repo rule):

1. `npx expo prebuild --platform ios` (Claude runs this; regenerates `ios/`).
2. Owner opens `mobile/ios/Contraya.xcworkspace`, Team: Renovatio, LLC.
3. Create the app record in App Store Connect using Section 1 above.
4. In Xcode: Product → Archive, then Distribute App → App Store Connect.
5. In App Store Connect → TestFlight, wait for processing, confirm export
   compliance if asked, then add internal testers.

---

## 10. Spanish (es-MX), later

English only at launch (mirrors the Warraya 2026-07-27 decision; a stale or
partial localization can re-trigger 3.1.2/2.3.2 rejections on its own). When
a Spanish launch is wanted, write the es-MX mirror fresh from the English
above, keeping the same rules: Contry described by what it does, "AI" said
plainly (rule reversed 2026-07-29), no dashes, subscription block with the
EULA link.
