// The buyer's parent pays for a buy request that both parents approved.
// Money goes to the seller's parent's Stripe account (minus the optional platform fee).
import Stripe from 'npm:stripe@17';
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

// ---- shared helpers (kept in each function so it deploys as one file) ----

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export const fail = (message: string, status = 400) => json({ error: message }, status);

/** Service-role client: bypasses row level security. Only use after checking who is calling. */
export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

/** The signed-in caller, from the Authorization header. */
export async function caller(req: Request): Promise<User | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user;
}

export const isParent = (u: User) => (u.app_metadata?.role ?? 'parent') === 'parent';

/** Where Stripe sends parents back to after onboarding or paying (the website). */
export const siteUrl = () => (Deno.env.get('SITE_URL') ?? 'http://localhost:8081').replace(/\/$/, '');

export const KID_EMAIL_DOMAIN = 'kids.toyswap.app';
// ---- end helpers ----

// Created on first use, so the function still answers clearly before the Stripe key is added.
let _stripe: Stripe | null = null;
const stripeClient = () => (_stripe ??= new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() }));
const FEE = Number(Deno.env.get('PLATFORM_FEE_CENTS') ?? '0');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return fail('Payments are not set up yet', 503);
  const user = await caller(req);
  if (!user || !isParent(user)) return fail('Only parents can pay', 401);
  const { request_id } = await req.json().catch(() => ({}));

  const db = admin();
  const { data: r } = await db.from('requests').select('*').eq('id', request_id).maybeSingle();
  if (!r || r.type !== 'buy' || r.status !== 'approved') return fail('This request is not ready to pay');
  const { data: buyer } = await db.from('kids').select('id, parent_id, nickname').eq('id', r.kid_id).single();
  if (!buyer || buyer.parent_id !== user.id) return fail('Only the buyer’s parent can pay', 403);
  const { data: toy } = await db.from('toys').select('id, name, owner_id').eq('id', r.toy_id).single();
  const { data: seller } = await db.from('kids').select('parent_id').eq('id', toy!.owner_id).single();
  const { data: sellerParent } = await db.from('parents').select('stripe_account_id, stripe_ready').eq('id', seller!.parent_id).single();
  if (!sellerParent?.stripe_account_id || !sellerParent.stripe_ready) {
    return fail('The seller’s parent hasn’t set up payouts yet. We’ve let them know; try again later.');
  }

  const session = await stripeClient().checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: r.amount_cents, product_data: { name: `${toy!.name} (ToySwap)` } } }],
    payment_intent_data: {
      transfer_data: { destination: sellerParent.stripe_account_id },
      ...(FEE > 0 ? { application_fee_amount: Math.min(FEE, r.amount_cents - 50) } : {}),
      metadata: { request_id: String(r.id) },
    },
    metadata: { request_id: String(r.id) },
    success_url: `${siteUrl()}/parent?paid=${r.id}`,
    cancel_url: `${siteUrl()}/parent?paid=cancelled`,
  });
  await db.from('requests').update({ stripe_session_id: session.id }).eq('id', r.id);
  return json({ url: session.url });
});
