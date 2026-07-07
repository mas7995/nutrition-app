import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  /** 'flat' has a hairline border; 'elevated' adds a soft shadow. */
  variant?: 'flat' | 'elevated' | 'sunken';
  padding?: keyof ReturnType<typeof useTheme>['spacing'];
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'flat',
  padding = 'lg',
  onPress,
  style,
}: CardProps) {
  const { colors, radius, spacing } = useTheme();

  const base: ViewStyle = {
    backgroundColor:
      variant === 'sunken' ? colors.surfaceSunken : colors.surface,
    borderRadius: radius.lg,
    padding: spacing[padding],
  };

  if (variant === 'flat' || variant === 'sunken') {
    base.borderWidth = 1;
    base.borderColor = colors.border;
  }

  if (variant === 'elevated') {
    base.shadowColor = colors.shadow;
    base.shadowOpacity = 0.08;
    base.shadowRadius = 18;
    base.shadowOffset = { width: 0, height: 8 };
    base.elevation = 3;
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}
