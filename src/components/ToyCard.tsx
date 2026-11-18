import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { rpc, Toy, useAction } from '../api';
import { useApp } from '../store';
import { C, F, money, shadow } from '../theme';
import { ToyTile } from './ToyArt';
import { Face, Pill } from './ui';

export function ToyCard({ toy, width, saved, canSave = true }: { toy: Toy; width: number; saved?: boolean; canSave?: boolean }) {
  const router = useRouter();
  const { userId, toast } = useApp();
  const { run } = useAction(toast);
  const mine = toy.ownerId === userId;
  const toggle = () =>
    run(async () => {
      const on = await rpc('toggle_saved', { p_toy: toy.id });
      if (on) toast('Saved to your wishlist');
    });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${toy.name}${toy.price ? ', ' + money(toy.price) : ''}${toy.swap ? ', swap available' : ''}`}
      onPress={() => router.push({ pathname: '/toy/[id]', params: { id: String(toy.id) } })}
      style={({ pressed }) => [st.card, { width }, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View>
        <ToyTile toy={toy} size={width} radius={0} />
        <View style={st.cond}>
          <Text style={st.condText}>{toy.cond}</Text>
        </View>
        {canSave && !mine ? (
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? `Remove ${toy.name} from wishlist` : `Save ${toy.name}`} onPress={toggle} hitSlop={8} style={st.heart}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={C.acc} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text style={st.name} numberOfLines={1}>{toy.name}</Text>
        <View style={st.meta}>
          <Face color={toy.sellerColor} size={16} />
          <Text style={st.metaText} numberOfLines={1}>{toy.seller}</Text>
          <Text style={st.metaText}>· {toy.sellerTrades} trades</Text>
        </View>
        <View style={[st.meta, { marginTop: 2 }]}>
          {toy.price ? <Text style={st.price}>{money(toy.price)}</Text> : null}
          {toy.swap ? <Pill label={toy.price ? 'Swap too' : 'Swap only'} bg={C.gs} fg={C.gi} icon="swap-horizontal" /> : null}
        </View>
        {mine ? <Pill label="Yours" bg={C.ps} fg={C.pi} /> : <Text style={st.metaText}>Used {toy.used}</Text>}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', ...shadow },
  cond: { position: 'absolute', left: 8, bottom: 8, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  condText: { fontFamily: F.heavy, fontSize: 11, color: C.ink },
  heart: { position: 'absolute', top: 8, right: 8, width: 38, height: 38, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  name: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: F.bold, fontSize: 12, color: C.muted, flexShrink: 1 },
  price: { fontFamily: F.displayBold, fontSize: 20, color: C.ink },
});
