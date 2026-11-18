import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, H2, P, Screen } from '../components/ui';
import { PROMISES, SAFETY } from '../data';
import { C, F } from '../theme';

export default function Safety() {
  return (
    <Screen title="Safety and care" back>
      <P muted style={{ marginTop: -8 }}>How ToySwap keeps kids safe and toys happy.</P>
      <Card>
        <H2>Safety rules</H2>
        {SAFETY.map((x) => (
          <View key={x} style={st.row}>
            <Ionicons name="shield-checkmark-outline" size={22} color={C.blue} />
            <Text style={st.text}>{x}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ backgroundColor: C.gs }}>
        <H2 style={{ color: C.greenDark }}>The Care Promise</H2>
        {PROMISES.map((x) => (
          <View key={x} style={st.row}>
            <View style={st.ok}><Ionicons name="checkmark" size={16} color="#fff" /></View>
            <Text style={st.text}>{x}</Text>
          </View>
        ))}
        <P style={{ color: C.greenDark }}>Play with your toys as much as you like. Just keep them clean and complete, so one day they can make another kid happy too.</P>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  text: { flex: 1, fontFamily: F.bold, fontSize: 15, lineHeight: 21, color: C.ink },
  ok: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
