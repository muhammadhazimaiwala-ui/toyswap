// Parents set up payouts so money from their kid's sales goes to their bank (Stripe Connect Express).
// POST { action: "link" }   → { url } to Stripe's onboarding page
// POST { action: "status" } → { ready } after they come back
import Stripe from 'npm:stripe@17';
import { admin, caller, cors, fail, isParent, json, siteUrl } from '../_shared/util.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
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
    const acct = await stripe.accounts.retrieve(accountId);
    const ready = !!(acct.charges_enabled && acct.payouts_enabled);
    await db.from('parents').update({ stripe_ready: ready }).eq('id', user.id);
    return json({ ready });
  }

  if (!accountId) {
    const country = COUNTRY[p.country];
    if (!country) return fail(`Card payouts aren't available in ${p.country} yet. You can still swap toys.`);
    const acct = await stripe.accounts.create({
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
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${siteUrl()}/parent?payouts=retry`,
    return_url: `${siteUrl()}/parent?payouts=done`,
  });
  return json({ url: link.url });
});
