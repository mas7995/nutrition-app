import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, DataRow, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { useDietProfile } from '@/features/goals/useDietProfile';
import {
  useCreateInviteCode,
  useMyDieticians,
  useMyInviteCode,
  useRevokeLink,
} from '@/features/dietician/useLinks';
import { NotesThread } from '@/features/dietician/NotesThread';
import { useRealtime } from '@/features/realtime/useRealtime';
import { useTheme } from '@/theme/ThemeProvider';

export default function ClientProfile() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { session, profile, signOut } = useAuth();
  const userId = session?.user.id;
  const { data: diet } = useDietProfile(userId, true);

  const inviteCode = useMyInviteCode(userId);
  const createCode = useCreateInviteCode();
  const dieticians = useMyDieticians(userId);
  const revoke = useRevokeLink(userId);

  // Live updates when a linked dietician edits the plan or the links change.
  useRealtime(
    `client-${userId}`,
    [
      { table: 'diet_profiles', filter: `user_id=eq.${userId}`, invalidate: [['diet_profile', userId]] },
      { table: 'dietician_links', filter: `client_id=eq.${userId}`, invalidate: [['my_dieticians', userId]] },
      { table: 'notes', filter: `client_id=eq.${userId}`, invalidate: [['notes', userId]] },
    ],
    Boolean(userId),
  );

  const hasDietician = (dieticians.data ?? []).length > 0;

  const t = diet?.targets;

  function confirmRevoke(linkId: string, name: string) {
    const msg = `Revoke ${name}'s access to your data?`;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(msg)) revoke.mutate(linkId);
    } else {
      revoke.mutate(linkId);
    }
  }

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

      {/* Dietician linking */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
          YOUR DIETICIAN
        </Text>
        <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
          Share this code with your dietician so they can link to your account.
          You can revoke access anytime.
        </Text>

        {inviteCode.data ? (
          <View
            style={{
              backgroundColor: colors.accentSoft,
              borderRadius: spacing.md,
              paddingVertical: spacing.lg,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text variant="display" color="accent" style={{ letterSpacing: 6 }}>
              {inviteCode.data.code}
            </Text>
          </View>
        ) : null}

        <Button
          label={inviteCode.data ? 'Generate a new code' : 'Generate invite code'}
          variant={inviteCode.data ? 'ghost' : 'primary'}
          fullWidth
          loading={createCode.isPending}
          onPress={() => createCode.mutate()}
        />

        {(dieticians.data ?? []).length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
              LINKED
            </Text>
            {(dieticians.data ?? []).map((d) => (
              <View
                key={d.link.id}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}
              >
                <Ionicons name="medkit-outline" size={18} color={colors.text} />
                <Text variant="bodyStrong" style={{ flex: 1, marginLeft: spacing.sm }}>
                  {d.profile?.display_name || 'Dietician'}
                </Text>
                <Button
                  label="Revoke"
                  size="sm"
                  variant="ghost"
                  onPress={() => confirmRevoke(d.link.id, d.profile?.display_name || 'this dietician')}
                />
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Notes from the dietician */}
      {hasDietician && userId && (
        <View style={{ marginBottom: spacing.lg }}>
          <NotesThread
            clientId={userId}
            currentUserId={userId}
            otherLabel={dieticians.data?.[0]?.profile?.display_name || 'Dietician'}
          />
        </View>
      )}

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
