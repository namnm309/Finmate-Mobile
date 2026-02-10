import { useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ThemeContext } from '@/contexts/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  const themeContext = useContext(ThemeContext);
  const systemScheme = useRNColorScheme();
  if (themeContext) {
    return themeContext.resolvedTheme;
  }
  return systemScheme ?? 'light';
}
