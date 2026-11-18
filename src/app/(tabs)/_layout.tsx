import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { View } from 'react-native';
import { useKid, useRequests, useToysById } from '../../api';
import { IconName } from '../../components/ui';
import { useApp } from '../../store';
import { C, F } from '../../theme';

function icon(on: IconName, off: IconName) {
  const TabIcon = ({ focused, color }: { focused: boolean; color: unknown }) => <Ionicons name={focused ? on : off} size={25} color={color as string} />;
  return TabIcon;
}

export default function TabsLayout() {
  const { userId } = useApp();
  const kid = useKid(userId);
  const reqs = useRequests();
  const ids = (reqs.data ?? []).map((r) => r.toy_id).filter((x): x is number => x != null);
  const toys = useToysById(ids);
  if (kid.data && !kid.data.promise_at) return <Redirect href="/promise" />;
  // badge: things waiting, plus questions/requests about my toys
  const mine = new Set((toys.data ?? []).filter((t) => t.ownerId === userId).map((t) => t.id));
  const n = (reqs.data ?? []).filter((r) => r.status === 'waiting' && (r.kid_id === userId || (r.toy_id != null && mine.has(r.toy_id)))).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.acc,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.heavy, fontSize: 11 },
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="stories" options={{ title: 'Stories', tabBarIcon: icon('images', 'images-outline') }} />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarAccessibilityLabel: 'Sell or swap a toy',
          tabBarIcon: () => (
            <View style={{ width: 58, height: 58, marginTop: -22, borderRadius: 999, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: C.accDark }}>
              <Ionicons name="add" size={32} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{ title: 'Requests', tabBarIcon: icon('notifications', 'notifications-outline'), tabBarBadge: n || undefined, tabBarBadgeStyle: { backgroundColor: C.acc, fontFamily: F.heavy } }}
      />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
