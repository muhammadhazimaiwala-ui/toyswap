import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { callFunction, Kid, Req, rpc, timeAgo, useAction, useActivity, useParent, useRequests, useStories, useToysById } from '../api';
import { ToyArt, ToyTile } from '../components/ToyArt';
import { Btn, Card, Chip, Face, Field, H2, Note, P, Pill, Screen, Small } from '../components/ui';
import { AGES, AVATARS } from '../data';
import { errText, supabase } from '../lib/supabase';
import { useApp } from '../store';
import { C, F, money } from '../theme';

async function openUrl(url: string) {
  if (Platform.OS === 'web') window.location.href = url;
  else await WebBrowser.openBrowserAsync(url);
}

function AddKid({ onDone }: { onDone: () => void }) {
  const { toast } = useApp();
  const [nick, setNick] = useState('');
  const [pw, setPw] = useState('');
  const [av, setAv] = useState(0);
  const [age, setAge] = useState(1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr('');
    if (!/^[A-Za-z0-9]{3,16}$/.test(nick)) return setErr('The nickname needs 3 to 16 letters or numbers, with no spaces.');
    if (pw.length < 6) return setErr('The password needs at least 6 characters.');
    setBusy(true);
    try {
      await callFunction('create-kid', { nickname: nick, password: pw, avatar: AVATARS[av][1], age_group: AGES[age] });
      toast(`${nick} can now log in on their own device with “I’m a Kid”.`);
      setNick('');
      setPw('');
      onDone();
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <H2>Add a kid</H2>
      <P muted style={{ fontSize: 14 }}>Your kid logs in with this nickname and password. Other kids only ever see the nickname and avatar.</P>
      {err ? <Text style={st.err}>{err}</Text> : null}
      <Field label="Fun nickname" value={nick} onChangeText={setNick} autoCapitalize="none" autoCorrect={false} maxLength={16} placeholder="e.g. RocketRiya"
        help={<Small style={{ color: C.bi }}>Never a real name, school or address.</Small>} />
      <Field label="Kid’s password" value={pw} onChangeText={setPw} secureTextEntry placeholder="At least 6 characters" />
      <Text style={st.label}>Avatar</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {AVATARS.map(([n, c], i) => (
          <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${n} avatar`} accessibilityState={{ checked: av === i }} onPress={() => setAv(i)} style={[st.av, av === i && { borderColor: C.ink }]}>
            <Face color={c} size={40} />
          </Pressable>
        ))}
      </View>
      <Text style={st.label}>Age group</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {AGES.map((a, i) => (
          <Chip key={a} label={a} on={age === i} onPress={() => setAge(i)} style={{ flex: 1, paddingHorizontal: 4 }} />
        ))}
      </View>
      <Btn label={busy ? 'Adding…' : 'Add kid'} icon="person-add-outline" onPress={save} disabled={busy} />
    </Card>
  );
}

export default function Parent() {
  const { userId, session, toast } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ payouts?: string; paid?: string }>();
  const pq = useParent(userId);
  const reqQ = useRequests();
  const storiesQ = useStories();
  const { run, busy } = useAction(toast);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const kids = pq.data?.kids ?? [];
  const parent = pq.data?.parent;
  const myKidIds = kids.map((k) => k.id);
  const reqs = reqQ.data ?? [];
  const toyIds = [...new Set(reqs.flatMap((r) => [r.toy_id, r.offer_toy_id]).filter((x): x is number => x != null))];
  const toysQ = useToysById(toyIds);
  const toy = (id: number | null) => (toysQ.data ?? []).find((t) => t.id === id);
  const activity = useActivity(myKidIds);
  const kid = kids.find((k) => k.id === sel) ?? kids[0];
  const nameOf = (id: string) => kids.find((k) => k.id === id)?.nickname ?? 'a kid';

  // finish sign-up after email confirmation
  useEffect(() => {
    if (pq.isSuccess && !pq.data.parent && session) {
      const m = session.user.user_metadata ?? {};
      rpc('parent_setup', { p_full_name: m.full_name ?? 'Parent', p_country: m.country ?? 'United States' }).then(() => pq.refetch(), () => {});
    }
  }, [pq.isSuccess, pq.data, session, pq]);

  // back from Stripe on the website
  useEffect(() => {
    if (params.payouts === 'done') callFunction<{ ready: boolean }>('stripe-connect', { action: 'status' }).then((r) => { toast(r.ready ? 'Payouts are ready!' : 'Stripe still needs a few details from you.'); pq.refetch(); }, () => {});
    if (params.paid && params.paid !== 'cancelled') toast('Payment received. Thank you! The toy is on its way.');
  }, [params.payouts, params.paid, toast, pq]);

  const mySide = (r: Req) => {
    const t = toy(r.toy_id);
    const buyer = myKidIds.includes(r.kid_id);
    const seller = !!t && myKidIds.includes(t.ownerId);
    return { buyer, seller, t };
  };
  const needsMe = reqs.filter((r) => {
    if (r.status !== 'waiting') return false;
    if (r.type === 'listing' || r.type === 'story') return myKidIds.includes(r.kid_id);
    const { buyer, seller } = mySide(r);
    return (buyer && r.buyer_parent_ok == null) || (seller && r.seller_parent_ok == null);
  });
  const waitingOther = reqs.filter((r) => r.status === 'waiting' && (r.type === 'buy' || r.type === 'swap') && !needsMe.includes(r));
  const toPay = reqs.filter((r) => r.type === 'buy' && r.status === 'approved' && myKidIds.includes(r.kid_id));
  const sellingApproved = reqs.filter((r) => r.type === 'buy' && r.status === 'approved' && !myKidIds.includes(r.kid_id));

  const describe = (r: Req): [string, string] => {
    const { buyer, t } = mySide(r);
    const n = t?.name ?? 'a toy';
    if (r.type === 'listing') return [`${nameOf(r.kid_id)} wants to list a toy`, `${n}: ${[t?.price ? money(t.price) : '', t?.swap ? 'swap' : ''].filter(Boolean).join(' or ')}. Care check done. ${t?.note ? `“${t.note}”` : ''}`];
    if (r.type === 'story') {
      const s = storiesQ.data?.stories.find((x) => x.id === r.story_id);
      return [`${nameOf(r.kid_id)} wants to share a story`, `“${s?.text ?? ''}”`];
    }
    if (r.type === 'buy')
      return buyer
        ? [`${nameOf(r.kid_id)} wants to buy a toy`, `${n} from ${t?.seller ?? 'another kid'} for ${money((r.amount_cents ?? 0) / 100)}. ${r.handover === 'delivery' ? 'Delivery by a parent' : 'Meet-up with parents'}. You pay by card after both families say yes.`]
        : [`Another kid wants to buy ${t?.seller ?? 'your kid'}’s toy`, `${n} for ${money((r.amount_cents ?? 0) / 100)}. ${r.handover === 'delivery' ? 'Delivery by a parent' : 'Meet-up with parents'}. The money goes to your payout account.`];
    const o = toy(r.offer_toy_id);
    return buyer
      ? [`${nameOf(r.kid_id)} wants to swap`, `Their ${o?.name ?? 'toy'} for ${n} from ${t?.seller ?? 'another kid'}.`]
      : [`Swap offer for ${t?.seller ?? 'your kid'}’s toy`, `Another kid offers their ${o?.name ?? 'toy'} for ${n}.`];
  };

  const decide = async (r: Req, yes: boolean) => {
    if (await run(async () => {
      const res = (await rpc('decide_request', { p_req: r.id, p_approve: yes })) as string;
      toast(({ approved: 'Approved', declined: 'You said no', waiting_other_parent: 'Thanks! Now the other family decides.', ready_to_pay: 'Both families said yes. You can pay now.', swapped: 'Swap done! Arrange the hand-over.', toy_gone: 'That toy is no longer available.' } as Record<string, string>)[res] ?? 'Saved');
    })) reqQ.refetch();
  };
  const pay = (r: Req) => run(async () => { const { url } = await callFunction<{ url: string }>('create-checkout', { request_id: r.id }); await openUrl(url); });
  const payouts = () => run(async () => { const { url } = await callFunction<{ url: string }>('stripe-connect', { action: 'link' }); await openUrl(url); });
  const checkPayouts = () => run(async () => { const r = await callFunction<{ ready: boolean }>('stripe-connect', { action: 'status' }); toast(r.ready ? 'Payouts are ready!' : 'Stripe still needs a few details from you.'); });
  const setRule = (k: Kid, patch: Partial<Pick<Kid, 'can_sell' | 'can_swap' | 'spend_limit_cents'>>) =>
    run(() => rpc('set_rules', { p_kid: k.id, p_can_sell: patch.can_sell ?? k.can_sell, p_can_swap: patch.can_swap ?? k.can_swap, p_limit: patch.spend_limit_cents ?? k.spend_limit_cents }));

  const refresh = () => { pq.refetch(); reqQ.refetch(); toysQ.refetch(); activity.refetch(); storiesQ.refetch(); };

  if (pq.isLoading) return <Screen title="Parent dashboard"><ActivityIndicator color={C.acc} /></Screen>;

  return (
    <Screen title="Parent dashboard" refreshing={reqQ.isRefetching} onRefresh={refresh} right={<Btn label="Log out" kind="ghost" small onPress={() => supabase.auth.signOut()} />}>
      <P muted style={{ marginTop: -6 }}>Hi {parent?.full_name?.split(' ')[0] ?? 'there'}! You approve everything your kids sell, buy, swap or share.</P>

      {kids.length === 0 || adding ? (
        <AddKid onDone={() => { setAdding(false); pq.refetch(); }} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {kids.map((k) => (
            <Pressable key={k.id} accessibilityRole="button" accessibilityState={{ selected: kid?.id === k.id }} onPress={() => setSel(k.id)} style={[st.kidChip, kid?.id === k.id && { borderColor: C.ink }]}>
              <Face color={k.avatar} size={28} />
              <Text style={st.kidText}>{k.nickname}</Text>
            </Pressable>
          ))}
          {kids.length < 6 ? <Chip label="+ Add a kid" onPress={() => setAdding(true)} /> : null}
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H2>Waiting for you</H2>
        <Pill label={`${needsMe.length} request${needsMe.length === 1 ? '' : 's'}`} bg={needsMe.length ? C.ys : C.gs} fg={needsMe.length ? C.yi : C.gi} />
      </View>
      {needsMe.length ? (
        needsMe.map((r) => {
          const t = toy(r.toy_id);
          const [h, b] = describe(r);
          return (
            <Card key={r.id} style={{ borderWidth: 2, borderColor: C.ys }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                {t ? <ToyTile toy={t} size={64} radius={14} /> : <ToyArt art="blocks" size={64} />}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.reqTitle}>{h}</Text>
                  <P style={{ fontSize: 14, lineHeight: 20 }}>{b}</P>
                  <Small>{timeAgo(r.created_at)}</Small>
                </View>
              </View>
              {t ? <Btn label="See the toy" kind="ghost" small icon="eye-outline" onPress={() => router.push({ pathname: '/toy/[id]', params: { id: String(t.id) } })} /> : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn label="Say no" kind="ghost" onPress={() => decide(r, false)} disabled={busy} style={{ flex: 1 }} />
                <Btn label="Approve" kind="green" icon="checkmark" onPress={() => decide(r, true)} disabled={busy} style={{ flex: 2 }} />
              </View>
            </Card>
          );
        })
      ) : (
        <Card style={{ alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={44} color={C.green} />
          <P>All done. Nothing needs your OK right now.</P>
        </Card>
      )}

      {toPay.map((r) => {
        const t = toy(r.toy_id);
        return (
          <Card key={r.id} style={{ backgroundColor: C.bs }}>
            <H2 style={{ color: C.bi }}>Ready to pay</H2>
            <P>Both families said yes to {nameOf(r.kid_id)} buying {t?.name ?? 'a toy'} from {t?.seller ?? 'another kid'}.</P>
            <Btn label={`Pay ${money((r.amount_cents ?? 0) / 100)} by card`} kind="blue" icon="card-outline" onPress={() => pay(r)} disabled={busy} />
            <Btn label="Cancel this purchase" kind="ghost" small onPress={() => run(() => rpc('cancel_request', { p_req: r.id }))} />
            <Small>Secure checkout by Stripe. ToySwap never sees your card number.</Small>
          </Card>
        );
      })}

      {waitingOther.length ? (
        <Card>
          <H2>Waiting for the other family</H2>
          {waitingOther.map((r) => (
            <Text key={r.id} style={st.line}>• {describe(r)[0]}: {toy(r.toy_id)?.name}</Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <H2>Payouts</H2>
        {parent?.stripe_ready ? (
          <Note icon="checkmark-circle-outline" bg={C.gs} fg={C.gi}>Payouts are set up. Money from your kids’ sales goes to your bank account through Stripe.</Note>
        ) : (
          <>
            <P muted style={{ fontSize: 14 }}>To receive money when your kids sell toys, set up a free Stripe payout account. It takes about 5 minutes.</P>
            {sellingApproved.length ? <Note icon="alert-circle-outline" bg={C.ys} fg={C.yi}>A buyer is waiting to pay for your kid’s toy. Set up payouts so they can.</Note> : null}
            <Btn label="Set up payouts" icon="cash-outline" onPress={payouts} disabled={busy} />
            {parent?.stripe_account_id ? <Btn label="I finished, check again" kind="ghost" small onPress={checkPayouts} /> : null}
          </>
        )}
      </Card>

      {kid && !adding ? (
        <Card>
          <H2>Rules for {kid.nickname}</H2>
          <View style={st.rule}>
            <Text style={st.ruleText}>Can sell toys</Text>
            <Switch value={kid.can_sell} onValueChange={(v) => { setRule(kid, { can_sell: v }); }} trackColor={{ true: C.green, false: C.line }} thumbColor="#fff" accessibilityLabel="Can sell toys" />
          </View>
          <View style={st.rule}>
            <Text style={st.ruleText}>Can swap toys</Text>
            <Switch value={kid.can_swap} onValueChange={(v) => { setRule(kid, { can_swap: v }); }} trackColor={{ true: C.green, false: C.line }} thumbColor="#fff" accessibilityLabel="Can swap toys" />
          </View>
          <Text style={st.ruleText}>Most they can ask to spend on one toy</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[200, 500, 1000, 2000].map((v) => (
              <Chip key={v} label={money(v / 100)} on={kid.spend_limit_cents === v} onPress={() => setRule(kid, { spend_limit_cents: v })} style={{ flex: 1 }} />
            ))}
          </View>
          <View style={st.rule}>
            <Text style={st.ruleText}>Earned from sales</Text>
            <Text style={st.money}>{money(kid.earned_cents / 100)}</Text>
          </View>
          <Small>Log in for {kid.nickname}: choose “I’m a Kid” and use the nickname {kid.nickname}.</Small>
        </Card>
      ) : null}

      {(activity.data ?? []).length ? (
        <Card>
          <H2>Recent activity</H2>
          {(activity.data ?? []).slice(0, 10).map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={st.dot} />
              <Text style={[st.line, { flex: 1 }]}>{l.text}</Text>
              <Small>{timeAgo(l.created_at)}</Small>
            </View>
          ))}
        </Card>
      ) : null}

      <Btn label="How we keep kids safe" kind="outline" icon="shield-checkmark-outline" onPress={() => router.push('/safety')} />
    </Screen>
  );
}

const st = StyleSheet.create({
  err: { backgroundColor: C.os, color: C.oi, borderRadius: 14, padding: 12, fontFamily: F.heavy, fontSize: 14 },
  label: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  av: { width: 50, height: 50, borderRadius: 999, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  kidChip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 999, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  kidText: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  reqTitle: { fontFamily: F.heavy, fontSize: 16, color: C.ink },
  rule: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  ruleText: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  money: { fontFamily: F.displayBold, fontSize: 24, color: C.gi },
  line: { fontFamily: F.body, fontSize: 15, color: C.ink, lineHeight: 21 },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: C.acc, marginTop: 6 },
});
