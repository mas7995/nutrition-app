import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();

  const heights: Record<Size, number> = { sm: 40, md: 52, lg: 58 };
  const paddings: Record<Size, number> = {
    sm: spacing.md,
    md: spacing.xl,
    lg: spacing.xl,
  };

  const bg: Record<Variant, string> = {
    primary: colors.accent,
    secondary: colors.surfaceSunken,
    ghost: 'transparent',
    danger: colors.red,
  };
  const fg: Record<Variant, 'accentText' | 'text' | 'textInverse'> = {
    primary: 'accentText',
    secondary: 'text',
    ghost: 'text',
    danger: 'textInverse',
  };

  const container: ViewStyle = {
    height: heights[size],
    paddingHorizontal: paddings[size],
    borderRadius: radius.pill,
    backgroundColor: bg[variant],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.45 : 1,
  };

  if (variant === 'secondary') {
    container.borderWidth = 1;
    container.borderColor = colors.border;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={
        onPress
          ? () => {
              if (variant === 'primary' || variant === 'danger') tapFeedback();
              onPress();
            }
          : undefined
      }
      style={({ pressed }) => [
        container,
        pressed && !disabled && { opacity: 0.82 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.accentText : colors.text}
        />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon}
          <Text variant="bodyStrong" color={fg[variant]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
