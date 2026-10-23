-- The team counts a building's stock from the building block of the Diário,
-- not from inside a cleaning, so the count is recorded by building directly.
create or replace function public.record_building_inventory(p_building text, counts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_team_member() then
    raise exception 'Sem permissão';
  end if;
  if not exists (select 1 from public.properties where building = p_building and active) then
    raise exception 'Prédio não encontrado';
  end if;

  insert into public.building_inventory (building, item_id, quantity, counted_at, counted_by)
  select p_building, key::uuid, greatest(value::integer, 0), now(), auth.uid()
  from jsonb_each_text(counts)
  where value ~ '^\d+$'
  on conflict (building, item_id) do update
  set quantity = excluded.quantity,
      counted_at = excluded.counted_at,
      counted_by = excluded.counted_by;
end;
$$;

revoke execute on function public.record_building_inventory(text, jsonb) from public, anon;
grant execute on function public.record_building_inventory(text, jsonb) to authenticated;
