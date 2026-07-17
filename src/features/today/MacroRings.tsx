import React from 'react';
import { View } from 'react-native';

import { Ring, Text } from '@/components';
import { DailyTargets } from '@/types/diet';
import { BudgetFit } from '@/types/verdict';
import { useTheme } from '@/theme/ThemeProvider';

export interface MacroRingsProps {
  targets: DailyTargets;
  consumed: BudgetFit;
  size?: number;
}

/** Four thin rings — calories, protein, carbs, fat — filled by consumed/target. */
export function MacroRings({ targets, consumed, size = 78 }: MacroRingsProps) {
  const { colors } = useTheme();

  const macros = [
    { key: 'kcal', value: consumed.calories, target: targets.calories, color: colors.accent, unit: '' },
    { key: 'protein', value: consumed.protein_g, target: targets.protein_g, color: colors.green, unit: 'g' },
    { key: 'carbs', value: consumed.carbs_g, target: targets.carbs_g, color: colors.amber, unit: 'g' },
    { key: 'fat', value: consumed.fat_g, target: targets.fat_g, color: colors.red, unit: 'g' },
  ] as const;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {macros.map((m) => {
        const over = m.target > 0 && m.value > m.target;
        return (
          <Ring
            key={m.key}
            size={size}
            progress={m.target > 0 ? m.value / m.target : 0}
            color={over ? colors.red : m.color}
            value={`${Math.round(m.value)}${m.unit}`}
            label={m.key}
          />
        );
      })}
    </View>
  );
}
