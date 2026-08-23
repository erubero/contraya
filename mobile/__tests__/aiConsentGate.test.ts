import * as fs from 'fs';
import * as path from 'path';

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
      expect(source).toMatch(/import { useAiConsent } from '@\/lib\/AiConsentContext'/);
      expect(source).toMatch(/ensureAiConsent\(\)/);
    }
  );

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
    expect(source.indexOf('status: 403')).toBeLessThan(
      source.indexOf("fetch('https://api.anthropic.com")
    );
  });
});
