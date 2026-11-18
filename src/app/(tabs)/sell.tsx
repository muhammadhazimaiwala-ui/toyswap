import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ToyArt } from '../../components/ToyArt';
import { Btn, Card, Chip, Field, H1, H2, Option, P, Pill, Screen, Small, Tick } from '../../components/ui';
import { CAT_ART, CATS, CHECKS, CONDS, TILE, USED } from '../../data';
import { rpc, uploadPhoto, useAction, useKid } from '../../api';
import { useApp } from '../../store';
import { C, F, money } from '../../theme';

const blank = () => ({ name: '', cat: 'Space', used: 1, cond: 0, want: 2, price: 2, note: '', checks: [false, false, false, false], photo: null as string | null });

export default function Sell() {
  const { userId, toast } = useApp();
  const kidQ = useKid(userId);
  const { run, busy } = useAction(toast);
  const router = useRouter();
  const [f, setF] = useState(blank);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof ReturnType<typeof blank>>(k: K, v: ReturnType<typeof blank>[K]) => setF((p) => ({ ...p, [k]: v }));
  const n = f.checks.filter(Boolean).length;
  const ready = n === 4 && f.name.trim().length > 0;

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return toast('Ask a parent to allow photos in Settings.');
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      if (!r.canceled && r.assets[0]) set('photo', r.assets[0].uri);
    } catch {
      toast("Couldn't open your photos.");
    }
  };

  const submit = async () => {
    setErr('');
    const k = kidQ.data;
    if (!f.name.trim() || f.name.trim().length < 2) return setErr('Give your toy a name first.');
    if (n < 4) return setErr('Finish your care check first: tick all four.');
    if (f.want !== 1 && k && !k.can_sell) return setErr('Selling is turned off right now. You can still swap, or ask your parent.');
    if (f.want !== 0 && k && !k.can_swap) return setErr('Swaps are turned off right now. Ask your parent.');
    const name = f.name.trim();
    const ok = await run(async () => {
      const path = f.photo && userId ? await uploadPhoto(userId, f.photo) : null;
      await rpc('list_toy', {
        p_name: name,
        p_category: f.cat,
        p_price_cents: f.want === 1 ? null : f.price * 100,
        p_swap: f.want !== 0,
        p_used: USED[f.used] === 'Under 1 month' ? 'under a month' : USED[f.used],
        p_condition: CONDS[f.cond][0],
        p_note: f.note.trim(),
        p_photo_path: path,
        p_care_checks: n,
      });
    });
    if (ok) {
      setDone(name);
      setF(blank());
    }
  };

  if (done) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: 14, paddingTop: 60 }}>
          <View style={st.doneCircle}><Ionicons name="checkmark" size={64} color="#fff" /></View>
          <H1 style={{ textAlign: 'center' }}>Sent to your parent!</H1>
          <P muted style={{ textAlign: 'center' }}>Once they say yes, your {done} will show up for other kids.</P>
          <Pill label="+5 Care points when your parent says yes" bg={C.gs} fg={C.gi} icon="star" />
          <Btn label="Back to home" onPress={() => { setDone(null); router.navigate('/'); }} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          <Btn label="List another toy" kind="ghost" onPress={() => setDone(null)} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  const art = CAT_ART[f.cat];
  return (
    <Screen title="Sell or swap my toy">
      {err ? <Text style={st.err}>{err}</Text> : null}

      <Card>
        <Text style={st.label}>Photo</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={f.photo ? 'Change photo' : 'Add a photo of your toy'} onPress={pickPhoto} style={[st.ph, f.photo && { borderStyle: 'solid' }]}>
            {f.photo ? (
              <Image source={{ uri: f.photo }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={30} color={C.muted} />
                <Text style={st.phText}>Add photo</Text>
              </>
            )}
          </Pressable>
          {f.photo ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => set('photo', null)} style={[st.ph, { borderStyle: 'solid' }]}>
              <Ionicons name="close" size={28} color={C.muted} />
              <Text style={st.phText}>Remove</Text>
            </Pressable>
          ) : (
            <View style={[st.ph, { borderStyle: 'solid', borderColor: 'transparent', backgroundColor: TILE[art] }]} accessibilityElementsHidden>
              <ToyArt art={art} size={64} />
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={C.blue} />
          <Small style={{ color: C.bi, flex: 1 }}>Only the toy in the photo: no faces, names, school or house. No photo? We’ll use a drawing.</Small>
        </View>
      </Card>

      <Card>
        <Field label="Toy name" value={f.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Moon rocket" maxLength={40} />
        <Text style={st.label}>What kind of toy?</Text>
        <View style={st.wrap}>
          {CATS.slice(1).map((c) => (
            <Chip key={c} label={c} on={f.cat === c} onPress={() => set('cat', c)} />
          ))}
        </View>
        <Text style={st.label}>How long have you played with it?</Text>
        <View style={st.wrap}>
          {USED.map((u, i) => (
            <Chip key={u} label={u} on={f.used === i} onPress={() => set('used', i)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={st.label}>How does it look now?</Text>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          {CONDS.map(([l, h], i) => (
            <Option key={l} title={l} sub={h} on={f.cond === i} onPress={() => set('cond', i)} />
          ))}
        </View>
      </Card>

      <Card>
        <Text style={st.label}>What would you like?</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['Sell', 'Swap', 'Both'].map((w, i) => (
            <Pressable key={w} accessibilityRole="radio" accessibilityState={{ checked: f.want === i }} onPress={() => set('want', i)} style={[st.want, f.want === i && { backgroundColor: C.acc, borderColor: C.acc }]}>
              <Text style={[st.wantText, f.want === i && { color: '#fff' }]}>{w}</Text>
            </Pressable>
          ))}
        </View>
        {f.want !== 1 ? (
          <View style={st.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Price</Text>
              <Small>Most used toys sell for $1–$5</Small>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Lower price" onPress={() => set('price', Math.max(1, f.price - 1))} style={st.step}><Text style={st.stepText}>−</Text></Pressable>
            <Text style={st.priceText} accessibilityLiveRegion="polite">{money(f.price)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Raise price" onPress={() => set('price', Math.min(20, f.price + 1))} style={st.step}><Text style={st.stepText}>+</Text></Pressable>
          </View>
        ) : null}
      </Card>

      <Card>
        <Field label="Tell other kids about it" value={f.note} onChangeText={(v) => set('note', v)} multiline maxLength={200} placeholder="Why did you love it? Why are you passing it on?" />
      </Card>

      <Card style={{ backgroundColor: C.gs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <H2 style={{ color: C.greenDark }}>Care check</H2>
          <Pill label={`${n} of 4 done`} bg="#fff" fg={C.gi} />
        </View>
        <P style={{ color: C.greenDark, fontSize: 14 }}>Tick each one to show your toy is ready for a new friend.</P>
        {CHECKS.map((c, i) => (
          <Tick key={c} label={c} on={f.checks[i]} onPress={() => set('checks', f.checks.map((v, j) => (j === i ? !v : v)))} />
        ))}
      </Card>

      <Btn label={busy ? 'Sending…' : 'Send to my parent for approval'} icon="people-outline" onPress={submit} disabled={busy} style={!ready && { backgroundColor: C.line, borderBottomColor: C.line }} />
      {!ready ? <Small style={{ textAlign: 'center', color: C.oi }}>{f.name.trim() ? 'Finish your care check first.' : 'Give your toy a name and finish the care check.'}</Small> : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  err: { backgroundColor: C.os, color: C.oi, borderRadius: 14, padding: 12, fontFamily: F.heavy, fontSize: 14 },
  label: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ph: { width: 104, height: 104, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#93A3BE', backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 2 },
  phText: { fontFamily: F.heavy, fontSize: 12, color: C.muted },
  want: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  wantText: { fontFamily: F.display, fontSize: 18, color: C.ink },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.os, borderRadius: 16, padding: 12 },
  step: { width: 46, height: 46, borderRadius: 999, borderWidth: 2, borderColor: '#FDBA8C', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: F.heavy, fontSize: 22, color: C.oi },
  priceText: { fontFamily: F.displayBold, fontSize: 26, color: C.acc, minWidth: 50, textAlign: 'center' },
  doneCircle: { width: 110, height: 110, borderRadius: 999, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
});
