import React from 'react';
import { Pressable, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

/** A pill segmented control. Selected segment fills with the accent wash. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceSunken,
        borderRadius: radius.pill,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (!selected) selectionFeedback();
              onChange(opt.value);
            }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: selected ? colors.surface : 'transparent',
              alignItems: 'center',
              borderWidth: selected ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <Text
              variant="caption"
              color={selected ? 'accent' : 'textTertiary'}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
