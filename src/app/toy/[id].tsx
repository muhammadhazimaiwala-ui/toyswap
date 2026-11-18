import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rpc, useAction, useKid, useMyToys, useQuestions, useRequests, useSaved, useToy, useToys, ANSWERS } from '../../api';
import { ToyTile } from '../../components/ToyArt';
import { ToyCard } from '../../components/ToyCard';
import { Btn, Card, Chip, Face, H1, H2, IconBtn, Note, Option, P, Pill, Sheet, Small } from '../../components/ui';
import { QUESTIONS } from '../../data';
import { useApp } from '../../store';
import { C, F, money } from '../../theme';

export default function ToyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toyId = Number(id);
  const { userId, role, toast } = useApp();
  const isKid = role === 'kid';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 700);
  const toyQ = useToy(toyId);
  const kidQ = useKid(isKid ? userId : null);
  const savedQ = useSaved(isKid ? userId : null);
  const reqQ = useRequests();
  const mineQ = useMyToys(isKid ? userId : null);
  const qQ = useQuestions();
  const allQ = useToys();
  const { run, busy } = useAction(toast);
  const [page, setPage] = useState(0);
  const [checkout, setCheckout] = useState(false);
  const [hand, setHand] = useState<'meetup' | 'delivery'>('meetup');
  const [swapOpen, setSwapOpen] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const t = toyQ.data;

  const back = () => (router.canGoBack() ? router.back() : router.replace(isKid ? '/' : '/parent'));

  if (toyQ.isLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.acc} /></View>;
  if (!t || t.status === 'removed') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 16, padding: 16, gap: 12 }}>
        <IconBtn icon="chevron-back" label="Go back" onPress={back} />
        <H1>This toy isn’t here any more</H1>
        <P muted>It may have found a new home.</P>
      </View>
    );
  }

  const mine = t.ownerId === userId;
  const saved = (savedQ.data ?? []).includes(t.id);
  const pend = (reqQ.data ?? []).find((r) => r.toy_id === t.id && r.kid_id === userId && (r.status === 'waiting' || r.status === 'approved') && (r.type === 'buy' || r.type === 'swap'));
  const offers = (mineQ.data ?? []).filter((x) => x.ownerId === userId && x.status === 'live' && x.id !== t.id);
  const asked = (qQ.data ?? []).find((q) => q.toy_id === t.id && q.from_kid === userId);
  const related = (allQ.data ?? []).filter((x) => x.id !== t.id).sort((a, b) => Number(b.cat === t.cat) - Number(a.cat === t.cat)).slice(0, 4);
  const cardW = Math.floor((W - 32 - 12) / 2);
  const limit = (kidQ.data?.spend_limit_cents ?? 0) / 100;

  const toggleSave = () => run(async () => { if (await rpc('toggle_saved', { p_toy: t.id })) toast('Saved to your wishlist'); });
  const startBuy = () => {
    if (!t.price) return;
    if (t.price > limit) return toast(`That’s over your ${money(limit)} limit. Ask your parent.`);
    setHand('meetup');
    setCheckout(true);
  };
  const confirmBuy = async () => {
    if (await run(() => rpc('request_buy', { p_toy: t.id, p_handover: hand }))) {
      setCheckout(false);
      toast('Sent! Your parent and the seller’s parent will both check it.');
    }
  };
  const openSwap = () => {
    if (kidQ.data && !kidQ.data.can_swap) return toast('Swaps are turned off. Ask your parent.');
    setPick(null);
    setSwapOpen(true);
  };
  const sendSwap = async () => {
    if (pick == null) return;
    if (await run(() => rpc('request_swap', { p_toy: t.id, p_offer: pick }))) {
      setSwapOpen(false);
      toast('Swap offer sent! Both parents will check it.');
    }
  };
  const remove = async () => {
    if (await run(() => rpc('remove_toy', { p_toy: t.id }))) {
      toast('Taken off ToySwap');
      back();
    }
  };
  const ask = (i: number) => run(async () => { await rpc('ask_question', { p_toy: t.id, p_question: i }); toast('Question sent!'); });
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / W));

  const footer = (() => {
    if (!isKid) return <Note icon="eye-outline">You’re viewing as a parent. Kids ask to buy or swap from their own account.</Note>;
    if (mine)
      return t.status === 'live' || t.status === 'pending' ? (
        <>
          {t.status === 'pending' ? <Note icon="time-outline" bg={C.ys} fg={C.yi}>Waiting for your parent to say yes. Then other kids can see it.</Note> : null}
          <Btn label="Take it off ToySwap" kind="ghost" icon="trash-outline" onPress={remove} disabled={busy} />
        </>
      ) : null;
    if (t.soldTo === userId) return <Note icon="heart-outline">This toy is yours now! Take good care of it.</Note>;
    if (t.status !== 'live') return <Note icon="heart-outline">This toy has found a new home.</Note>;
    if (pend)
      return (
        <Note icon="people-outline" bg={C.ys} fg={C.yi}>
          {pend.status === 'approved' ? 'Both parents said yes! Waiting for your parent to pay.' : `Your ${pend.type === 'buy' ? 'buy request' : 'swap offer'} is waiting for the parents.`}
        </Note>
      );
    return (
      <View style={{ gap: 10 }}>
        {t.price ? <Btn label={`Ask to buy for ${money(t.price)}`} onPress={startBuy} /> : null}
        {t.swap ? <Btn label="Offer a swap" kind="outline" icon="swap-horizontal" onPress={openSwap} /> : null}
      </View>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, maxWidth: 700, width: '100%', alignSelf: 'center' }}>
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64}>
            {(t.photo ? [0] : [0, 1, 2]).map((i) => (
              <ToyTile key={i} toy={t} size={W} radius={0} zoom={i === 1} plain={i === 2} />
            ))}
          </ScrollView>
          <View style={[st.topBtns, { top: insets.top + 8 }]}>
            <IconBtn icon="chevron-back" label="Go back" onPress={back} />
            {isKid && !mine ? <IconBtn icon={saved ? 'heart' : 'heart-outline'} color={C.acc} label={saved ? 'Remove from wishlist' : 'Save to wishlist'} onPress={toggleSave} /> : null}
          </View>
          {!t.photo ? (
            <View style={st.dots} accessibilityLabel={`Picture ${page + 1} of 3`}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[st.dot, page === i && { width: 22, backgroundColor: C.ink }]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={st.body}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Pill label={t.cond} bg={C.gs} fg={C.gi} />
              <Pill label={t.cat} bg={C.soft} fg={C.muted} />
              {t.status === 'reserved' ? <Pill label="On hold" bg={C.ys} fg={C.yi} /> : null}
            </View>
            <H1>{t.name}</H1>
            <View style={st.row}>
              <Face color={t.sellerColor} size={22} />
              <Text style={st.meta}>by {mine ? 'you' : t.seller}</Text>
              <Text style={st.meta}>· {t.sellerTrades} trades</Text>
            </View>
          </View>

          <Card>
            <View style={[st.row, { gap: 10 }]}>
              {t.price ? <Text style={st.price}>{money(t.price)}</Text> : null}
              {t.swap ? <Pill label={t.price ? 'Swap also OK' : 'Swap only'} bg={C.gs} fg={C.gi} icon="swap-horizontal" /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['Used for', t.used], ['Condition', t.cond], ['Good for', 'Ages ' + t.age]].map(([l, v]) => (
                <View key={l} style={st.fact}>
                  <Text style={st.factL}>{l}</Text>
                  <Text style={st.factV}>{v}</Text>
                </View>
              ))}
            </View>
            {footer}
            <View style={{ gap: 8 }}>
              {[
                ['location-outline', 'Meet-up with parents at a safe public place', C.oi],
                ['car-outline', 'Or delivery arranged by a parent', C.bi],
                ['people-outline', 'Both families’ parents approve first', C.gi],
              ].map(([i, l, c]) => (
                <View key={l} style={st.row}>
                  <Ionicons name={i as React.ComponentProps<typeof Ionicons>['name']} size={20} color={c} />
                  <Text style={[st.meta, { color: C.ink, flex: 1 }]}>{l}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <H2>{mine ? 'Your' : `${t.seller}’s`} care check</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
              {['Cleaned', 'All parts there', 'Not broken', 'Works fine'].map((c) => (
                <View key={c} style={[st.row, { width: '50%' }]}>
                  <View style={st.ok}><Ionicons name="checkmark" size={16} color="#fff" /></View>
                  <Text style={[st.meta, { color: C.ink }]}>{c}</Text>
                </View>
              ))}
            </View>
          </Card>

          {t.note ? (
            <Card style={{ backgroundColor: C.ys }}>
              <Small style={{ color: C.yi }}>NOTE FROM {(mine ? 'you' : t.seller).toUpperCase()}</Small>
              <P>{t.note}</P>
            </Card>
          ) : null}

          {isKid && !mine && t.status === 'live' ? (
            <Card>
              <H2>Ask {t.seller}</H2>
              {asked ? (
                <>
                  <P>You asked: “{QUESTIONS[asked.question]}”</P>
                  <P style={{ color: asked.answer != null ? C.gi : C.muted }}>{asked.answer != null ? `${t.seller}: “${ANSWERS[asked.answer]}”` : 'Waiting for an answer…'}</P>
                </>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {QUESTIONS.map((q, i) => (
                    <Chip key={q} label={q} onPress={() => ask(i)} />
                  ))}
                </View>
              )}
              <View style={st.row}>
                <Ionicons name="shield-checkmark-outline" size={18} color={C.blue} />
                <Small>Only ready-made messages, so everyone stays safe.</Small>
              </View>
            </Card>
          ) : null}

          {related.length ? (
            <View style={{ gap: 12, marginTop: 8 }}>
              <H2>You might also like</H2>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {related.map((x) => (
                  <ToyCard key={x.id} toy={x} width={cardW} saved={(savedQ.data ?? []).includes(x.id)} canSave={isKid} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Sheet visible={checkout} onClose={() => setCheckout(false)} title="Ask to buy">
        <View style={st.sumToy}>
          <ToyTile toy={t} size={64} radius={14} />
          <View style={{ flex: 1 }}>
            <Text style={st.optTitle}>{t.name}</Text>
            <Small>from {t.seller} · {t.cond}</Small>
          </View>
          <Text style={[st.price, { fontSize: 24 }]}>{money(t.price ?? 0)}</Text>
        </View>
        <Text style={st.optTitle}>How will you get it?</Text>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          <Option title="Meet-up with parents" sub="At a library, mall or other public place" on={hand === 'meetup'} onPress={() => setHand('meetup')} left={<View style={st.optIcon}><Ionicons name="location-outline" size={22} color={C.ink} /></View>} />
          <Option title="Parent-arranged delivery" sub="Your parent sorts out the delivery" on={hand === 'delivery'} onPress={() => setHand('delivery')} left={<View style={st.optIcon}><Ionicons name="car-outline" size={22} color={C.ink} /></View>} />
        </View>
        <View style={st.sum}>
          {[
            ['1', 'Your parent says yes'],
            ['2', `${t.seller}’s parent says yes`],
            ['3', `Your parent pays ${money(t.price ?? 0)} by card`],
          ].map(([n, l]) => (
            <View key={n} style={st.row}>
              <View style={st.stepN}><Text style={st.stepNText}>{n}</Text></View>
              <Text style={[st.meta, { color: C.ink, flex: 1 }]}>{l}</Text>
            </View>
          ))}
        </View>
        <Btn label={busy ? 'Sending…' : 'Send to the parents'} icon="people-outline" onPress={confirmBuy} disabled={busy} />
        <Small style={{ textAlign: 'center' }}>You never pay or type card details. Your parent does that.</Small>
      </Sheet>

      <Sheet visible={swapOpen} onClose={() => setSwapOpen(false)} title="Pick a toy to offer">
        <P muted>These are your toys that other kids can see. {t.seller} can say yes or no.</P>
        {offers.length ? (
          <>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {offers.map((o) => (
                <Option key={o.id} title={o.name} sub={`${o.cond} · used ${o.used}`} on={pick === o.id} onPress={() => setPick(o.id)} left={<ToyTile toy={o} size={56} radius={14} />} />
              ))}
            </View>
            <Btn label={busy ? 'Sending…' : 'Send swap offer'} kind="blue" onPress={sendSwap} disabled={pick === null || busy} />
          </>
        ) : (
          <>
            <P>You don’t have any toys listed yet (or they’re still waiting for your parent).</P>
            <Btn label="List a toy first" onPress={() => { setSwapOpen(false); router.push('/sell'); }} />
          </>
        )}
        <Small style={{ textAlign: 'center' }}>Both parents approve before a swap happens.</Small>
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  dots: { position: 'absolute', bottom: 34, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#fff' },
  body: { marginTop: -24, backgroundColor: C.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingTop: 22, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  meta: { fontFamily: F.bold, fontSize: 14, color: C.muted },
  price: { fontFamily: F.displayBold, fontSize: 36, color: C.ink },
  fact: { flex: 1, backgroundColor: C.soft, borderRadius: 14, padding: 10 },
  factL: { fontFamily: F.heavy, fontSize: 11, color: C.muted },
  factV: { fontFamily: F.heavy, fontSize: 15, color: C.ink, marginTop: 2 },
  ok: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  sumToy: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.soft, borderRadius: 18, padding: 10 },
  optTitle: { fontFamily: F.heavy, fontSize: 16, color: C.ink },
  optIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  sum: { backgroundColor: C.soft, borderRadius: 16, padding: 14, gap: 10 },
  stepN: { width: 26, height: 26, borderRadius: 999, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  stepNText: { fontFamily: F.heavy, fontSize: 13, color: '#fff' },
});
