/**
 * Design tokens. Clinical-calm, editorial, confident — the polish of
 * Oura / Whoop / Levels / Cal AI. Near-black text on warm off-white,
 * one restrained accent, semantic verdict colors used sparingly and only
 * at the verdict moment.
 *
 * Everything else in the app references these tokens. Never hardcode a
 * hex value or a raw pixel spacing in a component.
 */

export interface ThemePalette {
  // Surfaces
  background: string; // page background (warm off-white / near-black)
  surface: string; // card background
  surfaceElevated: string; // raised card / sheet
  surfaceSunken: string; // inset / track backgrounds

  // Text
  text: string; // near-black / near-white
  textSecondary: string; // muted body
  textTertiary: string; // captions, hints
  textInverse: string; // text on accent/filled surfaces

  // Lines
  border: string;
  borderStrong: string;

  // Brand accent (single, restrained)
  accent: string;
  accentSoft: string; // tinted background wash
  accentText: string; // text/icon on accent fill

  // Semantic verdict colors — deep botanical green, warm amber,
  // muted terracotta. Not neon, not fire-alarm.
  green: string;
  greenSoft: string;
  amber: string;
  amberSoft: string;
  red: string;
  redSoft: string;

  // Utility
  overlay: string;
  shadow: string;
}

const light: ThemePalette = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#F1F0EA',

  text: '#1A1A17',
  textSecondary: '#5C5B54',
  textTertiary: '#8A897F',
  textInverse: '#FAFAF7',

  border: '#E7E5DD',
  borderStrong: '#D6D3C8',

  accent: '#3A5A46', // deep botanical
  accentSoft: '#EAF0EB',
  accentText: '#FAFAF7',

  green: '#3F6B4E',
  greenSoft: '#E7EFE8',
  amber: '#B8791F',
  amberSoft: '#F6ECD9',
  red: '#B15442',
  redSoft: '#F5E4DF',

  overlay: 'rgba(26,26,23,0.45)',
  shadow: '#1A1A17',
};

const dark: ThemePalette = {
  background: '#141412',
  surface: '#1D1D1A',
  surfaceElevated: '#242420',
  surfaceSunken: '#0F0F0D',

  text: '#F3F2EC',
  textSecondary: '#B4B2A8',
  textTertiary: '#807E74',
  textInverse: '#141412',

  border: '#2C2C27',
  borderStrong: '#3A3A33',

  accent: '#7FA98C',
  accentSoft: '#20281F',
  accentText: '#141412',

  green: '#7FA98C',
  greenSoft: '#1E271F',
  amber: '#D6A24E',
  amberSoft: '#2C2418',
  red: '#D08871',
  redSoft: '#2C1E19',

  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const palettes = { light, dark } as const;

export type ColorScheme = keyof typeof palettes;

/** 4pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

/**
 * Type scale. `mono` fields request tabular numerals so macro digits
 * don't jump as they animate. `serif` is reserved for large headline
 * numbers to feel editorial.
 */
export const typography = {
  display: { fontSize: 44, lineHeight: 48, fontWeight: '700' as const, serif: true },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
  },
  numberLg: { fontSize: 34, lineHeight: 38, fontWeight: '600' as const, mono: true },
  numberMd: { fontSize: 20, lineHeight: 24, fontWeight: '600' as const, mono: true },
} as const;

export const motion = {
  spring: { damping: 18, stiffness: 180, mass: 1 },
  springSoft: { damping: 20, stiffness: 120, mass: 1 },
  timing: { duration: 240 },
} as const;

export const tokens = { spacing, radius, typography, motion } as const;
