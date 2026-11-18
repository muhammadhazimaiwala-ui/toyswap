import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { rpc, timeAgo, useAction, useKid, useMyToys, useStories, useToysById } from '../../api';
import { ToyTile } from '../../components/ToyArt';
import { Btn, Card, Chip, Face, H2, Option, P, Pill, Screen, Small } from '../../components/ui';
import { useApp } from '../../store';
import { C, F } from '../../theme';

export default function Stories() {
  const { userId, toast } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tileW = Math.min(width, 700) - 64;
  const kid = useKid(userId).data;
  const mineQ = useMyToys(userId);
  const storiesQ = useStories();
  const { run, busy } = useAction(toast);
  const mine = (mineQ.data ?? []).filter((t) => t.ownerId === userId && (t.status === 'live' || t.status === 'pending'));
  const [toyId, setToyId] = useState<number | null>(null);
  const [tpl, setTpl] = useState(0);
  const sel = mine.find((t) => t.id === toyId) ?? mine[0];
  const tpls = sel
    ? [
        `I’ve played with this for ${sel.used}. Now I’d like something new!`,
        'Looking for a swap! What do you have?',
        `Selling it to save up for my ${(kid?.goal_name ?? 'goal').toLowerCase()}.`,
        'I kept it clean and safe. Ready for a new friend!',
      ]
    : [];
  const data = storiesQ.data;
  const toyIds = (data?.stories ?? []).map((s) => s.toy_id);
  const toysQ = useToysById(toyIds);
  const toyOf = (id: number) => (toysQ.data ?? []).find((t) => t.id === id);

  const share = async () => {
    if (!sel) return;
    if (await run(() => rpc('share_story', { p_toy: sel.id, p_template: tpl }))) toast('Shared! Others see it after your parent checks it.');
  };
  const react = (id: number, k: string) => run(() => rpc('toggle_reaction', { p_story: id, p_kind: k }));

  return (
    <Screen title="Toy Stories" refreshing={storiesQ.isRefetching} onRefresh={() => storiesQ.refetch()}>
      <P muted style={{ marginTop: -8 }}>Show your toys, tell their story, find a swap.</P>
      <Card>
        <H2>Share a story</H2>
        {mine.length && sel ? (
          <>
            <Text style={st.label}>Which toy?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {mine.map((t) => (
                <Chip key={t.id} label={t.name} on={sel.id === t.id} onPress={() => { setToyId(t.id); setTpl(0); }} />
              ))}
            </View>
            <Text style={st.label}>What do you want to say?</Text>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {tpls.map((x, i) => (
                <Option key={i} title={x} on={tpl === i} onPress={() => setTpl(i)} />
              ))}
            </View>
            <Btn label={busy ? 'Sharing…' : 'Share story'} icon="send-outline" onPress={share} disabled={busy} />
            <Small>Your parent checks every story before other kids see it.</Small>
          </>
        ) : (
          <>
            <P muted>List a toy first, then you can share its story.</P>
            <Btn label="List a toy" onPress={() => router.navigate('/sell')} />
          </>
        )}
      </Card>

      {storiesQ.isLoading ? <ActivityIndicator color={C.acc} /> : null}
      {data && data.stories.length === 0 ? <P muted style={{ textAlign: 'center' }}>No stories yet. Be the first to share one!</P> : null}
      {data?.stories.map((x) => {
        const t = toyOf(x.toy_id);
        const k = data.kid(x.kid_id);
        const mineStory = x.kid_id === userId;
        return (
          <Card key={x.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Face color={k?.avatar ?? '#3B82F6'} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={st.by}>{mineStory ? 'You' : k?.nickname ?? 'A kid'}</Text>
                <Small>{timeAgo(x.created_at)}</Small>
              </View>
              {x.status !== 'live' ? <Pill label="Parent check" bg={C.ys} fg={C.yi} /> : null}
            </View>
            {t ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`See ${t.name}`} onPress={() => router.push({ pathname: '/toy/[id]', params: { id: String(t.id) } })}>
                <ToyTile toy={t} size={tileW} height={190} radius={16} />
              </Pressable>
            ) : null}
            <P>{x.text}</P>
            {x.status === 'live' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(
                  [
                    ['cool', 'Cool toy!', C.os, C.oi],
                    ['swap', 'I want to swap', C.gs, C.gi],
                    ['luck', 'Good luck!', C.bs, C.bi],
                  ] as const
                ).map(([kind, l, bg, fg]) => {
                  const on = data.reacted(x.id, kind);
                  return (
                    <Pressable key={kind} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => react(x.id, kind)} style={[st.react, { backgroundColor: bg, borderColor: on ? fg : 'transparent' }]}>
                      <Text style={[st.reactText, { color: fg }]}>{l} {data.count(x.id, kind)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  by: { fontFamily: F.heavy, fontSize: 16, color: C.ink },
  react: { minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2, justifyContent: 'center' },
  reactText: { fontFamily: F.heavy, fontSize: 13 },
});
