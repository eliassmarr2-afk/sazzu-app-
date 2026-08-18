-- Protocol Creative Insights (PCI)
-- Phase 1M hardening: one pending invitation and no re-invite during accepted legal bootstrap.
-- Intentionally stored in Git only; not applied to production yet.

create unique index if not exists pci_creator_invitations_one_pending_relationship_uidx
  on pci.creator_invitations(workspace_creator_id)
  where status='pending' and workspace_creator_id is not null;

create or replace function pci.guard_creator_invitation_insert_concurrency()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_relationship pci.workspace_creators%rowtype;
begin
  if new.status <> 'pending' or new.workspace_creator_id is null then return new; end if;

  select * into v_relationship from pci.workspace_creators wc
  where wc.workspace_creator_id=new.workspace_creator_id;

  if v_relationship.workspace_creator_id is null then
    raise exception using errcode='23514',message='pci_creator_invitation_relationship_invalid';
  end if;

  if v_relationship.status='invited' and exists(
    select 1 from pci.creator_invitations i
    where i.workspace_creator_id=new.workspace_creator_id and i.status='accepted'
  ) then
    raise exception using errcode='23514',message='pci_creator_invitation_bootstrap_in_progress';
  end if;

  return new;
end;
$$;

revoke all on function pci.guard_creator_invitation_insert_concurrency() from public,anon,authenticated;
grant execute on function pci.guard_creator_invitation_insert_concurrency() to service_role;

drop trigger if exists pci_creator_invitation_insert_concurrency_guard on pci.creator_invitations;
create trigger pci_creator_invitation_insert_concurrency_guard
before insert on pci.creator_invitations
for each row execute function pci.guard_creator_invitation_insert_concurrency();
