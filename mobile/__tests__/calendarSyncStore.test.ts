const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => (mockStore.has(k) ? mockStore.get(k)! : null)),
  setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  removeItem: jest.fn(async (k: string) => { mockStore.delete(k); }),
  getAllKeys: jest.fn(async () => [...mockStore.keys()]),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((k) => [k, mockStore.has(k) ? mockStore.get(k)! : null])),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
}));

import {
  CALENDAR_SYNC_PREFIX, DISABLED, allSyncedCalendarIds, calendarSyncKey,
  clearAllCalendarSync, readCalendarSync, writeCalendarSync,
} from '@/lib/calendarSyncStore';

const A = 'user-a';
const B = 'user-b';

beforeEach(() => mockStore.clear());

describe('readCalendarSync', () => {
  it('an account that never opted in reads as disabled', () => {
    // The load-bearing test for this whole feature. remindersEnabled() in
    // notifications.ts reads `v !== 'false'` and so defaults ON, and this file
    // is otherwise modelled on it. Inheriting that default would silently
    // write contract titles into the calendar of every user who merely
    // installed an update.
    return expect(readCalendarSync(A)).resolves.toEqual(DISABLED);
  });

  it('a null user reads as disabled', async () => {
    await expect(readCalendarSync(null)).resolves.toEqual(DISABLED);
  });

  it('round-trips state through storage', async () => {
    await writeCalendarSync(A, { enabled: true, discreetTitles: true, calendarId: 'cal-1' });
    await writeCalendarSync(A, { fingerprint: '1:2:abcd1234' });
    await expect(readCalendarSync(A)).resolves.toEqual({
      enabled: true, discreetTitles: true, calendarId: 'cal-1', fingerprint: '1:2:abcd1234',
    });
  });

  it('a corrupt blob reads as disabled and clears itself instead of throwing', async () => {
    mockStore.set(calendarSyncKey(A), '{ not json');
    await expect(readCalendarSync(A)).resolves.toEqual(DISABLED);
    expect(mockStore.has(calendarSyncKey(A))).toBe(false);
  });

  it('a blob missing fields reads as disabled rather than half enabled', async () => {
    mockStore.set(calendarSyncKey(A), JSON.stringify({ calendarId: 'cal-1' }));
    await expect(readCalendarSync(A)).resolves.toEqual({ ...DISABLED, calendarId: 'cal-1' });
  });
});

describe('writeCalendarSync', () => {
  it('never hands one account another account\'s state', async () => {
    // An unnamespaced flag means account B's first sweep on a shared phone
    // deletes account A's events and writes B's contract titles in their
    // place. contraya.personalizedInsightDismissed is already logged as this
    // exact bug class.
    await writeCalendarSync(A, { enabled: true, calendarId: 'cal-a' });
    await expect(readCalendarSync(B)).resolves.toEqual(DISABLED);
    await writeCalendarSync(B, { enabled: true, calendarId: 'cal-b' });
    await expect(readCalendarSync(A)).resolves.toMatchObject({ calendarId: 'cal-a' });
  });

  it('a null user writes nothing', async () => {
    await writeCalendarSync(null, { enabled: true });
    expect(mockStore.size).toBe(0);
  });

  it('clearing the fingerprint is what makes a match mean "already written"', async () => {
    // If a fingerprint could survive a change of calendar or of title mode,
    // the sync's fast path would skip work that genuinely needed doing.
    for (const patch of [{ enabled: false }, { discreetTitles: true }, { calendarId: 'cal-2' }]) {
      mockStore.clear();
      await writeCalendarSync(A, { enabled: true, calendarId: 'cal-1' });
      await writeCalendarSync(A, { fingerprint: '1:2:abcd1234' });
      await writeCalendarSync(A, patch);
      await expect(readCalendarSync(A)).resolves.toMatchObject({ fingerprint: null });
    }
  });

  it('writing only a fingerprint keeps it', async () => {
    await writeCalendarSync(A, { enabled: true, calendarId: 'cal-1' });
    await writeCalendarSync(A, { fingerprint: '1:2:abcd1234' });
    await expect(readCalendarSync(A)).resolves.toMatchObject({ fingerprint: '1:2:abcd1234' });
  });
});

describe('allSyncedCalendarIds', () => {
  it('finds every account\'s calendar, which is what sign-out needs', async () => {
    await writeCalendarSync(A, { enabled: true, calendarId: 'cal-a' });
    await writeCalendarSync(B, { enabled: true, calendarId: 'cal-b' });
    await expect(allSyncedCalendarIds()).resolves.toEqual(
      expect.arrayContaining(['cal-a', 'cal-b'])
    );
  });

  it('skips accounts that never created one', async () => {
    await writeCalendarSync(A, { enabled: true });
    await expect(allSyncedCalendarIds()).resolves.toEqual([]);
  });
});

describe('clearAllCalendarSync', () => {
  it('removes every account and nothing else', async () => {
    await writeCalendarSync(A, { enabled: true, calendarId: 'cal-a' });
    await writeCalendarSync(B, { enabled: true, calendarId: 'cal-b' });
    mockStore.set('contraya.remindersEnabled', 'true');
    mockStore.set('contraya.themePref', 'dark');

    await clearAllCalendarSync();

    expect([...mockStore.keys()].some((k) => k.startsWith(CALENDAR_SYNC_PREFIX))).toBe(false);
    expect(mockStore.get('contraya.remindersEnabled')).toBe('true');
    expect(mockStore.get('contraya.themePref')).toBe('dark');
  });
});
