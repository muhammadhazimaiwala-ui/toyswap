import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { ArtKey } from './data';
import { callFunction, errText, photoUrl, supabase } from './lib/supabase';

/* ---------- types the screens use ---------- */
export type ToyStatus = 'pending' | 'live' | 'reserved' | 'sold' | 'declined' | 'removed';
export type Toy = {
  id: number;
  name: string;
  cat: string;
  art: ArtKey;
  price: number | null; // dollars
  priceCents: number | null;
  swap: boolean;
  used: string;
  cond: string;
  age: string;
  note: string;
  photo: string | null;
  status: ToyStatus;
  ownerId: string;
  soldTo: string | null;
  seller: string;
  sellerColor: string;
  sellerTrades: number;
};
export type Kid = {
  id: string;
  parent_id: string;
  nickname: string;
  avatar: string;
  age_group: string;
  care_score: number;
  trades: number;
  earned_cents: number;
  goal_name: string;
  goal_cents: number;
  can_sell: boolean;
  can_swap: boolean;
  spend_limit_cents: number;
  promise_at: string | null;
};
export type Parent = { id: string; full_name: string; country: string; stripe_account_id: string | null; stripe_ready: boolean };
export type Req = {
  id: number;
  type: 'listing' | 'buy' | 'swap' | 'story';
  kid_id: string;
  toy_id: number | null;
  offer_toy_id: number | null;
  story_id: number | null;
  handover: 'meetup' | 'delivery' | null;
  amount_cents: number | null;
  buyer_parent_ok: boolean | null;
  seller_parent_ok: boolean | null;
  status: 'waiting' | 'approved' | 'declined' | 'paid' | 'cancelled';
  created_at: string;
};
export type Story = { id: number; kid_id: string; toy_id: number; text: string; status: 'check' | 'live' | 'declined'; created_at: string };
export type Question = { id: number; toy_id: number; from_kid: string; question: number; answer: number | null; created_at: string };

export const ANSWERS = ['Yes, it’s still available!', 'I’ll ask my parent to add a photo', 'Yes, I’d swap it!', 'Sorry, not right now'];

/* ---------- auth ---------- */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const role: 'kid' | 'parent' | null = session ? ((session.user.app_metadata?.role as 'kid' | undefined) ?? 'parent') : null;
  return { session, loading, role, userId: session?.user.id ?? null };
}

const must = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

/* ---------- toys ---------- */
type ToyRow = {
  id: number; owner_id: string; name: string; category: string; art: string; price_cents: number | null; swap: boolean; used: string;
  condition: string; age: string; note: string; photo_path: string | null; status: ToyStatus; sold_to: string | null;
};

async function withSellers(rows: ToyRow[]): Promise<Toy[]> {
  const ids = [...new Set(rows.map((r) => r.owner_id))];
  const kids = ids.length ? must(await supabase.from('kid_public').select('id, nickname, avatar, trades').in('id', ids)) : [];
  const byId = new Map((kids as { id: string; nickname: string; avatar: string; trades: number }[]).map((k) => [k.id, k]));
  return rows.map((r) => {
    const k = byId.get(r.owner_id);
    return {
      id: r.id, name: r.name, cat: r.category, art: r.art as ArtKey, price: r.price_cents != null ? r.price_cents / 100 : null, priceCents: r.price_cents,
      swap: r.swap, used: r.used, cond: r.condition, age: r.age, note: r.note, photo: photoUrl(r.photo_path), status: r.status, ownerId: r.owner_id,
      soldTo: r.sold_to, seller: k?.nickname ?? 'A kid', sellerColor: k?.avatar ?? '#3B82F6', sellerTrades: k?.trades ?? 0,
    };
  });
}

export const useToys = () =>
  useQuery({
    queryKey: ['toys'],
    queryFn: async () => withSellers(must(await supabase.from('toys').select('*').eq('status', 'live').order('created_at', { ascending: false }).limit(200)) as ToyRow[]),
  });

export const useToy = (id: number) =>
  useQuery({
    queryKey: ['toy', id],
    queryFn: async () => {
      const rows = must(await supabase.from('toys').select('*').eq('id', id)) as ToyRow[];
      return (await withSellers(rows))[0] ?? null;
    },
  });

/** Toys a kid owns or got, plus any toys mentioned in their requests (for labels). */
export const useMyToys = (kidId: string | null | undefined) =>
  useQuery({
    enabled: !!kidId,
    queryKey: ['myToys', kidId],
    queryFn: async () =>
      withSellers(must(await supabase.from('toys').select('*').or(`owner_id.eq.${kidId},sold_to.eq.${kidId}`).neq('status', 'removed').order('created_at', { ascending: false })) as ToyRow[]),
  });

export const useToysById = (ids: number[]) =>
  useQuery({
    enabled: ids.length > 0,
    queryKey: ['toysById', [...ids].sort((a, b) => a - b).join(',')],
    queryFn: async () => withSellers(must(await supabase.from('toys').select('*').in('id', ids)) as ToyRow[]),
  });

/* ---------- people ---------- */
export const useKid = (id: string | null | undefined) =>
  useQuery({ enabled: !!id, queryKey: ['kid', id], queryFn: async () => must(await supabase.from('kids').select('*').eq('id', id!).maybeSingle()) as Kid | null });

export const useParent = (id: string | null | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: ['parent', id],
    queryFn: async () => {
      const parent = must(await supabase.from('parents').select('*').eq('id', id!).maybeSingle()) as Parent | null;
      const kids = must(await supabase.from('kids').select('*').eq('parent_id', id!).order('created_at')) as Kid[];
      return { parent, kids };
    },
  });

/* ---------- requests, stories, wishlist, questions, activity ---------- */
export const useRequests = (enabled = true) =>
  useQuery({ enabled, queryKey: ['requests'], queryFn: async () => must(await supabase.from('requests').select('*').order('created_at', { ascending: false }).limit(200)) as Req[] });

export const useStories = () =>
  useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const stories = must(await supabase.from('stories').select('*').neq('status', 'declined').order('created_at', { ascending: false }).limit(60)) as Story[];
      const ids = stories.map((s) => s.id);
      const counts = ids.length ? (must(await supabase.from('story_counts').select('*').in('story_id', ids)) as { story_id: number; kind: string; n: number }[]) : [];
      const me = (await supabase.auth.getUser()).data.user?.id;
      const mine = ids.length && me ? (must(await supabase.from('reactions').select('story_id, kind').eq('kid_id', me).in('story_id', ids)) as { story_id: number; kind: string }[]) : [];
      const kidIds = [...new Set(stories.map((s) => s.kid_id))];
      const kids = kidIds.length ? (must(await supabase.from('kid_public').select('id, nickname, avatar').in('id', kidIds)) as { id: string; nickname: string; avatar: string }[]) : [];
      return {
        stories,
        count: (id: number, kind: string) => counts.find((c) => c.story_id === id && c.kind === kind)?.n ?? 0,
        reacted: (id: number, kind: string) => mine.some((m) => m.story_id === id && m.kind === kind),
        kid: (id: string) => kids.find((k) => k.id === id),
      };
    },
  });

export const useSaved = (kidId: string | null | undefined) =>
  useQuery({ enabled: !!kidId, queryKey: ['saved', kidId], queryFn: async () => (must(await supabase.from('saved').select('toy_id').eq('kid_id', kidId!)) as { toy_id: number }[]).map((r) => r.toy_id) });

export const useQuestions = (enabled = true) =>
  useQuery({ enabled, queryKey: ['questions'], queryFn: async () => must(await supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(100)) as Question[] });

export const useActivity = (kidIds: string[]) =>
  useQuery({
    enabled: kidIds.length > 0,
    queryKey: ['activity', kidIds.join(',')],
    queryFn: async () => must(await supabase.from('activity').select('*').in('kid_id', kidIds).order('created_at', { ascending: false }).limit(20)) as { id: number; kid_id: string; text: string; created_at: string }[],
  });

/* ---------- actions ---------- */
/** Run a database function or server call, refresh everything, and report errors as plain sentences. */
export function useAction(toast: (m: string) => void) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSettled: () => qc.invalidateQueries(),
    onError: (e) => toast(errText(e)),
  });
  return { run: (fn: () => Promise<unknown>) => m.mutateAsync(fn).then(() => true, () => false), busy: m.isPending };
}

export const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
};

export { callFunction };

/** Upload a photo from the phone (or browser) into the kid's own folder. Returns the storage path. */
export async function uploadPhoto(kidId: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const buf = await res.arrayBuffer();
  const type = res.headers.get('content-type')?.startsWith('image/') ? res.headers.get('content-type')! : 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const path = `${kidId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('toy-photos').upload(path, buf, { contentType: type, upsert: false });
  if (error) throw new Error('Could not upload the photo. Try a smaller one.');
  return path;
}

export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return 'Yesterday';
  return new Date(iso).toLocaleDateString();
};
