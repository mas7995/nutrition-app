import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, Card, Placeholder, Screen, Tag, Text, TextField } from '@/components';
import { useAuth } from '@/lib/auth';
import { useClients, useRedeemCode } from '@/features/dietician/useLinks';
import { AdherenceGlance } from '@/types/dietician';
import { useTheme } from '@/theme/ThemeProvider';

function alignedPct(a: AdherenceGlance): number | null {
  return a.total > 0 ? Math.round((a.green / a.total) * 100) : null;
}

export default function Clients() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const dieticianId = session?.user.id;

  const { data: clients, isLoading } = useClients(dieticianId);
  const redeem = useRedeemCode(dieticianId);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleLink() {
    setError(null);
    redeem.mutate(code, {
      onSuccess: () => setCode(''),
      onError: (e) => setError((e as Error).message),
    });
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary">
          DIETICIAN
        </Text>
        <Text variant="h1">Clients</Text>
      </View>

      {/* Link a new client */}
      <Card style={{ marginBottom: spacing.lg }}>
        <Text variant="overline" color="textTertiary" style={{ marginBottom: spacing.xs }}>
          LINK A CLIENT
        </Text>
        <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
          Enter the invite code your client generated in their profile.
        </Text>
        <TextField
          placeholder="6-character code"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          error={error ?? undefined}
          containerStyle={{ marginBottom: spacing.md }}
        />
        <Button
          label="Link client"
          fullWidth
          loading={redeem.isPending}
          disabled={code.trim().length < 6}
          onPress={handleLink}
        />
      </Card>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (clients ?? []).length === 0 ? (
        <Card variant="sunken">
          <Placeholder
            icon="people-outline"
            title="No clients yet"
            body="Link your first client with their invite code above to see their plan, history, and adherence."
            phase="Waiting to link"
          />
        </Card>
      ) : (
        (clients ?? []).map((c) => {
          const pct = alignedPct(c.adherence);
          return (
            <Card
              key={c.link.id}
              onPress={() => router.push(`/(dietician)/client/${c.link.client_id}`)}
              style={{ marginBottom: spacing.md }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{c.profile?.display_name || 'Client'}</Text>
                  <Text variant="caption" color="textTertiary">
                    {c.adherence.total > 0
                      ? `${c.adherence.total} logged · last 14 days`
                      : 'No logs yet'}
                  </Text>
                </View>
                {pct !== null && (
                  <Tag
                    label={`${pct}% aligned`}
                    tone={pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red'}
                  />
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
