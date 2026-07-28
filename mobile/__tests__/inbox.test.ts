import { ingestAddress, isIngestToken, inboxItemTitle, INGEST_DOMAIN } from '@/data/inbox';

const TOKEN = 'deadbeefdeadbeefdeadbeefdeadbeef';

describe('ingest tokens and addresses', () => {
  it('accepts a 32-char lowercase hex token', () => {
    expect(isIngestToken(TOKEN)).toBe(true);
  });

  it('rejects wrong length, case, and charset', () => {
    expect(isIngestToken('')).toBe(false);
    expect(isIngestToken('deadbeef')).toBe(false);
    expect(isIngestToken(TOKEN.toUpperCase())).toBe(false);
    expect(isIngestToken('zzzzbeefdeadbeefdeadbeefdeadbeef')).toBe(false);
    expect(isIngestToken(`${TOKEN}00`)).toBe(false);
  });

  it('forms the c-<token>@domain address', () => {
    expect(ingestAddress(TOKEN)).toBe(`c-${TOKEN}@${INGEST_DOMAIN}`);
  });

  it('the formed address matches what the email worker accepts', () => {
    // Mirror of the worker's recipient regex; if this drifts, mail bounces.
    const workerRe = /^c-([a-f0-9]{32})@/;
    const m = workerRe.exec(ingestAddress(TOKEN));
    expect(m?.[1]).toBe(TOKEN);
  });
});

describe('inboxItemTitle', () => {
  it('prefers the filename, then the subject, then a fallback', () => {
    expect(inboxItemTitle({ original_filename: 'lease.pdf', subject: 'Your lease' })).toBe('lease.pdf');
    expect(inboxItemTitle({ original_filename: null, subject: 'Your lease' })).toBe('Your lease');
    expect(inboxItemTitle({ original_filename: '  ', subject: null })).toBe('Contract.pdf');
  });
});
