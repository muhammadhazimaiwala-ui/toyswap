// A parent creates a login for their child. Kids sign in with nickname + password;
// behind the scenes that's a private, never-emailed address on our own domain.
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

const AGES = ['Ages 5–7', 'Ages 8–10', 'Ages 11–13'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await caller(req);
  if (!user || !isParent(user)) return fail('Only a signed-in parent can add a child', 401);

  const body = await req.json().catch(() => ({}));
  const nickname = String(body.nickname ?? '').trim();
  const password = String(body.password ?? '');
  const avatar = /^#[0-9A-Fa-f]{6}$/.test(body.avatar) ? body.avatar : '#F97316';
  const age = AGES.includes(body.age_group) ? body.age_group : AGES[1];
  if (!/^[A-Za-z0-9]{3,16}$/.test(nickname)) return fail('The nickname needs 3 to 16 letters or numbers, with no spaces.');
  if (password.length < 6) return fail("The kid's password needs at least 6 characters.");

  const db = admin();
  const { data: parent } = await db.from('parents').select('id').eq('id', user.id).maybeSingle();
  if (!parent) return fail('Finish the parent sign-up first');
  const { count } = await db.from('kids').select('id', { count: 'exact', head: true }).eq('parent_id', user.id);
  if ((count ?? 0) >= 6) return fail('A family can have up to 6 kids');
  const { data: taken } = await db.from('kids').select('id').ilike('nickname', nickname).maybeSingle();
  if (taken) return fail('That nickname is taken. Try another one!');

  const { data: created, error } = await db.auth.admin.createUser({
    email: `${nickname.toLowerCase()}@${KID_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    app_metadata: { role: 'kid', parent_id: user.id },
    user_metadata: { nickname },
  });
  if (error || !created.user) return fail(error?.message.includes('already') ? 'That nickname is taken. Try another one!' : 'Could not create the account');

  const { error: insErr } = await db.from('kids').insert({ id: created.user.id, parent_id: user.id, nickname, avatar, age_group: age });
  if (insErr) {
    await db.auth.admin.deleteUser(created.user.id);
    return fail('Could not create the account');
  }
  await db.from('activity').insert({ kid_id: created.user.id, text: `${nickname} joined ToySwap and made the Care Promise` });
  return json({ id: created.user.id, nickname });
});
