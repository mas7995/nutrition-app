import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components';
import { useAuth } from '@/lib/auth';
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard';
import {
  useDietProfile,
  useSaveDietProfile,
} from '@/features/goals/useDietProfile';
import { DietProfile } from '@/types/diet';
import { useTheme } from '@/theme/ThemeProvider';

export default function Goals() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const { data, isLoading } = useDietProfile(userId, true);
  const save = useSaveDietProfile(userId);

  const isOnboarding = !data;

  function handleComplete(draft: Omit<DietProfile, 'user_id'>) {
    save.mutate(draft, {
      onSuccess: () => {
        // First-time setup drops the user into the app; editing returns back.
        if (isOnboarding) router.replace('/(client)');
        else router.back();
      },
    });
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <OnboardingWizard
        initial={data ?? undefined}
        saving={save.isPending}
        error={save.error ? (save.error as Error).message : null}
        onComplete={handleComplete}
        onCancel={isOnboarding ? undefined : () => router.back()}
      />
    </Screen>
  );
}
