import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  RefreshControl,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C, F, shadow } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ---------- text ---------- */
export const H1 = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text accessibilityRole="header" style={[t.h1, style]}>{children}</Text>
);
export const H2 = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text accessibilityRole="header" style={[t.h2, style]}>{children}</Text>
);
export const P = ({ children, style, muted }: { children: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) => (
  <Text style={[t.p, muted && { color: C.muted }, style]}>{children}</Text>
);
export const Small = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <Text style={[t.small, style]}>{children}</Text>
);

/* ---------- avatar + logo ---------- */
export function Face({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={20} fill={color} />
      <Circle cx={14} cy={17} r={2.6} fill="#1C1A3A" />
      <Circle cx={26} cy={17} r={2.6} fill="#1C1A3A" />
      <Path d="M13 25 Q20 31 27 25" stroke="#1C1A3A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect width={56} height={56} rx={18} fill={C.acc} />
      <Path d="M15 22 H39 M33 16 L39 22 L33 28 M41 34 H17 M23 28 L17 34 L23 40" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ---------- buttons ---------- */
type BtnKind = 'primary' | 'blue' | 'green' | 'outline' | 'ghost';
export function Btn({
  label,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const bg = { primary: C.acc, blue: C.blue, green: C.green, outline: C.card, ghost: C.card }[kind];
  const under = { primary: C.accDark, blue: C.blueDark, green: C.greenDark, outline: C.blue, ghost: C.line }[kind];
  const fg = kind === 'outline' ? C.blue : kind === 'ghost' ? C.ink : '#fff';
  const border = kind === 'outline' ? C.blue : kind === 'ghost' ? C.line : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        b.btn,
        small && { minHeight: 44, paddingHorizontal: 14 },
        { backgroundColor: disabled ? C.line : bg, borderColor: disabled ? C.line : border, borderBottomColor: disabled ? C.line : under },
        (kind === 'outline' || kind === 'ghost') && { borderBottomWidth: 2, borderWidth: 2 },
        pressed && !disabled && { transform: [{ translateY: 2 }], borderBottomWidth: kind === 'outline' || kind === 'ghost' ? 2 : 2 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 18 : 22} color={disabled ? C.muted : fg} /> : null}
      <Text style={[b.btnText, small && { fontSize: 16 }, { color: disabled ? C.muted : fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, style }: { label: string; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={[b.chip, on && { backgroundColor: C.ink, borderColor: C.ink }, style]}
    >
      <Text style={[b.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, bg, fg, icon }: { label: string; bg: string; fg: string; icon?: IconName }) {
  return (
    <View style={[b.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={[b.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function IconBtn({ icon, onPress, label, badge, color = C.ink, bg = C.card }: { icon: IconName; onPress: () => void; label: string; badge?: number; color?: string; bg?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={[b.iconBtn, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={color} />
      {badge ? (
        <View style={b.badge}>
          <Text style={b.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ---------- containers ---------- */
export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[b.card, style]}>{children}</View>;

export function Bar({ pct, color = C.green, track = C.soft, height = 10 }: { pct: number; color?: string; track?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

export function Field({ label, help, style, ...rest }: TextInputProps & { label: string; help?: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={b.label}>{label}</Text>
      <TextInput placeholderTextColor="#6B6985" style={[b.input, rest.multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' }, style]} accessibilityLabel={label} {...rest} />
      {help}
    </View>
  );
}

export function Tick({ label, on, onPress, tone = 'green' }: { label: string; on: boolean; onPress: () => void; tone?: 'green' }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[b.tick, on && { backgroundColor: C.gs, borderColor: '#86EFAC' }]}
    >
      <View style={[b.box, on && { backgroundColor: C.green, borderColor: C.green }]}>{on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}</View>
      <Text style={b.tickText}>{label}</Text>
    </Pressable>
  );
}

export function Option({ title, sub, on, onPress, left }: { title: string; sub?: string; on: boolean; onPress: () => void; left?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[b.opt, on && { borderColor: C.blue, backgroundColor: C.bs }]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={b.optTitle}>{title}</Text>
        {sub ? <Text style={b.optSub}>{sub}</Text> : null}
      </View>
      <View style={[b.radio, on && { borderWidth: 7, borderColor: C.blue }]} />
    </Pressable>
  );
}

export function Note({ icon = 'shield-checkmark-outline', children, bg = C.bs, fg = C.bi }: { icon?: IconName; children: React.ReactNode; bg?: string; fg?: string }) {
  return (
    <View style={[b.note, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={[b.noteText, { color: fg }]}>{children}</Text>
    </View>
  );
}

/* ---------- screens ---------- */
export function Screen({
  children,
  title,
  back,
  right,
  scroll = true,
  pad = true,
  bg = C.bg,
  footer,
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
  scroll?: boolean;
  pad?: boolean;
  bg?: string;
  footer?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const body = <View style={[pad && { padding: 16, gap: 16 }, { paddingBottom: footer ? 16 : 32, maxWidth: 700, width: '100%', alignSelf: 'center' }]}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg }}>
      {title || back ? (
        <View style={b.topbar}>
          {back ? (
            <IconBtn icon="chevron-back" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          ) : null}
          {title ? <Text style={b.topTitle} numberOfLines={1}>{title}</Text> : <View style={{ flex: 1 }} />}
          {right}
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.acc} /> : undefined}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={b.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[b.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={b.grab} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <H2>{title}</H2>
            <IconBtn icon="close" label="Close" onPress={onClose} bg={C.soft} />
          </View>
          <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const Row = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, style]}>{children}</View>
);

const t = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.ink },
  h2: { fontFamily: F.display, fontSize: 21, lineHeight: 26, color: C.ink },
  p: { fontFamily: F.body, fontSize: 16, lineHeight: 23, color: C.ink },
  small: { fontFamily: F.bold, fontSize: 13, lineHeight: 18, color: C.muted },
});

export const b = StyleSheet.create({
  btn: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 4,
  },
  btnText: { fontFamily: F.display, fontSize: 18 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: F.heavy, fontSize: 14, color: C.ink },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontFamily: F.heavy, fontSize: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', ...shadow },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 999, backgroundColor: C.acc, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontFamily: F.heavy, fontSize: 11 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 16, gap: 12, ...shadow },
  label: { fontFamily: F.heavy, fontSize: 15, color: C.ink },
  input: { minHeight: 52, borderWidth: 2, borderColor: C.line, borderRadius: 14, paddingHorizontal: 16, fontFamily: F.body, fontSize: 16, color: C.ink, backgroundColor: C.card },
  tick: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center' },
  tickText: { fontFamily: F.bold, fontSize: 15, color: C.ink, flex: 1 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 2, borderColor: C.line, backgroundColor: C.card },
  optTitle: { fontFamily: F.heavy, fontSize: 16, color: C.ink },
  optSub: { fontFamily: F.bold, fontSize: 13, color: C.muted, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: '#9CA3AF', backgroundColor: '#fff' },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 16, padding: 14 },
  noteText: { fontFamily: F.bold, fontSize: 14, lineHeight: 20, flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  topTitle: { fontFamily: F.display, fontSize: 21, color: C.ink, flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,20,42,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 14, maxHeight: '90%' },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: C.line },
});
