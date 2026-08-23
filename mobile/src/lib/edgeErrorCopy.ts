// What the user is told when an edge function refuses. Pure and tested, for
// the same reason quotaGate.ts is: these branches are unreachable in normal
// use, so a test is the only thing that ever executes most of them.
//
// The rule the copy follows: never tell someone to retry something that
// retrying cannot fix. That was the actual harm in audit finding 7 — the
// status never reached this decision, so every failure collapsed into "please
// try again", including the two (429, 413) where trying again is guaranteed to
// fail the same way.
import { PRO_MONTHLY_ANALYSES, PRO_MONTHLY_CHATS } from './limits';
import { AI_DATA_SCREEN_TITLE } from './legal';

export type ErrorCopy = { title: string; body: string; retryable: boolean };

/**
 * Copy for a failed analysis. `status` is null when the failure had no HTTP
 * status at all, which in practice means the request never landed.
 */
export function analysisErrorCopy(status: number | null): ErrorCopy {
  switch (status) {
    case 429:
      return {
        title: 'Monthly limit reached',
        body: `Your plan covers ${PRO_MONTHLY_ANALYSES} analyses a month. The counter resets on the 1st.`,
        retryable: false,
      };
    case 403:
      return {
        title: 'Contry needs your permission first',
        body: `Turn on ${AI_DATA_SCREEN_TITLE} in Settings to let Contry send this document to be read.`,
        retryable: false,
      };
    case 413:
      return {
        title: 'That document is too big',
        body: 'Contry can read PDFs up to 10 MB. Try a smaller file, or photograph the pages instead.',
        retryable: false,
      };
    case 422:
      return {
        title: "Contry couldn't read this document",
        body: "It doesn't look like a contract. You can still add the details yourself.",
        retryable: false,
      };
    case 503:
      return {
        title: 'Contry is busy',
        body: 'Give it a moment and try again.',
        retryable: true,
      };
    case 401:
      return {
        title: 'Please sign in again',
        body: 'Your session expired while Contry was reading.',
        retryable: false,
      };
    default:
      return {
        title: "Contry couldn't read this document",
        body: 'Please try again, or add the details yourself.',
        retryable: true,
      };
  }
}

/** Copy for a failed Ask Contry question. */
export function chatErrorCopy(status: number | null): ErrorCopy {
  switch (status) {
    case 429:
      return {
        title: 'Monthly limit reached',
        body: `Your plan covers ${PRO_MONTHLY_CHATS} questions a month. The counter resets on the 1st.`,
        retryable: false,
      };
    case 403:
      return {
        title: 'Contry needs your permission first',
        body: `Turn on ${AI_DATA_SCREEN_TITLE} in Settings to let Contry send this document to be read.`,
        retryable: false,
      };
    case 422:
      return {
        title: "Contry can't answer that one",
        body: 'Try asking about something the contract actually covers.',
        retryable: false,
      };
    case 503:
      return {
        title: 'Contry is busy',
        body: 'Give it a moment and ask again.',
        retryable: true,
      };
    case 401:
      return {
        title: 'Please sign in again',
        body: 'Your session expired mid-question.',
        retryable: false,
      };
    default:
      return {
        title: "Contry couldn't answer",
        body: 'Please try again.',
        retryable: true,
      };
  }
}
