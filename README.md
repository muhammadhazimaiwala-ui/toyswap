# ToySwap

A marketplace where kids sell and swap toys they’ve outgrown, and a parent approves every deal.
One codebase runs as an **Android app (APK)**, an **iPhone app** and a **website**.

- **App:** Expo SDK 58 · React Native 0.88 · Expo Router
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Payments:** Stripe Checkout + Stripe Connect Express (buyer’s parent pays by card; seller’s parent gets paid to their bank)

## How it works

| Who | What they do |
|---|---|
| Parent | Signs up with email, gives consent, adds each kid (nickname + password), approves or declines every listing, buy, swap and story, sets rules (can sell, can swap, spending limit), pays by card, receives payouts |
| Kid | Logs in with nickname + password, makes the Care Promise, lists toys (care check required), asks to buy, offers swaps, asks ready-made questions, shares stories with ready-made messages, reacts, keeps a wishlist and a savings goal |
| Both parents | A buy or swap only happens when **the buyer’s parent and the seller’s parent** both say yes. A buy then waits for the buyer’s parent to pay |

Safety built into the database (not just the app):
- Kids can’t write to tables directly; every action goes through checked database functions.
- Other kids only ever see a nickname, avatar and trade count.
- No free-text messages: questions, answers and stories come from fixed lists.
- Pending or declined toys and unchecked stories are invisible to other kids.
- Kids never handle money or cards.

## Project layout

```
src/app/                 screens (Expo Router)
  login.tsx register.tsx promise.tsx parent.tsx safety.tsx toy/[id].tsx
  (tabs)/                kid tabs: Home, Stories, Sell, Requests, Me
src/api.ts               data hooks and actions (React Query + Supabase)
src/lib/supabase.ts      Supabase client
supabase/migrations/     database tables, security rules and functions
supabase/functions/      create-kid, stripe-connect, create-checkout, stripe-webhook
.github/workflows/       android-apk.yml (APK on every push), website.yml (GitHub Pages)
```

## Setup checklist

1. **Supabase:** create a project. Run `supabase/migrations/*.sql` (SQL editor or `supabase db push`). Deploy the four functions in `supabase/functions` (`stripe-webhook` with JWT verification **off**).
2. **Supabase Auth → URL configuration:** set the Site URL to your website address and add it to Redirect URLs.
3. **Function secrets** (Supabase → Edge Functions → Secrets):
   - `STRIPE_SECRET_KEY`: from Stripe → Developers → API keys (start with the **test** key `sk_test_…`)
   - `STRIPE_WEBHOOK_SECRET`: from the Stripe webhook below (`whsec_…`)
   - `SITE_URL`: your website address, e.g. `https://yourname.github.io/toyswap`
   - `PLATFORM_FEE_CENTS` (optional): ToySwap’s fee per sale, e.g. `0`
4. **Stripe:** turn on Connect (Express). Add a webhook endpoint `https://<project>.supabase.co/functions/v1/stripe-webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `account.updated`.
5. **GitHub repository variables** (Settings → Secrets and variables → Actions → **Variables**): `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
6. **GitHub Pages:** Settings → Pages → Source: **GitHub Actions**.

After that, every push to `main` builds a fresh **APK** (see **Releases**) and updates the **website**.

## Local development

```bash
cp .env.example .env    # fill in your Supabase URL and anon key
npm install
npx expo start          # scan the QR code with Expo Go, or press w for the web
npx tsc --noEmit && npx expo lint
```

## Before going live with real money

- Test everything with Stripe **test mode** first (card `4242 4242 4242 4242`).
- Write a privacy policy and terms; collect verifiable parental consent (COPPA in the US, GDPR-K in the UK/EU).
- Check Stripe’s rules for marketplaces and for products used by children, and which countries Connect supports. Pakistan, for example, isn’t supported by Stripe.
- The APK from GitHub is signed with a test key, which is fine for installing yourself. For Google Play, create a real upload key and build an `.aab`.
