import React, { useState } from 'react';
import {
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  hint,
  error,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.red
    : focused
      ? colors.accent
      : colors.border;

  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label && (
        <Text variant="overline" color="textTertiary">
          {label.toUpperCase()}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          height: 52,
          borderWidth: 1,
          borderColor,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: typography.body.fontSize,
          fontWeight: typography.body.fontWeight,
        }}
      />
      {(error || hint) && (
        <Text variant="caption" color={error ? 'red' : 'textTertiary'}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
