import { QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Redirect the user to the correct place based on auth + role:
 *   no session            -> /sign-in
 *   session, no profile   -> /role  (first sign-in: pick client/dietician)
 *   session + client      -> /(client)
 *   session + dietician   -> /(dietician)
 */
function useAuthRouting() {
  const { initializing, session, profile, profileLoaded, configured } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    // Wait until we know whether a profile exists before routing.
    if (session && !profileLoaded) return;

    const group = segments[0]; // '(client)' | '(dietician)' | 'sign-in' | 'role' | undefined
    const inAuth = group === 'sign-in';
    const inRole = group === 'role';
    const inClient = group === '(client)';
    const inDietician = group === '(dietician)';

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

    if (profile.role === 'client' && !inClient) {
      router.replace('/(client)');
    } else if (profile.role === 'dietician' && !inDietician) {
      router.replace('/(dietician)');
    }
  }, [initializing, session, profile, profileLoaded, configured, segments, router]);
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
