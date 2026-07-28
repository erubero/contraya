// Pure theme resolver, kept import-free so it is trivially unit-testable.

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeScheme = 'light' | 'dark';

export function resolveScheme(preference: ThemePreference, osScheme: ThemeScheme): ThemeScheme {
  return preference === 'system' ? osScheme : preference;
}
