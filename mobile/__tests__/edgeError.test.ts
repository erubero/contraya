import { EdgeFunctionError, toEdgeError, statusOf } from '@/api/functionError';
import { analysisErrorCopy, chatErrorCopy } from '@/lib/edgeErrorCopy';
import { PRO_MONTHLY_ANALYSES, PRO_MONTHLY_CHATS } from '@/lib/limits';

// Audit finding 7. supabase-js throws FunctionsHttpError with a CONSTANT
// message and the real status hidden on .context, so `msg.includes('422')`
// was dead code from the day it was written. These tests exist because the
// paths they cover are otherwise unreachable without a live 429 from the
// server, which means nobody would ever see them fail.

// The exact shape functions-js throws: a FunctionsError with the untouched
// Response on .context, and a message that never mentions the status.
function httpError(status: number, body?: unknown) {
  const err = new Error('Edge Function returned a non-2xx status code');
  err.name = 'FunctionsHttpError';
  let read = false;
  (err as unknown as { context: unknown }).context = {
    status,
    json: async () => {
      // Responses can only be read once. If production ever reads the body
      // before us, this throws exactly the way a real one would.
      if (read) throw new TypeError('Body has already been consumed.');
      read = true;
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  };
  return err;
}

describe('toEdgeError', () => {
  it('recovers the status the generic message threw away', async () => {
    const converted = await toEdgeError(httpError(429, { error: 'Monthly analysis limit reached' }));
    expect(converted).toBeInstanceOf(EdgeFunctionError);
    expect((converted as EdgeFunctionError).status).toBe(429);
    expect((converted as EdgeFunctionError).serverMessage).toBe('Monthly analysis limit reached');
  });

  it('is what the old string check could never do', async () => {
    const raw = httpError(422, { error: "Couldn't read this document" });
    // The bug, pinned: the message alone can never identify the failure.
    expect(raw.message).not.toMatch(/422/);
    expect(statusOf(await toEdgeError(raw))).toBe(422);
  });

  it('survives a body that is missing or not JSON', async () => {
    const converted = (await toEdgeError(httpError(503))) as EdgeFunctionError;
    expect(converted.status).toBe(503);
    expect(converted.serverMessage).toBe('');
  });

  it('passes a network failure through untouched, because it has no status', async () => {
    const fetchError = new Error('Failed to send a request to the Edge Function');
    (fetchError as unknown as { context: unknown }).context = new TypeError('Network request failed');
    const converted = await toEdgeError(fetchError);
    expect(converted).toBe(fetchError);
    expect(statusOf(converted)).toBeNull();
  });

  it('never throws on junk', async () => {
    await expect(toEdgeError(undefined)).resolves.toBeInstanceOf(Error);
    await expect(toEdgeError('a string')).resolves.toBeInstanceOf(Error);
    await expect(toEdgeError({ context: { status: 'not a number' } })).resolves.toBeInstanceOf(Error);
  });

  it('statusOf ignores errors that are not ours', () => {
    expect(statusOf(new Error('boom'))).toBeNull();
    expect(statusOf(null)).toBeNull();
  });
});

describe('error copy', () => {
  it('tells a user at the ceiling the truth instead of "try again"', () => {
    const copy = analysisErrorCopy(429);
    expect(copy.retryable).toBe(false);
    expect(copy.body).toContain(String(PRO_MONTHLY_ANALYSES));
    expect(copy.body).not.toMatch(/try again/i);
  });

  it('does the same for questions', () => {
    const copy = chatErrorCopy(429);
    expect(copy.retryable).toBe(false);
    expect(copy.body).toContain(String(PRO_MONTHLY_CHATS));
    expect(copy.body).not.toMatch(/try again/i);
  });

  it('never suggests retrying a failure that retrying cannot fix', () => {
    // The whole point of the finding: these three are permanent for this
    // input, so offering a retry is offering a guaranteed second failure.
    for (const status of [429, 413, 422]) {
      expect(analysisErrorCopy(status).retryable).toBe(false);
    }
    for (const status of [429, 422]) {
      expect(chatErrorCopy(status).retryable).toBe(false);
    }
  });

  it('does offer a retry when retrying is the right advice', () => {
    expect(analysisErrorCopy(503).retryable).toBe(true);
    expect(analysisErrorCopy(null).retryable).toBe(true);
    expect(chatErrorCopy(503).retryable).toBe(true);
    expect(chatErrorCopy(null).retryable).toBe(true);
  });

  it('falls back to the old wording for anything unmapped', () => {
    // A 502 or an unforeseen code must still say something sane rather than
    // rendering "undefined".
    for (const status of [500, 502, 418, null]) {
      for (const copy of [analysisErrorCopy(status), chatErrorCopy(status)]) {
        expect(copy.title.length).toBeGreaterThan(0);
        expect(copy.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('quota copy tracks limits.ts rather than hardcoding the numbers', () => {
    // Raising a quota must not silently leave the alert lying about it.
    expect(analysisErrorCopy(429).body).toContain(`${PRO_MONTHLY_ANALYSES} analyses`);
    expect(chatErrorCopy(429).body).toContain(`${PRO_MONTHLY_CHATS} questions`);
  });
});
