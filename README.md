# Turnover — Cleaning management for short-term rentals

A mobile-friendly web app (in Portuguese) for managing turnover cleanings across
the properties: the admin plans and assigns cleanings, and each cleaner sees
their own jobs on the phone, starts them and marks them done.

Stack: Next.js 16 (App Router) · Supabase (auth, Postgres, storage) · Vercel.

## What's built

**Admin** (`/admin`)
- **Painel**: today's and tomorrow's cleanings, what's in progress or done, and
  what still has no cleaner assigned.
- **Limpezas**: week calendar, filter by cleaner, assign a cleaner straight from
  the list, create/edit/cancel cleanings.
- **Imóveis**: properties with address, access instructions, checkout/check-in
  times, default cleaner, Hospitable ID and iCal link. Bulk import by pasting a
  list (one property per line).
- **Equipe**: create logins for cleaners (simple username + password), reset
  passwords, deactivate people.

**Cleaner** (`/limpezas`)
- Today's and upcoming cleanings, plus unfinished ones from yesterday.
- Cleaning page with address (opens Google Maps), time window, access
  instructions and notes, and **Iniciar** / **Concluir** buttons.

Security is enforced in the database (row level security): cleaners can only
see their own cleanings and the properties of those cleanings, and can only
change status through the start/complete functions. The first account created
becomes the admin; everyone else is a cleaner.

## Roadmap

1. ~~Login, properties, team, cleaning calendar~~
2. Hospitable + iCal sync: create cleanings automatically on each checkout
3. Photo checklists per room
4. Problem reporting with photos and alerts
5. Inventory with low-stock warnings
6. Chat per cleaning

## Setup

### 1. Supabase
1. Create a project at https://supabase.com (region: São Paulo).
2. **SQL Editor** → paste and run every file in `supabase/migrations/`, in order.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to
   sign up" (accounts are created by the admin inside the app).
4. **Authentication → Users → Add user**: create *your* account with email and
   password (tick "Auto confirm"). Being the first user, it becomes the admin.
5. **Project Settings → API**: copy the project URL, the `anon` key and the
   `service_role` key.

### 2. Vercel
1. Import this GitHub repository at https://vercel.com/new.
2. Add the environment variables from `.env.example` with the values from
   Supabase.
3. Deploy. Every push to `main` redeploys automatically.

### 3. On the phones
Open the app's address in the browser and use **Add to Home Screen** (Safari:
Share → Add to Home Screen; Chrome: ⋮ → Install app).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

With Docker you can run Supabase locally instead: `npx supabase start` applies
the migrations and prints local keys.
