import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button, Card, DataRow, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { useDietProfile } from '@/features/goals/useDietProfile';
import { useTheme } from '@/theme/ThemeProvider';

export default function ClientProfile() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { session, profile, signOut } = useAuth();
  const { data: diet } = useDietProfile(session?.user.id, true);

  const t = diet?.targets;

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Text variant="overline" color="textTertiary">
          PROFILE
        </Text>
        <Text variant="h1">{profile?.display_name || 'Your account'}</Text>
        <Tag label="Client" tone="accent" style={{ marginTop: spacing.sm }} />
      </View>

      {/* Goals summary */}
      <Card style={{ marginBottom: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Text variant="overline" color="textTertiary" style={{ flex: 1 }}>
            YOUR PLAN
          </Text>
          {(diet?.rules.diet_tags ?? []).map((tag) => (
            <Tag key={tag} label={tag} tone="accent" />
          ))}
        </View>

        {t ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: spacing.md,
              }}
            >
              {[
                { label: 'kcal', value: t.calories },
                { label: 'protein', value: `${t.protein_g}g` },
                { label: 'carbs', value: `${t.carbs_g}g` },
                { label: 'fat', value: `${t.fat_g}g` },
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
              {diet.rules.avoid_ingredients.length} avoided ingredient
              {diet.rules.avoid_ingredients.length === 1 ? '' : 's'} ·{' '}
              {diet.rules.avoid_allergens.length} allergen
              {diet.rules.avoid_allergens.length === 1 ? '' : 's'} ·{' '}
              {diet.strictness} strictness
            </Text>
          </>
        ) : (
          <Text variant="caption" color="textSecondary">
            No plan set yet.
          </Text>
        )}

        <Button
          label="Edit goals"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/goals')}
          icon={<Ionicons name="options-outline" size={18} color={colors.text} />}
          style={{ marginTop: spacing.lg }}
        />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <DataRow title="Email" subtitle={session?.user.email ?? '—'} />
        <DataRow title="Signed in" subtitle="Session active on this device" />
      </Card>

      <Card variant="sunken" style={{ marginBottom: spacing.xl }}>
        <Text variant="h3" style={{ marginBottom: spacing.xs }}>
          Coming next
        </Text>
        <Text variant="caption" color="textSecondary">
          A dietician invite code and role switching will appear here (Phase 7).
        </Text>
      </Card>

      <Button label="Sign out" variant="secondary" fullWidth onPress={signOut} />

      <Text
        variant="caption"
        color="textTertiary"
        align="center"
        style={{ marginTop: spacing.xxl }}
      >
        Not medical advice. A personal tool used alongside your dietician.
      </Text>
    </Screen>
  );
}
