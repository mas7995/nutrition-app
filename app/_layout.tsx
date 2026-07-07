import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useDietProfile } from '@/features/goals/useDietProfile';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Redirect the user to the correct place based on auth + role + setup:
 *   no session                     -> /sign-in
 *   session, no profile            -> /role   (pick client/dietician)
 *   client, no diet profile        -> /goals  (one-time goal setup)
 *   session + client (set up)      -> /(client)  (may also visit /goals to edit)
 *   session + dietician            -> /(dietician)
 */
function useAuthRouting() {
  const { initializing, session, profile, profileLoaded, configured } = useAuth();
  const isClient = profile?.role === 'client';
  const dietQ = useDietProfile(session?.user.id, isClient);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    // Wait until we know whether a profile exists before routing.
    if (session && !profileLoaded) return;

    const group = segments[0]; // '(client)' | '(dietician)' | 'sign-in' | 'role' | 'goals' | undefined
    const inAuth = group === 'sign-in';
    const inRole = group === 'role';
    const inGoals = group === 'goals';
    const inClient = group === '(client)';

    if (!configured) {
      if (!inAuth) router.replace('/sign-in');
      return;
    }

    if (!session) {
      if (!inAuth) router.replace('/sign-in');
      return;
    }

    if (!profile) {
      if (!inRole) router.replace('/role');
      return;
    }

    if (profile.role === 'client') {
      // Wait for the diet-profile check before deciding.
      if (dietQ.isLoading) return;
      if (!dietQ.data) {
        if (!inGoals) router.replace('/goals');
        return;
      }
      // Set up: live in the client shell, but /goals is allowed for editing.
      if (!inClient && !inGoals) router.replace('/(client)');
      return;
    }

    if (profile.role === 'dietician' && group !== '(dietician)') {
      router.replace('/(dietician)');
    }
  }, [
    initializing,
    session,
    profile,
    profileLoaded,
    configured,
    dietQ.isLoading,
    dietQ.data,
    segments,
    router,
  ]);
}

function RootNavigator() {
  useAuthRouting();
  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
