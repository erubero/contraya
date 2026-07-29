import { useThemeScheme } from './ThemeContext';

// Contraya's palette: deep navy carries structure and actions, lime carries
// energy. Deliberately NOT Warraya's blue (#3B82F6) — the two apps ship from
// one developer and must not look like the same product.
//
// Lime is measured, not vibed. Bright lime (#A3E635) has very high luminance:
// it is excellent as a FILL with dark ink on top (11.5:1) and unreadable as
// text on white (1.5:1). So there are three brand tokens with distinct jobs:
//
//   primary        filled buttons and bars. Navy, so white labels stay legible
//                  (15:1 light / 10:1 dark). Never lime — white on lime fails.
//   brand          the lime itself, used ONLY as a fill or glow: the add FAB,
//                  progress fill, backdrop washes. Pair with brandForeground.
//   brandText      lime that can carry text and icons. Dark lime in light mode
//                  (4.99:1 on white); the bright lime in dark mode, where it
//                  reads at 12:1. Use for links, active tabs, accent icons.
//
// Status colors are untouched on purpose: green means on track, amber means
// soon, red means overdue. Those meanings predate the brand color and the app
// is about deadline urgency, so they win any conflict.
const light = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  foreground: '#0F1A2E',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  primary: '#0F2060',
  primaryForeground: '#FFFFFF',
  brand: '#A3E635',
  brandForeground: '#0F1A2E',
  brandText: '#4D7C0F',
  accent: '#ECFCCB',
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
  card: '#111C3D',
  foreground: '#EAF1FF',
  mutedForeground: '#9BA9C8',
  border: '#22336A',
  // Lifted navy so a filled button still separates from the dark background.
  primary: '#1A3A8F',
  primaryForeground: '#FFFFFF',
  brand: '#A3E635',
  brandForeground: '#0F1A2E',
  brandText: '#A3E635',
  accent: '#1B2440',
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
