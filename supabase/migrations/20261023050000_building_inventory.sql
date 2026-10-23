-- Stock is counted per building (the building's supply room), not per
-- apartment: one count per building gives the overview with less work.

create table public.building_inventory (
  building text not null,
  item_id uuid not null references public.inventory_items (id) on delete cascade,
  quantity integer check (quantity >= 0),
  -- Minimum for this building; null = item default × apartments in it.
  par_level integer check (par_level >= 0),
  counted_at timestamptz,
  counted_by uuid references public.profiles (id) on delete set null,
  primary key (building, item_id)
);

alter table public.building_inventory enable row level security;

create policy "building_inventory: team can read"
  on public.building_inventory for select to authenticated
  using (public.is_team_member());

create policy "building_inventory: admin writes"
  on public.building_inventory for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- The count made during a cleaning goes to that apartment's building.
create or replace function public.record_inventory(cleaning_id uuid, counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_building text;
begin
  if not public.can_work_on(cleaning_id) then
    raise exception 'Limpeza não encontrada';
  end if;
  select p.building into v_building
  from public.cleanings c join public.properties p on p.id = c.property_id
  where c.id = record_inventory.cleaning_id;
  if v_building is null then
    raise exception 'Este apartamento não tem prédio definido';
  end if;

  insert into public.building_inventory (building, item_id, quantity, counted_at, counted_by)
  select v_building, key::uuid, greatest(value::integer, 0), now(), auth.uid()
  from jsonb_each_text(counts)
  where value ~ '^\d+$'
  on conflict (building, item_id) do update
  set quantity = excluded.quantity,
      counted_at = excluded.counted_at,
      counted_by = excluded.counted_by;
end;
$$;
