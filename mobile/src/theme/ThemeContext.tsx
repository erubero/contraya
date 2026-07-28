import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveScheme, ThemePreference, ThemeScheme } from './resolveScheme';

// Theme preference: the user can pin light or dark, or follow the OS ('system').
// The choice persists in AsyncStorage (same flag pattern as reminders) and is
// resolved to a concrete 'light' | 'dark' scheme that useTheme() reads.

export type { ThemePreference, ThemeScheme } from './resolveScheme';

const PREF_KEY = 'contraya.themePref';

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ThemeScheme;
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(v: string | null): v is ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const os = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((v) => {
      if (isPreference(v)) setPreferenceState(v);
    });
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(PREF_KEY, pref).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme: resolveScheme(preference, os), setPreference }),
    [preference, os]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeScheme(): ThemeScheme {
  const ctx = useContext(ThemeContext);
  // Falls back to light if a consumer renders outside the provider.
  return ctx?.scheme ?? 'light';
}

export function useThemePreference(): { preference: ThemePreference; setPreference: (pref: ThemePreference) => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemeProvider');
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}
