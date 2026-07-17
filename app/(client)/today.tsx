import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';

import { Button, Card, DataRow, Placeholder, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { useDietProfile } from '@/features/goals/useDietProfile';
import {
  consumedTotals,
  remainingBudget,
  useDeleteLog,
  useLogsForDay,
} from '@/features/log/useFoodLogs';
import { MacroRings } from '@/features/today/MacroRings';
import { FoodLog, Meal } from '@/types/log';
import { useTheme } from '@/theme/ThemeProvider';

const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function confirmDelete(name: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // React Native Web's Alert doesn't render buttons; use the browser dialog.
    // eslint-disable-next-line no-alert
    if (window.confirm(`Remove "${name}" from today's log?`)) onConfirm();
    return;
  }
  Alert.alert('Remove item', `Remove "${name}" from today's log?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function Today() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: diet } = useDietProfile(userId, true);
  const { data: logs, isLoading } = useLogsForDay(userId);
  const del = useDeleteLog(userId);

  if (isLoading || !diet) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  const dayLogs = logs ?? [];
  const consumed = consumedTotals(dayLogs);
  const remaining = remainingBudget(diet.targets, dayLogs);

  const tally = dayLogs.reduce(
    (acc, l) => {
      acc[l.verdict] += 1;
      return acc;
    },
    { green: 0, amber: 0, red: 0 },
  );

  const remainingCells = [
    { label: 'kcal', v: remaining.calories },
    { label: 'protein', v: remaining.protein_g },
    { label: 'carbs', v: remaining.carbs_g },
    { label: 'fat', v: remaining.fat_g },
  ];

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary">
          TODAY
        </Text>
        <Text variant="h1">Your day</Text>
      </View>

      {/* Rings */}
      <Card style={{ marginBottom: spacing.lg }}>
        <MacroRings targets={diet.targets} consumed={consumed} />
      </Card>

      {/* Remaining budget — prominent */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.md }}>
          REMAINING TODAY
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {remainingCells.map((m) => (
            <View key={m.label} style={{ alignItems: 'center' }}>
              <Text variant="numberLg" style={{ color: m.v < 0 ? colors.red : colors.text }}>
                {Math.round(m.v)}
              </Text>
              <Text variant="overline" color="textTertiary">
                {m.label.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        {remainingCells.some((m) => m.v < 0) && (
          <Text variant="caption" color="red" style={{ marginTop: spacing.md }}>
            You're over on the highlighted macro{remainingCells.filter((m) => m.v < 0).length > 1 ? 's' : ''}.
          </Text>
        )}
      </Card>

      {/* Today's log */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <Text variant="h3" style={{ flex: 1 }}>
          Logged
        </Text>
        {tally.green > 0 && <Tag label={`${tally.green} green`} tone="green" />}
        {tally.amber > 0 && <Tag label={`${tally.amber} amber`} tone="amber" />}
        {tally.red > 0 && <Tag label={`${tally.red} red`} tone="red" />}
      </View>

      {dayLogs.length === 0 ? (
        <Card variant="sunken">
          <Placeholder
            icon="restaurant-outline"
            title="Nothing logged yet"
            body="Scan a product or add one by hand — it'll show up here with its verdict."
            phase="Tap Scan to start"
          />
          <Button
            label="Go to Scan"
            fullWidth
            onPress={() => router.push('/(client)')}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
      ) : (
        MEAL_ORDER.map((meal) => {
          const items = dayLogs.filter((l) => l.meal === meal);
          if (items.length === 0) return null;
          return (
            <Card key={meal} style={{ marginBottom: spacing.md }}>
              <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
                {MEAL_LABEL[meal].toUpperCase()}
              </Text>
              {items.map((item: FoodLog) => (
                <DataRow
                  key={item.id}
                  title={item.name}
                  subtitle={
                    item.servings === 1 ? '1 serving' : `${item.servings} servings`
                  }
                  value={String(Math.round((item.nutrients.calories ?? 0) * item.servings))}
                  valueSub="kcal"
                  verdict={item.verdict}
                  onPress={() => confirmDelete(item.name, () => del.mutate(item.id))}
                />
              ))}
            </Card>
          );
        })
      )}

      <Text variant="caption" color="textTertiary" align="center" style={{ marginTop: spacing.xl }}>
        Tap an item to remove it.
      </Text>
    </Screen>
  );
}
