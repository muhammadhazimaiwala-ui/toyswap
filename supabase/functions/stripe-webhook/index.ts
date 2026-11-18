// Stripe calls this when a payment finishes or a parent's payout account changes.
// Deploy with JWT verification off (Stripe doesn't send a Supabase token); the signature check protects it.
import Stripe from 'npm:stripe@17';
import { admin } from '../_shared/util.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get('Stripe-Signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, crypto);
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
