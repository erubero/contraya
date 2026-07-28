import { resolveScheme } from '@/theme/resolveScheme';

describe('theme scheme resolution', () => {
  it('pins light regardless of OS', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('light', 'light')).toBe('light');
  });
  it('pins dark regardless of OS', () => {
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('dark', 'dark')).toBe('dark');
  });
  it('follows the OS scheme when set to system', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', 'light')).toBe('light');
  });
});
