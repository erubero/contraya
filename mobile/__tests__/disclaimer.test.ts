import * as fs from 'fs';
import * as path from 'path';
import {
  DISCLAIMER,
  DISCLAIMER_CHAT,
  DISCLAIMER_MORE,
  NO_ATTORNEY_RELATIONSHIP,
  ABOUT_SUMMARIES_PARAGRAPHS,
} from '@/lib/legal';

// legal.ts says three claims travel together and none is optional. Audit
// finding 12 caught the app shipping only two on the analysis surfaces for ten
// days, because claim 3 lived in a constant nothing rendered. The resolution
// is claims 1 and 2 inline plus claim 3 one tap away, and this file is what
// keeps it true: these are source-level assertions because the failure mode is
// somebody writing <Text>{DISCLAIMER}</Text> at a fourth call site, which no
// behavioural test would ever see.

const app = (...p: string[]) => path.join(__dirname, '..', 'app', ...p);
const src = (...p: string[]) => path.join(__dirname, '..', 'src', ...p);
const read = (f: string) => fs.readFileSync(f, 'utf8');

// Every surface that shows model output about the user's own contract.
const ANALYSIS_SURFACES = [
  ['review screen', app('(app)', 'add.tsx')],
  ['contract detail', app('(app)', 'contract', '[id].tsx')],
  ['Ask Contry', app('(app)', 'chat', '[id].tsx')],
] as const;

// Surfaces with room to explain at length. These keep all three claims inline.
const LONG_FORM_SURFACES = [
  ['onboarding', app('onboarding.tsx')],
  ['support', app('(app)', 'support.tsx')],
] as const;

describe('the disclaimer trio', () => {
  it.each(ANALYSIS_SURFACES)('%s renders the note through the component', (_name, file) => {
    expect(read(file)).toMatch(/import DisclaimerNote from '@\/components\/DisclaimerNote'/);
  });

  it.each(ANALYSIS_SURFACES)('%s never renders a bare disclaimer string', (_name, file) => {
    const source = read(file);
    // A bare {DISCLAIMER} render is the exact regression this guards: it drops
    // the link, and with it claim 3.
    expect(source).not.toMatch(/\{DISCLAIMER(_CHAT)?\}/);
    expect(source).not.toMatch(/from '@\/lib\/legal'/);
  });

  it.each(LONG_FORM_SURFACES)('%s still carries all three claims inline', (_name, file) => {
    const source = read(file);
    expect(source).toMatch(/NO_ATTORNEY_RELATIONSHIP/);
    expect(source).toMatch(/DISCLAIMER/);
  });

  it('the component points at the screen that carries claim 3', () => {
    const source = read(src('components', 'DisclaimerNote.tsx'));
    expect(source).toMatch(/router\.push\('\/about-summaries'\)/);
    expect(source).toMatch(/DISCLAIMER_MORE/);
  });

  it('About These Summaries actually states claim 3', () => {
    const screen = read(app('(app)', 'about-summaries.tsx'));
    expect(screen).toMatch(/ABOUT_SUMMARIES_PARAGRAPHS/);
    // Not a substring check on the constant: the paragraph is worded for prose
    // and must carry the claim on its own terms.
    const joined = ABOUT_SUMMARIES_PARAGRAPHS.join(' ');
    expect(joined).toMatch(/attorney-client relationship/);
    expect(joined).toMatch(/attorney-client privilege/);
  });

  it('claims 1 and 2 are in both inline variants', () => {
    for (const line of [DISCLAIMER, DISCLAIMER_CHAT]) {
      expect(line).toMatch(/AI/); // claim 1, disclosed rather than hidden
      expect(line).toMatch(/not legal advice/); // claim 2
    }
  });

  it('the link text says what is behind it', () => {
    // "Learn more" would make the tap a mystery. The whole point is that a
    // reader chooses to see the limits.
    expect(DISCLAIMER_MORE).not.toMatch(/learn more|read more|tap here/i);
    expect(DISCLAIMER_MORE.length).toBeLessThan(40);
  });

  it('claim 3 is still one sentence, so the long-form surfaces can inline it', () => {
    expect(NO_ATTORNEY_RELATIONSHIP).toMatch(/^Using Contraya/);
    expect(NO_ATTORNEY_RELATIONSHIP.split('. ').length).toBe(1);
  });
});
