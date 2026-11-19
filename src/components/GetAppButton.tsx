import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';

const REPO = process.env.EXPO_PUBLIC_GITHUB_REPO ?? '';
// GitHub always serves the newest release's file at this address.
export const APK_URL = REPO ? `https://github.com/${REPO}/releases/latest/download/ToySwap.apk` : '';

/** Website only: a card that downloads the Android app. Hidden inside the app itself. */
export function GetAppButton({ compact }: { compact?: boolean }) {
  if (Platform.OS !== 'web' || !APK_URL) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Get the ToySwap Android app"
      onPress={() => Linking.openURL(APK_URL)}
      style={({ pressed }) => [st.card, compact && st.compact, pressed && { opacity: 0.85 }]}
    >
      <View style={st.icon}>
        <Ionicons name="logo-android" size={compact ? 22 : 28} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.title}>Get the Android app</Text>
        {!compact ? <Text style={st.sub}>Download ToySwap.apk on your Android phone, then open it to install.</Text> : null}
      </View>
      <Ionicons name="download-outline" size={24} color={C.ink} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 12, borderWidth: 2, borderColor: C.green },
  compact: { paddingVertical: 8 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.heavy, fontSize: 16, color: C.ink },
  sub: { fontFamily: F.bold, fontSize: 13, color: C.muted, lineHeight: 18 },
});
