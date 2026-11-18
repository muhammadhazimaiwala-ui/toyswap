import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHero } from '../components/Hero';
import { Btn, Chip, Field, H1, IconBtn, Note, P } from '../components/ui';
import { rpc } from '../api';
import { errText, supabase } from '../lib/supabase';
import { C, F } from '../theme';

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'India', 'Pakistan', 'Other'];

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [consent, setConsent] = useState(false);

  const submit = async () => {
    let e = '';
    if (name.trim().length < 2) e = 'Please add your full name.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e = 'Please add a real email address.';
    else if (pass.length < 8) e = 'The password needs at least 8 characters.';
    else if (!consent) e = 'Please switch on the agreement as the parent or guardian.';
    setErr(e);
    if (e) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: { data: { full_name: name.trim(), country }, emailRedirectTo: Platform.OS === 'web' ? Linking.createURL('/parent') : undefined },
      });
      if (error) throw error;
      if (data.session) await rpc('parent_setup', { p_full_name: name.trim(), p_country: country });
      else setSent(true);
    } catch (x) {
      setErr(/registered|exists/i.test(errText(x)) ? 'That email already has an account. Try logging in.' : errText(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ paddingTop: insets.top, backgroundColor: C.sun }}>
          <AuthHero compact />
          <View style={{ position: 'absolute', top: insets.top + 10, left: 14 }}>
            <IconBtn icon="chevron-back" label="Back to log in" onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} />
          </View>
        </View>
        <View style={st.card}>
          {sent ? (
            <>
              <H1>Check your email</H1>
              <P muted>We sent a link to {email.trim()}. Tap it to confirm your account, then log in as a parent to add your kids.</P>
              <Btn label="Back to log in" onPress={() => router.replace('/login')} />
            </>
          ) : (
            <>
              <View style={{ gap: 6 }}>
                <H1>Create a family account</H1>
                <P muted>A grown-up sets up ToySwap. Next, you’ll add each kid with their own nickname and password, and you approve every sale, buy and swap.</P>
              </View>
              {err ? <Text style={st.err}>{err}</Text> : null}
              <Field label="Your full name" value={name} onChangeText={setName} textContentType="name" />
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" textContentType="emailAddress" />
              <Field label="Password" value={pass} onChangeText={setPass} secureTextEntry placeholder="At least 8 characters" textContentType="newPassword" />
              <View style={{ gap: 8 }}>
                <Text style={st.label}>Country</Text>
                <View style={st.wrap}>
                  {COUNTRIES.map((c) => (
                    <Chip key={c} label={c} on={country === c} onPress={() => setCountry(c)} />
                  ))}
                </View>
                {country === 'Pakistan' || country === 'Other' ? (
                  <Note icon="information-circle-outline" bg={C.ys} fg={C.yi}>Card payments aren’t available in your country yet. Your kids can still list toys and swap.</Note>
                ) : null}
              </View>
              <View style={st.consent}>
                <Text style={st.consentText}>I’m the parent or legal guardian. I agree to the Terms and the Kids Privacy Policy, and I give consent for my children to use ToySwap.</Text>
                <Switch value={consent} onValueChange={setConsent} trackColor={{ true: C.green, false: C.line }} thumbColor="#fff" accessibilityLabel="I agree as the parent or guardian" />
              </View>
              <Btn label={busy ? 'Creating account…' : 'Create account'} onPress={submit} disabled={busy} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  card: { marginTop: -26, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 16 },
  err: { backgroundColor: C.os, color: C.oi, borderRadius: 14, padding: 12, fontFamily: F.heavy, fontSize: 14 },
  label: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.soft, borderRadius: 16, padding: 14 },
  consentText: { flex: 1, fontFamily: F.bold, fontSize: 14, color: C.ink, lineHeight: 20 },
});
