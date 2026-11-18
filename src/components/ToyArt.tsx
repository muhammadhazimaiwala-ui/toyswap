import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ArtKey, TILE, Toy } from '../data';

const shapes: Record<ArtKey, React.ReactNode> = {
  bear: (
    <G>
      <Circle cx={34} cy={30} r={14} fill="#B45309" />
      <Circle cx={34} cy={30} r={7} fill="#F59E0B" />
      <Circle cx={86} cy={30} r={14} fill="#B45309" />
      <Circle cx={86} cy={30} r={7} fill="#F59E0B" />
      <Circle cx={60} cy={58} r={36} fill="#D97706" />
      <Ellipse cx={50} cy={42} rx={14} ry={9} fill="#F59E0B" opacity={0.45} />
      <Ellipse cx={60} cy={70} rx={16} ry={12} fill="#FDE68A" />
      <Circle cx={47} cy={52} r={4} fill="#1C1A3A" />
      <Circle cx={73} cy={52} r={4} fill="#1C1A3A" />
      <Ellipse cx={60} cy={65} rx={5} ry={4} fill="#1C1A3A" />
      <Path d="M54 74 Q60 79 66 74" stroke="#1C1A3A" strokeWidth={2} fill="none" strokeLinecap="round" />
    </G>
  ),
  car: (
    <G>
      <Path d="M30 52 L44 36 H78 L92 52 Z" fill="#1D4ED8" />
      <Rect x={16} y={52} width={88} height={26} rx={10} fill="#2563EB" />
      <Rect x={22} y={56} width={40} height={6} rx={3} fill="#60A5FA" opacity={0.7} />
      <Rect x={48} y={40} width={12} height={12} fill="#BFDBFE" />
      <Rect x={64} y={40} width={12} height={12} fill="#BFDBFE" />
      <Circle cx={38} cy={80} r={11} fill="#1C1A3A" />
      <Circle cx={82} cy={80} r={11} fill="#1C1A3A" />
      <Circle cx={38} cy={80} r={4} fill="#E5E7EB" />
      <Circle cx={82} cy={80} r={4} fill="#E5E7EB" />
    </G>
  ),
  rocket: (
    <G>
      <Path d="M60 14 C76 28 80 48 78 76 H42 C40 48 44 28 60 14 Z" fill="#F8FAFC" stroke="#6D28D9" strokeWidth={4} />
      <Circle cx={60} cy={46} r={9} fill="#60A5FA" stroke="#6D28D9" strokeWidth={4} />
      <Path d="M42 62 L28 84 L42 80 Z" fill="#DC2626" />
      <Path d="M78 62 L92 84 L78 80 Z" fill="#DC2626" />
      <Path d="M50 78 L60 104 L70 78 Z" fill="#F59E0B" />
    </G>
  ),
  blocks: (
    <G>
      <Rect x={18} y={62} width={38} height={38} rx={6} fill="#DC2626" />
      <Rect x={62} y={62} width={38} height={38} rx={6} fill="#2563EB" />
      <Rect x={40} y={20} width={38} height={38} rx={6} fill="#16A34A" />
      <SvgText x={37} y={89} fontSize={24} fontWeight="bold" fill="#fff" textAnchor="middle">A</SvgText>
      <SvgText x={81} y={89} fontSize={24} fontWeight="bold" fill="#fff" textAnchor="middle">B</SvgText>
      <SvgText x={59} y={47} fontSize={24} fontWeight="bold" fill="#fff" textAnchor="middle">C</SvgText>
    </G>
  ),
  puzzle: (
    <G>
      <Rect x={20} y={20} width={38} height={38} rx={4} fill="#16A34A" />
      <Rect x={62} y={20} width={38} height={38} rx={4} fill="#F59E0B" />
      <Rect x={20} y={62} width={38} height={38} rx={4} fill="#2563EB" />
      <Rect x={62} y={62} width={38} height={38} rx={4} fill="#DC2626" rotation={8} origin="81, 81" />
      <Circle cx={60} cy={39} r={7} fill="#16A34A" />
      <Circle cx={39} cy={60} r={7} fill="#16A34A" />
      <Circle cx={60} cy={81} r={7} fill="#2563EB" />
      <Circle cx={81} cy={60} r={7} fill="#F59E0B" />
    </G>
  ),
  book: (
    <G>
      <Path d="M60 34 C48 26 32 24 18 28 V92 C32 88 48 90 60 98 Z" fill="#DB2777" />
      <Path d="M60 34 C72 26 88 24 102 28 V92 C88 88 72 90 60 98 Z" fill="#EC4899" />
      <Path d="M60 34 V98" stroke="#831843" strokeWidth={3} />
      <Circle cx={82} cy={50} r={8} fill="#FDE68A" />
      <Path d="M28 50 H48 M28 60 H48 M28 70 H44" stroke="#FBCFE8" strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  dino: (
    <G>
      <Path d="M20 86 Q20 60 46 58 L70 58 Q78 40 92 36 Q106 34 106 46 Q106 58 92 58 L88 86 Z" fill="#16A34A" />
      <Circle cx={97} cy={44} r={3.5} fill="#1C1A3A" />
      <Path d="M44 58 L50 46 L56 58 M58 58 L64 46 L70 58" fill="#15803D" />
      <Rect x={30} y={82} width={13} height={18} rx={4} fill="#15803D" />
      <Rect x={68} y={82} width={13} height={18} rx={4} fill="#15803D" />
      <Path d="M22 78 L6 90 L26 90 Z" fill="#16A34A" />
    </G>
  ),
  robot: (
    <G>
      <Rect x={34} y={40} width={52} height={44} rx={10} fill="#94A3B8" />
      <Rect x={42} y={50} width={36} height={20} rx={6} fill="#1E293B" />
      <Circle cx={52} cy={60} r={4} fill="#60A5FA" />
      <Circle cx={68} cy={60} r={4} fill="#60A5FA" />
      <Path d="M60 40 V26" stroke="#64748B" strokeWidth={4} />
      <Circle cx={60} cy={24} r={5} fill="#DC2626" />
      <Rect x={40} y={86} width={12} height={14} rx={3} fill="#64748B" />
      <Rect x={68} y={86} width={12} height={14} rx={3} fill="#64748B" />
      <Rect x={22} y={50} width={10} height={26} rx={5} fill="#64748B" />
      <Rect x={88} y={50} width={10} height={26} rx={5} fill="#64748B" />
    </G>
  ),
  kite: (
    <G>
      <Path d="M60 12 L92 50 L60 94 L28 50 Z" fill="#F59E0B" />
      <Path d="M60 12 L92 50 L60 50 Z" fill="#DC2626" />
      <Path d="M60 50 L60 94 L28 50 Z" fill="#2563EB" />
      <Path d="M60 12 V94 M28 50 H92" stroke="#7C2D12" strokeWidth={2.5} />
      <Path d="M60 94 Q48 102 60 108 Q72 114 62 120" stroke="#DC2626" strokeWidth={3} fill="none" />
    </G>
  ),
  ball: (
    <G>
      <Circle cx={60} cy={60} r={40} fill="#FACC15" />
      <Path d="M60 20 A40 40 0 0 1 100 60 L60 60 Z" fill="#DC2626" />
      <Path d="M20 60 A40 40 0 0 0 60 100 L60 60 Z" fill="#2563EB" />
      <Circle cx={60} cy={60} r={40} fill="none" stroke="#1C1A3A" strokeWidth={3} />
      <Circle cx={60} cy={60} r={8} fill="#fff" stroke="#1C1A3A" strokeWidth={3} />
      <Ellipse cx={44} cy={38} rx={10} ry={6} fill="#fff" opacity={0.35} />
    </G>
  ),
};

export function ToyArt({ art, size, viewBox = '0 0 120 120' }: { art: ArtKey; size: number; viewBox?: string }) {
  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      <Ellipse cx={60} cy={110} rx={36} ry={6} fill="#1C1A3A" opacity={0.13} />
      {shapes[art] ?? shapes.blocks}
    </Svg>
  );
}

/** A toy picture on its coloured tile: the kid's photo if there is one, else the drawing. */
export function ToyTile({
  toy,
  size,
  height,
  radius = 16,
  zoom = false,
  plain = false,
  style,
}: {
  toy: Pick<Toy, 'art' | 'photo'>;
  size: number;
  height?: number;
  radius?: number;
  zoom?: boolean;
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { width: size, height: height ?? size, borderRadius: radius, backgroundColor: plain ? '#FFFFFF' : TILE[toy.art], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        style,
      ]}
    >
      {toy.photo ? (
        <Image source={{ uri: toy.photo }} style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
      ) : (
        <ToyArt art={toy.art} size={Math.min(size, height ?? size) * 0.72} viewBox={zoom ? '22 18 76 76' : undefined} />
      )}
    </View>
  );
}
