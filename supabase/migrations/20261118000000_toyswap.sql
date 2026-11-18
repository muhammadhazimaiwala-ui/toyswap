-- ToySwap database
-- Parents sign up with email. Kids get their own login, created by their parent.
-- Every write goes through the functions at the bottom (security definer), so the
-- rules (care check, parent approval, spending limit, ready-made messages) can't be skipped.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.my_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'parent')
$$;

-- ---------- tables ----------
create table public.parents (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  country text not null default 'United States',
  consent_at timestamptz not null default now(),
  stripe_account_id text,
  stripe_ready boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.kids (
  id uuid primary key references auth.users on delete cascade,
  parent_id uuid not null references public.parents on delete cascade,
  nickname text not null check (nickname ~ '^[A-Za-z0-9]{3,16}$'),
  avatar text not null default '#F97316' check (avatar ~ '^#[0-9A-Fa-f]{6}$'),
  age_group text not null default 'Ages 8–10',
  care_score int not null default 90 check (care_score between 0 and 100),
  trades int not null default 0,
  earned_cents int not null default 0,
  goal_name text not null default 'New bicycle',
  goal_cents int not null default 2000 check (goal_cents between 100 and 100000),
  can_sell boolean not null default true,
  can_swap boolean not null default true,
  spend_limit_cents int not null default 1000 check (spend_limit_cents between 0 and 10000),
  promise_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index kids_nickname_unique on public.kids (lower(nickname));

create or replace function public.is_parent_of(kid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kids k where k.id = kid and k.parent_id = auth.uid())
$$;

create or replace function public.is_kid() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'kid' and exists (select 1 from public.kids k where k.id = auth.uid())
$$;

create type public.toy_status as enum ('pending', 'live', 'reserved', 'sold', 'declined', 'removed');

create table public.toys (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.kids on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  category text not null check (category in ('Soft toys','Cars','Blocks','Puzzles','Space','Books','Outdoor','Robots','Figures')),
  art text not null,
  price_cents int check (price_cents is null or price_cents between 100 and 2000),
  swap boolean not null default false,
  used text not null,
  condition text not null check (condition in ('Like new','Good','Played-with')),
  age text not null default '3+',
  note text not null default '' check (char_length(note) <= 200),
  photo_path text,
  status public.toy_status not null default 'pending',
  sold_to uuid references public.kids on delete set null,
  created_at timestamptz not null default now(),
  check (price_cents is not null or swap)
);
create index toys_live_idx on public.toys (status, created_at desc);
create index toys_owner_idx on public.toys (owner_id);

create table public.stories (
  id bigint generated always as identity primary key,
  kid_id uuid not null references public.kids on delete cascade,
  toy_id bigint not null references public.toys on delete cascade,
  text text not null,
  status text not null default 'check' check (status in ('check','live','declined')),
  created_at timestamptz not null default now()
);

create table public.reactions (
  story_id bigint not null references public.stories on delete cascade,
  kid_id uuid not null references public.kids on delete cascade,
  kind text not null check (kind in ('cool','swap','luck')),
  primary key (story_id, kid_id, kind)
);

create type public.req_type as enum ('listing', 'buy', 'swap', 'story');
create type public.req_status as enum ('waiting', 'approved', 'declined', 'paid', 'cancelled');

create table public.requests (
  id bigint generated always as identity primary key,
  type public.req_type not null,
  kid_id uuid not null references public.kids on delete cascade,      -- the kid who asked
  toy_id bigint references public.toys on delete cascade,             -- listing / the toy wanted
  offer_toy_id bigint references public.toys on delete cascade,       -- swap: the kid's own toy
  story_id bigint references public.stories on delete cascade,
  handover text check (handover in ('meetup','delivery')),
  amount_cents int,
  buyer_parent_ok boolean,     -- buy/swap: the asking kid's parent
  seller_parent_ok boolean,    -- buy/swap: the toy owner's parent
  status public.req_status not null default 'waiting',
  stripe_session_id text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index requests_kid_idx on public.requests (kid_id, created_at desc);
create index requests_toy_idx on public.requests (toy_id);

create table public.questions (
  id bigint generated always as identity primary key,
  toy_id bigint not null references public.toys on delete cascade,
  from_kid uuid not null references public.kids on delete cascade,
  question int not null check (question between 0 and 2),
  answer int check (answer between 0 and 3),
  created_at timestamptz not null default now()
);

create table public.saved (
  kid_id uuid not null references public.kids on delete cascade,
  toy_id bigint not null references public.toys on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kid_id, toy_id)
);

create table public.activity (
  id bigint generated always as identity primary key,
  kid_id uuid not null references public.kids on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
create index activity_kid_idx on public.activity (kid_id, created_at desc);

-- ---------- row level security: reads only ----------
alter table public.parents enable row level security;
alter table public.kids enable row level security;
alter table public.toys enable row level security;
alter table public.stories enable row level security;
alter table public.reactions enable row level security;
alter table public.requests enable row level security;
alter table public.questions enable row level security;
alter table public.saved enable row level security;
alter table public.activity enable row level security;

create policy parents_self on public.parents for select to authenticated using (id = auth.uid());

-- a kid sees themself; a parent sees their kids. Other kids are only visible through kid_public.
create policy kids_read on public.kids for select to authenticated
  using (id = auth.uid() or parent_id = auth.uid());

-- helper checks run as the table owner so the policies below don't loop into each other
create or replace function public.toy_in_my_requests(p_toy bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.requests r where (r.toy_id = p_toy or r.offer_toy_id = p_toy)
                 and (r.kid_id = auth.uid() or public.is_parent_of(r.kid_id)))
$$;
create or replace function public.toy_is_mine_or_my_kids(p_toy bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.toys t where t.id = p_toy and (t.owner_id = auth.uid() or public.is_parent_of(t.owner_id)))
$$;

create policy toys_read on public.toys for select to authenticated using (
  status in ('live', 'reserved')
  or owner_id = auth.uid() or sold_to = auth.uid()
  or public.is_parent_of(owner_id) or public.is_parent_of(sold_to)
  or public.toy_in_my_requests(id)
);

create policy stories_read on public.stories for select to authenticated
  using (status = 'live' or kid_id = auth.uid() or public.is_parent_of(kid_id));

create policy reactions_read on public.reactions for select to authenticated using (true);

create policy requests_read on public.requests for select to authenticated using (
  kid_id = auth.uid() or public.is_parent_of(kid_id) or public.toy_is_mine_or_my_kids(toy_id)
);

create policy questions_read on public.questions for select to authenticated using (
  from_kid = auth.uid() or public.is_parent_of(from_kid) or public.toy_is_mine_or_my_kids(toy_id)
);

create policy saved_read on public.saved for select to authenticated using (kid_id = auth.uid());
create policy activity_read on public.activity for select to authenticated
  using (kid_id = auth.uid() or public.is_parent_of(kid_id));

-- what any signed-in user may know about another kid: nickname, avatar, trades. Nothing else.
create view public.kid_public with (security_invoker = false) as
  select id, nickname, avatar, trades from public.kids;
revoke all on public.kid_public from anon;
grant select on public.kid_public to authenticated;

create view public.story_counts with (security_invoker = true) as
  select story_id, kind, count(*)::int as n from public.reactions group by story_id, kind;
grant select on public.story_counts to authenticated;

-- no direct writes from the app: everything goes through the functions below
revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ---------- functions the app calls ----------
create or replace function public.log_activity(kid uuid, msg text) returns void
language sql security definer set search_path = public as $$
  insert into public.activity (kid_id, text) values (kid, msg);
$$;
revoke execute on function public.log_activity(uuid, text) from public, anon, authenticated;

-- parent: finish sign-up (called once after auth sign-up)
create or replace function public.parent_setup(p_full_name text, p_country text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.my_role() <> 'parent' then raise exception 'Only parents can do this'; end if;
  insert into public.parents (id, full_name, country) values (auth.uid(), trim(p_full_name), p_country)
  on conflict (id) do update set full_name = excluded.full_name, country = excluded.country;
end $$;

-- kid: list a toy (care check must be complete)
create or replace function public.list_toy(
  p_name text, p_category text, p_price_cents int, p_swap boolean, p_used text,
  p_condition text, p_note text, p_photo_path text, p_care_checks int
) returns bigint
language plpgsql security definer set search_path = public as $$
declare k public.kids; new_id bigint; arts jsonb := '{"Soft toys":"bear","Cars":"car","Blocks":"blocks","Puzzles":"puzzle","Space":"rocket","Books":"book","Outdoor":"kite","Robots":"robot","Figures":"dino"}';
begin
  if not public.is_kid() then raise exception 'Only kids can list toys'; end if;
  select * into k from public.kids where id = auth.uid();
  if p_care_checks <> 4 then raise exception 'Finish the care check first'; end if;
  if p_price_cents is not null and not k.can_sell then raise exception 'Selling is turned off by your parent'; end if;
  if p_swap and not k.can_swap then raise exception 'Swapping is turned off by your parent'; end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text then raise exception 'Bad photo'; end if;
  insert into public.toys (owner_id, name, category, art, price_cents, swap, used, condition, note, photo_path)
  values (k.id, trim(p_name), p_category, coalesce(arts ->> p_category, 'blocks'), p_price_cents, p_swap, p_used, p_condition, coalesce(trim(p_note), ''), p_photo_path)
  returning id into new_id;
  insert into public.requests (type, kid_id, toy_id) values ('listing', k.id, new_id);
  perform public.log_activity(k.id, k.nickname || ' sent ' || trim(p_name) || ' for approval');
  return new_id;
end $$;

create or replace function public.remove_toy(p_toy bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.toys set status = 'removed' where id = p_toy and owner_id = auth.uid() and status in ('pending','live');
  if not found then raise exception 'You can only remove your own toys that are not sold'; end if;
  update public.requests set status = 'cancelled' where (toy_id = p_toy or offer_toy_id = p_toy) and status in ('waiting','approved');
end $$;

-- kid: ask to buy
create or replace function public.request_buy(p_toy bigint, p_handover text) returns bigint
language plpgsql security definer set search_path = public as $$
declare k public.kids; t public.toys; rid bigint;
begin
  if not public.is_kid() then raise exception 'Only kids can ask to buy'; end if;
  select * into k from public.kids where id = auth.uid();
  select * into t from public.toys where id = p_toy;
  if t.id is null or t.status <> 'live' or t.price_cents is null then raise exception 'This toy is not for sale'; end if;
  if t.owner_id = k.id then raise exception 'This is your own toy'; end if;
  if t.price_cents > k.spend_limit_cents then raise exception 'That is over your spending limit. Ask your parent.'; end if;
  if exists (select 1 from public.requests where kid_id = k.id and toy_id = p_toy and status in ('waiting','approved')) then
    raise exception 'You already asked for this toy';
  end if;
  insert into public.requests (type, kid_id, toy_id, handover, amount_cents)
  values ('buy', k.id, p_toy, coalesce(p_handover, 'meetup'), t.price_cents) returning id into rid;
  perform public.log_activity(k.id, k.nickname || ' asked to buy ' || t.name);
  return rid;
end $$;

-- kid: offer a swap
create or replace function public.request_swap(p_toy bigint, p_offer bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare k public.kids; t public.toys; o public.toys; rid bigint;
begin
  if not public.is_kid() then raise exception 'Only kids can offer swaps'; end if;
  select * into k from public.kids where id = auth.uid();
  if not k.can_swap then raise exception 'Swapping is turned off by your parent'; end if;
  select * into t from public.toys where id = p_toy;
  select * into o from public.toys where id = p_offer;
  if t.id is null or t.status <> 'live' or not t.swap then raise exception 'This toy is not up for swapping'; end if;
  if o.id is null or o.owner_id <> k.id or o.status <> 'live' then raise exception 'You can only offer your own live toy'; end if;
  if t.owner_id = k.id then raise exception 'This is your own toy'; end if;
  insert into public.requests (type, kid_id, toy_id, offer_toy_id) values ('swap', k.id, p_toy, p_offer) returning id into rid;
  perform public.log_activity(k.id, k.nickname || ' offered ' || o.name || ' for ' || t.name);
  return rid;
end $$;

-- kid: share a story using a ready-made message (no free text)
create or replace function public.share_story(p_toy bigint, p_template int) returns bigint
language plpgsql security definer set search_path = public as $$
declare k public.kids; t public.toys; msg text; sid bigint;
begin
  if not public.is_kid() then raise exception 'Only kids can share stories'; end if;
  select * into k from public.kids where id = auth.uid();
  select * into t from public.toys where id = p_toy and owner_id = k.id;
  if t.id is null then raise exception 'Pick one of your own toys'; end if;
  msg := case p_template
    when 0 then 'I''ve played with this for ' || t.used || '. Now I''d like something new!'
    when 1 then 'Looking for a swap! What do you have?'
    when 2 then 'Selling it to save up for my ' || lower(k.goal_name) || '.'
    when 3 then 'I kept it clean and safe. Ready for a new friend!'
    else null end;
  if msg is null then raise exception 'Pick a message'; end if;
  insert into public.stories (kid_id, toy_id, text) values (k.id, t.id, msg) returning id into sid;
  insert into public.requests (type, kid_id, toy_id, story_id) values ('story', k.id, t.id, sid);
  return sid;
end $$;

create or replace function public.toggle_reaction(p_story bigint, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_kid() then raise exception 'Only kids can react'; end if;
  if not exists (select 1 from public.stories where id = p_story and status = 'live') then raise exception 'Story not found'; end if;
  delete from public.reactions where story_id = p_story and kid_id = auth.uid() and kind = p_kind;
  if not found then insert into public.reactions (story_id, kid_id, kind) values (p_story, auth.uid(), p_kind); end if;
end $$;

create or replace function public.toggle_saved(p_toy bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_kid() then raise exception 'Only kids have a wishlist'; end if;
  delete from public.saved where kid_id = auth.uid() and toy_id = p_toy;
  if found then return false; end if;
  insert into public.saved (kid_id, toy_id) values (auth.uid(), p_toy);
  return true;
end $$;

create or replace function public.ask_question(p_toy bigint, p_question int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_kid() then raise exception 'Only kids can ask'; end if;
  if not exists (select 1 from public.toys where id = p_toy and status = 'live' and owner_id <> auth.uid()) then raise exception 'Toy not found'; end if;
  insert into public.questions (toy_id, from_kid, question) values (p_toy, auth.uid(), p_question);
end $$;

create or replace function public.answer_question(p_id bigint, p_answer int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.questions q set answer = p_answer
  where q.id = p_id and exists (select 1 from public.toys t where t.id = q.toy_id and t.owner_id = auth.uid());
  if not found then raise exception 'Question not found'; end if;
end $$;

create or replace function public.set_goal(p_name text, p_cents int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.kids set goal_name = left(trim(p_name), 40), goal_cents = p_cents where id = auth.uid();
end $$;

-- kid: the Care Promise on first log-in
create or replace function public.accept_promise() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.kids set promise_at = now() where id = auth.uid() and promise_at is null;
end $$;

-- parent: rules for one kid
create or replace function public.set_rules(p_kid uuid, p_can_sell boolean, p_can_swap boolean, p_limit int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_parent_of(p_kid) then raise exception 'Not your kid'; end if;
  update public.kids set can_sell = p_can_sell, can_swap = p_can_swap, spend_limit_cents = p_limit where id = p_kid;
  perform public.log_activity(p_kid, 'Parent changed the rules');
end $$;

-- parent: say yes or no to a request
create or replace function public.decide_request(p_req bigint, p_approve boolean) returns text
language plpgsql security definer set search_path = public as $$
declare r public.requests; t public.toys; o public.toys; asker public.kids; owner public.kids; buyer_side boolean; seller_side boolean;
begin
  select * into r from public.requests where id = p_req for update;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.status <> 'waiting' then raise exception 'This request is already decided'; end if;
  select * into asker from public.kids where id = r.kid_id;
  select * into t from public.toys where id = r.toy_id for update;

  if r.type in ('listing', 'story') then
    if not public.is_parent_of(r.kid_id) then raise exception 'Not your kid'; end if;
    update public.requests set status = case when p_approve then 'approved' else 'declined' end::public.req_status, decided_at = now() where id = r.id;
    if r.type = 'listing' then
      update public.toys set status = case when p_approve then 'live' else 'declined' end::public.toy_status where id = r.toy_id;
      if p_approve then update public.kids set care_score = least(100, care_score + 5) where id = r.kid_id; end if;
      perform public.log_activity(r.kid_id, 'Parent ' || case when p_approve then 'approved ' else 'said no to ' end || t.name);
    else
      update public.stories set status = case when p_approve then 'live' else 'declined' end where id = r.story_id;
      perform public.log_activity(r.kid_id, 'Parent ' || case when p_approve then 'approved' else 'said no to' end || ' a story');
    end if;
    return case when p_approve then 'approved' else 'declined' end;
  end if;

  -- buy / swap: both families decide
  select * into owner from public.kids where id = t.owner_id;
  buyer_side := public.is_parent_of(r.kid_id);
  seller_side := public.is_parent_of(t.owner_id);
  if not buyer_side and not seller_side then raise exception 'Not your kid'; end if;
  if buyer_side then update public.requests set buyer_parent_ok = p_approve where id = r.id; end if;
  if seller_side then update public.requests set seller_parent_ok = p_approve where id = r.id; end if;
  select * into r from public.requests where id = p_req;

  if r.buyer_parent_ok is false or r.seller_parent_ok is false then
    update public.requests set status = 'declined', decided_at = now() where id = r.id;
    perform public.log_activity(r.kid_id, 'A parent said no to the ' || r.type || ' for ' || t.name);
    return 'declined';
  end if;
  if r.buyer_parent_ok is null or r.seller_parent_ok is null then return 'waiting_other_parent'; end if;

  if t.status <> 'live' then
    update public.requests set status = 'cancelled', decided_at = now() where id = r.id;
    return 'toy_gone';
  end if;

  if r.type = 'swap' then
    select * into o from public.toys where id = r.offer_toy_id for update;
    if o.status <> 'live' then update public.requests set status = 'cancelled', decided_at = now() where id = r.id; return 'toy_gone'; end if;
    update public.toys set status = 'sold', sold_to = r.kid_id where id = t.id;
    update public.toys set status = 'sold', sold_to = t.owner_id where id = o.id;
    update public.kids set trades = trades + 1 where id in (r.kid_id, t.owner_id);
    update public.requests set status = 'paid', decided_at = now() where id = r.id;
    update public.requests set status = 'cancelled' where id <> r.id and status in ('waiting','approved') and (toy_id in (t.id, o.id) or offer_toy_id in (t.id, o.id));
    perform public.log_activity(r.kid_id, 'Swap done: ' || o.name || ' for ' || t.name);
    perform public.log_activity(t.owner_id, 'Swap done: ' || t.name || ' for ' || o.name);
    return 'swapped';
  end if;

  -- buy: both said yes. Hold the toy until the buyer's parent pays.
  update public.toys set status = 'reserved' where id = t.id;
  update public.requests set status = 'approved', decided_at = now() where id = r.id;
  perform public.log_activity(r.kid_id, 'Both parents said yes to buying ' || t.name || '. Waiting for payment');
  return 'ready_to_pay';
end $$;

-- called by the Stripe webhook (service role only) once the card payment succeeds
create or replace function public.mark_paid(p_req bigint, p_session text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.requests; t public.toys;
begin
  select * into r from public.requests where id = p_req for update;
  if r.id is null or r.type <> 'buy' or r.status <> 'approved' then return; end if;
  select * into t from public.toys where id = r.toy_id for update;
  update public.requests set status = 'paid', stripe_session_id = p_session where id = r.id;
  update public.toys set status = 'sold', sold_to = r.kid_id where id = t.id;
  update public.kids set trades = trades + 1 where id in (r.kid_id, t.owner_id);
  update public.kids set earned_cents = earned_cents + r.amount_cents where id = t.owner_id;
  update public.requests set status = 'cancelled' where id <> r.id and status in ('waiting','approved') and (toy_id = t.id or offer_toy_id = t.id);
  perform public.log_activity(r.kid_id, 'Paid for ' || t.name || '. It''s yours!');
  perform public.log_activity(t.owner_id, t.name || ' was sold. You earned $' || to_char(r.amount_cents / 100.0, 'FM990.00'));
end $$;
revoke execute on function public.mark_paid(bigint, text) from public, anon, authenticated;

-- parent can cancel an approved buy that hasn't been paid (frees the toy again)
create or replace function public.cancel_request(p_req bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_req for update;
  if r.id is null or not (public.is_parent_of(r.kid_id) or r.kid_id = auth.uid()) then raise exception 'Not yours'; end if;
  if r.status not in ('waiting', 'approved') then return; end if;
  update public.requests set status = 'cancelled', decided_at = now() where id = r.id;
  if r.status = 'approved' and r.type = 'buy' then update public.toys set status = 'live' where id = r.toy_id and status = 'reserved'; end if;
end $$;

-- function permissions: signed-in users only
do $$ declare f text; begin
  foreach f in array array[
    'parent_setup(text,text)','list_toy(text,text,int,boolean,text,text,text,text,int)','remove_toy(bigint)',
    'request_buy(bigint,text)','request_swap(bigint,bigint)','share_story(bigint,int)','toggle_reaction(bigint,text)',
    'toggle_saved(bigint)','accept_promise()','ask_question(bigint,int)','answer_question(bigint,int)','set_goal(text,int)',
    'set_rules(uuid,boolean,boolean,int)','decide_request(bigint,boolean)','cancel_request(bigint)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- photos ----------
-- Toy photos live in a public bucket under <kid id>/<file>. Only the kid can upload into their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('toy-photos', 'toy-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy toy_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'toy-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_kid());
create policy toy_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'toy-photos' and (storage.foldername(name))[1] = auth.uid()::text);
