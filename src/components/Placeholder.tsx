import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Tag } from './Tag';
import { Text } from './Text';

export interface PlaceholderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  phase: string;
}

/**
 * Calm empty state for screens that light up in a later build phase. Keeps
 * the shell navigable and on-brand before the real feature lands.
 */
export function Placeholder({ icon, title, body, phase }: PlaceholderProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Ionicons name={icon} size={40} color={colors.textTertiary} />
      <Text variant="h2" align="center">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {body}
      </Text>
      <Tag label={phase} tone="neutral" style={{ marginTop: spacing.sm }} />
    </View>
  );
}
