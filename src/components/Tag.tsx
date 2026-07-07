import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type Tone = 'neutral' | 'accent' | 'green' | 'amber' | 'red';

export interface TagProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

export function Tag({ label, tone = 'neutral', style }: TagProps) {
  const { colors, radius, spacing } = useTheme();

  const toneMap: Record<Tone, { bg: string; fg: keyof typeof colors }> = {
    neutral: { bg: colors.surfaceSunken, fg: 'textSecondary' },
    accent: { bg: colors.accentSoft, fg: 'accent' },
    green: { bg: colors.greenSoft, fg: 'green' },
    amber: { bg: colors.amberSoft, fg: 'amber' },
    red: { bg: colors.redSoft, fg: 'red' },
  };

  const t = toneMap[tone];

  return (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 1,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text variant="caption" color={t.fg as 'textSecondary'}>
        {label}
      </Text>
    </View>
  );
}
