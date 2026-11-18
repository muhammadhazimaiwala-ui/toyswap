import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ANSWERS, Req, rpc, timeAgo, Toy, useAction, useQuestions, useRequests, useToysById } from '../../api';
import { ToyArt, ToyTile } from '../../components/ToyArt';
import { Btn, Card, Chip, H2, P, Pill, Screen, Small } from '../../components/ui';
import { QUESTIONS } from '../../data';
import { useApp } from '../../store';
import { C, F, money } from '../../theme';

export default function Requests() {
  const { userId, toast } = useApp();
  const router = useRouter();
  const reqQ = useRequests();
  const qQ = useQuestions();
  const { run } = useAction(toast);
  const reqs = reqQ.data ?? [];
  const questions = qQ.data ?? [];
  const ids = [...new Set([...reqs.flatMap((r) => [r.toy_id, r.offer_toy_id]), ...questions.map((q) => q.toy_id)].filter((x): x is number => x != null))];
  const toysQ = useToysById(ids);
  const toy = (id: number | null) => (toysQ.data ?? []).find((t) => t.id === id);

  const mineAsked = reqs.filter((r) => r.kid_id === userId);
  const aboutMine = reqs.filter((r) => r.kid_id !== userId && (r.type === 'buy' || r.type === 'swap') && toy(r.toy_id)?.ownerId === userId);
  const toAnswer = questions.filter((q) => q.answer == null && toy(q.toy_id)?.ownerId === userId);

  const label = (r: Req, t?: Toy) => {
    const n = t?.name ?? 'a toy';
    return r.type === 'listing' ? `List ${n}` : r.type === 'buy' ? `Buy ${n}` : r.type === 'swap' ? `Swap for ${n}` : `Story about ${n}`;
  };
  const pill = (r: Req) => {
    if (r.status === 'waiting') return <Pill label="Waiting" bg={C.ys} fg={C.yi} icon="time-outline" />;
    if (r.status === 'approved') return <Pill label={r.type === 'buy' ? 'Paying' : 'Approved'} bg={C.bs} fg={C.bi} icon="card-outline" />;
    if (r.status === 'paid') return <Pill label="Done!" bg={C.gs} fg={C.gi} icon="checkmark" />;
    if (r.status === 'declined') return <Pill label="Not this time" bg={C.soft} fg={C.muted} />;
    return <Pill label="Cancelled" bg={C.soft} fg={C.muted} />;
  };
  const sub = (r: Req) => {
    if (r.type === 'buy') return `${money((r.amount_cents ?? 0) / 100)} · ${r.handover === 'delivery' ? 'Delivery' : 'Meet-up'} · ${timeAgo(r.created_at)}`;
    if (r.type === 'swap') return `Your ${toy(r.offer_toy_id)?.name ?? 'toy'} · ${timeAgo(r.created_at)}`;
    return timeAgo(r.created_at);
  };
  const Row = ({ r }: { r: Req }) => {
    const t = toy(r.toy_id);
    return (
      <Pressable accessibilityRole="button" disabled={!t} onPress={() => t && router.push({ pathname: '/toy/[id]', params: { id: String(t.id) } })} style={st.item}>
        {t ? <ToyTile toy={t} size={60} radius={14} /> : <View style={st.gone}><ToyArt art="blocks" size={44} /></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={st.title} numberOfLines={2}>{label(r, t)}</Text>
          <Small>{sub(r)}</Small>
        </View>
        {pill(r)}
      </Pressable>
    );
  };

  const refresh = () => { reqQ.refetch(); qQ.refetch(); toysQ.refetch(); };

  return (
    <Screen title="Requests" refreshing={reqQ.isRefetching} onRefresh={refresh}>
      {reqQ.isLoading ? <ActivityIndicator color={C.acc} /> : null}

      {toAnswer.length ? (
        <Card style={{ backgroundColor: C.bs }}>
          <H2 style={{ color: C.bi }}>Kids asked about your toys</H2>
          {toAnswer.map((q) => (
            <View key={q.id} style={{ gap: 8 }}>
              <P>About {toy(q.toy_id)?.name}: “{QUESTIONS[q.question]}”</P>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ANSWERS.map((a, i) => (
                  <Chip key={a} label={a} onPress={() => run(async () => { await rpc('answer_question', { p_id: q.id, p_answer: i }); toast('Answer sent!'); })} />
                ))}
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {aboutMine.length ? (
        <View style={{ gap: 10 }}>
          <H2>Kids who want your toys</H2>
          <Small>Your parent and theirs both decide. You’ll see it here when it’s done.</Small>
          {aboutMine.map((r) => <Row key={r.id} r={r} />)}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <H2>What you asked for</H2>
        {mineAsked.length ? (
          mineAsked.map((r) => <Row key={r.id} r={r} />)
        ) : !reqQ.isLoading ? (
          <Card style={{ alignItems: 'center' }}>
            <P>No requests yet.</P>
            <Btn label="Find a toy" onPress={() => router.navigate('/')} />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 10, paddingRight: 14 },
  title: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  gone: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
});
