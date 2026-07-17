import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Card, Screen, SegmentedControl, Text, TextField } from '@/components';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

type Method = 'password' | 'link';
type Step = 'email' | 'code';
type PwMode = 'signin' | 'signup';

export default function SignIn() {
  const { spacing } = useTheme();
  const {
    sendEmailCode,
    verifyEmailCode,
    signInWithPassword,
    signUpWithPassword,
    configured,
  } = useAuth();

  const isWeb = Platform.OS === 'web';
  const [method, setMethod] = useState<Method>('password');

  // Password flow
  const [pwMode, setPwMode] = useState<PwMode>('signin');
  const [password, setPassword] = useState('');

  // Shared
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Email-link flow
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = /^\d{6}$/.test(code.trim());
  const passwordValid = password.length >= 6;

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  async function handlePassword() {
    resetMessages();
    setBusy(true);
    const fn =
      pwMode === 'signin'
        ? signInWithPassword(email, password)
        : signUpWithPassword(email, password).then((r) => {
            if (!r.error && r.needsConfirmation) {
              setNotice(
                'Account created. Email confirmation is on for this project — ' +
                  'turn it off in Supabase (Auth → Providers → Email) to sign in ' +
                  'without email.',
              );
            }
            return { error: r.error };
          });
    const { error: err } = await fn;
    setBusy(false);
    if (err) setError(err);
    // On success the auth guard routes onward automatically.
  }

  async function handleSend() {
    resetMessages();
    setBusy(true);
    const { error: err } = await sendEmailCode(email);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('code');
  }

  async function handleVerify() {
    resetMessages();
    setBusy(true);
    const { error: err } = await verifyEmailCode(email, code);
    setBusy(false);
    if (err) setError(err);
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
        ) : method === 'password' ? (
          <Card variant="elevated">
            <SegmentedControl<PwMode>
              options={[
                { value: 'signin', label: 'Sign in' },
                { value: 'signup', label: 'Create account' },
              ]}
              value={pwMode}
              onChange={(m) => {
                setPwMode(m);
                resetMessages();
              }}
            />
            <View style={{ height: spacing.lg }} />
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              value={email}
              onChangeText={setEmail}
              containerStyle={{ marginBottom: spacing.md }}
            />
            <TextField
              label="Password"
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              error={error ?? undefined}
              hint={notice ?? undefined}
              containerStyle={{ marginBottom: spacing.lg }}
            />
            <Button
              label={pwMode === 'signin' ? 'Sign in' : 'Create account & continue'}
              fullWidth
              onPress={handlePassword}
              loading={busy}
              disabled={!emailValid || !passwordValid}
            />
            <Button
              label="Prefer an email link? Use that instead"
              variant="ghost"
              fullWidth
              onPress={() => {
                setMethod('link');
                resetMessages();
              }}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : step === 'email' ? (
          <Card variant="elevated">
            <Text variant="h3" style={{ marginBottom: spacing.lg }}>
              Sign in with a link
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
              label={isWeb ? 'Email me a sign-in link' : 'Email me a code'}
              fullWidth
              onPress={handleSend}
              loading={busy}
              disabled={!emailValid}
            />
            <Button
              label="Use a password instead"
              variant="ghost"
              fullWidth
              onPress={() => {
                setMethod('password');
                resetMessages();
              }}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : (
          <Card variant="elevated">
            <Text variant="h3" style={{ marginBottom: spacing.xs }}>
              {isWeb ? 'Check your email' : 'Enter your code'}
            </Text>
            <Text variant="caption" color="textSecondary" style={{ marginBottom: spacing.lg }}>
              {isWeb
                ? `We emailed a sign-in link to ${email}. Open it and tap "Confirm email address".`
                : `We emailed a 6-digit code to ${email}.`}
            </Text>
            {!isWeb && (
              <>
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
              </>
            )}
            <Button
              label="Back"
              variant="ghost"
              fullWidth
              onPress={() => {
                setStep('email');
                setCode('');
                resetMessages();
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
