import React from 'react';
import { View } from 'react-native';

import {
  Card,
  DataRow,
  ErrorState,
  Placeholder,
  Screen,
  SkeletonCard,
  Text,
} from '@/components';
import { useAuth } from '@/lib/auth';
import {
  DayAdherence,
  dayLabel,
  groupLogsByDay,
  useRecentLogs,
} from '@/features/log/useFoodLogs';
import { useTheme } from '@/theme/ThemeProvider';

const RANGE_DAYS = 14;

/** A thin stacked bar showing the green/amber/red split for a day. */
function AdherenceBar({ a }: { a: DayAdherence }) {
  const { colors, radius } = useTheme();
  const seg = (n: number, color: string) =>
    n > 0 ? <View key={color} style={{ flex: n, backgroundColor: color }} /> : null;
  return (
    <View
      style={{
        flexDirection: 'row',
        height: 8,
        borderRadius: radius.pill,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSunken,
      }}
    >
      {seg(a.green, colors.green)}
      {seg(a.amber, colors.amber)}
      {seg(a.red, colors.red)}
    </View>
  );
}

export default function History() {
  const { colors, spacing } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data: logs, isLoading, isError, refetch } = useRecentLogs(userId, RANGE_DAYS);

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen scroll>
        <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <Text variant="overline" color="textTertiary">
            LAST {RANGE_DAYS} DAYS
          </Text>
          <Text variant="h1">History</Text>
        </View>
        <View style={{ gap: spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const days = groupLogsByDay(logs ?? []);
  const totals = (logs ?? []).reduce(
    (acc, l) => {
      acc[l.verdict] += 1;
      acc.total += 1;
      return acc;
    },
    { green: 0, amber: 0, red: 0, total: 0 },
  );
  const alignedPct = totals.total > 0 ? Math.round((totals.green / totals.total) * 100) : 0;

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary">
          LAST {RANGE_DAYS} DAYS
        </Text>
        <Text variant="h1">History</Text>
      </View>

      {totals.total === 0 ? (
        <Card variant="sunken">
          <Placeholder
            icon="analytics-outline"
            title="No history yet"
            body="Once you start logging foods, your adherence trend and past days will build up here."
            phase="Log something today"
          />
        </Card>
      ) : (
        <>
          {/* Adherence summary */}
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <Text variant="overline" color="textTertiary">
              ALIGNED
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
              <Text variant="display" color="green">
                {alignedPct}%
              </Text>
              <Text variant="body" color="textSecondary">
                of {totals.total} logged
              </Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <AdherenceBar a={totals} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
              <Text variant="caption" color="green">
                ● {totals.green} aligned
              </Text>
              <Text variant="caption" color="amber">
                ● {totals.amber} moderate
              </Text>
              <Text variant="caption" color="red">
                ● {totals.red} avoid
              </Text>
            </View>
          </Card>

          {/* Per-day breakdown */}
          {days.map((day) => (
            <Card key={day.dayKey} style={{ marginBottom: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {dayLabel(day.dayKey)}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {day.adherence.total} item{day.adherence.total === 1 ? '' : 's'}
                </Text>
              </View>
              <AdherenceBar a={day.adherence} />
              <View style={{ marginTop: spacing.sm }}>
                {day.logs.map((l) => (
                  <DataRow
                    key={l.id}
                    title={l.name}
                    subtitle={l.meal}
                    verdict={l.verdict}
                    value={String(Math.round((l.nutrients.calories ?? 0) * l.servings))}
                    valueSub="kcal"
                  />
                ))}
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
