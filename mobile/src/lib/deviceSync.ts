import { listAllDates } from '@/data/repo';
import { clearAll as clearScheduledReminders, rebuildAll } from './notifications';
import { SyncResult, removeAllCalendars, syncAll } from './deviceCalendar';

// One place that reconciles everything this device holds on behalf of the
// user's contract dates: scheduled reminders, and the Apple Calendar mirror.
//
// It exists because four call sites already repeated the same
// listAllDates().then(rebuildAll) idiom, and a second consumer would have
// turned that into four sites times two fan-outs. The fifth call site somebody
// adds later would update one and forget the other, and the symptom of that is
// a device calendar that is quietly, invisibly wrong.
//
// It lives here rather than inside notifications.ts, which must not learn about
// EventKit, and not in data/repo.ts, which is the demo/live switch and has no
// business knowing about device side effects.

export type ProSnapshot = { isPro: boolean; offeringReady: boolean; ready: boolean };

export async function refreshDeviceSchedules(
  userId: string | null,
  pro: ProSnapshot,
  opts: { force?: boolean } = {}
): Promise<SyncResult> {
  const all = await listAllDates().catch(() => null);
  if (!all) return 'failed';
  const items = all.map((d) => ({ date: d, contractTitle: d.contracts.title }));

  // Reminders first, and caught on their own. Reminders are what the product
  // promises; the calendar is the convenience. If EventKit hangs or throws,
  // the reminders are already scheduled.
  await rebuildAll(items).catch(() => {});
  return syncAll(userId, items, { ...pro, force: opts.force }).catch(() => 'failed' as SyncResult);
}

/**
 * Sign-out and account deletion. Neither takes a userId, deliberately: see the
 * note on removeAllCalendars.
 */
export async function clearDeviceSchedules(): Promise<void> {
  await clearScheduledReminders().catch(() => {});
  await removeAllCalendars().catch(() => {});
}
