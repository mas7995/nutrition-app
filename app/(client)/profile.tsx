import React from 'react';
import { View } from 'react-native';

import { Button, Card, DataRow, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

export default function ClientProfile() {
  const { spacing } = useTheme();
  const { session, profile, signOut } = useAuth();

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Text variant="overline" color="textTertiary">
          PROFILE
        </Text>
        <Text variant="h1">{profile?.display_name || 'Your account'}</Text>
        <Tag label="Client" tone="accent" style={{ marginTop: spacing.sm }} />
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <DataRow title="Email" subtitle={session?.user.email ?? '—'} />
        <DataRow title="Signed in" subtitle="Session active on this device" />
      </Card>

      <Card variant="sunken" style={{ marginBottom: spacing.xl }}>
        <Text variant="h3" style={{ marginBottom: spacing.xs }}>
          Coming next
        </Text>
        <Text variant="caption" color="textSecondary">
          Your goals & rules (Phase 3), a dietician invite code (Phase 7), and
          switching roles will appear here.
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
