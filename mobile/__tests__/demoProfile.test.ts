import { demo } from '@/lib/demo';

describe('demo profile store', () => {
  beforeEach(() => demo.reset());

  it('starts with no name or avatar', () => {
    expect(demo.profile()).toEqual({ displayName: null, avatarPath: null });
  });

  it('persists a display name', async () => {
    await demo.updateProfile({ displayName: 'Edgardo' });
    expect(demo.profile().displayName).toBe('Edgardo');
  });

  it('records an avatar after upload and exposes a data URL', async () => {
    const path = await demo.uploadAvatar('aGVsbG8=');
    expect(path).toBe(demo.profile().avatarPath);
    expect(path).not.toBeNull();
    expect(await demo.avatarUrl()).toContain('data:image/jpeg;base64,');
  });

  it('a second upload returns a DIFFERENT path', async () => {
    // The property that fixes the stale-avatar bug. avatar_path is the only
    // change signal the screens have: every display effect keys on it, and
    // the optimistic setAvatarPath in AuthContext bails under Object.is when
    // the string repeats. A constant path here ('demo-avatar', the old
    // behavior) reproduced the bug exactly: photo replaced, nothing updated
    // until restart. Do not "simplify" the filename back to a constant.
    const first = await demo.uploadAvatar('aGVsbG8=');
    const second = await demo.uploadAvatar('d29ybGQ=');
    expect(second).not.toBe(first);
    expect(demo.profile().avatarPath).toBe(second);
  });

  it('remove photo clears the avatar', async () => {
    await demo.uploadAvatar('aGVsbG8=');
    await demo.updateProfile({ avatarPath: null });
    expect(demo.profile().avatarPath).toBeNull();
    expect(await demo.avatarUrl()).toBe('');
  });

  it('the storage sweep spares only the kept object', async () => {
    // Mirrors the live removeAvatarObjects(userId, keep): after an upload the
    // sweep runs with keep = the new path and must not delete what it kept.
    const path = await demo.uploadAvatar('aGVsbG8=');
    await demo.removeAvatarObjects(path);
    expect(await demo.avatarUrl()).toContain('data:image/jpeg;base64,');
    await demo.removeAvatarObjects();
    expect(await demo.avatarUrl()).toBe('');
  });

  it('reset clears the profile', async () => {
    await demo.updateProfile({ displayName: 'Edgardo' });
    await demo.uploadAvatar('aGVsbG8=');
    demo.reset();
    expect(demo.profile()).toEqual({ displayName: null, avatarPath: null });
  });
});
