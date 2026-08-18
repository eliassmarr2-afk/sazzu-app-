-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Invitation creation guard
--
-- A restricted/suspended/closed creator must not receive a new pending
-- invitation, not merely be prevented from claiming it later.
-- ============================================================================

begin;

drop trigger if exists trg_pci_creator_invitation_activation_guard
  on pci.creator_invitations;

create or replace function pci.guard_creator_invitation_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_status text;
begin
  if (tg_op = 'INSERT' and new.status = 'pending')
     or (tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted') then
    select c.status into v_creator_status
    from pci.creators c
    where c.creator_id = new.creator_id;

    if v_creator_status in ('restricted', 'suspended', 'closed') then
      raise exception using errcode = 'P0001', message = 'creator_global_invitation_forbidden';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_pci_creator_invitation_state_guard
before insert or update on pci.creator_invitations
for each row execute function pci.guard_creator_invitation_state();

revoke execute on function pci.guard_creator_invitation_state()
  from public, anon, authenticated;
grant execute on function pci.guard_creator_invitation_state() to service_role;

commit;
