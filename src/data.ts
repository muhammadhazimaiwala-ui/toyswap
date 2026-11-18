export type ArtKey = 'bear' | 'car' | 'rocket' | 'blocks' | 'puzzle' | 'book' | 'dino' | 'robot' | 'kite' | 'ball';
export type ToyStatus = 'live' | 'pending' | 'sold' | 'bought' | 'declined';

export type Toy = {
  id: number;
  name: string;
  cat: string;
  art: ArtKey;
  price: number | null;
  swap: boolean;
  used: string;
  cond: string;
  age: string;
  seller: string; // 'me' = the logged-in kid
  status: ToyStatus;
  note: string;
  photo?: string | null;
};

export type RequestType = 'listing' | 'buy' | 'swap' | 'story';
export type Req = {
  id: number;
  type: RequestType;
  toy: number;
  offer?: number;
  story?: number;
  hand?: number; // 0 meet-up, 1 delivery
  status: 'waiting' | 'approved' | 'declined';
};

export type Story = {
  id: number;
  by: string;
  toy: number;
  text: string;
  cool: number;
  swap: number;
  luck: number;
  status: 'live' | 'check';
  when: string;
};

export type Session = {
  role: 'kid' | 'parent';
  nick: string;
  color: string;
  age: string;
  wallet: number;
  care: number;
  trades: number;
  goal: { name: string; target: number };
};

export type State = {
  session: Session | null;
  saved: number[];
  reacted: Record<string, boolean>;
  nextId: number;
  settings: { sell: boolean; swap: boolean; limit: number };
  toys: Toy[];
  requests: Req[];
  stories: Story[];
  log: { t: string; when: string }[];
};

export const TILE: Record<ArtKey, string> = {
  bear: '#FFE8D9', car: '#DBEAFE', rocket: '#EDE9FE', blocks: '#FEF3C7', puzzle: '#DCFCE7',
  book: '#FCE7F3', dino: '#D1FAE5', robot: '#E2E8F0', kite: '#FEF9C3', ball: '#E0F2FE',
};
export const CATS = ['All', 'Soft toys', 'Cars', 'Blocks', 'Puzzles', 'Space', 'Books', 'Outdoor', 'Robots', 'Figures'];
export const CAT_ART: Record<string, ArtKey> = {
  'Soft toys': 'bear', Cars: 'car', Blocks: 'blocks', Puzzles: 'puzzle', Space: 'rocket',
  Books: 'book', Outdoor: 'kite', Robots: 'robot', Figures: 'dino',
};
export const AVATARS: [string, string][] = [
  ['Fox', '#F97316'], ['Ocean', '#3B82F6'], ['Leaf', '#22C55E'], ['Grape', '#A855F7'], ['Berry', '#EC4899'], ['Sunny', '#EAB308'],
];
export const KIDS: Record<string, string> = {
  TinyTiger: '#EAB308', ZoomZain: '#3B82F6', BlockBoss: '#22C55E', PuzzlePari: '#EC4899',
  StarSami: '#A855F7', BoltBilal: '#F97316', SkySara: '#3B82F6', WaveWafa: '#22C55E',
};
export const RATE: Record<string, number> = {
  TinyTiger: 4.9, ZoomZain: 4.8, BlockBoss: 5.0, PuzzlePari: 4.9, StarSami: 4.7, BoltBilal: 4.8, SkySara: 4.9, WaveWafa: 4.6, me: 4.9,
};
export const AGES = ['Ages 5–7', 'Ages 8–10', 'Ages 11–13'];
export const USED = ['Under 1 month', '1–3 months', '3–6 months', '6+ months'];
export const CONDS: [string, string][] = [
  ['Like new', 'Looks almost like the day you got it'],
  ['Good', 'A few small marks, works perfectly'],
  ['Played-with', 'Well loved, still fun to play'],
];
export const CHECKS = ['I cleaned it', 'All the pieces are here', 'Nothing is broken', 'It works (batteries too!)'];
export const PROMISES = [
  "I'll play as much as I like, but gently",
  "I'll keep my toys clean",
  "I'll keep all the pieces together",
  "I'll be kind and honest when I trade",
];
export const GOALS: [string, number][] = [['New bicycle', 20], ['Art kit', 8], ['Football', 12], ['Story books', 10]];
export const TIPS: { h: string; b: string; bg: string; fg: string }[] = [
  { h: 'Wipe it down', b: 'Use a damp cloth on plastic toys before you list them. Clean toys find new friends faster.', bg: '#DCFCE7', fg: '#166534' },
  { h: 'Keep a parts box', b: 'Put small pieces in a box or zip bag after playing, so nothing gets lost.', bg: '#DBEAFE', fg: '#1E3A8A' },
  { h: 'Batteries out', b: 'Take batteries out of toys you are not using. It stops leaks and keeps them working.', bg: '#FFF7D6', fg: '#713F12' },
];
export const QUESTIONS = ['Is this still available?', 'Can I see another photo?', 'Would you swap it?'];
export const SAFETY = [
  'A parent sets up every kid account and approves every deal.',
  'No private chat: kids only send ready-made messages.',
  'Nicknames and avatars only. Never a real name, school or address.',
  'Photos show only the toy: no faces, uniforms or houses.',
  'Hand-overs happen with parents, in public places, or by parent-arranged delivery.',
  'Anything that feels wrong can be reported, and a grown-up will look at it.',
];

export const fresh = (): State => ({
  session: null,
  saved: [],
  reacted: {},
  nextId: 100,
  settings: { sell: true, swap: true, limit: 10 },
  toys: [
    { id: 1, name: 'Cuddly teddy bear', cat: 'Soft toys', art: 'bear', price: 1, swap: true, used: '2 months', cond: 'Like new', age: '3+', seller: 'TinyTiger', status: 'live', note: "This was my favourite bear for bedtime. I'm a bit too big for it now. It was washed last week and smells nice!" },
    { id: 2, name: 'Blue racing car', cat: 'Cars', art: 'car', price: 2, swap: false, used: '4 months', cond: 'Good', age: '4+', seller: 'ZoomZain', status: 'live', note: "Still super fast on wooden floors. There's one tiny scratch on the roof." },
    { id: 3, name: 'Moon rocket', cat: 'Space', art: 'rocket', price: null, swap: true, used: '3 months', cond: 'Like new', age: '5+', seller: 'me', status: 'live', note: "I flew this rocket every day for 3 months! Now I'd like a puzzle." },
    { id: 4, name: 'ABC building blocks', cat: 'Blocks', art: 'blocks', price: 3, swap: true, used: '6 months', cond: 'Good', age: '2+', seller: 'BlockBoss', status: 'live', note: '30 wooden blocks with letters and numbers. They come in their own bag.' },
    { id: 5, name: 'Jungle puzzle, 48 pcs', cat: 'Puzzles', art: 'puzzle', price: 1, swap: false, used: '1 month', cond: 'Like new', age: '5+', seller: 'PuzzlePari', status: 'live', note: 'Every piece is there. I counted twice!' },
    { id: 6, name: 'Bedtime picture book', cat: 'Books', art: 'book', price: null, swap: true, used: '5 months', cond: 'Good', age: '3+', seller: 'StarSami', status: 'live', note: 'A sweet story about the moon. No torn pages, I promise.' },
    { id: 7, name: 'Dino figure set', cat: 'Figures', art: 'dino', price: 2, swap: true, used: '5 months', cond: 'Good', age: '4+', seller: 'me', status: 'pending', note: 'Six dinosaurs. The T-rex is my favourite, but I want something new.' },
    { id: 8, name: 'Beep-boop robot', cat: 'Robots', art: 'robot', price: 4, swap: true, used: '3 months', cond: 'Good', age: '6+', seller: 'BoltBilal', status: 'live', note: 'It lights up and walks. Batteries are included.' },
    { id: 9, name: 'Rainbow kite', cat: 'Outdoor', art: 'kite', price: 2, swap: false, used: '2 months', cond: 'Like new', age: '6+', seller: 'SkySara', status: 'live', note: 'Flies really high on windy days. The string is all wound up neatly.' },
    { id: 10, name: 'Beach ball', cat: 'Outdoor', art: 'ball', price: 1, swap: true, used: '1 summer', cond: 'Played-with', age: '3+', seller: 'WaveWafa', status: 'live', note: 'No holes, it stays full of air. Great for the pool.' },
  ],
  requests: [{ id: 1, type: 'listing', toy: 7, status: 'waiting' }],
  stories: [
    { id: 1, by: 'TinyTiger', toy: 1, text: "I've cuddled this bear for 2 months and kept it super clean. Ready for a new friend!", cool: 14, swap: 2, luck: 5, status: 'live', when: '1h ago' },
    { id: 2, by: 'ZoomZain', toy: 2, text: "My racing car is still really fast! I'm selling it to save up for a bike.", cool: 8, swap: 0, luck: 6, status: 'live', when: '3h ago' },
    { id: 3, by: 'SkySara', toy: 9, text: 'Looking for a swap! Does anyone have a puzzle or a book?', cool: 5, swap: 3, luck: 1, status: 'live', when: 'Yesterday' },
  ],
  log: [{ t: 'Dino figure set was sent to the parent for approval', when: 'Today' }],
});
