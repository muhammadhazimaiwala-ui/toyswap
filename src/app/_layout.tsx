import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { UpdateBanner } from '../components/UpdateBanner';
import { configured } from '../lib/supabase';
import { AppProvider, useApp } from '../store';
import { C, F } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function NotConfigured() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12, paddingTop: 80 }}>
      <Text style={{ fontFamily: F.display, fontSize: 28, color: C.ink }}>ToySwap needs its database</Text>
      <Text style={{ fontFamily: F.body, fontSize: 16, color: C.muted, lineHeight: 23 }}>
        Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (in a .env file, or as GitHub repository variables for the builds), then start the app again. See README.md.
      </Text>
    </ScrollView>
  );
}

function Root() {
  const { session, loading, role } = useApp();
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
  const ready = fontsLoaded && !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.sun }} />;
  if (!configured) return <NotConfigured />;
  const signedIn = !!session;
  const kid = signedIn && role === 'kid';
  const parent = signedIn && role === 'parent';

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={kid} redirectTo={parent ? '/parent' : '/login'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="promise" />
        </Stack.Protected>
        <Stack.Protected guard={parent} redirectTo={kid ? '/' : '/login'}>
          <Stack.Screen name="parent" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn} redirectTo="/login">
          <Stack.Screen name="toy/[id]" />
          <Stack.Screen name="safety" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo={parent ? '/parent' : '/'}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>
      </Stack>
      <UpdateBanner />
    </>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
