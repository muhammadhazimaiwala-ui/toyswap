import { Link } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHero } from '../components/Hero';
import { Btn, Field, H1, Note, P } from '../components/ui';
import { kidEmail, supabase } from '../lib/supabase';
import { C, F } from '../theme';

export default function Login() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<'kid' | 'parent'>('kid');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (r: 'kid' | 'parent') => {
    setRole(r);
    setErr('');
    setId('');
  };

  const submit = async () => {
    if (!id.trim()) return setErr(role === 'kid' ? 'Type your nickname.' : 'Type your email.');
    if (!pw) return setErr('Type your password.');
    setErr('');
    setBusy(true);
    const email = role === 'kid' ? kidEmail(id) : id.trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) {
      if (/confirm/i.test(error.message)) return setErr('Please confirm your email first. Check your inbox for the link from ToySwap.');
      if (/network|fetch/i.test(error.message)) return setErr('No connection. Check your internet and try again.');
      return setErr(role === 'kid' ? 'That nickname or password is not right. Ask your parent if you forgot.' : 'That email or password is not right.');
    }
    const isKid = data.user?.app_metadata?.role === 'kid';
    if (isKid !== (role === 'kid')) {
      await supabase.auth.signOut();
      setErr(isKid ? 'This is a kid account. Choose “I’m a Kid”.' : 'This is a parent account. Choose “I’m a Parent”.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ paddingTop: insets.top, backgroundColor: C.sun }}>
          <AuthHero />
        </View>
        <View style={st.card}>
          <H1>Welcome back!</H1>
          <View style={st.seg} accessibilityRole="radiogroup" accessibilityLabel="Who is logging in?">
            {(['kid', 'parent'] as const).map((r) => (
              <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: role === r }} onPress={() => pick(r)} style={[st.segBtn, role === r && st.segOn]}>
                <Text style={[st.segText, role === r && { color: C.ink }]}>{r === 'kid' ? "I'm a Kid" : "I'm a Parent"}</Text>
              </Pressable>
            ))}
          </View>
          {err ? <Text style={st.err}>{err}</Text> : null}
          {role === 'kid' ? (
            <>
              <Field label="Your nickname" value={id} onChangeText={setId} autoCapitalize="none" autoCorrect={false} textContentType="username" placeholder="The nickname your parent made" />
              <Field label="Secret password" value={pw} onChangeText={setPw} secureTextEntry placeholder="Your secret password" onSubmitEditing={submit} />
              <P muted style={{ fontSize: 14 }}>Forgot it? Ask your parent to reset it.</P>
            </>
          ) : (
            <>
              <Field label="Email" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" />
              <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry placeholder="Your password" onSubmitEditing={submit} />
            </>
          )}
          <Btn label={busy ? 'Logging in…' : 'Log in'} onPress={submit} disabled={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
            <P muted>New to ToySwap?</P>
            <Link href="/register" style={st.link}>Create a family account</Link>
          </View>
          <Note>Kid accounts are set up by a parent, and a parent approves every sale or swap.</Note>
          <Note icon="information-circle-outline" bg={C.ys} fg={C.yi}>New family? A parent creates the account first, then adds each kid with a nickname and password.</Note>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  card: { marginTop: -26, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 16 },
  seg: { flexDirection: 'row', gap: 6, padding: 5, backgroundColor: C.soft, borderRadius: 16 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segText: { fontFamily: F.heavy, fontSize: 15, color: C.muted },
  err: { backgroundColor: C.os, color: C.oi, borderRadius: 14, padding: 12, fontFamily: F.heavy, fontSize: 14 },
  link: { fontFamily: F.heavy, fontSize: 16, color: C.blue },
});
