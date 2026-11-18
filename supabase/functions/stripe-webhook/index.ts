// Stripe calls this when a payment finishes or a parent's payout account changes.
// Deploy with JWT verification off (Stripe doesn't send a Supabase token); the signature check protects it.
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
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (!Deno.env.get('STRIPE_SECRET_KEY') || !Deno.env.get('STRIPE_WEBHOOK_SECRET')) return new Response('Payments are not set up yet', { status: 503 });
  const sig = req.headers.get('Stripe-Signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripeClient().webhooks.constructEventAsync(body, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, crypto);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  const db = admin();
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === 'paid' && s.metadata?.request_id) {
      const { error } = await db.rpc('mark_paid', { p_req: Number(s.metadata.request_id), p_session: s.id });
      if (error) return new Response(error.message, { status: 500 });
    }
  }
  if (event.type === 'account.updated') {
    const a = event.data.object as Stripe.Account;
    await db.from('parents').update({ stripe_ready: !!(a.charges_enabled && a.payouts_enabled) }).eq('stripe_account_id', a.id);
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
