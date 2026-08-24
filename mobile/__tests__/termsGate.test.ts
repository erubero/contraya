jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

import * as fs from 'fs';
import * as path from 'path';
import { hasAcceptedTerms } from '@/lib/terms';
import {
  TERMS_VERSION,
  TERMS_ACCEPT_LEAD,
  TERMS_NOTE_LEAD,
  TERMS_LINK_TERMS,
  TERMS_LINK_PRIVACY,
  TERMS_REQUIRED_ERROR,
  AI_PROVIDER,
} from '@/lib/legal';

const app = (...p: string[]) => path.join(__dirname, '..', 'app', ...p);
const read = (f: string) => fs.readFileSync(f, 'utf8');

describe('hasAcceptedTerms', () => {
  const stamp = '2026-08-23T10:00:00.000Z';

  it('refuses an account that has never accepted', () => {
    expect(hasAcceptedTerms({})).toBe(false);
    expect(hasAcceptedTerms(null)).toBe(false);
    expect(hasAcceptedTerms(undefined)).toBe(false);
  });

  it('accepts a stamp recorded at the current version', () => {
    expect(hasAcceptedTerms({ terms_accepted_at: stamp, terms_version: TERMS_VERSION })).toBe(true);
  });

  it('asks again when the terms have moved on since the acceptance', () => {
    expect(hasAcceptedTerms({ terms_accepted_at: stamp, terms_version: TERMS_VERSION - 1 })).toBe(false);
  });

  it('honours an acceptance given to a later version', () => {
    expect(hasAcceptedTerms({ terms_accepted_at: stamp, terms_version: TERMS_VERSION + 1 })).toBe(true);
  });

  it('needs both halves, not either', () => {
    expect(hasAcceptedTerms({ terms_accepted_at: stamp })).toBe(false);
    expect(hasAcceptedTerms({ terms_version: TERMS_VERSION })).toBe(false);
  });

  it('refuses an empty or blank stamp', () => {
    expect(hasAcceptedTerms({ terms_accepted_at: '', terms_version: TERMS_VERSION })).toBe(false);
    expect(hasAcceptedTerms({ terms_accepted_at: '  ', terms_version: TERMS_VERSION })).toBe(false);
  });

  it('refuses junk types rather than coercing them', () => {
    expect(hasAcceptedTerms({ terms_accepted_at: 1, terms_version: 1 })).toBe(false);
    expect(hasAcceptedTerms({ terms_accepted_at: stamp, terms_version: '1' })).toBe(false);
  });
});

// The boundary that the whole 5.1.2(i) fix rests on. Accepting the Terms is NOT
// permission to send a document to the AI provider: that has its own sheet, its
// own record, and its own server check. If somebody ever rewords the terms copy
// to cover the data sharing, the app is back where build 6 was, and the reword
// would look entirely reasonable in a diff. So it fails here instead.
describe('the terms acceptance never stands in for the AI consent', () => {
  const TERMS_COPY = [
    TERMS_ACCEPT_LEAD,
    TERMS_NOTE_LEAD,
    TERMS_LINK_TERMS,
    TERMS_LINK_PRIVACY,
    TERMS_REQUIRED_ERROR,
  ];

  it.each(TERMS_COPY)('%s says nothing about AI or the provider', (copy) => {
    expect(copy).not.toMatch(new RegExp(AI_PROVIDER, 'i'));
    expect(copy).not.toMatch(/\bAI\b/);
  });
});

describe('both first-open screens gate on an explicit tick', () => {
  const SCREENS = [
    ['welcome', app('welcome.tsx')],
    ['signin', app('signin.tsx')],
  ] as const;

  it.each(SCREENS)('%s renders the agreement through the component', (_name, file) => {
    const source = read(file);
    expect(source).toMatch(
      /import TermsAgreement, { useTermsAcceptance } from '@\/components\/TermsAgreement'/
    );
    expect(source).toMatch(/<TermsAgreement state={terms} \/>/);
  });

  it.each(SCREENS)('%s blocks its entry points until the box is ticked', (_name, file) => {
    expect(read(file)).toMatch(/await passTerms\(\)/);
  });

  // The old line is what App Review saw and rejected. Hand-writing it back at a
  // call site would silently restore implied consent on that screen.
  it.each(SCREENS)('%s no longer hand-writes the passive line', (_name, file) => {
    expect(read(file)).not.toMatch(/By continuing you agree to the\{' '\}/);
  });
});
