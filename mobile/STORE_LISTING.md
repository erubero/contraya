# Contraya — App Store listing package (iOS)

Everything needed to create the App Store Connect record and get to TestFlight.
Copy fields verbatim. Character limits are noted. No "AI" wording anywhere
(Contry is described by what it does: it reads the contract and explains it).
No dashes in the copy. English (U.S.) is the primary language; a Spanish
mirror can be added later (see section 9).

Lessons inherited from Warraya's submissions are kept: the EULA link inside
the description is mandatory for auto-renew subscriptions (3.1.2 rejection,
2026-07-22), and the paid subscription must be described as a paid upgrade,
not a free feature.

---

## 0. Decisions (locked)

- **App name:** Contraya: Contract Reader
- **Support email:** hello@usecontraya.com (Cloudflare Email Routing must be
  live before submission so this mailbox receives mail; owner checklist item)
- **Languages:** English (U.S.) only at launch.
- **Pricing shown below ($7.99 / $49.99)** matches the landing page and
  STATUS.md; align the RevenueCat products with it before submission.

---

## 1. App Information (set once)

- **Name:** Contraya: Contract Reader
- **Subtitle (30 max):** Contracts in plain English
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
them into phrases. "contract" and "reader" already live in the name, so they
are deliberately not repeated. ASO judgment, not data; revisit once real
search data exists):**
lease,agreement,renewal,deadline,reminder,vendor,wedding,freelance,gym,landlord,tenant,clause

**Support URL:** https://usecontraya.com
**Marketing URL (optional):** https://usecontraya.com
**Copyright:** 2026 Renovatio, LLC

**Description:**

You signed it. Contraya makes sure you know what it says.

Every lease, phone plan, gym membership, and vendor agreement is full of dates, obligations, and clauses that cost real money when they catch you off guard. Contraya reads the contract, explains it in plain English, and reminds you before every deadline.

IN PLAIN ENGLISH
Add a contract as a photo or a PDF and Contry reads the whole thing. You get a short summary of what you are agreeing to, what you pay, and what happens if you want out, in words you would use with a friend.

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
Contraya describes what your documents say. It is an informational tool, not a law firm, and nothing in the app is legal advice. Every summary says so. For legal advice, talk to a licensed attorney.

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
- Contact Info → Emails or Text Messages — ONLY messages the user forwards to
  their own Contraya address (sender, subject, and PDF attachments are stored;
  the message body is not)
- User Content → Photos or Videos — contract page photos and the avatar
- User Content → Other User Content — contract records, uploaded PDFs, chat
  questions
- Identifiers → User ID — account identity
- Identifiers → Device ID — the push notification token, stored to deliver
  reminders

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

> Contraya reads contract documents the user uploads and produces plain
> English descriptions of what those documents say: a summary, key dates,
> obligations, and clauses worth attention, each quoted from the document.
> These are informational descriptions of the user's own documents, not
> legal advice. A disclaimer ("This explains what the contract says. It is
> not legal advice.") is shown on every analysis screen, in the chat, and in
> a long form page in Settings. The chat also declines to answer questions
> that ask for legal conclusions (for example "can I sue?") and refers the
> user to a licensed attorney.
>
> To test: create an account with any email and password (no confirmation
> email, you are signed in right away). Add a contract using the attached
> sample PDF, review the dates it found, and save. A sample contract PDF is
> attached to this submission for that purpose.

Attach a sample contract PDF (a fictional 2-3 page lease works) to the
review notes. Do not attach a real contract.

---

## 7. TestFlight

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

## 8. Order of operations to reach TestFlight

Builds go through Xcode, never `eas build` / `eas submit` (repo rule):

1. `npx expo prebuild --platform ios` (Claude runs this; regenerates `ios/`).
2. Owner opens `mobile/ios/Contraya.xcworkspace`, Team: Renovatio, LLC.
3. Create the app record in App Store Connect using Section 1 above.
4. In Xcode: Product → Archive, then Distribute App → App Store Connect.
5. In App Store Connect → TestFlight, wait for processing, confirm export
   compliance if asked, then add internal testers.

---

## 9. Spanish (es-MX) — later

English only at launch (mirrors the Warraya 2026-07-27 decision; a stale or
partial localization can re-trigger 3.1.2/2.3.2 rejections on its own). When
a Spanish launch is wanted, write the es-MX mirror fresh from the English
above, keeping the same rules: Contry described by what it does, no "AI"
wording, no dashes, subscription block with the EULA link.
