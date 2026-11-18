import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from './api';
import { C, F } from './theme';

type Ctx = {
  session: Session | null;
  loading: boolean;
  role: 'kid' | 'parent' | null;
  userId: string | null;
  toast: (msg: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

function Inner({ children }: { children: React.ReactNode }) {
  const auth = useSession();
  const [msg, setMsg] = useState('');
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const toast = useCallback(
    (m: string) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      }, 3200);
    },
    [anim]
  );

  return (
    <AppCtx.Provider value={{ ...auth, toast }}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[st.toast, { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}
      >
        <Ionicons name="information-circle" size={22} color="#fff" />
        <Text style={st.toastText}>{msg}</Text>
      </Animated.View>
    </AppCtx.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Inner>{children}</Inner>
    </QueryClientProvider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}

export const badgeName = (c: number) => (c >= 90 ? 'Toy Guardian' : c >= 75 ? 'Clean Keeper' : 'Toy Helper');

const st = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: C.night, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 100 },
  toastText: { color: '#fff', fontFamily: F.heavy, fontSize: 15, flex: 1 },
});
