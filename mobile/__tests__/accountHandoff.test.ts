import * as fs from 'fs';
import * as path from 'path';

const calls: string[] = [];

jest.mock('@/lib/deviceSync', () => ({
  clearDeviceSchedules: jest.fn(async () => {
    calls.push('schedules');
  }),
}));
jest.mock('@/lib/draftStore', () => ({
  clearAllDrafts: jest.fn(async () => {
    calls.push('drafts');
  }),
}));

import { releaseAccountState } from '@/lib/accountHandoff';
import { clearDeviceSchedules } from '@/lib/deviceSync';

// Audit finding 22. Three doorways hand this device from one account to the
// next: sign-out, account deletion, and a password-recovery link that swaps
// the session in place. The third had none of the teardown, so account A's
// contracts rendered under account B's session. What is pinned here is the
// ORDER, because every part of this is only correct in one sequence.

function fakeQueryClient() {
  return {
    clear: jest.fn(() => {
      calls.push('clear');
    }),
  };
}

beforeEach(() => {
  calls.length = 0;
  jest.clearAllMocks();
});

describe('releaseAccountState', () => {
  it('clears device state before the cache', async () => {
    const qc = fakeQueryClient();
    await releaseAccountState(qc as never);
    expect(calls).toEqual(['schedules', 'drafts', 'clear']);
  });

  it('clears the cache AFTER the session ends, never before', async () => {
    // The reason this matters: clearing while the departing session is still
    // valid lets every mounted useQuery refetch and repopulate the cache with
    // the data we just tried to drop.
    const qc = fakeQueryClient();
    await releaseAccountState(qc as never, async () => {
      calls.push('signOut');
    });
    expect(calls).toEqual(['schedules', 'drafts', 'signOut', 'clear']);
    expect(calls.indexOf('clear')).toBeGreaterThan(calls.indexOf('signOut'));
  });

  it('drops the drafts before the session ends', async () => {
    // clearAllDrafts takes no userId because signOut() nulls it; running it
    // after the hand-off would make it a silent no-op.
    const qc = fakeQueryClient();
    await releaseAccountState(qc as never, async () => {
      calls.push('signOut');
    });
    expect(calls.indexOf('drafts')).toBeLessThan(calls.indexOf('signOut'));
  });

  it('a failed unschedule never blocks the hand-off', async () => {
    (clearDeviceSchedules as jest.Mock).mockRejectedValueOnce(new Error('no permission'));
    const qc = fakeQueryClient();
    await expect(releaseAccountState(qc as never)).resolves.toBeUndefined();
    expect(qc.clear).toHaveBeenCalled();
  });
});

describe('every doorway uses it', () => {
  const doorways = [
    ['sign-out', path.join(__dirname, '..', 'app', '(app)', '(tabs)', 'settings.tsx')],
    ['account deletion', path.join(__dirname, '..', 'app', '(app)', 'delete-account.tsx')],
    ['password recovery', path.join(__dirname, '..', 'app', 'reset-password.tsx')],
  ] as const;

  it.each(doorways)('%s calls releaseAccountState', (_name, file) => {
    expect(fs.readFileSync(file, 'utf8')).toMatch(/releaseAccountState\(/);
  });

  it.each(doorways)('%s no longer hand-rolls the teardown', (_name, file) => {
    const source = fs.readFileSync(file, 'utf8');
    expect(source).not.toMatch(/clearDeviceSchedules\(/);
    expect(source).not.toMatch(/clearAllDrafts\(/);
  });

  it('recovery only tears down on a real account change', () => {
    // Resetting your own password is the common case. Wiping that user's draft
    // and reminders for it would be a worse bug than the one being fixed.
    const source = fs.readFileSync(doorways[2][1], 'utf8');
    expect(source).toMatch(/leaving !== arriving/);
  });
});
