// Every user-facing legal string in one file. Before this existed the
// disclaimer was hand-written at three call sites and had already drifted into
// two different wordings. On a product that describes contracts for people who
// are not lawyers, that drift is the whole risk, so: import from here, never
// retype.
//
// Three claims travel together and none of them is optional:
//   1. AI reads the document (disclosed, not hidden behind the mascot)
//   2. it is not legal advice
//   3. no attorney-client relationship, no attorney-client privilege
//
// (1) is deliberate. The owner reversed the original "never say AI" rule on
// 2026-07-29: on a legally sensitive product, telling people how it works
// beats sounding magical.
//
// HOW "together" is satisfied, decided 2026-08-09 (audit finding 12). For ten
// days the analysis surfaces shipped claims 1 and 2 and left claim 3 sitting
// in a constant that nothing rendered, so this file's own rule was being
// violated on the one screen where it matters most. Putting all three in the
// footer turns a one-line note into a paragraph on three screens, and a
// disclaimer nobody finishes reading is worse than a short one. So: 1 and 2
// inline, 3 exactly one tap away, and the tap is not optional either. Render
// the analysis footer through `components/DisclaimerNote`, never a bare
// `<Text>{DISCLAIMER}</Text>` — the component is what guarantees the link is
// there. Surfaces that explain the product at length (onboarding, About These
// Summaries, support, Terms) keep all three inline, because there is room.

// The AI provider. TWO constants on purpose since 2026-08-30, and they must not
// be merged back:
//
// AI_PROVIDER is the truth: who actually receives the documents. After this
// change NOTHING user-facing interpolates it, so its only consumers are the
// two gate tests. That is deliberate and it is not dead code. Both tests read
// this value to assert an ABSENCE, so repointing it at the neutral label would
// not fail the build, it would silently stop guarding and leave a green suite
// that checks nothing. Keep the real name here.
//
// AI_PROVIDER_PUBLIC is what the user reads. The owner decided on 2026-08-30 to
// take the vendor name out of all user-facing copy, in the app and on the
// privacy policy and terms pages.
//
// The wording is chosen to avoid a trap. BOTH phrasings App Review rejected in
// 1.0 (6) were "third-party" plus a role noun: "a third-party document-
// processing service provider" and "a third-party AI provider we use". Any
// replacement that reuses that shape IS the rejected phrase with new paint, so
// this says "an outside company" instead. `aiConsentGate.test.ts` fails the
// build if either rejected phrase reappears anywhere in the copy.
//
// KNOW WHAT THIS COSTS BEFORE YOU EDIT EITHER. 1.0 (6) was rejected under
// guideline 5.1.2(i) for exactly this shape of disclosure: an unnamed
// third-party AI recipient. STATUS.md calls the euphemism "the single biggest
// self-inflicted wound". The decision was made twice, with that on the table.
// If review rejects it again on 5.1.2(i), the fix is one line: set
// AI_PROVIDER_PUBLIC back to AI_PROVIDER.
//
// NEVER interpolate AI_PROVIDER into anything a user can read.
export const AI_PROVIDER = 'Anthropic';
export const AI_PROVIDER_PUBLIC = 'an outside company';
// Still resolves to the provider's own domain, which is deliberate: the sheet
// claims a commercial contract, no training, and deletion after a limited
// retention period, and this link is the only in-app evidence for any of it.
// Tapping it does reveal the name in Safari's address bar. That is a known and
// accepted consequence of the 2026-08-30 decision, not an oversight.
export const AI_PROVIDER_PRIVACY_URL = 'https://www.anthropic.com/legal/privacy';
export const AI_PROVIDER_PRIVACY_LINK_LABEL = "that company's privacy policy";

// Rides on every analysis surface: the review screen and the contract detail.
// Claims 1 and 2. DisclaimerNote appends the link that carries claim 3.
export const DISCLAIMER =
  'Contry uses AI to explain what your contract says. This is not legal advice.';

// The chat variant, phrased for a question-and-answer surface where the user
// is actively asking Contry things. Same two claims, same link after it.
export const DISCLAIMER_CHAT =
  'Contry uses AI to answer from your document. This is not legal advice.';

// The tappable half of the analysis footer. Deliberately says what is on the
// other side rather than "Learn more", so tapping is a choice about the legal
// limits and not a mystery link.
export const DISCLAIMER_MORE = 'What this is not.';

// The sentence that has to appear wherever the product is explained at length:
// onboarding, About These Summaries, Terms, and the store listing. Kept
// separate from DISCLAIMER because it is too long for an inline footer but too
// important to leave to the Terms alone.
export const NO_ATTORNEY_RELATIONSHIP =
  'Using Contraya does not create an attorney-client relationship, and nothing you put here is protected by attorney-client privilege.';

// Approved positioning. Owner's call on 2026-07-29, made against the advice
// that a credential claim naming no jurisdiction of licensure is treated as
// attorney advertising by several bars. Flagged for the pre-launch attorney
// review. Do not add a name, a firm, or a jurisdiction without that review,
// and do not use it anywhere near an analysis result, where it would push a
// reader toward hearing advice.
export const BUILT_BY = 'Built by lawyers, for everyday people.';

// The long-form version, used by About These Summaries and mirrored in Terms.
export const ABOUT_SUMMARIES_PARAGRAPHS = [
  `Contraya uses AI to read the documents you upload and describe what they say: the dates, the payments, the obligations, and the clauses people often want to know about. The model is run by ${AI_PROVIDER_PUBLIC} rather than on your phone, so a copy of the document you upload is sent there to be read. Everything you see comes back from your own document, rewritten in everyday words.`,
  'Contraya was built by lawyers, for everyday people. That is why it explains rather than advises, and it does not change what follows.',
  'Contraya is not a law firm and does not give legal advice. Using it does not create an attorney-client relationship, and nothing you put here is protected by attorney-client privilege. The summaries do not tell you what you should do, whether a contract is good for you, or whether a clause is enforceable where you live. Laws vary by state and country, and only a licensed attorney who knows your situation can advise you.',
  'Because the summaries are generated by AI, they can be wrong. AI can misread a date, miss a clause, or describe something with more confidence than it deserves. Always check the details against your document before relying on them, and keep the original. It is the only version that counts.',
  'If a contract involves a lot of money, your home, your health, or anything you cannot afford to get wrong, have a licensed attorney look at it.',
];

// ---------------------------------------------------------------------------
// The AI data disclosure. Added 2026-08-23, after App Review rejected 1.0 (6)
// under guidelines 5.1.1(i) and 5.1.2(i): the app sent every uploaded document
// to a third-party AI service without naming it and without asking first.
//
// 5.1.2(i) asks for four things and three of them are strings, not code: what
// is sent, who it goes to, and permission before it goes. Apple's letter says
// outright that carrying this only in the Terms or the Privacy Policy does not
// count, so these render in a sheet the user has to answer before any document
// leaves the device (see lib/AiConsentContext).
//
// The provider is NO LONGER NAMED here (owner decision, 2026-08-30, see
// AI_PROVIDER_PUBLIC above). What remains has to carry the disclosure on its
// own, so the concrete claims below are now load-bearing and none of them may
// be trimmed for brevity: that the reading happens off the device, that a
// third-party company receives the document, exactly what is and is not sent,
// that it is not used for training, and that it is deleted after a limited
// retention period. "Powered by AI" is the exact phrasing the guideline was
// written against, and dropping any of these gets closer to it, not further.

export const AI_CONSENT_TITLE = 'Before Contry reads your contract';

// Who, in one sentence, before any list. It leads with Contry and puts the
// provider in a subordinate clause on purpose: the disclosure has to be plain,
// and it also has to not read as a partnership announcement. The "not on your
// phone" clause stays, because the mascot makes people assume the reading
// happens locally and that is the assumption this screen exists to break.
export const AI_CONSENT_WHO =
  `Contry does the reading with an AI model run by ${AI_PROVIDER_PUBLIC}, not on your phone. To write your summary, your document is sent to that company over an encrypted connection.`;

// What leaves the device. Concrete on purpose: "some of your data" is the other
// phrasing the guideline was written against.
export const AI_CONSENT_SENT = [
  'The PDF or the page photos you pick, exactly as they are, including every name, address, amount, and date written in them.',
  'When you ask Contry a question: your question, that same document, and the contract details Contry already pulled out of it.',
];

// What does not. This is true, it is unusual, and it is the strongest thing the
// app can say here, so it gets its own section rather than a trailing clause.
export const AI_CONSENT_NOT_SENT = [
  `Your email address, your name, and your Contraya account stay here, so the company is never told whose document it is.`,
];

export const AI_CONSENT_HANDLING =
  `Under a commercial contract, the company processes the document only to produce your summary, is not allowed to use it for training, and deletes it after a limited retention period.`;

export const AI_CONSENT_REVOKE =
  'You can turn this off at any time in Settings, under AI and Your Data. Contry then stops sending anything, and you can still add contracts by hand.';

export const AI_CONSENT_ALLOW = 'Allow and continue';
export const AI_CONSENT_DECLINE = 'Not now';

// Section headings. The sheet and the Settings screen render the same constants
// in the same order, so the thing the user agreed to and the thing they can
// review later cannot drift apart.
export const AI_CONSENT_SENT_HEADING = 'What gets sent';
export const AI_CONSENT_NOT_SENT_HEADING = 'What does not';
export const AI_CONSENT_HANDLING_HEADING = 'How it is handled';

export const AI_DATA_SCREEN_TITLE = 'AI and Your Data';
export const AI_DATA_TOGGLE_LABEL = 'Let Contry read your contracts';
export const AI_DATA_TOGGLE_OFF_NOTE =
  'Contry cannot read a contract with this off. Adding contracts by hand still works, and everything you have already saved stays exactly where it is.';

// ---------------------------------------------------------------------------
// Terms acceptance. SEPARATE from the AI consent above, and the separation is
// the point.
//
// The passive "By continuing you agree to the Terms" line that used to sit on
// welcome and signin is exactly the pattern App Review rejected on 2026-08-23,
// and implied consent from continued use is a documented 5.1.2(i) rejection
// pattern. Making the terms acceptance explicit is an improvement to the TERMS
// acceptance and nothing more: it does not cover sending documents to
// Anthropic, and nothing here may be reworded to suggest it does. That
// permission has its own sheet, its own record, and its own server check.
//
// Two consents, two surfaces, on purpose. If a future change makes one of them
// stand in for the other, the app is back where build 6 was.

// Bump when the Terms or the Privacy Policy change materially. An older stored
// version reads as unaccepted and the box comes back.
export const TERMS_VERSION = 1;

export const TERMS_ACCEPT_LEAD = 'I have read and agree to the';
export const TERMS_LINK_TERMS = 'Terms of Service';
export const TERMS_LINK_PRIVACY = 'Privacy Policy';

// The reminder shown once acceptance is already on file. Same words the app has
// always used; it is a reminder now rather than the acceptance itself.
export const TERMS_NOTE_LEAD = 'By continuing you agree to the';

export const TERMS_REQUIRED_ERROR =
  'Please accept the Terms of Service and Privacy Policy to continue.';
