-- "Deletar" on an open problem: admins and anyone on the team.
create or replace function public.delete_issue(issue_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.issue_status;
begin
  select status into v_status from public.issues where id = issue_id;
  if not found then
    raise exception 'Problema não encontrado';
  end if;
  if not public.is_admin() and not (public.is_team_member() and v_status = 'open') then
    raise exception 'Sem permissão';
  end if;
  delete from public.issues where id = issue_id;
end;
$$;

revoke execute on function public.delete_issue(uuid) from public, anon;
grant execute on function public.delete_issue(uuid) to authenticated;
