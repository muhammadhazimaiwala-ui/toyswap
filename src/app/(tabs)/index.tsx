import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useKid, useRequests, useSaved, useToys } from '../../api';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToyArt } from '../../components/ToyArt';
import { ToyCard } from '../../components/ToyCard';
import { Bar, Btn, Chip, Face, H2, IconBtn, P } from '../../components/ui';
import { CAT_ART, CATS, TIPS, TILE } from '../../data';
import { badgeName, useApp } from '../../store';
import { C, F, money, shadow } from '../../theme';

const SORTS = [
  ['new', 'Newest'],
  ['low', 'Price ↑'],
  ['high', 'Price ↓'],
  ['swap', 'Swap only'],
] as const;

export default function Home() {
  const { userId } = useApp();
  const kidQ = useKid(userId);
  const toysQ = useToys();
  const savedQ = useSaved(userId);
  const reqQ = useRequests();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const k = kidQ.data;
  const m = { nick: k?.nickname ?? '', color: k?.avatar ?? '#F97316', care: k?.care_score ?? 90, wallet: (k?.earned_cents ?? 0) / 100, goal: { name: k?.goal_name ?? 'New bicycle', target: (k?.goal_cents ?? 2000) / 100 } };
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>('new');
  const cardW = Math.floor((Math.min(width, 700) - 16 * 2 - 12) / 2);
  const pct = Math.min(100, Math.round((m.wallet / m.goal.target) * 100));
  const nWait = (reqQ.data ?? []).filter((r) => r.status === 'waiting' && r.kid_id === userId).length;
  const saved = savedQ.data ?? [];
  const refreshing = toysQ.isRefetching;
  const refresh = () => { toysQ.refetch(); kidQ.refetch(); reqQ.refetch(); savedQ.refetch(); };

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let l = (toysQ.data ?? []).filter((t) => (cat === 'All' || t.cat === cat) && (!qq || (t.name + ' ' + t.cat + ' ' + t.note).toLowerCase().includes(qq)));
    if (sort === 'low') l = [...l].sort((a, b) => (a.price ?? 99) - (b.price ?? 99));
    if (sort === 'high') l = [...l].sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === 'swap') l = l.filter((t) => t.swap);
    return l;
  }, [toysQ.data, q, cat, sort]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.acc} />} contentContainerStyle={{ paddingBottom: 32, maxWidth: 700, width: '100%', alignSelf: 'center' }}>
        {/* header */}
        <View style={st.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="My profile" onPress={() => router.push('/me')}>
            <Face color={m.color} size={48} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={st.hi} numberOfLines={1}>Hi, {m.nick}!</Text>
            <Text style={st.sub} numberOfLines={1}>What will you swap today?</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Earned ${money(m.wallet)}`} onPress={() => router.push('/me')} style={st.wallet}>
            <Ionicons name="wallet-outline" size={18} color={C.gi} />
            <Text style={st.walletText}>{money(m.wallet)}</Text>
          </Pressable>
          <IconBtn icon="notifications-outline" label={`Requests, ${nWait} waiting`} badge={nWait} onPress={() => router.push('/requests')} />
        </View>

        {/* search */}
        <View style={st.search}>
          <Ionicons name="search" size={20} color={C.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search toys, games, books…" placeholderTextColor="#6B6985" style={st.searchInput} accessibilityLabel="Search toys" returnKeyType="search" clearButtonMode="while-editing" />
        </View>

        {/* hero */}
        <View style={st.hero}>
          <View style={{ flex: 1, gap: 8, zIndex: 1 }}>
            <Text style={st.heroTitle}>Give your toys a second playtime</Text>
            <Text style={st.heroText}>Sell or swap toys you’ve outgrown. A parent says yes to every deal.</Text>
            <Btn label="Sell a toy" icon="pricetag-outline" small onPress={() => router.push('/sell')} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          </View>
          <View style={st.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={{ position: 'absolute', right: 6, top: -6, transform: [{ rotate: '14deg' }] }}><ToyArt art="rocket" size={70} /></View>
            <View style={{ position: 'absolute', left: 0, bottom: 4 }}><ToyArt art="bear" size={88} /></View>
            <View style={{ position: 'absolute', right: 0, bottom: 0 }}><ToyArt art="blocks" size={66} /></View>
          </View>
        </View>

        {/* trust */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {[
            ['people-outline', 'Parent approved', C.gs, C.gi],
            ['shield-checkmark-outline', 'Care checked', C.bs, C.bi],
            ['chatbubble-ellipses-outline', 'Safe messages', C.ys, C.yi],
            ['location-outline', 'Meet safely', C.os, C.oi],
          ].map(([i, l, bg, fg]) => (
            <View key={l} style={st.trust}>
              <View style={[st.trustIcon, { backgroundColor: bg }]}><Ionicons name={i as any} size={20} color={fg} /></View>
              <Text style={st.trustText}>{l}</Text>
            </View>
          ))}
        </ScrollView>

        {/* care + goal */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 16 }}>
          <View style={[st.mini, { backgroundColor: C.gs }]}>
            <Text style={[st.miniLabel, { color: C.gi }]}>CARE SCORE</Text>
            <Text style={[st.miniBig, { color: C.greenDark }]}>{m.care}</Text>
            <Text style={[st.miniSub, { color: C.gi }]}>{badgeName(m.care)}</Text>
            <Bar pct={m.care} track="#fff" />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Saving for ${m.goal.name}`} onPress={() => router.push('/me')} style={[st.mini, { backgroundColor: C.card }]}>
            <Text style={st.miniLabel}>SAVING FOR</Text>
            <Text style={st.miniBig} numberOfLines={1}>{m.goal.name}</Text>
            <Text style={st.miniSub}>{money(m.wallet)} earned of {money(m.goal.target)}</Text>
            <Bar pct={pct} color={C.acc} />
          </Pressable>
        </View>

        {/* categories */}
        <H2 style={st.secTitle}>Shop by category</H2>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
          {CATS.slice(1).map((c) => (
            <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: cat === c }} onPress={() => setCat(cat === c ? 'All' : c)} style={{ alignItems: 'center', gap: 6, width: 76 }}>
              <View style={[st.catCircle, { backgroundColor: TILE[CAT_ART[c]] }, cat === c && { borderColor: C.ink }]}>
                <ToyArt art={CAT_ART[c]} size={48} />
              </View>
              <Text style={[st.catText, cat === c && { color: C.acc }]} numberOfLines={1}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* grid */}
        <View style={[st.secRow]}>
          <H2>{cat === 'All' ? 'Fresh toys for you' : cat}</H2>
          <Text style={st.count}>{list.length} toy{list.length === 1 ? '' : 's'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          {SORTS.map(([k, l]) => (
            <Chip key={k} label={l} on={sort === k} onPress={() => setSort(k)} />
          ))}
          {cat !== 'All' || q ? <Chip label="Clear filters" onPress={() => { setCat('All'); setQ(''); setSort('new'); }} /> : null}
        </ScrollView>
        {toysQ.isLoading ? (
          <ActivityIndicator color={C.acc} style={{ marginVertical: 30 }} />
        ) : toysQ.isError ? (
          <View style={st.empty}>
            <H2>Couldn’t load toys</H2>
            <P muted style={{ textAlign: 'center' }}>Check your internet connection.</P>
            <Btn label="Try again" kind="ghost" small onPress={refresh} />
          </View>
        ) : list.length ? (
          <View style={st.grid}>
            {list.map((t) => (
              <ToyCard key={t.id} toy={t} width={cardW} saved={saved.includes(t.id)} />
            ))}
          </View>
        ) : (toysQ.data ?? []).length === 0 ? (
          <View style={st.empty}>
            <ToyArt art="rocket" size={90} />
            <H2>Be the first!</H2>
            <P muted style={{ textAlign: 'center' }}>No toys are listed yet. List one of yours and it shows up here once your parent says yes.</P>
            <Btn label="List a toy" small onPress={() => router.push('/sell')} />
          </View>
        ) : (
          <View style={st.empty}>
            <ToyArt art="bear" size={90} />
            <H2>No toys found</H2>
            <P muted style={{ textAlign: 'center' }}>Try another word or pick a different category.</P>
            <Btn label="Show all toys" kind="ghost" small onPress={() => { setCat('All'); setQ(''); setSort('new'); }} />
          </View>
        )}

        {/* how it works */}
        <H2 style={st.secTitle}>How ToySwap works</H2>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {[
            ['Check and list', 'Clean your toy, check every piece is there, add a photo and a price or ask for a swap.'],
            ['A parent says yes', 'Your parent approves the listing and every buy or swap from their dashboard.'],
            ['Hand it over', 'Meet with parents in a public place, or a parent arranges delivery.'],
          ].map(([h, b], i) => (
            <View key={h} style={st.how}>
              <View style={st.howN}><Text style={st.howNText}>{i + 1}</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.howTitle}>{h}</Text>
                <Text style={st.howText}>{b}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* tips */}
        <H2 style={st.secTitle}>Toy care tips</H2>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
          {TIPS.map((t) => (
            <View key={t.h} style={[st.tip, { backgroundColor: t.bg }]}>
              <Ionicons name="leaf-outline" size={24} color={t.fg} />
              <Text style={[st.howTitle, { color: t.fg }]}>{t.h}</Text>
              <Text style={[st.howText, { color: t.fg }]}>{t.b}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  hi: { fontFamily: F.display, fontSize: 22, color: C.ink },
  sub: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.gs },
  walletText: { fontFamily: F.heavy, fontSize: 15, color: C.gi },
  search: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, backgroundColor: C.card, borderRadius: 16, ...shadow },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 16, color: C.ink, height: 50 },
  hero: { margin: 16, marginBottom: 14, backgroundColor: C.sun, borderRadius: 26, padding: 18, flexDirection: 'row', minHeight: 170, overflow: 'hidden' },
  heroTitle: { fontFamily: F.displayBold, fontSize: 24, lineHeight: 27, color: C.ink },
  heroText: { fontFamily: F.bold, fontSize: 14, lineHeight: 19, color: '#3D3A10' },
  heroArt: { width: 130, marginRight: -6 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 16, paddingVertical: 8, paddingLeft: 8, paddingRight: 14 },
  trustIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  trustText: { fontFamily: F.heavy, fontSize: 13, color: C.ink },
  mini: { flex: 1, borderRadius: 20, padding: 14, gap: 4, ...shadow },
  miniLabel: { fontFamily: F.heavy, fontSize: 11, color: C.muted, letterSpacing: 0.3 },
  miniBig: { fontFamily: F.display, fontSize: 24, color: C.ink },
  miniSub: { fontFamily: F.bold, fontSize: 13, color: C.muted, marginBottom: 6 },
  secTitle: { paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  secRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24, marginBottom: 10 },
  count: { fontFamily: F.bold, fontSize: 13, color: C.muted },
  catCircle: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  catText: { fontFamily: F.heavy, fontSize: 12, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  empty: { marginHorizontal: 16, backgroundColor: C.card, borderRadius: 22, padding: 24, alignItems: 'center', gap: 8 },
  how: { flexDirection: 'row', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 14, alignItems: 'flex-start' },
  howN: { width: 36, height: 36, borderRadius: 999, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  howNText: { fontFamily: F.displayBold, fontSize: 18, color: '#fff' },
  howTitle: { fontFamily: F.heavy, fontSize: 16, color: C.ink },
  howText: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
  tip: { width: 240, borderRadius: 20, padding: 16, gap: 6 },
});
