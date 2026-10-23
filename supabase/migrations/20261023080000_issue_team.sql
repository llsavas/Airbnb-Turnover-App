-- Problems the admin registers by text ("215 Skyline gaveta solta"), for the
-- maintenance or the cleaning team. Cleaning-team problems show up for the
-- cleaners, who can resolve them with an "after" photo.

alter table public.issues
  add column team text check (team in ('maintenance', 'cleaning'));

create index issues_property_open_idx on public.issues (property_id) where status = 'open';

-- Photos of problems without a cleaning live under "problemas/<property id>/".
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
  if split_part(object_name, '/', 1) = 'problemas' then
    return public.is_team_member();
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
  if split_part(object_name, '/', 1) in ('padrao', 'problemas') then
    return public.is_team_member();
  end if;
  return public.can_access_photo(object_name);
end;
$$;

-- The team may also resolve problems addressed to the cleaning team.
create or replace function public.resolve_issue(issue_id uuid, resolution_text text, photo_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cleaning uuid;
  v_property uuid;
  v_team text;
begin
  select cleaning_id, property_id, team into v_cleaning, v_property, v_team
  from public.issues where id = issue_id;
  if not found then
    raise exception 'Problema não encontrado';
  end if;
  if not public.is_admin()
    and not (v_cleaning is not null and public.can_work_on(v_cleaning))
    and not (v_team = 'cleaning' and public.is_team_member()) then
    raise exception 'Sem permissão';
  end if;
  -- Photos must live in the cleaning's or the apartment's problem folder.
  if exists (
    select 1 from unnest(coalesce(resolve_issue.photo_paths, '{}')) p
    where not (
      (v_cleaning is not null and p like v_cleaning::text || '/%')
      or p like 'problemas/' || v_property::text || '/%'
    )
  ) then
    raise exception 'Foto inválida';
  end if;

  update public.issues
  set status = 'resolved',
      resolution = nullif(trim(resolution_text), ''),
      resolution_photo_paths = coalesce(resolve_issue.photo_paths, '{}'),
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = issue_id;
end;
$$;
