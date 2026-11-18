export const C = {
  bg: '#EEF5FF',
  card: '#FFFFFF',
  ink: '#1C1A3A',
  muted: '#55536E',
  line: '#D6DEEB',
  soft: '#EEF2F8',
  acc: '#C2410C',
  accDark: '#7C2D12',
  blue: '#1D4ED8',
  blueDark: '#1E3A8A',
  green: '#15803D',
  greenDark: '#14532D',
  sun: '#FFD43B',
  gs: '#DCFCE7',
  gi: '#166534',
  os: '#FFE8D9',
  oi: '#9A3412',
  bs: '#DBEAFE',
  bi: '#1E3A8A',
  ps: '#EDE9FE',
  pi: '#5B21B6',
  ys: '#FFF7D6',
  yi: '#713F12',
  night: '#1C1A3A',
};

export const F = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
};

export const shadow = {
  shadowColor: '#1C1A3A',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

export const money = (n: number) => '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));
