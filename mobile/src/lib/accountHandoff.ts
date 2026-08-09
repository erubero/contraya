import type { QueryClient } from '@tanstack/react-query';
import { clearDeviceSchedules } from './deviceSync';
import { clearAllDrafts } from './draftStore';

// Everything this device is holding on behalf of the account that is leaving.
//
// Sign-out and account deletion already ran this sequence, in this order, as
// two hand-copied blocks. Audit finding 22 found a third doorway that was
// missing it entirely: a password-recovery link swaps the session in place, so
// a link for account B opened while account A is signed in leaves A's data on
// screen under B's session. Extracted here so a fourth doorway cannot be
// written without it, and so the order cannot drift.
//
// The order is the load-bearing part:
//
//  1. Device state first. Reminders carry contract titles in the notification
//     body and calendar events carry them onto every device the user syncs, so
//     they have to go before anyone else can hold this phone. Both swallow
//     their own errors, because a failed unschedule must never block a
//     sign-out.
//  2. `handOff` in the middle, for whatever actually ends or replaces the
//     session.
//  3. `queryClient.clear()` LAST, never earlier. Clearing while the old
//     session is still valid just invites every mounted useQuery to refetch
//     and repopulate the cache with the departing account's data.
export async function releaseAccountState(
  queryClient: QueryClient,
  handOff?: () => Promise<void>
): Promise<void> {
  await clearDeviceSchedules().catch(() => {});
  await clearAllDrafts();
  if (handOff) await handOff();
  queryClient.clear();
}
