import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';

import { typography } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = keyof typeof typography;

type ColorKey =
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'accent'
  | 'accentText'
  | 'green'
  | 'amber'
  | 'red';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorKey;
  align?: TextStyle['textAlign'];
}

/**
 * The one text primitive. Applies a typography token + a themed color.
 * `mono` variants opt into tabular numerals so digits don't jump.
 */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const spec = typography[variant];

  const base: TextStyle = {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    fontWeight: spec.fontWeight,
    color: theme.colors[color],
    textAlign: align,
  };

  if ('letterSpacing' in spec && spec.letterSpacing) {
    base.letterSpacing = spec.letterSpacing;
  }
  if ('mono' in spec && spec.mono) {
    base.fontVariant = ['tabular-nums'];
  }

  return <RNText style={[base, style]} {...rest} />;
}
