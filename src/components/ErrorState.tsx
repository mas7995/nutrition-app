import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Friendly, on-brand error surface with an optional retry. */
export function ErrorState({
  title = 'Something went wrong',
  message = "We couldn't load this. Check your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
      <Text variant="h3" align="center">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {message}
      </Text>
      {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}
