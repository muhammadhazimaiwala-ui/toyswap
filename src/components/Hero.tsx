import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import { ToyArt } from './ToyArt';
import { Logo } from './ui';

/** Sunny header with floating toys, used on the log-in and sign-up screens. */
export function AuthHero({ compact }: { compact?: boolean }) {
  const h = compact ? 200 : 320;
  return (
    <View style={[st.hero, { height: h, paddingBottom: compact ? 24 : 44 }]} accessibilityRole="header">
      <View style={[st.deco, { left: 18, top: 26, transform: [{ rotate: '-12deg' }] }]}><ToyArt art="bear" size={compact ? 56 : 76} /></View>
      <View style={[st.deco, { right: 22, top: 18, transform: [{ rotate: '16deg' }] }]}><ToyArt art="rocket" size={compact ? 54 : 72} /></View>
      <View style={[st.deco, { right: 22, bottom: compact ? 30 : 38, transform: [{ rotate: '-6deg' }] }]}><ToyArt art="car" size={compact ? 54 : 70} /></View>
      <View style={[st.deco, { left: 24, bottom: compact ? 34 : 42, transform: [{ rotate: '10deg' }] }]}><ToyArt art="blocks" size={compact ? 44 : 56} /></View>
      <Logo size={compact ? 48 : 64} />
      <Text style={[st.name, compact && { fontSize: 34 }]}>ToySwap</Text>
      {!compact ? <Text style={st.tag}>Play it. Care for it. Pass it on.</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.sun, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  deco: { position: 'absolute' },
  name: { fontFamily: F.displayBold, fontSize: 44, color: C.ink, letterSpacing: -0.5 },
  tag: { fontFamily: F.heavy, fontSize: 16, color: '#3D3A10' },
});
