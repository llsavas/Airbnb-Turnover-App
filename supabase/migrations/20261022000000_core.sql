-- Core schema: team members, properties and cleanings.
-- Admins manage everything; cleaners only see the cleanings assigned to them
-- (and the properties of those cleanings) and change status through RPCs.

create type public.user_role as enum ('admin', 'cleaner');
create type public.cleaning_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type public.cleaning_source as enum ('manual', 'hospitable', 'ical');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'cleaner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

-- The first account ever created becomes the admin; everyone after that is a
-- cleaner. Roles are never taken from user metadata, so a user can't promote
-- themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_user boolean;
begin
  perform pg_advisory_xact_lock(hashtext('public.handle_new_user'));
  select not exists (select 1 from public.profiles) into first_user;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    case when first_user then 'admin'::public.user_role else 'cleaner'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Properties ----------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  access_instructions text,
  notes text,
  checkout_time time not null default '11:00',
  checkin_time time not null default '15:00',
  default_cleaner_id uuid references public.profiles (id) on delete set null,
  hospitable_property_id text unique,
  ical_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- Cleanings -----------------------------------------------------------------

create table public.cleanings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  cleaner_id uuid references public.profiles (id) on delete set null,
  date date not null,
  -- Window the cleaning has to fit in: guest checkout until the next check-in.
  starts_at time,
  ends_at time,
  next_checkin date,
  status public.cleaning_status not null default 'scheduled',
  source public.cleaning_source not null default 'manual',
  -- Reservation id (Hospitable) or event UID (iCal) that generated the cleaning.
  external_id text,
  guest_count integer,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create index cleanings_date_idx on public.cleanings (date);
create index cleanings_cleaner_date_idx on public.cleanings (cleaner_id, date);
create index cleanings_property_date_idx on public.cleanings (property_id, date);

create trigger cleanings_updated_at
  before update on public.cleanings
  for each row execute function public.set_updated_at();

-- Cleaners move their own cleanings forward through these two functions, so
-- they never need direct write access to the table.
create or replace function public.start_cleaning(cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cleanings
  set status = 'in_progress', started_at = now()
  where id = cleaning_id
    and status = 'scheduled'
    and (cleaner_id = auth.uid() or public.is_admin());

  if not found then
    raise exception 'Limpeza não encontrada ou já iniciada';
  end if;
end;
$$;

create or replace function public.complete_cleaning(cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.cleanings
  set status = 'completed', completed_at = now()
  where id = cleaning_id
    and status = 'in_progress'
    and (cleaner_id = auth.uid() or public.is_admin());

  if not found then
    raise exception 'Limpeza não encontrada ou não está em andamento';
  end if;
end;
$$;

revoke execute on function public.start_cleaning(uuid) from public, anon;
revoke execute on function public.complete_cleaning(uuid) from public, anon;
grant execute on function public.start_cleaning(uuid) to authenticated;
grant execute on function public.complete_cleaning(uuid) to authenticated;

-- Row level security --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.cleanings enable row level security;

-- The team is small and everyone needs names for assignments and chat.
create policy "profiles: team can read"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: admin writes"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "properties: admin or assigned cleaner can read"
  on public.properties for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.cleanings c
      where c.property_id = properties.id and c.cleaner_id = auth.uid()
    )
  );

create policy "properties: admin writes"
  on public.properties for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cleanings: admin or assigned cleaner can read"
  on public.cleanings for select to authenticated
  using (public.is_admin() or cleaner_id = auth.uid());

create policy "cleanings: admin writes"
  on public.cleanings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
