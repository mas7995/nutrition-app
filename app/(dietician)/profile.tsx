import React from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, DataRow, Screen, Tag, Text } from '@/components';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

export default function DieticianProfile() {
  const { spacing } = useTheme();
  const { session, profile, signOut, createProfile } = useAuth();

  function switchToClient() {
    const msg = 'Switch to client mode? You can switch back anytime.';
    const go = () => createProfile('client', profile?.display_name ?? '');
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(msg)) void go();
    } else {
      void go();
    }
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <Text variant="overline" color="textTertiary">
          PROFILE
        </Text>
        <Text variant="h1">{profile?.display_name || 'Your account'}</Text>
        <Tag label="Dietician" tone="accent" style={{ marginTop: spacing.sm }} />
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <DataRow title="Email" subtitle={session?.user.email ?? '—'} />
        <DataRow title="Signed in" subtitle="Session active on this device" />
      </Card>

      <Button
        label="Switch to client mode"
        variant="ghost"
        fullWidth
        onPress={switchToClient}
      />
      <Button label="Sign out" variant="secondary" fullWidth onPress={signOut} style={{ marginTop: spacing.sm }} />

      <Text
        variant="caption"
        color="textTertiary"
        align="center"
        style={{ marginTop: spacing.xxl }}
      >
        Not medical advice. This tool supports the plan you and your client set
        together; it does not diagnose or prescribe.
      </Text>
    </Screen>
  );
}
