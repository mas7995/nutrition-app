import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  /** Optional trailing control, e.g. a remove button for optional targets. */
  accessory?: React.ReactNode;
}

/** A labeled numeric field with −/+ controls and direct entry (tabular nums). */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  unit,
  accessory,
}: StepperProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const set = (n: number) => onChange(clamp(Math.round(n)));

  const btn = (name: 'remove' | 'add', delta: number) => (
    <Pressable
      onPress={() => set(value + delta)}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={name} size={18} color={colors.text} />
    </Pressable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
      </View>
      {btn('remove', -step)}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', minWidth: 74, justifyContent: 'flex-end' }}>
        <TextInput
          value={String(value)}
          onChangeText={(t) => set(Number(t.replace(/[^0-9]/g, '')) || 0)}
          keyboardType="number-pad"
          style={{
            color: colors.text,
            fontSize: typography.numberMd.fontSize,
            fontWeight: typography.numberMd.fontWeight,
            fontVariant: ['tabular-nums'],
            textAlign: 'right',
            minWidth: 40,
            padding: 0,
          }}
        />
        {unit && (
          <Text variant="caption" color="textTertiary">
            {' '}
            {unit}
          </Text>
        )}
      </View>
      {btn('add', step)}
      {accessory}
    </View>
  );
}
