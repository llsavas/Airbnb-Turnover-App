# AirComplex Cleaning 🧼 — Cleaning management for short-term rentals

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
- **Imóveis**: properties grouped by building (prédio), with a "responsável do prédio" shortcut that assigns a cleaner to the whole building; each property has address, access instructions, checkout/check-in
  times, default cleaner, Hospitable ID and iCal link. Bulk import by pasting a
  list (one property per line).
- **Equipe**: create logins for cleaners (simple username + password), reset
  passwords, deactivate people.

- **Problemas**: issues reported by the team, urgent ones first, with photos;
  mark as resolved with a note.
- **Estoque**: what's below the minimum in each property (from the cleaners'
  counts), a "Reposto" button, and the list of supplies with their minimums.
- **Checklist**: the default checklist for every property plus extra items per
  property, each with an optional "nota 5" tip and "exige foto".
- **Hospitable sync**: cleanings are created on every checkout, with the next
  check-in as deadline, cancelled when the reservation is cancelled. Runs daily
  (Vercel Cron) and on demand with "Sincronizar agora" on the dashboard.
  "Importar do Hospitable" on Imóveis adds new listings.
- **Cleaning report**: checklist photos, unticked items, issues and stock
  counted, on each cleaning's page.

**Cleaner** (`/limpezas`)
- Today's and upcoming cleanings, plus unfinished ones from yesterday.
- Cleaning page with address (opens Google Maps), time window, access
  instructions and notes, and **Iniciar** / **Concluir** buttons.
- Photo checklist by room (photos are resized on the phone before upload); the
  cleaning can only be finished when every item is ticked and every required
  photo taken.
- Stock count, problem reports with photos, and a "Dicas nota 5" page.

Security is enforced in the database (row level security): cleaners can only
see their own cleanings and the properties of those cleanings, and can only
change status through the start/complete functions. Photos live in a private
storage bucket under `<cleaning id>/` and are only visible to the admin and the
cleaner of that cleaning. The first account created becomes the admin; everyone
else is a cleaner.

## Roadmap

1. ~~Login, properties, team, cleaning calendar~~
2. ~~Hospitable sync~~ (iCal still to do)
3. ~~Photo checklists per room~~
4. ~~Problem reporting with photos~~ (WhatsApp/e-mail alerts still to do)
5. ~~Inventory with low-stock warnings~~
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

### 2. Hospitable
1. Hospitable → **Settings → Apps → API access** → create a **Personal access
   token** (read access to properties and reservations is enough).
2. Use it as `HOSPITABLE_API_TOKEN` below.

### 3. Vercel
1. Import this GitHub repository at https://vercel.com/new.
2. Add the environment variables from `.env.example` with the values from
   Supabase and Hospitable, plus a long random `CRON_SECRET`.
3. Deploy. Every push to `main` redeploys automatically.

`vercel.json` runs the Hospitable sync once a day (06:00 in Brasília), which is
what the free Vercel plan allows. For hourly syncs, call the endpoint from
Supabase instead (SQL Editor, after enabling the `pg_cron` and `pg_net`
extensions; replace the URL and secret):

```sql
select cron.schedule('hospitable-sync', '5 * * * *', $$
  select net.http_get(
    url := 'https://YOUR-APP.vercel.app/api/cron/sync',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
    timeout_milliseconds := 60000
  )
$$);
```

### 4. On the phones
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
