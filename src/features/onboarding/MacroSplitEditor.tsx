import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { MacroDonut, Text } from '@/components';
import { selectionFeedback } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { MacroSplit, gramsFromSplit, rebalanceSplit } from './split';

export interface MacroSplitEditorProps {
  calories: number;
  split: MacroSplit;
  onChange: (next: MacroSplit) => void;
}

const PRESET_SPLITS: { label: string; split: MacroSplit }[] = [
  { label: 'Balanced', split: { proteinPct: 30, carbsPct: 40, fatPct: 30 } },
  { label: 'High protein', split: { proteinPct: 35, carbsPct: 35, fatPct: 30 } },
  { label: 'Low carb', split: { proteinPct: 30, carbsPct: 20, fatPct: 50 } },
  { label: 'Keto', split: { proteinPct: 20, carbsPct: 10, fatPct: 70 } },
  { label: 'Endurance', split: { proteinPct: 25, carbsPct: 55, fatPct: 20 } },
];

function splitEquals(a: MacroSplit, b: MacroSplit): boolean {
  return (
    a.proteinPct === b.proteinPct && a.carbsPct === b.carbsPct && a.fatPct === b.fatPct
  );
}

function coachCaption(split: MacroSplit): string {
  if (split.proteinPct < 20) {
    return "That's on the low side for satiety — most plans land 25–35% protein.";
  }
  if (split.fatPct > 60) {
    return 'Very high fat — deliberate for keto, heavy otherwise.';
  }
  if (split.carbsPct > 60) {
    return 'Carb-forward — great for training days, watch the sugar rules.';
  }
  return 'A balanced, sustainable split.';
}

/**
 * The pie-chart moment of onboarding: an animated donut of the macro split
 * with per-macro percentage controls, preset splits, and live gram readouts.
 */
export function MacroSplitEditor({ calories, split, onChange }: MacroSplitEditorProps) {
  const { colors, radius, spacing } = useTheme();
  const grams = gramsFromSplit(calories, split);

  function adjust(key: keyof MacroSplit, delta: number) {
    selectionFeedback();
    onChange(rebalanceSplit(split, key, split[key] + delta));
  }

  const rows: {
    key: keyof MacroSplit;
    label: string;
    color: string;
    grams: number;
    kcalPerG: number;
  }[] = [
    { key: 'proteinPct', label: 'Protein', color: colors.green, grams: grams.protein_g, kcalPerG: 4 },
    { key: 'carbsPct', label: 'Carbs', color: colors.amber, grams: grams.carbs_g, kcalPerG: 4 },
    { key: 'fatPct', label: 'Fat', color: colors.red, grams: grams.fat_g, kcalPerG: 9 },
  ];

  const stepBtn = (key: keyof MacroSplit, icon: 'remove' | 'add', delta: number) => (
    <Pressable
      onPress={() => adjust(key, delta)}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center' }}>
        <MacroDonut
          protein_g={grams.protein_g}
          carbs_g={grams.carbs_g}
          fat_g={grams.fat_g}
          size={200}
          centerTitle="Daily target"
          centerValue={Math.round(calories).toLocaleString()}
        />
      </View>

      {/* Preset splits */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
        {PRESET_SPLITS.map((p) => {
          const selected = splitEquals(p.split, split);
          return (
            <Pressable
              key={p.label}
              onPress={() => {
                selectionFeedback();
                onChange({ ...p.split });
              }}
              style={{
                backgroundColor: selected ? colors.accentSoft : colors.surfaceSunken,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 1,
              }}
            >
              <Text variant="caption" color={selected ? 'accent' : 'textSecondary'}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Per-macro controls */}
      <View>
        {rows.map((row) => (
          <View
            key={row.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.sm,
              gap: spacing.md,
            }}
          >
            <View
              style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: row.color }}
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{row.label}</Text>
              <Text variant="caption" color="textTertiary">
                {row.grams}g · {Math.round((calories * split[row.key]) / 100).toLocaleString()} kcal
              </Text>
            </View>
            {stepBtn(row.key, 'remove', -5)}
            <Text variant="numberMd" style={{ minWidth: 52, textAlign: 'center' }}>
              {split[row.key]}%
            </Text>
            {stepBtn(row.key, 'add', 5)}
          </View>
        ))}
      </View>

      <Text variant="caption" color="textSecondary" align="center">
        {coachCaption(split)}
      </Text>
    </View>
  );
}
