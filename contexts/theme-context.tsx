import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const THEME_STORAGE_KEY = 'finmate_theme_preference';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (value: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  const resolvedTheme: ResolvedTheme =
    themePreference === 'system' ? (systemScheme ?? 'light') : themePreference;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (mounted && stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setThemePreferenceState(stored as ThemePreference);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setThemePreference = useCallback(async (value: ThemePreference) => {
    setThemePreferenceState(value);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference: loaded ? themePreference : 'system',
      resolvedTheme,
      setThemePreference,
    }),
    [loaded, themePreference, resolvedTheme, setThemePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export { ThemeContext };
