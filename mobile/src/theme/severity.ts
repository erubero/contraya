import { Palette } from './colors';
import { Severity } from '@/data/types';

// The risk-flag severity color mapping, shared by the contract detail screen
// and the add-flow's review-screen preview, so a flag reads in the same
// color everywhere it appears.
export function severityColor(theme: Palette): Record<Severity, { fg: string; bg: string }> {
  return {
    high: { fg: theme.statusExpired, bg: theme.statusExpiredBg },
    medium: { fg: theme.statusExpiring, bg: theme.statusExpiringBg },
    low: { fg: theme.mutedForeground, bg: theme.accent },
  };
}
