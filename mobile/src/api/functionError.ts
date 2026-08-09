// Why this file exists (audit finding 7).
//
// supabase-js throws FunctionsHttpError for every non-2xx from an edge
// function, and its `.message` is the constant string "Edge Function returned
// a non-2xx status code" — the status is nowhere in it. The screens were
// testing `msg.includes('422')` against that constant, so no branch ever
// matched and a paying user who hit the monthly ceiling was told "please try
// again", which is advice that cannot work. The real status lives on
// `.context`, which is the untouched Response: functions-js throws it before
// reading the body, so the body is still there for us.
//
// Duck-typed rather than `instanceof FunctionsHttpError` on purpose. The class
// lives in @supabase/functions-js and reaches us re-exported through
// supabase-js, so an instanceof check is one dependency hoist away from
// silently going false and putting us right back where we started.

export class EdgeFunctionError extends Error {
  readonly status: number;
  /** The `error` field the function itself returned, when it sent one. */
  readonly serverMessage: string;

  constructor(status: number, serverMessage: string) {
    super(serverMessage || `Edge function returned ${status}`);
    this.name = 'EdgeFunctionError';
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

type WithContext = { context?: unknown };

function asResponseLike(value: unknown): { status: number; json?: () => Promise<unknown> } | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { status?: unknown; json?: unknown };
  if (typeof candidate.status !== 'number') return null;
  return {
    status: candidate.status,
    json: typeof candidate.json === 'function' ? (candidate.json as () => Promise<unknown>) : undefined,
  };
}

/**
 * Turn whatever `supabase.functions.invoke` handed back into something a screen
 * can branch on. Anything that is not an HTTP error (a network drop, a relay
 * failure) passes through unchanged, because those genuinely have no status and
 * "please try again" is the correct thing to say about them.
 */
export async function toEdgeError(error: unknown): Promise<Error> {
  const fallback = error instanceof Error ? error : new Error(String(error));
  const response = asResponseLike((error as WithContext | null | undefined)?.context);
  if (!response) return fallback;

  let serverMessage = '';
  try {
    const body = await response.json?.();
    const field = (body as { error?: unknown } | null)?.error;
    if (typeof field === 'string') serverMessage = field;
  } catch {
    // Body already consumed, empty, or not JSON. The status is the part that
    // matters; the copy layer never depends on this string.
  }
  return new EdgeFunctionError(response.status, serverMessage);
}

/** Narrow an unknown caught value to the status the screens switch on. */
export function statusOf(error: unknown): number | null {
  return error instanceof EdgeFunctionError ? error.status : null;
}
