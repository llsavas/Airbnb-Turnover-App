-- Editing an open problem right on its card: description, urgency, photos
-- (anyone on the team) and who fixes it (admin only). Null keeps a field.
create or replace function public.update_issue(
  issue_id uuid,
  new_description text default null,
  new_urgency public.issue_urgency default null,
  new_team text default null,
  new_photo_paths text[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.issues%rowtype;
begin
  select * into v_issue from public.issues where id = issue_id;
  if not found then
    raise exception 'Problema não encontrado';
  end if;
  if not public.is_admin() and not (public.is_team_member() and v_issue.status = 'open') then
    raise exception 'Sem permissão';
  end if;
  if new_team is not null and not public.is_admin() then
    raise exception 'Só o admin muda quem resolve';
  end if;
  if new_team is not null and new_team not in ('maintenance', 'cleaning') then
    raise exception 'Equipe inválida';
  end if;
  if new_description is not null and trim(new_description) = '' then
    raise exception 'Descreva o problema';
  end if;
  -- New photos must be in the apartment's problem folder (or already there).
  if exists (
    select 1 from unnest(coalesce(new_photo_paths, '{}')) p
    where p <> all (v_issue.photo_paths)
      and p not like 'problemas/' || v_issue.property_id::text || '/%'
  ) then
    raise exception 'Foto inválida';
  end if;

  update public.issues
  set description = coalesce(trim(new_description), description),
      urgency = coalesce(new_urgency, urgency),
      team = coalesce(new_team, team),
      photo_paths = coalesce(new_photo_paths, photo_paths)
  where id = issue_id;
end;
$$;

revoke execute on function public.update_issue(uuid, text, public.issue_urgency, text, text[]) from public, anon;
grant execute on function public.update_issue(uuid, text, public.issue_urgency, text, text[]) to authenticated;
