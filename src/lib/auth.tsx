import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { Profile, Role } from '@/types/profile';
import { isSupabaseConfigured, supabase } from './supabase';

interface AuthState {
  /** null while the initial session is still loading. */
  initializing: boolean;
  session: Session | null;
  /** The signed-in user's profile row, or null if not yet created. */
  profile: Profile | null;
  /** True once we've checked whether a profile exists for this session. */
  profileLoaded: boolean;
  configured: boolean;

  /** Send a 6-digit sign-in code to the email (Supabase OTP / magic link). */
  sendEmailCode: (email: string) => Promise<{ error: string | null }>;
  /** Verify the emailed code and establish a session. */
  verifyEmailCode: (
    email: string,
    token: string,
  ) => Promise<{ error: string | null }>;
  /** Create the profile row on first sign-in with the chosen role. */
  createProfile: (
    role: Role,
    displayName: string,
  ) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// Supabase recommends pausing token auto-refresh while the app is backgrounded
// on React Native, and resuming on foreground.
AppState.addEventListener('change', (state) => {
  if (!isSupabaseConfigured) return;
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const mounted = useRef(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, display_name, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (!mounted.current) return;
    // A missing row (data === null) is expected before role selection; only
    // real errors are surfaced. PGRST116 = no rows for maybeSingle fallback.
    if (error && error.code !== 'PGRST116') {
      // eslint-disable-next-line no-console
      console.warn('[auth] failed to load profile:', error.message);
    }
    setProfile((data as Profile | null) ?? null);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    mounted.current = true;

    if (!isSupabaseConfigured) {
      setInitializing(false);
      setProfileLoaded(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted.current) return;
      setSession(data.session);
      if (data.session) {
        void loadProfile(data.session.user.id);
      } else {
        setProfileLoaded(true);
      }
      setInitializing(false);
      supabase.auth.startAutoRefresh();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted.current) return;
      setSession(next);
      setProfile(null);
      setProfileLoaded(false);
      if (next) {
        void loadProfile(next.user.id);
      } else {
        setProfileLoaded(true);
      }
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const sendEmailCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    return { error: error?.message ?? null };
  }, []);

  const verifyEmailCode = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    return { error: error?.message ?? null };
  }, []);

  const createProfile = useCallback(
    async (role: Role, displayName: string) => {
      const uid = session?.user.id;
      if (!uid) return { error: 'Not signed in.' };

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: uid, role, display_name: displayName.trim() || null })
        .select('id, role, display_name, created_at')
        .single();

      if (error) return { error: error.message };
      setProfile(data as Profile);
      return { error: null };
    },
    [session],
  );

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      initializing,
      session,
      profile,
      profileLoaded,
      configured: isSupabaseConfigured,
      sendEmailCode,
      verifyEmailCode,
      createProfile,
      refreshProfile,
      signOut,
    }),
    [
      initializing,
      session,
      profile,
      profileLoaded,
      sendEmailCode,
      verifyEmailCode,
      createProfile,
      refreshProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
