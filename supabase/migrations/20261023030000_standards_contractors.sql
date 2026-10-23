-- "Padrão do apartamento" (how each apartment should be left: notes, linens
-- and amenities with quantities, reference photos) and maintenance
-- contractors ("Responsáveis → Manutenção").

-- Apartment standard ------------------------------------------------------

create table public.property_standards (
  property_id uuid primary key references public.properties (id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

create trigger property_standards_updated_at
  before update on public.property_standards
  for each row execute function public.set_updated_at();

-- Linens and amenities ("Toalha de banho — 4").
create table public.property_linens (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  item text not null,
  quantity integer not null default 1 check (quantity >= 0),
  position integer not null default 0
);

create index property_linens_property_idx on public.property_linens (property_id, position);

-- Reference photos live in the photos bucket under "padrao/<property id>/".
create table public.property_reference_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  path text not null,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index property_reference_photos_property_idx on public.property_reference_photos (property_id, position);

alter table public.property_standards enable row level security;
alter table public.property_linens enable row level security;
alter table public.property_reference_photos enable row level security;

create policy "property_standards: team reads, admin writes"
  on public.property_standards for select to authenticated using (public.is_team_member());
create policy "property_standards: admin writes"
  on public.property_standards for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "property_linens: team reads"
  on public.property_linens for select to authenticated using (public.is_team_member());
create policy "property_linens: admin writes"
  on public.property_linens for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "property_reference_photos: team reads"
  on public.property_reference_photos for select to authenticated using (public.is_team_member());
create policy "property_reference_photos: admin writes"
  on public.property_reference_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Photo storage: cleaning photos ("<cleaning id>/…") for the team, reference
-- photos ("padrao/…") readable by the team but uploaded only by admins.
create or replace function public.can_write_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if split_part(object_name, '/', 1) = 'padrao' then
    return public.is_admin();
  end if;
  return public.can_access_photo(object_name);
end;
$$;

create or replace function public.can_read_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if split_part(object_name, '/', 1) = 'padrao' then
    return public.is_team_member();
  end if;
  return public.can_access_photo(object_name);
end;
$$;

revoke execute on function public.can_write_photo(text) from public, anon;
revoke execute on function public.can_read_photo(text) from public, anon;
grant execute on function public.can_write_photo(text) to authenticated;
grant execute on function public.can_read_photo(text) to authenticated;

drop policy "photos: admin or assigned cleaner can upload" on storage.objects;
drop policy "photos: admin or assigned cleaner can view" on storage.objects;

create policy "photos: team can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.can_write_photo(name));

create policy "photos: team can view"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_read_photo(name));

-- Maintenance contractors -------------------------------------------------

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  -- "Eletricista", "Encanador", "Ar-condicionado"…
  specialty text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.contractors enable row level security;

create policy "contractors: admin only"
  on public.contractors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.maintenances
  add column contractor_id uuid references public.contractors (id) on delete set null;
