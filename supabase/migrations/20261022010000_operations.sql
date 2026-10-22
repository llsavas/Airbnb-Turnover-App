-- Operations: photo checklists, problem reports, inventory and the
-- Hospitable sync. Cleaners keep going through security definer functions for
-- anything that changes a cleaning; admins manage everything directly.

-- Checklist -----------------------------------------------------------------

-- Template items. property_id null means the item applies to every property;
-- otherwise it is an extra item for that property only.
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  room text not null,
  label text not null,
  -- Shown to the cleaner next to the item: why it matters for the guest rating.
  tip text,
  requires_photo boolean not null default false,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checklist_items_property_idx on public.checklist_items (property_id);

create trigger checklist_items_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- Each cleaning gets its own copy of the checklist when it starts, so editing
-- the template later doesn't change cleanings that are already done.
create table public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  cleaning_id uuid not null references public.cleanings (id) on delete cascade,
  room text not null,
  label text not null,
  tip text,
  requires_photo boolean not null default false,
  position integer not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  photo_path text
);

create index cleaning_tasks_cleaning_idx on public.cleaning_tasks (cleaning_id, position);

-- Problems ------------------------------------------------------------------

create type public.issue_category as enum (
  'damage', 'maintenance', 'missing_item', 'dirty', 'forgotten_item', 'other'
);
create type public.issue_urgency as enum ('low', 'normal', 'urgent');
create type public.issue_status as enum ('open', 'resolved');

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  cleaning_id uuid references public.cleanings (id) on delete set null,
  reported_by uuid default auth.uid() references public.profiles (id) on delete set null,
  category public.issue_category not null default 'other',
  urgency public.issue_urgency not null default 'normal',
  description text not null,
  photo_paths text[] not null default '{}',
  status public.issue_status not null default 'open',
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index issues_status_idx on public.issues (status, created_at desc);
create index issues_cleaning_idx on public.issues (cleaning_id);

create trigger issues_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

-- Inventory -----------------------------------------------------------------

-- Supplies every property should have, with the default minimum (par level).
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'un',
  default_par integer not null default 1 check (default_par >= 0),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Last count per property and item, filled in by the cleaner on each cleaning.
create table public.property_inventory (
  property_id uuid not null references public.properties (id) on delete cascade,
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  par_level integer check (par_level >= 0),
  quantity integer check (quantity >= 0),
  counted_at timestamptz,
  counted_by uuid references public.profiles (id) on delete set null,
  cleaning_id uuid references public.cleanings (id) on delete set null,
  primary key (property_id, item_id)
);

-- Sync log ------------------------------------------------------------------

create table public.sync_runs (
  id bigint generated always as identity primary key,
  source public.cleaning_source not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  message text,
  created integer not null default 0,
  updated integer not null default 0,
  cancelled integer not null default 0
);

-- Functions -----------------------------------------------------------------

create or replace function public.can_work_on(p_cleaning_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.cleanings
    where id = p_cleaning_id and cleaner_id = auth.uid()
  );
$$;

-- Starting a cleaning now also copies the checklist into it.
create or replace function public.start_cleaning(cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property uuid;
begin
  update public.cleanings
  set status = 'in_progress', started_at = now()
  where id = cleaning_id
    and status = 'scheduled'
    and (cleaner_id = auth.uid() or public.is_admin())
  returning property_id into v_property;

  if not found then
    raise exception 'Limpeza não encontrada ou já iniciada';
  end if;

  if not exists (select 1 from public.cleaning_tasks t where t.cleaning_id = start_cleaning.cleaning_id) then
    insert into public.cleaning_tasks (cleaning_id, room, label, tip, requires_photo, position)
    select start_cleaning.cleaning_id, i.room, i.label, i.tip, i.requires_photo,
           -- Property-specific items go after the shared ones.
           i.position + case when i.property_id is null then 0 else 100000 end
    from public.checklist_items i
    where i.active and (i.property_id is null or i.property_id = v_property);
  end if;
end;
$$;

-- A cleaning can only be finished once every checklist item is ticked.
create or replace function public.complete_cleaning(cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.cleaning_tasks t
  where t.cleaning_id = complete_cleaning.cleaning_id and not t.done;

  if v_missing > 0 then
    raise exception 'Faltam % itens do checklist', v_missing;
  end if;

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

-- Ticks or unticks a checklist item, optionally attaching its photo.
create or replace function public.update_cleaning_task(
  task_id uuid,
  is_done boolean,
  new_photo_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.cleaning_tasks;
  v_status public.cleaning_status;
begin
  select * into v_task from public.cleaning_tasks where id = task_id;
  if not found or not public.can_work_on(v_task.cleaning_id) then
    raise exception 'Item não encontrado';
  end if;

  select status into v_status from public.cleanings where id = v_task.cleaning_id;
  if v_status <> 'in_progress' then
    raise exception 'A limpeza não está em andamento';
  end if;

  if new_photo_path is not null then
    if new_photo_path not like v_task.cleaning_id::text || '/%' then
      raise exception 'Foto inválida';
    end if;
    v_task.photo_path := new_photo_path;
  end if;

  if is_done and v_task.requires_photo and v_task.photo_path is null then
    raise exception 'Tire a foto antes de marcar este item';
  end if;

  update public.cleaning_tasks
  set done = is_done,
      done_at = case when is_done then now() end,
      photo_path = v_task.photo_path
  where id = task_id;
end;
$$;

-- Saves the cleaner's stock count. counts: {"<item id>": quantity, ...}
create or replace function public.record_inventory(cleaning_id uuid, counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property uuid;
begin
  if not public.can_work_on(cleaning_id) then
    raise exception 'Limpeza não encontrada';
  end if;
  select property_id into v_property from public.cleanings c where c.id = record_inventory.cleaning_id;

  insert into public.property_inventory (property_id, item_id, quantity, counted_at, counted_by, cleaning_id)
  select v_property, key::uuid, greatest(value::integer, 0), now(), auth.uid(), record_inventory.cleaning_id
  from jsonb_each_text(counts)
  where value ~ '^\d+$'
  on conflict (property_id, item_id) do update
  set quantity = excluded.quantity,
      counted_at = excluded.counted_at,
      counted_by = excluded.counted_by,
      cleaning_id = excluded.cleaning_id;
end;
$$;

-- Creates/updates cleanings from a reservation feed and cancels the ones whose
-- reservation disappeared. Only touches cleanings of p_source, on the given
-- properties, dated between p_from and p_to (the window that was fetched).
-- items: [{external_id, property_id, date, starts_at, ends_at, next_checkin, guest_count}]
create or replace function public.sync_cleanings(
  p_source public.cleaning_source,
  p_from date,
  p_to date,
  p_property_ids uuid[],
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created integer;
  v_updated integer;
  v_cancelled integer;
begin
  with incoming as (
    select *
    from jsonb_to_recordset(p_items) as x(
      external_id text, property_id uuid, date date, starts_at time, ends_at time,
      next_checkin date, guest_count integer
    )
  ),
  upserted as (
    insert into public.cleanings (
      property_id, cleaner_id, date, starts_at, ends_at, next_checkin, guest_count, source, external_id
    )
    select i.property_id, p.default_cleaner_id, i.date, i.starts_at, i.ends_at, i.next_checkin,
           i.guest_count, p_source, i.external_id
    from incoming i
    join public.properties p on p.id = i.property_id
    on conflict (source, external_id) do update
    set property_id = excluded.property_id,
        date = excluded.date,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        next_checkin = excluded.next_checkin,
        guest_count = excluded.guest_count,
        -- A reservation that comes back after being cancelled needs cleaning again.
        status = case when public.cleanings.status = 'cancelled' then 'scheduled'::public.cleaning_status
                      else public.cleanings.status end
    where (public.cleanings.property_id, public.cleanings.date, public.cleanings.starts_at,
           public.cleanings.ends_at, public.cleanings.next_checkin, public.cleanings.guest_count,
           public.cleanings.status = 'cancelled')
      is distinct from
          (excluded.property_id, excluded.date, excluded.starts_at, excluded.ends_at,
           excluded.next_checkin, excluded.guest_count, false)
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted)
  into v_created, v_updated
  from upserted;

  update public.cleanings c
  set status = 'cancelled'
  where c.source = p_source
    and c.status = 'scheduled'
    and c.property_id = any (p_property_ids)
    and c.date between p_from and p_to
    and c.external_id not in (select x ->> 'external_id' from jsonb_array_elements(p_items) x);
  get diagnostics v_cancelled = row_count;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'cancelled', v_cancelled);
end;
$$;

revoke execute on function public.can_work_on(uuid) from public, anon;
revoke execute on function public.update_cleaning_task(uuid, boolean, text) from public, anon;
revoke execute on function public.record_inventory(uuid, jsonb) from public, anon;
revoke execute on function public.sync_cleanings(public.cleaning_source, date, date, uuid[], jsonb)
  from public, anon, authenticated;
grant execute on function public.can_work_on(uuid) to authenticated;
grant execute on function public.update_cleaning_task(uuid, boolean, text) to authenticated;
grant execute on function public.record_inventory(uuid, jsonb) to authenticated;
grant execute on function public.sync_cleanings(public.cleaning_source, date, date, uuid[], jsonb)
  to service_role;

-- Row level security --------------------------------------------------------

alter table public.checklist_items enable row level security;
alter table public.cleaning_tasks enable row level security;
alter table public.issues enable row level security;
alter table public.inventory_items enable row level security;
alter table public.property_inventory enable row level security;
alter table public.sync_runs enable row level security;

create policy "checklist_items: admin manages"
  on public.checklist_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cleaning_tasks: admin or assigned cleaner can read"
  on public.cleaning_tasks for select to authenticated
  using (public.can_work_on(cleaning_id));

create policy "cleaning_tasks: admin writes"
  on public.cleaning_tasks for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "issues: admin or reporter can read"
  on public.issues for select to authenticated
  using (public.is_admin() or reported_by = auth.uid());

create policy "issues: cleaner reports on own cleaning"
  on public.issues for insert to authenticated
  with check (
    reported_by = auth.uid()
    and status = 'open'
    and exists (
      select 1 from public.cleanings c
      where c.id = cleaning_id and c.property_id = issues.property_id and c.cleaner_id = auth.uid()
    )
  );

create policy "issues: admin writes"
  on public.issues for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "inventory_items: team can read"
  on public.inventory_items for select to authenticated
  using (true);

create policy "inventory_items: admin writes"
  on public.inventory_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "property_inventory: admin or assigned cleaner can read"
  on public.property_inventory for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.cleanings c
      where c.property_id = property_inventory.property_id and c.cleaner_id = auth.uid()
    )
  );

create policy "property_inventory: admin writes"
  on public.property_inventory for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "sync_runs: admin can read"
  on public.sync_runs for select to authenticated
  using (public.is_admin());

-- Photos --------------------------------------------------------------------

-- Private bucket; every photo lives under "<cleaning id>/".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Checks the "<cleaning id>/" prefix without failing on paths that aren't UUIDs.
create or replace function public.can_access_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folder text := split_part(object_name, '/', 1);
begin
  if v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_work_on(v_folder::uuid);
end;
$$;

revoke execute on function public.can_access_photo(text) from public, anon;
grant execute on function public.can_access_photo(text) to authenticated;

create policy "photos: admin or assigned cleaner can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.can_access_photo(name));

create policy "photos: admin or assigned cleaner can view"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_access_photo(name));

create policy "photos: admin can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());
