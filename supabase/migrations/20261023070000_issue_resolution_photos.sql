-- Resolving a problem can include "after" photos (e.g. reported dirty, then
-- the cleaner sends the clean result). The team can resolve problems of the
-- cleanings they work on, and sees the problems reported there.

alter table public.issues add column resolution_photo_paths text[] not null default '{}';

create or replace function public.resolve_issue(issue_id uuid, resolution_text text, photo_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cleaning uuid;
begin
  select cleaning_id into v_cleaning from public.issues where id = issue_id;
  if not found then
    raise exception 'Problema não encontrado';
  end if;
  if not public.is_admin() and (v_cleaning is null or not public.can_work_on(v_cleaning)) then
    raise exception 'Sem permissão';
  end if;
  -- Photos must live in the cleaning's folder, where the uploader had access.
  if exists (
    select 1 from unnest(coalesce(resolve_issue.photo_paths, '{}')) p
    where v_cleaning is null or p not like v_cleaning::text || '/%'
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

revoke execute on function public.resolve_issue(uuid, text, text[]) from public, anon;
grant execute on function public.resolve_issue(uuid, text, text[]) to authenticated;

-- Read policies add up, so this one widens "admin or reporter" to the team.
create policy "issues: team can read"
  on public.issues for select to authenticated
  using (public.is_team_member());
