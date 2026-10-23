-- The team works by building, not by assignment: every active team member
-- chooses the buildings they work in and sees (and can start/finish) all the
-- cleanings there. Who actually started/finished each cleaning is recorded.

alter table public.profiles add column buildings text[] not null default '{}';

alter table public.cleanings
  add column started_by uuid references public.profiles (id) on delete set null,
  add column completed_by uuid references public.profiles (id) on delete set null,
  -- Set when someone moves the cleaning to another day; the Hospitable sync
  -- then keeps that date.
  add column date_moved boolean not null default false;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.can_work_on(p_cleaning_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_team_member()
    and exists (select 1 from public.cleanings where id = p_cleaning_id);
$$;

-- Team members pick their own buildings (profiles are otherwise admin-only).
create or replace function public.set_my_buildings(new_buildings text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set buildings = coalesce(new_buildings, '{}') where id = auth.uid();
$$;

create or replace function public.start_cleaning(cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property uuid;
begin
  if not public.is_team_member() then
    raise exception 'Sem permissão';
  end if;

  update public.cleanings
  set status = 'in_progress',
      started_at = now(),
      started_by = auth.uid(),
      -- Whoever starts an unassigned cleaning takes it.
      cleaner_id = coalesce(cleaner_id, auth.uid())
  where id = cleaning_id and status = 'scheduled'
  returning property_id into v_property;

  if not found then
    raise exception 'Limpeza não encontrada ou já iniciada';
  end if;

  if not exists (select 1 from public.cleaning_tasks t where t.cleaning_id = start_cleaning.cleaning_id) then
    insert into public.cleaning_tasks (cleaning_id, room, label, tip, requires_photo, position)
    select start_cleaning.cleaning_id, i.room, i.label, i.tip, i.requires_photo,
           i.position + case when i.property_id is null then 0 else 100000 end
    from public.checklist_items i
    where i.active and (i.property_id is null or i.property_id = v_property);
  end if;
end;
$$;

-- The team must tick the whole checklist; admins can close a cleaning anyway
-- (e.g. when the cleaner forgot to).
create or replace function public.complete_cleaning(cleaning_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing integer;
begin
  if not public.is_team_member() then
    raise exception 'Sem permissão';
  end if;

  if not public.is_admin() then
    select count(*) into v_missing
    from public.cleaning_tasks t
    where t.cleaning_id = complete_cleaning.cleaning_id and not t.done;
    if v_missing > 0 then
      raise exception 'Faltam % itens do checklist', v_missing;
    end if;
  end if;

  update public.cleanings
  set status = 'completed', completed_at = now(), completed_by = auth.uid()
  where id = cleaning_id and status = 'in_progress';

  if not found then
    raise exception 'Limpeza não encontrada ou não está em andamento';
  end if;
end;
$$;

revoke execute on function public.is_team_member() from public, anon;
revoke execute on function public.set_my_buildings(text[]) from public, anon;
grant execute on function public.is_team_member() to authenticated;
grant execute on function public.set_my_buildings(text[]) to authenticated;

-- The sync keeps a date that was moved by hand.
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
        date = case when public.cleanings.date_moved then public.cleanings.date else excluded.date end,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        next_checkin = excluded.next_checkin,
        guest_count = excluded.guest_count,
        status = case when public.cleanings.status = 'cancelled' then 'scheduled'::public.cleaning_status
                      else public.cleanings.status end
    where (public.cleanings.property_id, public.cleanings.date, public.cleanings.starts_at,
           public.cleanings.ends_at, public.cleanings.next_checkin, public.cleanings.guest_count,
           public.cleanings.status = 'cancelled')
      is distinct from
          (excluded.property_id,
           case when public.cleanings.date_moved then public.cleanings.date else excluded.date end,
           excluded.starts_at, excluded.ends_at, excluded.next_checkin, excluded.guest_count, false)
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

-- Read access: every active team member sees all properties and cleanings.
drop policy "properties: admin or assigned cleaner can read" on public.properties;
create policy "properties: team can read"
  on public.properties for select to authenticated
  using (public.is_team_member());

drop policy "cleanings: admin or assigned cleaner can read" on public.cleanings;
create policy "cleanings: team can read"
  on public.cleanings for select to authenticated
  using (public.is_team_member());

drop policy "property_inventory: admin or assigned cleaner can read" on public.property_inventory;
create policy "property_inventory: team can read"
  on public.property_inventory for select to authenticated
  using (public.is_team_member());

drop policy "issues: cleaner reports on own cleaning" on public.issues;
create policy "issues: team reports on a cleaning"
  on public.issues for insert to authenticated
  with check (
    reported_by = auth.uid()
    and status = 'open'
    and public.can_work_on(cleaning_id)
    and exists (
      select 1 from public.cleanings c
      where c.id = cleaning_id and c.property_id = issues.property_id
    )
  );
