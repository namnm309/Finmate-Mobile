import { useContext, useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/contexts/theme-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * Uses ThemeContext when available; falls back to system when preference is 'system' or context not mounted.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  const themeContext = useContext(ThemeContext);
  const systemScheme = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated && themeContext) {
    return themeContext.resolvedTheme;
  }

  return systemScheme ?? 'light';
}
