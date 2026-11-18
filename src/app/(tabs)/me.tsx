import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rpc, Toy, useAction, useKid, useMyToys, useSaved, useToysById } from '../../api';
import { ToyTile } from '../../components/ToyArt';
import { Bar, Btn, Card, Chip, Face, H1, H2, P, Pill, Screen, Small } from '../../components/ui';
import { GOALS } from '../../data';
import { supabase } from '../../lib/supabase';
import { badgeName, useApp } from '../../store';
import { C, F, money } from '../../theme';

export default function Me() {
  const { userId, toast } = useApp();
  const router = useRouter();
  const kidQ = useKid(userId);
  const mineQ = useMyToys(userId);
  const savedQ = useSaved(userId);
  const savedToys = useToysById(savedQ.data ?? []);
  const { run } = useAction(toast);
  const [goalOpen, setGoalOpen] = useState(false);
  const k = kidQ.data;
  if (!k) return <Screen><P muted>Loading…</P></Screen>;

  const earned = k.earned_cents / 100;
  const target = k.goal_cents / 100;
  const pct = Math.min(100, Math.round((earned / target) * 100));
  const all = mineQ.data ?? [];
  const mine = all.filter((t) => t.ownerId === userId && t.status !== 'declined');
  const got = all.filter((t) => t.soldTo === userId);
  const saved = (savedToys.data ?? []).filter((t) => t.status === 'live');
  const badges: [string, boolean, string, string][] = [
    ['Clean Keeper', k.care_score >= 75, C.gs, C.gi],
    ['Toy Guardian', k.care_score >= 90, C.gs, C.gi],
    ['First Trade', k.trades >= 1, C.bs, C.bi],
    ['Super Trader', k.trades >= 8, C.ps, C.pi],
    ['Savings Star', pct >= 100, C.ys, C.yi],
  ];
  const status = (t: Toy) =>
    t.soldTo === userId ? <Pill label="Yours now" bg={C.bs} fg={C.bi} /> :
    ({ live: <Pill label="For sale" bg={C.gs} fg={C.gi} />, pending: <Pill label="Waiting for parent" bg={C.ys} fg={C.yi} />, reserved: <Pill label="On hold" bg={C.ys} fg={C.yi} />, sold: <Pill label="New home" bg={C.soft} fg={C.muted} /> } as Record<string, React.ReactNode>)[t.status] ?? null;

  const Row = ({ t }: { t: Toy }) => (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/toy/[id]', params: { id: String(t.id) } })} style={st.item}>
      <ToyTile toy={t} size={56} radius={14} />
      <View style={{ flex: 1 }}>
        <Text style={st.itemTitle} numberOfLines={1}>{t.name}</Text>
        <Small>{[t.price ? money(t.price) : '', t.swap ? 'swap' : ''].filter(Boolean).join(' or ')}</Small>
      </View>
      {status(t)}
    </Pressable>
  );

  return (
    <Screen refreshing={kidQ.isRefetching} onRefresh={() => { kidQ.refetch(); mineQ.refetch(); savedQ.refetch(); }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Face color={k.avatar} size={72} />
        <View style={{ flex: 1 }}>
          <H1>{k.nickname}</H1>
          <Small>{k.age_group} · {k.trades} trades</Small>
        </View>
      </View>

      <Card style={{ backgroundColor: C.gs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Small style={{ color: C.gi }}>CARE SCORE</Small>
            <Text style={[st.big, { color: C.greenDark }]}>{k.care_score} · {badgeName(k.care_score)}</Text>
          </View>
          <Ionicons name="shield-checkmark" size={40} color={C.green} />
        </View>
        <Bar pct={k.care_score} track="#fff" />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H2>My savings goal</H2>
          <Chip label={goalOpen ? 'Done' : 'Change'} onPress={() => setGoalOpen(!goalOpen)} />
        </View>
        {goalOpen ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GOALS.map(([g, v]) => (
              <Chip key={g} label={`${g} · ${money(v)}`} on={k.goal_name === g} onPress={() => { run(() => rpc('set_goal', { p_name: g, p_cents: v * 100 })); setGoalOpen(false); }} />
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={st.big}>{k.goal_name}</Text>
          <Text style={st.itemTitle}>{money(earned)} of {money(target)}</Text>
        </View>
        <Bar pct={pct} color={C.acc} height={16} />
        <Small>{pct >= 100 ? 'You did it! Ask your parent to help you get it.' : `${money(Math.max(0, target - earned))} to go. Money from your sales goes to your parent’s account for you.`}</Small>
      </Card>

      <Card>
        <H2>Badges</H2>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {badges.map(([n, on, bg, fg]) => (
            <View key={n} style={[st.badge, { backgroundColor: on ? bg : C.soft }]} accessibilityLabel={`${n}${on ? '' : ', locked'}`}>
              <Ionicons name={on ? 'star' : 'lock-closed-outline'} size={26} color={on ? fg : C.muted} />
              <Text style={[st.badgeText, { color: on ? fg : C.muted }]}>{n}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <H2>My toys</H2>
        {mine.length ? mine.map((t) => <Row key={t.id} t={t} />) : <P muted>No toys yet.</P>}
        <Btn label="List a toy" icon="add" onPress={() => router.navigate('/sell')} />
      </Card>

      {got.length ? (
        <Card>
          <H2>Toys I got</H2>
          {got.map((t) => <Row key={t.id} t={t} />)}
        </Card>
      ) : null}

      <Card>
        <H2>Wishlist</H2>
        {saved.length ? saved.map((t) => <Row key={t.id} t={t} />) : <P muted>Tap the heart on a toy to save it here.</P>}
      </Card>

      <Card>
        <Btn label="Safety rules" kind="ghost" icon="shield-checkmark-outline" onPress={() => router.push('/safety')} />
        <Btn label="Log out" kind="ghost" icon="log-out-outline" onPress={() => supabase.auth.signOut()} />
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  big: { fontFamily: F.display, fontSize: 24, color: C.ink },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.soft, borderRadius: 16, padding: 8, paddingRight: 12 },
  itemTitle: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  badge: { width: '30%', flexGrow: 1, borderRadius: 18, padding: 12, alignItems: 'center', gap: 6 },
  badgeText: { fontFamily: F.heavy, fontSize: 13, textAlign: 'center' },
});
