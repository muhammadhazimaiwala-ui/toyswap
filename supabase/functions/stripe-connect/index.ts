// Parents set up payouts so money from their kid's sales goes to their bank (Stripe Connect Express).
// POST { action: "link" }   → { url } to Stripe's onboarding page
// POST { action: "status" } → { ready } after they come back
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
const COUNTRY: Record<string, string> = { 'United States': 'US', 'United Kingdom': 'GB', Canada: 'CA', India: 'IN' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!Deno.env.get('STRIPE_SECRET_KEY')) return fail('Payments are not set up yet', 503);
  const user = await caller(req);
  if (!user || !isParent(user)) return fail('Only parents can set up payouts', 401);
  const { action } = await req.json().catch(() => ({ action: 'link' }));

  const db = admin();
  const { data: p } = await db.from('parents').select('*').eq('id', user.id).single();
  if (!p) return fail('Finish the parent sign-up first');

  let accountId: string | null = p.stripe_account_id;
  if (action === 'status') {
    if (!accountId) return json({ ready: false });
    const acct = await stripeClient().accounts.retrieve(accountId);
    const ready = !!(acct.charges_enabled && acct.payouts_enabled);
    await db.from('parents').update({ stripe_ready: ready }).eq('id', user.id);
    return json({ ready });
  }

  if (!accountId) {
    const country = COUNTRY[p.country];
    if (!country) return fail(`Card payouts aren't available in ${p.country} yet. You can still swap toys.`);
    const acct = await stripeClient().accounts.create({
      type: 'express',
      country,
      email: user.email,
      business_type: 'individual',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { parent_id: user.id },
    });
    accountId = acct.id;
    await db.from('parents').update({ stripe_account_id: accountId }).eq('id', user.id);
  }
  const link = await stripeClient().accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${siteUrl()}/parent?payouts=retry`,
    return_url: `${siteUrl()}/parent?payouts=done`,
  });
  return json({ url: link.url });
});
