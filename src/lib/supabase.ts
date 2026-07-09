import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

/** On web, a magic-link click returns to the app with tokens in the URL —
 * let supabase-js detect and consume them to complete sign-in. */
const isWeb = Platform.OS === 'web';

/**
 * Public config. The anon key is safe in the bundle — Row Level Security is
 * the real access control. Read from EXPO_PUBLIC_* env, with a fallback to
 * app.json `extra` for flexibility.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

/** True when real credentials are configured. Screens can use this to show a
 * friendly "connect Supabase" state instead of crashing during Phase 1. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY not set. ' +
      'Copy .env.example to .env and fill them in. Auth and data features ' +
      'are disabled until then.',
  );
}

export const supabase = createClient(
  // Fall back to harmless placeholders so createClient doesn't throw when the
  // app is first booted before credentials are wired up.
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isWeb,
    },
  },
);
