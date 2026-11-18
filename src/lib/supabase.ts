import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Set these in a .env file (see .env.example) or as GitHub repository variables for the builds.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const configured = SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.length > 20;

export const supabase = createClient(configured ? SUPABASE_URL : 'https://placeholder.supabase.co', configured ? SUPABASE_KEY : 'placeholder-key-placeholder', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Keep the login fresh only while the app is open (recommended by Supabase for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const KID_EMAIL_DOMAIN = 'kids.toyswap.app';
export const kidEmail = (nickname: string) => `${nickname.trim().toLowerCase()}@${KID_EMAIL_DOMAIN}`;

export const photoUrl = (path: string | null | undefined) =>
  path ? supabase.storage.from('toy-photos').getPublicUrl(path).data.publicUrl : null;

/** Turn a Supabase/Postgres error into the plain sentence our database functions raise. */
export const errText = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/failed to fetch|network request failed/i.test(m)) return 'No connection. Check your internet and try again.';
  return m || 'Something went wrong. Please try again.';
};

/** Call one of our server functions with the signed-in user's token. */
export async function callFunction<T = Record<string, unknown>>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') msg = ((await ctx.json()) as { error?: string }).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  if (data && typeof data === 'object' && 'error' in data) throw new Error(String((data as { error: unknown }).error));
  return data as T;
}
