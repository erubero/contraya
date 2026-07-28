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
    expect(path).toBe('demo-avatar');
    expect(demo.profile().avatarPath).toBe('demo-avatar');
    expect(await demo.avatarUrl()).toContain('data:image/jpeg;base64,');
  });

  it('remove photo clears the avatar', async () => {
    await demo.uploadAvatar('aGVsbG8=');
    await demo.updateProfile({ avatarPath: null });
    expect(demo.profile().avatarPath).toBeNull();
    expect(await demo.avatarUrl()).toBe('');
  });

  it('reset clears the profile', async () => {
    await demo.updateProfile({ displayName: 'Edgardo' });
    await demo.uploadAvatar('aGVsbG8=');
    demo.reset();
    expect(demo.profile()).toEqual({ displayName: null, avatarPath: null });
  });
});
