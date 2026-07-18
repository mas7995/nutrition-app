import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Platform, View } from 'react-native';

import {
  Button,
  Card,
  DataRow,
  ErrorState,
  MacroDonut,
  Placeholder,
  Screen,
  SkeletonCard,
  Tag,
  Text,
} from '@/components';
import { useAuth } from '@/lib/auth';
import { CoachTone, buildCoachBriefing } from '@/engine/coach';
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

const TONE_ICON: Record<CoachTone, keyof typeof Ionicons.glyphMap> = {
  praise: 'checkmark-circle',
  nudge: 'trending-up',
  warning: 'alert-circle',
  info: 'information-circle',
};

function confirmDelete(name: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Remove "${name}" from today's log?`)) onConfirm();
    return;
  }
  Alert.alert('Remove item', `Remove "${name}" from today's log?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onConfirm },
  ]);
}

/** The default tab: a coach-led dashboard of the day. */
export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const { data: diet } = useDietProfile(userId, true);
  const { data: logs, isLoading, isError, refetch } = useLogsForDay(userId);
  const del = useDeleteLog(userId);

  const now = new Date();
  const dateLabel = now
    .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();

  const dayLogs = useMemo(() => logs ?? [], [logs]);
  const consumed = useMemo(() => consumedTotals(dayLogs), [dayLogs]);
  const remaining = useMemo(
    () => (diet ? remainingBudget(diet.targets, dayLogs) : null),
    [diet, dayLogs],
  );

  const briefing = useMemo(
    () =>
      diet && remaining
        ? buildCoachBriefing({
            displayName: profile?.display_name ?? null,
            hour: now.getHours(),
            targets: diet.targets,
            consumed,
            remaining,
            logs: dayLogs,
            rules: diet.rules,
            strictness: diet.strictness,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diet, remaining, consumed, dayLogs, profile?.display_name],
  );

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (isLoading || !diet || !remaining || !briefing) {
    return (
      <Screen scroll>
        <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <Text variant="overline" color="textTertiary">
            {dateLabel}
          </Text>
          <Text variant="h1">Loading your day</Text>
        </View>
        <View style={{ gap: spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const tally = dayLogs.reduce(
    (acc, l) => {
      acc[l.verdict] += 1;
      return acc;
    },
    { green: 0, amber: 0, red: 0 },
  );

  const toneColor: Record<CoachTone, string> = {
    praise: colors.green,
    nudge: colors.amber,
    warning: colors.red,
    info: colors.textTertiary,
  };

  const remainingRows = [
    { label: 'Protein', v: remaining.protein_g, unit: 'g' },
    { label: 'Carbs', v: remaining.carbs_g, unit: 'g' },
    { label: 'Fat', v: remaining.fat_g, unit: 'g' },
  ];

  return (
    <Screen scroll>
      {/* Greeting */}
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary">
          {dateLabel}
        </Text>
        <Text variant="h1">{briefing.greeting}</Text>
      </View>

      {/* Coach briefing */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <Text variant="h3" style={{ marginBottom: briefing.messages.length > 0 ? spacing.md : 0 }}>
          {briefing.headline}
        </Text>
        <View style={{ gap: spacing.md }}>
          {briefing.messages.map((m, i) => (
            <View key={`${m.title}-${i}`} style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Ionicons
                name={TONE_ICON[m.tone]}
                size={18}
                color={toneColor[m.tone]}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{m.title}</Text>
                <Text variant="caption" color="textSecondary">
                  {m.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Day at a glance: eaten donut + remaining */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl }}>
          <MacroDonut
            protein_g={consumed.protein_g}
            carbs_g={consumed.carbs_g}
            fat_g={consumed.fat_g}
            size={132}
            strokeWidth={16}
            centerTitle="Eaten"
            centerValue={Math.round(consumed.calories).toLocaleString()}
          />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="overline" color="textTertiary">
              REMAINING
            </Text>
            <Text
              variant="numberLg"
              style={{ color: remaining.calories < 0 ? colors.red : colors.text }}
            >
              {Math.round(remaining.calories).toLocaleString()}
              <Text variant="caption" color="textTertiary">
                {'  '}kcal
              </Text>
            </Text>
            {remainingRows.map((row) => (
              <View
                key={row.label}
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <Text variant="caption" color="textSecondary">
                  {row.label}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    fontVariant: ['tabular-nums'],
                    color: row.v < 0 ? colors.red : colors.textSecondary,
                  }}
                >
                  {Math.round(row.v)}
                  {row.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Progress rings */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.lg }}>
          PROGRESS
        </Text>
        <MacroRings targets={diet.targets} consumed={consumed} />
      </Card>

      {/* Quick actions */}
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Button
          label="Scan a barcode"
          fullWidth
          icon={<Ionicons name="scan-outline" size={18} color={colors.accentText} />}
          onPress={() => router.push('/(client)/scan')}
        />
        <Button
          label="Add manually"
          variant="secondary"
          fullWidth
          onPress={() => router.push({ pathname: '/(client)/scan', params: { manual: '1' } })}
        />
      </View>

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
          Logged today
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
            body="Scan a product or add one by hand — I'll tell you how it fits your plan."
            phase="Your day starts here"
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
                  subtitle={item.servings === 1 ? '1 serving' : `${item.servings} servings`}
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

      {dayLogs.length > 0 && (
        <Text variant="caption" color="textTertiary" align="center" style={{ marginTop: spacing.md }}>
          Tap an item to remove it.
        </Text>
      )}
    </Screen>
  );
}
