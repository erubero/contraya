import * as fs from 'fs';
import * as path from 'path';
import {
  AI_PROVIDER,
  AI_PROVIDER_PUBLIC,
  AI_CONSENT_WHO,
  AI_CONSENT_SENT,
  AI_CONSENT_NOT_SENT,
  AI_CONSENT_HANDLING,
} from '@/lib/legal';

// Source-level assertions, in the idiom of disclaimer.test.ts, and for the
// same reason: the failure mode is not a wrong branch, it is a NEW call site
// that nobody wired up. No behavioural test can see a screen that does not
// exist yet, but a scan of the tree can.
//
// What App Store guideline 5.1.2(i) requires, and what 1.0 (6) was rejected for
// missing: nothing may be sent to the AI provider without the user's explicit
// permission. So the invariant is mechanical. Every file that calls
// analyzeContract or askContract must first go through ensureAiConsent, and
// both edge functions must refuse without a consent record of their own.
//
// If you are here because this test failed on a screen you just added: add the
// gate, do not add an exception.

const mobile = (...p: string[]) => path.join(__dirname, '..', ...p);
const read = (f: string) => fs.readFileSync(f, 'utf8');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [full] : [];
  });
}

const SENDS_TO_MODEL = /\b(analyzeContract|askContract)\s*\(/;

describe('every path to the AI provider passes the consent gate', () => {
  const senders = walk(mobile('app')).filter((f) => SENDS_TO_MODEL.test(read(f)));

  it('finds the screens that send documents, so an empty scan cannot pass silently', () => {
    expect(senders.length).toBeGreaterThanOrEqual(2);
  });

  it.each(senders.map((f) => [path.relative(mobile(), f), f]))(
    '%s asks before it sends',
    (_name, file) => {
      const source = read(file);
      expect(source).toMatch(/import {[^}]*\buseAiConsent\b[^}]*} from '@\/lib\/AiConsentContext'/);
      expect(source).toMatch(/ensureAiConsent\(\)/);
    }
  );

  // 1.0 (7) was rejected under 2.1(a) because the sheet was mounted beside the
  // navigator instead of inside the screen that asks. React Native presents a
  // <Modal> from the controller that owns where it is MOUNTED, so on the `add`
  // route -- itself a `presentation: 'modal'` screen -- UIKit was asked to
  // present a second controller on one that was already presenting, refused,
  // and the tap vanished. A screen that asks for consent without hosting the
  // sheet is that bug, so it is a build failure and not a code review note.
  it.each(senders.map((f) => [path.relative(mobile(), f), f]))(
    '%s hosts the sheet it asks with',
    (_name, file) => {
      const source = read(file);
      expect(source).toMatch(/import {[^}]*\bAiConsentHost\b[^}]*} from '@\/lib\/AiConsentContext'/);
      expect(source).toMatch(/<AiConsentHost\s*\/>/);
    }
  );

  // The counterpart to the rule above: the provider must NOT render the sheet
  // itself, which is where it was when Apple found it.
  it('leaves the sheet to the screens and does not render one itself', () => {
    const provider = read(mobile('src', 'lib', 'AiConsentContext.tsx'));
    const host = provider.slice(provider.indexOf('export function AiConsentHost'));
    const outsideHost = provider.slice(0, provider.indexOf('export function AiConsentHost'));
    expect(host).toMatch(/<AiConsentSheet/);
    expect(outsideHost).not.toMatch(/<AiConsentSheet/);
  });

  it('mounts one consent provider over the whole signed-in app', () => {
    const layout = read(mobile('app', '(app)', '_layout.tsx'));
    expect(layout).toMatch(/import { AiConsentProvider } from '@\/lib\/AiConsentContext'/);
    expect(layout).toMatch(/<AiConsentProvider>/);
  });

  it('gives the consent a place to be taken back, which the privacy policy names', () => {
    const settings = read(mobile('app', '(app)', '(tabs)', 'settings.tsx'));
    expect(settings).toMatch(/ai-data/);
    expect(fs.existsSync(mobile('app', '(app)', 'ai-data.tsx'))).toBe(true);
  });
});

// HISTORY, because the direction of this block reversed and the reason matters.
//
// The name was demoted out of the sheet title on 2026-08-24 (co-branding), and
// this block was installed then to assert the floor: the BODY still had to name
// who receives the document. On 2026-08-30 the owner decided to take the name
// out of user-facing copy entirely, in the app and on the privacy policy and
// terms pages. That was decided twice, in writing, with the 1.0 (6) rejection
// on the table, and it is the owner's call.
//
// So the assertion is inverted rather than deleted. Deleting it would leave no
// mechanical record that the absence is deliberate, and the next session to
// read CLAUDE.md would helpfully "restore" the name. What is guarded now:
// the neutral label is present, the vendor name is not, the concrete claims
// that carry the disclosure without a name survive, and neither phrase Apple
// already rejected can creep back in.
//
// KNOW THE COST: an unnamed third-party AI recipient is the shape of disclosure
// 5.1.2(i) was written against, and STATUS.md calls the 1.0 (6) euphemism "the
// single biggest self-inflicted wound". If review rejects this again, the fix
// is one line in legal.ts: AI_PROVIDER_PUBLIC = AI_PROVIDER.
describe('the disclosure carries the neutral label and not the provider name', () => {
  const body = [
    AI_CONSENT_WHO,
    ...AI_CONSENT_SENT,
    ...AI_CONSENT_NOT_SENT,
    AI_CONSENT_HANDLING,
  ].join(' ');

  it('does not name the provider in the consent body', () => {
    expect(body).not.toContain(AI_PROVIDER);
  });

  it('puts the neutral label there instead, so nothing just went missing', () => {
    expect(body).toContain(AI_PROVIDER_PUBLIC);
  });

  // Without a name, these ARE the disclosure. Each one is the difference
  // between this copy and "powered by AI", which is the phrasing the guideline
  // was written against. Trimming any of them for brevity is a regression.
  it.each([
    ['the reading happens off the device', /not on your phone/],
    ['the document is transmitted', /sent to that company/],
    ['the connection is encrypted', /encrypted connection/],
    ['it is not used for training', /not allowed to use it for training/],
    ['it is deleted afterwards', /deletes it after a limited retention period/],
  ])('still states that %s', (_label, pattern) => {
    expect(body).toMatch(pattern);
  });

  // Both phrasings App Review rejected in 1.0 (6) were "third-party" plus a
  // role noun. The neutral label is one careless edit away from becoming one of
  // them again, so the words themselves are barred.
  it.each([
    ['third-party document-processing service provider'],
    ['third-party AI provider'],
  ])('never reintroduces the rejected phrase "%s"', (phrase) => {
    expect(body.toLowerCase()).not.toContain(phrase.toLowerCase());
  });

  // legal.ts still holds the real name for the tests above. Every screen that
  // renders copy must go through the label instead, and about.tsx hand-writes
  // its sentence, so the files are checked directly rather than the constants.
  it.each([
    ['components/AiDisclosure.tsx', path.join(__dirname, '..', 'src', 'components', 'AiDisclosure.tsx')],
    ['components/AiConsentSheet.tsx', path.join(__dirname, '..', 'src', 'components', 'AiConsentSheet.tsx')],
    ['app/(app)/ai-data.tsx', mobile('app', '(app)', 'ai-data.tsx')],
    ['app/(app)/about.tsx', mobile('app', '(app)', 'about.tsx')],
    ['app/(app)/about-summaries.tsx', mobile('app', '(app)', 'about-summaries.tsx')],
  ])('%s neither names the provider nor reaches for AI_PROVIDER', (_name, file) => {
    const source = read(file);
    expect(source).not.toMatch(/Anthropic/);
    // \b stops this matching AI_PROVIDER_PUBLIC or AI_PROVIDER_PRIVACY_URL,
    // since an underscore is a word character.
    expect(source).not.toMatch(/\bAI_PROVIDER\b/);
  });

  it('renders that body on both the consent sheet and the Settings screen', () => {
    for (const file of [
      path.join(__dirname, '..', 'src', 'components', 'AiConsentSheet.tsx'),
      mobile('app', '(app)', 'ai-data.tsx'),
    ]) {
      expect(read(file)).toMatch(/import AiDisclosure from '@\/components\/AiDisclosure'/);
    }
  });
});

describe('the server refuses without a consent record too', () => {
  const fn = (name: string) =>
    path.join(__dirname, '..', '..', 'supabase', 'functions', name, 'index.ts');

  it.each([['analyze-contract'], ['chat-contract']])('%s returns 403 without consent', (name) => {
    const source = read(fn(name));
    expect(source).toMatch(/ai_consent_at/);
    expect(source).toMatch(/status: 403/);
    // The check has to sit ahead of the model call, and ahead of the quota
    // consume, so a refusal never costs a slot that then has to be refunded.
    // Matched on the fetch itself, not on the hostname, which also appears in
    // the comments explaining why this check is here.
    //
    // The provider name below is the BACKEND and is intentional. The 2026-08-30
    // decision removed the name from user-facing COPY only; the edge functions
    // still call the real host. Do not "finish the job" here.
    expect(source.indexOf('status: 403')).toBeLessThan(
      source.indexOf("fetch('https://api.anthropic.com")
    );
  });
});
