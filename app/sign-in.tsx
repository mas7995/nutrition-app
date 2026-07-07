import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Screen, Text, TextField } from '@/components';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

type Step = 'email' | 'code';

export default function SignIn() {
  const { spacing } = useTheme();
  const { sendEmailCode, verifyEmailCode, configured } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code.trim());

  async function handleSend() {
    setBusy(true);
    setError(null);
    const { error: err } = await sendEmailCode(email);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('code');
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    const { error: err } = await verifyEmailCode(email, code);
    setBusy(false);
    if (err) setError(err);
    // On success, the auth guard routes us onward automatically.
  }

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ marginTop: spacing.xxl, marginBottom: spacing.xxl, gap: spacing.xs }}>
          <Text variant="overline" color="textTertiary">
            NUTRITION SCANNER
          </Text>
          <Text variant="display">Aligned{'\n'}eating.</Text>
          <Text variant="body" color="textSecondary" style={{ marginTop: spacing.sm }}>
            Set your goals, then let every scan tell you — with real reasons —
            whether a food fits your plan.
          </Text>
        </View>

        {!configured ? (
          <Card variant="sunken">
            <Text variant="h3">Backend not configured</Text>
            <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
              your .env and restart the dev server to enable sign-in.
            </Text>
          </Card>
        ) : step === 'email' ? (
          <Card variant="elevated">
            <Text variant="h3" style={{ marginBottom: spacing.lg }}>
              Sign in
            </Text>
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              value={email}
              onChangeText={setEmail}
              error={error ?? undefined}
              containerStyle={{ marginBottom: spacing.lg }}
            />
            <Button
              label="Email me a code"
              fullWidth
              onPress={handleSend}
              loading={busy}
              disabled={!emailValid}
            />
            <Text variant="caption" color="textTertiary" style={{ marginTop: spacing.md }}>
              We'll send a 6-digit code to sign you in — no password needed.
            </Text>
          </Card>
        ) : (
          <Card variant="elevated">
            <Text variant="h3" style={{ marginBottom: spacing.xs }}>
              Enter your code
            </Text>
            <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.lg }}>
              We emailed a 6-digit code to {email}.
            </Text>
            <TextField
              label="6-digit code"
              placeholder="123456"
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              error={error ?? undefined}
              containerStyle={{ marginBottom: spacing.lg }}
            />
            <Button
              label="Verify & continue"
              fullWidth
              onPress={handleVerify}
              loading={busy}
              disabled={!codeValid}
            />
            <Button
              label="Use a different email"
              variant="ghost"
              fullWidth
              onPress={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        )}

        <Text
          variant="caption"
          color="textTertiary"
          align="center"
          style={{ marginTop: spacing.xxl }}
        >
          Not medical advice. This is a personal informational tool used
          alongside your dietician — it helps you follow a plan, it does not
          diagnose or prescribe.
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
