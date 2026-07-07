import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components';
import { useAuth } from '@/lib/auth';
import { Role } from '@/types/profile';
import { useTheme } from '@/theme/ThemeProvider';

const ROLE_COPY: Record<Role, { title: string; blurb: string }> = {
  client: {
    title: 'I am a client',
    blurb: 'Set your goals, scan foods, and track how your day is going.',
  },
  dietician: {
    title: 'I am a dietician',
    blurb: "Link to clients, review their history, and adjust their plan.",
  },
};

export default function RoleSelect() {
  const { colors, radius, spacing } = useTheme();
  const { createProfile, signOut } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!role) return;
    setBusy(true);
    setError(null);
    const { error: err } = await createProfile(role, name);
    setBusy(false);
    if (err) setError(err);
    // On success the auth guard routes into the correct shell.
  }

  return (
    <Screen scroll>
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl, gap: spacing.xs }}>
        <Text variant="overline" color="textTertiary">
          ONE-TIME SETUP
        </Text>
        <Text variant="h1">How will you{'\n'}use the app?</Text>
        <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
          You can switch this later in settings if you're both.
        </Text>
      </View>

      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        {(Object.keys(ROLE_COPY) as Role[]).map((key) => {
          const selected = role === key;
          return (
            <Pressable key={key} onPress={() => setRole(key)}>
              <View
                style={{
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.accent : colors.border,
                  backgroundColor: selected ? colors.accentSoft : colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                }}
              >
                <Text variant="h3" color={selected ? 'accent' : 'text'}>
                  {ROLE_COPY[key].title}
                </Text>
                <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
                  {ROLE_COPY[key].blurb}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <TextField
          label="Display name (optional)"
          placeholder="e.g. Sierra"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </Card>

      {error && (
        <Text variant="caption" color="red" style={{ marginBottom: spacing.md }}>
          {error}
        </Text>
      )}

      <Button
        label="Continue"
        fullWidth
        onPress={handleContinue}
        loading={busy}
        disabled={!role}
      />
      <Button
        label="Sign out"
        variant="ghost"
        fullWidth
        onPress={signOut}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
