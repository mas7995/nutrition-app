import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button, Card, DataRow, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GoalsEditor } from '@/features/goals/GoalsEditor';
import { useDietProfile, useSaveDietProfile } from '@/features/goals/useDietProfile';
import { NotesThread } from '@/features/dietician/NotesThread';
import { useRecentLogs } from '@/features/log/useFoodLogs';
import { useRealtime } from '@/features/realtime/useRealtime';
import { DietProfile } from '@/types/diet';
import { Profile } from '@/types/profile';
import { useTheme } from '@/theme/ThemeProvider';

export default function ClientDetail() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id;
  const { session } = useAuth();
  const dieticianId = session?.user.id;

  const [editing, setEditing] = useState(false);

  const clientProfile = useQuery({
    queryKey: ['profile', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, display_name, created_at')
        .eq('id', clientId)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  const diet = useDietProfile(clientId, true);
  const save = useSaveDietProfile(clientId);
  const logs = useRecentLogs(clientId, 14);

  // Live sync: reflect the client's own logging + plan changes immediately.
  useRealtime(
    `dietician-client-${clientId}`,
    [
      { table: 'diet_profiles', filter: `user_id=eq.${clientId}`, invalidate: [['diet_profile', clientId]] },
      { table: 'food_logs', filter: `user_id=eq.${clientId}`, invalidate: [['food_logs', clientId, 'recent', 14]] },
      { table: 'notes', filter: `client_id=eq.${clientId}`, invalidate: [['notes', clientId]] },
    ],
    Boolean(clientId),
  );

  const name = clientProfile.data?.display_name || 'Client';
  const recent = logs.data ?? [];
  const tally = recent.reduce(
    (acc, l) => {
      acc[l.verdict] += 1;
      acc.total += 1;
      return acc;
    },
    { green: 0, amber: 0, red: 0, total: 0 },
  );
  const pct = tally.total > 0 ? Math.round((tally.green / tally.total) * 100) : null;

  function handleSave(draft: Omit<DietProfile, 'user_id'>) {
    save.mutate(draft, { onSuccess: () => setEditing(false) });
  }

  return (
    <Screen scroll>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="overline" color="textTertiary">
            CLIENT
          </Text>
          <Text variant="h1">{name}</Text>
        </View>
        {pct !== null && (
          <Tag label={`${pct}% aligned`} tone={pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red'} />
        )}
      </View>

      {diet.isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : editing && diet.data ? (
        <GoalsEditor
          initial={{ targets: diet.data.targets, rules: diet.data.rules, strictness: diet.data.strictness }}
          title="Edit plan"
          submitLabel="Save changes"
          saving={save.isPending}
          error={save.error ? (save.error as Error).message : null}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {/* Plan summary */}
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Text variant="overline" color="textTertiary" style={{ flex: 1 }}>
                THEIR PLAN
              </Text>
              {(diet.data?.rules.diet_tags ?? []).map((tag) => (
                <Tag key={tag} label={tag} tone="accent" />
              ))}
            </View>
            {diet.data ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  {[
                    { label: 'kcal', value: diet.data.targets.calories },
                    { label: 'protein', value: `${diet.data.targets.protein_g}g` },
                    { label: 'carbs', value: `${diet.data.targets.carbs_g}g` },
                    { label: 'fat', value: `${diet.data.targets.fat_g}g` },
                  ].map((m) => (
                    <View key={m.label} style={{ alignItems: 'center' }}>
                      <Text variant="numberMd">{String(m.value)}</Text>
                      <Text variant="overline" color="textTertiary">
                        {m.label.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text variant="caption" color="textSecondary">
                  {diet.data.rules.avoid_ingredients.length} avoided ingredient
                  {diet.data.rules.avoid_ingredients.length === 1 ? '' : 's'} ·{' '}
                  {diet.data.strictness} strictness
                </Text>
              </>
            ) : (
              <Text variant="caption" color="textSecondary">
                This client hasn't set up their plan yet.
              </Text>
            )}
            {diet.data && (
              <Button
                label="Edit plan"
                variant="secondary"
                fullWidth
                onPress={() => setEditing(true)}
                icon={<Ionicons name="options-outline" size={18} color={colors.text} />}
                style={{ marginTop: spacing.lg }}
              />
            )}
          </Card>

          {/* Recent activity */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.sm }}>
              RECENT ACTIVITY
            </Text>
            {recent.length === 0 ? (
              <Text variant="caption" color="textSecondary">
                No logged items in the last 14 days.
              </Text>
            ) : (
              recent
                .slice(0, 12)
                .map((l) => (
                  <DataRow
                    key={l.id}
                    title={l.name}
                    subtitle={l.meal}
                    verdict={l.verdict}
                    value={String(Math.round((l.nutrients.calories ?? 0) * l.servings))}
                    valueSub="kcal"
                  />
                ))
            )}
          </Card>

          {/* Notes */}
          {clientId && dieticianId && (
            <NotesThread clientId={clientId} currentUserId={dieticianId} otherLabel={name} />
          )}
          <View style={{ height: spacing.xl }} />
        </>
      )}
    </Screen>
  );
}
