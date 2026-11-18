import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';

// Set by the GitHub build (see .github/workflows/android-apk.yml). Empty when running locally.
const BUILD = Number(process.env.EXPO_PUBLIC_BUILD_NUMBER ?? '0');
const REPO = process.env.EXPO_PUBLIC_GITHUB_REPO ?? '';

type Latest = { build: number; url: string };

/** On Android, checks GitHub Releases for a newer APK and offers to download it. */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const [latest, setLatest] = useState<Latest | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android' || !BUILD || !REPO) return;
    let alive = true;
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((rel: { tag_name?: string; assets?: { name: string; browser_download_url: string }[] } | null) => {
        const build = Number(/android-(\d+)/.exec(rel?.tag_name ?? '')?.[1] ?? 0);
        const apk = rel?.assets?.find((a) => a.name.endsWith('.apk'));
        if (alive && apk && build > BUILD) setLatest({ build, url: apk.browser_download_url });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!latest || hidden) return null;
  return (
    <View style={[st.wrap, { bottom: insets.bottom + 76 }]} accessibilityLiveRegion="polite">
      <View style={st.icon}>
        <Ionicons name="sparkles" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.title}>New version available</Text>
        <Text style={st.sub}>Tap Update, then open the file to install it.</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => Linking.openURL(latest.url)} style={st.btn}>
        <Text style={st.btnText}>Update</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Later" onPress={() => setHidden(true)} hitSlop={10} style={st.close}>
        <Ionicons name="close" size={20} color={C.muted} />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 12,
    borderWidth: 2,
    borderColor: C.sun,
    shadowColor: '#1C1A3A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  sub: { fontFamily: F.bold, fontSize: 12, color: C.muted },
  btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: F.display, fontSize: 16, color: '#fff' },
  close: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
