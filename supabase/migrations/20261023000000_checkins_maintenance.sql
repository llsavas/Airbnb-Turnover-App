-- Check-ins (arrivals from Hospitable, with guest details read from the chat
-- by AI) and scheduled maintenance. Both hold data only the admin needs (CPF,
-- phone numbers, contractors), so only admins can see them.

-- Check-ins ------------------------------------------------------------------

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  -- Hospitable reservation id.
  external_id text not null unique,
  reservation_code text,
  platform text,
  guest_name text,
  guest_count integer,
  checkin_date date not null,
  checkin_time time,
  checkout_date date,
  cancelled boolean not null default false,
  last_message_at timestamptz,
  -- Read from the conversation by AI: [{name, cpf}], arrival time, car plate.
  guests jsonb not null default '[]',
  arrival_time text,
  vehicle_plate text,
  ai_notes text,
  extracted_at timestamptz,
  -- Guest details were passed on to the building's front desk.
  registered boolean not null default false,
  registered_at timestamptz,
  registered_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checkins_date_idx on public.checkins (checkin_date);

create trigger checkins_updated_at
  before update on public.checkins
  for each row execute function public.set_updated_at();

alter table public.checkins enable row level security;

create policy "checkins: admin only"
  on public.checkins for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Maintenance ----------------------------------------------------------------

create type public.maintenance_status as enum ('scheduled', 'done', 'cancelled');

create table public.maintenances (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  date date not null,
  time time,
  title text not null,
  description text,
  -- Who does it: a contractor's name, phone…
  assignee text,
  status public.maintenance_status not null default 'scheduled',
  -- Problem report this maintenance fixes, if any.
  issue_id uuid references public.issues (id) on delete set null,
  done_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index maintenances_date_idx on public.maintenances (date);

create trigger maintenances_updated_at
  before update on public.maintenances
  for each row execute function public.set_updated_at();

alter table public.maintenances enable row level security;

create policy "maintenances: admin only"
  on public.maintenances for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
