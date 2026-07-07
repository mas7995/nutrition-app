import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { Verdict } from '@/types/verdict';
import { useTheme, useVerdictColors } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface DataRowProps {
  title: string;
  subtitle?: string;
  /** Right-aligned value, e.g. "180 kcal". Rendered with tabular numerals. */
  value?: string;
  valueSub?: string;
  /** Small verdict dot on the left. */
  verdict?: Verdict;
  onPress?: () => void;
  style?: ViewStyle;
}

/** A clean data row: optional verdict dot, title/subtitle, right-aligned value. */
export function DataRow({
  title,
  subtitle,
  value,
  valueSub,
  verdict,
  onPress,
  style,
}: DataRowProps) {
  const { colors, spacing } = useTheme();
  const verdictColors = useVerdictColors();

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {verdict && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: verdictColors[verdict].fg,
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="numberMd" color="text">
            {value}
          </Text>
          {valueSub && (
            <Text variant="caption" color="textTertiary">
              {valueSub}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const divider: ViewStyle = { borderBottomWidth: 1, borderBottomColor: colors.border };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [divider, pressed && { opacity: 0.7 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={divider}>{content}</View>;
}
