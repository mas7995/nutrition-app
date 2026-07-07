import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import {
  ColorScheme,
  ThemePalette,
  motion,
  palettes,
  radius,
  spacing,
  typography,
} from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemePalette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = systemScheme === 'dark' ? 'dark' : 'light';

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: palettes[scheme],
      spacing,
      radius,
      typography,
      motion,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

/** Convenience: map a verdict to its semantic color pair. */
export function useVerdictColors() {
  const { colors } = useTheme();
  return {
    green: { fg: colors.green, bg: colors.greenSoft },
    amber: { fg: colors.amber, bg: colors.amberSoft },
    red: { fg: colors.red, bg: colors.redSoft },
  } as const;
}
