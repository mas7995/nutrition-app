import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, SegmentedControl, Stepper, Tag, Text } from '@/components';
import { NormalizedFood } from '@/types/food';
import { Meal } from '@/types/log';
import { AlignmentResult, Severity, Verdict } from '@/types/verdict';
import { useTheme, useVerdictColors } from '@/theme/ThemeProvider';

const ON_COLOR = '#FBFAF6'; // near-white text on the colored verdict header

const VERDICT_WORD: Record<Verdict, string> = {
  green: 'Aligned',
  amber: 'Moderate',
  red: 'Avoid',
};

const MEALS: { value: Meal; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export interface VerdictCardProps {
  food: NormalizedFood;
  result: AlignmentResult;
  logging: boolean;
  onLog: (meal: Meal, servings: number) => void;
  onScanAgain: () => void;
}

export function VerdictCard({
  food,
  result,
  logging,
  onLog,
  onScanAgain,
}: VerdictCardProps) {
  const { colors, spacing, radius } = useTheme();
  const verdictColors = useVerdictColors();
  const vc = verdictColors[result.verdict];

  const [meal, setMeal] = useState<Meal>(defaultMeal());
  const [servings, setServings] = useState(1);

  // Haptics on the verdict moment.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const type =
      result.verdict === 'green'
        ? Haptics.NotificationFeedbackType.Success
        : result.verdict === 'amber'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error;
    Haptics.notificationAsync(type).catch(() => {});
  }, [result.verdict]);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        overflow: 'hidden',
      }}
    >
      {/* Colored verdict header */}
      <View style={{ backgroundColor: vc.fg, padding: spacing.xl, paddingTop: spacing.xxl }}>
        <Text variant="overline" style={{ color: ON_COLOR, opacity: 0.85 }}>
          {result.verdict === 'green'
            ? 'THIS FITS YOUR PLAN'
            : result.verdict === 'amber'
              ? 'EASY DOES IT'
              : 'AGAINST YOUR RULES'}
        </Text>
        <Text variant="display" style={{ color: ON_COLOR }}>
          {VERDICT_WORD[result.verdict]}
        </Text>
      </View>

      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        {/* Product */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {food.image_url ? (
            <Image
              source={{ uri: food.image_url }}
              style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceSunken }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceSunken,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="fast-food-outline" size={24} color={colors.textTertiary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={2}>
              {food.name}
            </Text>
            {food.brand && (
              <Text variant="caption" color="textTertiary">
                {food.brand}
              </Text>
            )}
          </View>
        </View>

        {!food.data_complete && (
          <Tag
            label={`Some data missing · source: ${food.source === 'off' ? 'Open Food Facts' : food.source}`}
            tone="amber"
          />
        )}

        {/* The "why" */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textTertiary">
            WHY
          </Text>
          {result.reasons.map((r, i) => (
            <ReasonRow key={`${r.metric}-${i}`} severity={r.severity} metric={r.metric} message={r.message} />
          ))}
        </View>

        {/* Fits your day */}
        <View
          style={{
            backgroundColor: colors.surfaceSunken,
            borderRadius: radius.lg,
            padding: spacing.lg,
          }}
        >
          <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>
            IF YOU LOG THIS · REMAINING TODAY
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              { label: 'kcal', v: result.budgetFit.calories },
              { label: 'protein', v: result.budgetFit.protein_g },
              { label: 'carbs', v: result.budgetFit.carbs_g },
              { label: 'fat', v: result.budgetFit.fat_g },
            ].map((m) => (
              <View key={m.label} style={{ alignItems: 'center' }}>
                <Text
                  variant="numberMd"
                  style={{ color: m.v < 0 ? colors.red : colors.text }}
                >
                  {Math.round(m.v)}
                </Text>
                <Text variant="overline" color="textTertiary">
                  {m.label.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Log controls */}
        <View style={{ gap: spacing.md }}>
          <SegmentedControl options={MEALS} value={meal} onChange={setMeal} />
          <Stepper label="Servings" value={servings} onChange={setServings} min={1} step={1} />
        </View>

        <Button
          label="Log it"
          fullWidth
          loading={logging}
          onPress={() => onLog(meal, servings)}
        />
        <Button label="Scan again" variant="ghost" fullWidth onPress={onScanAgain} />
      </View>
    </Animated.View>
  );
}

function ReasonRow({
  severity,
  metric,
  message,
}: {
  severity: Severity;
  metric: string;
  message: string;
}) {
  const { colors, spacing } = useTheme();

  const dot =
    severity === 'block'
      ? colors.red
      : severity === 'caution'
        ? colors.amber
        : metric === 'summary'
          ? colors.green
          : colors.textTertiary;

  const icon =
    severity === 'block'
      ? 'close-circle'
      : severity === 'caution'
        ? 'alert-circle'
        : metric === 'summary'
          ? 'checkmark-circle'
          : 'information-circle';

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={18} color={dot} style={{ marginTop: 1 }} />
      <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}
