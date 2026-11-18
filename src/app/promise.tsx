import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { rpc, useAction, useKid } from '../api';
import { ToyArt } from '../components/ToyArt';
import { Btn, H1, P, Screen, Tick } from '../components/ui';
import { PROMISES } from '../data';
import { useApp } from '../store';

export default function Promise() {
  const { userId, toast } = useApp();
  const kid = useKid(userId);
  const router = useRouter();
  const { run, busy } = useAction(toast);
  const [on, setOn] = useState([false, false, false, false]);
  const all = on.every(Boolean);

  const done = async () => {
    if (await run(() => rpc('accept_promise'))) {
      toast(`Welcome to ToySwap, ${kid.data?.nickname ?? 'friend'}!`);
      router.replace('/');
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 20 }}>
        <View style={st.bear}><ToyArt art="bear" size={100} /></View>
        <H1 style={{ textAlign: 'center' }}>The ToySwap Care Promise</H1>
        <P muted style={{ textAlign: 'center' }}>Play as much as you like! A toy that’s looked after can make another kid happy too.</P>
      </View>
      <View style={{ gap: 8 }}>
        {PROMISES.map((p, i) => (
          <Tick key={p} label={p} on={on[i]} onPress={() => setOn(on.map((v, j) => (j === i ? !v : v)))} />
        ))}
      </View>
      <Btn label={busy ? 'Saving…' : 'I promise! Let’s go'} kind="green" onPress={done} disabled={!all || busy} />
      {!all ? <P muted style={{ textAlign: 'center', fontSize: 14 }}>Tick all four promises to start.</P> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  bear: { width: 130, height: 130, borderRadius: 999, backgroundColor: '#FFF3C4', alignItems: 'center', justifyContent: 'center' },
});
