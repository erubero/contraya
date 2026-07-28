import { useThemeScheme } from './ThemeContext';

// Brand palette translated from the web app's src/index.css tokens, with
// light and dark variants. Primary blue and status colors match the web.
const light = {
  background: '#F8FAFF',
  card: '#FFFFFF',
  foreground: '#0F1A2E',
  mutedForeground: '#64748B',
  border: '#DBE7FA',
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  accent: '#DBEAFE',
  destructive: '#DC2626',
  statusActive: '#059669',
  statusActiveBg: '#ECFDF5',
  statusExpiring: '#D97706',
  statusExpiringBg: '#FFFBEB',
  statusExpired: '#DC2626',
  statusExpiredBg: '#FEF2F2',
};

const dark: typeof light = {
  background: '#0A1128',
  card: '#0F1F55',
  foreground: '#EAF1FF',
  mutedForeground: '#9BA9C8',
  border: '#22336A',
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  accent: '#152452',
  destructive: '#F87171',
  statusActive: '#34D399',
  statusActiveBg: '#0C2E24',
  statusExpiring: '#FBBF24',
  statusExpiringBg: '#3A2A08',
  statusExpired: '#F87171',
  statusExpiredBg: '#3A0F12',
};

export type Palette = typeof light;

export const RADIUS = 12;

export function useTheme(): Palette {
  return useThemeScheme() === 'dark' ? dark : light;
}
